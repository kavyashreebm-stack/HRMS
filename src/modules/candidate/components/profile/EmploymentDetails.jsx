import React, { useState } from "react";
import { Input } from "../ui/FormElements";
import {
  isValidDate,
  isToAfterFrom,
  calculateExperience,
  parseDate,
  formatDDMMYYYY
} from "../utils/dateHelpers";
import { Trash2, Plus, Info } from "lucide-react";

// ✅ Arrow-key navigation between form fields
const handleFormKeyDown = (e) => {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  const target = e.target;
  if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA" && target.tagName !== "SELECT") return;

  // For textareas: only navigate when cursor is at very start/end of content
  if (target.tagName === "TEXTAREA") {
    const { selectionStart, selectionEnd, value } = target;
    if (e.key === "ArrowLeft" && selectionStart !== 0) return;
    if (e.key === "ArrowRight" && selectionEnd !== value.length) return;
  }

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

export default function EmploymentDetails({
  formData,
  setFormData,
  readOnly,
  setIsDirty,
  validationErrors = {},
}) {
  const employmentList = formData?.employment || [];
  const [rowErrors, setRowErrors] = useState({}); // maps index -> { fieldName: boolean }

  const hasOverlap = (index) => {
    const job = employmentList[index];
    if (!job) return false;

    const start = parseDate(job.from);
    const end = job.current ? new Date() : parseDate(job.to);
    if (!start || !end) return false;

    return employmentList.some((other, i) => {
      if (i === index) return false;

      const oStart = parseDate(other.from);
      const oEnd = other.current ? new Date() : parseDate(other.to);
      if (!oStart || !oEnd) return false;

      return start <= oEnd && end >= oStart;
    });
  };

  const updateEmployment = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...(prev.employment || [])];
      updated[index] = { ...updated[index], [field]: value };

      if (field === "current" && value === true) {
        updated[index].to = "";
      }

      return { ...prev, employment: updated };
    });

    // Clear error for this field if it is now filled
    if (value && value.toString().trim() && rowErrors[index]?.[field]) {
      setRowErrors((prev) => {
        const rowErr = { ...prev[index] };
        delete rowErr[field];
        return { ...prev, [index]: rowErr };
      });
    }

    setIsDirty(true);
  };

  // Date Change Handler with Masking for Employment Rows
  const handleDateChange = (index, field, val) => {
    const prevVal = employmentList[index]?.[field] || "";
    let finalVal = val;
    if (val.length >= prevVal.length) {
      finalVal = formatDDMMYYYY(val);
    } else {
      if (prevVal.endsWith("-") && val.length === prevVal.length - 1) {
        finalVal = val.slice(0, -1);
      }
    }
    updateEmployment(index, field, finalVal);
  };

  const addEmployment = () => {
    // Validate all existing rows
    const errors = {};
    let hasError = false;

    employmentList.forEach((job, idx) => {
      const fields = ["organization", "designation", "from"];
      if (!job.current) {
        fields.push("to");
      }

      fields.forEach((f) => {
        if (!job[f] || !job[f].toString().trim()) {
          if (!errors[idx]) errors[idx] = {};
          errors[idx][f] = true;
          hasError = true;
        }
      });

      // Date format check
      if (job.from && !isValidDate(job.from)) {
        if (!errors[idx]) errors[idx] = {};
        errors[idx]["from_invalid"] = true;
        hasError = true;
      }
      if (!job.current && job.to && !isValidDate(job.to)) {
        if (!errors[idx]) errors[idx] = {};
        errors[idx]["to_invalid"] = true;
        hasError = true;
      }
      // To must be after From (when not current job)
      if (!job.current && job.from && job.to && isValidDate(job.from) && isValidDate(job.to) && !isToAfterFrom(job.from, job.to)) {
        if (!errors[idx]) errors[idx] = {};
        errors[idx]["to_before_from"] = true;
        hasError = true;
      }
    });

    if (hasError) {
      setRowErrors(errors);
      alert("Please fill in all required employment fields with valid formats before adding a new row.");
      return;
    }

    setRowErrors({});
    setFormData((prev) => ({
      ...prev,
      employment: [
        ...(prev.employment || []),
        {
          organization: "",
          designation: "",
          from: "",
          to: "",
          current: false,
          summary: "",
        },
      ],
    }));
    setIsDirty(true);
  };

  const removeEmployment = (index) => {
    setFormData((prev) => ({
      ...prev,
      employment: (prev.employment || []).filter((_, i) => i !== index),
    }));
    // Clean up errors for deleted row
    setRowErrors((prev) => {
      const copy = { ...prev };
      delete copy[index];
      return copy;
    });
    setIsDirty(true);
  };

  const isFresher = formData?.candidateType === "fresher";

  return (
    <div className="space-y-6" onKeyDown={handleFormKeyDown}>

      {/* Fresher banner */}
      {isFresher && (
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
          <Info className="w-5 h-5 text-[#0057B8] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[#0057B8]">You are registered as a Fresher</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Previous employment details are <strong>not required</strong> for freshers. You may skip this section or optionally add any internship / project experience.
            </p>
          </div>
        </div>
      )}
      {employmentList.map((job, index) => {
        const localErrs = rowErrors[index] || {};
        const parentErrs = {
          organization: !!validationErrors[`emp_${index}_organization`],
          designation: !!validationErrors[`emp_${index}_designation`],
          from: !!validationErrors[`emp_${index}_from`],
          to: !!validationErrors[`emp_${index}_to`],
        };
        const errors = { ...localErrs, ...parentErrs };
        return (
          <div
            key={index}
            className="p-5 relative bg-white border border-gray-150 rounded-xl shadow-sm"
          >
            {/* REMOVE BUTTON */}
            {!readOnly && employmentList.length > 1 && (
              <button
                type="button"
                onClick={() => removeEmployment(index)}
                className="absolute top-3 right-3 text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition"
                title="Remove Employment"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* MAIN FIELDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Organization"
                required
                value={job.organization || ""}
                disabled={readOnly}
                onChange={(v) => updateEmployment(index, "organization", v)}
                error={errors.organization ? "Organization is required" : ""}
              />

              <Input
                label="Designation"
                required
                value={job.designation || ""}
                disabled={readOnly}
                onChange={(v) => updateEmployment(index, "designation", v)}
                error={errors.designation ? "Designation is required" : ""}
              />

              <Input
                label="From (DD-MM-YYYY)"
                placeholder="DD-MM-YYYY"
                required
                value={job.from || ""}
                disabled={readOnly}
                onChange={(v) => handleDateChange(index, "from", v)}
                error={
                  errors.from
                    ? "From Date is required"
                    : errors.from_invalid
                    ? "Invalid date format"
                    : job.from && !isValidDate(job.from)
                    ? "Invalid date format"
                    : ""
                }
              />

              {!job.current && (
                <Input
                  label="To (DD-MM-YYYY)"
                  placeholder="DD-MM-YYYY"
                  required
                  value={job.to || ""}
                  disabled={readOnly}
                  onChange={(v) => handleDateChange(index, "to", v)}
                  error={
                    errors.to
                      ? "To Date is required"
                      : errors.to_invalid
                      ? "Invalid date format (use DD-MM-YYYY)"
                      : (!job.current && job.to && !isValidDate(job.to)
                        ? "Invalid date format (use DD-MM-YYYY)"
                        : "") ||
                      (errors.to_before_from ? "To date must be after From date" : "") ||
                      (!job.current && job.from && job.to && isValidDate(job.from) && isValidDate(job.to) && !isToAfterFrom(job.from, job.to)
                        ? "To date must be after From date"
                        : "") ||
                      (hasOverlap(index) ? "Overlap detected with other job" : "")
                  }
                />
              )}
            </div>

            {/* SUMMARY FIELD */}
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Work Summary
              </label>
              <textarea
                rows={3}
                value={job.summary || ""}
                disabled={readOnly}
                onChange={(e) =>
                  updateEmployment(index, "summary", e.target.value)
                }
                placeholder="Describe your responsibilities, achievements..."
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-750 placeholder-gray-400 focus:outline-none focus:border-gray-300 focus:ring-0 transition"
              />
            </div>

            {/* FOOTER */}
            <div className="flex items-center gap-4 mt-3 text-sm">
              <label className="flex items-center gap-2 cursor-pointer select-none font-semibold text-gray-600">
                <input
                  type="checkbox"
                  checked={job.current || false}
                  disabled={readOnly}
                  onChange={(e) =>
                    updateEmployment(index, "current", e.target.checked)
                  }
                  className="rounded text-blue-600 border-gray-300 focus:ring-blue-500 w-4 h-4"
                />
                Current Job
              </label>

              <span className="text-gray-500 italic">
                Exp:{" "}
                <b className="text-[#0057B8]">
                  {calculateExperience(
                    job.from,
                    job.current ? null : job.to
                  )}
                </b>
              </span>
            </div>
          </div>
        );
      })}

      {/* ADD BUTTON */}
      {!readOnly && (
        <button
          type="button"
          onClick={addEmployment}
          className="flex items-center gap-1.5 text-white text-sm font-bold bg-[#0057B8] hover:bg-blue-700 px-5 py-2.5 rounded-xl transition shadow-md"
        >
          <Plus className="w-4 h-4" /> Add Employment
        </button>
      )}
    </div>
  );
}