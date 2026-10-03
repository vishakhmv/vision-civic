import os
import cv2
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Callable
from app.core.config import settings
from app.detectors.registry import DetectorRegistry
from app.services.video_processor import extract_video_clip, save_snapshot, get_video_metadata, draw_bounding_box
from app.services.cloudinary_service import upload_image, upload_video
from app.database.mongodb import get_database

logger = logging.getLogger(__name__)

# Shared thread pool executor for non-blocking parallel model inference
executor = ThreadPoolExecutor(max_workers=4)


async def analyze_uploaded_image(
    image_path: str,
    original_filename: str,
    file_size_bytes: int,
    user_id: str,
    model_choice: str = "both"
) -> List[Dict[str, Any]]:
    """
    Process an uploaded image file using concurrent parallel model inference.
    Uploads the verified image snapshot (with bounding box & label) to Cloudinary and records the incident document in MongoDB.
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image file does not exist: {image_path}")

    upload_time = datetime.now(timezone.utc)
    frame = cv2.imread(image_path)
    if frame is None or frame.size == 0:
        raise ValueError(f"Could not decode image file: {image_path}")

    waste_detector = DetectorRegistry.get_waste_bin_detector() if model_choice in ["waste_bin", "both"] else None
    fire_detector = DetectorRegistry.get_fire_smoke_detector() if model_choice in ["fire_smoke", "both"] else None

    loop = asyncio.get_running_loop()
    tasks = []

    if waste_detector:
        tasks.append(loop.run_in_executor(executor, waste_detector.detect, frame))
    if fire_detector:
        tasks.append(loop.run_in_executor(executor, fire_detector.detect, frame))

    dets = []
    if tasks:
        results = await asyncio.gather(*tasks)
        for res in results:
            if res.get("detected"):
                dets.append(res)

    created_incidents = []
    db = get_database()

    for d in dets:
        itype = d["type"]
        model_type = "waste_bin" if itype == "WASTE_BIN_OVERFLOW" else "fire_smoke"
        conf = d["confidence"]
        bbox = d.get("bbox")

        # Annotate frame with bounding box and label
        annotated_frame = draw_bounding_box(
            frame=frame,
            bbox=bbox,
            label=itype,
            confidence=conf
        )

        # Save annotated snapshot and upload to Cloudinary
        snap_path = save_snapshot(annotated_frame, prefix=f"upload_img_{itype.lower()}")
        snap_res = upload_image(snap_path, folder="vision_civic/snapshots")

        ext = os.path.splitext(original_filename)[1].lower().lstrip(".")
        incident_doc = {
            "incident_type": itype,
            "model_type": model_type,
            "confidence": round(conf, 4),
            "bbox": bbox,
            "source_type": "UPLOADED_IMAGE",
            "original_filename": original_filename,
            "uploaded_at": upload_time,
            "file_size_bytes": file_size_bytes,
            "snapshot_url": snap_res.get("url"),
            "snapshot_public_id": snap_res.get("public_id"),
            "video_url": None,
            "video_public_id": None,
            "status": "CONFIRMED",
            "created_by": user_id,
            "created_at": datetime.now(timezone.utc)
        }

        insert_res = await db.incidents.insert_one(incident_doc)
        incident_doc["_id"] = str(insert_res.inserted_id)
        created_incidents.append(incident_doc)

    return created_incidents



async def analyze_uploaded_video(
    video_path: str,
    original_filename: str,
    file_size_bytes: int,
    user_id: str,
    model_choice: str = "both",  # "waste_bin", "fire_smoke", or "both"
    progress_callback: Optional[Callable[[float, str], Any]] = None
) -> List[Dict[str, Any]]:
    """
    Process an uploaded video using optimized interleaved frame scheduling
    and parallel thread pool multi-model execution.
    Groups continuous detections into distinct incident clips to prevent duplicate entries.
    """
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file does not exist: {video_path}")

    upload_time = datetime.now(timezone.utc)
    meta = get_video_metadata(video_path)
    video_duration = meta["duration"]
    video_recorded_at = meta.get("recorded_at")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Could not open video stream from {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    waste_detector = DetectorRegistry.get_waste_bin_detector() if model_choice in ["waste_bin", "both"] else None
    fire_detector = DetectorRegistry.get_fire_smoke_detector() if model_choice in ["fire_smoke", "both"] else None

    # Sample frames every ~0.4s
    sample_step = max(1, int(fps * 0.4))

    frame_idx = 0
    sample_count = 0
    raw_detections: List[Dict[str, Any]] = []

    loop = asyncio.get_running_loop()

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % sample_step == 0:
            current_offset_sec = round(frame_idx / fps, 2)
            sample_count += 1
            tasks = []

            # OPTIMIZATION: Interleaved Frame Scheduling + Concurrent Execution
            # When model_choice == "both":
            # - Run WasteBin detector on even samples (or both if active hazard)
            # - Run FireSmoke detector on odd samples (or both if active hazard)
            # - Execute model calls concurrently on ThreadPool
            run_waste = waste_detector is not None and (model_choice != "both" or sample_count % 2 == 1)
            run_fire = fire_detector is not None and (model_choice != "both" or sample_count % 2 == 0)

            if run_waste:
                tasks.append((loop.run_in_executor(executor, waste_detector.detect, frame.copy()), "waste_bin"))
            if run_fire:
                tasks.append((loop.run_in_executor(executor, fire_detector.detect, frame.copy()), "fire_smoke"))

            if tasks:
                fut_results = await asyncio.gather(*[t[0] for t in tasks])
                for res in fut_results:
                    if res.get("detected"):
                        bbox = res.get("bbox")
                        annotated = draw_bounding_box(
                            frame=frame,
                            bbox=bbox,
                            label=res["type"],
                            confidence=res["confidence"]
                        )
                        raw_detections.append({
                            "offset": current_offset_sec,
                            "type": res["type"],
                            "confidence": res["confidence"],
                            "bbox": bbox,
                            "frame": annotated
                        })

            if progress_callback and total_frames > 0:
                pct = round((frame_idx / total_frames) * 70.0, 1)
                import inspect
                if inspect.iscoroutinefunction(progress_callback):
                    await progress_callback(pct, f"Scanning video ({current_offset_sec}s / {video_duration}s)...")
                else:
                    progress_callback(pct, f"Scanning video ({current_offset_sec}s / {video_duration}s)...")

        frame_idx += 1

    cap.release()

    # Separate raw detections by incident type
    incidents_by_type: Dict[str, List[Dict[str, Any]]] = {}
    for d in raw_detections:
        itype = d["type"]
        if itype not in incidents_by_type:
            incidents_by_type[itype] = []
        incidents_by_type[itype].append(d)

    # DEDUPLICATION & MERGING: Group consecutive/adjacent detections within 5.0s gap into 1 continuous incident clip
    grouped_incidents: List[Dict[str, Any]] = []
    cooldown_tolerance = 5.0

    for itype, dets in incidents_by_type.items():
        if not dets:
            continue

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

        # Select the highest-confidence frame in the merged event for the keyframe snapshot
        best_item = max(grp, key=lambda x: x["confidence"])
        best_conf = best_item["confidence"]
        best_frame = best_item["frame"]
        best_bbox = best_item.get("bbox")

        # Calculate exact clip boundaries including pre-event & post-event context buffer
        clip_start_offset = max(0.0, round(event_start_offset - settings.PRE_EVENT_SECONDS, 2))
        clip_end_offset = min(video_duration, round(event_end_offset + settings.POST_EVENT_SECONDS, 2))
        if clip_end_offset <= clip_start_offset:
            clip_end_offset = min(video_duration, clip_start_offset + 5.0)

        # 1. Save and upload snapshot image (annotated with bounding box & label tag)
        snap_path = save_snapshot(best_frame, prefix=f"upload_snap_{itype.lower()}")
        snap_res = upload_image(snap_path, folder="vision_civic/snapshots")

        # 2. Extract and upload exact incident video segment clip
        clip_path = extract_video_clip(
            source_video_path=video_path,
            start_seconds=clip_start_offset,
            end_seconds=clip_end_offset,
            prefix=f"upload_clip_{itype.lower()}"
        )
        video_res = upload_video(clip_path, folder="vision_civic/incident_clips")

        # 3. Save MongoDB Incident Document
        ext = os.path.splitext(original_filename)[1].lower().lstrip(".")
        incident_doc = {
            "incident_type": itype,
            "model_type": model_type,
            "confidence": round(best_conf, 4),
            "bbox": best_bbox,
            "source_type": "UPLOADED_VIDEO",
            "original_filename": original_filename,
            "uploaded_at": upload_time,
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
            "video_recorded_at": video_recorded_at,
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
