from enum import Enum
from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, Field


class IncidentType(str, Enum):
    WASTE_BIN_OVERFLOW = "WASTE_BIN_OVERFLOW"
    FIRE = "FIRE"
    SMOKE = "SMOKE"


class ModelType(str, Enum):
    WASTE_BIN = "waste_bin"
    FIRE_SMOKE = "fire_smoke"


class SourceType(str, Enum):
    LIVE_CAMERA = "LIVE_CAMERA"
    UPLOADED_VIDEO = "UPLOADED_VIDEO"


class IncidentStatus(str, Enum):
    CONFIRMED = "CONFIRMED"
    DETECTED = "DETECTED"
    RESOLVED = "RESOLVED"


class IncidentBase(BaseModel):
    incident_type: IncidentType
    model_type: ModelType
    confidence: float
    source_type: SourceType
    status: IncidentStatus = IncidentStatus.CONFIRMED

    # Media storage (Cloudinary)
    video_url: Optional[str] = None
    video_public_id: Optional[str] = None
    snapshot_url: Optional[str] = None
    snapshot_public_id: Optional[str] = None

    # Common audit
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # CASE 1: LIVE CAMERA SPECIFIC FIELDS
    source_id: Optional[str] = None
    camera_name: Optional[str] = None
    incident_detected_at: Optional[datetime] = None  # Calendar date/time of detection
    incident_ended_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    pre_event_seconds: Optional[float] = None
    post_event_seconds: Optional[float] = None

    # CASE 2: UPLOADED VIDEO SPECIFIC FIELDS
    original_filename: Optional[str] = None
    uploaded_at: Optional[datetime] = None  # Upload timestamp (NOT the event timestamp)
    video_duration_seconds: Optional[float] = None
    video_format: Optional[str] = None
    file_size_bytes: Optional[int] = None
    video_timestamp_detected: Optional[float] = None  # Point inside video detection occurred
    event_start_offset_seconds: Optional[float] = None  # Detection start offset inside file
    event_end_offset_seconds: Optional[float] = None  # Detection end offset inside file
    event_duration_seconds: Optional[float] = None
    clip_start_offset_seconds: Optional[float] = None
    clip_end_offset_seconds: Optional[float] = None
    pre_event_clip_seconds: Optional[float] = None
    post_event_clip_seconds: Optional[float] = None
    video_recorded_at: Optional[datetime] = None  # Original recording timestamp only if in video metadata


class IncidentCreate(IncidentBase):
    pass


class IncidentResponse(IncidentBase):
    id: str = Field(alias="_id")

    class Config:
        populate_by_name = True


class IncidentFilter(BaseModel):
    incident_type: Optional[str] = None
    source_type: Optional[str] = None
    search: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    sort: Optional[str] = "desc"  # 'desc' or 'asc'
    page: int = 1
    limit: int = 10


class IncidentListResponse(BaseModel):
    incidents: List[IncidentResponse]
    total: int
    page: int
    limit: int
    pages: int
