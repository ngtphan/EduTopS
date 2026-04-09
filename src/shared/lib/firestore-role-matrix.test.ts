import { describe, expect, it } from "vitest";
import {
  canRoleReadCollection,
  canRoleWriteCollection,
  canRoleWriteCollectionWithOwnership,
  canTeacherOwnAttendanceRequestPayload,
  canTeacherOwnSchedulePayload,
  toSecurityRole,
} from "./firestore-role-matrix";

describe("firestore role matrix", () => {
  it("normalizes unknown role to guest", () => {
    expect(toSecurityRole("admin")).toBe("admin");
    expect(toSecurityRole("teacher")).toBe("teacher");
    expect(toSecurityRole("parent")).toBe("parent");
    expect(toSecurityRole("unknown")).toBe("guest");
  });

  it("allows read for signed-in roles and blocks guest", () => {
    expect(canRoleReadCollection("admin", "accounts")).toBe(true);
    expect(canRoleReadCollection("teacher", "schedules")).toBe(true);
    expect(canRoleReadCollection("parent", "attendanceRequests")).toBe(true);
    expect(canRoleReadCollection("guest", "schedules")).toBe(false);
  });

  it("enforces write matrix before ownership checks", () => {
    expect(canRoleWriteCollection("teacher", "accounts")).toBe(false);
    expect(canRoleWriteCollection("teacher", "schedules")).toBe(true);
    expect(canRoleWriteCollection("parent", "schedules")).toBe(false);
    expect(canRoleWriteCollection("admin", "settings")).toBe(true);
  });

  it("blocks schedule ownership bypass for teacher", () => {
    const bypassPayload = {
      teacherId: "gv_other",
      coTeacherIds: ["gv_other_2"],
      approval: { status: "pending" },
    };

    expect(canTeacherOwnSchedulePayload(bypassPayload, "gv_me")).toBe(false);
    expect(
      canRoleWriteCollectionWithOwnership({
        role: "teacher",
        currentUserId: "gv_me",
        collection: "schedules",
        payload: bypassPayload,
      }),
    ).toBe(false);
  });

  it("allows schedule write when teacher is listed in ownership set", () => {
    const ownPayload = {
      teacherId: "gv_me",
      coTeacherIds: ["gv_assistant"],
      approval: { status: "pending" },
    };

    expect(canTeacherOwnSchedulePayload(ownPayload, "gv_me")).toBe(true);
    expect(
      canRoleWriteCollectionWithOwnership({
        role: "teacher",
        currentUserId: "gv_me",
        collection: "schedules",
        payload: ownPayload,
      }),
    ).toBe(true);
  });

  it("blocks attendance ownership bypass when teacherId is forged", () => {
    const forgedPayload = {
      id: "gv_other_2026-04-07",
      teacherId: "gv_other",
      attendanceDate: "2026-04-07",
      status: "pending",
    };

    expect(canTeacherOwnAttendanceRequestPayload(forgedPayload, "gv_me")).toBe(
      false,
    );
    expect(
      canRoleWriteCollectionWithOwnership({
        role: "teacher",
        currentUserId: "gv_me",
        collection: "attendanceRequests",
        payload: forgedPayload,
      }),
    ).toBe(false);
  });

  it("allows teacher attendance write only for own record", () => {
    const ownPayload = {
      id: "gv_me_2026-04-07",
      teacherId: "gv_me",
      attendanceDate: "2026-04-07",
      status: "pending",
    };

    expect(canTeacherOwnAttendanceRequestPayload(ownPayload, "gv_me")).toBe(
      true,
    );
    expect(
      canRoleWriteCollectionWithOwnership({
        role: "teacher",
        currentUserId: "gv_me",
        collection: "attendanceRequests",
        payload: ownPayload,
      }),
    ).toBe(true);
  });

  it("keeps admin override and denies parent write", () => {
    const payload = { any: "value" };

    expect(
      canRoleWriteCollectionWithOwnership({
        role: "admin",
        currentUserId: "admin_01",
        collection: "accounts",
        payload,
      }),
    ).toBe(true);

    expect(
      canRoleWriteCollectionWithOwnership({
        role: "parent",
        currentUserId: "ph_01",
        collection: "attendanceRequests",
        payload,
      }),
    ).toBe(false);
  });
});
