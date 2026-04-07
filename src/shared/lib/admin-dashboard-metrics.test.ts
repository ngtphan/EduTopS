import { describe, expect, it } from "vitest";
import { buildAdminDashboardMetrics } from "./admin-dashboard-metrics";

describe("admin dashboard metrics", () => {
  it("computes weekly metrics, top teachers, and alert severity", () => {
    const metrics = buildAdminDashboardMetrics({
      weekToken: "2026-W14",
      now: Date.parse("2026-04-06T00:00:00.000Z"),
      getDurationHours: (startTime, endTime) => {
        const start = String(startTime || "");
        const end = String(endTime || "");
        if (start === "08:00" && end === "09:30") return 1.5;
        if (start === "10:00" && end === "11:30") return 1.5;
        if (start === "13:30" && end === "15:00") return 1.5;
        return 1;
      },
      db: {
        subjects: [{ id: "s1" }, { id: "s2" }],
        teachers: [{ id: "t1" }, { id: "t2" }, { id: "t3" }],
        students: [{ id: "hs1" }, { id: "hs2" }, { id: "hs3" }],
        classes: [{ id: "c1" }, { id: "c2" }],
        accounts: [
          { id: "a1", role: "teacher" },
          { id: "a2", role: "teacher" },
          { id: "a3", role: "admin" },
          { id: "a4", role: "parent" },
        ],
        schedules: [
          {
            id: "sch_1",
            week: "2026-W14",
            classId: "c1",
            teacherId: "t1",
            coTeacherIds: ["t2"],
            startTime: "08:00",
            endTime: "09:30",
            approval: { status: "approved" },
            attendance: { status: "present" },
          },
          {
            id: "sch_2",
            week: "2026-W14",
            classId: "c2",
            teacherId: "t1",
            startTime: "10:00",
            endTime: "11:30",
            approval: { status: "pending" },
          },
          {
            id: "sch_3",
            week: "2026-W14",
            classId: "c1",
            teacherId: "t2",
            startTime: "13:30",
            endTime: "15:00",
            approval: { status: "approved" },
            attendance: { status: "absent" },
          },
          {
            id: "sch_4",
            week: "2026-W14",
            classId: "c2",
            teacherId: "t3",
            approval: { status: "rejected" },
          },
          {
            id: "sch_legacy",
            week: "2026-W13",
            classId: "c2",
            teacherId: "t3",
            approval: { status: "approved" },
          },
        ],
        attendanceRequests: [
          { id: "ar_1", status: "pending", attendanceDate: "2026-04-02" },
          { id: "ar_2", status: "pending", attendanceDate: "2026-04-05" },
          { id: "ar_3", status: "approved", attendanceDate: "2026-04-04" },
          { id: "ar_4", status: "rejected", attendanceDate: "2026-04-03" },
        ],
      },
      accessDeniedEvents: [
        { action: "schedule.edit", reason: "role_forbidden" },
        { action: "schedule.edit", reason: "role_forbidden" },
        { action: "eval.submit", reason: "parent_read_only" },
      ],
    });

    expect(metrics.totals).toEqual({
      subjects: 2,
      teachers: 3,
      students: 3,
      classes: 2,
      accounts: 4,
      teacherAccounts: 2,
      adminAccounts: 1,
      parentAccounts: 1,
      otherAccounts: 0,
    });

    expect(metrics.week.schedulesTotal).toBe(4);
    expect(metrics.week.schedulesApproved).toBe(2);
    expect(metrics.week.schedulesPending).toBe(1);
    expect(metrics.week.schedulesRejected).toBe(1);
    expect(metrics.week.plannedHours).toBe(3);
    expect(metrics.week.activeTeachers).toBe(2);
    expect(metrics.week.activeClasses).toBe(2);

    expect(metrics.week.approvalCompletionPercent).toBe(75);
    expect(metrics.week.attendanceCompletionPercent).toBe(100);
    expect(metrics.week.attendancePresentPercent).toBe(50);

    expect(metrics.week.topTeachers[0]).toEqual({
      teacherId: "t1",
      totalSessions: 2,
      totalHours: 3,
    });

    expect(metrics.attendanceRequests).toEqual({
      pending: 2,
      approved: 1,
      rejected: 1,
      overduePending: 1,
      total: 4,
      backlogRatePercent: 50,
    });

    expect(metrics.security).toEqual({
      denyTotal: 3,
      denyDistinctActions: 2,
      denyDistinctReasons: 2,
    });

    expect(metrics.coverage.teacherAccountCoveragePercent).toBeCloseTo(
      66.67,
      1,
    );
    expect(metrics.coverage.classActivationPercent).toBe(100);
    expect(metrics.health.score).toBeGreaterThan(0);
    expect(metrics.health.level.length).toBeGreaterThan(0);

    expect(metrics.alerts[0]).toEqual({
      key: "schedule_pending",
      severity: "warning",
      message: "1 ca đang chờ duyệt trong tuần hiện tại.",
    });

    expect(metrics.actions[0]?.key).toBe("review_schedule");
  });

  it("returns healthy info alert when no operational issues", () => {
    const metrics = buildAdminDashboardMetrics({
      weekToken: "2026-W14",
      db: {
        schedules: [],
        attendanceRequests: [],
      },
      accessDeniedEvents: [],
    });

    expect(metrics.alerts).toEqual([
      {
        key: "healthy",
        severity: "info",
        message: "Không có cảnh báo vận hành trọng yếu trong phiên hiện tại.",
      },
    ]);
  });
});
