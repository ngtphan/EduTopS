const ISO_WEEK_TOKEN_REGEX = /^(\d{4})-W(\d{1,2})$/i;
const ISO_DATE_TOKEN_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const toInteger = (value: string): number => Number.parseInt(value, 10);

const pad2 = (value: number): string => String(value).padStart(2, "0");

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

const toIsoDateTokenFromUtcDate = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = pad2(date.getUTCMonth() + 1);
  const day = pad2(date.getUTCDate());
  return `${year}-${month}-${day}`;
};

const formatIsoDateTokenForDisplay = (dateToken: string): string => {
  const [year, month, day] = dateToken.split("-");
  return `${day}/${month}/${year}`;
};

const getIsoWeekNumberFromUtcDate = (date: Date): number => {
  const shifted = new Date(date);
  const dayNum = shifted.getUTCDay() || 7;
  shifted.setUTCDate(shifted.getUTCDate() + 4 - dayNum);

  const isoYear = shifted.getUTCFullYear();
  const isoYearStart = new Date(Date.UTC(isoYear, 0, 1));
  return Math.ceil(
    ((shifted.getTime() - isoYearStart.getTime()) / DAY_IN_MS + 1) / 7,
  );
};

const getIsoWeeksInYear = (year: number): number =>
  getIsoWeekNumberFromUtcDate(new Date(Date.UTC(year, 11, 28)));

const getIsoWeekStartUtcDate = (year: number, weekNo: number): Date => {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4DayNum = jan4.getUTCDay() || 7;

  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4DayNum + 1);

  const weekStart = new Date(week1Monday);
  weekStart.setUTCDate(week1Monday.getUTCDate() + (weekNo - 1) * 7);
  return weekStart;
};

export const normalizeWeekToken = (value: unknown): string => {
  const raw = toPrimitiveToken(value);
  const match = ISO_WEEK_TOKEN_REGEX.exec(raw);
  if (!match) return "";

  const year = toInteger(match[1]);
  const weekNo = toInteger(match[2]);
  if (!Number.isInteger(year) || year < 1000 || year > 9999) return "";
  if (!Number.isInteger(weekNo) || weekNo < 1) return "";
  if (weekNo > getIsoWeeksInYear(year)) return "";

  return `${year}-W${String(weekNo).padStart(2, "0")}`;
};

export const isIsoWeekToken = (value: unknown): boolean =>
  normalizeWeekToken(value) !== "";

export const formatWeekTokenLabel = (
  value: unknown,
  fallbackValue = "",
): string => {
  const range = getWeekDateRangeTokens(value);
  if (!range) {
    const raw = toPrimitiveToken(value);
    return raw || toPrimitiveToken(fallbackValue);
  }

  return `Từ ngày ${formatIsoDateTokenForDisplay(range.startDateToken)} đến ngày ${formatIsoDateTokenForDisplay(range.endDateToken)}`;
};

export const getWeekDateRangeTokens = (
  value: unknown,
): { startDateToken: string; endDateToken: string } | null => {
  const normalized = normalizeWeekToken(value);
  if (!normalized) return null;

  const [year, weekNo] = normalized.split("-W");
  const weekStart = getIsoWeekStartUtcDate(toInteger(year), toInteger(weekNo));
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

  return {
    startDateToken: toIsoDateTokenFromUtcDate(weekStart),
    endDateToken: toIsoDateTokenFromUtcDate(weekEnd),
  };
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
  const weekNo = getIsoWeekNumberFromUtcDate(date);

  return `${isoYear}-W${String(weekNo).padStart(2, "0")}`;
};

export const toIsoWeekTokenFromDateToken = (dateToken: unknown): string =>
  toIsoWeekTokenFromDate(toPrimitiveToken(dateToken));
