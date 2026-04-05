import { describe, expect, it } from "vitest";
import {
  buildScheduleCompactIdentity,
  groupSchedulesByCompactIdentity,
  summarizeScheduleApprovalForGroup,
} from "./compact-group";
import { getScheduleTeacherIds } from "./teacher-assignment";

describe("schedule compact group model", () => {
  it("builds identity with stable teacher signature order", () => {
    const identity = buildScheduleCompactIdentity(
      {
        dayOfWeek: "2",
        startTime: "18:00",
        endTime: "19:30",
        subjectId: "sub_math",
        location: " Phong 01 ",
      },
      ["gv_b", "gv_a", "gv_b", ""],
    );

    expect(identity).toBe("2|18:00|19:30|sub_math|gv_a,gv_b|phong 01");
  });

  it("groups schedules by compact identity", () => {
    const schedules = [
      {
        id: "sch_02",
        dayOfWeek: "2",
        startTime: "18:00",
        endTime: "19:30",
        subjectId: "sub_math",
        location: "Phong 01",
        teacherId: "gv_b",
        coTeacherIds: ["gv_a"],
      },
      {
        id: "sch_01",
        dayOfWeek: "2",
        startTime: "18:00",
        endTime: "19:30",
        subjectId: "sub_math",
        location: "phong 01",
        teacherId: "gv_a",
        coTeacherIds: ["gv_b"],
      },
      {
        id: "sch_03",
        dayOfWeek: "2",
        startTime: "19:30",
        endTime: "21:00",
        subjectId: "sub_math",
        location: "Phong 01",
        teacherId: "gv_a",
      },
    ];

    const groups = groupSchedulesByCompactIdentity(schedules, (schedule) =>
      buildScheduleCompactIdentity(schedule, getScheduleTeacherIds(schedule)),
    );

    expect(groups).toHaveLength(2);
    expect(groups[0]?.schedules).toHaveLength(2);
    expect(groups[1]?.schedules).toHaveLength(1);
  });

  it("summarizes approval state for grouped schedules", () => {
    const approved = summarizeScheduleApprovalForGroup([
      { approval: { status: "approved" } },
      {},
    ]);
    expect(approved.mode).toBe("approved");
    expect(approved.approved).toBe(2);

    const mixed = summarizeScheduleApprovalForGroup([
      { approval: { status: "approved" } },
      { approval: { status: "pending" } },
      { approval: { status: "rejected" } },
    ]);
    expect(mixed.mode).toBe("mixed");
    expect(mixed.approved).toBe(1);
    expect(mixed.pending).toBe(1);
    expect(mixed.rejected).toBe(1);

    const empty = summarizeScheduleApprovalForGroup([]);
    expect(empty.mode).toBe("empty");
    expect(empty.total).toBe(0);
  });
});
