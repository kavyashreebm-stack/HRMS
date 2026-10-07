export const formatMMYYYY = (value) => {
  if (!value) return "";
  const cleaned = value.replace(/\D/g, "");
  let formatted = cleaned;
  if (cleaned.length > 2) {
    formatted = `${cleaned.slice(0, 2)}-${cleaned.slice(2, 6)}`;
  }
  return formatted.slice(0, 7);
};

export const isValidMMYYYY = (value) => {
  if (!value) return false;
  const parts = value.split("-");
  if (parts.length !== 2) return false;
  const [mm, yyyy] = parts.map(Number);
  if (isNaN(mm) || isNaN(yyyy)) return false;
  return mm >= 1 && mm <= 12 && yyyy >= 1900 && yyyy <= 2100;
};

export const isValidDate = (value) => {
  if (!value) return false;
  // Handle MM-YYYY
  if (value.length === 7 && value.includes("-")) {
    return isValidMMYYYY(value);
  }
  // Handle DD-MM-YYYY
  if (value.length !== 10) return false;
  const parts = value.split("-");
  if (parts.length !== 3) return false;
  const [dd, mm, yyyy] = parts.map(Number);
  if (isNaN(dd) || isNaN(mm) || isNaN(yyyy)) return false;
  if (yyyy < 1900 || yyyy > 2100) return false;
  const d = new Date(yyyy, mm - 1, dd);
  return d.getFullYear() === yyyy && d.getMonth() === mm - 1 && d.getDate() === dd;
};

export const formatDDMMYYYY = (value) => {
  if (!value) return "";
  let cleaned = value.replace(/\D/g, "");
  
  // Limit to 8 digits (DDMMYYYY)
  cleaned = cleaned.slice(0, 8);
  
  let formatted = "";
  if (cleaned.length > 0) {
    formatted += cleaned.slice(0, 2);
  }
  if (cleaned.length > 2) {
    formatted += "-" + cleaned.slice(2, 4);
  }
  if (cleaned.length > 4) {
    formatted += "-" + cleaned.slice(4, 8);
  }
  return formatted;
};

export const parseDate = (dateStr) => {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  if (parts.length === 2) {
    // MM-YYYY -> Assume first of month
    const [mm, yyyy] = parts.map(Number);
    return new Date(yyyy, mm - 1, 1);
  }
  if (parts.length === 3) {
    const [dd, mm, yyyy] = parts.map(Number);
    return new Date(yyyy, mm - 1, dd);
  }
  return null;
};

export const calculateExperience = (from, to) => {
  const start = parseDate(from);
  const end = to ? parseDate(to) : new Date();
  if (!start || isNaN(start) || !end || isNaN(end) || end < start) return "N/A";

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  if (months < 0) { years--; months += 12; }

  if (years === 0) return `${months} month(s)`;
  if (months === 0) return `${years} year(s)`;
  return `${years} year(s) ${months} month(s)`;
};

/**
 * Returns true if the `to` date is strictly after the `from` date.
 * Both must be valid DD-MM-YYYY strings.
 */
export const isToAfterFrom = (from, to) => {
  if (!from || !to) return true; // skip if either is empty
  const fromDate = parseDate(from);
  const toDate = parseDate(to);
  if (!fromDate || !toDate || isNaN(fromDate) || isNaN(toDate)) return true;
  return toDate > fromDate;
};

/**
 * Converts a native browser date string (YYYY-MM-DD) to DD-MM-YYYY.
 * Returns empty string if input is falsy.
 */
export const formatNativeDateToDDMMYYYY = (isoStr) => {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  const [yyyy, mm, dd] = parts;
  return `${dd}-${mm}-${yyyy}`;
};

/**
 * Formats a JS Date or ISO timestamp to DD-MM-YYYY display string.
 */
export const displayDateDDMMYYYY = (dateInput) => {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};