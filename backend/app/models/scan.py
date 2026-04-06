import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Float, ForeignKey, Integer, Boolean
from app.database import Base

class Scan(Base):
    __tablename__ = "scans"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    scan_mode = Column(String, default="auto")
    detected_type = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)
    product_name = Column(String, nullable=True)
    result_json = Column(Text, nullable=True)   # Full Claude response JSON
    image_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ScanMessage(Base):
    """Follow-up chat messages for a scan"""
    __tablename__ = "scan_messages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    scan_id = Column(String, ForeignKey("scans.id"), nullable=False)
    role = Column(String, nullable=False)   # "user" or "assistant"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    scan_id = Column(String, ForeignKey("scans.id"), nullable=True)
    store_name = Column(String, nullable=True)
    date = Column(String, nullable=True)
    total = Column(Float, nullable=True)
    currency = Column(String, default="INR")
    category = Column(String, nullable=True)
    items = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)


class PlantCollection(Base):
    __tablename__ = "plant_collection"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    scan_id = Column(String, ForeignKey("scans.id"), nullable=True)
    plant_name = Column(String, nullable=True)
    species = Column(String, nullable=True)
    location = Column(String, nullable=True)
    last_watered = Column(DateTime, nullable=True)
    care_schedule = Column(Text, nullable=True)
    is_pet_safe = Column(Boolean, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class FitnessLog(Base):
    __tablename__ = "fitness_log"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    scan_id = Column(String, ForeignKey("scans.id"), nullable=True)
    exercise = Column(String, nullable=True)
    form_score = Column(Integer, nullable=True)
    corrections = Column(Text, default="[]")
    logged_at = Column(DateTime, default=datetime.utcnow)


class SkinTracking(Base):
    __tablename__ = "skin_tracking"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    scan_id = Column(String, ForeignKey("scans.id"), nullable=True)
    body_area = Column(String, nullable=True)
    assessment = Column(Text, nullable=True)
    recommendation = Column(Text, nullable=True)
    image_path = Column(String, nullable=True)
    scanned_at = Column(DateTime, default=datetime.utcnow)
