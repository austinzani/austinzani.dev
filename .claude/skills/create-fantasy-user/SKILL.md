---
name: create-fantasy-user
description: Create a new user in the fantasy football league database (this repo's Personal Site Supabase DB). Use this skill whenever the user asks to add, create, onboard, or invite a fantasy league member/manager — phrases like "create a fantasy user", "add Bob to the league", "onboard a new manager", "make a login for Jane", "add a commissioner", or any request that involves generating a Supabase Auth user plus a league membership in this project. Prefer this skill over writing ad-hoc SQL or hitting the Supabase dashboard manually, because it guarantees the three coupled records (auth user, manager row, league membership) stay consistent and re-runs are safe.
---

# Create a Fantasy League User

## Why this skill exists

In this repo a "fantasy league user" is **three coupled records**, not one:

1. A row in `auth.users` (Supabase Auth) — the login identity, magic-link only, no password.
2. A row in `public.manager` — the historical roster identity (has `name`, no email).
3. A row in `public.league_memberships` — ties a specific auth user to a specific manager within a specific league, with a role (`manager` | `commissioner`).

Creating any of these by hand is error-prone because the foreign keys and RLS policies assume all three exist together. This skill wraps the full flow in one script so onboarding a league member is one command, idempotent, and always consistent.

## How to run it

From the repo root:

```
node .claude/skills/create-fantasy-user/scripts/create_fantasy_user.mjs \
  --email <email> --name "<name>"
```

Optional flags:

- `--role commissioner` — default is `manager`.
- `--league <slug>` — default is `zaks-league-to-lose`.
- `--manager-id <id>` — reuse an existing `public.manager` row instead of creating a new one. Useful when you want to attach a new login to a historical manager record (the league already has entries for them from past seasons).

The script targets **remote production** by default (reads `SUPABASE_URL` from `.env` and `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`). If you need to run against a local Supabase, temporarily override those env vars in your shell for the command.

On success the script prints a single JSON line — read the `status` field:

- `"created"` — new user fully onboarded.
- `"already_member"` — this email is already a member of this league; nothing changed.

## What to do before running

1. **Confirm the service role key is present.** The script will fail clearly if `SUPABASE_SERVICE_ROLE_KEY` is missing from `.env.local`. If the user hasn't set it up, point them at the Supabase dashboard → Project Settings → API → `service_role` key, and remind them it must go in `.env.local` (gitignored), never committed.
2. **Confirm the email and name with the user** before running, especially for commissioners. The name becomes the new `public.manager.name` which is visible league-wide.
3. **Check if they want to reuse an existing manager.** If the person being onboarded played in previous seasons, there's likely already a `public.manager` row for them. In that case, query `public.manager` by name, grab the id, and pass `--manager-id` to avoid creating a duplicate manager record.

## What to do after running

- If `status: "created"`, tell the user the person can now sign in at `/fantasy_football/login` using their email (magic link — no password).
- If `status: "already_member"`, that's not an error — it means the re-run was a no-op. Useful for confirming state.
- If the command failed, read the `ERROR:` line. Most common cause is a missing or wrong service-role key.

## Idempotency model

- **Auth user** is deduped by email. Re-running with the same email reuses the existing `auth.users` row.
- **League membership** is deduped by `(league_id, user_id)`. Re-running exits early with `already_member`.
- **Manager row** is *not* deduped automatically — each run without `--manager-id` creates a fresh row. This is intentional: the `manager` table has no email column, so there's no safe dedupe key, and the league has historical managers that shouldn't be merged by name collision. Pass `--manager-id` when you want to attach to an existing manager.

## When NOT to use this skill

- Bulk-importing historical managers who don't need portal logins — write a SQL seed instead.
- Changing an existing user's role or email — this skill is create-only. Write a targeted SQL update or use the Supabase dashboard.
- Creating a user in a different app entirely. This skill assumes the `leagues` / `league_memberships` / `manager` schema introduced in `supabase/migrations/20260424_fantasy_town_hall_and_rule_submissions.sql`.
