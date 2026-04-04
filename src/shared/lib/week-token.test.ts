import { describe, expect, it } from "vitest";
import {
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
    expect(isIsoWeekToken("2026-W54")).toBe(false);
  });

  it("formats normalized week labels", () => {
    expect(formatWeekTokenLabel("2026-W04")).toBe("Tuần 4, 2026");
  });

  it("derives ISO week from date token", () => {
    expect(toIsoWeekTokenFromDateToken("2026-04-04")).toBe("2026-W14");
  });
});
