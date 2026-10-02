import os
import subprocess
import logging
import uuid
from typing import List, Tuple, Dict, Any, Optional
from datetime import datetime
import cv2
import numpy as np
from app.core.config import settings

logger = logging.getLogger(__name__)

import tempfile

TEMP_DIR = os.path.join(tempfile.gettempdir(), "vision_civic_media")
os.makedirs(TEMP_DIR, exist_ok=True)


def save_snapshot(frame: np.ndarray, prefix: str = "snap") -> str:
    """Save an OpenCV frame as a JPEG image and return the local filepath."""
    filename = f"{prefix}_{uuid.uuid4().hex[:10]}.jpg"
    path = os.path.join(TEMP_DIR, filename)
    cv2.imwrite(path, frame)
    return path


def frames_to_video(
    frames: List[np.ndarray],
    fps: int = 15,
    prefix: str = "live_incident"
) -> str:
    """
    Encode an array of OpenCV frames into an MP4 video clip.
    Uses ffmpeg for browser-compatible H.264 encoding if available,
    otherwise OpenCV VideoWriter with fallback.
    """
    if not frames:
        raise ValueError("Cannot create video from empty frame list")

    unique_id = uuid.uuid4().hex[:10]
    raw_path = os.path.join(TEMP_DIR, f"{prefix}_{unique_id}_raw.mp4")
    final_path = os.path.join(TEMP_DIR, f"{prefix}_{unique_id}.mp4")

    h, w = frames[0].shape[:2]

    # First write with OpenCV
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(raw_path, fourcc, max(1, fps), (w, h))
    for f in frames:
        # Ensure dimensions match
        if f.shape[:2] != (h, w):
            f = cv2.resize(f, (w, h))
        out.write(f)
    out.release()

    # Try transcode with ffmpeg for universal browser H.264 playback
    try:
        cmd = [
            "ffmpeg", "-y", "-i", raw_path,
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-movflags", "+faststart", final_path
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
        if result.returncode == 0 and os.path.exists(final_path):
            if os.path.exists(raw_path):
                os.remove(raw_path)
            return final_path
    except Exception as e:
        logger.warning("ffmpeg transcoding failed (%s). Using raw MP4 file.", e)

    return raw_path


def extract_video_clip(
    source_video_path: str,
    start_seconds: float,
    end_seconds: float,
    prefix: str = "upload_incident"
) -> str:
    """
    Extract a clip from an uploaded video file between start_seconds and end_seconds.
    Uses ffmpeg for speed and precision, with OpenCV fallback.
    """
    if not os.path.exists(source_video_path):
        raise FileNotFoundError(f"Source video not found: {source_video_path}")

    start_sec = max(0.0, start_seconds)
    duration = max(1.0, end_seconds - start_sec)
    unique_id = uuid.uuid4().hex[:10]
    output_path = os.path.join(TEMP_DIR, f"{prefix}_{unique_id}.mp4")

    # Try ffmpeg extraction
    try:
        cmd = [
            "ffmpeg", "-y",
            "-ss", str(start_sec),
            "-i", source_video_path,
            "-t", str(duration),
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            output_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60)
        if res.returncode == 0 and os.path.exists(output_path):
            return output_path
    except Exception as e:
        logger.warning("ffmpeg clip extraction failed (%s). Falling back to OpenCV.", e)

    # OpenCV fallback extraction
    cap = cv2.VideoCapture(source_video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    start_frame = int(start_sec * fps)
    end_frame = int(end_seconds * fps)

    cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (w, h))

    current_frame = start_frame
    while cap.isOpened() and current_frame <= end_frame:
        ret, frame = cap.read()
        if not ret:
            break
        out.write(frame)
        current_frame += 1

    cap.release()
    out.release()
    return output_path


def get_video_metadata(file_path: str) -> Dict[str, Any]:
    """Extract metadata including duration, fps, resolution, and recorded timestamp if available."""
    cap = cv2.VideoCapture(file_path)
    if not cap.isOpened():
        return {
            "duration": 0.0,
            "fps": 0.0,
            "width": 0,
            "height": 0,
            "total_frames": 0,
            "recorded_at": None
        }

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 25.0)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration = round(total_frames / fps, 2) if fps > 0 else 0.0
    cap.release()

    # Extract creation_time or recording date metadata via ffprobe if available
    recorded_at: Optional[datetime] = None
    try:
        probe_cmd = [
            "ffprobe", "-v", "quiet",
            "-show_entries", "format_tags=creation_time",
            "-of", "default=noprint_wrappers=1:nokey=1",
            file_path
        ]
        probe_res = subprocess.run(probe_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=10)
        output_ts = probe_res.stdout.strip()
        if output_ts:
            try:
                # ISO format parse
                recorded_at = datetime.fromisoformat(output_ts.replace("Z", "+00:00"))
            except Exception:
                pass
    except Exception:
        pass

    return {
        "duration": duration,
        "fps": fps,
        "width": width,
        "height": height,
        "total_frames": total_frames,
        "recorded_at": recorded_at
    }
