import time
from collections import deque
from typing import Tuple, List, Optional
import numpy as np


class RollingBuffer:
    """
    Maintains a rolling ring buffer of video frames with real-world timestamps
    to support pre-event context recording.
    """

    def __init__(self, max_seconds: float = 10.0, approx_fps: int = 15):
        self.max_seconds = max_seconds
        self.approx_fps = approx_fps
        self.max_frames = int(max_seconds * approx_fps)
        self.buffer = deque(maxlen=self.max_frames)

    def append(self, frame: np.ndarray, timestamp: Optional[float] = None):
        """Append frame along with its capture timestamp."""
        ts = timestamp if timestamp is not None else time.time()
        self.buffer.append((ts, frame))

    def get_frames_since(self, start_time: float) -> List[Tuple[float, np.ndarray]]:
        """Retrieve all frames recorded on or after start_time."""
        return [item for item in self.buffer if item[0] >= start_time]

    def get_all(self) -> List[Tuple[float, np.ndarray]]:
        return list(self.buffer)

    def clear(self):
        self.buffer.clear()
