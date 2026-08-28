// Fixture tests for the config-driven ESPN adapter family (nfl, nba, mls,
// epl, cfb, cbb), asserted through the shared adapter contract. Fixtures are
// real responses trimmed to the read fields + structure, all rows kept:
//   standings — site.api.espn.com/apis/v2/sports/{path}/standings?season=Y
//   rankings  — .../apis/site/v2/sports/{path}/rankings?seasons=Y&seasontype=T&weeks=W
// No network involved.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { adapterResultSchema } from "../contract.mjs";
import {
  deriveCompletedSeasonYear,
  espnAdapters,
  espnConfigs,
  pickFinalRankingWeek,
  transformRankings,
  transformStandings,
} from "./espn.mjs";

const loadFixture = (file) =>
  JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), "utf8"));

const FETCHED_FROM = ["https://site.api.espn.com/apis/v2/sports/x/standings"];

const SPORTS = [
  {
    key: "nfl",
    fixture: "espn-nfl-standings-2025.json",
    count: 32,
    top: { name: "Seattle Seahawks", espnId: "26", metricValue: 0.8235294 },
  },
  {
    key: "nba",
    fixture: "espn-nba-standings-2026.json",
    count: 30,
    top: { name: "Oklahoma City Thunder", espnId: "25", metricValue: 0.7804878 },
  },
  {
    // 30 clubs in the completed 2025 season — the current MLS club count.
    key: "mls",
    fixture: "espn-mls-standings-2025.json",
    count: 30,
    top: { name: "Philadelphia Union", espnId: "10739", metricValue: 66 },
  },
  {
    key: "epl",
    fixture: "espn-epl-standings-2025.json",
    count: 20,
    top: { name: "Arsenal", espnId: "359", metricValue: 85 },
  },
  {
    key: "cfb",
    fixture: "espn-cfb-rankings-2025-final.json",
    count: 25,
    top: { name: "Indiana Hoosiers", espnId: "84", metricValue: 1650 },
  },
  {
    key: "cbb",
    fixture: "espn-cbb-rankings-2026-final.json",
    count: 25,
    top: { name: "Michigan Wolverines", espnId: "130", metricValue: 1425 },
  },
];

for (const sport of SPORTS) {
  const config = espnConfigs[sport.key];
  const fixture = loadFixture(sport.fixture);
  const result =
    config.mode === "rankings"
      ? transformRankings(config, fixture, FETCHED_FROM)
      : transformStandings(config, fixture, FETCHED_FROM);

  describe(`espn ${sport.key} transform`, () => {
    it("satisfies the shared adapter contract", () => {
      const parsed = adapterResultSchema.safeParse(result);
      expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
      expect(result.sportKey).toBe(sport.key);
      expect(result.fetchedFrom).toEqual(FETCHED_FROM);
    });

    it(`produces all ${sport.count} entities`, () => {
      expect(result.entities).toHaveLength(sport.count);
    });

    it(`ranks are a unique contiguous 1..${sport.count} ordering`, () => {
      const ranks = result.entities.map((entity) => entity.rank);
      expect([...new Set(ranks)].sort((a, b) => a - b)).toEqual(
        Array.from({ length: sport.count }, (_, i) => i + 1),
      );
    });

    it("metric values never increase down the ordering", () => {
      const byRank = [...result.entities].sort((a, b) => a.rank - b.rank);
      for (let i = 1; i < byRank.length; i++) {
        expect(byRank[i].metricValue).toBeLessThanOrEqual(
          byRank[i - 1].metricValue,
        );
      }
    });

    it("every entity carries an espn source id and an ESPN-hosted logo", () => {
      for (const entity of result.entities) {
        expect(typeof entity.sourceIds.espn).toBe("string");
        expect(entity.sourceIds.espn).toMatch(/^\d+$/);
        expect(new URL(entity.imageUrl).host).toBe("a.espncdn.com");
      }
    });

    it("puts the known season winner at rank 1", () => {
      const top = result.entities.find((entity) => entity.rank === 1);
      expect(top.name).toBe(sport.top.name);
      expect(top.sourceIds).toEqual({ espn: sport.top.espnId });
      expect(top.metricValue).toBe(sport.top.metricValue);
    });

    it("is registered under its sport key", () => {
      expect(espnAdapters[sport.key].sportKey).toBe(sport.key);
    });
  });
}

describe("espn standings transform edge cases", () => {
  it("rejects a childless payload (the empty soccer variant shape)", () => {
    expect(() =>
      transformStandings(espnConfigs.mls, { children: [] }, FETCHED_FROM),
    ).toThrow(/no children/);
  });

  it("rejects a wrong-size league", () => {
    const fixture = loadFixture("espn-epl-standings-2025.json");
    const truncated = {
      ...fixture,
      children: [
        {
          ...fixture.children[0],
          standings: {
            entries: fixture.children[0].standings.entries.slice(0, 5),
          },
        },
      ],
    };
    expect(() =>
      transformStandings(espnConfigs.epl, truncated, FETCHED_FROM),
    ).toThrow(/expected 20 standings rows/);
  });
});

describe("espn final-poll week derivation", () => {
  it("cfb final poll is postseason week 1", () => {
    expect(pickFinalRankingWeek(loadFixture("espn-cfb-rankings-2025-final.json")))
      .toEqual({ week: "1", type: "3", display: "Final Rankings" });
  });

  it("cbb final poll is postseason week 3", () => {
    expect(pickFinalRankingWeek(loadFixture("espn-cbb-rankings-2026-final.json")))
      .toEqual({ week: "3", type: "3", display: "Final Rankings" });
  });

  it("refuses a mid-flight season whose last week is not a final poll", () => {
    expect(() =>
      pickFinalRankingWeek({
        weeks: [{ display: "Preseason", week: "1", type: "2" }],
      }),
    ).toThrow(/not a final poll/);
  });

  it("rejects a missing AP poll", () => {
    expect(() =>
      transformRankings(espnConfigs.cfb, { rankings: [{ id: "2" }] }, FETCHED_FROM),
    ).toThrow(/AP Top 25/);
  });
});

describe("espn completed-season derivation at league-calendar boundaries", () => {
  const derive = (key, date) =>
    deriveCompletedSeasonYear(espnConfigs[key].season, date);

  it("nfl: season label = starting year, complete after the Super Bowl", () => {
    expect(derive("nfl", "2026-08-28")).toBe(2025);
    expect(derive("nfl", "2027-01-15")).toBe(2025); // 2026 season mid-playoffs
    expect(derive("nfl", "2027-02-15")).toBe(2025); // still Feb — hold
    expect(derive("nfl", "2027-03-01")).toBe(2026); // rolls in March
  });

  it("nba: season label = ending year, complete after the June Finals", () => {
    expect(derive("nba", "2026-08-28")).toBe(2026); // 2025-26 done
    expect(derive("nba", "2027-01-15")).toBe(2026); // 2026-27 mid-flight
    expect(derive("nba", "2027-07-01")).toBe(2027); // rolls in July
  });

  it("mls: calendar-year season, table final by December", () => {
    expect(derive("mls", "2026-08-28")).toBe(2025); // 2026 mid-flight
    expect(derive("mls", "2026-12-01")).toBe(2026); // rolls in December
    expect(derive("mls", "2027-08-07")).toBe(2026); // the spec cutoff date
  });

  it("epl: season label = starting year, table final late May", () => {
    expect(derive("epl", "2026-08-28")).toBe(2025); // 2025-26 done
    expect(derive("epl", "2027-05-15")).toBe(2025); // 2026-27 finishing
    expect(derive("epl", "2027-06-01")).toBe(2026); // rolls in June
  });

  it("cfb: season label = starting year, final poll after the January CFP", () => {
    expect(derive("cfb", "2026-08-28")).toBe(2025);
    expect(derive("cfb", "2027-01-10")).toBe(2025); // 2026 CFP still running
    expect(derive("cfb", "2027-02-01")).toBe(2026); // rolls in February
  });

  it("cbb: season label = ending year, final poll after the April title game", () => {
    expect(derive("cbb", "2026-08-28")).toBe(2026); // 2025-26 done
    expect(derive("cbb", "2027-04-15")).toBe(2026); // hold through April
    expect(derive("cbb", "2027-05-01")).toBe(2027); // rolls in May
  });

  it("rejects a malformed date", () => {
    expect(() => derive("nfl", "yesterday")).toThrow(/cannot derive/);
  });
});
