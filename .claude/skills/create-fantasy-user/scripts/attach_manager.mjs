#!/usr/bin/env node
// Attach existing auth users to existing public.manager rows by inserting
// public.league_memberships rows. Designed for the "match-after-signup" flow:
// users sign themselves up via Google OAuth or email/password, then the
// commissioner runs this to map each new auth user to their historical
// manager record.
//
// This script does NOT create auth users or manager rows — use
// create_fantasy_user.mjs for that fallback path.
//
// Usage (batch, preferred):
//   node .claude/skills/create-fantasy-user/scripts/attach_manager.mjs \
//     --pairings '[{"email":"a@b.com","manager_id":36},{"email":"c@d.com","manager_id":30,"role":"commissioner"}]' \
//     [--league <slug>]
//
// Usage (single, convenience):
//   node .claude/skills/create-fantasy-user/scripts/attach_manager.mjs \
//     --email <email> --manager-id <id> [--role manager|commissioner] [--league <slug>]
//
// Env (loaded from .env then .env.local, latter wins):
//   SUPABASE_URL               required
//   SUPABASE_SERVICE_ROLE_KEY  required (admin API; never commit)
//
// Output: a single JSON object with per-pairing results.

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_LEAGUE_SLUG = "zaks-league-to-lose";
const VALID_ROLES = new Set(["manager", "commissioner"]);

function parseArgs(argv) {
  const args = { league: DEFAULT_LEAGUE_SLUG };
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      fail(`Flag --${key} requires a value.`);
    }
    if (key === "pairings") args.pairings = next;
    else if (key === "email") args.email = next.trim().toLowerCase();
    else if (key === "manager-id") args.managerId = parseInt(next, 10);
    else if (key === "role") args.role = next.trim();
    else if (key === "league") args.league = next.trim();
    else fail(`Unknown flag: --${key}`);
    i++;
  }
  return args;
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function normalizePairings(args) {
  if (args.pairings) {
    let parsed;
    try {
      parsed = JSON.parse(args.pairings);
    } catch (err) {
      fail(`--pairings is not valid JSON: ${err.message}`);
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      fail("--pairings must be a non-empty JSON array.");
    }
    return parsed.map((entry, idx) => normalizePairing(entry, idx));
  }
  if (args.email || args.managerId) {
    if (!args.email) fail("--email is required when not using --pairings.");
    if (!args.managerId) fail("--manager-id is required when not using --pairings.");
    return [
      normalizePairing(
        { email: args.email, manager_id: args.managerId, role: args.role },
        0
      ),
    ];
  }
  fail("Provide either --pairings or both --email and --manager-id.");
}

function normalizePairing(entry, idx) {
  if (!entry || typeof entry !== "object") {
    fail(`Pairing #${idx} is not an object.`);
  }
  const email = String(entry.email ?? "").trim().toLowerCase();
  const managerId =
    typeof entry.manager_id === "number"
      ? entry.manager_id
      : parseInt(entry.manager_id, 10);
  const role = (entry.role ?? "manager").trim();

  if (!email) fail(`Pairing #${idx} is missing 'email'.`);
  if (!Number.isInteger(managerId) || managerId <= 0) {
    fail(`Pairing #${idx} has invalid 'manager_id': ${entry.manager_id}`);
  }
  if (!VALID_ROLES.has(role)) {
    fail(
      `Pairing #${idx} has invalid 'role': ${role}. Must be 'manager' or 'commissioner'.`
    );
  }
  return { email, manager_id: managerId, role };
}

async function findAuthUserByEmail(admin, email) {
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find(
      (u) => (u.email ?? "").toLowerCase() === email
    );
    if (match) return match;
    if (data.users.length < perPage) return null;
    page++;
  }
}

async function attachOne(admin, league, pairing, managerById) {
  const { email, manager_id, role } = pairing;

  const manager = managerById.get(manager_id);
  if (!manager) {
    return {
      ...pairing,
      status: "error",
      error: `Manager id ${manager_id} not found.`,
    };
  }

  const authUser = await findAuthUserByEmail(admin, email);
  if (!authUser) {
    return {
      ...pairing,
      status: "error",
      error: `No auth user with email '${email}'. They must sign up first.`,
    };
  }

  // Idempotency: if this user already has a membership in this league, skip.
  const { data: existingForUser, error: existingForUserError } = await admin
    .from("league_memberships")
    .select("id, manager_id, role")
    .eq("league_id", league.id)
    .eq("user_id", authUser.id)
    .maybeSingle();
  if (existingForUserError) {
    return {
      ...pairing,
      status: "error",
      error: `Membership lookup failed: ${existingForUserError.message}`,
    };
  }
  if (existingForUser) {
    return {
      ...pairing,
      status:
        existingForUser.manager_id === manager_id
          ? "already_member"
          : "already_member_other_manager",
      user_id: authUser.id,
      existing_manager_id: existingForUser.manager_id,
      existing_role: existingForUser.role,
    };
  }

  // Conflict guard: if this manager is already attached to a different user in this league, fail clearly.
  const { data: existingForManager, error: existingForManagerError } = await admin
    .from("league_memberships")
    .select("id, user_id, role")
    .eq("league_id", league.id)
    .eq("manager_id", manager_id)
    .maybeSingle();
  if (existingForManagerError) {
    return {
      ...pairing,
      status: "error",
      error: `Manager-membership lookup failed: ${existingForManagerError.message}`,
    };
  }
  if (existingForManager) {
    return {
      ...pairing,
      status: "manager_taken",
      user_id: authUser.id,
      conflicting_membership_id: existingForManager.id,
      conflicting_user_id: existingForManager.user_id,
      error: `Manager ${manager_id} (${manager.name}) is already attached to a different user in this league. Resolve the conflict before retrying.`,
    };
  }

  const { data: membership, error: insertError } = await admin
    .from("league_memberships")
    .insert({
      league_id: league.id,
      user_id: authUser.id,
      manager_id,
      role,
    })
    .select("id")
    .single();
  if (insertError) {
    return {
      ...pairing,
      status: "error",
      user_id: authUser.id,
      error: `Insert failed: ${insertError.message}`,
    };
  }

  return {
    ...pairing,
    status: "created",
    user_id: authUser.id,
    membership_id: membership.id,
    manager_name: manager.name,
  };
}

async function main() {
  const repoRoot = process.cwd();
  loadEnvFile(resolve(repoRoot, ".env"));
  loadEnvFile(resolve(repoRoot, ".env.local"));

  const args = parseArgs(process.argv);
  const pairings = normalizePairings(args);

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) fail("SUPABASE_URL not set (check .env / .env.local).");
  if (!serviceKey) {
    fail(
      "SUPABASE_SERVICE_ROLE_KEY not set. Add it to .env.local — do NOT commit."
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: league, error: leagueError } = await admin
    .from("leagues")
    .select("id, slug, name")
    .eq("slug", args.league)
    .maybeSingle();
  if (leagueError) fail(`League lookup failed: ${leagueError.message}`);
  if (!league) fail(`League slug '${args.league}' not found.`);

  const { data: managers, error: managersError } = await admin
    .from("manager")
    .select("id, name");
  if (managersError) fail(`Manager lookup failed: ${managersError.message}`);
  const managerById = new Map((managers ?? []).map((m) => [m.id, m]));

  const results = [];
  for (const pairing of pairings) {
    // Sequential rather than parallel so an unexpected error stops the run cleanly
    // and the commissioner can re-run with whatever pairings are still pending.
    // eslint-disable-next-line no-await-in-loop
    const result = await attachOne(admin, league, pairing, managerById);
    results.push(result);
  }

  const summary = {
    created: results.filter((r) => r.status === "created").length,
    already_member: results.filter((r) => r.status === "already_member").length,
    already_member_other_manager: results.filter(
      (r) => r.status === "already_member_other_manager"
    ).length,
    manager_taken: results.filter((r) => r.status === "manager_taken").length,
    error: results.filter((r) => r.status === "error").length,
  };

  console.log(
    JSON.stringify(
      {
        league: { id: league.id, slug: league.slug, name: league.name },
        summary,
        results,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  fail(err?.message ?? String(err));
});
