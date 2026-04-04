import type {
  ScheduleApprovalStatus,
  ScheduleRecord,
} from "@/shared/types/schedule";

export const normalizeScheduleApprovalStatus = (
  schedule: ScheduleRecord | null | undefined,
): ScheduleApprovalStatus => {
  const status = String(schedule?.approval?.status || "").trim();
  if (status === "pending" || status === "approved" || status === "rejected") {
    return status;
  }
  return "approved";
};

export const isActiveScheduleStatus = (
  schedule: ScheduleRecord | null | undefined,
): boolean => {
  const status = normalizeScheduleApprovalStatus(schedule);
  return status === "pending" || status === "approved";
};
