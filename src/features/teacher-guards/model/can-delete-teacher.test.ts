import { describe, expect, it } from "vitest";
import {
  canDeleteTeacher,
  isTeacherReferencedBySchedule,
} from "./can-delete-teacher";

describe("teacher delete guard", () => {
  it("detects teacher references in primary and co-teacher fields", () => {
    const primary = { teacherId: "gv_01", coTeacherIds: ["gv_02"] };
    const coTeacherOnly = { teacherId: "gv_03", coTeacherIds: ["gv_01"] };

    expect(isTeacherReferencedBySchedule(primary, "gv_01")).toBe(true);
    expect(isTeacherReferencedBySchedule(primary, "gv_02")).toBe(true);
    expect(isTeacherReferencedBySchedule(coTeacherOnly, "gv_01")).toBe(true);
    expect(isTeacherReferencedBySchedule(primary, "gv_99")).toBe(false);
  });

  it("prevents deletion when teacher appears in any schedule", () => {
    const schedules = [
      { teacherId: "gv_01", coTeacherIds: ["gv_02"] },
      { teacherId: "gv_03", coTeacherIds: [] },
    ];

    expect(canDeleteTeacher(schedules, "gv_01")).toBe(false);
    expect(canDeleteTeacher(schedules, "gv_02")).toBe(false);
    expect(canDeleteTeacher(schedules, "gv_99")).toBe(true);
  });
});
