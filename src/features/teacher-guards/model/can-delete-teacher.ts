import { getScheduleTeacherIds } from "@/entities/schedule/model/teacher-assignment";
import type { ScheduleRecord } from "@/shared/types/schedule";

export const isTeacherReferencedBySchedule = (
  schedule: ScheduleRecord | null | undefined,
  teacherId: string,
): boolean => {
  const normalizedTeacherId = String(teacherId || "").trim();
  if (!normalizedTeacherId) return false;
  return getScheduleTeacherIds(schedule).includes(normalizedTeacherId);
};

export const canDeleteTeacher = (
  schedules: ScheduleRecord[],
  teacherId: string,
): boolean => {
  if (!Array.isArray(schedules)) return true;
  return !schedules.some((schedule) =>
    isTeacherReferencedBySchedule(schedule, teacherId),
  );
};
