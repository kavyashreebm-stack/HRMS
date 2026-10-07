import React from "react";
import { Input, Select } from "../ui/FormElements";
import { formatDDMMYYYY, isValidDate } from "../utils/dateHelpers";

// ✅ Shared arrow-key navigation handler for form fields
const handleFormKeyDown = (e) => {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  const target = e.target;
  if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA" && target.tagName !== "SELECT") return;

  if (target.tagName === "INPUT") {
    let selStart = 0;
    let selEnd = target.value ? target.value.length : 0;
    try {
      if (target.selectionStart !== null && target.selectionStart !== undefined) {
        selStart = target.selectionStart;
        selEnd = target.selectionEnd;
      }
    } catch (err) {
      selStart = 0;
      selEnd = target.value ? target.value.length : 0;
    }
    if (e.key === "ArrowLeft" && selStart !== 0) return;
    if (e.key === "ArrowRight" && selEnd !== (target.value ? target.value.length : 0)) return;
  }

  const container = e.currentTarget;
  const focusable = Array.from(
    container.querySelectorAll(
      'input:not([tabindex="-1"]):not([disabled]), select:not([tabindex="-1"]):not([disabled]), textarea:not([tabindex="-1"]):not([disabled]), [tabindex="0"]:not([disabled])'
    )
  );
  const index = focusable.indexOf(target);
  if (index === -1) return;

  if (e.key === "ArrowLeft") {
    e.preventDefault();
    (focusable[index - 1] || focusable[focusable.length - 1])?.focus();
  } else {
    e.preventDefault();
    (focusable[index + 1] || focusable[0])?.focus();
  }
};

export default function ReferenceDetails({
  formData = {},
  setFormData,
  readOnly = false,
  setIsDirty = () => { },
  validationErrors = {},
}) {
  const referencePerson = formData.referencePerson || {};

  const updateRefPerson = (field, value) => {
    let cleanVal = value;
    if (field === "contact") {
      cleanVal = value.replace(/\D/g, "").slice(0, 10);
    }
    setFormData((prev) => ({
      ...prev,
      referencePerson: {
        ...(prev.referencePerson || {}),
        [field]: cleanVal,
      },
    }));
    setIsDirty(true);
  };

  const getContactError = () => {
    if (validationErrors.contact) return validationErrors.contact;
    const val = referencePerson.contact || "";
    if (!val) return "";
    return val.replace(/\D/g, "").length !== 10 ? "Must be exactly 10 digits" : "";
  };

  const updateSource = (value) => {
    setFormData((prev) => ({
      ...prev,
      referenceSource: value,
      // Reset details when source changes
      referencePerson: {},
    }));
    setIsDirty(true);
  };

  // Date Change Mask Handler for Indeed jobPostingDate
  const handleDateChange = (field, val) => {
    const prevVal = referencePerson[field] || "";
    let finalVal = val;
    if (val.length >= prevVal.length) {
      finalVal = formatDDMMYYYY(val);
    } else {
      if (prevVal.endsWith("-") && val.length === prevVal.length - 1) {
        finalVal = val.slice(0, -1);
      }
    }
    updateRefPerson(field, finalVal);
  };

  return (
    <div className="rounded-xl shadow p-5 bg-white border border-gray-150 grid grid-cols-1 gap-5" onKeyDown={handleFormKeyDown}>
      <Select
        label="Referred Through"
        required
        value={formData.referenceSource || ""}
        disabled={readOnly}
        options={[
          { label: "Indeed", value: "Indeed" },
          { label: "Hiring Agency", value: "Hiring Agency" },
          { label: "Person Referral", value: "Person Referral" },
          { label: "Company Career Page", value: "Company Career Page" },
        ]}
        onChange={updateSource}
        error={validationErrors.referenceSource}
      />

      {/* 1. Person Referral */}
      {formData.referenceSource === "Person Referral" && (
        <div className="p-5 border border-gray-100 bg-gray-50/50 rounded-xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Input
            label="Name"
            required
            value={referencePerson.name || ""}
            disabled={readOnly}
            onChange={(v) => updateRefPerson("name", v)}
            error={validationErrors.name}
          />

          <Input
            label="Department"
            required
            value={referencePerson.department || ""}
            disabled={readOnly}
            onChange={(v) => updateRefPerson("department", v)}
            error={validationErrors.department}
          />

          <Input
            label="Designation"
            required
            value={referencePerson.designation || ""}
            disabled={readOnly}
            onChange={(v) => updateRefPerson("designation", v)}
            error={validationErrors.designation}
          />

          <Input
            label="Contact Number"
            required
            placeholder="10-digit number"
            value={referencePerson.contact || ""}
            disabled={readOnly}
            onChange={(v) => updateRefPerson("contact", v)}
            error={getContactError()}
          />

          <Input
            label="Email ID"
            required
            type="email"
            value={referencePerson.email || ""}
            disabled={readOnly}
            onChange={(v) => updateRefPerson("email", v)}
            error={validationErrors.email}
          />
        </div>
      )}

      {/* 2. Indeed */}
      {formData.referenceSource === "Indeed" && (
        <div className="p-5 border border-gray-100 bg-gray-50/50 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Job ID"
            required
            value={referencePerson.jobId || ""}
            disabled={readOnly}
            onChange={(v) => updateRefPerson("jobId", v)}
            error={validationErrors.jobId}
          />

          <Input
            label="Job Posting Date (DD-MM-YYYY)"
            placeholder="DD-MM-YYYY"
            required
            value={referencePerson.jobPostingDate || ""}
            disabled={readOnly}
            onChange={(v) => handleDateChange("jobPostingDate", v)}
            error={
              validationErrors.jobPostingDate ||
              (referencePerson.jobPostingDate && !isValidDate(referencePerson.jobPostingDate)
                ? "Must follow format DD-MM-YYYY (e.g. 24-06-2026)"
                : "")
            }
          />
        </div>
      )}

      {/* 3. Hiring Agency */}
      {formData.referenceSource === "Hiring Agency" && (
        <div className="p-5 border border-gray-100 bg-gray-50/50 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Hiring Agency Name"
            required
            value={referencePerson.agencyName || ""}
            disabled={readOnly}
            onChange={(v) => updateRefPerson("agencyName", v)}
            error={validationErrors.agencyName}
          />

          <Input
            label="Contact Person Name"
            required
            value={referencePerson.contactPerson || ""}
            disabled={readOnly}
            onChange={(v) => updateRefPerson("contactPerson", v)}
            error={validationErrors.contactPerson}
          />
        </div>
      )}
    </div>
  );
}