// Fixture test for the F1 adapter, asserted through the shared adapter
// contract. The fixture is a real api.jolpi.ca current-season driver
// standings response (2026 season, round 12, fetched 2026-08-28) trimmed to
// the fields the transform reads plus surrounding structure — all 23
// drivers, no network involved.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { adapterResultSchema } from "../contract.mjs";
import { F1_DRIVER_IMAGES } from "./f1-images.mjs";
import { transformDriverStandings } from "./f1.mjs";

const fixture = JSON.parse(
  readFileSync(
    new URL("./fixtures/f1-driverstandings-2026-round12.json", import.meta.url),
    "utf8",
  ),
);
const FETCHED_FROM = [
  "https://api.jolpi.ca/ergast/f1/current/driverstandings/?limit=100",
];

describe("f1 adapter transform", () => {
  const result = transformDriverStandings(fixture, FETCHED_FROM);

  it("satisfies the shared adapter contract", () => {
    const parsed = adapterResultSchema.safeParse(result);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    expect(result.sportKey).toBe("f1");
    expect(result.fetchedFrom).toEqual(FETCHED_FROM);
  });

  it("produces all 23 drivers with unique championship positions 1..23", () => {
    expect(result.entities).toHaveLength(23);
    const ranks = result.entities.map((entity) => entity.rank);
    expect([...new Set(ranks)].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 23 }, (_, i) => i + 1),
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

  it("every driver renders with an image despite the source providing none", () => {
    for (const entity of result.entities) {
      expect(
        entity.imageUrl,
        `driver ${entity.sourceIds.jolpica} has no image mapped`,
      ).toBeDefined();
      expect(new URL(entity.imageUrl).host).toBe("upload.wikimedia.org");
    }
  });

  it("the static image map covers every driver in the standings", () => {
    for (const entity of result.entities) {
      expect(F1_DRIVER_IMAGES[entity.sourceIds.jolpica]).toBeDefined();
    }
  });

  it("carries a known driver with jolpica driver + constructor source ids", () => {
    const verstappen = result.entities.find(
      (entity) => entity.name === "Max Verstappen",
    );
    expect(verstappen).toBeDefined();
    expect(verstappen.sourceIds).toEqual({
      jolpica: "max_verstappen",
      jolpica_constructor: "red_bull",
    });
    expect(verstappen.rank).toBe(6);
    expect(verstappen.metricValue).toBe(112);
  });

  it("stores the CURRENT constructor for a mid-season seat swap", () => {
    // Lawson drove for rb then red_bull this season — Constructors lists
    // both in order; the adapter keeps the last (current) one.
    const lawson = result.entities.find(
      (entity) => entity.sourceIds.jolpica === "lawson",
    );
    expect(lawson).toBeDefined();
    expect(lawson.sourceIds.jolpica_constructor).toBe("red_bull");
  });

  it("rejects a payload with no standings rows", () => {
    expect(() =>
      transformDriverStandings(
        {
          MRData: {
            total: "0",
            StandingsTable: { StandingsLists: [{ DriverStandings: [] }] },
          },
        },
        FETCHED_FROM,
      ),
    ).toThrow(/no DriverStandings rows/);
  });

  it("rejects a pagination-truncated payload", () => {
    const truncated = JSON.parse(JSON.stringify(fixture));
    truncated.MRData.total = "50";
    expect(() => transformDriverStandings(truncated, FETCHED_FROM)).toThrow(
      /truncated by pagination/,
    );
  });
});
