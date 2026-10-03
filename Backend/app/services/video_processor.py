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


def draw_bounding_box(
    frame: np.ndarray,
    bbox: Optional[List[int]],
    label: str,
    confidence: float,
    color: Optional[Tuple[int, int, int]] = None
) -> np.ndarray:
    """
    Draw a bounding box with label tag badge and confidence percentage on an OpenCV BGR frame.
    Returns an annotated copy of the frame.
    """
    if frame is None or frame.size == 0:
        return frame

    annotated = frame.copy()
    h, w = annotated.shape[:2]

    if not bbox:
        bbox = [int(w * 0.1), int(h * 0.1), int(w * 0.9), int(h * 0.9)]

    xmin, ymin, xmax, ymax = [int(v) for v in bbox]
    xmin, ymin = max(0, xmin), max(0, ymin)
    xmax, ymax = min(w - 1, xmax), min(h - 1, ymax)

    if color is None:
        lbl_upper = label.upper()
        if "FIRE" in lbl_upper or "SMOKE" in lbl_upper:
            color = (0, 0, 238)  # Red for Fire/Smoke
        else:
            color = (0, 165, 255)  # Amber/Orange for Waste Bin

    thickness = max(2, int(min(w, h) * 0.005))
    cv2.rectangle(annotated, (xmin, ymin), (xmax, ymax), color, thickness)

    conf_pct = int(round(confidence * 100)) if confidence <= 1.0 else int(confidence)
    text = f"{label} {conf_pct}%"

    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = max(0.5, min(w, h) * 0.001)
    font_thickness = max(1, int(font_scale * 2))

    (text_w, text_h), _ = cv2.getTextSize(text, font, font_scale, font_thickness)

    badge_ymin = max(0, ymin - text_h - 12)
    badge_ymax = ymin
    badge_xmax = min(w, xmin + text_w + 16)

    cv2.rectangle(annotated, (xmin, badge_ymin), (badge_xmax, badge_ymax), color, -1)

    text_x = xmin + 8
    text_y = badge_ymax - 6
    cv2.putText(annotated, text, (text_x, text_y), font, font_scale, (255, 255, 255), font_thickness, cv2.LINE_AA)

    return annotated



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
    prefix: str = "upload_incident",
    bbox: Optional[List[int]] = None,
    label: Optional[str] = None,
    confidence: Optional[float] = None,
    event_start_seconds: Optional[float] = None,
    event_end_seconds: Optional[float] = None,
    detections: Optional[List[Dict[str, Any]]] = None
) -> str:
    """
    Extract an incident clip from an uploaded video between start_seconds and end_seconds,
    drawing bounding boxes and label badges directly on the video frames during the detected incident.
    Encodes to universal browser-compatible H.264 MP4.
    """
    if not os.path.exists(source_video_path):
        raise FileNotFoundError(f"Source video not found: {source_video_path}")

    start_sec = max(0.0, start_seconds)
    duration = max(1.0, end_seconds - start_sec)
    unique_id = uuid.uuid4().hex[:10]
    raw_path = os.path.join(TEMP_DIR, f"{prefix}_{unique_id}_raw.mp4")
    final_path = os.path.join(TEMP_DIR, f"{prefix}_{unique_id}.mp4")

    # Read frames and draw bounding boxes on incident frames
    cap = cv2.VideoCapture(source_video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    if fps <= 0 or np.isnan(fps):
        fps = 25.0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    start_frame = int(start_sec * fps)
    end_frame = int(end_seconds * fps)

    cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(raw_path, fourcc, fps, (w, h))

    ev_start = event_start_seconds if event_start_seconds is not None else start_sec
    ev_end = event_end_seconds if event_end_seconds is not None else end_seconds

    current_frame = start_frame
    while cap.isOpened() and current_frame <= end_frame:
        ret, frame = cap.read()
        if not ret:
            break

        current_time_sec = current_frame / fps

        # If this frame is within the incident occurrence, draw bounding box
        if (ev_start - 0.5) <= current_time_sec <= (ev_end + 0.5):
            cur_bbox = bbox
            cur_conf = confidence or 0.8
            cur_label = label or "INCIDENT"

            if detections:
                closest = min(detections, key=lambda d: abs(d.get("offset", 0.0) - current_time_sec))
                cur_bbox = closest.get("bbox") or cur_bbox
                cur_conf = closest.get("confidence") or cur_conf
                cur_label = closest.get("type") or cur_label

            annotated_frame = draw_bounding_box(
                frame=frame,
                bbox=cur_bbox,
                label=cur_label,
                confidence=cur_conf
            )
            out.write(annotated_frame)
        else:
            out.write(frame)

        current_frame += 1

    cap.release()
    out.release()

    # Transcode with ffmpeg for universal browser H.264 playback
    try:
        cmd = [
            "ffmpeg", "-y", "-i", raw_path,
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-movflags", "+faststart", final_path
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60)
        if result.returncode == 0 and os.path.exists(final_path):
            if os.path.exists(raw_path):
                os.remove(raw_path)
            return final_path
    except Exception as e:
        logger.warning("ffmpeg transcoding failed (%s). Using raw MP4 file.", e)

    return raw_path


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
