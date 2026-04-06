from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    preferred_lang: Optional[str] = None
    allergies: Optional[List[str]] = None
    allergy_severities: Optional[Dict[str, str]] = None
    conditions: Optional[List[str]] = None
    medications: Optional[List[str]] = None
    diet_type: Optional[str] = None
    nutritional_goals: Optional[List[str]] = None
    visual_impairment: Optional[str] = None
    skin_type: Optional[str] = None
    skin_sensitivities: Optional[List[str]] = None
    skin_concerns: Optional[List[str]] = None
    vehicle_info: Optional[Dict[str, Any]] = None
    emergency_contact: Optional[str] = None
    blood_group: Optional[str] = None

class ProfileResponse(BaseModel):
    id: str
    user_id: str
    name: str
    age: Optional[int]
    preferred_lang: str
    allergies: List[str]
    allergy_severities: Dict[str, str]
    conditions: List[str]
    medications: List[str]
    diet_type: str
    nutritional_goals: List[str]
    visual_impairment: str
    skin_type: str
    skin_sensitivities: List[str]
    skin_concerns: List[str]
    vehicle_info: Optional[Dict[str, Any]]
    emergency_contact: Optional[str]
    blood_group: Optional[str]

    class Config:
        from_attributes = True

class PetProfileCreate(BaseModel):
    pet_name: str
    species: str
    breed: Optional[str] = None
    age_years: Optional[float] = None
    weight_kg: Optional[float] = None
    known_allergies: Optional[List[str]] = []
    conditions: Optional[List[str]] = []

class PetProfileResponse(BaseModel):
    id: str
    user_id: str
    pet_name: str
    species: str
    breed: Optional[str]
    age_years: Optional[float]
    weight_kg: Optional[float]
    known_allergies: List[str]
    conditions: List[str]

    class Config:
        from_attributes = True

class VehicleProfileCreate(BaseModel):
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    fuel_type: Optional[str] = None
    voltage: Optional[str] = "12V"

class VehicleProfileResponse(BaseModel):
    id: str
    user_id: str
    make: Optional[str]
    model: Optional[str]
    year: Optional[int]
    fuel_type: Optional[str]
    voltage: Optional[str]

    class Config:
        from_attributes = True
