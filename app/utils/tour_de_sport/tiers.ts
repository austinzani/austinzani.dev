/**
 * Tier construction + the frozen-input shapes written at Season Lock.
 *
 * Published tier rule (one sentence, also stored in locked_inputs and shown
 * on the landing page's provenance section):
 *
 *   Entities are ranked best to worst from the frozen standings and split, in
 *   that order, into consecutive tiers of four when the pool has 28 or more
 *   entities, or tiers of two for smaller pools, with the final tier taking
 *   any remainder.
 *
 * The within-tier order of the stored JSON is itself a draw input — the
 * per-sport seeded shuffle consumes each tier array exactly as stored — so
 * tiers are persisted in frozen standings order (best rank first) and must be
 * read back verbatim to reproduce the draw.
 *
 * Pure module: no imports from Remix, Supabase, or anything with side
 * effects.
 */

import type { DrawInput, SportPool } from "./draw";

export const TIER_RULE_SENTENCE =
  "Entities are ranked best to worst from the frozen standings and split, in that order, into consecutive tiers of four when the pool has 28 or more entities, or tiers of two for smaller pools, with the final tier taking any remainder.";

/** One entity frozen into a tier: id + a name snapshot taken at lock time. */
export type TierEntity = {
  id: number;
  name: string;
};

/**
 * The tds_sports.tiers JSON shape: strongest tier first, each tier's entities
 * in frozen standings order (best first). `[]` = locked without usable
 * standings, not drawable yet.
 */
export type SportTiers = TierEntity[][];

/**
 * The tds_seasons.locked_inputs JSON shape. `participants` is THE frozen
 * DrawInput.participants order: the season's tds_participants ordered by id
 * ascending. Reproduction depends on this exact order.
 */
export type LockedInputs = {
  participants: Array<{ id: number; display_name: string }>;
  sport_indexes: Record<string, number>;
  tier_rule: string;
};

/**
 * Split a best-to-worst ranked pool into consecutive strength tiers.
 *
 * Tier size is 4 for pools of 28+ entities, 2 for smaller pools; the final
 * tier takes any remainder (see TIER_RULE_SENTENCE). Order is preserved:
 * flattening the result reproduces the input exactly.
 *
 * Throws when the pool cannot cover every participant — such a sport must be
 * locked with empty tiers instead of a partial pool.
 */
export function buildTiers<T>(
  rankedEntities: readonly T[],
  participantCount: number
): T[][] {
  if (!Number.isInteger(participantCount) || participantCount < 1) {
    throw new Error(
      `buildTiers requires a positive participant count, got ${participantCount}`
    );
  }
  if (rankedEntities.length < participantCount) {
    throw new Error(
      `buildTiers requires at least ${participantCount} entities, got ${rankedEntities.length}`
    );
  }

  const tierSize = rankedEntities.length >= 28 ? 4 : 2;
  const tiers: T[][] = [];
  for (let start = 0; start < rankedEntities.length; start += tierSize) {
    tiers.push(rankedEntities.slice(start, start + tierSize));
  }
  return tiers;
}

/**
 * Bridge a locked season row to the pure draw's DrawInput. Participant ids
 * are stringified tds_participants ids, in the frozen locked_inputs order.
 * Throws when the season is not locked (nothing is drawable pre-lock).
 */
export function drawInputFromLockedSeason(season: {
  rng_seed: string | null;
  locked_inputs: LockedInputs | null;
}): DrawInput {
  if (!season.rng_seed || !season.locked_inputs) {
    throw new Error("Season is not locked: no frozen seed/inputs to draw from");
  }
  return {
    seed: season.rng_seed,
    participants: season.locked_inputs.participants.map((p) => String(p.id)),
  };
}

/**
 * Bridge a locked sport row to the pure draw's SportPool, stringifying entity
 * ids. Returns null when the sport was locked without usable standings
 * (tiers empty/missing) — such a sport is not drawable yet.
 */
export function sportPoolFromSportRow(sport: {
  sport_key: string;
  sport_index: number;
  tiers: SportTiers | null;
}): SportPool | null {
  if (!sport.tiers || sport.tiers.length === 0) {
    return null;
  }
  return {
    sportKey: sport.sport_key,
    sportIndex: sport.sport_index,
    tiers: sport.tiers.map((tier) => tier.map((entity) => String(entity.id))),
  };
}
