import time
import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List, Callable
import numpy as np
from app.core.config import settings
from app.monitoring.rolling_buffer import RollingBuffer
from app.services.video_processor import save_snapshot, frames_to_video, draw_bounding_box
from app.services.cloudinary_service import upload_image, upload_video
from app.database.mongodb import get_database

logger = logging.getLogger(__name__)


class IncidentSession:
    """Represents an ongoing live incident tracking state."""
    def __init__(self, incident_type: str, model_type: str, start_time: float, start_dt: datetime, confidence: float, snapshot_frame: np.ndarray, pre_frames: List[np.ndarray], bbox: Optional[List[int]] = None):
        self.incident_type = incident_type
        self.model_type = model_type
        self.start_time = start_time
        self.start_dt = start_dt
        self.last_detection_time = start_time
        self.end_time = start_time
        self.end_dt = start_dt
        self.max_confidence = confidence
        self.snapshot_frame = snapshot_frame
        self.frames: List[np.ndarray] = list(pre_frames)
        self.bbox = bbox
        self.is_finalizing = False
        self.post_event_deadline: Optional[float] = None


class LiveIncidentManager:
    """
    Manages detection confirmation, deduplication, rolling buffer context,
    incident continuation, cooldown, and async upload to Cloudinary and MongoDB.
    """

    def __init__(
        self,
        camera_name: str = "Webcam 1",
        source_id: str = "cam_default",
        user_id: str = "system",
        on_incident_saved: Optional[Callable[[Dict[str, Any]], Any]] = None
    ):
        self.camera_name = camera_name
        self.source_id = source_id
        self.user_id = user_id
        self.on_incident_saved = on_incident_saved

        self.rolling_buffer = RollingBuffer(
            max_seconds=settings.PRE_EVENT_SECONDS + 2.0,
            approx_fps=15
        )

        # Tracks ongoing incidents by incident_type (e.g. "FIRE", "WASTE_BIN_OVERFLOW", "SMOKE")
        self.active_incidents: Dict[str, IncidentSession] = {}

        # Cooldown timestamps by incident_type
        self.cooldowns: Dict[str, float] = {}

    def process_frame(self, frame: np.ndarray, detections: List[Dict[str, Any]]):
        """
        Feed frame and its detector results into the incident lifecycle manager.
        """
        now = time.time()
        now_dt = datetime.now(timezone.utc)
        self.rolling_buffer.append(frame, now)

        detected_types_now = set()

        for det in detections:
            if not det.get("detected"):
                continue

            inc_type = det["type"]
            confidence = det.get("confidence", 0.0)
            bbox = det.get("bbox")
            model_type = "waste_bin" if inc_type == "WASTE_BIN_OVERFLOW" else "fire_smoke"

            # Check threshold
            thresh = (
                settings.WASTE_BIN_CONFIDENCE_THRESHOLD if inc_type == "WASTE_BIN_OVERFLOW"
                else (settings.FIRE_CONFIDENCE_THRESHOLD if inc_type == "FIRE" else settings.SMOKE_CONFIDENCE_THRESHOLD)
            )
            if confidence < thresh:
                continue

            detected_types_now.add(inc_type)

            # Draw bounding box on snapshot frame
            annotated_snap = draw_bounding_box(
                frame=frame,
                bbox=bbox,
                label=inc_type,
                confidence=confidence
            )

            # Check if active
            if inc_type in self.active_incidents:
                session = self.active_incidents[inc_type]
                session.last_detection_time = now
                session.end_time = now
                session.end_dt = now_dt
                if confidence > session.max_confidence:
                    session.max_confidence = confidence
                    session.snapshot_frame = annotated_snap
                    session.bbox = bbox
                session.frames.append(frame.copy())
            else:
                # Check cooldown
                last_cool = self.cooldowns.get(inc_type, 0.0)
                if now < last_cool:
                    # Still cooling down from previous incident
                    continue

                # Start new incident session
                logger.info("[ALERT] New incident started: %s (Confidence: %.2f)", inc_type, confidence)
                # Fetch pre-event frames
                pre_event_start = now - settings.PRE_EVENT_SECONDS
                pre_items = self.rolling_buffer.get_frames_since(pre_event_start)
                pre_frames = [item[1] for item in pre_items]

                session = IncidentSession(
                    incident_type=inc_type,
                    model_type=model_type,
                    start_time=now,
                    start_dt=now_dt,
                    confidence=confidence,
                    snapshot_frame=annotated_snap,
                    pre_frames=pre_frames,
                    bbox=bbox
                )
                self.active_incidents[inc_type] = session


        # Check existing incidents that were NOT detected in this frame
        # (Incident continuation vs completion)
        types_to_remove = []
        for inc_type, session in list(self.active_incidents.items()):
            if inc_type not in detected_types_now:
                # Add frame during grace / post-event period
                session.frames.append(frame.copy())

                # If no detection for 2.0s, enter post-event finalization
                if not session.is_finalizing:
                    if (now - session.last_detection_time) > 2.0:
                        session.is_finalizing = True
                        session.post_event_deadline = now + settings.POST_EVENT_SECONDS
                        logger.info("Incident %s detection ended. Capturing %ds post-event context...",
                                    inc_type, settings.POST_EVENT_SECONDS)

                # Check if post-event period has concluded
                if session.is_finalizing and session.post_event_deadline:
                    if now >= session.post_event_deadline:
                        types_to_remove.append(inc_type)
                        # Schedule asynchronous save to avoid blocking real-time feed
                        asyncio.create_task(self._finalize_and_save_incident(session))

        for it in types_to_remove:
            del self.active_incidents[it]

    async def _finalize_and_save_incident(self, session: IncidentSession):
        """Builds clip, snapshot, uploads to Cloudinary/local storage, and saves to MongoDB."""
        try:
            logger.info("Finalizing incident: %s...", session.incident_type)
            duration = max(1.0, session.end_time - session.start_time)

            # 1. Save snapshot image
            snap_path = save_snapshot(session.snapshot_frame, prefix=f"snap_{session.incident_type.lower()}")
            snap_res = upload_image(snap_path, folder="vision_civic/snapshots")

            # 2. Build and save incident video clip
            clip_path = frames_to_video(session.frames, fps=15, prefix=f"clip_{session.incident_type.lower()}")
            video_res = upload_video(clip_path, folder="vision_civic/incident_clips")

            # 3. Construct Live Camera Incident Document
            incident_doc = {
                "incident_type": session.incident_type,
                "model_type": session.model_type,
                "confidence": round(session.max_confidence, 4),
                "bbox": session.bbox,
                "source_type": "LIVE_CAMERA",

                "source_id": self.source_id,
                "camera_name": self.camera_name,
                "incident_detected_at": session.start_dt,
                "incident_ended_at": session.end_dt,
                "duration_seconds": round(duration, 2),
                "pre_event_seconds": float(settings.PRE_EVENT_SECONDS),
                "post_event_seconds": float(settings.POST_EVENT_SECONDS),
                "video_url": video_res.get("url"),
                "video_public_id": video_res.get("public_id"),
                "snapshot_url": snap_res.get("url"),
                "snapshot_public_id": snap_res.get("public_id"),
                "status": "CONFIRMED",
                "created_by": self.user_id,
                "created_at": datetime.now(timezone.utc)
            }

            db = get_database()
            result = await db.incidents.insert_one(incident_doc)
            incident_doc["_id"] = str(result.inserted_id)

            # Set cooldown
            self.cooldowns[session.incident_type] = time.time() + settings.INCIDENT_COOLDOWN_SECONDS
            logger.info("[SAVED] Incident saved to DB: %s (ID: %s)", session.incident_type, incident_doc["_id"])

            if self.on_incident_saved:
                if asyncio.iscoroutinefunction(self.on_incident_saved):
                    await self.on_incident_saved(incident_doc)
                else:
                    self.on_incident_saved(incident_doc)

        except Exception as e:
            logger.error("Failed to finalize incident %s: %s", session.incident_type, e, exc_info=True)
