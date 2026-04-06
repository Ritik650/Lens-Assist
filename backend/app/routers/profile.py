from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.profile import PetProfile
from app.schemas.profile import ProfileUpdate, ProfileResponse, PetProfileCreate, PetProfileResponse, VehicleProfileCreate, VehicleProfileResponse
from app.services.profile_service import get_or_create_profile, update_profile, serialize_profile, create_pet, get_pets, serialize_pet
from app.dependencies import get_current_user_id
import json

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=dict)
def get_profile(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    profile = get_or_create_profile(db, user_id)
    return serialize_profile(profile)


@router.put("")
def update_profile_endpoint(
    data: ProfileUpdate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    profile = update_profile(db, user_id, data)
    return serialize_profile(profile)


@router.get("/pets")
def list_pets(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    pets = get_pets(db, user_id)
    return [serialize_pet(p) for p in pets]


@router.post("/pets")
def add_pet(
    data: PetProfileCreate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    pet = create_pet(db, user_id, data)
    return serialize_pet(pet)


@router.delete("/pets/{pet_id}")
def delete_pet(
    pet_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    pet = db.query(PetProfile).filter(PetProfile.id == pet_id, PetProfile.user_id == user_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    db.delete(pet)
    db.commit()
    return {"ok": True}
