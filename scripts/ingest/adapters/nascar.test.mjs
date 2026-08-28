// Fixture tests for the NASCAR adapter — both paths: the primary CF
// live-points transform (with drivers.json portrait + ESPN id/headshot
// enrichment) and the ESPN racing-standings FALLBACK transform. Fixtures
// are real 2026 responses recorded 2026-08-28 after race 5627 (Dollar Tree
// 301, Loudon, 2026-08-23), trimmed to read fields — all rows kept.
// The two sources were cross-checked live that day: identical points for
// the top drivers (Hamlin 1001, Blaney 924, Gibbs 880, Reddick 860).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { adapterResultSchema } from "../contract.mjs";
import {
  NASCAR_MAX_ENTITIES,
  buildDriverImageIndex,
  buildEspnDriverIndex,
  cleanDriverName,
  pickLatestCompletedRace,
  transformCfPoints,
  transformEspnStandings,
} from "./nascar.mjs";

const load = (name) =>
  JSON.parse(
    readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"),
  );

const pointsRows = load("nascar-cf-live-points-5627.json");
const driversPayload = load("nascar-cf-drivers.json");
const espnPayload = load("nascar-espn-standings-2026.json");

const CF_FETCHED_FROM = [
  "https://cf.nascar.com/cacher/2026/race_list_basic.json",
  "https://cf.nascar.com/live/feeds/series_1/5627/live_points.json",
  "https://cf.nascar.com/cacher/drivers.json",
  "https://site.api.espn.com/apis/v2/sports/racing/nascar-premier/standings",
];
const ESPN_FETCHED_FROM = [
  "https://site.api.espn.com/apis/v2/sports/racing/nascar-premier/standings",
];

describe("nascar CF points transform (primary path)", () => {
  const images = buildDriverImageIndex(driversPayload);
  const espnIndex = buildEspnDriverIndex(espnPayload);
  const result = transformCfPoints(
    pointsRows,
    { images, espnIndex },
    CF_FETCHED_FROM,
  );

  it("satisfies the shared adapter contract", () => {
    const parsed = adapterResultSchema.safeParse(result);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    expect(result.sportKey).toBe("nascar");
    expect(result.fetchedFrom).toEqual(CF_FETCHED_FROM);
  });

  it(`caps at ${NASCAR_MAX_ENTITIES} drivers with unique contiguous ranks`, () => {
    expect(result.entities).toHaveLength(NASCAR_MAX_ENTITIES);
    result.entities.forEach((entity, index) => {
      expect(entity.rank).toBe(index + 1);
    });
  });

  it("points never increase down the ordering", () => {
    for (let i = 1; i < result.entities.length; i++) {
      expect(result.entities[i].metricValue).toBeLessThanOrEqual(
        result.entities[i - 1].metricValue,
      );
    }
  });

  it("matches the real 2026 season-to-date standings after race 5627", () => {
    const [leader, second] = result.entities;
    expect(leader.name).toBe("Denny Hamlin");
    expect(leader.metricValue).toBe(1001);
    expect(leader.sourceIds.nascar_cf).toBe("1361");
    expect(second.name).toBe("Ryan Blaney");
    expect(second.metricValue).toBe(924);
  });

  it("every capped driver gets an ESPN rpm headshot (nascar.com images 403 non-browsers)", () => {
    for (const entity of result.entities) {
      expect(
        entity.imageUrl,
        `${entity.name} (${entity.sourceIds.nascar_cf}) has no image`,
      ).toBe(
        `https://a.espncdn.com/i/headshots/rpm/players/full/${entity.sourceIds.espn}.png`,
      );
    }
  });

  it("merges espn ids into sourceIds when the driver is on both sources", () => {
    const hamlin = result.entities.find((e) => e.name === "Denny Hamlin");
    expect(hamlin.sourceIds).toEqual({ nascar_cf: "1361", espn: "747" });
  });

  it("covers a cross-series ringer via the ESPN headshot merge", () => {
    // Kevin Magnussen is absent from drivers.json (no portrait) but ranked
    // 37th in points — his image comes from the ESPN athlete merge.
    const magnussen = result.entities.find((e) => e.name === "Kevin Magnussen");
    expect(magnussen).toBeDefined();
    expect(magnussen.sourceIds.espn).toBeDefined();
    expect(magnussen.imageUrl).toBe(
      `https://a.espncdn.com/i/headshots/rpm/players/full/${magnussen.sourceIds.espn}.png`,
    );
  });

  it("strips the feed's rookie/ineligible name markers", () => {
    // "Zilisch #" (rookie marker) sits inside the top 40.
    const zilisch = result.entities.find((e) =>
      e.name.startsWith("Connor Zilisch"),
    );
    expect(zilisch).toBeDefined();
    expect(zilisch.name).toBe("Connor Zilisch");
    expect(cleanDriverName("Austin Hill(i)")).toBe("Austin Hill");
  });

  it("still transforms without enrichment (images become optional)", () => {
    const bare = transformCfPoints(pointsRows, {}, CF_FETCHED_FROM);
    expect(adapterResultSchema.safeParse(bare).success).toBe(true);
    expect(bare.entities[0].sourceIds).toEqual({ nascar_cf: "1361" });
  });

  it("rejects an empty points feed", () => {
    expect(() => transformCfPoints([], {}, CF_FETCHED_FROM)).toThrow(
      /no rows/,
    );
  });

  it("rejects a non-contiguous points_position ordering", () => {
    const gapped = pointsRows.map((row) =>
      row.points_position === 2 ? { ...row, points_position: 99 } : row,
    );
    expect(() => transformCfPoints(gapped, {}, CF_FETCHED_FROM)).toThrow(
      /not a contiguous/,
    );
  });
});

describe("nascar race list helpers", () => {
  it("picks the latest completed race by race_date", () => {
    const race = pickLatestCompletedRace({
      series_1: [
        { race_id: 1, race_date: "2026-02-15T00:00:00", winner_driver_id: 9 },
        { race_id: 5, race_date: "2026-08-23T15:00:00", winner_driver_id: 7 },
        { race_id: 6, race_date: "2026-08-29T19:30:00", winner_driver_id: null },
      ],
    });
    expect(race.race_id).toBe(5);
  });

  it("returns null when no race has completed yet (January gap)", () => {
    expect(
      pickLatestCompletedRace({
        series_1: [
          { race_id: 1, race_date: "2027-02-14", winner_driver_id: null },
        ],
      }),
    ).toBeNull();
  });

  it("throws on a payload without series_1", () => {
    expect(() => pickLatestCompletedRace({})).toThrow(/no series_1/);
  });
});

describe("nascar ESPN standings transform (fallback path)", () => {
  const result = transformEspnStandings(espnPayload, ESPN_FETCHED_FROM);

  it("satisfies the shared adapter contract", () => {
    const parsed = adapterResultSchema.safeParse(result);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    expect(result.sportKey).toBe("nascar");
    expect(result.fetchedFrom).toEqual(ESPN_FETCHED_FROM);
  });

  it("produces 40 drivers with unique contiguous ranks 1..40", () => {
    expect(result.entities).toHaveLength(40);
    result.entities.forEach((entity, index) => {
      expect(entity.rank).toBe(index + 1);
    });
  });

  it("agrees with the CF feed on the leaders (cross-source validation)", () => {
    const [leader] = result.entities;
    expect(leader.name).toBe("Denny Hamlin");
    expect(leader.metricValue).toBe(1001);
    expect(leader.sourceIds).toEqual({ espn: "747" });
  });

  it("constructs an rpm headshot URL for every driver", () => {
    for (const entity of result.entities) {
      expect(entity.imageUrl).toBe(
        `https://a.espncdn.com/i/headshots/rpm/players/full/${entity.sourceIds.espn}.png`,
      );
    }
  });

  it("rejects the childless payload ESPN serves when a season is empty", () => {
    expect(() =>
      transformEspnStandings({ children: [] }, ESPN_FETCHED_FROM),
    ).toThrow(/no children groups/);
  });
});
