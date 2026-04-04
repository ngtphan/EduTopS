import { describe, expect, it } from "vitest";
import {
  getScheduleTeacherIds,
  isTeacherAssignedToSchedule,
  normalizeScheduleTeachers,
} from "./teacher-assignment";

describe("schedule teacher assignment", () => {
  it("normalizes unique teacher list with stable owner", () => {
    const normalized = normalizeScheduleTeachers(
      {
        teacherId: "gv_01",
        coTeacherIds: ["gv_02", "gv_01", "", "gv_03"],
      },
      "gv_99",
    );

    expect(normalized.teacherId).toBe("gv_01");
    expect(normalized.coTeacherIds).toEqual(["gv_02", "gv_03", "gv_99"]);
    expect(normalized.teacherIds).toEqual(["gv_01", "gv_02", "gv_03", "gv_99"]);
  });

  it("detects assigned teacher from both primary and co-teacher fields", () => {
    const schedule = {
      teacherId: "gv_a",
      coTeacherIds: ["gv_b"],
    };

    expect(isTeacherAssignedToSchedule(schedule, "gv_a")).toBe(true);
    expect(isTeacherAssignedToSchedule(schedule, "gv_b")).toBe(true);
    expect(isTeacherAssignedToSchedule(schedule, "gv_c")).toBe(false);
    expect(getScheduleTeacherIds(schedule)).toEqual(["gv_a", "gv_b"]);
  });
});
