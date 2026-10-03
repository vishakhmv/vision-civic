import os
import logging
from typing import Dict, Any, Optional
import numpy as np
from app.detectors.base import BaseDetector
from app.core.config import settings

logger = logging.getLogger(__name__)


class FireSmokeDetector(BaseDetector):
    """
    Fire and Smoke Object Detector.
    Strictly utilizes the trained YOLO model (fire_smoke/weights/best.pt).
    Loaded once and reused across inference frames.
    """

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path
        self.custom_model = None
        self._load_model()

    def _load_model(self):
        potential_model_paths = [
            self.model_path,
            os.path.join(os.getcwd(), "fire_smoke", "weights", "best.pt"),
            os.path.join(os.getcwd(), "fire_smoke", "weights", "last.pt"),
            os.path.join(os.path.dirname(__file__), "..", "..", "fire_smoke", "weights", "best.pt"),
            os.path.join(os.getcwd(), "models", "fire_smoke.pt"),
            os.path.join(os.getcwd(), "models", "fire_smoke.onnx")
        ]

        for p in potential_model_paths:
            if p and os.path.exists(p):
                try:
                    logger.info("Loading Fire/Smoke YOLO model weights from %s...", p)
                    from ultralytics import YOLO
                    self.custom_model = YOLO(p)
                    logger.info("[OK] Fire/Smoke YOLO model loaded successfully.")
                    return
                except Exception as e:
                    logger.error("Could not load YOLO model from %s: %s", p, e)

        logger.error("[CRITICAL] Could not locate or load Fire/Smoke YOLO model weights.")

    def detect(self, frame: np.ndarray) -> Dict[str, Any]:
        """
        Process frame and detect presence of Fire or Smoke using trained YOLO model.
        Returns detection status, type (FIRE / SMOKE), confidence score, and bounding box.
        """
        if frame is None or frame.size == 0 or self.custom_model is None:
            return {
                "detected": False,
                "type": None,
                "confidence": 0.0,
                "bbox": None,
                "label": "CLEAR",
                "details": {}
            }

        try:
            results = self.custom_model(frame, verbose=False)
            for r in results:
                for box in r.boxes:
                    cls_id = int(box.cls[0].item())
                    conf = float(box.conf[0].item())
                    cls_name = r.names.get(cls_id, "").upper()

                    if "FIRE" in cls_name and conf >= settings.FIRE_CONFIDENCE_THRESHOLD:
                        xyxy = [int(v) for v in box.xyxy[0].tolist()]
                        return {
                            "detected": True,
                            "type": "FIRE",
                            "confidence": round(conf, 4),
                            "bbox": xyxy,
                            "label": "FIRE DETECTED",
                            "details": {"model": "yolo", "class": cls_name}
                        }
                    elif "SMOKE" in cls_name and conf >= settings.SMOKE_CONFIDENCE_THRESHOLD:
                        xyxy = [int(v) for v in box.xyxy[0].tolist()]
                        return {
                            "detected": True,
                            "type": "SMOKE",
                            "confidence": round(conf, 4),
                            "bbox": xyxy,
                            "label": "SMOKE DETECTED",
                            "details": {"model": "yolo", "class": cls_name}
                        }
        except Exception as e:
            logger.error("Error executing YOLO Fire/Smoke model: %s", e)

        return {
            "detected": False,
            "type": None,
            "confidence": 0.0,
            "bbox": None,
            "label": "CLEAR",
            "details": {}
        }
