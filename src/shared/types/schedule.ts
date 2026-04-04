export type ScheduleApprovalStatus = "pending" | "approved" | "rejected";

export interface ScheduleApproval {
  status?: ScheduleApprovalStatus | string | null;
  requestType?: "create" | "edit" | null | string;
  requestedBy?: string;
  requestedAt?: number | null;
  reviewedBy?: string;
  reviewedAt?: number | null;
  note?: string;
  changeRequest?: Record<string, unknown> | null;
}

export interface ScheduleRecord {
  id?: string;
  week?: string;
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  classId?: string;
  subjectId?: string;
  teacherId?: string;
  coTeacherIds?: string[];
  approval?: ScheduleApproval;
  createdAt?: number;
}

export interface ScheduleTeacherFields {
  teacherId: string;
  coTeacherIds: string[];
  teacherIds: string[];
}
