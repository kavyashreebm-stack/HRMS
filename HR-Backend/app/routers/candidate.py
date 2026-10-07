
import os
import uuid
import json
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy.exc import IntegrityError
from typing import List, Optional, Dict, Any
from datetime import datetime
from .. import database, schemas, models
from ..dependencies import get_current_user
from ..utils.file_handler import save_upload_file
from typing import List

router = APIRouter(prefix="/candidate", tags=["Candidate"])

def handle_integrity_error(ie: IntegrityError, db: Session):
    db.rollback()
    err_str = str(ie.orig) if hasattr(ie, 'orig') else str(ie)
    if "candidate_profiles_aadhar_key" in err_str or "aadhar" in err_str:
        raise HTTPException(
            status_code=400,
            detail="Aadhaar Card Number is already registered with another candidate profile."
        )
    elif "candidate_profiles_pan_key" in err_str or "pan" in err_str:
        raise HTTPException(
            status_code=400,
            detail="PAN Card Number is already registered with another candidate profile."
        )
    elif "candidate_profiles_uan_key" in err_str or "uan" in err_str:
        raise HTTPException(
            status_code=400,
            detail="UAN Number is already registered with another candidate profile."
        )
    elif "users_email_key" in err_str or "email" in err_str:
        raise HTTPException(
            status_code=400,
            detail="Email address is already registered with another account."
        )
    else:
        raise HTTPException(
            status_code=400,
            detail="A unique constraint was violated (e.g. duplicate Aadhaar, PAN, UAN, or Email)."
        )

# =========================
# 🛠️ HELPERS
# =========================

def is_empty(val):
    if val is None: return True
    if isinstance(val, str) and not val.strip(): return True
    if isinstance(val, list):
        if not val: return True
        return all(is_empty(v) for v in val)
    if isinstance(val, dict):
        if not val: return True
        boilerplate_keys = {'relation', 'date', 'place'}
        meaningful_keys = [k for k in val.keys() if k not in boilerplate_keys]
        if not meaningful_keys:
            return all(is_empty(v) for v in val.values())
        return all(is_empty(val.get(k)) for k in meaningful_keys)
    return False

def is_filled(val):
    return not is_empty(val)

def get_action(old_val, new_val):
    if is_empty(old_val) and is_filled(new_val):
        return "added"
    elif is_filled(old_val) and is_empty(new_val):
        return "removed"
    else:
        return "updated"

def json_eq(a, b):
    return json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True)


def get_doc_path_for_type(db: Session, user_id, doc_type: str) -> Optional[str]:
    """Fetch the latest file_path for a given document type from the documents table."""
    doc = db.query(models.Document).filter(
        models.Document.user_id == user_id,
        models.Document.document_type == doc_type,
        models.Document.deleted_at == None
    ).order_by(models.Document.uploaded_at.desc()).first()
    return doc.file_path if doc else None


def inject_doc_paths(profile, db: Session) -> dict:
    """
    Convert a CandidateProfile ORM object to a dict and inject
    document paths from the documents table for frontend compatibility.
    """
    if profile is None:
        return None

    d = {c.name: getattr(profile, c.name) for c in profile.__table__.columns}

    # Inject latest doc paths from documents table
    doc_type_map = {
        "photo_path": "photo",
        "resume_path": "resume",
        "aadhar_doc_path": "aadhar",
        "pan_doc_path": "pan",
        "sslc_doc_path": "sslc",
    }
    for path_attr, doc_type in doc_type_map.items():
        doc_val = get_doc_path_for_type(db, profile.user_id, doc_type)
        if doc_val:
            d[path_attr] = doc_val
        elif getattr(profile, path_attr, None):
            d[path_attr] = getattr(profile, path_attr)
        else:
            d[path_attr] = None

    return d


def has_doc(profile, db: Session, path_attr: str, doc_type: str) -> bool:
    """Check whether the candidate has a specific document (in DB or profile column)."""
    if not profile:
        return False
    if get_doc_path_for_type(db, profile.user_id, doc_type):
        return True
    if getattr(profile, path_attr, None):
        return True
    if profile.declaration and isinstance(profile.declaration, dict):
        return bool(profile.declaration.get(doc_type))
    return False


def check_personal_details_complete(profile, db: Session = None) -> bool:
    if not profile:
        return False
    # Check email from relationship or DB fallback
    email_val = None
    if getattr(profile, 'user', None):
        email_val = profile.user.email
    elif db and getattr(profile, 'user_id', None):
        u = db.query(models.User).filter(models.User.id == profile.user_id).first()
        if u:
            email_val = u.email

    # Check text fields — UAN is only required for experienced candidates
    candidate_type = getattr(profile, 'candidate_type', None) or ''
    is_experienced = candidate_type.lower() == 'experienced'
    text_fields = [
        profile.name,
        getattr(profile, 'designation', None),
        profile.correspondence_address,
        profile.permanent_address,
        profile.phone_number,
        email_val,
        profile.date_of_birth,
        profile.marital_status,
        profile.gender,
        profile.aadhar,
        profile.pan,
        profile.bank_account,
        profile.bank_name,
        profile.ifsc,
    ]
    # UAN and ESIC are required only for experienced candidates
    if is_experienced:
        text_fields.append(getattr(profile, 'uan', None))
        text_fields.append(getattr(profile, 'esic', None))
    for field in text_fields:
        if is_empty(field):
            return False

    # Check phone number length (10 digits)
    phone = str(getattr(profile, 'phone_number', '') or '')
    phone_clean = ''.join(c for c in phone if c.isdigit())
    if len(phone_clean) != 10:
        return False

    # Check alternate phone number length (10 digits) if provided
    mobile2 = str(getattr(profile, 'mobile2', '') or '')
    mobile2_clean = ''.join(c for c in mobile2 if c.isdigit())
    if mobile2_clean and len(mobile2_clean) != 10:
        return False

    # Check aadhar length (12 digits)
    aadhar = str(getattr(profile, 'aadhar', '') or '')
    aadhar_clean = ''.join(c for c in aadhar if c.isdigit())
    if len(aadhar_clean) != 12:
        return False

    # Check PAN length (10 characters)
    pan = str(getattr(profile, 'pan', '') or '')
    pan_clean = ''.join(c for c in pan if c.isalnum())
    if len(pan_clean) != 10:
        return False

    # Check Bank Account length (14 digits)
    bank_account = str(getattr(profile, 'bank_account', '') or '')
    bank_account_clean = ''.join(c for c in bank_account if c.isdigit())
    if len(bank_account_clean) != 14:
        return False

    # Check IFSC length (11 characters)
    ifsc = str(getattr(profile, 'ifsc', '') or '')
    ifsc_clean = ''.join(c for c in ifsc if c.isalnum())
    if len(ifsc_clean) != 11:
        return False

    # Check UAN & ESIC lengths
    if is_experienced:
        uan = str(getattr(profile, 'uan', '') or '')
        uan_clean = ''.join(c for c in uan if c.isdigit())
        if len(uan_clean) != 12:
            return False

        esic = str(getattr(profile, 'esic', '') or '')
        esic_clean = ''.join(c for c in esic if c.isdigit())
        if len(esic_clean) != 10:
            return False
    else:
        # For freshers, if filled, must be correct length
        uan = str(getattr(profile, 'uan', '') or '')
        uan_clean = ''.join(c for c in uan if c.isdigit())
        if uan_clean and len(uan_clean) != 12:
            return False

        esic = str(getattr(profile, 'esic', '') or '')
        esic_clean = ''.join(c for c in esic if c.isdigit())
        if esic_clean and len(esic_clean) != 10:
            return False

    # Check photo and resume docs
    if not has_doc(profile, db, 'photo_path', 'photo'):
        return False
    if not has_doc(profile, db, 'resume_path', 'resume'):
        return False

    # Check emergency contacts: at least 1, and first one has name/relationship/contact (10 digits)
    contacts = getattr(profile, 'emergency_contacts', None) or []
    if not isinstance(contacts, list) or len(contacts) == 0:
        return False
    c = contacts[0]
    if not isinstance(c, dict):
        return False
    if is_empty(c.get('name')) or is_empty(c.get('relationship')) or is_empty(c.get('contact')):
        return False
    contact = str(c.get('contact', '') or '')
    contact_clean = ''.join(ch for ch in contact if ch.isdigit())
    if len(contact_clean) != 10:
        return False

    return True

def check_education_complete(profile) -> bool:
    if not profile:
        return False
    edu = getattr(profile, 'education', None) or []
    if not isinstance(edu, list) or len(edu) == 0:
        return False
    row = edu[0]
    if not isinstance(row, dict):
        return False
    # Check degree, institute, specialization
    if not all(is_filled(row.get(f)) for f in ['degree', 'institute', 'specialization']):
        return False
    # Check from and to (allow either direct or alias key)
    from_ok = is_filled(row.get('from')) or is_filled(row.get('from_date'))
    to_ok = is_filled(row.get('to')) or is_filled(row.get('to_date'))
    return from_ok and to_ok

def check_employment_complete(profile) -> bool:
    if not profile:
        return False
    # Freshers are not required to fill employment details
    candidate_type = getattr(profile, 'candidate_type', None) or ''
    if candidate_type.lower() == 'fresher':
        return True
    emp = getattr(profile, 'employment', None) or []
    if not isinstance(emp, list) or len(emp) == 0:
        return False
    row = emp[0]
    if not isinstance(row, dict):
        return False
    # Check organization, designation, and summary
    if not all(is_filled(row.get(f)) for f in ['organization', 'designation', 'summary']):
        return False
    # Check from date
    from_ok = is_filled(row.get('from')) or is_filled(row.get('from_date'))
    if not from_ok:
        return False
    # Check to date if not current job
    if not row.get('current'):
        to_ok = is_filled(row.get('to')) or is_filled(row.get('to_date'))
        if not to_ok:
            return False
    return True

def check_references_complete(profile) -> bool:
    if not profile:
        return False
    source = getattr(profile, 'reference_source', None)
    if is_empty(source):
        return False
    person = getattr(profile, 'reference_person', None) or {}
    if not isinstance(person, dict):
        return False
    if source == "Person Referral":
        required = ['name', 'department', 'designation', 'contact', 'email']
        return all(is_filled(person.get(f)) for f in required)
    elif source == "Indeed":
        required = ['jobId', 'jobPostingDate']
        return all(is_filled(person.get(f)) for f in required)
    elif source == "Hiring Agency":
        required = ['agencyName', 'contactPerson']
        return all(is_filled(person.get(f)) for f in required)
    elif source == "Company Career Page":
        return True
    return False

def check_family_complete(profile) -> bool:
    if not profile:
        return False
    fam = getattr(profile, 'family', None) or []
    if not isinstance(fam, list) or len(fam) == 0:
        return False
    row = fam[0]
    if not isinstance(row, dict):
        return False
    required = ['relation', 'name', 'occupation', 'dob', 'adhaarcard_no']
    if not all(is_filled(row.get(f)) for f in required):
        return False
    aadhar = str(row.get('adhaarcard_no', '') or '')
    aadhar_clean = ''.join(c for c in aadhar if c.isdigit())
    if len(aadhar_clean) != 12:
        return False
    return True

def check_medical_complete(profile) -> bool:
    if not profile:
        return False
    med = getattr(profile, 'medical', None) or {}
    if not isinstance(med, dict):
        return False
    if not is_filled(med.get('bloodGroup')):
        return False
    if not is_filled(med.get('hasDisability')):
        return False
    if med.get('hasDisability') == "Yes" and not is_filled(med.get('disabilityYears')):
        return False
    if not is_filled(med.get('hasCondition')):
        return False
    if med.get('hasCondition') == "Yes" and not is_filled(med.get('conditionYears')):
        return False
    return True

def check_declaration_complete(profile, db: Session = None) -> bool:
    if not profile:
        return False
    decl = getattr(profile, 'declaration', None) or {}
    if not isinstance(decl, dict):
        return False
    if not decl.get('agreed'):
        return False
    if is_empty(decl.get('signature')) or is_empty(decl.get('place')):
        return False
    if not has_doc(profile, db, 'aadhar_doc_path', 'aadhar'):
        return False
    if not has_doc(profile, db, 'pan_doc_path', 'pan'):
        return False
    if not has_doc(profile, db, 'sslc_doc_path', 'sslc'):
        return False
    return True

def is_section_complete(profile, section_name: str, db: Session = None) -> bool:
    if section_name == "Personal Details":
        return check_personal_details_complete(profile, db)
    elif section_name == "Education Details":
        return check_education_complete(profile)
    elif section_name == "Employment Details":
        return check_employment_complete(profile)
    elif section_name == "References Details":
        return check_references_complete(profile)
    elif section_name == "Family Details":
        return check_family_complete(profile)
    elif section_name == "Medical Details":
        return check_medical_complete(profile)
    elif section_name == "Declaration":
        return check_declaration_complete(profile, db)
    return False

def calculate_profile_progress(profile, db: Session = None):
    sections = [
        "Personal Details",
        "Education Details",
        "Employment Details",
        "References Details",
        "Family Details",
        "Medical Details",
        "Declaration"
    ]
    
    if not profile:
        return 0, [f"{sec}: All fields missing" for sec in sections]

    # Map sections to their missing fields
    missing_by_section = {}

    # 1. Personal Details
    personal_missing = []
    if is_empty(getattr(profile, 'name', None)): personal_missing.append("Name")
    if is_empty(getattr(profile, 'designation', None)): personal_missing.append("Designation Applied For")
    if is_empty(getattr(profile, 'correspondence_address', None)): personal_missing.append("Correspondence Address")
    if is_empty(getattr(profile, 'permanent_address', None)): personal_missing.append("Permanent Address")
    
    phone = str(getattr(profile, 'phone_number', '') or '')
    phone_clean = ''.join(c for c in phone if c.isdigit())
    if len(phone_clean) != 10:
        personal_missing.append("Mobile (Primary)")

    mobile2 = str(getattr(profile, 'mobile2', '') or '')
    mobile2_clean = ''.join(c for c in mobile2 if c.isdigit())
    if mobile2_clean and len(mobile2_clean) != 10:
        personal_missing.append("Mobile (Alternate)")
        
    email_val = None
    if getattr(profile, 'user', None):
        email_val = profile.user.email
    elif db and getattr(profile, 'user_id', None):
        u = db.query(models.User).filter(models.User.id == profile.user_id).first()
        if u:
            email_val = u.email
    if is_empty(email_val):
        personal_missing.append("Email ID")
        
    if is_empty(getattr(profile, 'date_of_birth', None)): personal_missing.append("Date of Birth")
    if is_empty(getattr(profile, 'marital_status', None)): personal_missing.append("Marital Status")
    if is_empty(getattr(profile, 'gender', None)): personal_missing.append("Gender")
    if is_empty(getattr(profile, 'languages', None)): personal_missing.append("Languages Known")
    
    aadhar = str(getattr(profile, 'aadhar', '') or '')
    aadhar_clean = ''.join(c for c in aadhar if c.isdigit())
    if len(aadhar_clean) != 12:
        personal_missing.append("Aadhar Card No")
        
    if is_empty(getattr(profile, 'pan', None)): personal_missing.append("PAN Card No")
    if is_empty(getattr(profile, 'passport', None)): personal_missing.append("Passport No")
    if is_empty(getattr(profile, 'bank_account', None)): personal_missing.append("Bank Account No")
    if is_empty(getattr(profile, 'bank_name', None)): personal_missing.append("Bank Name")
    if is_empty(getattr(profile, 'ifsc', None)): personal_missing.append("IFSC Code")
    # Check UAN & ESIC — required only for experienced candidates
    candidate_type = getattr(profile, 'candidate_type', None) or ''
    is_experienced = candidate_type.lower() == 'experienced'
    if is_experienced:
        if is_empty(getattr(profile, 'uan', None)):
            personal_missing.append("UAN No")
        if is_empty(getattr(profile, 'esic', None)):
            personal_missing.append("ESIC No")
    
    if not has_doc(profile, db, 'photo_path', 'photo'): personal_missing.append("Photo")
    if not has_doc(profile, db, 'resume_path', 'resume'): personal_missing.append("Resume")
    
    # Emergency contacts
    contacts = getattr(profile, 'emergency_contacts', None) or []
    contacts_ok = True
    if not isinstance(contacts, list) or len(contacts) == 0:
        contacts_ok = False
    else:
        c = contacts[0]
        if not isinstance(c, dict) or is_empty(c.get('name')) or is_empty(c.get('relationship')) or is_empty(c.get('contact')):
            contacts_ok = False
        else:
            contact_clean = ''.join(ch for ch in str(c.get('contact', '')) if ch.isdigit())
            if len(contact_clean) != 10:
                contacts_ok = False
    if not contacts_ok:
        personal_missing.append("Emergency Contacts")
        
    if personal_missing:
        missing_by_section["Personal Details"] = personal_missing

    # 2. Education Details
    education_missing = []
    edu = getattr(profile, 'education', None) or []
    if not isinstance(edu, list) or len(edu) == 0:
        education_missing.extend(["Degree", "Institute", "From Date", "To Date", "Specialization"])
    else:
        row = edu[0]
        if not isinstance(row, dict):
            education_missing.extend(["Degree", "Institute", "From Date", "To Date", "Specialization"])
        else:
            if is_empty(row.get('degree')): education_missing.append("Degree")
            if is_empty(row.get('institute')): education_missing.append("Institute")
            if is_empty(row.get('specialization')): education_missing.append("Specialization")
            if is_empty(row.get('from')) and is_empty(row.get('from_date')): education_missing.append("From Date")
            if is_empty(row.get('to')) and is_empty(row.get('to_date')): education_missing.append("To Date")
    if education_missing:
        missing_by_section["Education Details"] = education_missing

    # 3. Employment Details — skipped entirely for freshers
    employment_missing = []
    is_fresher = candidate_type.lower() == 'fresher'
    if not is_fresher:
        emp = getattr(profile, 'employment', None) or []
        if not isinstance(emp, list) or len(emp) == 0:
            employment_missing.extend(["Organization", "Designation", "From Date", "Work Summary"])
        else:
            row = emp[0]
            if not isinstance(row, dict):
                employment_missing.extend(["Organization", "Designation", "From Date", "Work Summary"])
            else:
                if is_empty(row.get('organization')): employment_missing.append("Organization")
                if is_empty(row.get('designation')): employment_missing.append("Designation")
                if is_empty(row.get('from')) and is_empty(row.get('from_date')): employment_missing.append("From Date")
                if is_empty(row.get('summary')): employment_missing.append("Work Summary")
                if not row.get('current'):
                    if is_empty(row.get('to')) and is_empty(row.get('to_date')):
                        employment_missing.append("To Date")
    if employment_missing:
        missing_by_section["Employment Details"] = employment_missing

    # 4. References Details
    references_missing = []
    source = getattr(profile, 'reference_source', None)
    if is_empty(source):
        references_missing.append("Referred Through")
    else:
        person = getattr(profile, 'reference_person', None) or {}
        if not isinstance(person, dict):
            references_missing.append("Reference Details")
        else:
            if source == "Person Referral":
                if is_empty(person.get('name')): references_missing.append("Referral Name")
                if is_empty(person.get('department')): references_missing.append("Referral Department")
                if is_empty(person.get('designation')): references_missing.append("Referral Designation")
                if is_empty(person.get('contact')): references_missing.append("Referral Contact Number")
                if is_empty(person.get('email')): references_missing.append("Referral Email ID")
            elif source == "Indeed":
                if is_empty(person.get('jobId')): references_missing.append("Indeed Job ID")
                if is_empty(person.get('jobPostingDate')): references_missing.append("Indeed Job Posting Date")
            elif source == "Hiring Agency":
                if is_empty(person.get('agencyName')): references_missing.append("Hiring Agency Name")
                if is_empty(person.get('contactPerson')): references_missing.append("Hiring Agency Contact Person")
    if references_missing:
        missing_by_section["References Details"] = references_missing

    # 5. Family Details
    family_missing = []
    fam = getattr(profile, 'family', None) or []
    if not isinstance(fam, list) or len(fam) == 0:
        family_missing.extend(["Family Relation", "Family Member Name", "Family Member Occupation", "Family Member Date of Birth", "Family Member Aadhaar Number"])
    else:
        row = fam[0]
        if not isinstance(row, dict):
            family_missing.extend(["Family Relation", "Family Member Name", "Family Member Occupation", "Family Member Date of Birth", "Family Member Aadhaar Number"])
        else:
            if is_empty(row.get('relation')): family_missing.append("Family Relation")
            if is_empty(row.get('name')): family_missing.append("Family Member Name")
            if is_empty(row.get('occupation')): family_missing.append("Family Member Occupation")
            if is_empty(row.get('dob')): family_missing.append("Family Member Date of Birth")
            
            aadhar = str(row.get('adhaarcard_no', '') or '')
            aadhar_clean = ''.join(c for c in aadhar if c.isdigit())
            if len(aadhar_clean) != 12:
                family_missing.append("Family Member Aadhaar Number")
    if family_missing:
        missing_by_section["Family Details"] = family_missing

    # 6. Medical Details
    medical_missing = []
    med = getattr(profile, 'medical', None) or {}
    if not isinstance(med, dict):
        medical_missing.extend(["Blood Group", "Known Disability", "Known Medical Conditions"])
    else:
        if is_empty(med.get('bloodGroup')): medical_missing.append("Blood Group")
        if is_empty(med.get('hasDisability')): medical_missing.append("Known Disability")
        if med.get('hasDisability') == "Yes" and is_empty(med.get('disabilityYears')):
            medical_missing.append("Years of Disability")
        if is_empty(med.get('hasCondition')): medical_missing.append("Known Medical Conditions")
        if med.get('hasCondition') == "Yes" and is_empty(med.get('conditionYears')):
            medical_missing.append("Condition Since (Years)")
    if medical_missing:
        missing_by_section["Medical Details"] = medical_missing

    # 7. Declaration
    declaration_missing = []
    decl = getattr(profile, 'declaration', None) or {}
    if not isinstance(decl, dict):
        declaration_missing.extend(["Declaration Agreed", "Digital Signature", "Place", "Aadhaar Card Document", "PAN Card Document", "SSLC Marks Card Document"])
    else:
        if not decl.get('agreed'): declaration_missing.append("Declaration Agreed")
        if is_empty(decl.get('signature')): declaration_missing.append("Digital Signature")
        if is_empty(decl.get('place')): declaration_missing.append("Place")
        if not has_doc(profile, db, 'aadhar_doc_path', 'aadhar'): declaration_missing.append("Aadhaar Card Document")
        if not has_doc(profile, db, 'pan_doc_path', 'pan'): declaration_missing.append("PAN Card Document")
        if not has_doc(profile, db, 'sslc_doc_path', 'sslc'): declaration_missing.append("SSLC Marks Card Document")
    if declaration_missing:
        missing_by_section["Declaration"] = declaration_missing

    # Compute dynamic total fields & missing fields count
    ref_fields_count = 6
    if source == "Person Referral":
        ref_fields_count = 6
    elif source == "Indeed":
        ref_fields_count = 3
    elif source == "Hiring Agency":
        ref_fields_count = 3
    elif source == "Company Career Page":
        ref_fields_count = 1

    # For freshers, employment section contributes 0 fields (not required)
    emp_fields_count = 0
    if not is_fresher:
        emp_obj = getattr(profile, 'employment', None) or []
        emp_fields_count = 5
        if isinstance(emp_obj, list) and len(emp_obj) > 0 and isinstance(emp_obj[0], dict):
            if emp_obj[0].get('current'):
                emp_fields_count = 4

    # UAN field: only counts for experienced candidates (1 extra field)
    personal_fields_count = 21 + (1 if is_experienced else 0)

    med_fields_count = 3
    med = getattr(profile, 'medical', None) or {}
    if isinstance(med, dict):
        if med.get('hasDisability') == "Yes":
            med_fields_count += 1
        if med.get('hasCondition') == "Yes":
            med_fields_count += 1

    total_fields = personal_fields_count + 5 + emp_fields_count + ref_fields_count + 5 + med_fields_count + 6
    missing_fields_count = (
        len(personal_missing) +
        len(education_missing) +
        len(employment_missing) +
        len(references_missing) +
        len(family_missing) +
        len(medical_missing) +
        len(declaration_missing)
    )
    
    filled_count = total_fields - missing_fields_count
    profile_pct = max(0, int((filled_count / total_fields) * 100))

    # Format missing_sections as a list of strings
    missing_sections = []
    for sec in sections:
        if sec in missing_by_section:
            fields_str = ", ".join(missing_by_section[sec])
            missing_sections.append(f"{sec}: {fields_str}")

    return profile_pct, missing_sections


def build_application_response(app: models.Application, db: Session = None) -> dict:
    """Build a dict for ApplicationResponse with computed department from job relationship."""
    dept_name = None
    if app.job and app.job.department_rel:
        dept_name = app.job.department_rel.name
    elif app.job:
        dept_name = app.job.title  # fallback to job title

    # Build candidate_profile dict
    candidate_profile_data = None
    if app.candidate_profile:
        cp = app.candidate_profile
        candidate_profile_data = {
            c.name: getattr(cp, c.name) for c in cp.__table__.columns
        }  # Inject email from User model
        if cp.user and cp.user.email:
            candidate_profile_data["email"] = cp.user.email
        # marital_status and reference_source already exist in CandidateProfile
        candidate_profile_data["marital_status"] = cp.marital_status
        candidate_profile_data["reference_source"] = cp.reference_source
        # Inject document paths (photo, resume) from documents table so view modal can display them
        if db:
            doc_type_map = {
                "photo_path": "photo",
                "resume_path": "resume",
                "aadhar_doc_path": "aadhar",
                "pan_doc_path": "pan",
                "sslc_doc_path": "sslc",
            }
            for path_attr, doc_type in doc_type_map.items():
                doc_val = get_doc_path_for_type(db, cp.user_id, doc_type)
                if doc_val:
                    candidate_profile_data[path_attr] = doc_val
                elif getattr(cp, path_attr, None):
                    candidate_profile_data[path_attr] = getattr(cp, path_attr)
                else:
                    candidate_profile_data[path_attr] = None

    return {
        "id": app.id,
        "user_id": app.user_id,
        "job_id": app.job_id,
        "department": dept_name,
        "job_title": app.job.title if app.job else None,
        "experience_type": app.experience_type if hasattr(app, 'experience_type') else None,
        "other_details": app.other_details if hasattr(app, 'other_details') else None,
        "status": app.status.value if hasattr(app.status, 'value') else str(app.status),
        "status_percentage": app.status_percentage,
        "created_at": app.created_at,
        "candidate_profile": candidate_profile_data,
    }


def build_job_response(job: models.Job) -> dict:
    """Build a dict for JobResponse with computed department name from relationship."""
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
        "tags": job.tags,
        "skills": getattr(job, 'skills', None),
        "status": status_val,
    }


# =========================
# 👤 FILE UPLOADS
# =========================

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    folder: str = Form(...),
    target_user_id: Optional[str] = Form(None),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Upload a file to a specific folder (photos, resumes, documents).
    Saves the file and writes a record to the documents table.
    Returns the relative path to the saved file.
    If target_user_id is provided (HR uploading on behalf of a candidate),
    the Document record is linked to the candidate's user ID.
    """
    path = save_upload_file(file, folder)
    if not path:
        raise HTTPException(status_code=400, detail="File upload failed")

    # Determine which user_id to associate with the document
    # If HR provides a target_user_id, link the doc to the candidate
    doc_owner_id = current_user.id
    if target_user_id and current_user.role == "HR":
        try:
            parsed_target = uuid.UUID(target_user_id)
            target_user = db.query(models.User).filter(models.User.id == parsed_target).first()
            if target_user:
                doc_owner_id = target_user.id
        except (ValueError, Exception):
            pass  # Ignore invalid UUID; fall back to current_user.id

    # Determine document_type from folder
    folder_to_doc_type = {
        "photos": "photo",
        "resumes": "resume",
        "documents": "aadhar",   # generic fallback
        "aadhar": "aadhar",
        "pan": "pan",
        "sslc": "sslc",
    }
    doc_type = folder_to_doc_type.get(folder.lower(), folder.lower())

    # Determine mime type from content type
    mime_type = file.content_type if file.content_type else None
    file_name = file.filename if file.filename else os.path.basename(path)

    # Write to documents table
    new_doc = models.Document(
        user_id=doc_owner_id,
        document_type=doc_type,
        file_name=file_name,
        file_path=path,
        mime_type=mime_type,
    )
    db.add(new_doc)
    db.commit()

    return {"path": path}


# =========================
# 👤 PROFILE MANAGEMENT
# =========================

@router.put("/profile/{user_id}", response_model=schemas.CandidateProfileResponse)
def update_profile(
    user_id: uuid.UUID,
    profile: schemas.CandidateProfileUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update or Create candidate profile (all 7 sections)"""
    query = db.query(models.CandidateProfile).filter(
        models.CandidateProfile.user_id == user_id
    )
    existing_profile = query.first()

    data = profile.dict(exclude_unset=True)
    print(f"[DEBUG update_profile] data keys: {list(data.keys())}")

    # Synchronize document path fields with Document table and ensure they are assigned to user_id
    doc_path_map = {
        'photo_path': 'photo',
        'resume_path': 'resume',
        'aadhar_doc_path': 'aadhar',
        'pan_doc_path': 'pan',
        'sslc_doc_path': 'sslc'
    }
    for path_attr, doc_type in doc_path_map.items():
        if path_attr in data and data[path_attr]:
            file_path_val = data[path_attr]
            existing_doc = db.query(models.Document).filter(
                models.Document.file_path == file_path_val,
                models.Document.deleted_at == None
            ).first()
            if existing_doc:
                existing_doc.user_id = user_id
                existing_doc.document_type = doc_type
            else:
                db.add(models.Document(
                    user_id=user_id,
                    document_type=doc_type,
                    file_path=file_path_val,
                    file_name=os.path.basename(file_path_val)
                ))

    if existing_profile:
        # Check completeness of all sections before the update
        sections = [
            "Personal Details",
            "Education Details",
            "Employment Details",
            "References Details",
            "Family Details",
            "Medical Details",
            "Declaration"
        ]
        completed_before = {sec: is_section_complete(existing_profile, sec, db) for sec in sections}

        # Apply updates — only set fields that are actual columns on the model
        model_columns = {c.name for c in models.CandidateProfile.__table__.columns}
        for key, value in data.items():
            if key in model_columns:
                setattr(existing_profile, key, value)
                flag_modified(existing_profile, key)

        # Re-calculate progress and missing sections
        pct, missing_sections = calculate_profile_progress(existing_profile, db)
        existing_profile.profile_percentage = pct
        existing_profile.missing_sections = missing_sections

        # Check completeness of all sections after the update
        completed_after = {sec: is_section_complete(existing_profile, sec, db) for sec in sections}

        # Add notifications for newly completed sections
        for sec in sections:
            if completed_after[sec] and not completed_before[sec]:
                db.add(models.Notification(
                    user_id=user_id,
                    title=sec,
                    message=f"The {sec} section is successfully completed.",
                    notification_type="success"
                ))

        try:
            db.commit()
            db.refresh(existing_profile)
        except IntegrityError as ie:
            handle_integrity_error(ie, db)

        # Build response with injected doc paths
        resp_data = inject_doc_paths(existing_profile, db)
        if existing_profile.user and existing_profile.user.email:
            resp_data["email"] = existing_profile.user.email
        return schemas.CandidateProfileResponse(**resp_data)
    else:
        # Create new profile — only pass fields that are actual columns on the model
        model_columns = {c.name for c in models.CandidateProfile.__table__.columns}
        filtered_data = {k: v for k, v in data.items() if k in model_columns}
        new_profile = models.CandidateProfile(
            user_id=user_id,
            **filtered_data
        )

        pct, missing_sections = calculate_profile_progress(new_profile, db)
        new_profile.profile_percentage = pct
        new_profile.missing_sections = missing_sections

        db.add(new_profile)

        db.add(models.Notification(
            user_id=user_id,
            title="Profile Creation",
            message="Started your candidate profile.",
            notification_type="success"
        ))

        # Check if any sections are already complete upon creation
        sections = [
            "Personal Details",
            "Education Details",
            "Employment Details",
            "References Details",
            "Family Details",
            "Medical Details",
            "Declaration"
        ]
        for sec in sections:
            if is_section_complete(new_profile, sec, db):
                db.add(models.Notification(
                    user_id=user_id,
                    title=sec,
                    message=f"The {sec} section is successfully completed.",
                    notification_type="success"
                ))

        try:
            db.commit()
            db.refresh(new_profile)
        except IntegrityError as ie:
            handle_integrity_error(ie, db)

        resp_data = inject_doc_paths(new_profile, db)
        if new_profile.user and new_profile.user.email:
            resp_data["email"] = new_profile.user.email
        return schemas.CandidateProfileResponse(**resp_data)


@router.get("/profile/{user_id}", response_model=schemas.CandidateProfileResponse)
def get_profile(
    user_id: uuid.UUID,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Retrieve candidate profile by user ID (with injected document paths)."""
    profile = db.query(models.CandidateProfile).filter(
        models.CandidateProfile.user_id == user_id
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    resp_data = inject_doc_paths(profile, db)
    if profile.user and profile.user.email:
        resp_data["email"] = profile.user.email
    return schemas.CandidateProfileResponse(**resp_data)


@router.get("/skills", response_model=List[str])
def get_skills(
    db: Session = Depends(database.get_db),
):
    skills = db.query(models.Skill).order_by(models.Skill.name.asc()).all()
    return [skill.name for skill in skills]

@router.post("/skills", response_model=List[str])
def add_skill(
    skill: schemas.SkillCreate,
    db: Session = Depends(database.get_db),
):
    skill_name = skill.name.strip()

    if not skill_name:
        raise HTTPException(
            status_code=400,
            detail="Skill name cannot be empty"
        )

    existing = (
        db.query(models.Skill)
        .filter(models.Skill.name.ilike(skill_name))
        .first()
    )

    if not existing:
        db.add(models.Skill(name=skill_name))
        db.commit()

    skills = db.query(models.Skill).order_by(models.Skill.name.asc()).all()

    return [s.name for s in skills]
# =========================
# 📄 JOB APPLICATIONS
# =========================

@router.post("/apply")
def apply_for_job(
    application: schemas.ApplicationCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Submit a new job application.
    Frontend sends `department` string → backend resolves to a Job and stores job_id.
    If HR sends `candidate_id`, application is created on behalf of that candidate.
    """
    target_user_id = current_user.id
    if application.candidate_id and current_user.role == "HR":
        try:
            target_uuid = uuid.UUID(application.candidate_id)
            target_user = db.query(models.User).filter(models.User.id == target_uuid).first()
            if target_user:
                target_user_id = target_user.id
        except Exception:
            pass

    # If frontend provided a specific job_id, use it directly
    job = None
    dept = None
    if application.job_id:
        job = db.query(models.Job).options(
            joinedload(models.Job.department_rel)
        ).filter(
            models.Job.id == application.job_id,
            models.Job.status == models.JobStatus.OPEN
        ).first()
        if not job:
            raise HTTPException(
                status_code=404,
                detail=f"Job #{application.job_id} is not available or has been closed."
            )
        if job.department_rel:
            dept = job.department_rel
    else:
        # Legacy fallback: resolve department name → Department record → latest open job
        dept = db.query(models.Department).filter(
            models.Department.name.ilike(application.department)
        ).first()

        if not dept:
            dept = db.query(models.Department).filter(
                models.Department.name.ilike(f"%{application.department}%")
            ).first()

        if dept:
            job = db.query(models.Job).filter(
                models.Job.department_id == dept.id,
                models.Job.status == models.JobStatus.OPEN
            ).order_by(models.Job.posted_at.desc()).first()

        if not job:
            job = db.query(models.Job).join(
                models.Department, models.Job.department_id == models.Department.id
            ).filter(
                models.Department.name.ilike(f"%{application.department}%"),
                models.Job.status == models.JobStatus.OPEN
            ).order_by(models.Job.posted_at.desc()).first()

        if not job:
            job = db.query(models.Job).filter(
                models.Job.status == models.JobStatus.OPEN
            ).order_by(models.Job.posted_at.desc()).first()

        if not job:
            raise HTTPException(
                status_code=404,
                detail=f"No active job found for department '{application.department}'. Please contact HR."
            )

    # Check if candidate already applied for this exact job posting
    existing = db.query(models.Application).filter(
        models.Application.user_id == target_user_id,
        models.Application.job_id == job.id
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="This candidate has already applied to this specific job posting."
        )

    # Create application
    new_app = models.Application(
        user_id=target_user_id,
        job_id=job.id,
        status=models.ApplicationStatus.Applied,
        status_percentage=10,
        experience_type=application.experience_type,
        other_details=application.other_details,
    )
    db.add(new_app)

    # Notification
    dept_name = dept.name if dept else application.department
    db.add(models.Notification(
        user_id=target_user_id,
        title="Application Submitted",
        message=f"You have applied for the {dept_name.upper()} department. Please wait for further process.",
        notification_type="success"
    ))

    db.commit()
    db.refresh(new_app)

    # Reload with relationships
    new_app = db.query(models.Application).options(
        joinedload(models.Application.job).joinedload(models.Job.department_rel),
        joinedload(models.Application.candidate_profile)
    ).filter(models.Application.id == new_app.id).first()

    return build_application_response(new_app, db)


@router.get("/applications")
def get_my_applications(
    candidate_id: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Fetch all applications for the logged-in candidate or target candidate (if HR)."""
    target_user_id = current_user.id
    if candidate_id and current_user.role == "HR":
        try:
            target_uuid = uuid.UUID(candidate_id)
            target_user = db.query(models.User).filter(models.User.id == target_uuid).first()
            if target_user:
                target_user_id = target_user.id
        except Exception:
            pass

    apps = db.query(models.Application).options(
        joinedload(models.Application.job).joinedload(models.Job.department_rel),
        joinedload(models.Application.candidate_profile)
    ).filter(
        models.Application.user_id == target_user_id
    ).order_by(models.Application.created_at.desc()).all()

    return [build_application_response(a, db) for a in apps]


@router.delete("/application/{application_id}")
def delete_application(
    application_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Delete a job application."""
    query = db.query(models.Application).filter(models.Application.id == application_id)
    if current_user.role != "HR":
        query = query.filter(models.Application.user_id == current_user.id)
    app = query.first()

    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    db.delete(app)
    db.commit()
    return {"message": "Application deleted successfully"}


# =========================
# 🔔 DASHBOARD DATA & NOTIFICATIONS
# =========================

@router.post("/notifications/read-all")
def mark_notifications_read(
    candidate_id: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Mark all notifications as read for the current user or target candidate."""
    target_user_id = current_user.id
    if candidate_id and current_user.role == "HR":
        try:
            target_uuid = uuid.UUID(candidate_id)
            target_user = db.query(models.User).filter(models.User.id == target_uuid).first()
            if target_user:
                target_user_id = target_user.id
        except Exception:
            pass

    db.query(models.Notification).filter(
        models.Notification.user_id == target_user_id,
        models.Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}


@router.patch("/notifications/{notification_id}/read")
def mark_single_notification_read(
    notification_id: int,
    candidate_id: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Mark a single notification as read by its ID."""
    # For synthetic/analysis notifications (id >= 9900), skip DB update
    if notification_id >= 9900:
        return {"message": "Synthetic notification acknowledged"}

    target_user_id = current_user.id
    if candidate_id and current_user.role == "HR":
        try:
            target_uuid = uuid.UUID(candidate_id)
            target_user = db.query(models.User).filter(models.User.id == target_uuid).first()
            if target_user:
                target_user_id = target_user.id
        except Exception:
            pass

    note = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == target_user_id
    ).first()
    if not note:
        raise HTTPException(status_code=404, detail="Notification not found")

    note.is_read = True
    db.commit()
    return {"message": "Notification marked as read"}


@router.get("/dashboard", response_model=schemas.DashboardResponse)
def get_dashboard_data(
    candidate_id: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Fetch stats, notifications, similar jobs, and progress for the dashboard."""
    target_user_id = current_user.id
    if candidate_id and current_user.role == "HR":
        try:
            target_uuid = uuid.UUID(candidate_id)
            target_user = db.query(models.User).filter(models.User.id == target_uuid).first()
            if target_user:
                target_user_id = target_user.id
        except Exception:
            pass

    # 1. Profile & applications
    profile = db.query(models.CandidateProfile).filter(
        models.CandidateProfile.user_id == target_user_id
    ).first()

    apps = db.query(models.Application).options(
        joinedload(models.Application.job).joinedload(models.Job.department_rel)
    ).filter(
        models.Application.user_id == target_user_id
    ).order_by(models.Application.created_at.desc()).all()

    # Stats
    photo_url = None
    if profile:
        photo_url = get_doc_path_for_type(db, target_user_id, "photo")
        if not photo_url:
            photo_url = getattr(profile, "photo_path", None)

    target_name = "Candidate"
    if profile and profile.name:
        target_name = profile.name
    else:
        target_user_obj = db.query(models.User).filter(models.User.id == target_user_id).first()
        if target_user_obj and target_user_obj.email:
            target_name = target_user_obj.email.split('@')[0]

    stats = schemas.DashboardStats(
        name=target_name,
        photo_url=photo_url,
        applications_applied=len(apps),
        interviews_scheduled=len([a for a in apps if "interview" in str(a.status).lower()]),
        offers_received=len([a for a in apps if "offer" in str(a.status).lower()])
    )

    # 2. Notifications - order ascending to show sequence filled
    notifications = db.query(models.Notification).filter(
        models.Notification.user_id == target_user_id
    ).order_by(models.Notification.created_at.asc()).all()

    # 3. Similar Jobs — match by department from most recent application
    last_app = apps[0] if apps else None
    applied_dept_id = None
    if last_app and last_app.job:
        applied_dept_id = last_app.job.department_id

    similar_jobs = []

    # Priority 1: Match by department of last application (only if candidate has applied to a job!)
    if applied_dept_id:
        similar_jobs = db.query(models.Job).options(
            joinedload(models.Job.department_rel)
        ).filter(
            models.Job.department_id == applied_dept_id,
            models.Job.status == models.JobStatus.OPEN
        ).order_by(models.Job.posted_at.desc()).all()

    similar_jobs_data = [build_job_response(j) for j in similar_jobs]

    # 4. Progress
    profile_pct = profile.profile_percentage if profile else 0
    missing_sections = profile.missing_sections if profile else [
        "Personal Details: Name, Designation Applied For, Correspondence Address, Permanent Address, Mobile (Primary), Email ID, Date of Birth, Marital Status, Gender, Languages Known, Aadhar Card No, PAN Card No, Bank Account No, Bank Name, IFSC Code, Photo, Resume, Emergency Contacts",
        "Education Details: Degree, Institute, From Date, To Date, Specialization",
        "Employment Details: Organization, Designation, From Date",
        "References Details: Referred Through",
        "Family Details: Family Member Details",
        "Medical Details: Blood Group",
        "Declaration: Declaration Agreed, Digital Signature, Place, Aadhaar Card Document, PAN Card Document, SSLC Marks Card Document"
    ]

    # Inject profile analysis notifications
    if profile_pct < 100 and missing_sections:
        for idx, sec in enumerate(missing_sections):
            if ":" in sec:
                sec_name, fields = sec.split(":", 1)
                msg = f"In {sec_name} UDF/section, the following fields are missing: {fields.strip()}."
                title = f"Missing {sec_name}"
            else:
                msg = f"Please fill out your {sec} UDF/section to complete your profile."
                title = f"Missing {sec}"
            analysis_note = models.Notification(
                id=9900 + idx,
                title=title,
                message=msg,
                notification_type="urgent",
                is_read=False,
                created_at=(profile.updated_at or profile.created_at or datetime.now()) if profile else datetime.now()
            )
            notifications.insert(0, analysis_note)
    elif profile_pct == 100:
        success_note = models.Notification(
            id=10000,
            title="Profile Complete",
            message="Congratulations! Your profile is 100% complete and ready for process.",
            notification_type="success",
            is_read=False,
            created_at=(profile.updated_at or profile.created_at or datetime.now()) if profile else datetime.now()
        )
        notifications.insert(0, success_note)

    # Application progress %
    app_pct = 0
    if last_app:
        app_pct = last_app.status_percentage

    return schemas.DashboardResponse(
        stats=stats,
        notifications=notifications,
        similar_jobs=similar_jobs_data,
        progress=schemas.ProgressInfo(
            profile_percentage=profile_pct,
            application_percentage=app_pct
        )
    )


@router.get("/options")
def get_options(db: Session = Depends(database.get_db)):
    """Return department options, open jobs, and sources from the database."""
    depts = db.query(models.Department).filter(
        models.Department.is_active == True
    ).order_by(models.Department.name).all()

    if depts:
        dept_list = [{"label": d.name, "value": d.name.lower().replace(" ", "_")} for d in depts]
    else:
        # Static fallback
        dept_list = [
            {"label": "CNC", "value": "cnc"},
            {"label": "VMC", "value": "vmc"},
            {"label": "TMC", "value": "tmc"},
            {"label": "Accounts", "value": "accounts"},
            {"label": "Data Analyst", "value": "data_analyst"},
            {"label": "Dispatch", "value": "dispatch"},
            {"label": "Purchase", "value": "purchase"},
            {"label": "Sales", "value": "sales"},
            {"label": "Quality", "value": "quality"},
            {"label": "Stores", "value": "stores"},
        ]

    # Fetch all open jobs so frontend can pick a specific job posting
    open_jobs = db.query(models.Job).join(
        models.Department, models.Job.department_id == models.Department.id
    ).filter(
        models.Job.status == models.JobStatus.OPEN
    ).order_by(models.Department.name, models.Job.posted_at.desc()).all()

    jobs_list = [
        {
            "id": j.id,
            "label": f"{j.department_rel.name} — {j.title}" if j.department_rel else j.title,
            "value": str(j.id),
            "title": j.title,
            "department": j.department_rel.name if j.department_rel else "",
        }
        for j in open_jobs
    ]

    return {
        "departments": dept_list,
        "jobs": jobs_list,
        "sources": [
            {"label": "Indeed", "value": "Indeed"},
            {"label": "Hiring Agency", "value": "Hiring Agency"},
            {"label": "Person Referral", "value": "Person Referral"},
            {"label": "Company Career Page", "value": "Company Career Page"},
        ]
    }


@router.get("/jobs", response_model=List[schemas.JobResponse])
def get_jobs_by_department(
    department: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Fetch open jobs matching a given department name (for candidate similar jobs panel)."""
    # Handle underscores used in frontend values (e.g. "software_development" → "software development")
    search_dept = department.replace("_", " ")

    # Try exact case-insensitive match first
    dept = db.query(models.Department).filter(
        models.Department.name.ilike(search_dept)
    ).first()

    # Fallback to partial match
    if not dept:
        dept = db.query(models.Department).filter(
            models.Department.name.ilike(f"%{search_dept}%")
        ).first()

    if not dept:
        return []

    jobs = db.query(models.Job).options(
        joinedload(models.Job.department_rel)
    ).filter(
        models.Job.department_id == dept.id,
        models.Job.status == models.JobStatus.OPEN
    ).order_by(models.Job.posted_at.desc()).all()

    return [build_job_response(j) for j in jobs]


@router.get("/languages", response_model=List[str])
def get_languages(db: Session = Depends(database.get_db)):
    """Fetch all registered language names in alphabetical order."""
    langs = db.query(models.Language).order_by(models.Language.name).all()
    return [l.name for l in langs]


@router.post("/languages", response_model=List[str])
def add_language(
    payload: schemas.LanguageCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Add a new language name to the database and return the updated alphabetical list."""
    cleaned_name = payload.name.strip()
    if not cleaned_name:
        raise HTTPException(status_code=400, detail="Language name cannot be empty")
    
    # Check if exists
    exists = db.query(models.Language).filter(models.Language.name.ilike(cleaned_name)).first()
    if not exists:
        new_lang = models.Language(name=cleaned_name)
        db.add(new_lang)
        db.commit()
    
    # Return alphabetical list of all language names
    langs = db.query(models.Language).order_by(models.Language.name).all()
    return [l.name for l in langs]