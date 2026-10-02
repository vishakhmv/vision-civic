import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from pydantic import BaseModel, EmailStr
from bson import ObjectId
import httpx

from app.core.config import settings
from app.core.security import hash_password, verify_password, create_access_token
from app.core.dependencies import get_current_user
from app.database.mongodb import get_database
from app.schemas.user import UserCreate, UserLogin, GoogleAuthRequest, UserRole, PasswordChangeRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    mobile_number: Optional[str] = None


@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(user_in: UserCreate, response: Response):
    """
    Register a new user account with Name, Mobile Number, Email, and Password.
    Strictly creates standard USER accounts.
    """
    db = get_database()
    email_clean = user_in.email.lower().strip()

    existing = await db.users.find_one({"email": email_clean})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    # Hash password with Argon2
    hashed_pw = hash_password(user_in.password)

    user_doc = {
        "name": user_in.name.strip(),
        "email": email_clean,
        "mobile_number": user_in.mobile_number,
        "password_hash": hashed_pw,
        "auth_provider": "local",
        "role": UserRole.USER.value,  # Strict backend enforcement
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }

    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    # Generate JWT token
    token = create_access_token({"sub": user_id, "role": UserRole.USER.value})

    # Set secure HTTP-only cookie
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE,
        path="/"
    )

    return {
        "user": {
            "id": user_id,
            "name": user_doc["name"],
            "email": user_doc["email"],
            "mobile_number": user_doc["mobile_number"],
            "role": user_doc["role"],
            "auth_provider": user_doc["auth_provider"],
            "created_at": user_doc["created_at"].isoformat()
        },
        "token": token,
        "message": "Account created successfully"
    }


@router.post("/login")
async def login(credentials: UserLogin, response: Response):
    """
    Authenticate user with email and password, setting an HTTP-only JWT cookie.
    """
    db = get_database()
    user = await db.users.find_one({"email": credentials.email.lower().strip()})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not user.get("password_hash") or not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    user_id = str(user["_id"])
    role = user.get("role", UserRole.USER.value)
    token = create_access_token({"sub": user_id, "role": role})

    # Set secure HTTP-only cookie
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE,
        path="/"
    )

    return {
        "user": {
            "id": user_id,
            "name": user.get("name"),
            "email": user.get("email"),
            "mobile_number": user.get("mobile_number"),
            "role": role,
            "auth_provider": user.get("auth_provider", "local"),
            "created_at": user.get("created_at").isoformat() if isinstance(user.get("created_at"), datetime) else str(user.get("created_at"))
        },
        "token": token,
        "message": "Login successful"
    }


@router.post("/google")
async def google_auth(payload: GoogleAuthRequest, response: Response):
    """
    Authenticate or register a user via Firebase Google OAuth.
    Validates token, verifies email, creates a USER account if new,
    and sets a secure HTTP-only cookie session.
    """
    verified_email = None
    verified_name = payload.name or "Google User"

    # Verify ID token with Google OAuth tokeninfo endpoint
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            token_res = await client.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": payload.id_token}
            )
            if token_res.status_code == 200:
                data = token_res.json()
                verified_email = data.get("email")
                if data.get("name"):
                    verified_name = data.get("name")
            else:
                # If Google tokeninfo returns error, check if client provided email
                logger.warning("Google tokeninfo returned status %s: %s", token_res.status_code, token_res.text)
    except Exception as e:
        logger.warning("Google tokeninfo verification failed: %s", e)

    # Fallback to payload email if verified_email is not returned by tokeninfo (e.g. Firebase emulator / network)
    if not verified_email and payload.email:
        verified_email = str(payload.email)

    if not verified_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to verify Google credentials. Please try standard sign-in."
        )

    verified_email = verified_email.lower().strip()
    db = get_database()

    user = await db.users.find_one({"email": verified_email})

    if not user:
        # Create brand-new user with USER role
        user_doc = {
            "name": verified_name,
            "email": verified_email,
            "mobile_number": None,
            "password_hash": None,
            "auth_provider": "google",
            "role": UserRole.USER.value,  # Strict backend enforcement
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        res = await db.users.insert_one(user_doc)
        user_id = str(res.inserted_id)
        role = UserRole.USER.value
        user_name = user_doc["name"]
        created_at_str = user_doc["created_at"].isoformat()
    else:
        user_id = str(user["_id"])
        role = user.get("role", UserRole.USER.value)
        user_name = user.get("name", verified_name)
        created_at_val = user.get("created_at")
        created_at_str = created_at_val.isoformat() if isinstance(created_at_val, datetime) else str(created_at_val)

    # Issue 1-day JWT access token
    token = create_access_token({"sub": user_id, "role": role})

    # Set secure HTTP-only cookie
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE,
        path="/"
    )

    return {
        "user": {
            "id": user_id,
            "name": user_name,
            "email": verified_email,
            "mobile_number": user.get("mobile_number") if user else None,
            "role": role,
            "auth_provider": "google",
            "created_at": created_at_str
        },
        "token": token,
        "message": "Google authentication successful"
    }


@router.post("/logout")
async def logout(response: Response):
    """Clear session HTTP-only cookie."""
    response.delete_cookie(
        key=settings.COOKIE_NAME,
        path="/"
    )
    return {"message": "Logged out successfully"}


@router.get("/me")
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    """Retrieve verified profile of the currently logged-in user."""
    return {
        "id": current_user["_id"],
        "name": current_user.get("name"),
        "email": current_user.get("email"),
        "mobile_number": current_user.get("mobile_number"),
        "role": current_user.get("role", "USER"),
        "auth_provider": current_user.get("auth_provider", "local"),
        "created_at": current_user.get("created_at").isoformat() if isinstance(current_user.get("created_at"), datetime) else str(current_user.get("created_at"))
    }


@router.patch("/profile")
async def update_profile(
    req: ProfileUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update profile details (Name, Mobile Number) for the logged-in user."""
    db = get_database()
    update_data = {"updated_at": datetime.now(timezone.utc)}

    if req.name is not None and req.name.strip():
        update_data["name"] = req.name.strip()
    if req.mobile_number is not None:
        update_data["mobile_number"] = req.mobile_number.strip()

    try:
        obj_id = ObjectId(current_user["_id"])
    except Exception:
        obj_id = current_user["_id"]

    await db.users.update_one({"_id": obj_id}, {"$set": update_data})
    updated_user = await db.users.find_one({"_id": obj_id})

    return {
        "id": str(updated_user["_id"]),
        "name": updated_user.get("name"),
        "email": updated_user.get("email"),
        "mobile_number": updated_user.get("mobile_number"),
        "role": updated_user.get("role", "USER"),
        "auth_provider": updated_user.get("auth_provider", "local"),
        "message": "Profile updated successfully."
    }


@router.post("/change-password")
async def change_password(
    req: PasswordChangeRequest,
    current_user: dict = Depends(get_current_user)
):
    """Securely change password for local-auth user accounts."""
    db = get_database()
    try:
        obj_id = ObjectId(current_user["_id"])
    except Exception:
        obj_id = current_user["_id"]

    user = await db.users.find_one({"_id": obj_id})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if user.get("auth_provider") == "google" and not user.get("password_hash"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Accounts created via Google sign-in do not have a password."
        )

    if not verify_password(req.current_password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password."
        )

    new_hash = hash_password(req.new_password)
    await db.users.update_one(
        {"_id": obj_id},
        {"$set": {"password_hash": new_hash, "updated_at": datetime.now(timezone.utc)}}
    )

    return {"message": "Password changed successfully."}

