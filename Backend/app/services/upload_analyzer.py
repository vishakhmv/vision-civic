import os
import cv2
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Callable
from app.core.config import settings
from app.detectors.registry import DetectorRegistry
from app.services.video_processor import extract_video_clip, save_snapshot, get_video_metadata
from app.services.cloudinary_service import upload_image, upload_video
from app.database.mongodb import get_database

logger = logging.getLogger(__name__)


async def analyze_uploaded_video(
    video_path: str,
    original_filename: str,
    file_size_bytes: int,
    user_id: str,
    model_choice: str = "both",  # "waste_bin", "fire_smoke", or "both"
    progress_callback: Optional[Callable[[float, str], Any]] = None
) -> List[Dict[str, Any]]:
    """
    Process an uploaded video file, detect civic incidents,
    extract accurate timestamp offsets and incident clips,
    upload clips/snapshots to Cloudinary, and save to MongoDB.
    """
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file does not exist: {video_path}")

    upload_time = datetime.now(timezone.utc)
    meta = get_video_metadata(video_path)
    video_duration = meta["duration"]
    video_recorded_at = meta.get("recorded_at")  # Only populated if present in container metadata

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Could not open video stream from {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    waste_detector = DetectorRegistry.get_waste_bin_detector() if model_choice in ["waste_bin", "both"] else None
    fire_detector = DetectorRegistry.get_fire_smoke_detector() if model_choice in ["fire_smoke", "both"] else None

    # Step: sample frames (every 0.5s or every 5 frames) to balance high accuracy with fast turnaround
    sample_step = max(1, int(fps * 0.5))

    frame_idx = 0
    raw_detections: List[Dict[str, Any]] = []

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % sample_step == 0:
            current_offset_sec = round(frame_idx / fps, 2)
            frame_dets = []

            if waste_detector:
                w_res = waste_detector.detect(frame)
                if w_res.get("detected"):
                    frame_dets.append(w_res)

            if fire_detector:
                f_res = fire_detector.detect(frame)
                if f_res.get("detected"):
                    frame_dets.append(f_res)

            for d in frame_dets:
                raw_detections.append({
                    "offset": current_offset_sec,
                    "type": d["type"],
                    "confidence": d["confidence"],
                    "frame": frame.copy()
                })

            if progress_callback and total_frames > 0:
                pct = round((frame_idx / total_frames) * 70.0, 1)  # 0 to 70% scanning
                if asyncio_is_coro := getattr(progress_callback, "__code__", None):
                    import inspect
                    if inspect.iscoroutinefunction(progress_callback):
                        await progress_callback(pct, f"Scanning video ({current_offset_sec}s / {video_duration}s)...")
                    else:
                        progress_callback(pct, f"Scanning video ({current_offset_sec}s / {video_duration}s)...")

        frame_idx += 1

    cap.release()

    # Group consecutive detections into distinct incidents
    incidents_by_type: Dict[str, List[Dict[str, Any]]] = {}
    for d in raw_detections:
        itype = d["type"]
        if itype not in incidents_by_type:
            incidents_by_type[itype] = []
        incidents_by_type[itype].append(d)

    grouped_incidents: List[Dict[str, Any]] = []
    cooldown_tolerance = 5.0  # seconds gap to bridge continuous events

    for itype, dets in incidents_by_type.items():
        if not dets:
            continue

        # Sort by offset
        dets.sort(key=lambda x: x["offset"])

        current_group = [dets[0]]
        for d in dets[1:]:
            if d["offset"] - current_group[-1]["offset"] <= cooldown_tolerance:
                current_group.append(d)
            else:
                grouped_incidents.append(current_group)
                current_group = [d]
        if current_group:
            grouped_incidents.append(current_group)

    created_incidents: List[Dict[str, Any]] = []
    total_groups = len(grouped_incidents)

    db = get_database()

    for idx, grp in enumerate(grouped_incidents):
        itype = grp[0]["type"]
        model_type = "waste_bin" if itype == "WASTE_BIN_OVERFLOW" else "fire_smoke"

        event_start_offset = grp[0]["offset"]
        event_end_offset = grp[-1]["offset"]
        event_duration = max(1.0, round(event_end_offset - event_start_offset, 2))

        # Highest confidence frame becomes the snapshot
        best_item = max(grp, key=lambda x: x["confidence"])
        best_conf = best_item["confidence"]
        best_frame = best_item["frame"]

        # Calculate clip context
        clip_start_offset = max(0.0, round(event_start_offset - settings.PRE_EVENT_SECONDS, 2))
        clip_end_offset = min(video_duration, round(event_end_offset + settings.POST_EVENT_SECONDS, 2))
        if clip_end_offset <= clip_start_offset:
            clip_end_offset = min(video_duration, clip_start_offset + 5.0)

        # 1. Save and upload snapshot
        snap_path = save_snapshot(best_frame, prefix=f"upload_snap_{itype.lower()}")
        snap_res = upload_image(snap_path, folder="vision_civic/snapshots")

        # 2. Extract and upload incident video clip
        clip_path = extract_video_clip(
            source_video_path=video_path,
            start_seconds=clip_start_offset,
            end_seconds=clip_end_offset,
            prefix=f"upload_clip_{itype.lower()}"
        )
        video_res = upload_video(clip_path, folder="vision_civic/incident_clips")

        # 3. Construct Document
        ext = os.path.splitext(original_filename)[1].lower().lstrip(".")
        incident_doc = {
            "incident_type": itype,
            "model_type": model_type,
            "confidence": round(best_conf, 4),
            "source_type": "UPLOADED_VIDEO",
            "original_filename": original_filename,
            "uploaded_at": upload_time,  # Upload timestamp (NOT the incident time)
            "video_duration_seconds": video_duration,
            "video_format": ext,
            "file_size_bytes": file_size_bytes,
            "video_timestamp_detected": best_item["offset"],
            "event_start_offset_seconds": event_start_offset,
            "event_end_offset_seconds": event_end_offset,
            "event_duration_seconds": event_duration,
            "clip_start_offset_seconds": clip_start_offset,
            "clip_end_offset_seconds": clip_end_offset,
            "pre_event_clip_seconds": float(settings.PRE_EVENT_SECONDS),
            "post_event_clip_seconds": float(settings.POST_EVENT_SECONDS),
            "video_recorded_at": video_recorded_at,  # None unless contained in video metadata
            "video_url": video_res.get("url"),
            "video_public_id": video_res.get("public_id"),
            "snapshot_url": snap_res.get("url"),
            "snapshot_public_id": snap_res.get("public_id"),
            "status": "CONFIRMED",
            "created_by": user_id,
            "created_at": datetime.now(timezone.utc)
        }

        insert_res = await db.incidents.insert_one(incident_doc)
        incident_doc["_id"] = str(insert_res.inserted_id)
        created_incidents.append(incident_doc)

        if progress_callback:
            progress_val = 70.0 + round(((idx + 1) / max(1, total_groups)) * 30.0, 1)
            import inspect
            msg = f"Generated incident clip {idx + 1} of {total_groups} ({itype})"
            if inspect.iscoroutinefunction(progress_callback):
                await progress_callback(progress_val, msg)
            else:
                progress_callback(progress_val, msg)

    return created_incidents
