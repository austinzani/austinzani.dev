// Fixture test for the NHL adapter, asserted through the shared adapter
// contract. The fixture is a real /v1/standings/2026-04-17 response
// (2025-26 final standings) trimmed to the fields the transform reads plus
// surrounding structure — no network involved.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { adapterResultSchema } from "../contract.mjs";
import { pickLastCompletedSeason, transformStandings } from "./nhl.mjs";

const fixture = JSON.parse(
  readFileSync(
    new URL("./fixtures/nhl-standings-2026-04-17.json", import.meta.url),
    "utf8",
  ),
);
const FETCHED_FROM = ["https://api-web.nhle.com/v1/standings/2026-04-17"];

describe("nhl adapter transform", () => {
  const result = transformStandings(fixture, FETCHED_FROM);

  it("satisfies the shared adapter contract", () => {
    const parsed = adapterResultSchema.safeParse(result);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    expect(result.sportKey).toBe("nhl");
    expect(result.fetchedFrom).toEqual(FETCHED_FROM);
  });

  it("produces all 32 teams", () => {
    expect(result.entities).toHaveLength(32);
  });

  it("ranks are a unique league-wide 1..32 ordering", () => {
    const ranks = result.entities.map((entity) => entity.rank);
    expect([...new Set(ranks)].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 32 }, (_, i) => i + 1),
    );
  });

  it("metric values (points) never increase down the ordering", () => {
    const byRank = [...result.entities].sort((a, b) => a.rank - b.rank);
    for (let i = 1; i < byRank.length; i++) {
      expect(byRank[i].metricValue).toBeLessThanOrEqual(
        byRank[i - 1].metricValue,
      );
    }
  });

  it("carries a known team with source id and NHL-hosted logo", () => {
    const avalanche = result.entities.find(
      (entity) => entity.name === "Colorado Avalanche",
    );
    expect(avalanche).toBeDefined();
    expect(avalanche.rank).toBe(1);
    expect(avalanche.metricValue).toBe(121);
    expect(avalanche.sourceIds).toEqual({ nhl: "COL" });
    expect(new URL(avalanche.imageUrl).host).toBe("assets.nhle.com");
    expect(result.entities.every((e) => new URL(e.imageUrl).host === "assets.nhle.com")).toBe(true);
  });

  it("rejects a payload with no standings rows", () => {
    expect(() => transformStandings({ standings: [] }, FETCHED_FROM)).toThrow(
      /no standings rows/,
    );
  });
});

describe("nhl last-completed-season derivation", () => {
  const seasons = {
    seasons: [
      { id: 20242025, standingsStart: "2024-10-04", standingsEnd: "2025-04-17" },
      { id: 20252026, standingsStart: "2025-10-07", standingsEnd: "2026-04-17" },
      { id: 20262027, standingsStart: "2026-09-29", standingsEnd: "2027-04-10" },
    ],
  };

  it("mid-offseason picks the season that just finished", () => {
    expect(pickLastCompletedSeason(seasons, "2026-08-28").id).toBe(20252026);
  });

  it("mid-season still picks the prior completed season", () => {
    expect(pickLastCompletedSeason(seasons, "2027-01-15").id).toBe(20252026);
  });

  it("rolls forward the day the next season completes", () => {
    expect(pickLastCompletedSeason(seasons, "2027-04-10").id).toBe(20262027);
  });

  it("throws when no season has completed yet", () => {
    expect(() => pickLastCompletedSeason(seasons, "2024-01-01")).toThrow(
      /no completed season/,
    );
  });
});
