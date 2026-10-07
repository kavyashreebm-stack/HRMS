import React, { useState } from "react";
import { Input } from "../ui/FormElements";
import { formatDDMMYYYY, isValidDate } from "../utils/dateHelpers";
import { Trash2, Plus } from "lucide-react";

export default function FamilyDetails({
  formData = {},
  setFormData,
  readOnly = false,
  setIsDirty = () => { },
  validationErrors = {},
}) {
  const familyList = formData.family || [{ relation: "", name: "", occupation: "", dob: "", adhaarcard_no: "", pancard_no: "", }];
  const [rowErrors, setRowErrors] = useState({}); // maps index -> { fieldName: boolean }

  const isValidAadhaar = (value) =>
    value && value.toString().replace(/\D/g, "").length === 12;
  const isValidPAN = (value) =>
    /^[A-Z]{5}[0-9]{4}[A-Z]$/.test((value || "").toUpperCase());

  // Mask Aadhaar: Disabled - returns unmasked as requested
  const maskAadhaar = (str) => {
    return str || "";
  };

  const updateFamily = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...(prev.family || [])];
      if (!updated[index]) {
        updated[index] = { relation: "", name: "", occupation: "", dob: "", adhaarcard_no: "" };
      }
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, family: updated };
    });

    // Clear error for this field if filled
    if (value && value.toString().trim() && rowErrors[index]?.[field]) {
      setRowErrors((prev) => {
        const rowErr = { ...prev[index] };
        delete rowErr[field];
        return { ...prev, [index]: rowErr };
      });
    }

    setIsDirty(true);
  };

  const handleAadhaarChange = (index, value) => {
    const clean = value.replace(/\D/g, "").slice(0, 12);
    updateFamily(index, "adhaarcard_no", clean);
  };
  const handlePanChange = (index, value) => {
    const clean = value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 10);

    updateFamily(index, "pancard_no", clean);
  };

  // Date Change Handler with Masking
  const handleDateChange = (index, field, val) => {
    const prevVal = familyList[index]?.[field] || "";
    let finalVal = val;
    if (val.length >= prevVal.length) {
      finalVal = formatDDMMYYYY(val);
    } else {
      if (prevVal.endsWith("-") && val.length === prevVal.length - 1) {
        finalVal = val.slice(0, -1);
      }
    }
    updateFamily(index, field, finalVal);
  };

  const addFamilyMember = () => {
    // Validate all existing rows
    const errors = {};
    let hasError = false;

    familyList.forEach((member, idx) => {
      const fields = ["relation", "name", "occupation", "dob", "adhaarcard_no", "pancard_no",];
      fields.forEach((f) => {
        if (!member[f] || !member[f].toString().trim()) {
          if (!errors[idx]) errors[idx] = {};
          errors[idx][f] = true;
          hasError = true;
        }
      });

      // Date validation
      if (member.dob && !isValidDate(member.dob)) {
        if (!errors[idx]) errors[idx] = {};
        errors[idx]["dob_invalid"] = true;
        hasError = true;
      }

      // Aadhaar check
      if (member.adhaarcard_no && !isValidAadhaar(member.adhaarcard_no)) {
        if (!errors[idx]) errors[idx] = {};
        errors[idx]["aadhaar_invalid"] = true;
        hasError = true;
      }
      if (member.pancard_no && !isValidPAN(member.pancard_no)) {
        if (!errors[idx]) errors[idx] = {};
        errors[idx]["pan_invalid"] = true;
        hasError = true;
      }
    });

    if (hasError) {
      setRowErrors(errors);
      alert("Please fill in all family details fields with valid formats before adding a new family member.");
      return;
    }

    setRowErrors({});
    setFormData((prev) => ({
      ...prev,
      family: [
        ...(prev.family || []),
        { relation: "", name: "", occupation: "", dob: "", adhaarcard_no: "" },
      ],
    }));
    setIsDirty(true);
  };

  const removeFamilyMember = (index) => {
    const updated = familyList.filter((_, i) => i !== index);
    setFormData((prev) => ({
      ...prev,
      family: updated.length > 0 ? updated : [{ relation: "", name: "", occupation: "", dob: "", adhaarcard_no: "" }],
    }));
    setRowErrors((prev) => {
      const copy = { ...prev };
      delete copy[index];
      return copy;
    });
    setIsDirty(true);
  };

  // ✅ Arrow Left/Right key navigation between inputs when at boundaries
  const handleKeyDown = (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const target = e.target;
    if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA" && target.tagName !== "SELECT") return;

    if (target.tagName === "INPUT" && (target.type === "text" || target.type === "email" || target.type === "tel" || target.type === "number")) {
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
      const prev = focusable[index - 1] || focusable[focusable.length - 1];
      prev?.focus();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = focusable[index + 1] || focusable[0];
      next?.focus();
    }
  };

  return (
    <div className="space-y-6" onKeyDown={handleKeyDown}>
      {familyList.map((member, index) => {
        const errors = rowErrors[index] || {};
        return (
          <div
            key={index}
            className="p-5 relative bg-white border border-gray-150 rounded-xl shadow-sm"
          >
            {/* Remove button */}
            {!readOnly && (familyList.length > 1 || familyList[0].name !== "") && (
              <button
                type="button"
                onClick={() => removeFamilyMember(index)}
                className="absolute top-3 right-3 text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition"
                title="Remove Family Member"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <Input
                label="Relation"
                required
                placeholder="e.g. Father, Mother, Wife..."
                value={member.relation || ""}
                disabled={readOnly}
                onChange={(v) => updateFamily(index, "relation", v)}
                error={validationErrors[`family_${index}_relation`] || (errors.relation ? "Required" : "")}
              />

              <Input
                label="Name"
                required
                value={member.name || ""}
                disabled={readOnly}
                onChange={(v) => updateFamily(index, "name", v.toUpperCase())}
                error={validationErrors[`family_${index}_name`] || (errors.name ? "Required" : "")}
              />

              <Input
                label="Occupation"
                required
                value={member.occupation || ""}
                disabled={readOnly}
                onChange={(v) => updateFamily(index, "occupation", v)}
                error={validationErrors[`family_${index}_occupation`] || (errors.occupation ? "Required" : "")}
              />

              <Input
                label="Date of Birth"
                placeholder="DD-MM-YYYY"
                required
                value={member.dob || ""}
                disabled={readOnly}
                onChange={(v) => handleDateChange(index, "dob", v)}
                error={
                  validationErrors[`family_${index}_dob`] ||
                  (errors.dob
                    ? "Required"
                    : errors.dob_invalid
                      ? "Invalid format"
                      : member.dob && !isValidDate(member.dob)
                        ? "Invalid format"
                        : "")
                }
              />

              <Input
                label="Aadhaar Number"
                type="text"
                inputMode="numeric"
                required
                placeholder="1234 5678 9012"
                value={readOnly ? maskAadhaar(member.adhaarcard_no) : member.adhaarcard_no || ""}
                disabled={readOnly}
                onChange={(v) => handleAadhaarChange(index, v)}
                error={
                  validationErrors[`family_${index}_aadhaar`] ||
                  (errors.adhaarcard_no
                    ? "Required"
                    : errors.aadhaar_invalid
                      ? "Must be 12 digits"
                      : member.adhaarcard_no && !isValidAadhaar(member.adhaarcard_no)
                        ? "Must be 12 digits"
                        : "")
                }
              />
              <Input
                label="PAN Card Number"
                type="text"
                required
                placeholder="ABCDE1234F"
                value={member.pancard_no || ""}
                disabled={readOnly}
                onChange={(v) => handlePanChange(index, v)}
                error={
                  validationErrors[`family_${index}_pan`] ||
                  (errors.pancard_no
                    ? "Required"
                    : errors.pan_invalid
                      ? "Invalid PAN"
                      : member.pancard_no && !isValidPAN(member.pancard_no)
                        ? "Invalid PAN"
                        : "")
                }
              />
            </div>
          </div>
        );
      })}

      {!readOnly && (
        <button
          type="button"
          onClick={addFamilyMember}
          className="flex items-center gap-1.5 text-white text-sm font-bold bg-[#0057B8] hover:bg-blue-700 px-5 py-2.5 rounded-xl transition shadow-md"
        >
          <Plus className="w-4 h-4" /> Add Family Member
        </button>
      )}
    </div>
  );
}