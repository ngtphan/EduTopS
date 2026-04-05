import { describe, expect, it } from "vitest";
import {
  getWeekDateRangeTokens,
  formatWeekTokenLabel,
  isIsoWeekToken,
  normalizeWeekToken,
  toIsoWeekTokenFromDateToken,
} from "./week-token";

describe("week token helpers", () => {
  it("normalizes single-digit week tokens", () => {
    expect(normalizeWeekToken("2026-W4")).toBe("2026-W04");
  });

  it("rejects invalid week ranges", () => {
    expect(normalizeWeekToken("2026-W00")).toBe("");
    expect(normalizeWeekToken("2026-W54")).toBe("");
    expect(normalizeWeekToken("2021-W53")).toBe("");
    expect(isIsoWeekToken("2026-W54")).toBe(false);
  });

  it("formats normalized week labels", () => {
    expect(formatWeekTokenLabel("2026-W04")).toBe(
      "Từ ngày 19/01/2026 đến ngày 25/01/2026",
    );
  });

  it("returns monday to sunday week range tokens", () => {
    expect(getWeekDateRangeTokens("2026-W01")).toEqual({
      startDateToken: "2025-12-29",
      endDateToken: "2026-01-04",
    });
  });

  it("derives ISO week from date token", () => {
    expect(toIsoWeekTokenFromDateToken("2026-04-04")).toBe("2026-W14");
  });
});
