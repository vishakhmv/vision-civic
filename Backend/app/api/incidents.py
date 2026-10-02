import math
import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from bson import ObjectId
from app.core.dependencies import get_current_user, require_admin
from app.database.mongodb import get_database
from app.services.cloudinary_service import delete_asset

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/incidents", tags=["Incidents"])


@router.get("")
async def list_incidents(
    incident_type: Optional[str] = Query(None),
    source_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    sort: str = Query("desc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """
    List incidents with comprehensive filtering, search, sorting, and pagination.
    Admins view all incidents; standard users view incidents within their scope.
    """
    db = get_database()
    query = {}

    # Role-based scoping: normal users only see their own sessions/uploads
    if current_user.get("role") != "ADMIN":
        query["created_by"] = current_user["_id"]

    if incident_type and incident_type != "ALL":
        query["incident_type"] = incident_type

    if source_type and source_type != "ALL":
        query["source_type"] = source_type

    if search and search.strip():
        term = search.strip()
        query["$or"] = [
            {"camera_name": {"$regex": term, "$options": "i"}},
            {"original_filename": {"$regex": term, "$options": "i"}},
            {"incident_type": {"$regex": term, "$options": "i"}},
            {"status": {"$regex": term, "$options": "i"}}
        ]

    # Date filtering
    date_filter = {}
    if start_date:
        try:
            date_filter["$gte"] = datetime.fromisoformat(start_date)
        except Exception:
            pass
    if end_date:
        try:
            date_filter["$lte"] = datetime.fromisoformat(end_date)
        except Exception:
            pass
    if date_filter:
        query["created_at"] = date_filter

    total = await db.incidents.count_documents(query)
    sort_dir = -1 if sort == "desc" else 1

    skip = (page - 1) * limit
    cursor = db.incidents.find(query).sort("created_at", sort_dir).skip(skip).limit(limit)

    incidents = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        # Format datetimes
        for k in ["created_at", "incident_detected_at", "incident_ended_at", "uploaded_at", "video_recorded_at"]:
            if k in doc and isinstance(doc[k], datetime):
                doc[k] = doc[k].isoformat()
        incidents.append(doc)

    pages = max(1, math.ceil(total / limit))

    return {
        "incidents": incidents,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages
    }


@router.get("/{incident_id}")
async def get_incident(incident_id: str, current_user: dict = Depends(get_current_user)):
    """Retrieve details for a single incident."""
    db = get_database()
    try:
        obj_id = ObjectId(incident_id)
        doc = await db.incidents.find_one({"_id": obj_id})
    except Exception:
        doc = await db.incidents.find_one({"_id": incident_id})

    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found.")

    # Authorization check
    if current_user.get("role") != "ADMIN" and doc.get("created_by") != current_user["_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    doc["_id"] = str(doc["_id"])
    for k in ["created_at", "incident_detected_at", "incident_ended_at", "uploaded_at", "video_recorded_at"]:
        if k in doc and isinstance(doc[k], datetime):
            doc[k] = doc[k].isoformat()

    return doc


@router.delete("/{incident_id}", status_code=status.HTTP_200_OK)
async def delete_incident(
    incident_id: str,
    admin_user: dict = Depends(require_admin)
):
    """
    Delete an incident document and remove its Cloudinary / local video and snapshot assets.
    Restricted to ADMIN users.
    """
    db = get_database()
    try:
        obj_id = ObjectId(incident_id)
        doc = await db.incidents.find_one({"_id": obj_id})
    except Exception:
        doc = await db.incidents.find_one({"_id": incident_id})

    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found.")

    # 1. Delete video asset from Cloudinary / storage using public_id
    video_pid = doc.get("video_public_id")
    if video_pid:
        try:
            delete_asset(video_pid, resource_type="video")
        except Exception as e:
            logger.error("Failed to delete video asset %s: %s", video_pid, e)

    # 2. Delete snapshot asset from Cloudinary / storage using public_id
    snap_pid = doc.get("snapshot_public_id")
    if snap_pid:
        try:
            delete_asset(snap_pid, resource_type="image")
        except Exception as e:
            logger.error("Failed to delete snapshot asset %s: %s", snap_pid, e)

    # 3. Delete document from MongoDB
    try:
        await db.incidents.delete_one({"_id": ObjectId(incident_id)})
    except Exception:
        await db.incidents.delete_one({"_id": incident_id})

    logger.info("Admin %s deleted incident %s", admin_user["_id"], incident_id)
    return {"message": "Incident and associated media assets successfully deleted."}
