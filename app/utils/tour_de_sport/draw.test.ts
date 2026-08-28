import { describe, expect, it } from "vitest";

import { drawSeason, drawSport } from "./draw";
import type { Assignment, SportPool } from "./draw";

const PARTICIPANTS = Array.from({ length: 14 }, (_, i) => `p${String(i + 1).padStart(2, "0")}`);
const SEED = "tds-2027-season-seed";
const INPUT = { seed: SEED, participants: PARTICIPANTS };

/** Build a sport whose pool is split into tiers of the given sizes. */
function sport(sportKey: string, sportIndex: number, tierSizes: readonly number[]): SportPool {
  let n = 0;
  const tiers = tierSizes.map((size) =>
    Array.from({ length: size }, () => `${sportKey}-e${++n}`)
  );
  return { sportKey, sportIndex, tiers };
}

/**
 * A realistic frozen 12-sport season: team sports with full-league pools
 * (leftovers unassigned), 14-entity sports, and individual sports pooled from
 * world standings.
 */
const SEASON: SportPool[] = [
  sport("nfl", 0, [8, 8, 8, 8]),
  sport("nba", 1, [8, 8, 7, 7]),
  sport("mlb", 2, [8, 8, 7, 7]),
  sport("nhl", 3, [8, 8, 8, 8]),
  sport("f1", 4, [4, 6, 10]),
  sport("nascar", 5, [4, 6, 10]),
  sport("pga", 6, [4, 4, 3, 3]),
  sport("cfb", 7, [4, 4, 3, 3]),
  sport("cbb", 8, [4, 4, 3, 3]),
  sport("wnba", 9, [4, 5, 5]),
  sport("mls", 10, [7, 7, 7, 7]),
  sport("epl", 11, [5, 5, 5, 5]),
];

describe("drawSport determinism", () => {
  it("produces byte-identical assignments for the same seed and frozen inputs", () => {
    const first = drawSport(INPUT, SEASON[0]);
    const second = drawSport({ seed: SEED, participants: [...PARTICIPANTS] }, SEASON[0]);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it("produces different assignments for a different seed", () => {
    const original = drawSport(INPUT, SEASON[0]);
    const reseeded = drawSport({ seed: "some-other-seed", participants: PARTICIPANTS }, SEASON[0]);
    expect(JSON.stringify(reseeded)).not.toBe(JSON.stringify(original));
  });
});

describe("draw order-independence", () => {
  it("gives each sport the same result no matter which sports are drawn around it or in what order", () => {
    const forward = drawSeason(INPUT, SEASON);
    const reversed = drawSeason(INPUT, [...SEASON].reverse());
    const alone = drawSport(INPUT, SEASON[4]); // f1 drawn with no other sport at all
    for (const s of SEASON) {
      expect(reversed[s.sportKey]).toEqual(forward[s.sportKey]);
    }
    expect(alone).toEqual(forward["f1"]);
  });
});

describe("draw completeness", () => {
  it("assigns every participant exactly one entity with no entity used twice (14-entity pool)", () => {
    const assignments = drawSport(INPUT, SEASON[6]); // pga: exactly 14 entities
    expect(assignments).toHaveLength(14);
    expect(new Set(assignments.map((a) => a.participantId)).size).toBe(14);
    expect(new Set(assignments.map((a) => a.entityId)).size).toBe(14);
  });

  it("handles pools larger than the participant count, leaving leftovers unassigned", () => {
    const assignments = drawSport(INPUT, SEASON[0]); // nfl: 32 teams
    expect(assignments).toHaveLength(14);
    expect(new Set(assignments.map((a) => a.entityId)).size).toBe(14);
    // 18 of the 32 teams stay unassigned, and only the strongest flattened
    // slots (0..13) are ever dealt.
    expect(assignments.every((a) => a.slot < 14)).toBe(true);
  });

  it("rejects a sport with fewer entities than participants", () => {
    expect(() => drawSport(INPUT, sport("tiny", 0, [5, 5]))).toThrow(/10 entities for 14/);
  });

  it("rejects duplicate participants", () => {
    const dupes = { seed: SEED, participants: ["a", "b", "a"] };
    expect(() => drawSport(dupes, sport("any", 0, [3]))).toThrow(/Duplicate participantId/);
  });
});

describe("draw balance across a 12-sport season", () => {
  const season = drawSeason(INPUT, SEASON);
  const byParticipant = new Map<string, Assignment[]>(PARTICIPANTS.map((p) => [p, []]));
  for (const s of SEASON) {
    for (const a of season[s.sportKey]) {
      byParticipant.get(a.participantId)!.push(a);
    }
  }

  it("deals every participant an identical pick-slot total (exact, by construction)", () => {
    // Sports are paired and mirrored, so each of the 6 pairs contributes
    // exactly (P - 1) = 13 to everyone's slot total: 6 * 13 = 78.
    for (const assignments of byParticipant.values()) {
      const slotTotal = assignments.reduce((sum, a) => sum + a.slot, 0);
      expect(slotTotal).toBe(78);
    }
  });

  it("keeps every participant's average assigned tier within ±0.5 of the field mean", () => {
    // Tolerance: exact slot balance plus monotone tier boundaries keeps the
    // per-participant mean tier within half a tier of the global mean.
    const averages = [...byParticipant.values()].map(
      (assignments) => assignments.reduce((sum, a) => sum + a.tierIndex, 0) / assignments.length
    );
    const fieldMean = averages.reduce((sum, avg) => sum + avg, 0) / averages.length;
    for (const avg of averages) {
      expect(Math.abs(avg - fieldMean)).toBeLessThanOrEqual(0.5);
    }
  });

  it("never pins a participant to one band: every mirrored sport pair deals one top-half and one bottom-half slot", () => {
    for (const assignments of byParticipant.values()) {
      const bySlot = new Map(assignments.map((a) => [a.sportKey, a.slot]));
      for (let pair = 0; pair < SEASON.length / 2; pair++) {
        const first = bySlot.get(SEASON[2 * pair].sportKey)!;
        const second = bySlot.get(SEASON[2 * pair + 1].sportKey)!;
        expect(first + second).toBe(13); // mirrored slots always sum to P - 1
        expect(Math.min(first, second)).toBeLessThan(7);
        expect(Math.max(first, second)).toBeGreaterThanOrEqual(7);
      }
    }
  });
});
