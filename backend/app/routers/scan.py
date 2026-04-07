import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.scan import Scan, ScanMessage, Expense, PlantCollection, FitnessLog, SkinTracking
from app.models.profile import PetProfile, VehicleProfile
from app.schemas.scan import ScanRequest, ScanResponse, FollowUpRequest, FollowUpResponse, CompareRequest
from app.services import ai_engine
from app.services.profile_service import get_or_create_profile, serialize_profile
from app.dependencies import get_current_user_id
from datetime import datetime

router = APIRouter(prefix="/scan", tags=["scan"])


def _get_profile_dict(db: Session, user_id: str) -> dict:
    profile = get_or_create_profile(db, user_id)
    return serialize_profile(profile)


def _get_scan_history(db: Session, user_id: str, limit: int = 15) -> list:
    """Fetch recent scan summaries for memory graph context."""
    scans = (
        db.query(Scan)
        .filter(Scan.user_id == user_id)
        .order_by(Scan.created_at.desc())
        .limit(limit)
        .all()
    )
    history = []
    for s in scans:
        result = json.loads(s.result_json) if s.result_json else {}
        history.append({
            "detected_type": s.detected_type,
            "product_name": s.product_name,
            "scan_mode": s.scan_mode,
            "result": {
                "allergen_warnings": result.get("allergen_warnings", []),
                "drug_info": result.get("drug_info"),
                "safety_info": result.get("safety_info"),
                "plant_info": result.get("plant_info"),
            },
        })
    return history


@router.post("")
async def scan_image(
    data: ScanRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    profile = _get_profile_dict(db, user_id)

    pet_info = None
    if data.pet_id:
        pet = db.query(PetProfile).filter(PetProfile.id == data.pet_id, PetProfile.user_id == user_id).first()
        if pet:
            pet_info = {
                "pet_name": pet.pet_name,
                "species": pet.species,
                "known_allergies": json.loads(pet.known_allergies or "[]"),
                "conditions": json.loads(pet.conditions or "[]"),
            }

    vehicle_info = None
    if data.vehicle_id:
        veh = db.query(VehicleProfile).filter(VehicleProfile.id == data.vehicle_id, VehicleProfile.user_id == user_id).first()
        if veh:
            vehicle_info = {"make": veh.make, "model": veh.model, "year": veh.year, "fuel_type": veh.fuel_type}

    # Scan Memory Graph — get user's recent scan history for cross-referencing
    scan_history = _get_scan_history(db, user_id)

    # Family members from profile
    family_members = json.loads(profile.get("family_members", "[]")) if isinstance(profile.get("family_members"), str) else profile.get("family_members", [])

    try:
        result = await ai_engine.analyze_image(
            image_base64=data.image,
            media_type=data.media_type,
            user_profile=profile,
            scan_mode=data.scan_mode,
            pet_info=pet_info,
            vehicle_info=vehicle_info,
            scan_history=scan_history,
            family_members=family_members if family_members else None,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

    scan = Scan(
        user_id=user_id,
        scan_mode=data.scan_mode,
        detected_type=result.get("detected_type"),
        confidence=result.get("confidence"),
        product_name=result.get("product_name"),
        result_json=json.dumps(result),
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    # Auto-save specialized records
    _auto_save_records(db, scan, result, user_id)

    return {
        "id": scan.id,
        "scan_mode": scan.scan_mode,
        "detected_type": scan.detected_type,
        "confidence": scan.confidence,
        "product_name": scan.product_name,
        "result": result,
        "created_at": scan.created_at,
    }


@router.get("/{scan_id}/stream-summary")
async def stream_summary(
    scan_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Stream a human-readable AI summary of a scan result using SSE."""
    scan = db.query(Scan).filter(Scan.id == scan_id, Scan.user_id == user_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    scan_result = json.loads(scan.result_json) if scan.result_json else {}
    profile = _get_profile_dict(db, user_id)

    async def event_stream():
        try:
            async for chunk in ai_engine.stream_summary(scan_result, profile):
                # SSE format: data: <chunk>\n\n
                escaped = chunk.replace("\n", "\\n")
                yield f"data: {json.dumps({'text': chunk})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/{scan_id}/analyze-family")
async def analyze_family(
    scan_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Analyze a scan result for each family member."""
    scan = db.query(Scan).filter(Scan.id == scan_id, Scan.user_id == user_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    profile = _get_profile_dict(db, user_id)
    family_members = profile.get("family_members", [])
    if isinstance(family_members, str):
        family_members = json.loads(family_members)

    if not family_members:
        return {"family_results": []}

    scan_result = json.loads(scan.result_json) if scan.result_json else {}

    import asyncio
    tasks = [ai_engine.analyze_family_member(scan_result, m) for m in family_members]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    family_results = []
    for i, r in enumerate(results):
        if isinstance(r, Exception):
            family_results.append({
                "name": family_members[i].get("name", "Member"),
                "error": str(r),
            })
        else:
            family_results.append({
                "name": family_members[i].get("name", "Member"),
                **r,
            })

    return {"family_results": family_results}


def _auto_save_records(db: Session, scan: Scan, result: dict, user_id: str):
    detected = result.get("detected_type", "")

    if detected == "receipt" and result.get("receipt_info"):
        ri = result["receipt_info"]
        expense = Expense(
            user_id=user_id,
            scan_id=scan.id,
            store_name=ri.get("store_name"),
            date=ri.get("date"),
            total=ri.get("total"),
            currency=ri.get("currency", "INR"),
            category="food",
            items=json.dumps(ri.get("items", [])),
        )
        db.add(expense)
        db.commit()

    elif detected == "plant" and result.get("plant_info"):
        pi = result["plant_info"]
        plant = PlantCollection(
            user_id=user_id,
            scan_id=scan.id,
            plant_name=pi.get("common_name"),
            species=pi.get("species"),
            is_pet_safe=pi.get("pet_safe"),
            care_schedule=json.dumps(pi.get("care_guide", {})),
        )
        db.add(plant)
        db.commit()

    elif detected == "exercise" and result.get("exercise_form"):
        ef = result["exercise_form"]
        log = FitnessLog(
            user_id=user_id,
            scan_id=scan.id,
            exercise=ef.get("exercise_detected"),
            corrections=json.dumps(ef.get("corrections", [])),
        )
        db.add(log)
        db.commit()


@router.get("/history")
def scan_history(
    limit: int = 20,
    offset: int = 0,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    scans = (
        db.query(Scan)
        .filter(Scan.user_id == user_id)
        .order_by(Scan.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [
        {
            "id": s.id,
            "scan_mode": s.scan_mode,
            "detected_type": s.detected_type,
            "confidence": s.confidence,
            "product_name": s.product_name,
            "result": json.loads(s.result_json) if s.result_json else {},
            "created_at": s.created_at,
        }
        for s in scans
    ]


@router.get("/{scan_id}")
def get_scan(
    scan_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    scan = db.query(Scan).filter(Scan.id == scan_id, Scan.user_id == user_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return {
        "id": scan.id,
        "scan_mode": scan.scan_mode,
        "detected_type": scan.detected_type,
        "confidence": scan.confidence,
        "product_name": scan.product_name,
        "result": json.loads(scan.result_json) if scan.result_json else {},
        "created_at": scan.created_at,
    }


@router.post("/{scan_id}/ask")
async def ask_followup(
    scan_id: str,
    data: FollowUpRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    scan = db.query(Scan).filter(Scan.id == scan_id, Scan.user_id == user_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    history = (
        db.query(ScanMessage)
        .filter(ScanMessage.scan_id == scan_id)
        .order_by(ScanMessage.created_at)
        .all()
    )
    conversation = [{"role": m.role, "content": m.content} for m in history]

    profile = _get_profile_dict(db, user_id)
    scan_result = json.loads(scan.result_json) if scan.result_json else {}

    answer = await ai_engine.ask_followup(scan_result, conversation, data.question, profile)

    db.add(ScanMessage(scan_id=scan_id, role="user", content=data.question))
    db.add(ScanMessage(scan_id=scan_id, role="assistant", content=answer))
    db.commit()

    return {"answer": answer}


@router.post("/compare")
async def compare_scans(
    data: CompareRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    scan_a = db.query(Scan).filter(Scan.id == data.scan_a_id, Scan.user_id == user_id).first()
    scan_b = db.query(Scan).filter(Scan.id == data.scan_b_id, Scan.user_id == user_id).first()
    if not scan_a or not scan_b:
        raise HTTPException(status_code=404, detail="One or both scans not found")

    profile = _get_profile_dict(db, user_id)
    result_a = json.loads(scan_a.result_json) if scan_a.result_json else {}
    result_b = json.loads(scan_b.result_json) if scan_b.result_json else {}

    comparison = await ai_engine.compare_products(result_a, result_b, profile)
    return comparison
