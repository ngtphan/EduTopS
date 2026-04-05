export type AppRole = "admin" | "teacher" | "parent";

export interface ParentStudentLinkRecord {
  id?: string;
  parentId?: string;
  studentId?: string;
  studentIds?: string[];
  createdAt?: number;
  updatedAt?: number;
}
