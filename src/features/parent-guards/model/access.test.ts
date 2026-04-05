import { describe, expect, it } from "vitest";
import {
  canParentAccessAttendanceRequest,
  canParentAccessSchedule,
  filterSchedulesForParentAccess,
  getScheduleStudentIdsForAccess,
} from "./access";

describe("parent access guards", () => {
  it("gets explicit schedule student ids with dedupe", () => {
    const schedule = {
      classId: "cls_01",
      studentIds: ["hs_01", "", "hs_02", "hs_01"],
    };

    expect(getScheduleStudentIdsForAccess(schedule)).toEqual([
      "hs_01",
      "hs_02",
    ]);
  });

  it("falls back to class students when schedule does not embed student ids", () => {
    const schedule = { classId: "cls_01", studentIds: [] };
    const resolver = (classId: string) =>
      classId === "cls_01" ? ["hs_10", "hs_11", "hs_10"] : [];

    expect(getScheduleStudentIdsForAccess(schedule, resolver)).toEqual([
      "hs_10",
      "hs_11",
    ]);
  });

  it("allows parent to access schedule only when linked students intersect", () => {
    const schedule = { classId: "cls_01", studentIds: ["hs_01", "hs_02"] };

    expect(
      canParentAccessSchedule({
        schedule,
        parentStudentIds: ["hs_02", "hs_99"],
      }),
    ).toBe(true);

    expect(
      canParentAccessSchedule({
        schedule,
        parentStudentIds: ["hs_90", "hs_91"],
      }),
    ).toBe(false);
  });

  it("filters schedules by parent visibility with class fallback", () => {
    const schedules = [
      { id: "sch_01", classId: "cls_01", studentIds: ["hs_01"] },
      { id: "sch_02", classId: "cls_02", studentIds: [] },
      { id: "sch_03", classId: "cls_03", studentIds: ["hs_09"] },
    ];

    const visible = filterSchedulesForParentAccess(
      schedules,
      ["hs_01", "hs_05"],
      (classId) => (classId === "cls_02" ? ["hs_05"] : []),
    );

    expect(visible.map((item) => item.id)).toEqual(["sch_01", "sch_02"]);
  });

  it("checks attendance visibility by teaching student overlap", () => {
    expect(
      canParentAccessAttendanceRequest({
        parentStudentIds: ["hs_01", "hs_02"],
        teachingStudentIds: ["hs_03", "hs_02"],
      }),
    ).toBe(true);

    expect(
      canParentAccessAttendanceRequest({
        parentStudentIds: ["hs_01"],
        teachingStudentIds: ["hs_03"],
      }),
    ).toBe(false);
  });
});
