const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const EXCEL_FORMULA_PREFIX = /^\s*[=+\-@]/;

const toSafeTextToken = (value: unknown): string => {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  return "";
};

export const escapeHtml = (value: unknown): string =>
  toSafeTextToken(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const escapeAttr = (value: unknown): string =>
  escapeHtml(value).replaceAll("`", "&#96;");

export const toSafeDomToken = (value: unknown): string =>
  encodeURIComponent(toSafeTextToken(value)).replaceAll("%", "_");

export const sanitizeExcelCell = (value: unknown): unknown => {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string") return value;
  if (EXCEL_FORMULA_PREFIX.test(value)) {
    return `'${value}`;
  }
  return value;
};

const sanitizeStringForStorage = (value: string, maxLen = 2000): string =>
  value.replaceAll(CONTROL_CHARS, "").trim().slice(0, maxLen);

export const sanitizeForStorage = (value: unknown, depth = 0): unknown => {
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
    const output: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, val]) => {
      if (key === "__proto__" || key === "prototype" || key === "constructor") {
        return;
      }
      if (val === undefined) return;
      output[key] = sanitizeForStorage(val, depth + 1);
    });
    return output;
  }

  return toSafeTextToken(value);
};

export const isSafeDocId = (id: unknown): boolean =>
  typeof id === "string" && /^[A-Za-z0-9_-]{3,120}$/.test(id);

