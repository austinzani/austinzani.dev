---
name: create-fantasy-user
description: Match self-signed-up auth users to historical manager records in the fantasy football league (this repo's Personal Site Supabase DB). Use whenever the user asks to onboard, match, attach, or link a fantasy league member/manager to a login — phrases like "match new users to managers", "Bob signed up, link him to his manager", "who hasn't been matched yet", "attach the new logins to managers". Also covers the rarer fallback path of manually creating an auth user from scratch when self-signup isn't possible.
---

# Match a Fantasy League User to a Manager

## Why this skill exists

A "fantasy league user" is **three coupled records**:

1. A row in `auth.users` (Supabase Auth) — the login identity.
2. A row in `public.manager` — the historical roster identity (has `name`, no email).
3. A row in `public.league_memberships` — ties a specific auth user to a specific manager within a specific league, with a role (`manager` | `commissioner`).

In the **current flow**, league members self-sign-up via Google OAuth or email/password on `/fantasy_football/login`. That creates the `auth.users` row but leaves them with **no league membership**, so they can't access the portal yet. The commissioner's job is to match each new auth user to the right historical `public.manager` row by inserting the `league_memberships` row.

The skill wraps that flow in two scripts:

- `list_unmatched.mjs` — read-only inventory: who has signed up but isn't matched, which managers are still available, which managers are taken, and any orphan memberships.
- `attach_manager.mjs` — batch insert of `league_memberships` rows from `(email, manager_id)` pairings.

A third script — `create_fantasy_user.mjs` — is the **fallback for the rare case** where the commissioner needs to manually create the auth user themselves (e.g., onboarding someone who can't or won't self-sign-up).

## The default workflow (match-after-signup)

When the user asks to onboard new league members, follow this loop:

### 1. Run `list_unmatched.mjs`

```
node .claude/skills/create-fantasy-user/scripts/list_unmatched.mjs
```

Optional flag: `--league <slug>` (default is `zaks-league-to-lose`).

The output is JSON with these keys:

- `unmatched_users` — auth users with no membership in this league. Each entry has `email`, `created_at`, `provider` (`google` / `email`), `last_sign_in_at`, and `user_id`. **These are the people waiting to be matched.**
- `available_managers` — `public.manager` rows that are not yet attached to anyone in this league. **These are the candidates to match against.**
- `taken_managers` — `(manager_id, email)` pairs already attached, for context. Don't double-attach.
- `orphan_memberships` — rows whose `user_id` no longer exists in `auth.users` (e.g. a deleted user). Flag these to the commissioner; don't auto-delete (see "Orphan memberships" below).

### 2. Show the user the unmatched list and ask for pairings

Present the unmatched users with their provider and signup date. For each, show the candidate manager pool (filtered to **active managers first**, then inactive — they may be onboarding a returning past manager). Ask the user which manager id to attach to each unmatched email. For users who can't be matched yet (signed up by mistake, etc.), let the user say "skip".

When in doubt about which manager belongs to which email, **ask the commissioner explicitly** — emails like `dcbuys5@gmail.com` are not always obvious mappings to manager names like `derek cunningham`. Don't guess silently.

### 3. Run `attach_manager.mjs` with the batch

```
node .claude/skills/create-fantasy-user/scripts/attach_manager.mjs \
  --pairings '[{"email":"a@b.com","manager_id":36},{"email":"c@d.com","manager_id":30,"role":"commissioner"}]'
```

Each pairing object accepts:
- `email` (required) — the email of the existing auth user.
- `manager_id` (required) — the integer id from `public.manager`.
- `role` (optional, default `manager`) — `manager` or `commissioner`.

You can also call it for a single pairing with `--email <email> --manager-id <id> [--role <role>]`, but **prefer the batch form** when matching multiple users at once — one process invocation instead of N.

### 4. Read the per-pairing result

The output is one JSON object with a `summary` count and a `results` array. Each result has a `status`:

- `created` — new membership inserted; the user can now access the portal.
- `already_member` — this user already has a membership for the requested manager. Re-run no-op.
- `already_member_other_manager` — this user already has a membership for a *different* manager. Show the commissioner the existing `existing_manager_id` and ask whether to leave it or fix it manually.
- `manager_taken` — the requested manager is already attached to a *different* user in this league. The script does NOT auto-resolve this; report the conflict and ask the commissioner what to do.
- `error` — read the `error` field. Most common causes: bad `manager_id`, missing auth user (they haven't signed up yet), or a transient DB error.

### 5. Tell the user what happened

For each `created` result, the person can now access `/fantasy_football/town_hall` (and other authenticated portal pages) on whatever device they signed up from. They don't need to do anything else — the cookie they got at signup already works; the next page load picks up their new membership.

## Orphan memberships

If `list_unmatched.mjs` reports `orphan_memberships`, those are `league_memberships` rows whose `user_id` no longer points to a valid auth user. This happens when an auth user is deleted but the membership row was left behind (this has happened before — the membership has a unique constraint on `(league_id, manager_id)`, so an orphan blocks new pairings for that manager).

The skill does **not** auto-delete orphans. Surface the orphan info to the commissioner with the `manager_name`, `manager_id`, and `membership_id`, and ask whether to:

1. Delete the orphan (one-line SQL: `delete from public.league_memberships where id = <id>`), then re-run the attach.
2. Or update the orphan's `user_id` to point to the new auth user (if the same manager is just getting a fresh login).

Confirm before doing either.

## Fallback: manually create an auth user

Use `create_fantasy_user.mjs` only when self-signup isn't viable — for example, the person doesn't have a Google account, doesn't want to use email/password, or you need to seed a test user. The script creates the auth user, optionally creates a manager row, and inserts the membership all in one shot.

```
node .claude/skills/create-fantasy-user/scripts/create_fantasy_user.mjs \
  --email <email> --name "<name>" [--manager-id <id>] [--role commissioner] [--league <slug>]
```

Notes for this fallback path:
- The created auth user has `email_confirm: true` but **no password**. To actually sign in, the user will need to either:
  - Use the password sign-up flow on the login page to set their own password (their email is already confirmed), or
  - Sign in with Google if their email is a Google account, or
  - Have you set a password directly in the Supabase dashboard.
- For previously-rostered managers, always pass `--manager-id` to reuse the historical row instead of creating a duplicate.

## Before running anything

- **Confirm the service role key.** Both scripts will fail clearly if `SUPABASE_SERVICE_ROLE_KEY` is missing from `.env.local`. If it's missing, point the user at Supabase dashboard → Project Settings → API → `service_role`. The key must live in `.env.local` (gitignored), never `.env`.
- **Confirm the league.** Default is `zaks-league-to-lose`. If the user mentions another league, pass `--league <slug>`.
- **Don't guess email-to-manager mappings.** Always confirm with the commissioner, even when the email looks obvious. Wrong matches are awkward to undo (especially if the user has already cast votes).

## Idempotency model

- `list_unmatched.mjs` is read-only — safe to re-run any time.
- `attach_manager.mjs` is idempotent on `(league_id, user_id)`: re-running with the same pairing returns `already_member` instead of duplicating. It is **also** guarded on `(league_id, manager_id)` — if the manager is already taken by a different user, you get `manager_taken` and **no insert happens**.
- `create_fantasy_user.mjs` is idempotent on email for the auth user and on `(league_id, user_id)` for the membership. It does NOT dedupe `public.manager` rows automatically (no email column to dedupe on); always pass `--manager-id` when reattaching to a historical manager.

## When NOT to use this skill

- Bulk-importing historical managers who don't need portal logins — write a SQL seed instead.
- Changing an existing user's role or email — these scripts are insert-only. Use a targeted SQL update or the Supabase dashboard.
- Creating a user in a different app entirely. This skill assumes the `leagues` / `league_memberships` / `manager` schema introduced in `supabase/migrations/20260424_fantasy_town_hall_and_rule_submissions.sql`.
