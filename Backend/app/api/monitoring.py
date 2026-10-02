import base64
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import cv2
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends, HTTPException, status
from pydantic import BaseModel
from app.core.config import settings
from app.core.security import decode_access_token
from app.core.dependencies import get_current_user
from app.detectors.registry import DetectorRegistry
from app.monitoring.incident_manager import LiveIncidentManager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Monitoring & WebSockets"])


class MonitoringControlRequest(BaseModel):
    camera_name: str = "Webcam 1"
    model_choice: str = "both"  # "waste_bin", "fire_smoke", "both"


active_sessions: Dict[str, Dict[str, Any]] = {}


@router.post("/monitoring/start")
async def start_monitoring(
    req: MonitoringControlRequest,
    current_user: dict = Depends(get_current_user)
):
    """Register or initialize a monitoring session."""
    user_id = current_user["_id"]
    active_sessions[user_id] = {
        "status": "RUNNING",
        "camera_name": req.camera_name,
        "model_choice": req.model_choice,
        "started_at": datetime.now(timezone.utc).isoformat()
    }
    return {
        "status": "STARTED",
        "session": active_sessions[user_id],
        "message": "Monitoring session initialized."
    }


@router.post("/monitoring/stop")
async def stop_monitoring(current_user: dict = Depends(get_current_user)):
    """Stop active monitoring session."""
    user_id = current_user["_id"]
    if user_id in active_sessions:
        del active_sessions[user_id]
    return {"status": "STOPPED", "message": "Monitoring session stopped."}


@router.websocket("/ws/monitoring")
async def websocket_monitoring(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
):
    """
    Real-time WebSocket endpoint for live camera feed processing.
    Accepts client frames, performs AI inference using preloaded detectors,
    maintains rolling buffer and incident deduplication,
    and returns detection metrics and saved incident events.
    """
    await websocket.accept()

    # Authenticate token from query param or cookies
    auth_token = token or websocket.cookies.get(settings.COOKIE_NAME)
    if not auth_token:
        await websocket.send_json({"error": "Authentication required. Missing token."})
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    payload = decode_access_token(auth_token)
    if not payload:
        await websocket.send_json({"error": "Invalid or expired token."})
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = payload.get("sub", "anonymous")

    # Initialize live incident manager for this connection
    async def incident_saved_callback(incident_doc: Dict[str, Any]):
        try:
            # Broadcast to frontend
            await websocket.send_json({
                "type": "INCIDENT_SAVED",
                "incident": incident_doc
            })
        except Exception as e:
            logger.warning("Could not send incident saved notification to client: %s", e)

    camera_name = "Webcam 1"
    model_choice = "both"
    incident_mgr = LiveIncidentManager(
        camera_name=camera_name,
        source_id="webcam_live",
        user_id=user_id,
        on_incident_saved=incident_saved_callback
    )

    waste_detector = DetectorRegistry.get_waste_bin_detector()
    fire_detector = DetectorRegistry.get_fire_smoke_detector()

    try:
        while True:
            raw_text = await websocket.receive_text()
            data = json.loads(raw_text)

            msg_type = data.get("action")

            if msg_type == "configure":
                model_choice = data.get("model_choice", "both")
                camera_name = data.get("camera_name", "Webcam 1")
                incident_mgr.camera_name = camera_name
                await websocket.send_json({
                    "type": "CONFIG_ACK",
                    "model_choice": model_choice,
                    "camera_name": camera_name
                })
                continue

            elif msg_type == "frame":
                frame_data = data.get("data")
                if not frame_data:
                    continue

                # Strip base64 header if present
                if "," in frame_data:
                    frame_data = frame_data.split(",")[1]

                img_bytes = base64.b64decode(frame_data)
                np_arr = np.frombuffer(img_bytes, np.uint8)
                frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

                if frame is None:
                    continue

                detections = []
                now_str = datetime.now(timezone.utc).isoformat()

                # Run inference based on selected model
                if model_choice in ["waste_bin", "both"]:
                    w_res = waste_detector.detect(frame)
                    if w_res.get("detected"):
                        detections.append({
                            "type": w_res["type"],
                            "confidence": w_res["confidence"],
                            "bbox": w_res.get("bbox"),
                            "label": w_res.get("label"),
                            "timestamp": now_str
                        })

                if model_choice in ["fire_smoke", "both"]:
                    f_res = fire_detector.detect(frame)
                    if f_res.get("detected"):
                        detections.append({
                            "type": f_res["type"],
                            "confidence": f_res["confidence"],
                            "bbox": f_res.get("bbox"),
                            "label": f_res.get("label"),
                            "timestamp": now_str
                        })

                # Feed into live incident deduplicator and rolling buffer
                incident_mgr.process_frame(frame, detections)

                # Return detection result to client
                await websocket.send_json({
                    "type": "DETECTION_UPDATE",
                    "detections": detections,
                    "active_incidents": list(incident_mgr.active_incidents.keys()),
                    "timestamp": now_str
                })

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected for user %s", user_id)
    except Exception as e:
        logger.error("WebSocket exception: %s", e, exc_info=True)
        try:
            await websocket.close()
        except Exception:
            pass
