from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from .. import database, models, schemas
from ..dependencies import get_current_hr_user

router = APIRouter(prefix="/hr", tags=["HR"])


def build_application_response(app: models.Application, db: Session = None) -> dict:
    """Build ApplicationResponse dict with computed department from job relationship."""
    dept_name = None
    if app.job and app.job.department_rel:
        dept_name = app.job.department_rel.name
    elif app.job:
        dept_name = app.job.title

    status_val = app.status.value if hasattr(app.status, 'value') else str(app.status)

    candidate_profile_data = None
    if app.candidate_profile:
        cp = app.candidate_profile
        candidate_profile_data = {
            c.name: getattr(cp, c.name) for c in cp.__table__.columns
        }
        if cp.user:
            candidate_profile_data["email"] = cp.user.email
        # Inject document paths (photo, resume) from documents table
        if db:
            doc_type_map = {
                "photo_path": "photo",
                "resume_path": "resume",
                "aadhar_doc_path": "aadhar",
                "pan_doc_path": "pan",
                "sslc_doc_path": "sslc",
            }
            for path_attr, doc_type in doc_type_map.items():
                doc = db.query(models.Document).filter(
                    models.Document.user_id == cp.user_id,
                    models.Document.document_type == doc_type,
                    models.Document.deleted_at == None
                ).order_by(models.Document.uploaded_at.desc()).first()
                if doc:
                    candidate_profile_data[path_attr] = doc.file_path
                elif getattr(cp, path_attr, None):
                    candidate_profile_data[path_attr] = getattr(cp, path_attr)
                else:
                    candidate_profile_data[path_attr] = None

    return {
        "id": app.id,
        "user_id": app.user_id,
        "job_id": app.job_id,
        "job_title": app.job.title if app.job else None,   # specific job title
        "department": dept_name,
        "experience_type": app.experience_type,
        "other_details": app.other_details,
        "skills": app.job.skills if app.job else None,
        "status": status_val,
        "status_percentage": app.status_percentage,
        "created_at": app.created_at,
        "candidate_profile": candidate_profile_data,
    }


def build_job_response(job: models.Job) -> dict:
    """Build JobResponse dict with computed department name."""
    dept_name = None
    if job.department_rel:
        dept_name = job.department_rel.name
    status_val = job.status.value if hasattr(job.status, 'value') else str(job.status)
    return {
        "id": job.id,
        "title": job.title,
        "department": dept_name,
        "location": job.location,
        "experience_range": job.experience_range,
        "description": job.description,
        "skills": job.skills,
        "tags": job.tags,
        "status": status_val,
    }


# =============================================
# 📊 HR DASHBOARD
# =============================================

@router.get("/dashboard/stats", response_model=schemas.HRDashboardStats)
def get_hr_stats(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_hr_user)
):
    """Fetch counts for HR dashboard cards."""
    total_apps = db.query(models.Application).count()
    total_candidates = db.query(models.CandidateProfile).count()
    pending_review = db.query(models.Application).filter(
        models.Application.status == models.ApplicationStatus.Interview
    ).count()
    onboarded = db.query(models.Application).filter(
        models.Application.status == models.ApplicationStatus.Onboarding
    ).count()

    return {
        "total_applications": total_apps,
        "total_candidates": total_candidates,
        "pending_review": pending_review,
        "onboarded": onboarded
    }


@router.get("/dashboard/jobs-overview", response_model=List[schemas.HRJobOverview])
def get_hr_jobs_overview(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_hr_user)
):
    """Aggregate application counts per department (via Job → Department join)."""
    results = db.query(
        models.Department.name,
        func.count(models.Application.id).label("applicant_count")
    ).outerjoin(
        models.Job, models.Job.department_id == models.Department.id
    ).outerjoin(
        models.Application, models.Application.job_id == models.Job.id
    ).group_by(models.Department.name).all()

    return [{"department": r[0], "applicant_count": r[1]} for r in results if r[1] > 0]


# =============================================
# 📄 APPLICATIONS (HR)
# =============================================

@router.get("/applications")
def list_all_applications(
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: Optional[int] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_hr_user)
):
    """Fetch all job applications with search and status filters."""
    query = db.query(models.Application).options(
        joinedload(models.Application.job).joinedload(models.Job.department_rel),
        joinedload(models.Application.candidate_profile)
    ).outerjoin(
        models.CandidateProfile,
        models.Application.user_id == models.CandidateProfile.user_id
    ).outerjoin(
        models.Job, models.Application.job_id == models.Job.id
    ).outerjoin(
        models.Department, models.Job.department_id == models.Department.id
    )

    if status:
        # Match by enum value string
        query = query.filter(models.Application.status == status)

    if search:
        query = query.filter(
            (models.CandidateProfile.name.ilike(f"%{search}%")) |
            (models.Department.name.ilike(f"%{search}%")) |
            (models.Job.title.ilike(f"%{search}%"))
        )

    query = query.order_by(models.Application.created_at.desc())

    if limit:
        query = query.limit(limit)

    apps = query.all()
    return [build_application_response(a, db) for a in apps]


@router.put("/applications/{app_id}/status")
def update_application_status(
    app_id: int,
    status_update: schemas.ApplicationStatusUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_hr_user)
):
    """Update the status of a specific application and log the change to history."""
    application = db.query(models.Application).options(
        joinedload(models.Application.job).joinedload(models.Job.department_rel)
    ).filter(models.Application.id == app_id).first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    old_status = application.status

    # Validate new status matches enum
    valid_statuses = {s.value: s for s in models.ApplicationStatus}
    if status_update.status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{status_update.status}'. Valid values: {list(valid_statuses.keys())}"
        )

    new_status_enum = valid_statuses[status_update.status]
    application.status = new_status_enum

    # Update progress percentage based on status
    status_percentage_map = {
        "Applied": 10,
        "Application Reviewed": 30,
        "Interview Scheduled": 50,
        "On Hold": 60,
        "Offered": 80,
        "Onboarding": 100
    }
    application.status_percentage = status_percentage_map.get(
        status_update.status, application.status_percentage
    )

    # Log to ApplicationStatusHistory
    history_entry = models.ApplicationStatusHistory(
        application_id=application.id,
        old_status=old_status,
        new_status=new_status_enum,
        changed_by=current_user.id,
        remarks=status_update.remarks
    )
    db.add(history_entry)

    db.commit()
    db.refresh(application)

    # Notification for the candidate
    dept_name = ""
    if application.job and application.job.department_rel:
        dept_name = application.job.department_rel.name
    elif application.job:
        dept_name = application.job.title

    notif_type = "success" if status_update.status in [
        "Offered", "Onboarding", "Interview Scheduled"
    ] else "default"

    new_notification = models.Notification(
        user_id=application.user_id,
        title="Application Status Update",
        message=f"Your application for {dept_name} has been updated to '{status_update.status}'.",
        notification_type=notif_type
    )
    db.add(new_notification)
    db.commit()

    return build_application_response(application, db)


# =============================================
# 👥 CANDIDATES (HR)
# =============================================

@router.get("/candidates")
def list_candidates(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_hr_user)
):
    """List all candidate profiles."""
    candidates = db.query(models.CandidateProfile).options(
        joinedload(models.CandidateProfile.user)
    ).order_by(models.CandidateProfile.created_at.desc()).all()

    doc_type_map = {
        "photo_path": "photo",
        "resume_path": "resume",
        "aadhar_doc_path": "aadhar",
        "pan_doc_path": "pan",
        "sslc_doc_path": "sslc",
    }

    result = []
    for cp in candidates:
        data = {c.name: getattr(cp, c.name) for c in cp.__table__.columns}
        if cp.user:
            data["email"] = cp.user.email
            if not data.get("created_at") and cp.user.created_at:
                data["created_at"] = cp.user.created_at
        
        for path_attr, doc_type in doc_type_map.items():
            doc = db.query(models.Document).filter(
                models.Document.user_id == cp.user_id,
                models.Document.document_type == doc_type,
                models.Document.deleted_at == None
            ).order_by(models.Document.uploaded_at.desc()).first()
            if doc:
                data[path_attr] = doc.file_path
            elif getattr(cp, path_attr, None):
                data[path_attr] = getattr(cp, path_attr)
            else:
                data[path_attr] = None
        result.append(data)
    return result


@router.get("/candidates/{user_id}")
def get_candidate(
    user_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_hr_user)
):
    """Get a single candidate profile by user_id."""
    import uuid as uuid_module
    try:
        user_uuid = uuid_module.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    candidate = db.query(models.CandidateProfile).options(
        joinedload(models.CandidateProfile.user)
    ).filter(
        models.CandidateProfile.user_id == user_uuid
    ).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    data = {c.name: getattr(candidate, c.name) for c in candidate.__table__.columns}
    if candidate.user:
        data["email"] = candidate.user.email
        if not data.get("created_at") and candidate.user.created_at:
            data["created_at"] = candidate.user.created_at

    doc_type_map = {
        "photo_path": "photo",
        "resume_path": "resume",
        "aadhar_doc_path": "aadhar",
        "pan_doc_path": "pan",
        "sslc_doc_path": "sslc",
    }
    for path_attr, doc_type in doc_type_map.items():
        doc = db.query(models.Document).filter(
            models.Document.user_id == candidate.user_id,
            models.Document.document_type == doc_type,
            models.Document.deleted_at == None
        ).order_by(models.Document.uploaded_at.desc()).first()
        if doc:
            data[path_attr] = doc.file_path
        elif getattr(candidate, path_attr, None):
            data[path_attr] = getattr(candidate, path_attr)
        else:
            data[path_attr] = None

    return data


# =============================================
# 💼 JOB POSTINGS (HR)
# =============================================

@router.post("/jobs")
def create_job(
    job_in: schemas.JobCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_hr_user)
):
    """Post a new available job. Resolves department name → department_id."""
    # Resolve department name to department_id
    dept = db.query(models.Department).filter(
        models.Department.name.ilike(job_in.department)
    ).first()

    if not dept:
        # Try partial match
        dept = db.query(models.Department).filter(
            models.Department.name.ilike(f"%{job_in.department}%")
        ).first()

    if not dept:
        # Auto-create the department if it doesn't exist
        dept = models.Department(name=job_in.department)
        db.add(dept)
        db.commit()
        db.refresh(dept)

    # Map status string to enum
    status_map = {
        "OPEN": models.JobStatus.OPEN,
        "CLOSED": models.JobStatus.CLOSED,
        "ON_HOLD": models.JobStatus.ON_HOLD,
    }
    job_status = status_map.get(job_in.status.upper() if job_in.status else "OPEN", models.JobStatus.OPEN)

    new_job = models.Job(
        title=job_in.title,
        department_id=dept.id,
        location=job_in.location,
        skills=job_in.skills,
        experience_range=job_in.experience_range,
        description=job_in.description,
        tags=job_in.tags,
        status=job_status,
        created_by=current_user.id
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    # Reload with relationship
    new_job = db.query(models.Job).options(
        joinedload(models.Job.department_rel)
    ).filter(models.Job.id == new_job.id).first()

    return build_job_response(new_job)


@router.get("/jobs")
def list_jobs(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_hr_user)
):
    """List all available jobs with department names."""
    jobs = db.query(models.Job).options(
        joinedload(models.Job.department_rel)
    ).order_by(models.Job.posted_at.desc()).all()

    return [build_job_response(j) for j in jobs]


@router.put("/jobs/{job_id}")
def update_job(
    job_id: int,
    job_in: schemas.JobCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_hr_user)
):
    """Update a job posting."""
    job = db.query(models.Job).options(
        joinedload(models.Job.department_rel)
    ).filter(models.Job.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Resolve department
    dept = db.query(models.Department).filter(
        models.Department.name.ilike(job_in.department)
    ).first()
    if not dept:
        dept = db.query(models.Department).filter(
            models.Department.name.ilike(f"%{job_in.department}%")
        ).first()
    if not dept:
        dept = models.Department(name=job_in.department)
        db.add(dept)
        db.commit()
        db.refresh(dept)

    status_map = {
        "OPEN": models.JobStatus.OPEN,
        "CLOSED": models.JobStatus.CLOSED,
        "ON_HOLD": models.JobStatus.ON_HOLD,
    }
    job_status = status_map.get(
        job_in.status.upper() if job_in.status else "OPEN",
        models.JobStatus.OPEN
    )

    job.title = job_in.title
    job.department_id = dept.id
    job.location = job_in.location
    job.skills = job_in.skills
    job.experience_range = job_in.experience_range
    job.description = job_in.description
    job.tags = job_in.tags
    job.status = job_status

    db.commit()
    db.refresh(job)

    job = db.query(models.Job).options(
        joinedload(models.Job.department_rel)
    ).filter(models.Job.id == job.id).first()

    return build_job_response(job)


@router.delete("/jobs/{job_id}")
def delete_job(
    job_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_hr_user)
):
    """Remove a job posting."""
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    db.delete(job)
    db.commit()
    return {"message": "Job deleted successfully"}


# =============================================
# 📂 DEPARTMENTS (HR)
# =============================================

@router.get("/departments", response_model=List[schemas.DepartmentResponse])
def list_departments(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_hr_user)
):
    """List all departments."""
    return db.query(models.Department).filter(
        models.Department.is_active == True
    ).order_by(models.Department.name).all()


# =============================================
# 👤 HR CANDIDATE REGISTRATION ON BEHALF
# =============================================

@router.post("/candidates/create-on-behalf")
def create_candidate_on_behalf(
    req: schemas.CandidateCreateOnBehalf,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_hr_user)
):
    """
    HR registers a candidate account & profile on behalf of candidate.
    """
    import uuid
    from .. import auth

    clean_phone = "".join(c for c in str(req.phone_number) if c.isdigit())[-10:] if req.phone_number else None

    # Check if user already exists by email
    email = req.email.strip().lower() if req.email else None
    existing_user = None
    if email:
        existing_user = db.query(models.User).filter(func.lower(models.User.email) == email).first()

    # Or check if candidate profile with phone exists
    if not existing_user and clean_phone:
        existing_profile = db.query(models.CandidateProfile).filter(
            models.CandidateProfile.phone_number.like(f"%{clean_phone}%")
        ).first()
        if existing_profile and existing_profile.user:
            existing_user = existing_profile.user

    if existing_user:
        new_user = existing_user
    else:
        if not email and clean_phone:
            email = f"candidate_{clean_phone}@autocrat.local"
        elif not email:
            email = f"candidate_{uuid.uuid4().hex[:8]}@autocrat.local"

        raw_pw = req.password if req.password else "Autocrat@123"
        hashed_pw = auth.get_password_hash(raw_pw)
        new_user = models.User(
            email=email,
            password_hash=hashed_pw,
            role="CANDIDATE"
        )
        db.add(new_user)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User with this email already exists"
            )
        db.refresh(new_user)

    # Create or update candidate profile
    profile = db.query(models.CandidateProfile).filter(models.CandidateProfile.user_id == new_user.id).first()
    if not profile:
        profile = models.CandidateProfile(
            user_id=new_user.id,
            name=req.name,
            phone_number=req.phone_number,
            designation=req.designation,
            is_profile_created=False
        )
        db.add(profile)
    else:
        if req.name:
            profile.name = req.name
        if req.phone_number:
            profile.phone_number = req.phone_number
        if req.designation:
            profile.designation = req.designation

    db.commit()
    db.refresh(profile)

    return {
        "message": "Candidate registered successfully",
        "user_id": str(new_user.id),
        "profile_id": profile.id,
        "email": new_user.email,
        "name": profile.name
    }


@router.put("/candidates/{user_id}/profile")
def update_candidate_profile_on_behalf(
    user_id: str,
    profile_in: schemas.CandidateProfileUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_hr_user)
):
    """
    HR updates candidate profile & application data on behalf of candidate.
    """
    import uuid as uuid_module
    try:
        user_uuid = uuid_module.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    profile = db.query(models.CandidateProfile).filter(
        models.CandidateProfile.user_id == user_uuid
    ).first()

    if not profile:
        profile = models.CandidateProfile(user_id=user_uuid, is_profile_created=True)
        db.add(profile)

    update_data = profile_in.dict(exclude_unset=True)

    for key, val in update_data.items():
        if val is not None:
            if hasattr(profile, key):
                setattr(profile, key, val)

    # Sync documents table
    doc_path_map = {
        'photo_path': 'photo',
        'resume_path': 'resume',
        'aadhar_doc_path': 'aadhar',
        'pan_doc_path': 'pan',
        'sslc_doc_path': 'sslc'
    }
    for path_attr, doc_type in doc_path_map.items():
        if path_attr in update_data and update_data[path_attr]:
            file_path_val = update_data[path_attr]
            existing_doc = db.query(models.Document).filter(
                models.Document.file_path == file_path_val,
                models.Document.deleted_at == None
            ).first()
            if existing_doc:
                existing_doc.user_id = user_uuid
                existing_doc.document_type = doc_type
            else:
                db.add(models.Document(
                    user_id=user_uuid,
                    document_type=doc_type,
                    file_path=file_path_val,
                    file_name=os.path.basename(file_path_val)
                ))

    profile.is_profile_created = True
    try:
        db.commit()
        db.refresh(profile)
    except Exception as e:
        db.rollback()
        err_str = str(e)
        if "candidate_profiles_aadhar_key" in err_str or "aadhar" in err_str:
            raise HTTPException(status_code=400, detail="Aadhaar Card Number is already registered with another candidate profile.")
        elif "candidate_profiles_pan_key" in err_str or "pan" in err_str:
            raise HTTPException(status_code=400, detail="PAN Card Number is already registered with another candidate profile.")
        elif "candidate_profiles_uan_key" in err_str or "uan" in err_str:
            raise HTTPException(status_code=400, detail="UAN Number is already registered with another candidate profile.")
        raise HTTPException(status_code=400, detail="Unique value constraint error: duplicate Aadhaar, PAN, or UAN.")

    return {"message": "Candidate profile updated successfully", "user_id": str(user_uuid)}

