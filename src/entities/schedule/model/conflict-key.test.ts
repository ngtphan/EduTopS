import { describe, expect, it } from "vitest";
import {
  EMPTY_SCHEDULE_CONFLICT_KEY,
  buildScheduleConflictKey,
  hasScheduleConflictIdentity,
  isScheduleConflictKeyEmpty,
} from "./conflict-key";

describe("schedule conflict key", () => {
  it("builds normalized conflict keys from core schedule fields", () => {
    const key = buildScheduleConflictKey({
      week: " 2026-W14 ",
      dayOfWeek: "3",
      startTime: "18:00",
      endTime: "19:30",
      classId: "CLS_A",
      subjectId: "MATH",
      location: " Room 02 ",
    });

    expect(key).toBe("2026-w14|3|18:00|19:30|cls_a|math|room 02");
  });

  it("flags empty conflict keys when all identity fields are missing", () => {
    const emptyKey = buildScheduleConflictKey({});

    expect(emptyKey).toBe(EMPTY_SCHEDULE_CONFLICT_KEY);
    expect(isScheduleConflictKeyEmpty(emptyKey)).toBe(true);
    expect(hasScheduleConflictIdentity({})).toBe(false);
  });

  it("requires all core fields before considering a schedule conflict identity valid", () => {
    expect(hasScheduleConflictIdentity({ week: "2026-W14" })).toBe(false);
    expect(
      hasScheduleConflictIdentity({
        week: "2026-W14",
        dayOfWeek: "2",
        startTime: "18:00",
        endTime: "19:30",
        classId: "cls_a",
        subjectId: "math",
        location: "room_01",
      }),
    ).toBe(true);
  });
});
