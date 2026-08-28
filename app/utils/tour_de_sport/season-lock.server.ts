/**
 * Season Lock: the commissioner action that freezes a season's draw inputs.
 *
 * Runs as the signed-in commissioner (pass the user-authenticated Supabase
 * client from requireFantasyMember) — every write goes through the
 * commissioner RLS policies; the web app never touches the service-role key.
 *
 * What locking does, in order:
 *   1. Refuses if the season is already locked (locking is one-way in the
 *      app; an emergency unlock is a deliberate manual SQL step, by design).
 *   2. For each sport, builds strength tiers from the latest GOOD snapshot
 *      that actually has standings rows, ranked best to worst (rank
 *      ascending, entity id as the deterministic tie-break). Sports with no
 *      usable standings — or a pool smaller than the participant count —
 *      lock with empty tiers: they are simply not drawable yet (the console
 *      disables their Draw button); they do NOT block the lock. The lock
 *      refuses only when NO sport has tiers.
 *   3. Writes each sport's tiers, then — last, as the commit marker —
 *      the season's rng_seed (32 random hex chars generated server-side),
 *      locked_at, and locked_inputs (frozen participant order = participant
 *      id ascending, sport_key -> sport_index map, the tier rule sentence).
 *      A failure part-way leaves locked_at NULL, so the lock is re-runnable
 *      and re-running overwrites any partial tiers.
 */

import { randomBytes } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "../../../db_types";
import {
  buildTiers,
  TIER_RULE_SENTENCE,
  type LockedInputs,
  type SportTiers,
  type TierEntity,
} from "./tiers";

export type LockSeasonResult =
  | {
      ok: true;
      seed: string;
      lockedAt: string;
      /** sport_keys locked with non-empty tiers (drawable). */
      tieredSportKeys: string[];
      /** sport_keys locked with empty tiers (no usable standings yet). */
      untieredSportKeys: string[];
    }
  | { ok: false; error: string };

type StandingRow = {
  entity_id: number;
  rank: number;
  entity: { name: string } | { name: string }[] | null;
};

function entityName(row: StandingRow): string {
  const entity = Array.isArray(row.entity) ? row.entity[0] : row.entity;
  return entity?.name ?? `Entity ${row.entity_id}`;
}

/**
 * Rank a sport's pool from its newest good snapshot that has standings rows.
 * Returns null when no such snapshot exists.
 */
async function rankedPoolForSport(
  supabase: SupabaseClient<Database>,
  sportId: number
): Promise<TierEntity[] | null> {
  const { data: snapshots, error: snapshotsError } = await supabase
    .from("tds_snapshots")
    .select("id")
    .eq("sport_id", sportId)
    .eq("status", "good")
    .order("snapshot_date", { ascending: false })
    .limit(10);
  if (snapshotsError) {
    throw new Error(`Reading snapshots failed: ${snapshotsError.message}`);
  }

  for (const snapshot of snapshots ?? []) {
    const { data: standings, error: standingsError } = await supabase
      .from("tds_standings")
      .select("entity_id, rank, entity:tds_entities(name)")
      .eq("snapshot_id", snapshot.id)
      .order("rank", { ascending: true })
      .order("entity_id", { ascending: true });
    if (standingsError) {
      throw new Error(`Reading standings failed: ${standingsError.message}`);
    }
    if (standings && standings.length > 0) {
      return (standings as StandingRow[]).map((row) => ({
        id: row.entity_id,
        name: entityName(row),
      }));
    }
  }
  return null;
}

export async function lockSeason(
  supabase: SupabaseClient<Database>,
  seasonYear = 2027
): Promise<LockSeasonResult> {
  const { data: season, error: seasonError } = await supabase
    .from("tds_seasons")
    .select("id, locked_at")
    .eq("year", seasonYear)
    .maybeSingle();
  if (seasonError || !season) {
    return { ok: false, error: `Season ${seasonYear} was not found.` };
  }
  if (season.locked_at) {
    return { ok: false, error: "This season is already locked." };
  }

  // The frozen DrawInput.participants order: participant id ascending.
  const { data: participants, error: participantsError } = await supabase
    .from("tds_participants")
    .select("id, display_name")
    .eq("season_id", season.id)
    .order("id", { ascending: true });
  if (participantsError) {
    return { ok: false, error: "Reading participants failed." };
  }
  if (!participants || participants.length === 0) {
    return { ok: false, error: "No participants to lock — nothing to draw." };
  }

  const { data: sports, error: sportsError } = await supabase
    .from("tds_sports")
    .select("id, sport_key, sport_index")
    .eq("season_id", season.id)
    .order("sport_index", { ascending: true });
  if (sportsError || !sports || sports.length === 0) {
    return { ok: false, error: "Reading sports failed." };
  }

  // Build every sport's tiers before writing anything.
  const tiersBySportId = new Map<number, SportTiers>();
  const tieredSportKeys: string[] = [];
  const untieredSportKeys: string[] = [];
  for (const sport of sports) {
    let ranked: TierEntity[] | null;
    try {
      ranked = await rankedPoolForSport(supabase, sport.id);
    } catch (error) {
      return {
        ok: false,
        error: `${sport.sport_key}: ${error instanceof Error ? error.message : "standings read failed"}`,
      };
    }
    if (ranked && ranked.length >= participants.length) {
      tiersBySportId.set(sport.id, buildTiers(ranked, participants.length));
      tieredSportKeys.push(sport.sport_key);
    } else {
      // No usable standings (or a pool too small to cover every
      // participant): lock with empty tiers, not drawable yet.
      tiersBySportId.set(sport.id, []);
      untieredSportKeys.push(sport.sport_key);
    }
  }

  if (tieredSportKeys.length === 0) {
    return {
      ok: false,
      error: "No sport has usable standings — ingest at least one before locking.",
    };
  }

  // Persist tiers first; the season row (below) is the commit marker.
  for (const sport of sports) {
    const { data: updated, error: updateError } = await supabase
      .from("tds_sports")
      .update({ tiers: tiersBySportId.get(sport.id) as unknown as Json })
      .eq("id", sport.id)
      .select("id");
    if (updateError || !updated || updated.length !== 1) {
      // RLS silently updates zero rows for non-commissioners.
      return {
        ok: false,
        error: `Writing tiers for ${sport.sport_key} failed — commissioner access required.`,
      };
    }
  }

  const seed = randomBytes(16).toString("hex");
  const lockedAt = new Date().toISOString();
  const lockedInputs: LockedInputs = {
    participants: participants.map((p) => ({
      id: p.id,
      display_name: p.display_name,
    })),
    sport_indexes: Object.fromEntries(
      sports.map((s) => [s.sport_key, s.sport_index])
    ),
    tier_rule: TIER_RULE_SENTENCE,
  };

  const { data: lockedRows, error: lockError } = await supabase
    .from("tds_seasons")
    .update({
      rng_seed: seed,
      locked_at: lockedAt,
      locked_inputs: lockedInputs as unknown as Json,
    })
    .eq("id", season.id)
    .is("locked_at", null)
    .select("id");
  if (lockError || !lockedRows || lockedRows.length !== 1) {
    return {
      ok: false,
      error: "Locking the season failed — commissioner access required.",
    };
  }

  return { ok: true, seed, lockedAt, tieredSportKeys, untieredSportKeys };
}
