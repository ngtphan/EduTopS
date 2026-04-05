import { describe, expect, it } from "vitest";
import {
  createAccessContextSnapshot,
  shouldResetAccessScopedCache,
} from "./access-context";

describe("access context snapshot", () => {
  it("keeps parent student scope deduped and sorted", () => {
    const snapshot = createAccessContextSnapshot({
      role: "parent",
      userId: " p_01 ",
      parentStudentIds: ["hs_02", "hs_01", "hs_02", ""],
    });

    expect(snapshot.role).toBe("parent");
    expect(snapshot.userId).toBe("p_01");
    expect(snapshot.parentStudentIds).toEqual(["hs_01", "hs_02"]);
  });

  it("does not treat parent list order changes as new scope", () => {
    const previous = createAccessContextSnapshot({
      role: "parent",
      userId: "p_01",
      parentStudentIds: ["hs_01", "hs_02"],
    });
    const next = createAccessContextSnapshot({
      role: "parent",
      userId: "p_01",
      parentStudentIds: ["hs_02", "hs_01"],
    });

    expect(shouldResetAccessScopedCache(previous, next)).toBe(false);
  });

  it("forces cache reset when switching parent to teacher", () => {
    const parentState = createAccessContextSnapshot({
      role: "parent",
      userId: "p_01",
      parentStudentIds: ["hs_01"],
    });
    const teacherState = createAccessContextSnapshot({
      role: "teacher",
      userId: "t_01",
      parentStudentIds: ["hs_01", "hs_02"],
    });

    expect(teacherState.parentStudentIds).toEqual([]);
    expect(shouldResetAccessScopedCache(parentState, teacherState)).toBe(true);
  });

  it("forces cache reset when switching teacher to admin", () => {
    const teacherState = createAccessContextSnapshot({
      role: "teacher",
      userId: "t_01",
    });
    const adminState = createAccessContextSnapshot({
      role: "admin",
      userId: "a_01",
    });

    expect(shouldResetAccessScopedCache(teacherState, adminState)).toBe(true);
  });
});
