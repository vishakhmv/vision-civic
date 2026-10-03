import os
import logging
from typing import Dict, Any, Optional
import cv2
import numpy as np
from PIL import Image
from app.detectors.base import BaseDetector
from app.core.config import settings

logger = logging.getLogger(__name__)


class WasteBinDetector(BaseDetector):
    """
    CLIP-based waste-bin overflow detection model.
    Strictly utilizes the fine-tuned saved_clip_model neural network.
    Loaded once and reused across inference frames.
    """

    def __init__(self, model_path: Optional[str] = None):
        self.device = "cuda" if self._has_cuda() else "cpu"
        self.model = None
        self.processor = None
        self.labels = [
            "an overflowing waste bin with garbage spilling out",
            "a normal clean or empty waste bin"
        ]
        self._load_model(model_path)

    def _has_cuda(self) -> bool:
        try:
            import torch
            return torch.cuda.is_available()
        except Exception:
            return False

    def _load_model(self, model_path: Optional[str] = None):
        try:
            import torch
            from transformers import CLIPProcessor, CLIPModel

            potential_paths = [
                model_path,
                os.path.join(os.getcwd(), "Waste-bin-overflow", "saved_clip_model"),
                os.path.join(os.path.dirname(__file__), "..", "..", "Waste-bin-overflow", "saved_clip_model"),
                "openai/clip-vit-base-patch32"
            ]

            target_path = "openai/clip-vit-base-patch32"
            for p in potential_paths:
                if p and os.path.exists(p):
                    target_path = p
                    break

            logger.info("Loading WasteBin CLIP neural model from %s onto %s...", target_path, self.device)
            self.model = CLIPModel.from_pretrained(target_path).to(self.device)
            self.processor = CLIPProcessor.from_pretrained(target_path)
            self.model.eval()
            logger.info("[OK] WasteBin CLIP neural model loaded successfully.")
        except Exception as e:
            logger.error("[CRITICAL] Failed to initialize CLIP model: %s", e)
            self.model = None
            self.processor = None

    def detect(self, frame: np.ndarray) -> Dict[str, Any]:
        """Detect waste bin overflow in an OpenCV BGR frame using the CLIP neural network."""
        h, w = frame.shape[:2]
        default_bbox = [int(w * 0.1), int(h * 0.1), int(w * 0.9), int(h * 0.9)]

        if self.model is None or self.processor is None or frame is None or frame.size == 0:
            return {
                "detected": False,
                "type": None,
                "confidence": 0.0,
                "bbox": None,
                "label": "Model not loaded",
                "details": {}
            }

        try:
            import torch

            # Convert BGR OpenCV frame to PIL RGB
            rgb_image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            inputs = self.processor(
                text=self.labels,
                images=rgb_image,
                return_tensors="pt",
                padding=True
            ).to(self.device)

            with torch.no_grad():
                outputs = self.model(**inputs)
                probs = outputs.logits_per_image.softmax(dim=1)

            overflow_prob = float(probs[0][0].item())
            is_overflow = overflow_prob >= settings.WASTE_BIN_CONFIDENCE_THRESHOLD

            return {
                "detected": is_overflow,
                "type": "WASTE_BIN_OVERFLOW" if is_overflow else None,
                "confidence": round(overflow_prob if is_overflow else (1.0 - overflow_prob), 4),
                "bbox": default_bbox if is_overflow else None,
                "label": "OVERFLOWING WASTE BIN" if is_overflow else "NORMAL BIN",
                "details": {
                    "overflow_prob": round(overflow_prob, 4),
                    "clean_prob": round(float(probs[0][1].item()), 4)
                }
            }
        except Exception as e:
            logger.error("Error during waste-bin CLIP inference: %s", e)
            return {
                "detected": False,
                "type": None,
                "confidence": 0.0,
                "bbox": None,
                "label": "Error",
                "details": {"error": str(e)}
            }
