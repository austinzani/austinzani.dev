// Fixture test for the PGA adapter. The fixture is a real ESPN golf
// statistics/byathlete response (season 2026, sorted by FedEx Cup points,
// fetched 2026-08-28) trimmed to the fields the transform reads — all 50
// athletes kept. This is the most fragile endpoint in the ingest set, so
// the drift cases matter as much as the happy path.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { adapterResultSchema } from "../contract.mjs";
import { PGA_LIMIT, pgaStatsUrl, transformCupPoints } from "./pga.mjs";

const fixture = JSON.parse(
  readFileSync(
    new URL("./fixtures/pga-statistics-byathlete-2026.json", import.meta.url),
    "utf8",
  ),
);
const FETCHED_FROM = [pgaStatsUrl(2026)];

describe("pga adapter transform", () => {
  const result = transformCupPoints(fixture, FETCHED_FROM);

  it("satisfies the shared adapter contract", () => {
    const parsed = adapterResultSchema.safeParse(result);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    expect(result.sportKey).toBe("pga");
    expect(result.fetchedFrom).toEqual(FETCHED_FROM);
  });

  it(`produces the top ${PGA_LIMIT} golfers with unique contiguous ranks`, () => {
    expect(result.entities).toHaveLength(PGA_LIMIT);
    result.entities.forEach((entity, index) => {
      expect(entity.rank).toBe(index + 1);
    });
  });

  it("cup points never increase down the ordering", () => {
    for (let i = 1; i < result.entities.length; i++) {
      expect(result.entities[i].metricValue).toBeLessThanOrEqual(
        result.entities[i - 1].metricValue,
      );
    }
  });

  it("matches the real 2026 FedEx Cup points list", () => {
    const [leader] = result.entities;
    expect(leader.name).toBe("Scottie Scheffler");
    expect(leader.sourceIds).toEqual({ espn: "9478" });
    expect(leader.metricValue).toBe(4986);
  });

  it("every golfer carries a headshot URL", () => {
    for (const entity of result.entities) {
      expect(
        entity.imageUrl,
        `${entity.name} has no image URL`,
      ).toBeDefined();
      expect(new URL(entity.imageUrl).host).toBe("a.espncdn.com");
    }
  });

  it("locates cupPoints by NAME in the stat index, not by position", () => {
    // Reorder the stat columns — the transform must follow the names array.
    const reordered = JSON.parse(JSON.stringify(fixture));
    for (const category of reordered.categories) {
      category.names = [...category.names].reverse();
    }
    for (const athlete of reordered.athletes) {
      for (const category of athlete.categories) {
        category.values = [...category.values].reverse();
      }
    }
    const fromReordered = transformCupPoints(reordered, FETCHED_FROM);
    expect(fromReordered.entities[0].metricValue).toBe(
      result.entities[0].metricValue,
    );
  });

  it("rejects a payload whose stat index lost cupPoints (shape drift)", () => {
    const drifted = JSON.parse(JSON.stringify(fixture));
    drifted.categories[0].names = drifted.categories[0].names.filter(
      (name) => name !== "cupPoints",
    );
    expect(() => transformCupPoints(drifted, FETCHED_FROM)).toThrow(
      /"cupPoints" is missing/,
    );
  });

  it("rejects a payload with no athletes", () => {
    expect(() =>
      transformCupPoints({ ...fixture, athletes: [] }, FETCHED_FROM),
    ).toThrow(/no athletes/);
  });

  it("rejects a payload with no categories index", () => {
    expect(() =>
      transformCupPoints({ athletes: fixture.athletes }, FETCHED_FROM),
    ).toThrow(/no categories index/);
  });

  it("rejects an athlete row whose cupPoints value is not a number", () => {
    const drifted = JSON.parse(JSON.stringify(fixture));
    drifted.athletes[3].categories[0].values = [];
    expect(() => transformCupPoints(drifted, FETCHED_FROM)).toThrow(
      /missing id\/displayName\/cupPoints/,
    );
  });
});
