export type ScheduleApprovalStatus = "pending" | "approved" | "rejected";

export interface ScheduleApproval {
  status?: string | null;
  requestType?: string | null;
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
  classLabel?: string;
  studentIds?: string[];
  subjectId?: string;
  teacherId?: string;
  coTeacherIds?: string[];
  topic?: string;
  attendance?: Record<string, unknown> | null;
  evaluations?: Record<string, unknown> | null;
  approval?: ScheduleApproval;
  createdAt?: number;
}

export interface ScheduleTeacherFields {
  teacherId: string;
  coTeacherIds: string[];
  teacherIds: string[];
}
