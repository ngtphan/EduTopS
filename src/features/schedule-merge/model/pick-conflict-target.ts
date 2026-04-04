import { normalizeScheduleApprovalStatus } from "@/entities/schedule/model/approval";
import type { ScheduleRecord } from "@/shared/types/schedule";

const getStatusPriority = (schedule: ScheduleRecord): number => {
  const status = normalizeScheduleApprovalStatus(schedule);
  if (status === "approved") return 0;
  if (status === "pending") return 1;
  return 2;
};

export const sortConflictsByPriority = (
  schedules: ScheduleRecord[],
): ScheduleRecord[] =>
  [...schedules].sort((a, b) => {
    const byStatus = getStatusPriority(a) - getStatusPriority(b);
    if (byStatus !== 0) return byStatus;

    const byCreatedAt = Number(a?.createdAt || 0) - Number(b?.createdAt || 0);
    if (byCreatedAt !== 0) return byCreatedAt;

    return String(a?.id || "").localeCompare(String(b?.id || ""));
  });

export const pickConflictTarget = (
  schedules: ScheduleRecord[],
): ScheduleRecord | null => {
  if (!Array.isArray(schedules) || schedules.length === 0) return null;
  return sortConflictsByPriority(schedules)[0] || null;
};
