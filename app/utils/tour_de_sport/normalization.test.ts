import { describe, expect, it } from "vitest";

import { normalizeStandings } from "./normalization";
import type { StandingEntry } from "./normalization";
import { createRng } from "./rng";

/** Build a 14-entity field from standing values (index 0 = entity "e1"). */
function field(standings: readonly number[]): StandingEntry[] {
  return standings.map((standing, i) => ({ entityId: `e${i + 1}`, standing }));
}

function pointsSum(entries: readonly { points: number }[]): number {
  return entries.reduce((sum, entry) => sum + entry.points, 0);
}

describe("normalizeStandings", () => {
  it("maps a clean 1..14 order to points 14..1 summing to exactly 105", () => {
    const result = normalizeStandings(field([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]));
    expect(result.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    expect(result.map((r) => r.points)).toEqual([14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    // Whole and half points are exact in doubles, so the pool is EXACTLY 105.
    expect(pointsSum(result)).toBe(105);
  });

  it("averages a 2-way mid-field tie and keeps the pool at 105", () => {
    // Entities 3 and 4 tie for 3rd: they span ranks 3-4 -> rank 3.5, points 11.5.
    const result = normalizeStandings(field([1, 2, 3, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]));
    const tied = result.filter((r) => r.entityId === "e3" || r.entityId === "e4");
    expect(tied.map((r) => r.rank)).toEqual([3.5, 3.5]);
    expect(tied.map((r) => r.points)).toEqual([11.5, 11.5]);
    // The next entity is unaffected: still rank 5.
    expect(result.find((r) => r.entityId === "e5")).toMatchObject({ rank: 5, points: 10 });
    expect(pointsSum(result)).toBe(105);
  });

  it("averages a 3-way tie across ranks 6-8 and keeps the pool at 105", () => {
    const result = normalizeStandings(field([1, 2, 3, 4, 5, 6, 6, 6, 9, 10, 11, 12, 13, 14]));
    const tied = result.filter((r) => r.rank === 7);
    expect(tied).toHaveLength(3);
    expect(tied.every((r) => r.points === 8)).toBe(true);
    expect(pointsSum(result)).toBe(105);
  });

  it("averages a tie at the top (ranks 1-2 -> 1.5, points 13.5 each)", () => {
    const result = normalizeStandings(field([1, 1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]));
    expect(result[0]).toMatchObject({ rank: 1.5, points: 13.5 });
    expect(result[1]).toMatchObject({ rank: 1.5, points: 13.5 });
    expect(pointsSum(result)).toBe(105);
  });

  it("averages a tie at the bottom (ranks 13-14 -> 13.5, points 1.5 each)", () => {
    const result = normalizeStandings(field([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 14]));
    const tied = result.filter((r) => r.rank === 13.5);
    expect(tied).toHaveLength(2);
    expect(tied.every((r) => r.points === 1.5)).toBe(true);
    expect(pointsSum(result)).toBe(105);
  });

  it("ignores input order and gaps in standing values", () => {
    const shuffledInput = field([40, 10, 10, 25, 99, 7, 55, 60, 61, 62, 63, 64, 65, 66]);
    const result = normalizeStandings(shuffledInput);
    expect(result[0]).toMatchObject({ entityId: "e6", rank: 1, points: 14 });
    // e2 and e3 share standing 10 -> ranks 2-3 averaged to 2.5.
    expect(result.filter((r) => r.rank === 2.5).map((r) => r.entityId).sort()).toEqual(["e2", "e3"]);
    expect(pointsSum(result)).toBe(105);
  });

  it("property: random tie patterns always pay exactly the 105-point pool", () => {
    const rng = createRng("normalization-property-seed");
    for (let trial = 0; trial < 25; trial++) {
      // Random standings drawn from a small range to force many collisions.
      const standings = Array.from({ length: 14 }, () => rng.nextBelow(6) + 1);
      const result = normalizeStandings(field(standings));
      expect(result).toHaveLength(14);
      // Ranks are whole or half numbers, so the sum is exact — no epsilon.
      expect(pointsSum(result)).toBe(105);
    }
  });

  it("rejects duplicate entity ids", () => {
    const entries = [
      { entityId: "e1", standing: 1 },
      { entityId: "e1", standing: 2 },
    ];
    expect(() => normalizeStandings(entries)).toThrow(/Duplicate entityId/);
  });
});
