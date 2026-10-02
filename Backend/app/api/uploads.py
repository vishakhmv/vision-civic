import os
import shutil
import uuid
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel
from app.core.config import settings
from app.core.dependencies import get_current_user
from app.services.upload_analyzer import analyze_uploaded_video
from app.services.video_processor import get_video_metadata

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/uploads", tags=["Uploads & Video Analysis"])

import tempfile

UPLOAD_DIR = os.path.join(tempfile.gettempdir(), "vision_civic_media", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class AnalyzeRequest(BaseModel):
    file_id: str
    model_choice: str = "both"  # "waste_bin", "fire_smoke", "both"


@router.post("/video")
async def upload_video_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Accepts video file upload, verifies file format, saves temporarily,
    and returns metadata for subsequent model analysis.
    """
    valid_exts = [".mp4", ".avi", ".mov", ".mkv", ".webm"]
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in valid_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported video format '{ext}'. Supported: {', '.join(valid_exts)}"
        )

    file_id = f"up_{uuid.uuid4().hex[:12]}"
    saved_filename = f"{file_id}{ext}"
    saved_path = os.path.join(UPLOAD_DIR, saved_filename)

    file_size = 0
    with open(saved_path, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):  # 1MB chunks
            buffer.write(chunk)
            file_size += len(chunk)

    meta = get_video_metadata(saved_path)

    return {
        "file_id": file_id,
        "filename": file.filename,
        "file_size_bytes": file_size,
        "video_duration_seconds": meta["duration"],
        "video_format": ext.lstrip("."),
        "video_recorded_at": meta["recorded_at"].isoformat() if meta.get("recorded_at") else None,
        "message": "Video uploaded successfully. Ready for AI analysis."
    }


@router.post("/video/analyze")
async def analyze_video(
    request: AnalyzeRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Triggers AI detection on uploaded video.
    Extracts incident context clips, uploads them to Cloudinary,
    and creates distinct UPLOADED_VIDEO incident documents in MongoDB.
    """
    # Find the file in upload dir
    target_file = None
    for f in os.listdir(UPLOAD_DIR):
        if f.startswith(request.file_id):
            target_file = os.path.join(UPLOAD_DIR, f)
            break

    if not target_file or not os.path.exists(target_file):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Uploaded video file not found or expired. Please re-upload."
        )

    file_size = os.path.getsize(target_file)
    original_name = os.path.basename(target_file)

    try:
        incidents = await analyze_uploaded_video(
            video_path=target_file,
            original_filename=original_name,
            file_size_bytes=file_size,
            user_id=current_user["_id"],
            model_choice=request.model_choice
        )
        return {
            "status": "COMPLETED",
            "incidents_count": len(incidents),
            "incidents": incidents,
            "message": f"Analysis complete. Detected {len(incidents)} incident(s)."
        }
    except Exception as e:
        logger.error("Analysis failed: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Video analysis failed: {str(e)}"
        )
    finally:
        # Strictly delete uploaded file after analysis - never keep files locally
        if target_file and os.path.exists(target_file):
            try:
                os.remove(target_file)
                logger.info("Cleaned up temporary upload file: %s", target_file)
            except Exception as e:
                logger.warning("Could not delete temporary upload file %s: %s", target_file, e)
