/**
 * The Tour de Sport Draw: an equal-odds tiered snake with a seeded RNG.
 *
 * Published methodology (plain English)
 * -------------------------------------
 * All inputs are frozen at Season Lock: the seed string, the participant
 * list, and each sport's entity pool grouped into strength tiers (tiers
 * ordered strongest to weakest). From those inputs every assignment is a pure
 * deterministic function — anyone can re-run the draw from the published seed
 * and tiers and get byte-identical results.
 *
 * 1. A single GLOBAL participant order is produced by an unbiased seeded
 *    shuffle of the participant list (seed namespace "participants"). Every
 *    participant has equal odds of landing in any position — there is no
 *    weighting of any kind.
 *
 * 2. Each sport's pool is flattened into pick slots: within every tier the
 *    entities are shuffled by a per-sport RNG stream (seed namespace
 *    "sport:<sportKey>"), then the tiers are concatenated strongest first.
 *    Slot 0 holds an entity from the top tier, the last slots the weakest.
 *    With more entities than participants, positions past the participant
 *    count are simply never assigned. Which entity sits at which slot of its
 *    tier is pure seeded luck — luck lives inside tiers.
 *
 * 3. Slots are dealt serpentine-style, driven only by the sport's frozen
 *    index i in the season's sport list (NOT by the order sports are drawn
 *    in). Sports are paired (0,1), (2,3), ...; pair k = floor(i / 2). In the
 *    first sport of a pair, the participant at global position g takes slot
 *    (g + k) mod P; in the second, the MIRROR slot P - 1 - ((g + k) mod P).
 *    Each pair therefore hands every participant two slots that sum to
 *    exactly P - 1 (one high, one low), and successive pairs rotate the
 *    starting offset by one. Over an even number of sports every
 *    participant's slot total is identical — portfolios are balanced by
 *    construction, while the specific entities inside each tier stay random.
 *
 * Because a sport's result depends only on (seed, participants, its own
 * tiers, its own frozen index), the commissioner can draw sports live in any
 * order — even across days — without changing any outcome.
 *
 * Pure module: no imports from Remix, Supabase, or anything with side
 * effects.
 */

import { createRng, shuffle } from "./rng";

/** One sport's frozen draw inputs. */
export interface SportPool {
  /** Stable sport identity, e.g. "nfl". Feeds the per-sport RNG stream. */
  sportKey: string;
  /**
   * The sport's frozen, 0-based index in the season's sport list. Drives the
   * serpentine offset and direction; frozen at Season Lock.
   */
  sportIndex: number;
  /**
   * Entity ids grouped into strength tiers, ordered strongest tier first.
   * Total entities must be at least the participant count; extras beyond it
   * (weakest flattened positions) are left unassigned.
   */
  tiers: ReadonlyArray<readonly string[]>;
}

/** One participant paired with one entity in one sport. */
export interface Assignment {
  sportKey: string;
  participantId: string;
  entityId: string;
  /** 0-based index of the tier the entity came from (0 = strongest). */
  tierIndex: number;
  /** 0-based pick slot in the flattened strongest-first pool. */
  slot: number;
}

export interface DrawInput {
  /** The season's published RNG seed, frozen at Season Lock. */
  seed: string;
  /** Participant ids, in the frozen Season Lock order. */
  participants: readonly string[];
}

function validateParticipants(participants: readonly string[]): void {
  if (participants.length === 0) {
    throw new Error("Draw requires at least one participant");
  }
  const seen = new Set<string>();
  for (const id of participants) {
    if (seen.has(id)) {
      throw new Error(`Duplicate participantId: ${id}`);
    }
    seen.add(id);
  }
}

function validateSport(sport: SportPool, participantCount: number): void {
  if (!Number.isInteger(sport.sportIndex) || sport.sportIndex < 0) {
    throw new Error(`Sport ${sport.sportKey} has invalid sportIndex ${sport.sportIndex}`);
  }
  const seen = new Set<string>();
  let total = 0;
  for (const tier of sport.tiers) {
    for (const id of tier) {
      if (seen.has(id)) {
        throw new Error(`Sport ${sport.sportKey} lists entity ${id} twice`);
      }
      seen.add(id);
      total++;
    }
  }
  if (total < participantCount) {
    throw new Error(
      `Sport ${sport.sportKey} has ${total} entities for ${participantCount} participants`
    );
  }
}

/** The seeded global participant order shared by every sport of a season. */
export function globalParticipantOrder(input: DrawInput): string[] {
  validateParticipants(input.participants);
  return shuffle(input.participants, createRng(`${input.seed}|participants`));
}

/**
 * Draw one sport. Deterministic from (seed, participants, sport) alone —
 * independent of which other sports have been drawn or in what order.
 * Returns one assignment per participant, in participant-input order.
 */
export function drawSport(input: DrawInput, sport: SportPool): Assignment[] {
  validateParticipants(input.participants);
  validateSport(sport, input.participants.length);

  const participantCount = input.participants.length;
  const order = globalParticipantOrder(input);

  // Flatten tiers strongest-first, shuffling entities within each tier.
  const sportRng = createRng(`${input.seed}|sport|${sport.sportKey}`);
  const flattened: Array<{ entityId: string; tierIndex: number }> = [];
  sport.tiers.forEach((tier, tierIndex) => {
    for (const entityId of shuffle(tier, sportRng)) {
      flattened.push({ entityId, tierIndex });
    }
  });

  const pairOffset = Math.floor(sport.sportIndex / 2);
  const mirrored = sport.sportIndex % 2 === 1;

  const byParticipant = new Map<string, Assignment>();
  order.forEach((participantId, globalPosition) => {
    let slot = (globalPosition + pairOffset) % participantCount;
    if (mirrored) {
      slot = participantCount - 1 - slot;
    }
    const pick = flattened[slot];
    byParticipant.set(participantId, {
      sportKey: sport.sportKey,
      participantId,
      entityId: pick.entityId,
      tierIndex: pick.tierIndex,
      slot,
    });
  });

  // Report in the frozen participant-input order for stable output.
  return input.participants.map((participantId) => {
    const assignment = byParticipant.get(participantId);
    if (!assignment) {
      throw new Error(`Draw produced no assignment for participant ${participantId}`);
    }
    return assignment;
  });
}

/**
 * Convenience: draw every sport of a season. Purely maps drawSport, so each
 * sport's result is identical to drawing it alone.
 */
export function drawSeason(
  input: DrawInput,
  sports: readonly SportPool[]
): Record<string, Assignment[]> {
  const result: Record<string, Assignment[]> = {};
  for (const sport of sports) {
    if (result[sport.sportKey] !== undefined) {
      throw new Error(`Duplicate sportKey in season: ${sport.sportKey}`);
    }
    result[sport.sportKey] = drawSport(input, sport);
  }
  return result;
}
