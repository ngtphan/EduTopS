import { normalizeScheduleApprovalStatus } from "@/entities/schedule/model/approval";
import { getScheduleTeacherIds } from "@/entities/schedule/model/teacher-assignment";
import type { ScheduleRecord } from "@/shared/types/schedule";
import { normalizeWeekToken } from "@/shared/lib/week-token";

type Primitive = string | number | boolean | null | undefined;

type AttendanceRequestLike = {
  id?: Primitive;
  status?: Primitive;
  attendanceDate?: Primitive;
};

type AccountLike = {
  id?: Primitive;
  role?: Primitive;
};

type DataShape = {
  subjects?: unknown[];
  teachers?: unknown[];
  students?: unknown[];
  classes?: unknown[];
  schedules?: ScheduleRecord[];
  accounts?: AccountLike[];
  attendanceRequests?: AttendanceRequestLike[];
};

type AccessDeniedEventLike = {
  action?: Primitive;
  reason?: Primitive;
};

type BuildMetricsOptions = {
  weekToken: string;
  db: DataShape;
  accessDeniedEvents?: AccessDeniedEventLike[];
  getDurationHours?: (startTime: Primitive, endTime: Primitive) => number;
  now?: number;
};

type TopTeacherWorkload = {
  teacherId: string;
  totalSessions: number;
  totalHours: number;
};

type DashboardAlert = {
  key: string;
  severity: "info" | "warning" | "critical";
  message: string;
};

type DashboardActionItem = {
  key: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
};

const toToken = (value: unknown): string =>
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean"
    ? String(value).trim()
    : "";

const toValidDateTimestamp = (value: unknown): number => {
  const token = toToken(value);
  if (!token) return 0;
  const timestamp = Date.parse(token);
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const toAttendanceRequestStatus = (
  value: unknown,
): "pending" | "approved" | "rejected" => {
  const token = toToken(value);
  if (token === "approved") return "approved";
  if (token === "rejected") return "rejected";
  return "pending";
};

const countDistinctBy = (values: unknown[]): number => {
  return new Set(values.map((value) => toToken(value)).filter(Boolean)).size;
};

const toPercent = (numerator: number, denominator: number): number => {
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator <= 0
  ) {
    return 0;
  }
  return Math.max(0, Math.min(100, (numerator / denominator) * 100));
};

export const buildAdminDashboardMetrics = ({
  weekToken,
  db,
  accessDeniedEvents = [],
  getDurationHours,
  now = Date.now(),
}: BuildMetricsOptions) => {
  const normalizedWeek = normalizeWeekToken(weekToken);
  const schedules = Array.isArray(db?.schedules) ? db.schedules : [];
  const weekSchedules = normalizedWeek
    ? schedules.filter(
        (schedule) =>
          normalizeWeekToken(toToken(schedule?.week)) === normalizedWeek,
      )
    : [];

  let weekApproved = 0;
  let weekPending = 0;
  let weekRejected = 0;

  let approvedAttendancePresent = 0;
  let approvedAttendanceAbsent = 0;
  let approvedAttendancePending = 0;
  let weekPlannedHours = 0;

  const durationResolver =
    typeof getDurationHours === "function" ? getDurationHours : () => 0;

  const teacherWorkload = new Map<string, TopTeacherWorkload>();

  weekSchedules.forEach((schedule) => {
    const approvalStatus = normalizeScheduleApprovalStatus(schedule);
    if (approvalStatus === "approved") weekApproved += 1;
    if (approvalStatus === "pending") weekPending += 1;
    if (approvalStatus === "rejected") weekRejected += 1;

    const durationHours = Number(
      durationResolver(schedule?.startTime, schedule?.endTime) || 0,
    );

    const shouldCountTeacherWorkload =
      approvalStatus === "approved" || approvalStatus === "pending";
    if (shouldCountTeacherWorkload) {
      getScheduleTeacherIds(schedule).forEach((teacherIdRaw) => {
        const teacherId = toToken(teacherIdRaw);
        if (!teacherId) return;

        const current = teacherWorkload.get(teacherId) || {
          teacherId,
          totalSessions: 0,
          totalHours: 0,
        };

        current.totalSessions += 1;
        if (Number.isFinite(durationHours) && durationHours > 0) {
          current.totalHours += durationHours;
        }

        teacherWorkload.set(teacherId, current);
      });
    }

    if (approvalStatus !== "approved") return;

    const attendanceStatus = toToken(schedule?.attendance?.status) || "pending";
    if (attendanceStatus === "present") {
      approvedAttendancePresent += 1;
    } else if (attendanceStatus === "absent") {
      approvedAttendanceAbsent += 1;
    } else {
      approvedAttendancePending += 1;
    }

    if (Number.isFinite(durationHours) && durationHours > 0) {
      weekPlannedHours += durationHours;
    }
  });

  const sortedTopTeachers = Array.from(teacherWorkload.values())
    .sort((left, right) => {
      const bySessions = right.totalSessions - left.totalSessions;
      if (bySessions !== 0) return bySessions;
      return right.totalHours - left.totalHours;
    })
    .slice(0, 5);

  const attendanceRequests = Array.isArray(db?.attendanceRequests)
    ? db.attendanceRequests
    : [];

  let attendanceRequestPending = 0;
  let attendanceRequestApproved = 0;
  let attendanceRequestRejected = 0;
  let attendanceRequestOverdue = 0;

  attendanceRequests.forEach((request) => {
    const status = toAttendanceRequestStatus(request?.status);
    if (status === "pending") attendanceRequestPending += 1;
    if (status === "approved") attendanceRequestApproved += 1;
    if (status === "rejected") attendanceRequestRejected += 1;

    if (status !== "pending") return;
    const attendanceDateTs = toValidDateTimestamp(request?.attendanceDate);
    if (!attendanceDateTs) return;

    const overdueMs = Number(now) - attendanceDateTs;
    const overdueDays = overdueMs / (24 * 60 * 60 * 1000);
    if (overdueDays >= 2) {
      attendanceRequestOverdue += 1;
    }
  });

  const accounts = Array.isArray(db?.accounts) ? db.accounts : [];
  const teacherAccountsCount = accounts.filter(
    (account) => toToken(account?.role) === "teacher",
  ).length;
  const adminAccountsCount = accounts.filter(
    (account) => toToken(account?.role) === "admin",
  ).length;
  const parentAccountsCount = accounts.filter(
    (account) => toToken(account?.role) === "parent",
  ).length;
  const unknownAccountsCount = Math.max(
    0,
    accounts.length -
      teacherAccountsCount -
      adminAccountsCount -
      parentAccountsCount,
  );

  const denyTotal = Array.isArray(accessDeniedEvents)
    ? accessDeniedEvents.length
    : 0;
  const denyDistinctActions = countDistinctBy(
    (accessDeniedEvents || []).map((eventItem) => eventItem?.action),
  );
  const denyDistinctReasons = countDistinctBy(
    (accessDeniedEvents || []).map((eventItem) => eventItem?.reason),
  );

  const approvedAttendanceCompleted =
    approvedAttendancePresent + approvedAttendanceAbsent;

  const approvalProcessedCount = weekApproved + weekRejected;
  const approvalCompletionPercent = toPercent(
    approvalProcessedCount,
    weekSchedules.length,
  );
  const attendanceCompletionPercent = toPercent(
    approvedAttendanceCompleted,
    weekApproved,
  );
  const attendancePresentPercent = toPercent(
    approvedAttendancePresent,
    approvedAttendanceCompleted,
  );
  const schedulePendingRatePercent = toPercent(
    weekPending,
    weekSchedules.length,
  );
  const scheduleRejectedRatePercent = toPercent(
    weekRejected,
    weekSchedules.length,
  );
  const attendanceBacklogRatePercent = toPercent(
    attendanceRequestPending,
    attendanceRequests.length,
  );
  const teacherAccountCoveragePercent = toPercent(
    teacherAccountsCount,
    Array.isArray(db?.teachers) ? db.teachers.length : 0,
  );
  const classActivationPercent = toPercent(
    countDistinctBy(weekSchedules.map((item) => item?.classId)),
    Array.isArray(db?.classes) ? db.classes.length : 0,
  );

  const denyRiskPenalty = Math.min(18, denyTotal * 1.2);
  const overdueRiskPenalty = Math.min(22, attendanceRequestOverdue * 4);
  const scoreRaw =
    100 -
    schedulePendingRatePercent * 0.34 -
    scheduleRejectedRatePercent * 0.23 -
    attendanceBacklogRatePercent * 0.2 -
    denyRiskPenalty -
    overdueRiskPenalty;
  const healthScore = Math.max(0, Math.min(100, Math.round(scoreRaw)));
  const healthLevel =
    healthScore >= 85
      ? "Ổn định"
      : healthScore >= 70
        ? "Cần theo dõi"
        : healthScore >= 50
          ? "Rủi ro trung bình"
          : "Rủi ro cao";

  const alerts: DashboardAlert[] = [];

  if (weekPending > 0) {
    alerts.push({
      key: "schedule_pending",
      severity: weekPending >= 8 ? "critical" : "warning",
      message: `${weekPending} ca đang chờ duyệt trong tuần hiện tại.`,
    });
  }

  if (attendanceRequestOverdue > 0) {
    alerts.push({
      key: "attendance_overdue",
      severity: attendanceRequestOverdue >= 5 ? "critical" : "warning",
      message: `${attendanceRequestOverdue} yêu cầu chấm công chờ xử lý quá 2 ngày.`,
    });
  }

  if (denyTotal >= 10) {
    alerts.push({
      key: "security_deny_spike",
      severity: denyTotal >= 20 ? "critical" : "warning",
      message: `Deny event đang tăng (${denyTotal} sự kiện trong phiên).`,
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      key: "healthy",
      severity: "info",
      message: "Không có cảnh báo vận hành trọng yếu trong phiên hiện tại.",
    });
  }

  const actions: DashboardActionItem[] = [];

  if (weekPending > 0) {
    actions.push({
      key: "review_schedule",
      severity: weekPending >= 8 ? "critical" : "warning",
      title: "Duyệt lịch dạy tồn đọng",
      detail: `${weekPending} ca đang chờ duyệt trong tuần hiện tại.`,
    });
  }

  if (attendanceRequestOverdue > 0) {
    actions.push({
      key: "review_attendance_backlog",
      severity: attendanceRequestOverdue >= 5 ? "critical" : "warning",
      title: "Xử lý chấm công quá hạn",
      detail: `${attendanceRequestOverdue} yêu cầu chấm công đã quá 2 ngày.`,
    });
  }

  if (teacherAccountCoveragePercent < 85) {
    actions.push({
      key: "teacher_account_coverage",
      severity: teacherAccountCoveragePercent < 70 ? "warning" : "info",
      title: "Bổ sung tài khoản giáo viên",
      detail: `Độ phủ tài khoản giáo viên mới đạt ${Math.round(teacherAccountCoveragePercent)}%.`,
    });
  }

  if (actions.length === 0) {
    actions.push({
      key: "healthy_watch",
      severity: "info",
      title: "Vận hành ổn định",
      detail: "Không có hạng mục ưu tiên cao cần can thiệp ngay.",
    });
  }

  return {
    totals: {
      subjects: Array.isArray(db?.subjects) ? db.subjects.length : 0,
      teachers: Array.isArray(db?.teachers) ? db.teachers.length : 0,
      students: Array.isArray(db?.students) ? db.students.length : 0,
      classes: Array.isArray(db?.classes) ? db.classes.length : 0,
      accounts: Array.isArray(db?.accounts) ? db.accounts.length : 0,
      teacherAccounts: teacherAccountsCount,
      adminAccounts: adminAccountsCount,
      parentAccounts: parentAccountsCount,
      otherAccounts: unknownAccountsCount,
    },
    week: {
      token: normalizedWeek,
      schedulesTotal: weekSchedules.length,
      schedulesApproved: weekApproved,
      schedulesPending: weekPending,
      schedulesRejected: weekRejected,
      plannedHours: Number(weekPlannedHours.toFixed(2)),
      activeTeachers: teacherWorkload.size,
      activeClasses: countDistinctBy(
        weekSchedules.map((item) => item?.classId),
      ),
      approvalCompletionPercent,
      attendanceCompletionPercent,
      attendancePresentPercent,
      approvedAttendancePresent,
      approvedAttendanceAbsent,
      approvedAttendancePending,
      topTeachers: sortedTopTeachers,
      schedulePendingRatePercent,
      scheduleRejectedRatePercent,
    },
    attendanceRequests: {
      pending: attendanceRequestPending,
      approved: attendanceRequestApproved,
      rejected: attendanceRequestRejected,
      overduePending: attendanceRequestOverdue,
      total: attendanceRequests.length,
      backlogRatePercent: attendanceBacklogRatePercent,
    },
    security: {
      denyTotal,
      denyDistinctActions,
      denyDistinctReasons,
    },
    coverage: {
      teacherAccountCoveragePercent,
      classActivationPercent,
    },
    health: {
      score: healthScore,
      level: healthLevel,
    },
    alerts,
    actions,
  };
};
