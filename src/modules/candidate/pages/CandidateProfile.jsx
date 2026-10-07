import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, UserPlus, AlertCircle, Save, Check } from "lucide-react";
import AE_Logo from "../../../assets/images/AE_Logo.png";
import API, { checkEmailAvailability, getCandidateProfile, updateCandidateProfile } from "../../../api";
import { isValidDate, isToAfterFrom, parseDate } from "../components/utils/dateHelpers";

import ProfileStepper from "../components/ui/ProfileStepper";
import PersonalDetails from "../components/profile/PersonalDetails";
import EducationDetails from "../components/profile/EducationDetails";
import EmploymentDetails from "../components/profile/EmploymentDetails";
import ReferenceDetails from "../components/profile/ReferencesDetails";
import FamilyDetails from "../components/profile/FamilyDetails";
import MedicalDetails from "../components/profile/MedicalDetails";
import Declaration from "../components/profile/DeclarationDetails";
import Toast from "../components/ui/Toast";
import useToasts from "../hooks/useToasts";

import {
  PersonalIcon,
  EducationIcon,
  EmploymentIcon,
  ReferencesIcon,
  FamilyIcon,
  MedicalIcon,
  DeclarationIcon,
} from "../../../assets/icons/AllIcons";

const SECTIONS = [
  "Personal Details",
  "Education Details",
  "Employment Details",
  "References Details",
  "Family Details",
  "Medical Details",
  "Declaration",
];

const STEP_ICONS = [
  PersonalIcon,
  EducationIcon,
  EmploymentIcon,
  ReferencesIcon,
  FamilyIcon,
  MedicalIcon,
  DeclarationIcon,
];

// 🔹 Format FastAPI validation errors or network errors into clear string
const formatApiError = (err, fallbackMsg = "An error occurred.") => {
  if (!err) return fallbackMsg;
  if (typeof err === "string") return err;
  
  const detail = err.response?.data?.detail;
  if (detail) {
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (typeof item === "string") return item;
          if (item?.msg) {
            const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : "";
            return field ? `${field}: ${item.msg}` : item.msg;
          }
          return JSON.stringify(item);
        })
        .join(" • ");
    }
    if (typeof detail === "object") return detail.msg || JSON.stringify(detail);
  }

  if (err.message && !err.response) return err.message;
  return fallbackMsg;
};

// 🔹 Get logged-in user
const getLoggedInUser = () => {
  const user = localStorage.getItem("loggedInUser");
  return user ? JSON.parse(user) : null;
};

const DEFAULT_FORM_DATA = {
  name: "",
  designation: "",
  correspondenceAddress: "",
  permanentAddress: "",
  mobilePrimary: "",
  mobileAlternate: "",
  email: "",
  dob: "",
  maritalStatus: "",
  gender: "",
  aadhar: "",
  pan: "",
  passport: "",
  bankAccount: "",
  bankName: "",
  ifsc: "",
  uan: "",
  esic: "",
  candidateType: "",
  languages: [],
  customLanguage: "",
  skills: [],
  education: [{ degree: "", institute: "", from: "", to: "", specialization: "" }],
  employment: [{ organization: "", from: "", to: "", designation: "", current: false }],
  emergencyContacts: [
    { name: "", relationship: "", contact: "" }
  ],
  referenceSource: "",
  referencePerson: { name: "", designation: "", contact: "" },
  family: [{ relation: "", name: "", occupation: "", dob: "", adhaarcard_no: "", pancard_no: "", }],
  medical: { bloodGroup: "", hasDisability: "No", disabilityYears: "", hasCondition: "No", conditionYears: "" },
  declaration: { date: "", place: "" },
};

// 🔹 Map Backend to Frontend
const mapBackendToFrontend = (data) => {
  let formattedDob = "";
  if (data.date_of_birth && data.date_of_birth.includes("-")) {
    const parts = data.date_of_birth.split("-");
    // Backend stores DD-MM-YYYY → keep as-is for the frontend
    // If somehow stored as YYYY-MM-DD (parts[0].length===4), convert to DD-MM-YYYY
    if (parts[0].length === 4) {
      formattedDob = `${parts[2]}-${parts[1]}-${parts[0]}`;
    } else {
      // Already DD-MM-YYYY, use directly
      formattedDob = data.date_of_birth;
    }
  }

  return {
    ...DEFAULT_FORM_DATA,
    ...data,
    name: data.name || "",
    mobilePrimary: data.phone_number || "",
    mobileAlternate: data.mobile2 || "",
    dob: formattedDob,
    correspondenceAddress: data.correspondence_address || "",
    permanentAddress: data.permanent_address || "",
    maritalStatus: data.marital_status || "",
    bankAccount: data.bank_account || "",
    bankName: data.bank_name || "",
    uan: data.uan || "",
    esic: data.esic || "",
    candidateType: data.candidate_type || "",
    languages: data.languages || [],
    customLanguage: data.custom_language || "",
    skills: data.skills || [],
    education: data.education && data.education.length > 0
      ? data.education.map((edu) => ({
          ...edu,
          degree: edu.degree || edu.course || "",
          institute: edu.institute || edu.institution || edu.college || "",
          from: edu.from || edu.from_date || edu.startDate || edu.start_date || "",
          to: edu.to || edu.to_date || edu.endDate || edu.end_date || "",
          specialization: edu.specialization || edu.branch || "",
        }))
      : DEFAULT_FORM_DATA.education,
    employment: data.employment && data.employment.length > 0
      ? data.employment.map((emp) => ({
          ...emp,
          organization: emp.organization || emp.company || emp.company_name || "",
          designation: emp.designation || emp.role || emp.position || "",
          from: emp.from || emp.from_date || emp.startDate || emp.start_date || "",
          to: emp.to || emp.to_date || emp.endDate || emp.end_date || "",
          current: emp.current !== undefined ? Boolean(emp.current) : (Boolean(emp.is_current) || false),
          summary: emp.summary || "",
        }))
      : DEFAULT_FORM_DATA.employment,
    emergencyContacts: data.emergency_contacts && data.emergency_contacts.length > 0 ? data.emergency_contacts : DEFAULT_FORM_DATA.emergencyContacts,
    referencePerson: (data.reference_person && Object.keys(data.reference_person).length > 0) ? data.reference_person : DEFAULT_FORM_DATA.referencePerson,
    referenceSource: data.reference_source || "",
    family: data.family && data.family.length > 0 ? data.family : DEFAULT_FORM_DATA.family,
    medical: (data.medical && Object.keys(data.medical).length > 0) ? data.medical : DEFAULT_FORM_DATA.medical,
    declaration: (data.declaration && Object.keys(data.declaration).length > 0) ? data.declaration : DEFAULT_FORM_DATA.declaration,
    is_profile_created: data.is_profile_created || false,
    photo_path: data.photo_path || null,
    resume_path: data.resume_path || null,
    photo: data.photo || (data.photo_path ? { name: "Profile Photo", data: data.photo_path } : null),
    resume: data.resume || (data.resume_path ? { name: data.resume_path.split("/").pop() || "Candidate Resume", data: data.resume_path } : null),
    aadhar_doc_path: data.aadhar_doc_path || null,
    pan_doc_path: data.pan_doc_path || null,
    sslc_doc_path: data.sslc_doc_path || null,
  };
};

// 🔹 Map Frontend to Backend
const mapFrontendToBackend = (data) => {
  let formattedDob = data.dob;
  if (data.dob && data.dob.includes("-")) {
    const parts = data.dob.split("-");
    if (parts[0].length === 4) {
      formattedDob = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }

  return {
    name: data.name,
    designation: data.designation,
    phone_number: data.mobilePrimary,
    mobile2: data.mobileAlternate,
    email: data.email,
    date_of_birth: formattedDob,
    marital_status: data.maritalStatus,
    gender: data.gender,
    correspondence_address: data.correspondenceAddress,
    permanent_address: data.permanentAddress,
    aadhar: data.aadhar,
    pan: data.pan,
    passport: data.passport,
    bank_account: data.bankAccount,
    bank_name: data.bankName,
    ifsc: data.ifsc,
    uan: data.uan,
    esic: data.esic,
    candidate_type: data.candidateType,
    languages: data.languages,
    custom_language: data.customLanguage,
    skills: data.skills,
    education: (data.education || []).map((edu) => ({
      ...edu,
      from: edu.from || "",
      to: edu.to || "",
      from_date: edu.from || edu.from_date || "",
      to_date: edu.to || edu.to_date || "",
    })),
    employment: (data.employment || []).map((emp) => ({
      ...emp,
      from: emp.from || "",
      to: emp.to || "",
      from_date: emp.from || emp.from_date || "",
      to_date: emp.to || emp.to_date || "",
    })),
    emergency_contacts: data.emergencyContacts,
    reference_person: data.referencePerson,
    reference_source: data.referenceSource,
    family: data.family,
    medical: data.medical,
    declaration: data.declaration,
    is_profile_created: data.is_profile_created || false,
    photo_path: data.photo_path || null,
    resume_path: data.resume_path || null,
    aadhar_doc_path: data.aadhar_doc_path || null,
    pan_doc_path: data.pan_doc_path || null,
    sslc_doc_path: data.sslc_doc_path || null,
  };
};

export default function CandidateProfile({
  readOnly = false,
  isEditFlow = false,
  onSave = () => { },
  onCancel = () => { },
  onEdit = () => { },
  setIsDirty = () => { },
  showHeader = true,
  candidateUserIdProp = null,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toasts, addToast, removeToast } = useToasts();
  const user = getLoggedInUser();

  // HR Mode detection: explicitly navigated from HR portal or logged-in user is HR
  const isHRMode = location.state?.fromHR === true || user?.role === "HR" || Boolean(candidateUserIdProp);
  const editUserId = candidateUserIdProp || location.state?.candidateId || location.state?.editUserId || null;
  const isEditMode = (location.state?.editMode === true || Boolean(candidateUserIdProp)) && !!editUserId;
  const [candidateUserId, setCandidateUserId] = useState(editUserId);
  const [emailError, setEmailError] = useState("");
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const isDuplicateEmail = Boolean(isHRMode && !isEditMode && !candidateUserId && emailError);

  const [currentSection, setCurrentSection] = useState(() => {
    // If redirected from job application to update photo/resume, always land on Personal Details
    if (sessionStorage.getItem("targetProfileField")) return 0;
    return parseInt(localStorage.getItem(`profile_section_${user?.id}`) || "0");
  });
  const [autoSaveStatus, setAutoSaveStatus] = useState("Ready");
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    setValidationErrors({});
  }, [currentSection]);

  useEffect(() => {
    if (!isHRMode && user?.id) {
      localStorage.setItem(`profile_section_${user.id}`, currentSection.toString());
    }
  }, [currentSection, user?.id, isHRMode]);

  const [isDirtyLocal, setIsDirtyLocal] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreated, setIsCreated] = useState(false);

  const originalDataRef = useRef(formData);

  // 🔹 Real-time check for duplicate email in HR candidate profile creation
  useEffect(() => {
    if (!isHRMode || isEditMode || candidateUserId) return;

    const email = formData.email?.trim().toLowerCase();

    if (!email) {
      setEmailError("");
      setValidationErrors((prev) => {
        if (!prev.email || prev.email !== "Email already registered") return prev;
        const next = { ...prev };
        delete next.email;
        return next;
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      if (emailError) {
        setEmailError("");
        setValidationErrors((prev) => {
          if (!prev.email || prev.email !== "Email already registered") return prev;
          const next = { ...prev };
          delete next.email;
          return next;
        });
      }
      return;
    }

    setIsCheckingEmail(true);
    const timer = setTimeout(async () => {
      try {
        const response = await checkEmailAvailability(email);
        if (response.data && !response.data.available) {
          const errMsg = "Email already registered";
          setEmailError(errMsg);
          setValidationErrors((prev) => ({ ...prev, email: errMsg }));
          addToast({
            title: "Email already registered",
            message: "Email already registered. Remaining 6 sections are locked.",
            type: "warning",
          });
        } else {
          setEmailError("");
          setValidationErrors((prev) => {
            if (!prev.email || prev.email !== "Email already registered") return prev;
            const next = { ...prev };
            delete next.email;
            return next;
          });
        }
      } catch (err) {
        console.error("Email verification error:", err);
      } finally {
        setIsCheckingEmail(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [formData.email, isHRMode, isEditMode, candidateUserId]);

  // If duplicate email error is active, lock to Section 0
  useEffect(() => {
    if (isDuplicateEmail && currentSection !== 0) {
      setCurrentSection(0);
    }
  }, [isDuplicateEmail, currentSection]);

  // 🔹 Ensure candidate user account is created on backend when HR fills profile
  const ensureCandidateUserForHR = async () => {
    if (candidateUserId) return candidateUserId;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.name?.trim()) {
      addToast({
        title: "Candidate Name Required",
        message: "Please enter candidate Full Name in Personal Details section.",
        type: "warning"
      });
      throw new Error("Candidate Full Name is required in Personal Details.");
    }
    if (!formData.email?.trim() || !emailRegex.test(formData.email.trim())) {
      addToast({
        title: "Valid Email Required",
        message: "Please enter a valid candidate Email ID (e.g. name@example.com) in Personal Details section.",
        type: "warning"
      });
      throw new Error("Valid candidate Email ID is required in Personal Details.");
    }

    try {
      const res = await API.post("/hr/candidates/create-on-behalf", {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone_number: formData.mobilePrimary ? formData.mobilePrimary.trim() : undefined,
        designation: formData.designation ? formData.designation.trim() : undefined,
      });

      const newUserId = res.data.user_id;
      setCandidateUserId(newUserId);
      return newUserId;
    } catch (err) {
      console.error("Failed to create candidate user on behalf:", err);
      const msg = formatApiError(err, "Failed to initialize candidate record on backend.");
      if (err.response?.status === 409 || msg.toLowerCase().includes("email already registered")) {
        setEmailError("Email already registered");
        setValidationErrors((prev) => ({ ...prev, email: "Email already registered" }));
      }
      addToast({
        title: "Registration Failed",
        message: msg.substring(0, 180),
        type: "warning"
      });
      throw new Error(msg);
    }
  };

  // 🔹 Fetch Data from Backend
  useEffect(() => {
    if (isHRMode) {
      if (isEditMode && editUserId) {
        // HR Edit Mode: fetch existing candidate profile for editing
        const fetchEditProfile = async () => {
          try {
            const res = await getCandidateProfile(editUserId);
            if (res.data) {
              const mapped = mapBackendToFrontend(res.data);
              setFormData(mapped);
              originalDataRef.current = mapped;
              setIsCreated(res.data.is_profile_created);
            }
          } catch (err) {
            console.warn("Failed to fetch candidate profile for editing:", err);
            setFormData(DEFAULT_FORM_DATA);
            originalDataRef.current = DEFAULT_FORM_DATA;
          } finally {
            setIsLoading(false);
          }
        };
        fetchEditProfile();
      } else {
        // HR Create Mode: start with a fresh clean candidate profile form
        setFormData(DEFAULT_FORM_DATA);
        originalDataRef.current = DEFAULT_FORM_DATA;
        setIsLoading(false);
      }
      return;
    }

    if (!user || !user.id) {
      setIsLoading(false);
      return;
    }

    const fetchProfile = async () => {
      let baseData = DEFAULT_FORM_DATA;
      try {
        const res = await getCandidateProfile(user.id);
        if (res.data) {
          baseData = mapBackendToFrontend(res.data);
          setIsCreated(res.data.is_profile_created);
        }
      } catch (err) {
        console.warn("No existing profile found on backend.");
      }

      // ✅ Auto-populate email from logged-in user if empty
      if (!baseData.email && user.email) {
        baseData = { ...baseData, email: user.email };
      }

      // Merge local draft if available
      const draftStr = localStorage.getItem(`candidate_draft_${user.id}`);
      if (draftStr) {
        try {
          const draft = JSON.parse(draftStr);
          baseData = { ...baseData, ...draft };
          // Still ensure email is always set from login if not in draft
          if (!baseData.email && user.email) {
            baseData.email = user.email;
          }
          setIsDirtyLocal(true);
          setIsDirty(true);
        } catch (e) {
          console.error("Failed to parse local draft", e);
        }
      }

      setFormData(baseData);
      originalDataRef.current = baseData;
      setIsLoading(false);
    };

    fetchProfile();
  }, [user?.id]);

  // 🔹 Auto-save draft to localStorage whenever form is dirty
  useEffect(() => {
    if (isDirtyLocal && user?.id) {
      localStorage.setItem(`candidate_draft_${user.id}`, JSON.stringify(formData));
    }
  }, [formData, isDirtyLocal, user?.id]);

  const updateFormData = (updater) => {
    setFormData((prev) => {
      const updated = typeof updater === "function" ? updater(prev) : updater;
      return updated;
    });
    if (!readOnly) {
      setIsDirtyLocal(true);
      setIsDirty(true);
    }
  };

  // ✅ Step-level validation per section — builds keyed error object and sets state
  const validateCurrentSection = () => {
    const errs = {};

    if (currentSection === 0) {
      if (!formData.name?.trim()) errs.name = "Name is required";
      if (!formData.designation?.trim()) errs.designation = "Designation is required";
      if (!formData.candidateType?.trim()) errs.candidateType = "Please select Fresher or Experienced";
      if (!formData.correspondenceAddress?.trim()) errs.correspondenceAddress = "Correspondence Address is required";
      if (!formData.permanentAddress?.trim()) errs.permanentAddress = "Permanent Address is required";
      if (!formData.email?.trim()) errs.email = "Email ID is required";

      if (!formData.dob?.trim()) errs.dob = "Date of Birth is required";
      else if (!isValidDate(formData.dob)) errs.dob = "Date of Birth must be in DD-MM-YYYY format (e.g. 24-06-2026)";
      else {
        const dobParsed = parseDate(formData.dob);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (dobParsed && dobParsed >= today) errs.dob = "Date of Birth cannot be today or a future date";
      }

      if (!formData.mobilePrimary?.trim()) errs.mobilePrimary = "Mobile (Primary) is required";
      else if (formData.mobilePrimary.replace(/\D/g, "").length !== 10) errs.mobilePrimary = "Mobile (Primary) must be exactly 10 digits";

      if (formData.mobileAlternate && formData.mobileAlternate.replace(/\D/g, "").length !== 10) {
        errs.mobileAlternate = "Mobile (Alternate) must be exactly 10 digits";
      }

      if (!formData.aadhar?.trim()) errs.aadhar = "Aadhar Card No is required";
      else if (formData.aadhar.replace(/\D/g, "").length !== 12) errs.aadhar = "Aadhar Card No must be exactly 12 digits";

      if (!formData.pan?.trim()) errs.pan = "PAN Card No is required";
      else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan.replace(/[^A-Za-z0-9]/g, "").toUpperCase())) errs.pan = "PAN Card No must be in format ABCDE1234F (5 letters, 4 digits, 1 letter)";

      if (!formData.bankAccount?.trim()) errs.bankAccount = "Bank Account No is required";
      else if (formData.bankAccount.replace(/\D/g, "").length !== 14) errs.bankAccount = "Bank Account No must be exactly 14 digits";

      if (!formData.bankName?.trim()) errs.bankName = "Bank Name is required";

      if (!formData.ifsc?.trim()) errs.ifsc = "IFSC Code is required";
      else if (!/^[A-Z]{4}[0-9]{6}$/.test(formData.ifsc.replace(/[^A-Za-z0-9]/g, "").toUpperCase())) errs.ifsc = "IFSC Code must be 4 letters followed by 6 digits (e.g. SBIN123456)";

      // UAN & ESIC required + digit-count only for experienced candidates
      if (formData.candidateType === "experienced") {
        if (!formData.uan?.trim()) errs.uan = "UAN No is required for experienced candidates";
        else if (formData.uan.replace(/\D/g, "").length !== 12) errs.uan = "UAN No must be exactly 12 digits";

        if (!formData.esic?.trim()) errs.esic = "ESIC No is required for experienced candidates";
        else if (formData.esic.replace(/\D/g, "").length !== 10) errs.esic = "ESIC No must be exactly 10 digits";
      } else if (formData.candidateType === "fresher") {
        // Optional for freshers but validate format if filled
        if (formData.uan?.trim() && formData.uan.replace(/\D/g, "").length !== 12)
          errs.uan = "UAN No must be exactly 12 digits";
        if (formData.esic?.trim() && formData.esic.replace(/\D/g, "").length !== 10)
          errs.esic = "ESIC No must be exactly 10 digits";
      }

      if (!formData.photo && !formData.photo_path) errs.photo = "Photo is required";
      if (!formData.resume && !formData.resume_path) errs.resume = "Resume is required";

      const emergencyList = formData.emergencyContacts || [];
      if (emergencyList.length === 0 || !emergencyList[0]?.name?.trim() || !emergencyList[0]?.contact?.trim()) {
        errs.emergencyContacts = "At least one Emergency Contact with Name and Contact number is required";
      } else {
        emergencyList.forEach((c, idx) => {
          if (!c.name?.trim() || !c.relationship?.trim() || !c.contact?.trim()) {
            errs[`emergencyContacts_${idx}`] = `Emergency Contact ${idx + 1}: Name, Relationship, and Contact No are all required`;
          } else if (c.contact.replace(/\D/g, "").length !== 10) {
            errs[`emergencyContacts_${idx}`] = `Emergency Contact ${idx + 1}: Contact No must be exactly 10 digits`;
          }
        });
      }
    }

    if (currentSection === 1) {
      const eduList = formData.education || [];
      if (eduList.length === 0 || !eduList[0]?.degree?.trim()) {
        errs.education = "At least one education entry with a Degree is required";
      } else {
        eduList.forEach((edu, i) => {
          if (!edu.degree?.trim()) errs[`edu_${i}_degree`] = `Education row ${i + 1}: Degree is required`;
          if (!edu.institute?.trim()) errs[`edu_${i}_institute`] = `Education row ${i + 1}: Institute is required`;
          if (!edu.from?.trim()) errs[`edu_${i}_from`] = `Education row ${i + 1}: From date is required`;
          else if (!isValidDate(edu.from)) errs[`edu_${i}_from`] = `Education row ${i + 1}: From date must be DD-MM-YYYY`;
          if (!edu.to?.trim()) errs[`edu_${i}_to`] = `Education row ${i + 1}: To date is required`;
          else if (!isValidDate(edu.to)) errs[`edu_${i}_to`] = `Education row ${i + 1}: To date must be DD-MM-YYYY`;
          else if (edu.from && isValidDate(edu.from) && !isToAfterFrom(edu.from, edu.to))
            errs[`edu_${i}_to`] = `Education row ${i + 1}: To date must be after From date`;
          if (!edu.specialization?.trim()) errs[`edu_${i}_specialization`] = `Education row ${i + 1}: Specialization is required`;
        });
      }
    }

    if (currentSection === 2) {
      // Freshers are not required to fill employment details
      if (formData.candidateType !== "fresher") {
        const empList = formData.employment || [];
        if (empList.length === 0 || !empList[0]?.organization?.trim()) {
          errs.employment = "At least one employment entry with an Organization is required";
        } else {
          empList.forEach((emp, i) => {
            if (!emp.organization?.trim()) errs[`emp_${i}_organization`] = `Employment row ${i + 1}: Organization is required`;
            if (!emp.designation?.trim()) errs[`emp_${i}_designation`] = `Employment row ${i + 1}: Designation is required`;
            if (!emp.from?.trim()) errs[`emp_${i}_from`] = `Employment row ${i + 1}: From date is required`;
            else if (!isValidDate(emp.from)) errs[`emp_${i}_from`] = `Employment row ${i + 1}: From date must be DD-MM-YYYY`;
            if (!emp.current && !emp.to?.trim()) errs[`emp_${i}_to`] = `Employment row ${i + 1}: To date is required (or check Current Job)`;
            else if (!emp.current && emp.to && !isValidDate(emp.to)) errs[`emp_${i}_to`] = `Employment row ${i + 1}: To date must be DD-MM-YYYY`;
            else if (!emp.current && emp.from && emp.to && isValidDate(emp.from) && isValidDate(emp.to) && !isToAfterFrom(emp.from, emp.to))
              errs[`emp_${i}_to`] = `Employment row ${i + 1}: To date must be after From date`;
          });
        }
      }
    }

    if (currentSection === 3) {
      if (!formData.referenceSource?.trim()) {
        errs.referenceSource = "Please select how you were referred";
      } else {
        const ref = formData.referencePerson || {};
        if (formData.referenceSource === "Indeed") {
          if (!ref.jobId?.trim()) errs.jobId = "Job ID is required";
          if (!ref.jobPostingDate?.trim()) errs.jobPostingDate = "Job Posting Date is required";
          else if (!isValidDate(ref.jobPostingDate)) errs.jobPostingDate = "Job Posting Date must be in DD-MM-YYYY format";
        } else if (formData.referenceSource === "Hiring Agency") {
          if (!ref.agencyName?.trim()) errs.agencyName = "Hiring Agency Name is required";
          if (!ref.contactPerson?.trim()) errs.contactPerson = "Contact Person Name is required";
        } else if (formData.referenceSource === "Person Referral") {
          if (!ref.name?.trim()) errs.name = "Name is required";
          if (!ref.department?.trim()) errs.department = "Department is required";
          if (!ref.designation?.trim()) errs.designation = "Designation is required";
          if (!ref.contact?.trim()) errs.contact = "Contact Number is required";
          else if (ref.contact.replace(/\D/g, "").length !== 10) errs.contact = "Contact Number must be exactly 10 digits";
          if (!ref.email?.trim()) errs.email = "Email ID is required";
          else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ref.email)) errs.email = "Email ID is invalid";
        }
      }
    }

    if (currentSection === 4) {
      const famList = formData.family || [];
      const isValidAadhaar = (val) => val && val.toString().replace(/\D/g, "").length === 12;
      const isValidPAN = (val) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test((val || "").toUpperCase());
      
      if (famList.length === 0) {
        errs.family = "Please fill in at least one family member";
      } else {
        famList.forEach((fam, i) => {
          if (!fam.relation?.trim()) errs[`family_${i}_relation`] = "Relation is required";
          if (!fam.name?.trim()) errs[`family_${i}_name`] = "Name is required";
          if (!fam.occupation?.trim()) errs[`family_${i}_occupation`] = "Occupation is required";
          if (!fam.dob?.trim()) errs[`family_${i}_dob`] = "Date of Birth is required";
          else if (!isValidDate(fam.dob)) errs[`family_${i}_dob`] = "Date of Birth must be in DD-MM-YYYY format";
          
          if (!fam.adhaarcard_no?.trim()) errs[`family_${i}_aadhaar`] = "Aadhaar Number is required";
          else if (!isValidAadhaar(fam.adhaarcard_no)) errs[`family_${i}_aadhaar`] = "Aadhaar Number must be exactly 12 digits";
          
          if (!fam.pancard_no?.trim()) errs[`family_${i}_pan`] = "PAN Card Number is required";
          else if (!isValidPAN(fam.pancard_no)) errs[`family_${i}_pan`] = "PAN Card Number must be in valid format (e.g. ABCDE1234F)";
        });
      }
    }

    if (currentSection === 5) {
      if (!formData.medical?.bloodGroup?.trim()) errs.bloodGroup = "Blood Group is required";
    }

    if (currentSection === 6) {
      const decl = formData.declaration || {};
      if (!decl.agreed) {
        errs.declaration = "Please check the declaration box to agree before final submission";
      }
      if (!decl.signature?.trim()) {
        errs.signature = "Digital Signature is required";
      }
      if (!decl.place?.trim()) {
        errs.place = "Place is required";
      }
      
      const aadhaarFileExists = decl.aadhaar || formData.aadhar_doc_path;
      const panFileExists = decl.pan || formData.pan_doc_path;
      const sslcFileExists = decl.sslc || formData.sslc_doc_path;

      if (!aadhaarFileExists) {
        errs.declAadhaar = "Aadhaar Card is required";
      }
      if (!panFileExists) {
        errs.declPan = "PAN Card is required";
      }
      if (!sslcFileExists) {
        errs.declSslc = "Marks Sheets document is required";
      }
    }

    setValidationErrors(errs);
    return errs;
  };

  const validateHRProfileEmail = async () => {
    if (!isHRMode || isEditMode || candidateUserId || currentSection !== 0 || !formData.email?.trim()) return true;
    if (emailError) {
      addToast({
        title: "Registration Failed",
        message: "Email already registered",
        type: "warning",
      });
      return false;
    }
    try {
      const response = await checkEmailAvailability(formData.email.trim());
      if (!response.data.available) {
        setEmailError("Email already registered");
        setValidationErrors((prev) => ({ ...prev, email: "Email already registered" }));
        addToast({
          title: "Registration Failed",
          message: "Email already registered",
          type: "warning",
        });
        return false;
      }
      setEmailError("");
      return true;
    } catch (err) {
      addToast({
        title: "Email Check Failed",
        message: formatApiError(err, "Unable to verify email. Please try again."),
        type: "warning",
      });
      return false;
    }
  };

  const handleSaveStep = async () => {
    if (isSaving) return;

    setIsSaving(true);
    setAutoSaveStatus("Saving...");
    try {
      let targetUserId = user?.id;

      if (isHRMode) {
        targetUserId = await ensureCandidateUserForHR();
      }

      if (targetUserId) {
        const payload = mapFrontendToBackend(formData);
        await updateCandidateProfile(targetUserId, payload);
      }

      setAutoSaveStatus("Saved");
      addToast({
        title: "Progress Saved",
        message: `Your ${SECTIONS[currentSection]} have been successfully updated.`,
        type: "success"
      });
      setTimeout(() => setAutoSaveStatus("Ready"), 2000);
      setIsDirtyLocal(false);
      setIsDirty(false);
      if (!isHRMode && user?.id) {
        localStorage.removeItem(`candidate_draft_${user.id}`);
      }
    } catch (err) {
      const detailMsg = formatApiError(err, "Could not save your changes. Please check details.");
      console.error("Save step failed:", err.response?.data || err);
      setAutoSaveStatus("Error");
      addToast({
        title: "Save Failed",
        message: detailMsg.substring(0, 180),
        type: "warning"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateProfile = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      let targetUserId = user?.id;

      if (isHRMode) {
        targetUserId = await ensureCandidateUserForHR();
      }

      if (targetUserId) {
        const payload = { ...mapFrontendToBackend(formData), is_profile_created: true };
        await updateCandidateProfile(targetUserId, payload);
        setIsCreated(true);
        if (!isHRMode && user?.id) {
          localStorage.removeItem(`candidate_draft_${user.id}`);
        }

        addToast({
          title: "Candidate Profile Finalized!",
          message: isHRMode
            ? "Candidate profile created successfully! Redirecting to All Profiles..."
            : "Candidate profile registered successfully. Redirecting to Candidate Dashboard...",
          type: "success"
        });
        setTimeout(() => {
          if (isHRMode) {
            navigate("/hr/all-profiles");
          } else {
            navigate("/candidate-dashboard");
          }
        }, 1500);
      }
    } catch (apiErr) {
      const detailMsg = formatApiError(apiErr, "Failed to finalize candidate profile. Please try again.");
      console.error("Failed to sync profile to backend:", apiErr.response?.data || apiErr);
      addToast({
        title: "Submission Error",
        message: detailMsg.substring(0, 180),
        type: "warning"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInternalSave = async () => {
    if (isSaving) return;
    const errs = validateCurrentSection();
    if (Object.keys(errs).length > 0) {
      addToast({
        title: "Validation Error",
        message: "Please fill all mandatory fields correctly before saving.",
        type: "warning"
      });
      return;
    }
    await handleSaveStep();
    await onSave(formData);
    originalDataRef.current = formData;
    setIsDirtyLocal(false);
    setIsDirty(false);
  };

  const handleInternalCancel = () => {
    if (isDirtyLocal && !window.confirm("Discard unsaved changes?")) return;
    setFormData(originalDataRef.current);
    setIsDirtyLocal(false);
    setIsDirty(false);
    if (user?.id) {
      localStorage.removeItem(`candidate_draft_${user.id}`);
    }
    onCancel();
  };

  const renderSection = () => {
    const props = {
      formData,
      setFormData: updateFormData,
      readOnly,
      setIsDirty,
      validationErrors,
    };

    switch (currentSection) {
      case 0: return <PersonalDetails {...props} isHRMode={isHRMode} candidateUserId={candidateUserId} ensureCandidateUser={isHRMode ? ensureCandidateUserForHR : null} />;

      case 1: return <EducationDetails {...props} />;
      case 2: return <EmploymentDetails {...props} />;
      case 3: return <ReferenceDetails {...props} />;
      case 4: return <FamilyDetails {...props} />;
      case 5: return <MedicalDetails {...props} />;
      case 6: return <Declaration {...props} isHRMode={isHRMode} candidateUserId={candidateUserId} />;
      default: return null;
    }
  };

  return (
    <div className="h-full bg-gray-50 flex flex-col overflow-hidden">
      <Toast toasts={toasts} removeToast={removeToast} />

      {showHeader && (
        <div className="bg-white shadow-sm px-4 md:px-10 py-3 shrink-0">
          <img src={AE_Logo} alt="Logo" className="h-8 md:h-10" />
        </div>
      )}

      {isHRMode && (
        <div className="bg-gradient-to-r from-[#0057B8] to-indigo-800 text-white px-6 py-3.5 shadow-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl">
              <UserPlus size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">HR Candidate Registration</h2>
              <p className="text-xs text-blue-100">
                Direct candidate profile creation (Candidate Register & Login skipped)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/hr/dashboard")}
            className="px-3.5 py-1.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs font-semibold rounded-xl backdrop-blur-md border border-white/20 transition flex items-center gap-1.5"
          >
            <ArrowLeft size={14} />
            Back to HR Dashboard
          </button>
        </div>
      )}

      <div className="sticky top-0 bg-white z-10 pb-4 shrink-0">
        <ProfileStepper
          sections={SECTIONS}
          currentSection={currentSection}
          setCurrentSection={(idx) => {
            if (isDuplicateEmail && idx > 0) {
              addToast({
                title: "Email already registered",
                message: "Cannot access other sections while duplicate candidate email is entered.",
                type: "warning",
              });
              return;
            }
            setCurrentSection(idx);
          }}
          autoSave={autoSaveStatus}
          stepIcons={STEP_ICONS}
          readOnly={!isEditFlow}
          isDirty={isDirtyLocal}
          isStepDisabled={(idx) => isDuplicateEmail && idx > 0}
          onStepDisabledClick={() => {
            addToast({
              title: "Email already registered",
              message: "Cannot access Education, Employment, or other sections because this email is already registered.",
              type: "warning",
            });
          }}
        />
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          <span className="ml-3 text-gray-600">Loading Profile...</span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 md:p-10" data-profile-scroll="true">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-xl shadow-sm p-6 md:p-8 max-w-5xl mx-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">
                  {SECTIONS[currentSection]}
                </h2>

                <div className="flex gap-2">
                  {readOnly && (
                    <button
                      onClick={onEdit}
                      className="px-5 py-1.5 bg-[#0057B8] text-white rounded-full text-sm"
                    >
                      Edit
                    </button>
                  )}

                  {isEditFlow && !readOnly && (
                    <>
                      <button
                        onClick={handleInternalCancel}
                        disabled={isSaving}
                        className="px-4 py-1.5 text-white bg-[#0057B8] border rounded-full text-sm disabled:opacity-50"
                      >
                        Cancel
                      </button>

                      <button
                        onClick={handleInternalSave}
                        disabled={isSaving}
                        className="px-5 py-1.5 bg-[#0057B8] text-white rounded-full text-sm disabled:opacity-50"
                      >
                        {isSaving ? "Saving..." : "Save"}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {isDuplicateEmail && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-3">
                  <div className="p-1.5 bg-red-100 rounded-lg text-red-600 shrink-0">
                    <AlertCircle size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-red-800">Email already registered</p>
                    <p className="text-red-600 text-[11px] mt-0.5">
                      This candidate email is already registered in the system. The remaining 6 sections (Education, Employment, References, Family, Medical, Declaration) are disabled until a unique email is provided.
                    </p>
                  </div>
                </div>
              )}

              {renderSection()}
            </motion.div>
          </AnimatePresence>

          {!isEditFlow && !readOnly && (
            <div className="mt-8 flex items-center justify-between max-w-5xl mx-auto pb-12">
              <button
                onClick={() => currentSection > 0 && setCurrentSection(s => s - 1)}
                disabled={currentSection === 0 || isSaving}
                className={`px-6 py-2 rounded-full border ${currentSection === 0 || isSaving ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                Back
              </button>

              {currentSection === SECTIONS.length - 1 ? (
                <>
                  {isCreated || isEditMode ? (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => (isHRMode ? navigate("/hr/all-profiles") : navigate("/candidate-dashboard"))}
                        className="px-5 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-full transition cursor-pointer"
                      >
                        {isHRMode ? "Back to All Profiles" : "Go to Dashboard"}
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          const errs = validateCurrentSection();
                          if (Object.keys(errs).length > 0) {
                            addToast({
                              title: "Please fix the following issues",
                              message: Object.values(errs).join(" • "),
                              type: "warning",
                            });
                            return;
                          }
                          await handleSaveStep();
                        }}
                        disabled={isSaving}
                        className={`px-6 py-2 text-white font-semibold text-sm rounded-full shadow-md transition flex items-center gap-2 cursor-pointer ${
                          isSaving ? "bg-gray-400 cursor-not-allowed" : "bg-[#0057B8] hover:bg-blue-700"
                        }`}
                      >
                        <Save size={15} />
                        {isSaving ? "Saving Changes..." : "Save Changes"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={async () => {
                        // Validate personal details (section 0) before final submission
                        const personalErrors = [];
                        if (!formData.name?.trim()) personalErrors.push("Name is required");
                        if (!formData.designation?.trim()) personalErrors.push("Designation is required");
                        if (!formData.candidateType?.trim()) personalErrors.push("Please select Fresher or Experienced candidate type");
                        if (!formData.correspondenceAddress?.trim()) personalErrors.push("Correspondence Address is required");
                        if (!formData.permanentAddress?.trim()) personalErrors.push("Permanent Address is required");
                        if (!formData.email?.trim()) personalErrors.push("Email ID is required");
                        if (!formData.dob?.trim()) personalErrors.push("Date of Birth is required");
                        if (!formData.mobilePrimary?.trim()) personalErrors.push("Mobile (Primary) is required");
                        else if (formData.mobilePrimary.replace(/\D/g, "").length !== 10) personalErrors.push("Mobile (Primary) must be 10 digits");
                        if (formData.mobileAlternate && formData.mobileAlternate.replace(/\D/g, "").length !== 10) {
                          personalErrors.push("Mobile (Alternate) must be 10 digits");
                        }
                        if (!formData.aadhar?.trim()) personalErrors.push("Aadhar Card No is required");
                        else if (formData.aadhar.replace(/\D/g, "").length !== 12) personalErrors.push("Aadhar Card No must be 12 digits");
                        
                        if (!formData.pan?.trim()) personalErrors.push("PAN Card No is required");
                        else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan.replace(/[^A-Za-z0-9]/g, "").toUpperCase())) personalErrors.push("PAN Card No must be in format ABCDE1234F (5 letters, 4 digits, 1 letter)");
                        
                        if (!formData.bankAccount?.trim()) personalErrors.push("Bank Account No is required");
                        else if (formData.bankAccount.replace(/\D/g, "").length !== 14) personalErrors.push("Bank Account No must be exactly 14 digits");
                        
                        if (!formData.bankName?.trim()) personalErrors.push("Bank Name is required");
                        
                        if (!formData.ifsc?.trim()) personalErrors.push("IFSC Code is required");
                        else if (!/^[A-Z]{4}[0-9]{6}$/.test(formData.ifsc.replace(/[^A-Za-z0-9]/g, "").toUpperCase())) personalErrors.push("IFSC Code must be 4 letters followed by 6 digits (e.g. SBIN123456)");
                        
                        if (formData.candidateType === "experienced") {
                          if (!formData.uan?.trim()) personalErrors.push("UAN No is required for experienced candidates");
                          else if (formData.uan.replace(/\D/g, "").length !== 12) personalErrors.push("UAN No must be exactly 12 digits");
                          
                          if (!formData.esic?.trim()) personalErrors.push("ESIC No is required for experienced candidates");
                          else if (formData.esic.replace(/\D/g, "").length !== 10) personalErrors.push("ESIC No must be exactly 10 digits");
                        } else if (formData.candidateType === "fresher") {
                          if (formData.uan?.trim() && formData.uan.replace(/\D/g, "").length !== 12)
                            personalErrors.push("UAN No must be exactly 12 digits");
                          if (formData.esic?.trim() && formData.esic.replace(/\D/g, "").length !== 10)
                            personalErrors.push("ESIC No must be exactly 10 digits");
                        }
                        
                        if (!formData.photo && !formData.photo_path) personalErrors.push("Photo is required");
                        if (!formData.resume && !formData.resume_path) personalErrors.push("Resume is required");

                        const emergencyList = formData.emergencyContacts || [];
                        if (emergencyList.length === 0 || !emergencyList[0]?.name?.trim() || !emergencyList[0]?.contact?.trim()) {
                          personalErrors.push("At least one Emergency Contact with Name and Contact number is required");
                        } else {
                          emergencyList.forEach((c, idx) => {
                            if (!c.name?.trim() || !c.relationship?.trim() || !c.contact?.trim()) {
                              personalErrors.push(`Emergency Contact ${idx + 1}: Name, Relationship, and Contact No are all required`);
                            } else if (c.contact.replace(/\D/g, "").length !== 10) {
                              personalErrors.push(`Emergency Contact ${idx + 1}: Contact No must be exactly 10 digits`);
                            }
                          });
                        }

                        // Validate References details
                        if (!formData.referenceSource?.trim()) {
                          personalErrors.push("Referred Through selection is required");
                        } else {
                          const ref = formData.referencePerson || {};
                          if (formData.referenceSource === "Indeed") {
                            if (!ref.jobId?.trim()) personalErrors.push("Job ID is required in References");
                            if (!ref.jobPostingDate?.trim()) personalErrors.push("Job Posting Date is required in References");
                            else if (!isValidDate(ref.jobPostingDate)) personalErrors.push("Job Posting Date must be in DD-MM-YYYY format in References");
                          } else if (formData.referenceSource === "Hiring Agency") {
                            if (!ref.agencyName?.trim()) personalErrors.push("Hiring Agency Name is required in References");
                            if (!ref.contactPerson?.trim()) personalErrors.push("Contact Person Name is required in References");
                          } else if (formData.referenceSource === "Person Referral") {
                            if (!ref.name?.trim()) personalErrors.push("Name is required in References");
                            if (!ref.department?.trim()) personalErrors.push("Department is required in References");
                            if (!ref.designation?.trim()) personalErrors.push("Designation is required in References");
                            if (!ref.contact?.trim()) personalErrors.push("Contact Number is required in References");
                            else if (ref.contact.replace(/\D/g, "").length !== 10) personalErrors.push("Contact Number must be 10 digits in References");
                            if (!ref.email?.trim()) personalErrors.push("Email ID is required in References");
                            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ref.email)) personalErrors.push("Email ID is invalid in References");
                          }
                        }

                        // Validate Family details
                        const famList = formData.family || [];
                        const isValidAadhaarVal = (val) => val && val.toString().replace(/\D/g, "").length === 12;
                        const isValidPanVal = (val) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test((val || "").toUpperCase());
                        if (famList.length === 0) {
                          personalErrors.push("Please fill in at least one family member");
                        } else {
                          famList.forEach((fam, i) => {
                            if (!fam.relation?.trim()) personalErrors.push(`Family row ${i + 1}: Relation is required`);
                            if (!fam.name?.trim()) personalErrors.push(`Family row ${i + 1}: Name is required`);
                            if (!fam.occupation?.trim()) personalErrors.push(`Family row ${i + 1}: Occupation is required`);
                            if (!fam.dob?.trim()) personalErrors.push(`Family row ${i + 1}: Date of Birth is required`);
                            else if (!isValidDate(fam.dob)) personalErrors.push(`Family row ${i + 1}: Date of Birth must be in DD-MM-YYYY format`);
                            if (!fam.adhaarcard_no?.trim()) personalErrors.push(`Family row ${i + 1}: Aadhaar Number is required`);
                            else if (!isValidAadhaarVal(fam.adhaarcard_no)) personalErrors.push(`Family row ${i + 1}: Aadhaar Number must be exactly 12 digits`);
                            if (!fam.pancard_no?.trim()) personalErrors.push(`Family row ${i + 1}: PAN Card Number is required`);
                            else if (!isValidPanVal(fam.pancard_no)) personalErrors.push(`Family row ${i + 1}: PAN Card Number must be in valid format (e.g. ABCDE1234F)`);
                          });
                        }

                        // Validate Declaration details
                        const decl = formData.declaration || {};
                        if (!decl.agreed) personalErrors.push("Please check the declaration box to agree to the declaration");
                        if (!decl.signature?.trim()) personalErrors.push("Digital Signature is required");
                        if (!decl.place?.trim()) personalErrors.push("Place is required");
                        const aadhaarFileExists = decl.aadhaar || formData.aadhar_doc_path;
                        const panFileExists = decl.pan || formData.pan_doc_path;
                        const sslcFileExists = decl.sslc || formData.sslc_doc_path;
                        if (!aadhaarFileExists) personalErrors.push("Aadhaar Card document upload is required");
                        if (!panFileExists) personalErrors.push("PAN Card document upload is required");
                        if (!sslcFileExists) personalErrors.push("Marks Sheets document upload is required");

                        if (personalErrors.length > 0) {
                          addToast({
                            title: "Personal details missing",
                            message: personalErrors.join(" • ") + " — Please complete Personal Details section.",
                            type: "warning"
                          });
                          return;
                        }

                        if (!formData.declaration?.agreed) {
                          addToast({
                            title: "Declaration Required",
                            message: "Please tick the checkbox to agree to the declaration before creating your profile.",
                            type: "warning"
                          });
                          return;
                        }

                        await handleCreateProfile();
                      }}
                      disabled={isSubmitting}
                      className={`px-6 py-2 text-white rounded-full ${isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-red-600"}`}
                    >
                      {isSubmitting ? "Creating..." : "Create Profile"}
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={async () => {
                    if (isDuplicateEmail) {
                      addToast({
                        title: "Email already registered",
                        message: "Email already registered. Please provide a new candidate email to proceed.",
                        type: "warning"
                      });
                      return;
                    }
                    // Validate current section before proceeding
                    const errs = validateCurrentSection();
                    if (Object.keys(errs).length > 0) {
                      addToast({
                        title: "Please fix the following issues",
                        message: Object.values(errs).join(" • "),
                        type: "warning"
                      });
                      return;
                    }
                    if (!(await validateHRProfileEmail())) return;
                    await handleSaveStep();
                    setCurrentSection(s => s + 1);
                  }}
                  disabled={isSaving || isCheckingEmail || isDuplicateEmail}
                  className={`px-6 py-2 text-white rounded-full transition cursor-pointer ${
                    isSaving || isCheckingEmail || isDuplicateEmail
                      ? "bg-gray-400 cursor-not-allowed opacity-60"
                      : isHRMode
                      ? "bg-[#0057B8] hover:bg-blue-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {isSaving ? "Saving..." : isCheckingEmail ? "Checking Email..." : "Save and Continue"}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}