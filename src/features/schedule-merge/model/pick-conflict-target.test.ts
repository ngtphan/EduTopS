import { describe, expect, it } from "vitest";
import { pickConflictTarget } from "./pick-conflict-target";

describe("pickConflictTarget", () => {
  it("prioritizes approved schedule over pending when conflict exists", () => {
    const target = pickConflictTarget([
      { id: "sch_pending", createdAt: 2, approval: { status: "pending" } },
      { id: "sch_approved", createdAt: 10, approval: { status: "approved" } },
    ]);

    expect(target?.id).toBe("sch_approved");
  });

  it("falls back to oldest createdAt for same status", () => {
    const target = pickConflictTarget([
      { id: "sch_new", createdAt: 100, approval: { status: "pending" } },
      { id: "sch_old", createdAt: 10, approval: { status: "pending" } },
    ]);

    expect(target?.id).toBe("sch_old");
  });
});
