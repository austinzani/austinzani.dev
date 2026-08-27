# Tourney Side-Game — Build Plan Adapted to austinzani.dev

> This is a rewrite of *Tournament SideGame Build Plan: Free Sports Data Sources, Scoring and Architecture* against the actual tech stack in this repo. The data-source research in the original doc holds up and is carried forward (compressed); the architecture, storage, scheduling, and front-end sections are replaced, because the original assumed Next.js/Astro + ISR + "defer Supabase," and this site is none of those things.

---

## TL;DR

- **Keep** the original doc's source matrix: ESPN's undocumented JSON as the backbone for most sports, with official APIs swapped in where they exist (MLB Stats API, NHL Web API, Jolpica for F1) and NASCAR's CF feed for Cup. Keep the adapter-per-sport pattern, the 1–14 averaging tiebreak, and the seeded weighted draw.
- **Replace** the storage advice. The original said "commit JSON to the repo, defer Supabase." This repo already runs Supabase in production with auth, RLS, migrations, generated types, and an established `league_memberships`/commissioner role model. Committed JSON would be a second, worse source of truth. **Write straight to Supabase from day one.**
- **Replace** the front-end advice. There is no Next.js and no ISR here. This is **Remix v2 on Vercel**. The equivalent of ISR is a loader that reads Supabase plus a `Cache-Control: s-maxage=..., stale-while-revalidate=...` header on the response. Same outcome, different lever.
- **Ingestion: GitHub Actions cron is the right call**, as you suspected. One workflow, one Node script, `SUPABASE_SERVICE_ROLE_KEY` as a repo secret, ~5 minutes of runtime budget, no infra. The Mac mini is the *fallback and the manual-rerun path*, running the exact same script via `launchd` — not a separate implementation.
- **Reuse the fantasy league's people, don't re-invent them.** `manager`, `leagues`, `league_memberships`, and `requireFantasyMember(request, ["commissioner"])` already exist and already work. The side game gets participant rows that point at `manager.id`, and commissioner-only actions get the auth guard for free.

---

## What this repo actually is

| Layer | Reality | What it means for this project |
|---|---|---|
| Framework | Remix v2 (`@remix-run/node` 2.2), flat-file routes in `app/routes/` | Loaders/actions, not API routes + client fetch. Data loading is server-side by default — which is exactly what the ESPN CORS problem needs. |
| Hosting | Vercel via `@remix-run/vercel`, `server.js`, `serverModuleFormat: "cjs"` | Serverless functions with short default timeouts. Fine for reads. **Not** where a 12-sport fetch job should live. |
| DB | Supabase Postgres, `@supabase/supabase-js` v2 | Already the site's source of truth (fantasy football, music history, albums). |
| DB access | `app/utils/supabase.ts` (anon, typed via `db_types.ts`) for public reads; `app/utils/supabase.server.ts` → `createSupabaseServerClient(accessToken)` for RLS-scoped user reads | Two clear lanes already exist. Public scoreboard → anon client. Commissioner actions → server client. |
| Auth | Supabase auth + `app/utils/auth.server.ts` + `app/utils/fantasy-auth.server.ts` | `requireFantasyMember(request, ["commissioner"])` is a one-line admin gate. |
| Migrations | `supabase/migrations/*.sql`, hand-written, idempotent (`DO $$ ... EXCEPTION WHEN duplicate_object`), RLS on every table, `set_row_updated_at()` trigger helper | New tables must match this house style. |
| Types | `db_types.ts` at repo root, generated | Regenerate after every migration. |
| Styling | Tailwind with CSS-variable tokens (`paper`, `ink`, `accent`, `surface`, `line`), `darkMode: 'class'`, Instrument Serif / Space Grotesk / IBM Plex Mono | New UI uses the tokens, never raw hex. Note: `fantasy_football.town_hall.tsx` has a hardcoded `PIE_COLORS` array — don't copy that habit into the side game. |
| Component kit | `FantasyFootballUI` (hero, panel, stat card, table shell classes), `ScoreCard`, `ManagerAvatar`, `Breadcrumb`, `EmptyState`, `ErrorState`, `ScrollablePills`, `LazyImage`, `Modal` | The side game should be assembled from these, not built fresh. |
| Extras already installed | `zod`, `framer-motion`, `react-virtuoso`, FontAwesome | Zod for adapter response validation. No new deps needed for v1. |
| Scripts precedent | `.claude/skills/create-fantasy-user/scripts/*.mjs` — plain ESM, reads `.env.local`, uses `SUPABASE_SERVICE_ROLE_KEY`, refuses to run without it | The ingest script should look and behave like these. |
| Not present | No `.github/` directory, no CI, no test runner | The Actions workflow will be the first one. Budget a little time for getting it green. |

---

## Architecture

```
                    ┌─────────────────────────────────────┐
  once daily        │  GitHub Actions (cron)              │
  06:15 UTC         │  node scripts/side-game/ingest.mjs  │
                    │   ├─ adapters/*.mjs  (per sport)    │
                    │   ├─ zod validate                   │
                    │   └─ upsert via service role key    │
                    └──────────────┬──────────────────────┘
                                   │            ▲
                                   │            │ identical script,
                                   ▼            │ launchd on Mac mini
                    ┌─────────────────────────────────────┐
                    │  Supabase Postgres                  │
                    │   side_game_snapshots (raw jsonb)   │
                    │   side_game_standings (normalized)  │
                    │   side_game_scores    (view/RPC)    │
                    └──────────────┬──────────────────────┘
                                   │ anon client, RLS public-read
                                   ▼
                    ┌─────────────────────────────────────┐
                    │  Remix loaders on Vercel            │
                    │   /side_game            scoreboard  │
                    │   /side_game/:sport     detail      │
                    │   /side_game/draw       provenance  │
                    │   Cache-Control: s-maxage=900, SWR  │
                    └─────────────────────────────────────┘
```

The browser never touches ESPN. It only ever reads this site's own Supabase rows through the anon key, same as every other page here.

---

## Ingestion: GitHub Actions, with the Mac mini as the second engine

### Why Actions over the alternatives

- **Vercel Cron** looks tempting since the app is already there, but a Hobby project gets one cron per day at coarse scheduling, and a serverless function fanning out to a dozen flaky third-party APIs is exactly the workload that hits a function timeout. Reads belong on Vercel; this job does not.
- **AWS Lambda + EventBridge** (the original doc's option b) is a real option given your Lambda experience, but it adds an account, an IAM role, a deploy path, and a second place to look when something breaks — for a job that is one `node` invocation. Not worth it here.
- **GitHub Actions** runs the same script you can run locally, keeps the schedule in version control next to the code, gives you a free "re-run this job" button, and stores secrets properly. If the repo is public, minutes are free.

### The workflow

`.github/workflows/side-game-ingest.yml`

```yaml
name: Side Game Ingest
on:
  schedule:
    - cron: "15 6 * * *"   # 06:15 UTC daily — after US late games settle
  workflow_dispatch:        # manual re-run button
    inputs:
      sports:
        description: "Comma-separated sport keys, or blank for all"
        required: false

concurrency:
  group: side-game-ingest
  cancel-in-progress: false

jobs:
  ingest:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: node scripts/side-game/ingest.mjs
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          CFBD_API_KEY: ${{ secrets.CFBD_API_KEY }}
          FOOTBALL_DATA_TOKEN: ${{ secrets.FOOTBALL_DATA_TOKEN }}
          SIDE_GAME_SPORTS: ${{ inputs.sports }}
```

Notes that matter:

- **`workflow_dispatch` is not optional.** It is the "ESPN changed a field and I fixed the adapter, re-run just golf" button, and it is the whole reason this beats a cron on a box you have to SSH into.
- **Exit non-zero only if *every* sport failed.** One sport failing must not fail the run, or a single ESPN hiccup marks the whole job red and you stop reading the notifications. Per-sport status goes in the database (`side_game_sport_status`), which is where the UI reads it from anyway.
- **`concurrency` guard** so a manual re-run can't race the nightly.
- GitHub's scheduled runs drift under load and can be delayed by many minutes. Irrelevant for a daily poll; worth knowing before you go debugging a "late" run.
- Scheduled workflows are **disabled automatically after 60 days of repo inactivity** on public repos. Since this repo gets regular commits it's a non-issue, but if the site goes quiet for two months, the ingest silently stops. The staleness badge (below) is what catches that.

### The Mac mini as fallback

Same script, no fork. On the mini:

```bash
# ~/side-game/run.sh
cd /Users/austin/code/austinzani.dev
set -a; source .env.local; set +a
/usr/local/bin/node scripts/side-game/ingest.mjs >> ~/side-game/ingest.log 2>&1
```

Wire it with **launchd**, not cron — macOS deprecated user crontabs in practice, and `launchd`'s `StartCalendarInterval` will fire a missed job after a wake, which plain cron will not:

```xml
<!-- ~/Library/LaunchAgents/dev.austinzani.sidegame.plist -->
<key>StartCalendarInterval</key><dict><key>Hour</key><integer>3</integer><key>Minute</key><integer>30</integer></dict>
<key>RunAtLoad</key><false/>
```

Then `launchctl load ~/Library/LaunchAgents/dev.austinzani.sidegame.plist`.

Because ingest is **idempotent per (sport, snapshot date)**, running both the Action and the mini on the same day is harmless — the second run upserts over the first. That is the point: the mini isn't a failover you have to switch to, it's a second chance that costs nothing to leave running. Give it a distinct `SIDE_GAME_RUNNER=mac-mini` env var so `side_game_snapshots.fetched_by` tells you which engine produced a row.

Caveat worth stating: the mini needs to be awake. `sudo pmset repeat wakeorpoweron MTWRFSU 03:25:00` handles that, and if the lid-closed/clamshell setup ever changes, the mini quietly stops and the Action carries it. That asymmetry is fine — Actions is primary.

---

## Data model (matching this repo's SQL conventions)

One migration, `supabase/migrations/<timestamp>_side_game.sql`, written in the same idempotent style as `20260424_fantasy_town_hall_and_rule_submissions.sql`.

### Reuse, don't duplicate

The original doc proposed a `participants` table. **Don't add one from scratch.** This repo already has `manager` (integer PK), `leagues`, and `league_memberships` (with `role` enum and the commissioner concept). The side game roster is almost certainly the same crew as the fantasy league.

```sql
CREATE TABLE IF NOT EXISTS public.side_game_participants (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  season_id   bigint NOT NULL REFERENCES public.side_game_seasons(id) ON DELETE CASCADE,
  manager_id  integer REFERENCES public.manager(id) ON DELETE RESTRICT,  -- nullable: outsiders allowed
  display_name text NOT NULL,
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, manager_id)
);
```

`manager_id` nullable means a friend who isn't in the fantasy league can still play, while everyone who *is* gets their existing `ManagerAvatar` and manager page link for free.

### Tables

```sql
side_game_seasons     (id, league_id → leagues, label, cutoff_date, rng_seed,
                       draw_published_at, status, created_at)

side_game_sports      (id, season_id, key, display_name, metric_mode, status,
                       is_custom, adapter, sort_order, config jsonb)
                      -- metric_mode: 'live' | 'final_prior'
                      -- status:      'pending' | 'active' | 'counted'

side_game_participants(id, season_id, manager_id, display_name, avatar_url)

side_game_entities    (id, sport_id, entity_key, display_name, abbrev, logo_url,
                       source_ids jsonb)
                      -- source_ids: {"espn":"14","jolpica":"max_verstappen"}
                      -- this is the ID-mapping table the original doc warned about

side_game_assignments (id, season_id, sport_id, participant_id, entity_id,
                       seed_rank, seed_weight, drawn_at)
                      -- UNIQUE (sport_id, participant_id), UNIQUE (sport_id, entity_id)

side_game_snapshots   (id, sport_id, snapshot_date, fetched_at, fetched_by,
                       source, ok boolean, error text, raw jsonb)
                      -- UNIQUE (sport_id, snapshot_date)  ← makes ingest idempotent

side_game_standings   (id, snapshot_id, entity_id, ordinal, points_raw,
                       tiebreak jsonb, is_manual_override boolean)

side_game_manual_scores (id, sport_id, participant_id, points, note, updated_by)
                      -- custom/hand-judged sports, and the emergency override path
```

`side_game_scores` is **not** a table. Make it a Postgres function, the same way `all_time` already is — `app/utils/league-stats.server.ts` calls `supabase.rpc("all_time")`, so the pattern is established and the front end stays thin:

```sql
CREATE OR REPLACE FUNCTION public.side_game_scores(p_season_id bigint)
RETURNS TABLE (participant_id bigint, sport_id bigint, points numeric, ...)
LANGUAGE sql STABLE AS $$ ... $$;
```

Doing the 1–14 ranking in SQL gets you `RANK()`/`AVG()` window functions for free, which is precisely the "average the tied ranks so the pool stays at 105" rule from the original doc — and it keeps the ranking logic in one place instead of duplicated between the ingest script and the loader.

### RLS

Follow the house pattern, but note the read posture is **different from town hall**. Town hall is members-only. The side game scoreboard should be publicly readable so it renders through `app/utils/supabase.ts` (anon client, no session) like `season` and `manager` already do:

- `SELECT` for `anon, authenticated` on seasons, sports, participants, entities, assignments, standings, scores — **but only where `side_game_seasons.draw_published_at IS NOT NULL`**, so the assignments aren't scrapeable before the draw is announced.
- `INSERT`/`UPDATE` on snapshots and standings: **service role only** (no policy → service key bypasses RLS; that's the intent).
- `INSERT`/`UPDATE` on `side_game_manual_scores` and `side_game_sports.status`: commissioner only, mirroring `town_hall_ballots_manage_for_commissioners`.

Reuse `public.set_row_updated_at()` — it already exists, don't redefine it.

After the migration: `supabase gen types typescript --linked > db_types.ts` and commit. `app/utils/supabase.ts` is typed off that file, so skipping this step costs you every bit of type safety on the new tables.

---

## The adapter layer

```
scripts/side-game/
  ingest.mjs                 # orchestrator: loop sports, call adapter, upsert
  lib/
    supabase.mjs             # service-role client + .env.local loader (copy the
                             #   pattern from .claude/skills/create-fantasy-user/
                             #   scripts/attach_manager.mjs — it already does this
                             #   and already refuses to run without the key)
    fetch.mjs                # timeout, retry w/ backoff, UA header, per-host throttle
    normalize.mjs            # rank → ordinal, tie averaging helpers
  adapters/
    espn-standings.mjs       # NFL, NBA, MLS, PL, CFB, CBB  (one shape, config-driven)
    espn-golf.mjs            # PGA / FedEx Cup
    espn-tennis.mjs          # ATP rankings
    mlb.mjs                  # statsapi.mlb.com
    nhl.mjs                  # api-web.nhle.com
    f1.mjs                   # api.jolpi.ca
    nascar.mjs               # cf.nascar.com
```

Every adapter has the same contract:

```js
// returns { source, raw, rows: [{ entityKey, displayName, abbrev, logoUrl,
//                                 ordinal, pointsRaw, tiebreak }] }
export async function fetchStandings({ sport, cutoffDate, metricMode, config }) { ... }
```

`ingest.mjs` validates that shape with **zod** (already a dependency) before it writes anything. A malformed ESPN response then fails one adapter loudly instead of writing garbage ordinals into the standings — which is the actual failure mode you care about, since a silently-wrong ordinal moves someone's score and nobody notices for a week.

**Language choice:** plain `.mjs` matches the existing skill scripts and needs no build step in CI. The cost is that adapter row types aren't shared with the Remix app. Given that the only shared shape is the DB row (which `db_types.ts` covers), `.mjs` is the right trade for v1. If the adapters grow real logic, add `tsx` as a devDependency and rename — but don't pay for that up front.

**Failure posture, per sport:**

1. Adapter throws or fails validation → write `side_game_snapshots` row with `ok=false, error=...`, write **no** standings.
2. The scores function reads the **most recent `ok=true` snapshot** per sport, so yesterday's numbers keep showing.
3. The UI shows a staleness badge driven by `fetched_at` (see below).
4. The run exits 0 as long as at least one sport succeeded.

This is the single most important design decision in the whole thing: **the board must never go blank because ESPN moved a field.**

---

## Data sources (carried forward, condensed)

The original research stands. Summary, with the corrections that were buried in its footnotes promoted to the table:

| Sport | Source | Endpoint | Notes |
|---|---|---|---|
| NFL / NBA | ESPN | `site.web.api.espn.com/apis/v2/sports/{football/nfl,basketball/nba}/standings` | no key, logos inline |
| MLB | **MLB Stats API** (official) | `statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=` | stable, prefer over ESPN |
| NHL | **NHL Web API** (official) | `api-web.nhle.com/v1/standings/now` | returns team logo SVGs; **CORS explicitly disabled** — server-side only |
| MLS / Premier League | ESPN soccer | `site.api.espn.com/apis/v2/sports/soccer/{usa.1,eng.1}/standings` | ⚠️ **`/apis/v2/`, not `/apis/site/v2/`** — the latter returns `{}` for standings |
| PGA Tour | ESPN golf | `site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard` | most fragile endpoint in the set |
| NASCAR Cup | NASCAR CF feed | `cf.nascar.com/live/feeds/series_1/{race_id}/live_points.json` | race IDs from `cf.nascar.com/cacher/{year}/race_list_basic.json` |
| ATP | ESPN tennis | `sports.core.api.espn.com/v2/sports/tennis/leagues/atp/rankings` | ⚠️ **named slug (`atp`) required** — numeric IDs 400 |
| F1 | **Jolpica** (Ergast successor) | `api.jolpi.ca/ergast/f1/current/driverStandings.json` | no images at all — needs a static driver/constructor logo map |
| CFB | CollegeFootballData + ESPN rankings | `api.collegefootballdata.com/rankings` (Bearer key) | free key by email |
| CBB (men's D1) | ESPN rankings | `site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/rankings` | AP poll |

Rate limits — all comfortably fine for one daily pull: Jolpica 200/hr unauthenticated (500 authenticated), football-data.org 10/min free tier, balldontlie 5/min (backup only, standings are paid-tier there anyway).

**`metric_mode` per sport is the load-bearing config.** At an early-August cutoff, MLB/MLS/PGA/NASCAR/ATP/F1 read live standings, while NFL/NBA/NHL/PL/CBB must read the prior completed season, and CFB reads the preseason AP poll if it's out. Store it on `side_game_sports.metric_mode` and store the cutoff once on `side_game_seasons.cutoff_date` so moving the date reprices the whole board.

### Logos

Two tiers, and the repo already tells you which:

- `public/images/teams/` holds seven hand-placed PNGs used by `about.tsx`. That approach doesn't scale to ~400 entities across 12 sports.
- **v1: hotlink the ESPN CDN** (`https://a.espncdn.com/i/teamlogos/{league}/500/{abbrev}.png`, soccer uses numeric IDs, headshots at `/i/headshots/{league}/players/full/{id}.png`), store the resolved URL on `side_game_entities.logo_url`, and render through the existing `LazyImage` component so a 404 degrades to a placeholder instead of a broken-image icon.
- **If you want it bulletproof:** have the ingest script download each entity's logo once and push it to a **Supabase Storage** bucket, then store that public URL. You're already paying for Supabase; storage for a few hundred small PNGs is free-tier noise, it kills the hotlink dependency, and it makes the board work if ESPN's CDN ever starts refusing referrers. Do this as a phase-4 hardening step, not in v1.

Keep the "not affiliated with any league" note in the footer, and don't monetize the page.

---

## Front end (Remix, not Next.js)

### Routes

Flat-file convention with underscores, matching `fantasy_football.*`:

```
app/routes/side_game.tsx              # shell: hero, nav, season selector
app/routes/side_game._index.tsx       # overall scoreboard
app/routes/side_game.sport.$key.tsx   # one sport, all 14 rankings + assignments
app/routes/side_game.draw.tsx         # seed, weights, algorithm — the trust page
app/routes/side_game.admin.tsx        # commissioner: flip status, manual scores
```

**Placement question worth deciding early:** top-level `/side_game` or nested under `/fantasy_football`? Recommend **top-level**. The side game is a different game with a different (possibly wider) roster, and nesting it would drag in `fantasy_football.tsx`'s loader — which fetches all-time stats, managers, and matchup counts the side game doesn't need. Give it its own shell and import the presentational primitives from `~/components/FantasyFootballUI` directly (they're exported as standalone components and class-name constants, so this works today). If it starts to feel wrong that a component folder named "FantasyFootballUI" serves two games, rename it to something neutral in a follow-up commit — don't block on it.

### Caching = the ISR replacement

Remix has no `revalidate`. The equivalent on Vercel is a response header:

```ts
export function headers() {
  return {
    "Cache-Control": "public, max-age=0, s-maxage=900, stale-while-revalidate=86400",
  };
}
```

Vercel's edge caches the rendered page for 15 minutes and serves stale-while-revalidating for a day. Since the underlying data changes exactly once daily, you could go much longer; 15 minutes keeps commissioner edits from feeling frozen. The `_index` scoreboard and each sport page get this. The admin route must **not** (`Cache-Control: no-store`).

### Loader shape

Mirror `app/utils/league-stats.server.ts` — a single `app/utils/side-game.server.ts` that returns everything the shell and index need, with the same "return an object with `error` and empty arrays rather than throwing" convention this codebase uses. That convention is what lets `EmptyState` and `ErrorState` render a real page on a bad day instead of an error boundary.

### UI reuse inventory

| Need | Use |
|---|---|
| Page shell / hero | `FantasyHero`, `FantasyMain`, `FantasyPanel`, `fantasyContentClass` |
| Overall scoreboard table | `fantasyTableShellClass` + `fantasyTableHeadRowClass` + `fantasyTableRowClass` (frozen first column already solved for the head-to-head grid) |
| Per-participant totals | `FantasyStatCard` |
| Participant identity | `ManagerAvatar` (works directly for anyone with a `manager_id`) |
| Sport switcher | `ScrollablePills` |
| Logos/headshots | `LazyImage` |
| No data yet / fetch failed | `EmptyState`, `ErrorState` |
| Draw reveal animation | `framer-motion` (already installed) |
| Nav | `Breadcrumb` |

Colors come from the Tailwind token layer (`bg-surface`, `text-ink-muted`, `border-line`, `text-accent`) so the side game inherits dark mode and the accent picker automatically. Don't hardcode hex values.

### Staleness surfacing

Every page footer shows `Updated {relative time}` from `max(side_game_snapshots.fetched_at)`. If any sport's newest `ok=true` snapshot is **more than 48 hours old**, show an amber badge on that sport's row. This is the mechanism that tells you an adapter broke — more reliably than a GitHub Actions email you'll learn to ignore.

---

## Scoring and the draw

Unchanged in substance from the original doc; changed in where it lives.

**Scoring 1–14** — implement inside the `side_game_scores` SQL function:

- Team sports rank by `(playoff round reached, then win% / points)` so a champion outranks a better regular-season team that lost early.
- Individual sports rank directly by season points.
- Ties get the **average of the tied ranks** (`AVG(rank) OVER (PARTITION BY ...)`), preserving the 105-point pool per sport. Do not use min-rank; it distorts cross-sport totals.
- Sports with `status = 'pending'` contribute 0 and render with a "not yet counted" badge. Only `status = 'counted'` sums into the total. This is what makes mid-season additions painless.
- `side_game_manual_scores` overrides the computed value when present — the escape hatch for a custom category or a bad upstream day.

**The draw** — a standalone script, `scripts/side-game/draw.mjs`, run once and never again:

- Weight by inverse finish rank from last season: rank `r` of `N` → weight `∝ (N - r + 1)`. Publish the direction you chose *before* running it.
- Weighted sequential draw without replacement, independently per sport.
- **Seed a deterministic RNG and publish the seed.** `Math.random()` is not seedable — use a small `mulberry32` or `xorshift128+` inline (about 8 lines, no dependency). Store the seed on `side_game_seasons.rng_seed` and render it, the full weight table, and a plain-English description of the algorithm on `/side_game/draw`.
- The script writes `side_game_assignments` and sets `draw_published_at`. Because the RLS read policy is gated on `draw_published_at IS NOT NULL`, nothing leaks before you're ready.

Anyone should be able to clone the repo, run `node scripts/side-game/draw.mjs --seed <published seed>`, and reproduce your exact assignments. That reproducibility is the entire trust story of the game, and it's worth more than any feature on the board.

---

## Secrets and environment

| Variable | Where | Notes |
|---|---|---|
| `SUPABASE_URL` | Vercel env, GH Actions secret, `.env.local` | already set for Vercel |
| `SUPABASE_ANON_KEY` | Vercel env | already set; read path only |
| `SUPABASE_SERVICE_ROLE_KEY` | **GH Actions secret + `.env.local` only** | never in Vercel env, never in the client bundle, never committed |
| `CFBD_API_KEY` | GH Actions secret | free, emailed |
| `FOOTBALL_DATA_TOKEN` | GH Actions secret | free registration; only needed if PL falls back off ESPN |
| `SIDE_GAME_RUNNER` | set per engine | `github-actions` / `mac-mini`, recorded in `fetched_by` |

`.gitignore` already covers `.env`; confirm `.env.local` is covered too before the first commit that references it.

---

## Build phases

**Phase 1 — Schema and one sport, end to end.**
Migration + regenerated `db_types.ts` + `scripts/side-game/ingest.mjs` with only the NHL adapter (official API, most stable, returns logos — the least likely thing to waste your time). Run it locally against Supabase.
*Done when:* an `npm`-free `node scripts/side-game/ingest.mjs` populates a snapshot and 32 standings rows, and re-running the same day updates rather than duplicates.

**Phase 2 — The Action.**
`.github/workflows/side-game-ingest.yml`, secrets set, `workflow_dispatch` verified.
*Done when:* the manual trigger produces a fresh snapshot with `fetched_by='github-actions'`, and a deliberately broken adapter still exits 0 while recording `ok=false`.

**Phase 3 — All 12 adapters + the scores function.**
Adapters in stability order: NHL, MLB, F1 → NFL, NBA, MLS, PL, CFB, CBB (shared ESPN standings adapter) → NASCAR, PGA, ATP (the fragile three).
*Done when:* all 12 sports return a clean 1–14 across a test set of 14 assignments, with ties averaging correctly and the per-sport pool summing to exactly 105.

**Phase 4 — Front end.**
Shell + scoreboard + sport detail + draw page, assembled from existing components, with cache headers and staleness badges.
*Done when:* the board renders correctly with one sport deliberately stale and one sport `pending`.

**Phase 5 — Draw + admin.**
`draw.mjs`, the `/side_game/draw` provenance page, and the commissioner route behind `requireFantasyMember(request, ["commissioner"])` for flipping `status` and entering manual scores.
*Done when:* someone else can reproduce your assignments from the published seed.

**Phase 6 — Hardening (optional).**
Mac mini launchd job, Supabase Storage logo mirroring, historical score-over-time chart (the daily snapshots make this purely additive — which is why writing to Postgres from day one instead of committing JSON pays off here).

---

## Carried-forward risks

- **ESPN endpoints are unofficial and undocumented.** Golf, tennis rankings, and racing are the most likely to move. The adapter boundary plus last-good-snapshot fallback is the mitigation; the staleness badge is the detector. Verify all three live right before the season opens.
- **CORS is not optional.** NHL's is explicitly disabled and ESPN's is inconsistent. Nothing here calls a sports API from the browser, ever.
- **ID mapping across sources is the genuinely hard part.** A driver's or golfer's identity differs between ESPN, Jolpica, and NASCAR CF. `side_game_entities.source_ids` (jsonb) exists so swapping an adapter never orphans an assignment. Populate it deliberately during Phase 3 rather than letting adapters invent keys.
- **NASCAR CF live-feed filenames** are high-confidence but unverified; validate against a live race weekend, keep ESPN racing standings as the fallback adapter.
- **No SLA on any of this.** One daily poll that tolerates a stale day is well within what these free sources support. Don't build anything time-critical on them.
- **This repo has no CI or tests today.** The Actions workflow will be the first. Expect a couple of rounds of getting it green, and don't let that discourage adding a second workflow later for typecheck/lint.
