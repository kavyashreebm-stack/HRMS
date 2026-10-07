from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Dict, Any
import uuid
from datetime import datetime

# =========================
# 👤 USER AUTH SCHEMAS
# =========================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: Optional[str] = "CANDIDATE"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    role: str

    class Config:
        from_attributes = True


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: uuid.UUID
    role: str
    is_profile_created: bool


class CandidateCreateOnBehalf(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    password: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None



# =========================
# 🏢 DEPARTMENT SCHEMA
# =========================

class DepartmentResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_active: bool = True

    class Config:
        from_attributes = True


# =========================
# 📂 DOCUMENT SCHEMA
# =========================

class DocumentResponse(BaseModel):
    id: int
    user_id: uuid.UUID
    document_type: str
    file_name: Optional[str] = None
    file_path: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True


# =========================
# 👤 NESTED DATA SCHEMAS
# =========================

class EducationEntry(BaseModel):
    degree: Optional[str] = ""
    institute: Optional[str] = ""
    from_date: Optional[str] = Field(default="", alias="from")
    to_date: Optional[str] = Field(default="", alias="to")
    specialization: Optional[str] = ""
    backlogs: Optional[str] = "No"

    class Config:
        populate_by_name = True


class EmploymentEntry(BaseModel):
    organization: Optional[str] = ""
    designation: Optional[str] = ""
    from_date: Optional[str] = Field(default="", alias="from")
    to_date: Optional[str] = Field(default="", alias="to")
    summary: Optional[str] = None
    experience: Optional[str] = None
    current: bool = False

    class Config:
        populate_by_name = True


class ReferencePerson(BaseModel):
    name: Optional[str] = ""
    designation: Optional[str] = ""
    contact: Optional[str] = ""
    department: Optional[str] = ""
    email: Optional[str] = ""
    jobId: Optional[str] = ""
    jobPostingDate: Optional[str] = ""
    agencyName: Optional[str] = ""
    contactPerson: Optional[str] = ""

    class Config:
        extra = "allow"


class FamilyEntry(BaseModel):
    relation: Optional[str] = ""
    name: Optional[str] = ""
    occupation: Optional[str] = ""
    dob: Optional[str] = ""
    adhaarcard_no: Optional[str] = None
    pancard_no: Optional[str] = None

    class Config:
        extra = "allow"


class MedicalDetails(BaseModel):
    bloodGroup: Optional[str] = ""
    hasDisability: Optional[str] = "No"
    disabilityYears: Optional[str] = None
    hasCondition: Optional[str] = "No"
    conditionYears: Optional[str] = None


class DeclarationDetails(BaseModel):
    date: Optional[str] = None
    place: Optional[str] = None
    agreed: Optional[bool] = None
    signature: Optional[str] = None
    aadhaar: Optional[Dict] = None
    pan: Optional[Dict] = None
    sslc: Optional[Dict] = None


class EmergencyContact(BaseModel):
    name: Optional[str] = ""
    relationship: Optional[str] = ""
    contact: Optional[str] = ""


# =========================
# 👤 CANDIDATE PROFILE
# =========================

class CandidateProfileBase(BaseModel):
    is_profile_created: bool = False

    # 1️⃣ Personal Details (matching Frontend mapFrontendToBackend)
    name: Optional[str] = None
    designation: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    mobile2: Optional[str] = None
    date_of_birth: Optional[str] = None
    marital_status: Optional[str] = None
    gender: Optional[str] = None
    correspondence_address: Optional[str] = None
    permanent_address: Optional[str] = None
    aadhar: Optional[str] = None
    pan: Optional[str] = None
    passport: Optional[str] = None
    bank_account: Optional[str] = None
    bank_name: Optional[str] = None
    ifsc: Optional[str] = None
    uan: Optional[str] = None
    esic: Optional[str] = None
    candidate_type: Optional[str] = None  # 'fresher' or 'experienced'
    languages: Optional[List[str]] = None
    skills: Optional[List[str]] = None
    custom_language: Optional[str] = None
    employee_id: Optional[str] = None
    date_of_joining: Optional[str] = None

    # 2️⃣ Multi-entry Sections
    education: Optional[List[EducationEntry]] = None
    employment: Optional[List[EmploymentEntry]] = None
    emergency_contacts: Optional[List[EmergencyContact]] = None
    reference_person: Optional[ReferencePerson] = None
    reference_source: Optional[str] = None
    family: Optional[List[FamilyEntry]] = None
    medical: Optional[MedicalDetails] = None
    declaration: Optional[DeclarationDetails] = None



    # Document paths (injected from Document table)
    photo_path: Optional[str] = None
    resume_path: Optional[str] = None
    aadhar_doc_path: Optional[str] = None
    pan_doc_path: Optional[str] = None
    sslc_doc_path: Optional[str] = None

    # Cached
    profile_percentage: Optional[int] = 0
    missing_sections: Optional[List[str]] = None
    technical_qualifications: Optional[List[Dict]] = None


class CandidateProfileUpdate(CandidateProfileBase):
    pass


class CandidateProfileResponse(CandidateProfileBase):
    id: int
    user_id: uuid.UUID
    email: Optional[str] = None

    class Config:
        from_attributes = True


# =========================
# 📄 APPLICATION
# =========================

class ApplicationCreate(BaseModel):
    """Used when a candidate submits a job application.
    Frontend can send `job_id` directly (preferred) OR `department` string as fallback.
    """
    department: str
    job_id: Optional[int] = None    # If provided, use this job directly
    experience_type: str
    other_details: Optional[Dict] = None
    candidate_id: Optional[str] = None


class ApplicationResponse(BaseModel):
    """Response model for applications.
    We expose `department` as a computed string (from job→department) for frontend compatibility.
    """
    id: int
    user_id: uuid.UUID
    job_id: int
    department: Optional[str] = None        # Computed: job.department_rel.name
    experience_type: Optional[str] = None
    other_details: Optional[Dict] = None
    skills: Optional[str] = None
    status: str
    status_percentage: int
    created_at: datetime
    candidate_profile: Optional[CandidateProfileResponse] = None

    class Config:
        from_attributes = True


# =========================
# 🔔 NOTIFICATIONS & DASHBOARD
# =========================

class NotificationResponse(BaseModel):
    id: int
    title: Optional[str] = None
    message: str
    notification_type: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    name: Optional[str] = None
    photo_url: Optional[str] = None
    applications_applied: int
    interviews_scheduled: int
    offers_received: int


class ProgressInfo(BaseModel):
    profile_percentage: int
    application_percentage: int


class JobCreate(BaseModel):
    title: str
    department: str          # HR sends department name string
    location: str
    experience_range: Optional[str] = None
    skills: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = "OPEN"


class JobResponse(BaseModel):
    id: int
    title: str
    department: Optional[str] = None       # Computed: department_rel.name
    location: str
    experience_range: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None
    skills: Optional[str] = None

    class Config:
        from_attributes = True


class DashboardResponse(BaseModel):
    stats: DashboardStats
    notifications: List[NotificationResponse]
    similar_jobs: List[JobResponse]
    progress: ProgressInfo


# HR Schemas
class HRDashboardStats(BaseModel):
    total_applications: int
    total_candidates: int
    pending_review: int
    onboarded: int


class HRJobOverview(BaseModel):
    department: str
    applicant_count: int


class ApplicationStatusUpdate(BaseModel):
    status: str
    remarks: Optional[str] = None


class LanguageCreate(BaseModel):
    name: str


class LanguageResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class SkillCreate(BaseModel):
    name: str


class SkillResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True