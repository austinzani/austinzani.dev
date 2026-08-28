/**
 * Standings normalization for Tour de Sport scoring.
 *
 * Converts a sport's real-world standings (including ties) into rank ordinals
 * and points. With N participants the best entity earns N points down to 1
 * for the worst, and tied entities receive the AVERAGE of the ranks (and
 * therefore points) they span. Because tie averaging preserves the total, a
 * sport's pool always sums to exactly N * (N + 1) / 2 — 105 for the
 * 14-participant season.
 *
 * This module is the canonical contract: the SQL scoring function (a later
 * issue) must mirror it exactly. Averaged ranks are always whole or half
 * numbers, which doubles represent exactly, so the 105 invariant is exact —
 * no floating-point tolerance is needed.
 *
 * Pure module: no imports from Remix, Supabase, or anything with side
 * effects.
 */

/** One entity's place in a sport's real-world standings. */
export interface StandingEntry {
  entityId: string;
  /**
   * Real-world standing position: lower is better. Entities with EQUAL
   * standing values are tied. Values only order the field — gaps are fine
   * (e.g. win totals negated, championship position, strokes).
   */
  standing: number;
}

/** An entity's normalized rank and points within its sport. */
export interface NormalizedStanding {
  entityId: string;
  /** Rank ordinal, 1 = best. Tied entities share the average of the ranks they span. */
  rank: number;
  /** Points earned: N + 1 - rank, where N is the field size. Ties share averaged points. */
  points: number;
}

/**
 * Normalize a sport's standings into ranks and points.
 *
 * Input order does not matter; entries are ordered by `standing` (ascending —
 * lower is better). A group of k tied entities spanning ranks r..r+k-1 each
 * receive rank (r + (r + k - 1)) / 2 and the matching averaged points.
 *
 * Returns entries sorted best-first. The points pool over all entries sums to
 * exactly N * (N + 1) / 2.
 */
export function normalizeStandings(entries: readonly StandingEntry[]): NormalizedStanding[] {
  const seen = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.entityId)) {
      throw new Error(`Duplicate entityId in standings: ${entry.entityId}`);
    }
    seen.add(entry.entityId);
    if (!Number.isFinite(entry.standing)) {
      throw new Error(`Non-finite standing for entity ${entry.entityId}`);
    }
  }

  const fieldSize = entries.length;
  const sorted = entries.slice().sort((a, b) => a.standing - b.standing);
  const result: NormalizedStanding[] = [];

  let index = 0;
  while (index < sorted.length) {
    // Collect the tie group sharing this standing value.
    let groupEnd = index + 1;
    while (groupEnd < sorted.length && sorted[groupEnd].standing === sorted[index].standing) {
      groupEnd++;
    }
    // Group spans ranks (index + 1) .. groupEnd; average of consecutive
    // integers is (first + last) / 2 — always a whole or half number.
    const rank = (index + 1 + groupEnd) / 2;
    const points = fieldSize + 1 - rank;
    for (let i = index; i < groupEnd; i++) {
      result.push({ entityId: sorted[i].entityId, rank, points });
    }
    index = groupEnd;
  }

  return result;
}
