import type { ScheduleRecord } from "@/shared/types/schedule";

const toToken = (value: unknown): string =>
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean"
    ? String(value).trim()
    : "";

const uniqIds = (ids: string[]): string[] =>
  Array.from(new Set(ids.map((id) => toToken(id)).filter(Boolean)));

const toStudentIdSet = (studentIds: readonly string[] = []): Set<string> =>
  new Set(uniqIds(studentIds as string[]));

const hasIntersection = (left: Set<string>, right: Set<string>): boolean => {
  for (const value of left) {
    if (right.has(value)) return true;
  }
  return false;
};

export const getScheduleStudentIdsForAccess = (
  schedule: Pick<ScheduleRecord, "studentIds" | "classId"> | null | undefined,
  resolveClassStudentIds: (classId: string) => string[] = () => [],
): string[] => {
  const explicitStudentIds = Array.isArray(schedule?.studentIds)
    ? schedule.studentIds
    : [];
  if (explicitStudentIds.length > 0) {
    return uniqIds(explicitStudentIds);
  }

  const classId = toToken(schedule?.classId);
  if (!classId) return [];

  return uniqIds(resolveClassStudentIds(classId) || []);
};

export const canParentAccessSchedule = ({
  schedule,
  parentStudentIds,
  resolveClassStudentIds,
}: {
  schedule: Pick<ScheduleRecord, "studentIds" | "classId"> | null | undefined;
  parentStudentIds: readonly string[];
  resolveClassStudentIds?: (classId: string) => string[];
}): boolean => {
  const parentStudentIdSet = toStudentIdSet(parentStudentIds as string[]);
  if (parentStudentIdSet.size === 0) return false;

  const scheduleStudentIdSet = toStudentIdSet(
    getScheduleStudentIdsForAccess(schedule, resolveClassStudentIds),
  );
  if (scheduleStudentIdSet.size === 0) return false;

  return hasIntersection(parentStudentIdSet, scheduleStudentIdSet);
};

export const filterSchedulesForParentAccess = (
  schedules: ScheduleRecord[] | null | undefined,
  parentStudentIds: readonly string[],
  resolveClassStudentIds?: (classId: string) => string[],
): ScheduleRecord[] => {
  if (!Array.isArray(schedules) || schedules.length === 0) return [];

  return schedules.filter((schedule) =>
    canParentAccessSchedule({
      schedule,
      parentStudentIds,
      resolveClassStudentIds,
    }),
  );
};

export const canParentAccessAttendanceRequest = ({
  parentStudentIds,
  teachingStudentIds,
}: {
  parentStudentIds: readonly string[];
  teachingStudentIds: readonly string[];
}): boolean => {
  const parentStudentIdSet = toStudentIdSet(parentStudentIds as string[]);
  if (parentStudentIdSet.size === 0) return false;

  const teachingStudentIdSet = toStudentIdSet(teachingStudentIds as string[]);
  if (teachingStudentIdSet.size === 0) return false;

  return hasIntersection(parentStudentIdSet, teachingStudentIdSet);
};
