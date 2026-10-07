from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from pydantic import EmailStr
from .. import database, schemas, models, auth
from ..dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/check-email")
def check_email(email: EmailStr, exclude_user_id: str = None, db: Session = Depends(database.get_db)):
    email_norm = str(email).strip().lower()

    # Hardcoded HR email is always reserved/already existed
    if email_norm == "hrautocratengineers@gmail.com":
        return {"available": False, "message": "Email already existed"}

    query = db.query(models.User).filter(func.lower(models.User.email) == email_norm)
    if exclude_user_id:
        import uuid as uuid_module
        try:
            ex_uuid = uuid_module.UUID(exclude_user_id)
            query = query.filter(models.User.id != ex_uuid)
        except ValueError:
            pass
    exists = query.first() is not None
    return {"available": not exists, "message": "Email already existed" if exists else "Email available"}


# ✅ Register API (Only Candidate accounts can be created)
@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    email_norm = user.email.strip().lower()

    # Prevent registration with the reserved HR email
    if email_norm == "hrautocratengineers@gmail.com":
        raise HTTPException(status_code=400, detail="Email already existed")

    # Check if user already exists
    existing_user = db.query(models.User).filter(func.lower(models.User.email) == email_norm).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already existed")

    # Hash password
    hashed_password = auth.get_password_hash(user.password)

    # Force role to CANDIDATE
    new_user = models.User(
        email=email_norm,
        password_hash=hashed_password,
        role="CANDIDATE"
    )

    db.add(new_user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email already registered")
    db.refresh(new_user)

    return new_user


# ✅ Login API
@router.post("/login", response_model=schemas.Token)
def login(user: schemas.UserLogin, db: Session = Depends(database.get_db)):
    email_norm = user.email.strip().lower()

    # 🏢 Hardcoded HR Account Handling
    if email_norm == "hrautocratengineers@gmail.com":
        user_in_db = db.query(models.User).filter(func.lower(models.User.email) == "hrautocratengineers@gmail.com").first()

        # Validate password against database hash or standard defaults (both Hradmin@123 and HRadmin@123)
        valid = False
        if user.password in ["Hradmin@123", "HRadmin@123"]:
            valid = True
        elif user_in_db and user_in_db.password_hash and auth.verify_password(user.password, user_in_db.password_hash):
            valid = True

        if not valid:
            raise HTTPException(status_code=403, detail="Invalid credentials")

        # Find or create the HR user in database
        if not user_in_db:
            user_in_db = models.User(
                email="hrautocratengineers@gmail.com",
                password_hash=auth.get_password_hash(user.password),
                role="HR"
            )
            db.add(user_in_db)
            db.commit()
            db.refresh(user_in_db)
        else:
            if user_in_db.role != "HR":
                user_in_db.role = "HR"
                db.commit()

        access_token = auth.create_access_token(
            data={"user_id": str(user_in_db.id), "role": "HR"}
        )

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user_in_db.id,
            "role": "HR",
            "is_profile_created": True
        }

    # 👤 Candidate / Other Users Login
    user_in_db = db.query(models.User).filter(func.lower(models.User.email) == email_norm).first()
    
    # Validate
    if not user_in_db or not auth.verify_password(user.password, user_in_db.password_hash):
        raise HTTPException(status_code=403, detail="Invalid credentials")

    # Check if profile is fully created (for candidates)
    is_profile_created = False
    profile = db.query(models.CandidateProfile).filter(models.CandidateProfile.user_id == user_in_db.id).first()
    if profile:
        is_profile_created = profile.is_profile_created

    # Create token
    access_token = auth.create_access_token(
        data={"user_id": str(user_in_db.id), "role": user_in_db.role}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user_in_db.id,
        "role": user_in_db.role,
        "is_profile_created": is_profile_created
    }


# ✅ Change Password API
@router.post("/change-password")
def change_password(
    req: schemas.ChangePasswordRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    # Verify old password
    if not auth.verify_password(req.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect old password"
        )
    
    # Hash new password
    hashed_password = auth.get_password_hash(req.new_password)
    
    # Update user password
    current_user.password_hash = hashed_password
    db.commit()
    
    return {"message": "Password changed successfully"}