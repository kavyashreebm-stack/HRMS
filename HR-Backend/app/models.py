import enum
import uuid
from sqlalchemy import Column, Integer, String, ForeignKey, JSON, Boolean, DateTime, Enum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base

# ==========================================
# 📊 ENUMS Definitions (String-based)
# ==========================================

class UserRole(str, enum.Enum):
    CANDIDATE = "CANDIDATE"
    HR = "HR"
    ADMIN = "ADMIN"

class JobStatus(str, enum.Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    ON_HOLD = "ON_HOLD"

class ApplicationStatus(str, enum.Enum):
    Applied = "Applied"
    Reviewed = "Application Reviewed"
    Interview = "Interview Scheduled"
    OnHold = "On Hold"
    Offered = "Offered"
    Onboarding = "Onboarding"

class NotificationType(str, enum.Enum):
    success = "success"
    urgent = "urgent"
    info = "info"
    default = "default"

# ==========================================
# 👤 1. USER Model
# ==========================================

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(UserRole, name="user_role"), default=UserRole.CANDIDATE, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    profile = relationship("CandidateProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")

# ==========================================
# 🏢 2. DEPARTMENT Model
# ==========================================

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    jobs = relationship("Job", back_populates="department_rel")

# ==========================================
# 👤 3. CANDIDATE PROFILE Model
# ==========================================

class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    
    # Personal details
    name = Column(String, nullable=True)
    designation = Column(String, nullable=True)
    employee_id = Column(String, nullable=True)
    date_of_joining = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    mobile2 = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    marital_status = Column(String, nullable=True)
    date_of_birth = Column(String, nullable=True)
    correspondence_address = Column(String, nullable=True)
    permanent_address = Column(String, nullable=True)
    aadhar = Column(String, unique=True, nullable=True)
    pan = Column(String, unique=True, nullable=True)
    passport = Column(String, nullable=True)
    bank_account = Column(String, nullable=True)
    bank_name = Column(String, nullable=True)
    ifsc = Column(String, nullable=True)
    uan = Column(String, nullable=True)
    esic = Column(String, nullable=True)
    candidate_type = Column(String, nullable=True)  # 'fresher' or 'experienced'
    
    languages = Column(JSON, nullable=True)
    skills = Column(JSON, nullable=True)
    custom_language = Column(String, nullable=True)
    
    # JSON sections
    education = Column(JSON, nullable=True)
    employment = Column(JSON, nullable=True)
    family = Column(JSON, nullable=True)
    medical = Column(JSON, nullable=True)
    emergency_contacts = Column(JSON, nullable=True)
    reference_person = Column(JSON, nullable=True)
    reference_source = Column(String, nullable=True)
    declaration = Column(JSON, nullable=True)

    profile_percentage = Column(Integer, default=0)
    missing_sections = Column(JSON, nullable=True)
    is_profile_created = Column(Boolean, default=False)


    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="profile")
    
    # Keep relationship mapping with applications (1-to-many joined by user_id)
    applications = relationship(
        "Application", 
        back_populates="candidate_profile",
        primaryjoin="CandidateProfile.user_id == foreign(Application.user_id)",
        overlaps="applications"
    )

# ==========================================
# 💼 4. JOBS Model
# ==========================================

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    title = Column(String, nullable=False)
    location = Column(String, default="Remote")
    experience_range = Column(String, nullable=True)
    skills = Column(Text, nullable=True)
    description = Column(String, nullable=True)
    tags = Column(JSON, nullable=True)
    status = Column(Enum(JobStatus, name="job_status"), default=JobStatus.OPEN, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    posted_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    department_rel = relationship("Department", back_populates="jobs")
    applications = relationship("Application", back_populates="job", cascade="all, delete-orphan")

# ==========================================
# 📄 5. APPLICATIONS Model
# ==========================================

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    experience_type = Column(String, nullable=True)      # e.g. 'fresher', 'experienced'
    other_details = Column(JSON, nullable=True)           # extra form data from frontend
    status = Column(Enum(ApplicationStatus, name="application_status"), default=ApplicationStatus.Applied, nullable=False)
    status_percentage = Column(Integer, default=10)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="applications", overlaps="applications")
    job = relationship("Job", back_populates="applications")
    status_history = relationship("ApplicationStatusHistory", back_populates="application", cascade="all, delete-orphan")

    candidate_profile = relationship(
        "CandidateProfile", 
        back_populates="applications",
        primaryjoin="CandidateProfile.user_id == foreign(Application.user_id)",
        overlaps="applications,user"
    )

# ==========================================
# 📈 6. APPLICATION STATUS HISTORY Model
# ==========================================

class ApplicationStatusHistory(Base):
    __tablename__ = "application_status_history"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    old_status = Column(Enum(ApplicationStatus, name="application_status"), nullable=True)
    new_status = Column(Enum(ApplicationStatus, name="application_status"), nullable=False)
    changed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    remarks = Column(String, nullable=True)
    changed_at = Column(DateTime(timezone=True), server_default=func.now())

    application = relationship("Application", back_populates="status_history")

# ==========================================
# 🔔 7. NOTIFICATIONS Model
# ==========================================

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=True)
    message = Column(String, nullable=False)
    notification_type = Column(Enum(NotificationType, name="notification_type"), default=NotificationType.info, nullable=False)
    reference_id = Column(Integer, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")

# ==========================================
# 📂 8. DOCUMENTS Model
# ==========================================

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    document_type = Column(String(100), nullable=False) # e.g. 'photo', 'resume', 'aadhar', 'pan', 'sslc'
    file_name = Column(String(255), nullable=True)
    file_path = Column(String(512), nullable=False)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="documents")

# ==========================================
# 🌐 9. LANGUAGES Model
# ==========================================

class Language(Base):
    __tablename__ = "languages"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)


# ==========================================
# 🚀 10. SKILLS Model
# ==========================================

class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)