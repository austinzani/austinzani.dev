#!/usr/bin/env node
// Tour de Sport scoring invariant checks (AUS-849).
//
// Usage:
//   npm run check:invariants
//   npm run check:invariants -- --season 2027
//
// Env (process.env, with .env.local at the repo root loaded via dotenv —
// real env vars win):
//   SUPABASE_URL        required
//   SUPABASE_ANON_KEY   required — deliberately the ANON key, NOT the service
//                       role: the invariants describe what the PUBLIC sees,
//                       so the checks must exercise the real RLS path the
//                       scoreboard/detail pages use. A service-role run would
//                       also "see" pre-reveal data no visitor can.
//
// Checks (against the real database via the scoring RPCs):
//   1. POOL      every counted (status counting/final AND revealed) sport's
//                points pool sums to exactly N*(N+1)/2 with N=14 → 105
//                (tolerance 1e-9). Sports containing a manual override are
//                SKIPPED for this check only — an override legitimately
//                breaks the pool — and reported as such.
//   2. PENDING   pending sports contribute zero to every total: their
//                scoreboard breakdown entries are counted=false, and totals
//                are reproduced from counted sports only (check 3), so any
//                pending leakage into a total fails there.
//   3. TOTAL     each participant's scoreboard total equals the sum of that
//                participant's per-sport points across counted sports,
//                recomputed independently from tds_sport_scores.
//   4. REVEAL    (leak guard) an unrevealed sport returns zero rows from
//                tds_sport_scores for this anon client.
//
// Exit 0 when everything holds, 1 otherwise, with a per-check report.
// Importable: `import { runInvariantChecks } from "./check-invariants.mjs"`
// for a future Actions workflow step; the CLI entry only runs when executed
// directly.

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(repoRoot, ".env.local") });

const DEFAULT_SEASON_YEAR = 2027;
const EXPECTED_FIELD_SIZE = 14;
const TOLERANCE = 1e-9;

const expectedPool = (n) => (n * (n + 1)) / 2; // 105 for 14

/**
 * Run every invariant check. Returns { ok, lines } where lines is the full
 * human-readable report. Throws only on unexpected transport/config errors.
 */
export async function runInvariantChecks({
  url,
  anonKey,
  seasonYear = DEFAULT_SEASON_YEAR,
} = {}) {
  if (!url || !anonKey) {
    throw new Error("runInvariantChecks requires { url, anonKey }");
  }
  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false },
  });
  const lines = [];
  const failures = [];
  const log = (line) => lines.push(line);
  const fail = (line) => {
    failures.push(line);
    lines.push(`FAIL ${line}`);
  };

  const { data: season, error: seasonError } = await supabase
    .from("tds_seasons")
    .select("id, year")
    .eq("year", seasonYear)
    .maybeSingle();
  if (seasonError) throw new Error(`tds_seasons query failed: ${seasonError.message}`);
  if (!season) {
    fail(`season ${seasonYear} not found`);
    return { ok: false, lines };
  }

  const { data: sports, error: sportsError } = await supabase
    .from("tds_sports")
    .select("id, sport_key, name, status, revealed_at")
    .eq("season_id", season.id)
    .order("sport_index");
  if (sportsError) throw new Error(`tds_sports query failed: ${sportsError.message}`);

  const counted = sports.filter(
    (s) => s.revealed_at !== null && (s.status === "counting" || s.status === "final"),
  );
  const pending = sports.filter((s) => s.status === "pending");
  const unrevealed = sports.filter((s) => s.revealed_at === null);
  log(
    `season ${seasonYear}: ${sports.length} sports — ${counted.length} counted, ` +
      `${pending.length} pending, ${unrevealed.length} unrevealed`,
  );

  // Per-sport score rows for every counted sport (also feeds check 3).
  const countedScores = new Map(); // sport_key -> rows
  for (const sport of counted) {
    const { data: rows, error } = await supabase.rpc("tds_sport_scores", {
      p_season_year: seasonYear,
      p_sport_key: sport.sport_key,
    });
    if (error) throw new Error(`tds_sport_scores(${sport.sport_key}) failed: ${error.message}`);
    countedScores.set(sport.sport_key, rows ?? []);
  }

  // Check 1: pool sums to exactly N(N+1)/2 = 105 per counted sport.
  for (const sport of counted) {
    const rows = countedScores.get(sport.sport_key);
    const overriddenRows = rows.filter((r) => r.overridden);
    if (overriddenRows.length > 0) {
      log(
        `POOL skip ${sport.sport_key}: ${overriddenRows.length} manual ` +
          `override(s) present — pool invariant does not apply (totals still checked)`,
      );
      continue;
    }
    const pool = rows.reduce((sum, r) => sum + Number(r.points), 0);
    const target = expectedPool(EXPECTED_FIELD_SIZE);
    if (rows.length !== EXPECTED_FIELD_SIZE) {
      fail(`POOL ${sport.sport_key}: expected ${EXPECTED_FIELD_SIZE} rows, got ${rows.length}`);
    } else if (Math.abs(pool - target) > TOLERANCE) {
      fail(`POOL ${sport.sport_key}: pool sums to ${pool}, expected ${target}`);
    } else {
      log(`POOL ok ${sport.sport_key}: ${rows.length} rows, pool = ${pool}`);
    }
  }

  // Scoreboard (feeds checks 2 + 3).
  const { data: board, error: boardError } = await supabase.rpc("tds_scoreboard", {
    p_season_year: seasonYear,
  });
  if (boardError) throw new Error(`tds_scoreboard failed: ${boardError.message}`);

  // Check 2: pending sports are flagged uncounted on every breakdown entry.
  let pendingEntries = 0;
  for (const row of board) {
    for (const entry of row.sports ?? []) {
      if (entry.status === "pending") {
        pendingEntries++;
        if (entry.counted) {
          fail(
            `PENDING ${entry.sport_key}: marked counted on participant ${row.participant_id}'s breakdown`,
          );
        }
      }
    }
  }
  log(`PENDING ok: ${pendingEntries} pending breakdown entries, all counted=false`);

  // Check 3: totals equal the independent per-sport recomputation over
  // counted sports (which also proves pending/unrevealed contribute zero).
  const recomputed = new Map(); // participant_id -> sum
  for (const rows of countedScores.values()) {
    for (const r of rows) {
      recomputed.set(r.participant_id, (recomputed.get(r.participant_id) ?? 0) + Number(r.points));
    }
  }
  let totalsOk = 0;
  for (const row of board) {
    const expected = recomputed.get(row.participant_id) ?? 0;
    const actual = Number(row.total_points);
    if (Math.abs(actual - expected) > TOLERANCE) {
      fail(
        `TOTAL participant ${row.participant_id} (${row.display_name}): ` +
          `scoreboard ${actual} != counted-sports sum ${expected}`,
      );
    } else {
      totalsOk++;
    }
  }
  log(`TOTAL ok: ${totalsOk}/${board.length} participant totals match counted-sports sums`);

  // Check 4: unrevealed sports must leak nothing to this anon client.
  for (const sport of unrevealed) {
    const { data: rows, error } = await supabase.rpc("tds_sport_scores", {
      p_season_year: seasonYear,
      p_sport_key: sport.sport_key,
    });
    if (error) throw new Error(`tds_sport_scores(${sport.sport_key}) failed: ${error.message}`);
    if ((rows ?? []).length > 0) {
      fail(`REVEAL ${sport.sport_key}: unrevealed sport returned ${rows.length} score rows to anon`);
    }
  }
  log(`REVEAL ok: ${unrevealed.length} unrevealed sports all return zero rows`);

  return { ok: failures.length === 0, lines };
}

function parseArgs(argv) {
  let seasonYear = DEFAULT_SEASON_YEAR;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--season") seasonYear = Number(argv[++i]);
    else if (argv[i].startsWith("--season=")) seasonYear = Number(argv[i].slice("--season=".length));
  }
  if (!Number.isInteger(seasonYear)) {
    console.error("check-invariants: --season must be an integer year");
    process.exit(1);
  }
  return { seasonYear };
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.error(
      "check-invariants: SUPABASE_URL and SUPABASE_ANON_KEY are required " +
        "(anon on purpose — the checks must see exactly what the public sees).",
    );
    process.exit(1);
  }
  const { seasonYear } = parseArgs(process.argv.slice(2));
  const { ok, lines } = await runInvariantChecks({ url, anonKey, seasonYear });
  for (const line of lines) console.log(`check-invariants: ${line}`);
  console.log(`check-invariants: ${ok ? "ALL INVARIANTS HOLD" : "INVARIANT VIOLATIONS FOUND"}`);
  process.exit(ok ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`check-invariants: ${error.message}`);
    process.exit(1);
  });
}
