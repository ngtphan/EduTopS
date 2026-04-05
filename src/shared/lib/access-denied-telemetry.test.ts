import { describe, expect, it } from "vitest";
import {
  appendAccessDeniedEvent,
  createAccessDeniedEvent,
  shouldDedupeAccessDeniedEvent,
} from "./access-denied-telemetry";

describe("access denied telemetry", () => {
  it("normalizes event fields and keeps only primitive details", () => {
    const event = createAccessDeniedEvent({
      action: " schedule.view ",
      reason: "forbidden",
      resourceType: "schedule",
      resourceId: 123,
      role: " parent ",
      userId: " u_01 ",
      details: {
        keepText: "ok",
        keepBool: true,
        keepNull: null,
        ignoreObj: { nested: true },
      },
      at: 1000,
    });

    expect(event.action).toBe("schedule.view");
    expect(event.resourceId).toBe("123");
    expect(event.role).toBe("parent");
    expect(event.userId).toBe("u_01");
    expect(event.details).toEqual({
      keepBool: true,
      keepNull: null,
      keepText: "ok",
    });
  });

  it("dedupes only same fingerprint events in dedupe window", () => {
    const previous = createAccessDeniedEvent({
      action: "eval.open",
      reason: "forbidden",
      resourceType: "schedule",
      resourceId: "sch_01",
      role: "parent",
      userId: "p_01",
      at: 5000,
    });

    const duplicate = createAccessDeniedEvent({
      action: "eval.open",
      reason: "forbidden",
      resourceType: "schedule",
      resourceId: "sch_01",
      role: "parent",
      userId: "p_01",
      at: 5600,
    });

    const different = createAccessDeniedEvent({
      action: "eval.open",
      reason: "forbidden",
      resourceType: "schedule",
      resourceId: "sch_99",
      role: "parent",
      userId: "p_01",
      at: 5600,
    });

    expect(shouldDedupeAccessDeniedEvent(previous, duplicate)).toBe(true);
    expect(shouldDedupeAccessDeniedEvent(previous, different)).toBe(false);
  });

  it("keeps only latest events within cap", () => {
    const e1 = createAccessDeniedEvent({
      action: "a1",
      reason: "r",
      resourceType: "s",
      at: 1,
    });
    const e2 = createAccessDeniedEvent({
      action: "a2",
      reason: "r",
      resourceType: "s",
      at: 2,
    });
    const e3 = createAccessDeniedEvent({
      action: "a3",
      reason: "r",
      resourceType: "s",
      at: 3,
    });

    const withE1 = appendAccessDeniedEvent([], e1, 2);
    const withE2 = appendAccessDeniedEvent(withE1, e2, 2);
    const withE3 = appendAccessDeniedEvent(withE2, e3, 2);

    expect(withE3.map((item) => item.action)).toEqual(["a2", "a3"]);
  });
});
