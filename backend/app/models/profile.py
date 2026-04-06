import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, Float, ForeignKey
from app.database import Base

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, unique=True)
    name = Column(String, nullable=False, default="User")
    age = Column(Integer, nullable=True)
    preferred_lang = Column(String, default="en")
    # Health
    allergies = Column(Text, default="[]")           # JSON array
    allergy_severities = Column(Text, default="{}")  # JSON object
    conditions = Column(Text, default="[]")          # JSON array
    medications = Column(Text, default="[]")         # JSON array
    # Diet
    diet_type = Column(String, default="none")       # none/vegetarian/vegan/halal/kosher/jain/keto
    nutritional_goals = Column(Text, default="[]")   # JSON array
    # Accessibility
    visual_impairment = Column(String, default="none")  # none/color_blind/low_vision/blind
    # Skin
    skin_type = Column(String, default="unknown")    # oily/dry/sensitive/combination/normal
    skin_sensitivities = Column(Text, default="[]")  # JSON array
    skin_concerns = Column(Text, default="[]")       # JSON array
    # Vehicle
    vehicle_info = Column(Text, nullable=True)       # JSON object
    # Emergency
    emergency_contact = Column(String, nullable=True)
    blood_group = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PetProfile(Base):
    __tablename__ = "pet_profiles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    pet_name = Column(String, nullable=False)
    species = Column(String, nullable=False)
    breed = Column(String, nullable=True)
    age_years = Column(Float, nullable=True)
    weight_kg = Column(Float, nullable=True)
    known_allergies = Column(Text, default="[]")
    conditions = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)


class VehicleProfile(Base):
    __tablename__ = "vehicle_profiles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    make = Column(String, nullable=True)
    model = Column(String, nullable=True)
    year = Column(Integer, nullable=True)
    fuel_type = Column(String, nullable=True)
    voltage = Column(String, default="12V")
    created_at = Column(DateTime, default=datetime.utcnow)
