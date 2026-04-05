import type { ParentStudentLinkRecord } from "@/shared/types/access-control";

const toToken = (value: unknown): string =>
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean"
    ? String(value).trim()
    : "";

const uniqIds = (ids: string[]): string[] =>
  Array.from(new Set(ids.map((id) => toToken(id)).filter(Boolean)));

export interface NormalizedParentStudentLink {
  parentId: string;
  studentIds: string[];
}

export const normalizeParentStudentLink = (
  link: ParentStudentLinkRecord | null | undefined,
): NormalizedParentStudentLink => {
  const parentId = toToken(link?.parentId);
  const studentIds = uniqIds([
    ...(Array.isArray(link?.studentIds) ? link.studentIds : []),
    toToken(link?.studentId),
  ]);

  return {
    parentId,
    studentIds,
  };
};

export const getParentStudentIds = (
  links: ParentStudentLinkRecord[] | null | undefined,
  parentId: string | null | undefined,
): string[] => {
  const normalizedParentId = toToken(parentId);
  if (!normalizedParentId || !Array.isArray(links)) return [];

  const studentIds: string[] = [];
  for (const link of links) {
    const normalized = normalizeParentStudentLink(link);
    if (normalized.parentId !== normalizedParentId) continue;
    studentIds.push(...normalized.studentIds);
  }

  return uniqIds(studentIds);
};

export const canParentAccessStudent = (
  links: ParentStudentLinkRecord[] | null | undefined,
  parentId: string | null | undefined,
  studentId: string | null | undefined,
): boolean => {
  const normalizedStudentId = toToken(studentId);
  if (!normalizedStudentId) return false;

  return getParentStudentIds(links, parentId).includes(normalizedStudentId);
};

export const filterStudentIdsByParentAccess = (
  links: ParentStudentLinkRecord[] | null | undefined,
  parentId: string | null | undefined,
  studentIds: string[] | null | undefined,
): string[] => {
  if (!Array.isArray(studentIds) || studentIds.length === 0) return [];

  const allowedStudentIdSet = new Set(getParentStudentIds(links, parentId));
  if (allowedStudentIdSet.size === 0) return [];

  return uniqIds(studentIds).filter((studentId) =>
    allowedStudentIdSet.has(studentId),
  );
};
