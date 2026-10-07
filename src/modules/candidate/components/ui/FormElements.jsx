import React, { useState, useRef, useEffect } from "react";

/* ✅ INPUT */
export const Input = ({
  label,
  required,
  value,
  onChange,
  disabled,
  type = "text",
  error,
  id,
  name,
  ...props
}) => {
  const fieldId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]/g, "-") : undefined);
  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={fieldId} className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          {label} {required && "*"}
        </label>
      )}

      <input
        id={fieldId}
        name={name || fieldId}
        type={type}
        value={value}
        onChange={(e) => {
          let val = e.target.value;
          if (type === "date" && val) {
            const parts = val.split("-");
            if (parts[0] && parts[0].length > 4) {
              parts[0] = parts[0].slice(0, 4);
              val = parts.join("-");
            }
          }
          if (type === "email" || label?.toLowerCase().includes("email") || name?.toLowerCase().includes("email")) {
            val = val.toLowerCase();
          }
          onChange(val);
        }}
        disabled={disabled}
        className={`w-full border px-2 py-1 text-sm bg-white dark:bg-gray-700 transition rounded focus:outline-none focus:ring-1 ${
          error
            ? "border-red-500 text-red-600 dark:text-red-400 focus:border-red-500 focus:ring-red-500"
            : "border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:border-gray-400 dark:focus:border-gray-500 focus:ring-gray-400 dark:focus:ring-gray-500"
        }`}
        {...props}
        max={props.max || (type === "date" ? "9999-12-31" : undefined)}
      />

      {error && <p className="text-red-500 text-xs mt-1 font-medium">{error}</p>}
    </div>
  );
};

/* ✅ TEXTAREA */
export const Textarea = ({
  label,
  required,
  value,
  onChange,
  disabled,
  error,
  rows = 3,
  id,
  name,
  ...props
}) => {
  const fieldId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]/g, "-") : undefined);
  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={fieldId} className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          {label} {required && "*"}
        </label>
      )}

      <textarea
        id={fieldId}
        name={name || fieldId}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full border px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500
                    focus:border-gray-400 dark:focus:border-gray-500 transition rounded resize-none ${
                      error ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                    }`}
        {...props}
      />

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
};

/* ✅ SELECT */
export const Select = ({
  label,
  required,
  value,
  onChange,
  options = [],
  disabled,
  id,
  name,
  error
}) => {
  const fieldId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]/g, "-") : undefined);

  /* Normalize options (supports strings OR objects) */
  const normalized = options.map((opt) =>
    typeof opt === "string"
      ? { label: opt, value: opt }
      : opt
  );

  // Check if we should prepend a "Select..." option
  const hasEmpty = normalized.some((o) => o.value === "");
  const selectOptions = hasEmpty ? normalized : [{ label: "Select...", value: "" }, ...normalized];

  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={fieldId} className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          {label} {required && "*"}
        </label>
      )}

      <select
        id={fieldId}
        name={name || fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full border px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500
                    focus:border-gray-400 dark:focus:border-gray-500 transition rounded ${
                      error ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                    } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-gray-400 dark:hover:border-gray-500"}`}
      >
        {selectOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
};