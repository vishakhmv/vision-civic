import os
import shutil
import uuid
import logging
import tempfile
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel
from app.core.config import settings
from app.core.dependencies import get_current_user
from app.services.upload_analyzer import analyze_uploaded_video, analyze_uploaded_image
from app.services.video_processor import get_video_metadata

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/uploads", tags=["Uploads & Media Analysis"])

UPLOAD_DIR = os.path.join(tempfile.gettempdir(), "vision_civic_media", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class AnalyzeRequest(BaseModel):
    file_id: str
    model_choice: str = "both"  # "waste_bin", "fire_smoke", "both"


IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
VIDEO_EXTS = {".mp4", ".avi", ".mov", ".mkv", ".webm"}


@router.post("/video")
async def upload_media_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Accepts video or image file upload, verifies file format, saves temporarily,
    and returns metadata for subsequent model analysis.
    """
    ext = os.path.splitext(file.filename)[1].lower()
    valid_exts = IMAGE_EXTS | VIDEO_EXTS

    if ext not in valid_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported media format '{ext}'. Supported: {', '.join(sorted(valid_exts))}"
        )

    file_id = f"up_{uuid.uuid4().hex[:12]}"
    saved_filename = f"{file_id}{ext}"
    saved_path = os.path.join(UPLOAD_DIR, saved_filename)

    file_size = 0
    with open(saved_path, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):  # 1MB chunks
            buffer.write(chunk)
            file_size += len(chunk)

    is_image = ext in IMAGE_EXTS
    duration = 0.0
    recorded_at = None

    if not is_image:
        meta = get_video_metadata(saved_path)
        duration = meta.get("duration", 0.0)
        if meta.get("recorded_at"):
            recorded_at = meta["recorded_at"].isoformat()

    return {
        "file_id": file_id,
        "filename": file.filename,
        "file_size_bytes": file_size,
        "is_image": is_image,
        "video_duration_seconds": duration,
        "video_format": ext.lstrip("."),
        "video_recorded_at": recorded_at,
        "message": "Media uploaded successfully. Ready for AI analysis."
    }


@router.post("/video/analyze")
async def analyze_media(
    request: AnalyzeRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Triggers AI detection on uploaded video or image media.
    For Videos: Extracts continuous incident clips, uploads to Cloudinary, and records MongoDB document.
    For Images: Directly analyzes image for hazards, uploads snapshot to Cloudinary, and saves MongoDB document.
    """
    target_file = None
    for f in os.listdir(UPLOAD_DIR):
        if f.startswith(request.file_id):
            target_file = os.path.join(UPLOAD_DIR, f)
            break

    if not target_file or not os.path.exists(target_file):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Uploaded media file not found or expired. Please re-upload."
        )

    file_size = os.path.getsize(target_file)
    original_name = os.path.basename(target_file)
    ext = os.path.splitext(target_file)[1].lower()
    is_image = ext in IMAGE_EXTS

    try:
        if is_image:
            incidents = await analyze_uploaded_image(
                image_path=target_file,
                original_filename=original_name,
                file_size_bytes=file_size,
                user_id=current_user["_id"],
                model_choice=request.model_choice
            )
        else:
            incidents = await analyze_uploaded_video(
                video_path=target_file,
                original_filename=original_name,
                file_size_bytes=file_size,
                user_id=current_user["_id"],
                model_choice=request.model_choice
            )

        return {
            "status": "COMPLETED",
            "is_image": is_image,
            "incidents_count": len(incidents),
            "incidents": incidents,
            "message": f"Analysis complete. Detected {len(incidents)} incident(s)."
        }
    except Exception as e:
        logger.error("Media analysis failed: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Media analysis failed: {str(e)}"
        )
    finally:
        # Delete temporary upload file
        if target_file and os.path.exists(target_file):
            try:
                os.remove(target_file)
                logger.info("Cleaned up temporary upload file: %s", target_file)
            except Exception as e:
                logger.warning("Could not delete temporary upload file %s: %s", target_file, e)
