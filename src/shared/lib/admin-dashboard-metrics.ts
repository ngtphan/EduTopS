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

const getList = <T>(value: unknown): T[] => (Array.isArray(value) ? value : []);

const toHealthLevel = (healthScore: number): string => {
  if (healthScore >= 85) return "Ổn định";
  if (healthScore >= 70) return "Cần theo dõi";
  if (healthScore >= 50) return "Rủi ro trung bình";
  return "Rủi ro cao";
};

const createTopTeacherWorkload = (teacherId: string): TopTeacherWorkload => ({
  teacherId,
  totalSessions: 0,
  totalHours: 0,
});

const shouldTrackTeacherWorkload = (approvalStatus: string): boolean => {
  return approvalStatus === "approved" || approvalStatus === "pending";
};

const countApprovalStatus = (
  approvalStatus: string,
  counters: {
    weekApproved: number;
    weekPending: number;
    weekRejected: number;
  },
) => {
  if (approvalStatus === "approved") counters.weekApproved += 1;
  if (approvalStatus === "pending") counters.weekPending += 1;
  if (approvalStatus === "rejected") counters.weekRejected += 1;
};

const trackTeacherWorkload = (
  teacherWorkload: Map<string, TopTeacherWorkload>,
  schedule: ScheduleRecord,
  durationHours: number,
) => {
  getScheduleTeacherIds(schedule).forEach((teacherIdRaw) => {
    const teacherId = toToken(teacherIdRaw);
    if (!teacherId) return;

    const current =
      teacherWorkload.get(teacherId) || createTopTeacherWorkload(teacherId);
    current.totalSessions += 1;

    if (Number.isFinite(durationHours) && durationHours > 0) {
      current.totalHours += durationHours;
    }

    teacherWorkload.set(teacherId, current);
  });
};

const countApprovedAttendance = (
  schedule: ScheduleRecord,
  durationHours: number,
  counters: {
    approvedAttendancePresent: number;
    approvedAttendanceAbsent: number;
    approvedAttendancePending: number;
    weekPlannedHours: number;
  },
) => {
  const attendanceStatus = toToken(schedule?.attendance?.status) || "pending";

  if (attendanceStatus === "present") {
    counters.approvedAttendancePresent += 1;
  } else if (attendanceStatus === "absent") {
    counters.approvedAttendanceAbsent += 1;
  } else {
    counters.approvedAttendancePending += 1;
  }

  if (Number.isFinite(durationHours) && durationHours > 0) {
    counters.weekPlannedHours += durationHours;
  }
};

const sortTopTeachers = (
  teacherWorkload: Map<string, TopTeacherWorkload>,
): TopTeacherWorkload[] => {
  return Array.from(teacherWorkload.values())
    .sort((left, right) => {
      const bySessions = right.totalSessions - left.totalSessions;
      if (bySessions !== 0) return bySessions;
      return right.totalHours - left.totalHours;
    })
    .slice(0, 5);
};

const buildAlerts = ({
  weekPending,
  attendanceRequestOverdue,
  denyTotal,
}: {
  weekPending: number;
  attendanceRequestOverdue: number;
  denyTotal: number;
}): DashboardAlert[] => {
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

  return alerts;
};

const buildActions = ({
  weekPending,
  attendanceRequestOverdue,
  teacherAccountCoveragePercent,
}: {
  weekPending: number;
  attendanceRequestOverdue: number;
  teacherAccountCoveragePercent: number;
}): DashboardActionItem[] => {
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

  return actions;
};

export const buildAdminDashboardMetrics = ({
  weekToken,
  db,
  accessDeniedEvents = [],
  getDurationHours,
  now = Date.now(),
}: BuildMetricsOptions) => {
  const normalizedWeek = normalizeWeekToken(weekToken);
  const schedules = getList<ScheduleRecord>(db?.schedules);
  const weekSchedules = normalizedWeek
    ? schedules.filter(
        (schedule) =>
          normalizeWeekToken(toToken(schedule?.week)) === normalizedWeek,
      )
    : [];

  const weekCounters = {
    weekApproved: 0,
    weekPending: 0,
    weekRejected: 0,
  };

  const approvedAttendanceCounters = {
    approvedAttendancePresent: 0,
    approvedAttendanceAbsent: 0,
    approvedAttendancePending: 0,
    weekPlannedHours: 0,
  };

  const durationResolver =
    typeof getDurationHours === "function" ? getDurationHours : () => 0;

  const teacherWorkload = new Map<string, TopTeacherWorkload>();

  weekSchedules.forEach((schedule) => {
    const approvalStatus = normalizeScheduleApprovalStatus(schedule);
    countApprovalStatus(approvalStatus, weekCounters);

    const durationHours = Number(
      durationResolver(schedule?.startTime, schedule?.endTime) || 0,
    );

    if (shouldTrackTeacherWorkload(approvalStatus)) {
      trackTeacherWorkload(teacherWorkload, schedule, durationHours);
    }

    if (approvalStatus === "approved") {
      countApprovedAttendance(
        schedule,
        durationHours,
        approvedAttendanceCounters,
      );
    }
  });

  const sortedTopTeachers = sortTopTeachers(teacherWorkload);

  const attendanceRequests = getList<AttendanceRequestLike>(
    db?.attendanceRequests,
  );

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

  const accounts = getList<AccountLike>(db?.accounts);
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

  const { weekApproved, weekPending, weekRejected } = weekCounters;
  const {
    approvedAttendancePresent,
    approvedAttendanceAbsent,
    approvedAttendancePending,
    weekPlannedHours,
  } = approvedAttendanceCounters;

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
    getList(db?.teachers).length,
  );
  const classActivationPercent = toPercent(
    countDistinctBy(weekSchedules.map((item) => item?.classId)),
    getList(db?.classes).length,
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
  const healthLevel = toHealthLevel(healthScore);
  const alerts = buildAlerts({
    weekPending,
    attendanceRequestOverdue,
    denyTotal,
  });
  const actions = buildActions({
    weekPending,
    attendanceRequestOverdue,
    teacherAccountCoveragePercent,
  });

  return {
    totals: {
      subjects: getList(db?.subjects).length,
      teachers: getList(db?.teachers).length,
      students: getList(db?.students).length,
      classes: getList(db?.classes).length,
      accounts: getList(db?.accounts).length,
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
