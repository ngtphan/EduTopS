import { describe, expect, it } from "vitest";
import { getParentStudentIds } from "@/entities/parent/model/student-access";
import { canParentAccessSchedule } from "./access";
import {
  createAccessContextSnapshot,
  shouldResetAccessScopedCache,
} from "./access-context";

describe("runtime role-switch with realtime snapshots", () => {
  it("requires cache reset when parent links change from realtime accounts snapshot", () => {
    const parentId = "parent_01";
    const scheduleA = { classId: "cls_01", studentIds: ["hs_01"] };
    const scheduleB = { classId: "cls_02", studentIds: ["hs_02"] };

    const snapshotAParentStudentIds = getParentStudentIds(
      [
        {
          parentId,
          studentIds: ["hs_01"],
        },
      ],
      parentId,
    );

    const contextA = createAccessContextSnapshot({
      role: "parent",
      userId: parentId,
      parentStudentIds: snapshotAParentStudentIds,
    });

    expect(
      canParentAccessSchedule({
        schedule: scheduleA,
        parentStudentIds: contextA.parentStudentIds,
      }),
    ).toBe(true);

    const snapshotBParentStudentIds = getParentStudentIds(
      [
        {
          parentId,
          studentIds: ["hs_02"],
        },
      ],
      parentId,
    );

    const contextB = createAccessContextSnapshot({
      role: "parent",
      userId: parentId,
      parentStudentIds: snapshotBParentStudentIds,
    });

    expect(shouldResetAccessScopedCache(contextA, contextB)).toBe(true);
    expect(
      canParentAccessSchedule({
        schedule: scheduleA,
        parentStudentIds: contextB.parentStudentIds,
      }),
    ).toBe(false);
    expect(
      canParentAccessSchedule({
        schedule: scheduleB,
        parentStudentIds: contextB.parentStudentIds,
      }),
    ).toBe(true);
  });

  it("requires reset when switching teacher -> parent -> admin", () => {
    const teacherContext = createAccessContextSnapshot({
      role: "teacher",
      userId: "teacher_01",
      parentStudentIds: ["hs_01"],
    });

    const parentContext = createAccessContextSnapshot({
      role: "parent",
      userId: "parent_01",
      parentStudentIds: ["hs_10", "hs_11"],
    });

    const adminContext = createAccessContextSnapshot({
      role: "admin",
      userId: "admin_01",
      parentStudentIds: ["hs_10"],
    });

    expect(shouldResetAccessScopedCache(teacherContext, parentContext)).toBe(
      true,
    );
    expect(shouldResetAccessScopedCache(parentContext, adminContext)).toBe(
      true,
    );
    expect(adminContext.parentStudentIds).toEqual([]);
  });
});
