import type {
  ScheduleRecord,
  ScheduleTeacherFields,
} from "@/shared/types/schedule";

const uniqIds = (ids: string[]): string[] =>
  Array.from(new Set(ids.map((id) => String(id || "").trim()).filter(Boolean)));

export const getScheduleTeacherIds = (
  schedule: ScheduleRecord | null | undefined,
  options: { fallbackTeacherId?: string } = {},
): string[] => {
  const fallbackTeacherId = String(options.fallbackTeacherId || "").trim();
  return uniqIds([
    String(schedule?.teacherId || ""),
    ...(Array.isArray(schedule?.coTeacherIds) ? schedule.coTeacherIds : []),
    fallbackTeacherId,
  ]);
};

export const normalizeScheduleTeachers = (
  schedule:
    | Pick<ScheduleRecord, "teacherId" | "coTeacherIds">
    | null
    | undefined,
  fallbackTeacherId = "",
): ScheduleTeacherFields => {
  const teacherIds = getScheduleTeacherIds(schedule, { fallbackTeacherId });
  const preferredTeacherId =
    String(schedule?.teacherId || "").trim() ||
    String(fallbackTeacherId || "").trim() ||
    String(teacherIds[0] || "").trim();

  const normalizedTeacherIds = uniqIds([
    preferredTeacherId,
    ...teacherIds.filter((id) => id !== preferredTeacherId),
  ]);

  return {
    teacherId: preferredTeacherId,
    coTeacherIds: normalizedTeacherIds.filter(
      (id) => id !== preferredTeacherId,
    ),
    teacherIds: normalizedTeacherIds,
  };
};

export const isTeacherAssignedToSchedule = (
  schedule: ScheduleRecord | null | undefined,
  teacherId: string | null | undefined,
): boolean =>
  getScheduleTeacherIds(schedule).includes(String(teacherId || "").trim());
