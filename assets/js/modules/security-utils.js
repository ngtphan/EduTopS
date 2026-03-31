const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const EXCEL_FORMULA_PREFIX = /^\s*[=+\-@]/;

export const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const escapeAttr = (value) => escapeHtml(value).replace(/`/g, "&#96;");

export const toSafeDomToken = (value) =>
  encodeURIComponent(String(value ?? "")).replace(/%/g, "_");

export const sanitizeExcelCell = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string") return value;
  if (EXCEL_FORMULA_PREFIX.test(value)) {
    return `'${value}`;
  }
  return value;
};

const sanitizeStringForStorage = (value, maxLen = 2000) =>
  String(value ?? "")
    .replace(CONTROL_CHARS, "")
    .trim()
    .slice(0, maxLen);

export const sanitizeForStorage = (value, depth = 0) => {
  if (depth > 8) return null;

  if (value === null || value === undefined) return value;
  if (typeof value === "string") return sanitizeStringForStorage(value);
  if (typeof value === "number" || typeof value === "boolean") return value;

  if (Array.isArray(value)) {
    return value
      .slice(0, 500)
      .map((item) => sanitizeForStorage(item, depth + 1));
  }

  if (typeof value === "object") {
    const output = {};
    Object.entries(value).forEach(([key, val]) => {
      if (key === "__proto__" || key === "prototype" || key === "constructor") {
        return;
      }
      if (val === undefined) return;
      output[key] = sanitizeForStorage(val, depth + 1);
    });
    return output;
  }

  return String(value);
};

export const isSafeDocId = (id) =>
  typeof id === "string" && /^[A-Za-z0-9_-]{3,120}$/.test(id);
