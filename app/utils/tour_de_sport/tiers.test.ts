import { describe, expect, it } from "vitest";

import { drawSport } from "./draw";
import {
  buildTiers,
  drawInputFromLockedSeason,
  sportPoolFromSportRow,
  type SportTiers,
} from "./tiers";

const ranked = (n: number) => Array.from({ length: n }, (_, i) => `e${i + 1}`);

describe("buildTiers", () => {
  it("splits a 32-entity pool into eight tiers of four", () => {
    const tiers = buildTiers(ranked(32), 14);
    expect(tiers).toHaveLength(8);
    expect(tiers.every((tier) => tier.length === 4)).toBe(true);
  });

  it("gives the remainder to the final tier (30 entities)", () => {
    const tiers = buildTiers(ranked(30), 14);
    expect(tiers.map((tier) => tier.length)).toEqual([4, 4, 4, 4, 4, 4, 4, 2]);
  });

  it("uses tiers of two for pools under 28", () => {
    const tiers = buildTiers(ranked(14), 14);
    expect(tiers).toHaveLength(7);
    expect(tiers.every((tier) => tier.length === 2)).toBe(true);
  });

  it("preserves ranked order and covers the whole pool", () => {
    const pool = ranked(27);
    const tiers = buildTiers(pool, 14);
    expect(tiers.flat()).toEqual(pool);
    // 27 < 28 -> tiers of two, final tier takes the odd entity out.
    expect(tiers.map((tier) => tier.length)).toEqual([
      2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1,
    ]);
  });

  it("rejects pools smaller than the participant count", () => {
    expect(() => buildTiers(ranked(13), 14)).toThrow(/at least 14/);
  });

  it("rejects a non-positive participant count", () => {
    expect(() => buildTiers(ranked(14), 0)).toThrow(/positive participant/);
  });
});

describe("locked-input bridges", () => {
  const lockedSeason = {
    rng_seed: "0123456789abcdef0123456789abcdef",
    locked_inputs: {
      participants: [
        { id: 3, display_name: "alpha" },
        { id: 7, display_name: "beta" },
      ],
      sport_indexes: { nhl: 0 },
      tier_rule: "test",
    },
  };

  const tiers: SportTiers = [
    [
      { id: 11, name: "Best" },
      { id: 12, name: "Second" },
    ],
    [
      { id: 13, name: "Third" },
      { id: 14, name: "Fourth" },
    ],
  ];

  it("builds DrawInput from the frozen participant order", () => {
    expect(drawInputFromLockedSeason(lockedSeason)).toEqual({
      seed: lockedSeason.rng_seed,
      participants: ["3", "7"],
    });
  });

  it("refuses an unlocked season", () => {
    expect(() =>
      drawInputFromLockedSeason({ rng_seed: null, locked_inputs: null })
    ).toThrow(/not locked/);
  });

  it("builds a drawable SportPool and returns null for empty tiers", () => {
    const pool = sportPoolFromSportRow({
      sport_key: "nhl",
      sport_index: 0,
      tiers,
    });
    expect(pool).toEqual({
      sportKey: "nhl",
      sportIndex: 0,
      tiers: [
        ["11", "12"],
        ["13", "14"],
      ],
    });
    expect(
      sportPoolFromSportRow({ sport_key: "mlb", sport_index: 1, tiers: [] })
    ).toBeNull();
    expect(
      sportPoolFromSportRow({ sport_key: "mlb", sport_index: 1, tiers: null })
    ).toBeNull();
  });

  it("feeds drawSport deterministically end to end", () => {
    const input = drawInputFromLockedSeason(lockedSeason);
    const pool = sportPoolFromSportRow({
      sport_key: "nhl",
      sport_index: 0,
      tiers,
    });
    const first = drawSport(input, pool!);
    const second = drawSport(input, pool!);
    expect(first).toEqual(second);
    expect(first.map((a) => a.participantId)).toEqual(["3", "7"]);
    // Two participants, four entities: only slots 0..1 (the top tier) assign.
    expect(first.every((a) => a.tierIndex === 0)).toBe(true);
  });
});
