import os
import logging
from typing import Dict, Any, Optional, List
import cv2
import numpy as np
from app.detectors.base import BaseDetector
from app.core.config import settings

logger = logging.getLogger(__name__)


class FireSmokeDetector(BaseDetector):
    """
    Pluggable Fire and Smoke Detector.
    Supports:
    1. Direct integration with custom PyTorch / YOLO weights (if model file provided).
    2. Computer vision color-space (HSV/YCrCb) chrominance & luminance analysis
       as a reliable built-in fallback detector.
    Loaded once and reused across frames.
    """

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path
        self.custom_model = None
        self._load_model()

    def _load_model(self):
        # Check if an external YOLO / PyTorch model file is available
        potential_model_paths = [
            self.model_path,
            os.path.join(os.getcwd(), "models", "fire_smoke.pt"),
            os.path.join(os.getcwd(), "models", "fire_smoke.onnx")
        ]

        for p in potential_model_paths:
            if p and os.path.exists(p):
                try:
                    logger.info("Loading fire/smoke model weights from %s...", p)
                    # Example for Ultralytics YOLO if pt is present
                    from ultralytics import YOLO
                    self.custom_model = YOLO(p)
                    logger.info("[OK] Custom Fire/Smoke YOLO model loaded successfully.")
                    return
                except Exception as e:
                    logger.warning("Could not load custom weights from %s: %s", p, e)

        logger.info("[INFO] Using CV-based chrominance & flame dynamics detector for Fire/Smoke.")

    def detect(self, frame: np.ndarray) -> Dict[str, Any]:
        """
        Process frame and detect presence of Fire or Smoke.
        Returns detection status, type (FIRE / SMOKE), confidence, and bounding box.
        """
        if frame is None or frame.size == 0:
            return {
                "detected": False,
                "type": None,
                "confidence": 0.0,
                "bbox": None,
                "label": "Invalid frame",
                "details": {}
            }

        # 1. If custom neural model is loaded, run inference
        if self.custom_model is not None:
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
                logger.error("Error executing custom YOLO fire/smoke model: %s", e)

        # 2. Heuristic Computer Vision Detector (HSV & YCrCb flame/smoke analysis)
        return self._detect_heuristics(frame)

    def _detect_heuristics(self, frame: np.ndarray) -> Dict[str, Any]:
        """
        Analyze flame and smoke characteristics via HSV & YCrCb color spaces.
        Fire: High Red/Yellow chrominance + high value in HSV + Y >= Cr >= Cb in YCrCb.
        Smoke: Low saturation, medium-to-high luminance, diffused region.
        """
        h, w = frame.shape[:2]
        blur = cv2.GaussianBlur(frame, (15, 15), 0)

        # Convert to HSV
        hsv = cv2.cvtColor(blur, cv2.COLOR_BGR2HSV)
        # Convert to YCrCb
        ycrcb = cv2.cvtColor(blur, cv2.COLOR_BGR2YCrCb)

        # Fire color range in HSV:
        # H: 0-35 (reds, oranges, bright yellows)
        # S: 120-255 (rich flame saturation)
        # V: 180-255 (high intensity luminescence)
        lower_fire = np.array([0, 120, 180], dtype=np.uint8)
        upper_fire = np.array([35, 255, 255], dtype=np.uint8)
        fire_mask = cv2.inRange(hsv, lower_fire, upper_fire)

        # YCrCb condition for fire: Y > Cr > Cb
        y, cr, cb = cv2.split(ycrcb)
        ycrcb_fire = (y > cr) & (cr > cb) & (cr > 135)
        combined_fire = fire_mask & (ycrcb_fire.astype(np.uint8) * 255)

        # Smoke characteristics in HSV:
        # Low saturation (S: 0-45), mid-to-high lightness (V: 120-220)
        lower_smoke = np.array([0, 0, 120], dtype=np.uint8)
        upper_smoke = np.array([180, 45, 220], dtype=np.uint8)
        smoke_mask = cv2.inRange(hsv, lower_smoke, upper_smoke)

        # Morphological operations to remove noise
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        combined_fire = cv2.morphologyEx(combined_fire, cv2.MORPH_OPEN, kernel)
        smoke_mask = cv2.morphologyEx(smoke_mask, cv2.MORPH_OPEN, kernel)

        fire_pixels = cv2.countNonZero(combined_fire)
        smoke_pixels = cv2.countNonZero(smoke_mask)
        total_pixels = h * w

        fire_ratio = fire_pixels / float(total_pixels)
        smoke_ratio = smoke_pixels / float(total_pixels)

        # Fire detection threshold (0.4% of frame with concentrated flame contour)
        if fire_ratio > 0.004:
            contours, _ = cv2.findContours(combined_fire, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if contours:
                largest_c = max(contours, key=cv2.contourArea)
                x, y_box, bw, bh = cv2.boundingRect(largest_c)
                area = bw * bh
                if area > 400:  # significant flame cluster
                    conf = min(0.98, 0.65 + (fire_ratio * 15))
                    return {
                        "detected": True,
                        "type": "FIRE",
                        "confidence": round(conf, 4),
                        "bbox": [x, y_box, x + bw, y_box + bh],
                        "label": "FIRE DETECTED",
                        "details": {"fire_ratio": round(fire_ratio, 5), "area": area}
                    }

        # Smoke detection threshold (12% of frame with diffused cloud profile)
        if smoke_ratio > 0.12:
            contours, _ = cv2.findContours(smoke_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if contours:
                largest_c = max(contours, key=cv2.contourArea)
                x, y_box, bw, bh = cv2.boundingRect(largest_c)
                conf = min(0.92, 0.55 + (smoke_ratio * 1.5))
                return {
                    "detected": True,
                    "type": "SMOKE",
                    "confidence": round(conf, 4),
                    "bbox": [x, y_box, x + bw, y_box + bh],
                    "label": "SMOKE DETECTED",
                    "details": {"smoke_ratio": round(smoke_ratio, 5)}
                }

        return {
            "detected": False,
            "type": None,
            "confidence": 0.0,
            "bbox": None,
            "label": "CLEAR",
            "details": {"fire_ratio": round(fire_ratio, 5), "smoke_ratio": round(smoke_ratio, 5)}
        }
