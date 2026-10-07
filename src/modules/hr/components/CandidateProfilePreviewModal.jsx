import React, { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Mail, Phone, Calendar, Save, CheckCircle2 } from "lucide-react";
import ProfileStepper from "../../candidate/components/ui/ProfileStepper";
import PersonalDetails from "../../candidate/components/profile/PersonalDetails";
import EducationDetails from "../../candidate/components/profile/EducationDetails";
import EmploymentDetails from "../../candidate/components/profile/EmploymentDetails";
import ReferenceDetails from "../../candidate/components/profile/ReferencesDetails";
import FamilyDetails from "../../candidate/components/profile/FamilyDetails";
import MedicalDetails from "../../candidate/components/profile/MedicalDetails";
import Declaration from "../../candidate/components/profile/DeclarationDetails";
import { getCandidateById, updateCandidateProfile, FILE_BASE_URL } from "../../../api";
import { isValidDate, isToAfterFrom } from "../../candidate/components/utils/dateHelpers";

const getFileUrl = (value) => {
  if (!value) return "";
  if (typeof value === "object") {
    value = value.data || value.url || value.path || "";
  }
  if (!value || typeof value !== "string") return "";
  if (value.startsWith("http") || value.startsWith("data:") || value.startsWith("blob:")) {
    return value;
  }
  return `${FILE_BASE_URL}/${value.replace(/^\/?uploads\//, "").replace(/^\/+/, "")}`;
};

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

const mapBackendToFrontend = (data) => {
  if (!data) return {};
  let formattedDob = "";
  if (data.date_of_birth && data.date_of_birth.includes("-")) {
    const parts = data.date_of_birth.split("-");
    if (parts[0].length === 4) {
      formattedDob = `${parts[2]}-${parts[1]}-${parts[0]}`;
    } else {
      formattedDob = data.date_of_birth;
    }
  }

  const photoPath = data.photo_path || null;
  const resumePath = data.resume_path || null;

  return {
    name: data.name || "",
    designation: data.designation || "",
    mobilePrimary: data.phone_number || data.mobilePrimary || "",
    mobileAlternate: data.mobile2 || data.mobileAlternate || "",
    email: data.email || "",
    dob: formattedDob,
    correspondenceAddress: data.correspondence_address || data.correspondenceAddress || "",
    permanentAddress: data.permanent_address || data.permanentAddress || "",
    maritalStatus: data.marital_status || data.maritalStatus || "",
    gender: data.gender || "",
    aadhar: data.aadhar || "",
    pan: data.pan || "",
    passport: data.passport || "",
    bankAccount: data.bank_account || data.bankAccount || "",
    bankName: data.bank_name || data.bankName || "",
    ifsc: data.ifsc || "",
    uan: data.uan || "",
    esic: data.esic || "",
    candidateType: data.candidate_type || data.candidateType || "",
    languages: data.languages || [],
    customLanguage: data.custom_language || data.customLanguage || "",
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
      : [{ degree: "", institute: "", from: "", to: "", specialization: "" }],
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
      : [{ organization: "", from: "", to: "", designation: "", current: false }],
    emergencyContacts: data.emergency_contacts || data.emergencyContacts || [{ name: "", relationship: "", contact: "" }],
    referencePerson: data.reference_person || data.referencePerson || { name: "", designation: "", contact: "" },
    referenceSource: data.reference_source || data.referenceSource || "",
    family: data.family && data.family.length > 0 ? data.family : [{ relation: "", name: "", occupation: "", dob: "", adhaarcard_no: "", pancard_no: "" }],
    medical: data.medical && Object.keys(data.medical).length > 0 ? data.medical : { bloodGroup: "", hasDisability: "No", disabilityYears: "", hasCondition: "No", conditionYears: "" },
    declaration: data.declaration && Object.keys(data.declaration).length > 0 ? data.declaration : { date: "", place: "", agreed: false, signature: "" },
    photo_path: photoPath,
    resume_path: resumePath,
    photo: data.photo || (photoPath ? { name: "Profile Photo", data: photoPath } : null),
    resume: data.resume || (resumePath ? { name: resumePath.split("/").pop() || "Candidate Resume", data: resumePath } : null),
    aadhar_doc_path: data.aadhar_doc_path || null,
    pan_doc_path: data.pan_doc_path || null,
    sslc_doc_path: data.sslc_doc_path || null,
  };
};

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
    is_profile_created: true,
    photo_path: data.photo_path || null,
    resume_path: data.resume_path || null,
    aadhar_doc_path: data.aadhar_doc_path || null,
    pan_doc_path: data.pan_doc_path || null,
    sslc_doc_path: data.sslc_doc_path || null,
  };
};

export default function CandidateProfilePreviewModal({ candidate, initialMode = "preview", onClose, onProfileUpdated }) {
  const [mode, setMode] = useState(initialMode); // "preview" | "edit"
  const isReadOnly = mode === "preview";
  const [currentSection, setCurrentSection] = useState(0);
  const [formData, setFormData] = useState(() => mapBackendToFrontend(candidate));
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  const targetUserId = candidate?.user_id || candidate?.id;

  useEffect(() => {
    const fetchFullProfile = async () => {
      if (targetUserId) {
        setLoading(true);
        try {
          const res = await getCandidateById(targetUserId);
          if (res.data) {
            setFormData(mapBackendToFrontend(res.data));
          }
        } catch (err) {
          console.error("Failed to fetch candidate profile details:", err);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchFullProfile();
  }, [targetUserId]);

  useEffect(() => {
    setValidationErrors({});
  }, [currentSection]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return dateStr;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

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
      else if (!isValidDate(formData.dob)) errs.dob = "Date of Birth must be DD-MM-YYYY";

      if (!formData.mobilePrimary?.trim()) errs.mobilePrimary = "Mobile (Primary) is required";
      else if (formData.mobilePrimary.replace(/\D/g, "").length !== 10) errs.mobilePrimary = "Mobile (Primary) must be 10 digits";

      if (formData.mobileAlternate && formData.mobileAlternate.replace(/\D/g, "").length !== 10) {
        errs.mobileAlternate = "Mobile (Alternate) must be 10 digits";
      }

      if (!formData.aadhar?.trim()) errs.aadhar = "Aadhar Card No is required";
      else if (formData.aadhar.replace(/\D/g, "").length !== 12) errs.aadhar = "Aadhar Card No must be 12 digits";

      if (!formData.pan?.trim()) errs.pan = "PAN Card No is required";
      else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan.replace(/[^A-Za-z0-9]/g, "").toUpperCase())) errs.pan = "PAN format must be ABCDE1234F";

      if (!formData.bankAccount?.trim()) errs.bankAccount = "Bank Account No is required";
      else if (formData.bankAccount.replace(/\D/g, "").length !== 14) errs.bankAccount = "Bank Account No must be 14 digits";

      if (!formData.bankName?.trim()) errs.bankName = "Bank Name is required";
      if (!formData.ifsc?.trim()) errs.ifsc = "IFSC Code is required";

      if (formData.candidateType === "experienced") {
        if (!formData.uan?.trim()) errs.uan = "UAN No is required";
        else if (formData.uan.replace(/\D/g, "").length !== 12) errs.uan = "UAN must be 12 digits";
        if (!formData.esic?.trim()) errs.esic = "ESIC No is required";
        else if (formData.esic.replace(/\D/g, "").length !== 10) errs.esic = "ESIC must be 10 digits";
      }
    }

    if (currentSection === 1) {
      const eduList = formData.education || [];
      if (eduList.length === 0 || !eduList[0]?.degree?.trim()) {
        errs.education = "At least one education entry is required";
      }
    }

    if (currentSection === 2) {
      if (formData.candidateType !== "fresher") {
        const empList = formData.employment || [];
        if (empList.length === 0 || !empList[0]?.organization?.trim()) {
          errs.employment = "At least one employment entry is required for experienced candidates";
        }
      }
    }

    if (currentSection === 3) {
      if (!formData.referenceSource?.trim()) {
        errs.referenceSource = "Please select how candidate was referred";
      }
    }

    if (currentSection === 4) {
      const famList = formData.family || [];
      if (famList.length === 0) {
        errs.family = "Please fill in at least one family member";
      }
    }

    if (currentSection === 5) {
      if (!formData.medical?.bloodGroup?.trim()) errs.bloodGroup = "Blood Group is required";
    }

    if (currentSection === 6) {
      const decl = formData.declaration || {};
      if (!decl.agreed) errs.declaration = "Please check the agreement box";
      if (!decl.signature?.trim()) errs.signature = "Digital Signature is required";
      if (!decl.place?.trim()) errs.place = "Place is required";
    }

    setValidationErrors(errs);
    return errs;
  };

  const handleSaveCurrentStep = async (advanceNext = true) => {
    if (isSaving || !targetUserId) return;

    const errs = validateCurrentSection();
    if (Object.keys(errs).length > 0) {
      alert("Please correct required fields: " + Object.values(errs).join(" • "));
      return;
    }

    setIsSaving(true);
    setSaveSuccessMsg("");
    try {
      const payload = mapFrontendToBackend(formData);
      await updateCandidateProfile(targetUserId, payload);
      setSaveSuccessMsg("Changes saved successfully!");
      if (onProfileUpdated) onProfileUpdated();

      setTimeout(() => setSaveSuccessMsg(""), 3000);

      if (advanceNext && currentSection < SECTIONS.length - 1) {
        setCurrentSection((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Failed to update candidate profile:", err);
      alert("Failed to save changes. Please check all fields.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderSection = () => {
    const props = {
      formData,
      setFormData,
      readOnly: isReadOnly,
      setIsDirty: () => {},
      validationErrors,
      isHRMode: true,
      candidateUserId: targetUserId,
    };

    switch (currentSection) {
      case 0:
        return <PersonalDetails {...props} />;
      case 1:
        return <EducationDetails {...props} />;
      case 2:
        return <EmploymentDetails {...props} />;
      case 3:
        return <ReferenceDetails {...props} />;
      case 4:
        return <FamilyDetails {...props} />;
      case 5:
        return <MedicalDetails {...props} />;
      case 6:
        return <Declaration {...props} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 w-full max-w-5xl rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Modal Header */}
        <div className="p-5 md:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            {formData.photo_path ? (
              <img
                src={getFileUrl(formData.photo_path)}
                alt={formData.name || "Candidate"}
                className="w-12 h-12 rounded-2xl object-cover border border-blue-100 dark:border-blue-900 shrink-0 shadow-sm"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900 text-[#0057B8] flex items-center justify-center font-bold text-lg uppercase shrink-0">
                {(formData.name || "C").slice(0, 2)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                  {formData.name || "Candidate Profile"}
                </h2>
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase ${
                    isReadOnly
                      ? "bg-blue-50 dark:bg-blue-950/40 text-[#0057B8] dark:text-blue-400"
                      : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                  }`}
                >
                  {isReadOnly ? "Preview Mode" : "Edit Mode"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formData.email && (
                  <span className="flex items-center gap-1">
                    <Mail size={13} className="text-gray-400" /> {formData.email}
                  </span>
                )}
                {formData.mobilePrimary && (
                  <span className="flex items-center gap-1">
                    <Phone size={13} className="text-gray-400" /> {formData.mobilePrimary}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar size={13} className="text-gray-400" /> Created: {formatDate(candidate?.created_at)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center transition cursor-pointer"
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 7-Stepper Navigation */}
        <div className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/40">
          <ProfileStepper
            sections={SECTIONS}
            currentSection={currentSection}
            setCurrentSection={setCurrentSection}
            stepIcons={STEP_ICONS}
            readOnly={false}
            embedded={true}
          />
        </div>

        {/* Section Details Form Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white dark:bg-gray-900">
          {saveSuccessMsg && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 size={16} className="text-emerald-600" />
              {saveSuccessMsg}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0057B8]"></div>
            </div>
          ) : (
            renderSection()
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="p-4 px-6 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-between items-center">
          <button
            onClick={() => setCurrentSection((prev) => Math.max(0, prev - 1))}
            disabled={currentSection === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-xs hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <ChevronLeft size={16} />
            Previous Step
          </button>

          <span className="text-xs font-bold text-gray-400">
            Step {currentSection + 1} of {SECTIONS.length}
          </span>

          {/* Action Buttons based on Mode and Step */}
          {isReadOnly ? (
            <button
              onClick={() => setCurrentSection((prev) => Math.min(SECTIONS.length - 1, prev + 1))}
              disabled={currentSection === SECTIONS.length - 1}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0057B8] hover:bg-blue-700 text-white font-semibold text-xs shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              Next Step
              <ChevronRight size={16} />
            </button>
          ) : currentSection === SECTIONS.length - 1 ? (
            <button
              onClick={() => handleSaveCurrentStep(false)}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0057B8] hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              <Save size={15} />
              {isSaving ? "Saving Changes..." : "Save Changes"}
            </button>
          ) : (
            <button
              onClick={() => handleSaveCurrentStep(true)}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0057B8] hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? "Saving..." : "Save and Continue"}
              <ChevronRight size={16} />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
