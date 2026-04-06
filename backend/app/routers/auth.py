from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.profile import Profile
from app.schemas.auth import UserRegister, UserLogin, Token
from app.services.auth import verify_password, get_password_hash, create_access_token
from app.services.profile_service import get_or_create_profile

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=Token)
def register(data: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = get_password_hash(data.password)
    user = User(email=data.email, hashed_password=hashed)
    db.add(user)
    db.commit()
    db.refresh(user)

    get_or_create_profile(db, user.id, name=data.name)

    token = create_access_token({"sub": user.id})
    return Token(access_token=token, user_id=user.id, email=user.email)


@router.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    token = create_access_token({"sub": user.id})
    return Token(access_token=token, user_id=user.id, email=user.email)
