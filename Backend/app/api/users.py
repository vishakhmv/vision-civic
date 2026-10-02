import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from bson import ObjectId
from app.core.dependencies import require_admin
from app.database.mongodb import get_database
from app.schemas.user import UserRole

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["User Management (Admin Only)"])


class UpdateRoleRequest(BaseModel):
    role: UserRole


@router.get("")
async def list_users(admin_user: dict = Depends(require_admin)):
    """List all registered system users. Restricted to ADMIN."""
    db = get_database()
    cursor = db.users.find({}, {"password_hash": 0}).sort("created_at", -1)
    users = []
    async for u in cursor:
        users.append({
            "id": str(u["_id"]),
            "name": u.get("name"),
            "email": u.get("email"),
            "mobile_number": u.get("mobile_number"),
            "role": u.get("role", "USER"),
            "created_at": u.get("created_at").isoformat() if u.get("created_at") else None
        })
    return {"users": users, "total": len(users)}


@router.patch("/{user_id}/role")
async def update_user_role(
    user_id: str,
    req: UpdateRoleRequest,
    admin_user: dict = Depends(require_admin)
):
    """Update role for a user account (e.g., USER to ADMIN). Restricted to ADMIN."""
    db = get_database()
    try:
        obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID format.")

    target = await db.users.find_one({"_id": obj_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")

    await db.users.update_one({"_id": obj_id}, {"$set": {"role": req.role.value}})
    logger.info("Admin %s updated role of %s to %s", admin_user["_id"], user_id, req.role.value)
    return {"message": f"User role updated to {req.role.value} successfully."}


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    admin_user: dict = Depends(require_admin)
):
    """Delete a user account. Restricted to ADMIN."""
    db = get_database()
    if user_id == admin_user["_id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account.")

    try:
        obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID format.")

    res = await db.users.delete_one({"_id": obj_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found.")

    return {"message": "User account removed."}
