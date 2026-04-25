#!/usr/bin/env node
// Create a fantasy-league user: Supabase Auth user + public.manager row +
// public.league_memberships row. Idempotent on email: re-running with the same
// email will not create a duplicate auth user or duplicate membership.
//
// Usage:
//   node .claude/skills/create-fantasy-user/scripts/create_fantasy_user.mjs \
//     --email <email> --name <name> [--role manager|commissioner] \
//     [--league <slug>] [--manager-id <id>]
//
// Env (loaded from .env then .env.local, latter wins):
//   SUPABASE_URL               required
//   SUPABASE_SERVICE_ROLE_KEY  required (admin API; never commit)
//
// Output: a single JSON line on success, a clear error line on failure.

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_LEAGUE_SLUG = "zaks-league-to-lose";

function parseArgs(argv) {
  const args = { role: "manager", league: DEFAULT_LEAGUE_SLUG };
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      fail(`Flag --${key} requires a value.`);
    }
    if (key === "email") args.email = next.trim().toLowerCase();
    else if (key === "name") args.name = next.trim();
    else if (key === "role") args.role = next.trim();
    else if (key === "league") args.league = next.trim();
    else if (key === "manager-id") args.managerId = parseInt(next, 10);
    else fail(`Unknown flag: --${key}`);
    i++;
  }
  if (!args.email) fail("--email is required.");
  if (!args.name && !args.managerId) {
    fail("--name is required (or provide --manager-id for an existing manager).");
  }
  if (args.role !== "manager" && args.role !== "commissioner") {
    fail(`--role must be 'manager' or 'commissioner', got '${args.role}'.`);
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
    // .env.local wins — loaded second, so it overrides .env.
    process.env[key] = value;
  }
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

async function findAuthUserByEmail(admin, email) {
  // listUsers doesn't accept a server-side email filter; paginate and match.
  // Fine for a small league; revisit if you cross a few thousand users.
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

  // Resolve league.
  const { data: league, error: leagueError } = await admin
    .from("leagues")
    .select("id, slug, name")
    .eq("slug", args.league)
    .maybeSingle();
  if (leagueError) fail(`League lookup failed: ${leagueError.message}`);
  if (!league) fail(`League slug '${args.league}' not found.`);

  // Resolve or create the auth user.
  let authUser = await findAuthUserByEmail(admin, args.email);
  let userCreated = false;
  if (!authUser) {
    const { data, error } = await admin.auth.admin.createUser({
      email: args.email,
      email_confirm: true,
    });
    if (error) fail(`Auth user create failed: ${error.message}`);
    authUser = data.user;
    userCreated = true;
  }

  // Check for existing membership in this league (idempotency).
  const { data: existingMembership, error: membershipLookupError } = await admin
    .from("league_memberships")
    .select("id, manager_id, role")
    .eq("league_id", league.id)
    .eq("user_id", authUser.id)
    .maybeSingle();
  if (membershipLookupError) {
    fail(`Membership lookup failed: ${membershipLookupError.message}`);
  }
  if (existingMembership) {
    console.log(
      JSON.stringify({
        status: "already_member",
        league: league.slug,
        email: args.email,
        user_id: authUser.id,
        manager_id: existingMembership.manager_id,
        role: existingMembership.role,
      })
    );
    return;
  }

  // Resolve or create the manager row.
  let managerId = args.managerId;
  let managerCreated = false;
  if (managerId) {
    const { data: managerRow, error: managerLookupError } = await admin
      .from("manager")
      .select("id, name")
      .eq("id", managerId)
      .maybeSingle();
    if (managerLookupError) {
      fail(`Manager lookup failed: ${managerLookupError.message}`);
    }
    if (!managerRow) fail(`Manager id ${managerId} not found.`);
  } else {
    const { data: managerRow, error: managerInsertError } = await admin
      .from("manager")
      .insert({ name: args.name, is_active: true })
      .select("id")
      .single();
    if (managerInsertError) {
      fail(`Manager create failed: ${managerInsertError.message}`);
    }
    managerId = managerRow.id;
    managerCreated = true;
  }

  // Create the membership.
  const { data: membership, error: membershipError } = await admin
    .from("league_memberships")
    .insert({
      league_id: league.id,
      user_id: authUser.id,
      manager_id: managerId,
      role: args.role,
    })
    .select("id")
    .single();
  if (membershipError) {
    fail(`Membership create failed: ${membershipError.message}`);
  }

  console.log(
    JSON.stringify({
      status: "created",
      league: league.slug,
      email: args.email,
      user_id: authUser.id,
      user_created: userCreated,
      manager_id: managerId,
      manager_created: managerCreated,
      membership_id: membership.id,
      role: args.role,
    })
  );
}

main().catch((err) => {
  fail(err?.message ?? String(err));
});
