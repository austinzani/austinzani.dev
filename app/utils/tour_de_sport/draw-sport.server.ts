/**
 * The per-sport Draw action: compute-and-persist, then re-display forever.
 *
 * Runs as the signed-in commissioner (pass the user-authenticated Supabase
 * client from requireFantasyMember) — the insert/select go through the
 * commissioner RLS policies from the Season Lock migration; the web app never
 * touches the service-role key.
 *
 * Invariants this module enforces:
 *   - Nothing draws before Season Lock, and a sport locked with empty tiers
 *     (no usable standings) is refused with a plain reason.
 *   - Assignments are PERSISTED before anything animates: the result returned
 *     to the client is always read back from the database, never the
 *     in-memory draw — a crashed browser loses nothing.
 *   - A sport that already has saved assignments is NEVER re-rolled:
 *     re-clicking Draw re-reads and re-returns the saved rows. Double-submits
 *     are safe — the loser of a concurrent insert race hits the table's
 *     unique constraints (23505) and falls back to the winner's saved rows.
 *   - revealed_at is stamped after the insert succeeds, flipping the sport's
 *     assignments publicly visible (reveal-gated RLS). If the process dies
 *     between insert and stamp, the next click heals it.
 *
 * Names in the returned rows come from the FROZEN inputs (locked_inputs
 * participants + the sport's tiers JSON), not live joins — the reveal shows
 * exactly what Season Lock published.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../db_types";
import { drawSport } from "./draw";
import {
  drawInputFromLockedSeason,
  sportPoolFromSportRow,
  type LockedInputs,
  type SportTiers,
} from "./tiers";

/** One saved assignment row, decorated with the frozen display names. */
export type SavedAssignment = {
  id: number;
  participant_id: number;
  participant_name: string;
  entity_id: number;
  entity_name: string;
  tier_index: number | null;
  tier_slot: number | null;
};

export type DrawSportResult =
  | {
      ok: true;
      sportId: number;
      sportKey: string;
      sportName: string;
      /** True when this call re-displayed saved rows instead of drawing. */
      alreadyDrawn: boolean;
      revealedAt: string | null;
      /** All saved rows, ordered strongest pick slot first. */
      assignments: SavedAssignment[];
    }
  | { ok: false; error: string };

const UNIQUE_VIOLATION = "23505";

export async function drawSportForSeason(
  supabase: SupabaseClient<Database>,
  sportId: number,
  seasonYear = 2027
): Promise<DrawSportResult> {
  const { data: season, error: seasonError } = await supabase
    .from("tds_seasons")
    .select("id, rng_seed, locked_at, locked_inputs")
    .eq("year", seasonYear)
    .maybeSingle();
  if (seasonError || !season) {
    return { ok: false, error: `Season ${seasonYear} was not found.` };
  }
  if (!season.locked_at || !season.rng_seed || !season.locked_inputs) {
    return {
      ok: false,
      error: "The season is not locked — nothing is drawable before Season Lock.",
    };
  }
  const lockedInputs = season.locked_inputs as unknown as LockedInputs;

  const { data: sport, error: sportError } = await supabase
    .from("tds_sports")
    .select("id, season_id, sport_key, name, sport_index, tiers, revealed_at")
    .eq("id", sportId)
    .maybeSingle();
  if (sportError || !sport || sport.season_id !== season.id) {
    return { ok: false, error: "That sport does not exist in this season." };
  }
  const tiers = (sport.tiers ?? null) as SportTiers | null;

  // Display names come from the frozen inputs, never live joins.
  const participantNameById = new Map(
    lockedInputs.participants.map((p) => [p.id, p.display_name])
  );
  const entityNameById = new Map(
    (tiers ?? []).flat().map((entity) => [entity.id, entity.name])
  );

  const readSaved = async () => {
    const { data, error } = await supabase
      .from("tds_assignments")
      .select("id, participant_id, entity_id, tier_index, tier_slot")
      .eq("sport_id", sport.id)
      .order("tier_slot", { ascending: true })
      .order("id", { ascending: true });
    if (error) {
      throw new Error(`Reading saved assignments failed: ${error.message}`);
    }
    return data ?? [];
  };

  const expected = lockedInputs.participants.length;
  let saved: Awaited<ReturnType<typeof readSaved>>;
  let alreadyDrawn: boolean;
  try {
    saved = await readSaved();
    alreadyDrawn = saved.length > 0;

    if (saved.length === 0) {
      // The frozen sport_index from locked_inputs is the draw input; the row's
      // own index is only a fallback for pre-freeze data.
      const frozenIndex =
        lockedInputs.sport_indexes[sport.sport_key] ?? sport.sport_index;
      const pool = sportPoolFromSportRow({
        sport_key: sport.sport_key,
        sport_index: frozenIndex,
        tiers,
      });
      if (!pool) {
        return {
          ok: false,
          error: `${sport.name} was locked without usable standings — it is not drawable.`,
        };
      }

      const drawn = drawSport(
        drawInputFromLockedSeason({
          rng_seed: season.rng_seed,
          locked_inputs: lockedInputs,
        }),
        pool
      );
      const rows = drawn.map((assignment) => ({
        sport_id: sport.id,
        participant_id: Number(assignment.participantId),
        entity_id: Number(assignment.entityId),
        tier_index: assignment.tierIndex,
        // The FLATTENED strongest-first pick slot (see the AUS-845 handoff):
        // strictly more informative than a within-tier position.
        tier_slot: assignment.slot,
      }));

      // One multi-row INSERT: atomic, so there is no partial-write state to
      // recover from — it lands whole or not at all.
      const { error: insertError } = await supabase
        .from("tds_assignments")
        .insert(rows);
      if (insertError && insertError.code !== UNIQUE_VIOLATION) {
        return {
          ok: false,
          error: `Saving ${sport.name} assignments FAILED — nothing was revealed. ${insertError.message}`,
        };
      }
      // Success, or a concurrent draw won the race (unique violation): either
      // way the database now holds the one true result — read it back.
      alreadyDrawn = Boolean(insertError);
      saved = await readSaved();
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Draw failed.",
    };
  }

  if (saved.length !== expected) {
    return {
      ok: false,
      error: `${sport.name} has ${saved.length} saved assignments for ${expected} participants — inconsistent state, do NOT redraw; inspect tds_assignments manually.`,
    };
  }

  // Assignments are down; stamp the reveal (idempotent, races safely).
  let revealedAt = sport.revealed_at;
  if (!revealedAt) {
    const now = new Date().toISOString();
    const { data: updated, error: revealError } = await supabase
      .from("tds_sports")
      .update({ revealed_at: now })
      .eq("id", sport.id)
      .is("revealed_at", null)
      .select("revealed_at");
    if (revealError) {
      return {
        ok: false,
        error: `Assignments are saved but marking ${sport.name} revealed failed: ${revealError.message}. Click Draw again to retry.`,
      };
    }
    if (updated && updated.length === 1) {
      revealedAt = updated[0].revealed_at;
    } else {
      // A concurrent submit stamped it first (or RLS filtered us out —
      // impossible for the commissioner who just inserted). Re-read.
      const { data: fresh } = await supabase
        .from("tds_sports")
        .select("revealed_at")
        .eq("id", sport.id)
        .maybeSingle();
      revealedAt = fresh?.revealed_at ?? null;
      if (!revealedAt) {
        return {
          ok: false,
          error: `Assignments are saved but ${sport.name} could not be marked revealed. Click Draw again to retry.`,
        };
      }
    }
  }

  return {
    ok: true,
    sportId: sport.id,
    sportKey: sport.sport_key,
    sportName: sport.name,
    alreadyDrawn,
    revealedAt,
    assignments: saved.map((row) => ({
      ...row,
      participant_name:
        participantNameById.get(row.participant_id) ??
        `Participant ${row.participant_id}`,
      entity_name:
        entityNameById.get(row.entity_id) ?? `Entity ${row.entity_id}`,
    })),
  };
}
