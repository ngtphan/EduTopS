import type { ScheduleRecord } from "@/shared/types/schedule";

const CONFLICT_KEY_FIELDS = [
  "week",
  "dayOfWeek",
  "startTime",
  "endTime",
  "classId",
  "subjectId",
  "location",
] as const;

const normalizeConflictToken = (value: unknown): string => {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value).trim().toLowerCase();
  }
  return "";
};

const toConflictTokens = (
  schedule: ScheduleRecord | null | undefined,
): string[] =>
  CONFLICT_KEY_FIELDS.map((field) => normalizeConflictToken(schedule?.[field]));

export const buildScheduleConflictKey = (
  schedule: ScheduleRecord | null | undefined,
): string => toConflictTokens(schedule).join("|");

export const EMPTY_SCHEDULE_CONFLICT_KEY = Array.from(
  { length: CONFLICT_KEY_FIELDS.length },
  () => "",
).join("|");

export const isScheduleConflictKeyEmpty = (
  key: string | null | undefined,
): boolean => String(key || "").trim() === EMPTY_SCHEDULE_CONFLICT_KEY;

export const hasScheduleConflictIdentity = (
  schedule: ScheduleRecord | null | undefined,
): boolean => toConflictTokens(schedule).every((token) => token.length > 0);
