import { describe, expect, it } from "vitest";

import {
  formatCutoffDate,
  sportScoringDescription,
} from "./scoring-copy";

describe("formatCutoffDate", () => {
  it("formats an ISO date", () => {
    expect(formatCutoffDate("2027-08-07")).toBe("Aug 7, 2027");
  });

  it("falls back on missing or malformed input", () => {
    expect(formatCutoffDate(null)).toBe("the season's cutoff date");
    expect(formatCutoffDate("soon", "later")).toBe("later");
  });
});

describe("sportScoringDescription", () => {
  it("labels cross-year leagues from the season year", () => {
    expect(sportScoringDescription("nhl", 2027, "2027-08-07")).toContain("2026-27");
    expect(sportScoringDescription("epl", 2027, "2027-08-07")).toContain("2026-27");
  });

  it("labels prior-year leagues from the season year", () => {
    expect(sportScoringDescription("nfl", 2027, "2027-08-07")).toContain("2026");
    expect(sportScoringDescription("cfb", 2027, "2027-08-07")).toContain("2026 AP Top 25");
  });

  it("embeds the cutoff date in frozen leagues", () => {
    expect(sportScoringDescription("mlb", 2027, "2027-08-07")).toContain("2027 standings frozen on Aug 7, 2027");
    expect(sportScoringDescription("atp", 2027, "2027-08-07")).toContain("Aug 7, 2027");
  });

  it("rolls every label forward with a new season row", () => {
    expect(sportScoringDescription("nhl", 2028, "2028-08-06")).toContain("2027-28");
    expect(sportScoringDescription("nfl", 2028, "2028-08-06")).toContain("2027");
    expect(sportScoringDescription("mls", 2028, "2028-08-06")).toContain("frozen on Aug 6, 2028");
  });

  it("falls back by metric mode for unknown sports", () => {
    expect(sportScoringDescription("cricket", 2027, "2027-08-07", "live")).toContain("frozen on Aug 7, 2027");
    expect(sportScoringDescription("cricket", 2027, "2027-08-07", "final_prior")).toContain("most recent completed season");
  });
});
