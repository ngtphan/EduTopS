import type { AppRole } from "@/shared/types/access-control";

const toToken = (value: unknown): string => {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value).trim();
  }
  return "";
};

const normalizeRole = (value: unknown): AppRole | "" => {
  const token = toToken(value).toLowerCase();
  if (token === "admin" || token === "teacher" || token === "parent") {
    return token;
  }
  return "";
};

const uniqSortedIds = (values: readonly unknown[]): string[] =>
  Array.from(
    new Set(values.map((value) => toToken(value)).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));

export interface AccessContextInput {
  role: unknown;
  userId: unknown;
  parentStudentIds?: readonly unknown[] | null;
}

export interface AccessContextSnapshot {
  role: AppRole | "";
  userId: string;
  parentStudentIds: string[];
  scopeKey: string;
}

export const buildAccessScopeKey = ({
  role,
  userId,
  parentStudentIds,
}: AccessContextInput): string => {
  const normalizedRole = normalizeRole(role);
  const normalizedUserId = toToken(userId) || "-";
  const normalizedStudentIds =
    normalizedRole === "parent"
      ? uniqSortedIds(Array.isArray(parentStudentIds) ? parentStudentIds : [])
      : [];

  return [
    normalizedRole || "guest",
    normalizedUserId,
    normalizedStudentIds.join(","),
  ].join("|");
};

export const createAccessContextSnapshot = ({
  role,
  userId,
  parentStudentIds,
}: AccessContextInput): AccessContextSnapshot => {
  const normalizedRole = normalizeRole(role);
  const normalizedUserId = toToken(userId);
  const normalizedStudentIds =
    normalizedRole === "parent"
      ? uniqSortedIds(Array.isArray(parentStudentIds) ? parentStudentIds : [])
      : [];

  return {
    role: normalizedRole,
    userId: normalizedUserId,
    parentStudentIds: normalizedStudentIds,
    scopeKey: buildAccessScopeKey({
      role: normalizedRole,
      userId: normalizedUserId,
      parentStudentIds: normalizedStudentIds,
    }),
  };
};

export const shouldResetAccessScopedCache = (
  previous: AccessContextSnapshot | null | undefined,
  next: AccessContextSnapshot,
): boolean => {
  if (!previous) return true;
  return previous.scopeKey !== next.scopeKey;
};
