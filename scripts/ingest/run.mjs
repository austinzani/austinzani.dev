#!/usr/bin/env node
// Tour de Sport ingest orchestrator.
//
// Usage:
//   npm run ingest                # every sport with a registered adapter
//   npm run ingest -- --sport nhl # one sport (workflow_dispatch re-runs)
//   npm run ingest -- nhl         # positional form of the same filter
//
// Env (process.env, with .env.local at the repo root loaded via dotenv —
// never commit real values):
//   SUPABASE_URL               required — local stack or production API URL
//   SUPABASE_SERVICE_ROLE_KEY  required — service-role key (ingest tables are
//                              service-role-only under RLS)
//   TDS_RUNNER                 optional — who ran this ('local' default;
//                              e.g. 'github-actions', 'mac-mini'). Recorded
//                              in each snapshot's payload.
//
// Flow per sport (season 2027 rows, ordered by sport_index):
//   adapter.fetch() → zod contract validation → upsert entities on
//   (sport_id, name) → upsert snapshot on (sport_id, snapshot_date=today UTC)
//   → replace that snapshot's standings rows.
// An adapter that throws or fails validation records a failed snapshot with
// the error text and zero standings rows, and the run moves on. Exit 0 if at
// least one sport succeeded, 1 otherwise.
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { validateAdapterResult } from "./contract.mjs";
import { adapters } from "./registry.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
dotenv.config({ path: path.join(repoRoot, ".env.local") });

const SEASON_YEAR = 2027;

function parseArgs(argv) {
  let sportFilter = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--sport") {
      sportFilter = argv[++i] ?? null;
    } else if (arg.startsWith("--sport=")) {
      sportFilter = arg.slice("--sport=".length);
    } else if (!arg.startsWith("-") && sportFilter === null) {
      sportFilter = arg;
    }
  }
  return { sportFilter };
}

function fail(message) {
  console.error(`ingest: ${message}`);
  process.exit(1);
}

/** Record a failed snapshot and make sure it carries zero standings rows. */
async function recordFailure(supabase, sportId, snapshotDate, runner, errorText) {
  const { data: snapshot, error } = await supabase
    .from("tds_snapshots")
    .upsert(
      {
        sport_id: sportId,
        snapshot_date: snapshotDate,
        status: "failed",
        error: errorText,
        payload: { runner },
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "sport_id,snapshot_date" },
    )
    .select("id")
    .single();
  if (error) throw new Error(`recording failure snapshot: ${error.message}`);
  // If an earlier run today succeeded, its standings hang off this same
  // snapshot row — a failed snapshot must have none.
  const { error: deleteError } = await supabase
    .from("tds_standings")
    .delete()
    .eq("snapshot_id", snapshot.id);
  if (deleteError) {
    throw new Error(`clearing standings for failed snapshot: ${deleteError.message}`);
  }
}

async function ingestSport(supabase, sport, adapter, snapshotDate, runner) {
  const result = validateAdapterResult(sport.sport_key, await adapter.fetch());

  // Entities: upsert by (sport_id, name), carrying source ids + image.
  const { data: entityRows, error: entityError } = await supabase
    .from("tds_entities")
    .upsert(
      result.entities.map((entity) => ({
        sport_id: sport.id,
        name: entity.name,
        source_ids: entity.sourceIds,
        image_url: entity.imageUrl ?? null,
      })),
      { onConflict: "sport_id,name" },
    )
    .select("id, name");
  if (entityError) throw new Error(`upserting entities: ${entityError.message}`);

  const entityIdByName = new Map(entityRows.map((row) => [row.name, row.id]));

  // Snapshot: one row per sport per UTC day; re-runs update it. The payload
  // stores the validated adapter output (not the raw upstream body — the NHL
  // raw body is ~60KB of splits we never read) plus the runner marker.
  const { data: snapshot, error: snapshotError } = await supabase
    .from("tds_snapshots")
    .upsert(
      {
        sport_id: sport.id,
        snapshot_date: snapshotDate,
        status: "good",
        error: null,
        payload: { runner, adapter: result },
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "sport_id,snapshot_date" },
    )
    .select("id")
    .single();
  if (snapshotError) throw new Error(`upserting snapshot: ${snapshotError.message}`);

  // Standings: replace this snapshot's rows wholesale (delete-then-insert
  // keeps re-runs clean even if the entity set shifted).
  const { error: clearError } = await supabase
    .from("tds_standings")
    .delete()
    .eq("snapshot_id", snapshot.id);
  if (clearError) throw new Error(`clearing standings: ${clearError.message}`);

  const standingsRows = result.entities.map((entity) => {
    const entityId = entityIdByName.get(entity.name);
    if (!entityId) throw new Error(`no entity id for "${entity.name}" after upsert`);
    return {
      snapshot_id: snapshot.id,
      entity_id: entityId,
      rank: entity.rank,
      metric_value: entity.metricValue ?? null,
    };
  });
  const { error: insertError } = await supabase
    .from("tds_standings")
    .insert(standingsRows);
  if (insertError) throw new Error(`inserting standings: ${insertError.message}`);

  return { entities: entityRows.length, standings: standingsRows.length };
}

async function main() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    fail(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (via env or .env.local). Refusing to run.",
    );
  }
  const runner = process.env.TDS_RUNNER || "local";
  const { sportFilter } = parseArgs(process.argv.slice(2));

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: season, error: seasonError } = await supabase
    .from("tds_seasons")
    .select("id, name")
    .eq("year", SEASON_YEAR)
    .maybeSingle();
  if (seasonError) fail(`loading season ${SEASON_YEAR}: ${seasonError.message}`);
  if (!season) fail(`no tds_seasons row for year ${SEASON_YEAR}`);

  let sportsQuery = supabase
    .from("tds_sports")
    .select("id, sport_key, name")
    .eq("season_id", season.id)
    .order("sport_index");
  if (sportFilter) sportsQuery = sportsQuery.eq("sport_key", sportFilter);
  const { data: sports, error: sportsError } = await sportsQuery;
  if (sportsError) fail(`loading sports: ${sportsError.message}`);
  if (!sports.length) {
    fail(sportFilter ? `no sport with sport_key "${sportFilter}" in season ${SEASON_YEAR}` : "no sports found");
  }

  const snapshotDate = new Date().toISOString().slice(0, 10); // today, UTC
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (const sport of sports) {
    const adapter = adapters[sport.sport_key];
    if (!adapter) {
      skipped += 1; // no adapter yet — the sport is still 'pending'
      continue;
    }
    try {
      const counts = await ingestSport(supabase, sport, adapter, snapshotDate, runner);
      succeeded += 1;
      console.log(
        `ingest: ${sport.sport_key} ok — ${counts.entities} entities, ${counts.standings} standings (${snapshotDate})`,
      );
    } catch (error) {
      failed += 1;
      const errorText = error instanceof Error ? error.message : String(error);
      console.error(`ingest: ${sport.sport_key} FAILED — ${errorText}`);
      try {
        await recordFailure(supabase, sport.id, snapshotDate, runner, errorText);
      } catch (recordError) {
        console.error(`ingest: ${sport.sport_key} — could not record failure: ${recordError.message}`);
      }
    }
  }

  console.log(
    `ingest: done — ${succeeded} succeeded, ${failed} failed, ${skipped} skipped (no adapter), runner=${runner}`,
  );
  if (succeeded === 0) {
    fail(failed > 0 ? "all attempted sports failed" : "no sport had a registered adapter");
  }
}

main().catch((error) => {
  fail(error instanceof Error ? error.stack ?? error.message : String(error));
});
