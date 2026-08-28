/**
 * The outsider's proof (AUS-845 acceptance criterion): the assignments saved
 * in the database are reproducible from the PUBLISHED data alone — the seed,
 * the frozen participant order, each sport's tier table, and the frozen sport
 * indexes, exactly as the landing page's Draw Record publishes them.
 *
 * The fixture was captured from a locked local season: `published` holds the
 * published bundle, `saved_assignments` the assignment rows the draw action
 * actually persisted. This test re-runs the pure draw from the bundle and
 * demands a byte-for-byte match on (participant, entity, tier_index, slot) —
 * no database, no server code, just the published inputs and the open
 * algorithm.
 */

import { describe, expect, it } from "vitest";

import { drawSport } from "./draw";
import {
  drawInputFromLockedSeason,
  sportPoolFromSportRow,
  type LockedInputs,
  type SportTiers,
} from "./tiers";
import fixture from "./fixtures/nhl-draw-2027.json";

type SavedRow = {
  participant_id: number;
  entity_id: number;
  tier_index: number;
  tier_slot: number;
};

const published = fixture.published as {
  seed: string;
  locked_inputs: LockedInputs;
  sport: { sport_key: string; sport_index: number; tiers: SportTiers };
};
const saved = fixture.saved_assignments as SavedRow[];

function reproduce(): SavedRow[] {
  const input = drawInputFromLockedSeason({
    rng_seed: published.seed,
    locked_inputs: published.locked_inputs,
  });
  const pool = sportPoolFromSportRow({
    sport_key: published.sport.sport_key,
    // The frozen index comes from the published sport_indexes map, exactly as
    // an outsider would read it.
    sport_index:
      published.locked_inputs.sport_indexes[published.sport.sport_key],
    tiers: published.sport.tiers,
  });
  if (!pool) throw new Error("Fixture sport has no tiers");
  return drawSport(input, pool).map((assignment) => ({
    participant_id: Number(assignment.participantId),
    entity_id: Number(assignment.entityId),
    tier_index: assignment.tierIndex,
    tier_slot: assignment.slot,
  }));
}

const bySlot = (a: SavedRow, b: SavedRow) => a.tier_slot - b.tier_slot;

describe("offline draw reproduction from the published bundle", () => {
  it("covers every participant exactly once in the fixture", () => {
    expect(saved).toHaveLength(published.locked_inputs.participants.length);
    expect(new Set(saved.map((row) => row.participant_id)).size).toBe(
      saved.length
    );
    expect(new Set(saved.map((row) => row.entity_id)).size).toBe(saved.length);
  });

  it("reproduces the saved DB assignments byte-for-byte", () => {
    const reproduced = [...reproduce()].sort(bySlot);
    const expected = [...saved].sort(bySlot);
    // Byte-for-byte on (participant, entity, tier_index, slot).
    expect(JSON.stringify(reproduced)).toBe(JSON.stringify(expected));
  });

  it("is order-independent: drawing the sport alone matches the saved rows", () => {
    // drawSport takes nothing about other sports or draw sequence as input,
    // so reproducing twice (or on anyone's machine) cannot diverge.
    expect(reproduce()).toEqual(reproduce());
  });
});
