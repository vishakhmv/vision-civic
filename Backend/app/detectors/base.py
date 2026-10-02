from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import numpy as np


class BaseDetector(ABC):
    """Base class for all Civic Vision detectors."""

    @abstractmethod
    def detect(self, frame: np.ndarray) -> Dict[str, Any]:
        """
        Process a single image frame (BGR numpy array from OpenCV).
        Returns a dictionary:
        {
            "detected": bool,
            "type": str,  # e.g., "WASTE_BIN_OVERFLOW", "FIRE", "SMOKE", None
            "confidence": float,  # 0.0 - 1.0
            "bbox": Optional[List[int]], # [x1, y1, x2, y2]
            "label": str,
            "details": Dict[str, Any]
        }
        """
        pass
