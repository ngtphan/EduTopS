import { normalizeScheduleApprovalStatus } from "@/entities/schedule/model/approval";
import type { ScheduleRecord } from "@/shared/types/schedule";

export interface ScheduleCompactIdentityInput extends Pick<
  ScheduleRecord,
  "dayOfWeek" | "startTime" | "endTime" | "subjectId" | "location"
> {}

export interface ScheduleCompactGroupBucket<TSchedule> {
  identityKey: string;
  schedules: TSchedule[];
}

export type ScheduleGroupApprovalMode =
  | "empty"
  | "approved"
  | "pending"
  | "rejected"
  | "mixed";

export interface ScheduleGroupApprovalSummary {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  mode: ScheduleGroupApprovalMode;
}

const toSafeToken = (value: unknown): string => {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value).trim();
  }
  return "";
};

const toLocationToken = (value: unknown): string =>
  toSafeToken(value).toLowerCase();

const uniqSortedTeacherIds = (teacherIds: readonly string[] = []): string[] =>
  Array.from(
    new Set(
      teacherIds.map((teacherId) => toSafeToken(teacherId)).filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));

export const buildScheduleCompactIdentity = (
  schedule: ScheduleCompactIdentityInput | null | undefined,
  teacherIds: readonly string[] = [],
): string => {
  const teacherSignature = uniqSortedTeacherIds(teacherIds).join(",");
  return [
    toSafeToken(schedule?.dayOfWeek),
    toSafeToken(schedule?.startTime),
    toSafeToken(schedule?.endTime),
    toSafeToken(schedule?.subjectId),
    teacherSignature,
    toLocationToken(schedule?.location),
  ].join("|");
};

export const groupSchedulesByCompactIdentity = <TSchedule>(
  schedules: readonly TSchedule[],
  resolveIdentityKey: (schedule: TSchedule) => string,
): ScheduleCompactGroupBucket<TSchedule>[] => {
  const grouped = new Map<string, TSchedule[]>();

  schedules.forEach((schedule) => {
    const identityKey = String(resolveIdentityKey(schedule) || "").trim();
    if (!grouped.has(identityKey)) {
      grouped.set(identityKey, []);
    }
    grouped.get(identityKey)?.push(schedule);
  });

  return Array.from(grouped.entries())
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([identityKey, groupedSchedules]) => ({
      identityKey,
      schedules: [...groupedSchedules],
    }));
};

export const summarizeScheduleApprovalForGroup = (
  schedules: readonly (ScheduleRecord | null | undefined)[] = [],
): ScheduleGroupApprovalSummary => {
  const summary: ScheduleGroupApprovalSummary = {
    total: schedules.length,
    approved: 0,
    pending: 0,
    rejected: 0,
    mode: "empty",
  };

  schedules.forEach((schedule) => {
    const status = normalizeScheduleApprovalStatus(schedule);
    if (status === "approved") {
      summary.approved += 1;
      return;
    }
    if (status === "pending") {
      summary.pending += 1;
      return;
    }
    summary.rejected += 1;
  });

  if (summary.total === 0) {
    summary.mode = "empty";
    return summary;
  }

  if (summary.approved === summary.total) {
    summary.mode = "approved";
    return summary;
  }

  if (summary.pending === summary.total) {
    summary.mode = "pending";
    return summary;
  }

  if (summary.rejected === summary.total) {
    summary.mode = "rejected";
    return summary;
  }

  summary.mode = "mixed";
  return summary;
};
