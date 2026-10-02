import logging
from typing import Optional
from app.detectors.waste_bin_detector import WasteBinDetector
from app.detectors.fire_smoke_detector import FireSmokeDetector

logger = logging.getLogger(__name__)


class DetectorRegistry:
    _waste_bin_detector: Optional[WasteBinDetector] = None
    _fire_smoke_detector: Optional[FireSmokeDetector] = None

    @classmethod
    def get_waste_bin_detector(cls) -> WasteBinDetector:
        if cls._waste_bin_detector is None:
            logger.info("Initializing singleton WasteBinDetector...")
            cls._waste_bin_detector = WasteBinDetector()
        return cls._waste_bin_detector

    @classmethod
    def get_fire_smoke_detector(cls) -> FireSmokeDetector:
        if cls._fire_smoke_detector is None:
            logger.info("Initializing singleton FireSmokeDetector...")
            cls._fire_smoke_detector = FireSmokeDetector()
        return cls._fire_smoke_detector

    @classmethod
    def preload_all(cls):
        """Preload models on application startup."""
        cls.get_waste_bin_detector()
        cls.get_fire_smoke_detector()
