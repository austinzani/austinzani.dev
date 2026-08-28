// Fixture test for the MLB adapter, asserted through the shared adapter
// contract. The fixture is a real statsapi.mlb.com standings response
// (leagueId=103,104, season 2026, hydrate=team, fetched 2026-08-28) trimmed
// to the fields the transform reads plus surrounding structure — all 30
// teams across all 6 division records, no network involved.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { adapterResultSchema } from "../contract.mjs";
import { deriveMlbSeasonYear, transformStandings } from "./mlb.mjs";

const fixture = JSON.parse(
  readFileSync(
    new URL("./fixtures/mlb-standings-2026-08-28.json", import.meta.url),
    "utf8",
  ),
);
const FETCHED_FROM = [
  "https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=2026&standingsTypes=regularSeason&hydrate=team",
];

describe("mlb adapter transform", () => {
  const result = transformStandings(fixture, FETCHED_FROM);

  it("satisfies the shared adapter contract", () => {
    const parsed = adapterResultSchema.safeParse(result);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    expect(result.sportKey).toBe("mlb");
    expect(result.fetchedFrom).toEqual(FETCHED_FROM);
  });

  it("produces all 30 teams", () => {
    expect(result.entities).toHaveLength(30);
  });

  it("ranks are a unique MLB-wide 1..30 ordering (sportRank)", () => {
    const ranks = result.entities.map((entity) => entity.rank);
    expect([...new Set(ranks)].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 30 }, (_, i) => i + 1),
    );
  });

  it("metric values (winning pct) never increase down the ordering", () => {
    const byRank = [...result.entities].sort((a, b) => a.rank - b.rank);
    for (let i = 1; i < byRank.length; i++) {
      expect(byRank[i].metricValue).toBeLessThanOrEqual(
        byRank[i - 1].metricValue,
      );
    }
  });

  it("every team carries an mlbstatic id-addressed logo url", () => {
    for (const entity of result.entities) {
      expect(entity.imageUrl).toBe(
        `https://www.mlbstatic.com/team-logos/${entity.sourceIds.mlb_stats}.svg`,
      );
      expect(new URL(entity.imageUrl).host).toBe("www.mlbstatic.com");
    }
  });

  it("carries a known team with full name, string source id, and pct metric", () => {
    const brewers = result.entities.find(
      (entity) => entity.name === "Milwaukee Brewers",
    );
    expect(brewers).toBeDefined();
    expect(brewers.rank).toBe(1);
    expect(brewers.sourceIds).toEqual({ mlb_stats: "158" });
    expect(brewers.metricValue).toBeCloseTo(0.619, 5);
  });

  it("rejects a payload with no records", () => {
    expect(() => transformStandings({ records: [] }, FETCHED_FROM)).toThrow(
      /no records/,
    );
  });

  it("falls back to pct-then-wins ordering when sportRank is unusable", () => {
    const row = (id, name, sportRank, pct, wins) => ({
      team: { id, name },
      sportRank,
      winningPercentage: pct,
      wins,
      losses: 0,
    });
    // Duplicate sportRanks → fallback path.
    const payload = {
      records: [
        {
          teamRecords: [
            row(1, "Low Pct", "1", ".400", 60),
            row(2, "High Pct", "1", ".600", 90),
            row(3, "Mid Pct Fewer Wins", "2", ".500", 74),
            row(4, "Mid Pct More Wins", "2", ".500", 75),
          ],
        },
      ],
    };
    const ordered = transformStandings(payload, FETCHED_FROM).entities.map(
      (entity) => entity.name,
    );
    expect(ordered).toEqual([
      "High Pct",
      "Mid Pct More Wins",
      "Mid Pct Fewer Wins",
      "Low Pct",
    ]);
  });
});

describe("mlb season-year derivation", () => {
  it("uses the calendar year during the season (March–November)", () => {
    expect(deriveMlbSeasonYear("2026-08-28")).toBe(2026);
    expect(deriveMlbSeasonYear("2027-03-01")).toBe(2027);
    expect(deriveMlbSeasonYear("2026-11-30")).toBe(2026);
  });

  it("uses the calendar year in December (season just completed)", () => {
    expect(deriveMlbSeasonYear("2026-12-31")).toBe(2026);
  });

  it("uses the prior year in January and February", () => {
    expect(deriveMlbSeasonYear("2027-01-15")).toBe(2026);
    expect(deriveMlbSeasonYear("2027-02-28")).toBe(2026);
  });

  it("rejects a malformed date", () => {
    expect(() => deriveMlbSeasonYear("not-a-date")).toThrow(
      /cannot derive season year/,
    );
  });
});
