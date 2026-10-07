import React from 'react';
import { Input, Select } from '../ui/FormElements';

// ✅ Arrow-key navigation for form fields.
// - ArrowLeft / ArrowRight : navigate between all fields (at text cursor boundary)
// - ArrowDown  on <select> : navigate to next field when already on last option
// - ArrowUp    on <select> : navigate to prev field when already on first option
const handleFormKeyDown = (e) => {
  const target = e.target;
  const isNav = ["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp"].includes(e.key);
  if (!isNav) return;
  if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA" && target.tagName !== "SELECT") return;

  const container = e.currentTarget;
  const focusable = Array.from(
    container.querySelectorAll(
      'input:not([tabindex="-1"]):not([disabled]), select:not([tabindex="-1"]):not([disabled]), textarea:not([tabindex="-1"]):not([disabled]), [tabindex="0"]:not([disabled])'
    )
  );
  const index = focusable.indexOf(target);
  if (index === -1) return;

  if (e.key === "ArrowLeft") {
    if (target.tagName === "INPUT" && (target.type === "text" || target.type === "tel" || target.type === "number")) {
      if (target.selectionStart !== 0) return;
    }
    e.preventDefault();
    (focusable[index - 1] || focusable[focusable.length - 1])?.focus();

  } else if (e.key === "ArrowRight") {
    if (target.tagName === "INPUT" && (target.type === "text" || target.type === "tel" || target.type === "number")) {
      if (target.selectionEnd !== target.value.length) return;
    }
    e.preventDefault();
    (focusable[index + 1] || focusable[0])?.focus();

  } else if (e.key === "ArrowDown" && target.tagName === "SELECT") {
    // Only navigate away when already on the last option; otherwise let native select handle it
    if (target.selectedIndex >= target.options.length - 1) {
      e.preventDefault();
      (focusable[index + 1] || focusable[0])?.focus();
    }

  } else if (e.key === "ArrowUp" && target.tagName === "SELECT") {
    // Only navigate away when already on the first option
    if (target.selectedIndex <= 0) {
      e.preventDefault();
      (focusable[index - 1] || focusable[focusable.length - 1])?.focus();
    }
  }
};

export default function MedicalDetails({ formData = {}, setFormData, readOnly = false, setIsDirty = () => {}, validationErrors = {} }) {

  // Safe fallback for medical data
  const medical = formData.medical || {
    bloodGroup: "",
    hasDisability: "No",
    disabilityYears: "",
    hasCondition: "No",
    conditionYears: ""
  };

  const updateMedical = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      medical: {
        ...(prev.medical || {}),
        [field]: value
      }
    }));
    setIsDirty(true);
  };

  return (
    <div className="max-w-xl rounded-xl shadow-sm p-4 space-y-4" onKeyDown={handleFormKeyDown}>
      <Select 
        label="Blood Group" 
        required 
        value={medical.bloodGroup} 
        options={["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]} 
        disabled={readOnly} 
        onChange={(v) => updateMedical("bloodGroup", v)} 
        error={validationErrors.bloodGroup}
      />
      
      <Select 
        label="Known Disability" 
        required 
        value={medical.hasDisability} 
        options={["Yes", "No"]} 
        disabled={readOnly} 
        onChange={(v) => updateMedical("hasDisability", v)} 
      />
      
      {medical.hasDisability === "Yes" && (
        <Input 
          label="Years of Disability" 
          required 
          value={medical.disabilityYears} 
          disabled={readOnly} 
          onChange={(v) => updateMedical("disabilityYears", v)} 
        />
      )}

      <Select 
        label="Known Medical Conditions" 
        required 
        value={medical.hasCondition} 
        options={["Yes", "No"]} 
        disabled={readOnly} 
        onChange={(v) => updateMedical("hasCondition", v)} 
      />
      
      {medical.hasCondition === "Yes" && (
        <Input 
          label="Condition Since (Years)" 
          required 
          value={medical.conditionYears} 
          disabled={readOnly} 
          onChange={(v) => updateMedical("conditionYears", v)} 
        />
      )}
    </div>
  );
}