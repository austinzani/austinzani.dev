#!/usr/bin/env node
// Read-only inventory script for the new "match-after-signup" onboarding flow.
//
// Now that managers self-sign-up via Google OAuth or email/password on the
// fantasy login page, the commissioner's job is to *match* a self-created auth
// user to one of the historical public.manager rows. This script prints the
// raw inputs needed to make those matches:
//
//   - unmatched_users:    auth.users rows with no league_membership in the league
//   - available_managers: public.manager rows with no membership in the league
//   - taken_managers:     public.manager rows already attached to a user (for context)
//   - orphan_memberships: league_membership rows whose user_id no longer exists
//                         in auth.users (e.g. a deleted-then-recreated user)
//
// Usage:
//   node .claude/skills/create-fantasy-user/scripts/list_unmatched.mjs [--league <slug>]
//
// Output: a single JSON object on success, a clear error line on failure.

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_LEAGUE_SLUG = "zaks-league-to-lose";

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
    if (key === "league") args.league = next.trim();
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

async function listAllAuthUsers(admin) {
  const all = [];
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    all.push(...data.users);
    if (data.users.length < perPage) return all;
    page++;
  }
}

async function main() {
  const repoRoot = process.cwd();
  loadEnvFile(resolve(repoRoot, ".env"));
  loadEnvFile(resolve(repoRoot, ".env.local"));

  const args = parseArgs(process.argv);

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

  const [authUsers, managersResult, membershipsResult] = await Promise.all([
    listAllAuthUsers(admin),
    admin.from("manager").select("id, name, is_active").order("id"),
    admin
      .from("league_memberships")
      .select("id, user_id, manager_id, role, created_at")
      .eq("league_id", league.id),
  ]);

  if (managersResult.error) {
    fail(`Manager lookup failed: ${managersResult.error.message}`);
  }
  if (membershipsResult.error) {
    fail(`Membership lookup failed: ${membershipsResult.error.message}`);
  }

  const memberships = membershipsResult.data ?? [];
  const managers = managersResult.data ?? [];

  const authUserById = new Map(authUsers.map((u) => [u.id, u]));
  const managerById = new Map(managers.map((m) => [m.id, m]));

  const matchedUserIds = new Set(memberships.map((m) => m.user_id));
  const matchedManagerIds = new Set(memberships.map((m) => m.manager_id));

  const unmatchedUsers = authUsers
    .filter((u) => !matchedUserIds.has(u.id))
    .map((u) => ({
      user_id: u.id,
      email: u.email ?? null,
      created_at: u.created_at,
      provider: u.app_metadata?.provider ?? null,
      providers: u.app_metadata?.providers ?? null,
      last_sign_in_at: u.last_sign_in_at ?? null,
    }))
    .sort((a, b) => (a.email ?? "").localeCompare(b.email ?? ""));

  const availableManagers = managers
    .filter((m) => !matchedManagerIds.has(m.id))
    .map((m) => ({ id: m.id, name: m.name, is_active: m.is_active }));

  const takenManagers = memberships
    .map((m) => {
      const manager = managerById.get(m.manager_id);
      const authUser = authUserById.get(m.user_id);
      return {
        manager_id: m.manager_id,
        manager_name: manager?.name ?? null,
        user_id: m.user_id,
        email: authUser?.email ?? null,
        role: m.role,
      };
    })
    .filter((row) => row.email !== null)
    .sort((a, b) => (a.manager_name ?? "").localeCompare(b.manager_name ?? ""));

  const orphanMemberships = memberships
    .filter((m) => !authUserById.has(m.user_id))
    .map((m) => ({
      membership_id: m.id,
      user_id: m.user_id,
      manager_id: m.manager_id,
      manager_name: managerById.get(m.manager_id)?.name ?? null,
      role: m.role,
      created_at: m.created_at,
    }));

  console.log(
    JSON.stringify(
      {
        league: { id: league.id, slug: league.slug, name: league.name },
        counts: {
          auth_users_total: authUsers.length,
          memberships_total: memberships.length,
          unmatched_users: unmatchedUsers.length,
          available_managers: availableManagers.length,
          taken_managers: takenManagers.length,
          orphan_memberships: orphanMemberships.length,
        },
        unmatched_users: unmatchedUsers,
        available_managers: availableManagers,
        taken_managers: takenManagers,
        orphan_memberships: orphanMemberships,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  fail(err?.message ?? String(err));
});
