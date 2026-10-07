import React, { useState } from "react";
import { Input, Select } from "../ui/FormElements";
import { formatDDMMYYYY, isValidDate, isToAfterFrom, parseDate, } from "../utils/dateHelpers";
import { Trash2, Plus } from "lucide-react";

// ✅ Shared arrow-key navigation handler for form fields
const handleFormKeyDown = (e) => {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  const target = e.target;
  if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA" && target.tagName !== "SELECT") return;

  if (target.tagName === "INPUT" && (target.type === "text" || target.type === "tel" || target.type === "number")) {
    const { selectionStart, selectionEnd, value } = target;
    if (e.key === "ArrowLeft" && selectionStart !== 0) return;
    if (e.key === "ArrowRight" && selectionEnd !== value.length) return;
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

export default function EducationDetails({
  formData,
  setFormData,
  readOnly,
  setIsDirty,
  validationErrors = {},
}) {
  const educationList = formData?.education || [];
  const [rowErrors, setRowErrors] = useState({}); // maps index -> { fieldName: boolean }

  const hasOverlap = (index) => {
    const edu = educationList[index];
    if (!edu) return false;

    const start = new Date(parseDate(edu.from));
    const end = new Date(parseDate(edu.to));

    if (!start || !end || isNaN(start) || isNaN(end)) return false;

    return educationList.some((other, i) => {
      if (i === index) return false;

      const otherStart = parseDate(other.from);
      const otherEnd = parseDate(other.to);

      if (!otherStart || !otherEnd) return false;

      return start <= otherEnd && end >= otherStart;
    });
  };

  const updateEducation = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...(prev.education || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, education: updated };
    });

    // Clear error for this field if it is now filled
    if (value && value.trim() && rowErrors[index]?.[field]) {
      setRowErrors((prev) => {
        const rowErr = { ...prev[index] };
        delete rowErr[field];
        return { ...prev, [index]: rowErr };
      });
    }

    setIsDirty(true);
  };

  // Date Change Handler with Masking for Education Rows
  const handleDateChange = (index, field, val) => {
    const prevVal = educationList[index]?.[field] || "";
    let finalVal = val;
    if (val.length >= prevVal.length) {
      finalVal = formatDDMMYYYY(val);
    } else {
      if (prevVal.endsWith("-") && val.length === prevVal.length - 1) {
        finalVal = val.slice(0, -1);
      }
    }
    updateEducation(index, field, finalVal);
  };

  const addEducation = () => {
    // Validate all existing rows
    const errors = {};
    let hasError = false;

    educationList.forEach((edu, idx) => {
      const fields = ["degree", "institute", "from", "to", "specialization"];
      fields.forEach((f) => {
        if (!edu[f] || !edu[f].toString().trim()) {
          if (!errors[idx]) errors[idx] = {};
          errors[idx][f] = true;
          hasError = true;
        }
      });

      // Date validations
      if (edu.from && !isValidDate(edu.from)) {
        if (!errors[idx]) errors[idx] = {};
        errors[idx]["from_invalid"] = true;
        hasError = true;
      }
      if (edu.to && !isValidDate(edu.to)) {
        if (!errors[idx]) errors[idx] = {};
        errors[idx]["to_invalid"] = true;
        hasError = true;
      }
      // To must be after From
      if (edu.from && edu.to && isValidDate(edu.from) && isValidDate(edu.to) && !isToAfterFrom(edu.from, edu.to)) {
        if (!errors[idx]) errors[idx] = {};
        errors[idx]["to_before_from"] = true;
        hasError = true;
      }
    });

    if (hasError) {
      setRowErrors(errors);
      alert("Please fill in all required education fields with valid formats before adding a new row.");
      return;
    }

    setRowErrors({});
    setFormData((prev) => ({
      ...prev,
      education: [
        ...(prev.education || []),
        { degree: "", institute: "", from: "", to: "", specialization: "", backlog: "No" },
      ],
    }));
  };

  const removeEducation = (index) => {
    setFormData((prev) => ({
      ...prev,
      education: (prev.education || []).filter((_, i) => i !== index),
    }));
    // Clean up errors for deleted row
    setRowErrors((prev) => {
      const copy = { ...prev };
      delete copy[index];
      return copy;
    });
    setIsDirty(true);
  };

  return (
    <div className="space-y-6" onKeyDown={handleFormKeyDown}>
      {educationList.map((edu, index) => {
        const localErrs = rowErrors[index] || {};
        const parentErrs = {
          degree: !!validationErrors[`edu_${index}_degree`],
          institute: !!validationErrors[`edu_${index}_institute`],
          from: !!validationErrors[`edu_${index}_from`],
          to: !!validationErrors[`edu_${index}_to`],
          specialization: !!validationErrors[`edu_${index}_specialization`],
        };
        const errors = { ...localErrs, ...parentErrs };
        return (
          <div key={index} className="p-5 relative bg-white border border-gray-150 rounded-xl shadow-sm">
            {/* Remove button */}
            {!readOnly && educationList.length > 1 && (
              <button
                type="button"
                onClick={() => removeEducation(index)}
                className="absolute top-3 right-3 text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition"
                title="Remove Education"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Degree"
                required
                value={edu.degree || ""}
                disabled={readOnly}
                onChange={(v) => updateEducation(index, "degree", v)}
                error={errors.degree ? "Degree is required" : ""}
              />

              <Input
                label="University / Institute"
                required
                value={edu.institute || ""}
                disabled={readOnly}
                onChange={(v) => updateEducation(index, "institute", v)}
                error={errors.institute ? "Institute is required" : ""}
              />

              <Input
                label="From (DD-MM-YYYY)"
                placeholder="DD-MM-YYYY"
                required
                value={edu.from || ""}
                disabled={readOnly}
                onChange={(v) => handleDateChange(index, "from", v)}
                error={
                  errors.from
                    ? "From Date is required"
                    : errors.from_invalid
                      ? "Invalid date format"
                      : edu.from && !isValidDate(edu.from)
                        ? "Invalid date format"
                        : ""
                }
              />

              <Input
                label="To (DD-MM-YYYY)"
                placeholder="DD-MM-YYYY"
                required
                value={edu.to || ""}
                disabled={readOnly}
                onChange={(v) => handleDateChange(index, "to", v)}
                error={
                  errors.to
                    ? "To Date is required"
                    : errors.to_invalid
                      ? "Invalid date format (use DD-MM-YYYY)"
                      : edu.to && !isValidDate(edu.to)
                        ? "Invalid date format (use DD-MM-YYYY)"
                        : errors.to_before_from
                          ? "To date must be after From date"
                          : edu.from &&
                            edu.to &&
                            isValidDate(edu.from) &&
                            isValidDate(edu.to) &&
                            !isToAfterFrom(edu.from, edu.to)
                            ? "To date must be after From date"
                            : hasOverlap(index)
                              ? "Overlap detected with another education record"
                              : ""
                }
              />

              <Input
                label="Specialization"
                required
                value={edu.specialization || ""}
                disabled={readOnly}
                onChange={(v) => updateEducation(index, "specialization", v)}
                error={errors.specialization ? "Specialization is required" : ""}
              />

              <Select
                label="Any Backlogs?"
                value={edu.backlog || "No"}
                disabled={readOnly}
                onChange={(v) => updateEducation(index, "backlog", v)}
                options={[
                  { label: "No", value: "No" },
                  { label: "Yes", value: "Yes" },
                ]}
              />
            </div>
          </div>
        );
      })}

      {!readOnly && (
        <button
          type="button"
          onClick={addEducation}
          className="flex items-center gap-1.5 text-white text-sm font-bold bg-[#0057B8] hover:bg-blue-700 px-5 py-2.5 rounded-xl transition shadow-md"
        >
          <Plus className="w-4 h-4" /> Add Education
        </button>
      )}
    </div>
  );
}