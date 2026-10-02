import os
import logging
from typing import Dict, Any, Optional
import cloudinary
import cloudinary.uploader
from app.core.config import settings

logger = logging.getLogger(__name__)

# Configure Cloudinary
cloudinary_configured = False
if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True
    )
    cloudinary_configured = True
    logger.info("Cloudinary configured successfully for cloud_name: %s", settings.CLOUDINARY_CLOUD_NAME)
else:
    logger.error("Cloudinary credentials missing in environment variables. Local file storage is strictly prohibited.")


def upload_image(file_path: str, folder: str = "vision_civic/snapshots") -> Dict[str, Any]:
    """
    Upload snapshot image to Cloudinary and immediately remove the temporary local file.
    Does NOT store any media files locally.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Snapshot file not found: {file_path}")

    if not cloudinary_configured:
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass
        raise RuntimeError("Cloudinary is not configured. Media storage requires valid Cloudinary credentials.")

    try:
        res = cloudinary.uploader.upload(
            file_path,
            folder=folder,
            resource_type="image",
            overwrite=True
        )
        return {
            "url": res.get("secure_url") or res.get("url"),
            "public_id": res.get("public_id"),
            "format": res.get("format"),
            "storage": "cloudinary"
        }
    except Exception as e:
        logger.error(f"Cloudinary image upload failed: {e}")
        raise RuntimeError(f"Cloudinary image upload failed: {e}")
    finally:
        # Strictly delete temporary file so nothing is stored locally
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                logger.debug("Removed temporary snapshot file: %s", file_path)
            except Exception as e:
                logger.warning("Could not delete temporary snapshot file %s: %s", file_path, e)


def upload_video(file_path: str, folder: str = "vision_civic/incident_clips") -> Dict[str, Any]:
    """
    Upload incident video clip to Cloudinary and immediately remove the temporary local file.
    Does NOT store any media files locally.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Video file not found: {file_path}")

    if not cloudinary_configured:
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass
        raise RuntimeError("Cloudinary is not configured. Media storage requires valid Cloudinary credentials.")

    try:
        res = cloudinary.uploader.upload(
            file_path,
            folder=folder,
            resource_type="video",
            chunk_size=6000000,
            overwrite=True
        )
        return {
            "url": res.get("secure_url") or res.get("url"),
            "public_id": res.get("public_id"),
            "format": res.get("format"),
            "storage": "cloudinary"
        }
    except Exception as e:
        logger.error(f"Cloudinary video upload failed: {e}")
        raise RuntimeError(f"Cloudinary video upload failed: {e}")
    finally:
        # Strictly delete temporary file so nothing is stored locally
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                logger.debug("Removed temporary clip file: %s", file_path)
            except Exception as e:
                logger.warning("Could not delete temporary clip file %s: %s", file_path, e)


def delete_asset(public_id: Optional[str], resource_type: str = "image") -> bool:
    """
    Delete asset from Cloudinary using the stored public ID.
    Avoids orphaned resources.
    """
    if not public_id:
        return True

    if cloudinary_configured:
        try:
            res = cloudinary.uploader.destroy(public_id, resource_type=resource_type)
            result_str = res.get("result", "")
            logger.info("Cloudinary delete result for %s: %s", public_id, result_str)
            return result_str in ["ok", "not found"]
        except Exception as e:
            logger.error(f"Cloudinary delete failed for public_id {public_id}: {e}")
            return False

    return True
