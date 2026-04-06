from pydantic import BaseModel
from typing import Optional, Any, Dict
from datetime import datetime

class ScanRequest(BaseModel):
    image: str           # base64 encoded
    media_type: str = "image/jpeg"
    scan_mode: str = "auto"
    pet_id: Optional[str] = None
    vehicle_id: Optional[str] = None
    body_area: Optional[str] = None

class ScanResponse(BaseModel):
    id: str
    scan_mode: str
    detected_type: Optional[str]
    confidence: Optional[float]
    product_name: Optional[str]
    result: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True

class FollowUpRequest(BaseModel):
    question: str

class FollowUpResponse(BaseModel):
    answer: str

class CompareRequest(BaseModel):
    scan_a_id: str
    scan_b_id: str
