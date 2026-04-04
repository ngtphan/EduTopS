const ISO_WEEK_TOKEN_REGEX = /^(\d{4})-W(\d{1,2})$/i;
const ISO_DATE_TOKEN_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

const toInteger = (value: string): number => Number.parseInt(value, 10);

const toPrimitiveToken = (value: unknown): string => {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value).trim();
  }
  return "";
};

export const normalizeWeekToken = (value: unknown): string => {
  const raw = toPrimitiveToken(value);
  const match = ISO_WEEK_TOKEN_REGEX.exec(raw);
  if (!match) return "";

  const year = toInteger(match[1]);
  const weekNo = toInteger(match[2]);
  if (!Number.isInteger(year) || year < 1000 || year > 9999) return "";
  if (!Number.isInteger(weekNo) || weekNo < 1 || weekNo > 53) return "";

  return `${year}-W${String(weekNo).padStart(2, "0")}`;
};

export const isIsoWeekToken = (value: unknown): boolean =>
  normalizeWeekToken(value) !== "";

export const formatWeekTokenLabel = (
  value: unknown,
  fallbackValue = "",
): string => {
  const normalized = normalizeWeekToken(value);
  if (!normalized) {
    const raw = toPrimitiveToken(value);
    return raw || toPrimitiveToken(fallbackValue);
  }

  const [year, weekNo] = normalized.split("-W");
  return `Tuần ${Number(weekNo)}, ${year}`;
};

const toUtcDate = (value: Date | string | number): Date | null => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(
      Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()),
    );
  }

  if (typeof value === "number") {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Date(
      Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()),
    );
  }

  const raw = toPrimitiveToken(value);
  const match = ISO_DATE_TOKEN_REGEX.exec(raw);
  if (!match) return null;

  const year = toInteger(match[1]);
  const month = toInteger(match[2]);
  const day = toInteger(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
};

export const toIsoWeekTokenFromDate = (
  value: Date | string | number,
): string => {
  const date = toUtcDate(value);
  if (!date) return "";

  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);

  const isoYear = date.getUTCFullYear();
  const isoYearStart = new Date(Date.UTC(isoYear, 0, 1));
  const weekNo = Math.ceil(
    ((date.getTime() - isoYearStart.getTime()) / 86400000 + 1) / 7,
  );

  return `${isoYear}-W${String(weekNo).padStart(2, "0")}`;
};

export const toIsoWeekTokenFromDateToken = (dateToken: unknown): string =>
  toIsoWeekTokenFromDate(toPrimitiveToken(dateToken));
