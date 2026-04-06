import json
from sqlalchemy.orm import Session
from app.models.profile import Profile, PetProfile, VehicleProfile
from app.schemas.profile import ProfileUpdate, PetProfileCreate, VehicleProfileCreate


def get_or_create_profile(db: Session, user_id: str, name: str = "User") -> Profile:
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    if not profile:
        profile = Profile(user_id=user_id, name=name)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def update_profile(db: Session, user_id: str, data: ProfileUpdate) -> Profile:
    profile = get_or_create_profile(db, user_id)
    update_data = data.model_dump(exclude_none=True)
    for key, value in update_data.items():
        if isinstance(value, (list, dict)):
            value = json.dumps(value)
        setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return profile


def serialize_profile(profile: Profile) -> dict:
    """Convert profile ORM to dict with parsed JSON fields."""
    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "name": profile.name,
        "age": profile.age,
        "preferred_lang": profile.preferred_lang,
        "allergies": json.loads(profile.allergies or "[]"),
        "allergy_severities": json.loads(profile.allergy_severities or "{}"),
        "conditions": json.loads(profile.conditions or "[]"),
        "medications": json.loads(profile.medications or "[]"),
        "diet_type": profile.diet_type,
        "nutritional_goals": json.loads(profile.nutritional_goals or "[]"),
        "visual_impairment": profile.visual_impairment,
        "skin_type": profile.skin_type,
        "skin_sensitivities": json.loads(profile.skin_sensitivities or "[]"),
        "skin_concerns": json.loads(profile.skin_concerns or "[]"),
        "vehicle_info": json.loads(profile.vehicle_info) if profile.vehicle_info else None,
        "emergency_contact": profile.emergency_contact,
        "blood_group": profile.blood_group,
    }


def create_pet(db: Session, user_id: str, data: PetProfileCreate) -> PetProfile:
    pet = PetProfile(
        user_id=user_id,
        **{
            k: json.dumps(v) if isinstance(v, list) else v
            for k, v in data.model_dump().items()
        },
    )
    db.add(pet)
    db.commit()
    db.refresh(pet)
    return pet


def get_pets(db: Session, user_id: str):
    return db.query(PetProfile).filter(PetProfile.user_id == user_id).all()


def serialize_pet(pet: PetProfile) -> dict:
    return {
        "id": pet.id,
        "user_id": pet.user_id,
        "pet_name": pet.pet_name,
        "species": pet.species,
        "breed": pet.breed,
        "age_years": pet.age_years,
        "weight_kg": pet.weight_kg,
        "known_allergies": json.loads(pet.known_allergies or "[]"),
        "conditions": json.loads(pet.conditions or "[]"),
    }
