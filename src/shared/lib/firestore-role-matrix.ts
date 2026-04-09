import { getScheduleTeacherIds } from "@/entities/schedule/model/teacher-assignment";

export type AppSecurityRole = "admin" | "teacher" | "parent" | "guest";

export type FirestoreCollectionName =
  | "subjects"
  | "teachers"
  | "students"
  | "classes"
  | "schedules"
  | "accounts"
  | "attendanceRequests"
  | "settings";

const SUPPORTED_COLLECTIONS = new Set<FirestoreCollectionName>([
  "subjects",
  "teachers",
  "students",
  "classes",
  "schedules",
  "accounts",
  "attendanceRequests",
  "settings",
]);

const READ_MATRIX: Record<AppSecurityRole, Set<FirestoreCollectionName>> = {
  admin: new Set(SUPPORTED_COLLECTIONS),
  teacher: new Set(SUPPORTED_COLLECTIONS),
  parent: new Set(SUPPORTED_COLLECTIONS),
  guest: new Set(),
};

const WRITE_MATRIX: Record<AppSecurityRole, Set<FirestoreCollectionName>> = {
  admin: new Set(SUPPORTED_COLLECTIONS),
  teacher: new Set(["schedules", "attendanceRequests"]),
  parent: new Set(),
  guest: new Set(),
};

const toToken = (value: unknown): string =>
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean"
    ? String(value).trim()
    : "";

export const toSecurityRole = (value: unknown): AppSecurityRole => {
  const token = toToken(value);
  if (token === "admin" || token === "teacher" || token === "parent") {
    return token;
  }
  return "guest";
};

export const toFirestoreCollectionName = (
  value: unknown,
): FirestoreCollectionName | null => {
  const token = toToken(value) as FirestoreCollectionName;
  return SUPPORTED_COLLECTIONS.has(token) ? token : null;
};

export const canRoleReadCollection = (
  role: unknown,
  collection: unknown,
): boolean => {
  const normalizedRole = toSecurityRole(role);
  const normalizedCollection = toFirestoreCollectionName(collection);
  if (!normalizedCollection) return false;
  return READ_MATRIX[normalizedRole].has(normalizedCollection);
};

export const canRoleWriteCollection = (
  role: unknown,
  collection: unknown,
): boolean => {
  const normalizedRole = toSecurityRole(role);
  const normalizedCollection = toFirestoreCollectionName(collection);
  if (!normalizedCollection) return false;
  return WRITE_MATRIX[normalizedRole].has(normalizedCollection);
};

export const canTeacherOwnSchedulePayload = (
  payload: unknown,
  currentTeacherId: unknown,
): boolean => {
  const teacherId = toToken(currentTeacherId);
  if (!teacherId) return false;
  const assignedTeacherIds = getScheduleTeacherIds(
    (payload as Parameters<typeof getScheduleTeacherIds>[0]) || null,
  );
  return assignedTeacherIds.includes(teacherId);
};

export const canTeacherOwnAttendanceRequestPayload = (
  payload: unknown,
  currentTeacherId: unknown,
): boolean => {
  const teacherId = toToken(currentTeacherId);
  if (!teacherId) return false;
  const ownerTeacherId = toToken((payload as { teacherId?: unknown })?.teacherId);
  return ownerTeacherId !== "" && ownerTeacherId === teacherId;
};

export const canRoleWriteCollectionWithOwnership = ({
  role,
  currentUserId,
  collection,
  payload,
}: {
  role: unknown;
  currentUserId: unknown;
  collection: unknown;
  payload: unknown;
}): boolean => {
  const normalizedRole = toSecurityRole(role);
  const normalizedCollection = toFirestoreCollectionName(collection);
  if (!normalizedCollection) return false;

  if (!canRoleWriteCollection(normalizedRole, normalizedCollection)) {
    return false;
  }

  if (normalizedRole === "admin") {
    return true;
  }

  if (normalizedRole === "teacher") {
    if (normalizedCollection === "schedules") {
      return canTeacherOwnSchedulePayload(payload, currentUserId);
    }
    if (normalizedCollection === "attendanceRequests") {
      return canTeacherOwnAttendanceRequestPayload(payload, currentUserId);
    }
  }

  return false;
};
