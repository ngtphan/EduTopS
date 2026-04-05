import { describe, expect, it } from "vitest";
import {
  canParentAccessStudent,
  filterStudentIdsByParentAccess,
  getParentStudentIds,
  normalizeParentStudentLink,
} from "./student-access";

describe("parent student access", () => {
  it("normalizes parent-student link with dedupe and fallback studentId", () => {
    const normalized = normalizeParentStudentLink({
      parentId: " ph_01 ",
      studentIds: ["hs_01", "", "hs_02", "hs_01"],
      studentId: " hs_03 ",
    });

    expect(normalized.parentId).toBe("ph_01");
    expect(normalized.studentIds).toEqual(["hs_01", "hs_02", "hs_03"]);
  });

  it("merges all linked students for a parent with stable unique order", () => {
    const links = [
      { parentId: "ph_01", studentIds: ["hs_01", "hs_02"] },
      { parentId: "ph_02", studentIds: ["hs_99"] },
      { parentId: "ph_01", studentIds: ["hs_02", "hs_03"] },
      { parentId: "ph_01", studentId: "hs_04" },
      { parentId: "", studentIds: ["hs_07"] },
    ];

    expect(getParentStudentIds(links, "ph_01")).toEqual([
      "hs_01",
      "hs_02",
      "hs_03",
      "hs_04",
    ]);
  });

  it("checks parent access strictly by linked student ids", () => {
    const links = [{ parentId: "ph_01", studentIds: ["hs_01", "hs_02"] }];

    expect(canParentAccessStudent(links, "ph_01", "hs_02")).toBe(true);
    expect(canParentAccessStudent(links, "ph_01", "hs_99")).toBe(false);
    expect(canParentAccessStudent(links, "ph_02", "hs_01")).toBe(false);
    expect(canParentAccessStudent(links, "ph_01", "")).toBe(false);
  });

  it("filters requested student ids to only allowed ones", () => {
    const links = [
      { parentId: "ph_01", studentIds: ["hs_01", "hs_02", "hs_03"] },
    ];

    expect(
      filterStudentIdsByParentAccess(links, "ph_01", [
        "hs_03",
        "hs_99",
        "hs_01",
        "hs_03",
      ]),
    ).toEqual(["hs_03", "hs_01"]);

    expect(
      filterStudentIdsByParentAccess(links, "ph_02", ["hs_01", "hs_02"]),
    ).toEqual([]);
  });
});
