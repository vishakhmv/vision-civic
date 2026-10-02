from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
from typing import Optional, Dict, Any
from app.core.config import settings
from app.core.security import decode_access_token
from app.database.mongodb import get_database

security_bearer = HTTPBearer(auto_error=False)


async def get_token_from_request(
    request: Request,
    bearer_auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)
) -> Optional[str]:
    """Retrieve JWT token from HTTP-only cookie, or fallback to Authorization header."""
    # 1. Check HTTP-only cookie
    token = request.cookies.get(settings.COOKIE_NAME)
    if token:
        return token

    # 2. Check Bearer Authorization header
    if bearer_auth and bearer_auth.credentials:
        return bearer_auth.credentials

    return None


async def get_current_user(token: Optional[str] = Depends(get_token_from_request)) -> Dict[str, Any]:
    """Authenticate current user from JWT token and verify in MongoDB."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Session not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid token. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token payload.",
        )

    db = get_database()
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        user = await db.users.find_one({"_id": user_id})

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with session was not found.",
        )

    # Convert ObjectId to string for easy JSON usage
    user["_id"] = str(user["_id"])
    return user


async def require_admin(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Ensure authenticated user has ADMIN role. Enforced strictly at the backend."""
    if current_user.get("role") != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Administrator privileges required.",
        )
    return current_user
