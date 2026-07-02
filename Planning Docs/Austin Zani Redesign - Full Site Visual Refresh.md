# Austin Zani Redesign — Full Site Visual Refresh PRD

## Task Source
- Source: Freeform description + Claude Design artifact (via `scope-claude-design` skill)
- Title: Full visual redesign ("face lift") of austinzani.dev
- URL: https://claude.ai/design/p/cbda58a6-7bd8-447e-ba77-fabeca04e276?file=Austin+Zani+Redesign.dc.html
- Project / Milestone: N/A
- Last synced: 2026-07-01

## Problem Statement
The current site (Remix + Supabase, deployed at austinzani.dev) works functionally but its visual design is dated: a single hardcoded orange accent, generic Tailwind defaults, Outfit/Noto Sans fonts, no distinct visual identity. A Claude Design artifact (`Austin Zani Redesign.dc.html`) presents a cohesive new "zine/collage" visual language — dashed borders, dot-grid background, Instrument Serif + Space Grotesk + IBM Plex Mono type, and a user-selectable 4-color accent picker — applied across every page of the site (Home, About, Fantasy Football, Music). The artifact is a self-contained interactive prototype with its own fake data generator (10 fictional managers, 16 fake seasons of simulated football games, a made-up album pool); none of that data is real. This PRD scopes reskinning the entire site to match the new visual language while preserving 100% of the existing Supabase-backed data logic, with two net-new pieces of real functionality: a persistent accent-color picker and a "Feed" tab on the Music page that surfaces an already-fetched-but-never-rendered data source.

## Goals
- Replace the current visual design (fonts, colors, borders, backgrounds, card treatments) sitewide with the new "zine" aesthetic from the artifact, in both light and dark variants.
- Add a 4-swatch accent-color picker (orange/blue/green/pink), persisted via cookie, that recolors the site's accent color the same way the dark/light toggle recolors light/dark.
- Reskin all Fantasy Football screens (league home/standings/records, season detail, manager profile, head-to-head) using 100% real Supabase data — no new queries beyond what's listed in "Data and Dependency Changes."
- Reskin all Music screens (Top 100, Annual Countdown + Story viewer, Shuffle) and ship a new "Feed" tab that renders the already-fetched `music_history` table via the already-built (but currently unused) `RecentMusicCard` component.
- Update About page copy with the user's confirmed new facts (third child "Callan", expanded team list, Spritz/Tides side-projects section — all confirmed accurate, see Open Questions) in the new visual style; content generated is real, not mock.
- Add loading/empty/error state components in the new visual language for the FF and Music routes that currently lack them.
- Derive every FF/Music count on Home (season count, team count) and page eyebrows from real data — never hardcode a literal that could go stale.

## Non-Goals
- No changes to Fantasy Football or Music data-fetching logic (loaders, RPC calls, Supabase queries) beyond what's explicitly listed under "Data and Dependency Changes."
- No changes to `fantasy_football.login.tsx`, `.town_hall.tsx`, `.rule_submission.tsx` business logic (auth, ballots, rule submissions) — these get the same visual reskin treatment as everything else in a later pass, but this PRD's implementation scope focuses on the public-facing pages named in Goals. If the user wants those reskinned in this same effort, treat as an explicit scope addition, not an assumption.
- No schema change to add manager colors (resolved: computed client-side, see Data and Dependency Changes).
- No change to Shuffle's core redirect behavior (native URI scheme) — reskin only. No web fallback added for the "native app not installed" case; that gap is confirmed deferred, tracked as a future task, not part of this effort.
- No global footer introduced — footer content stays page-local to Fantasy Football's home page, as today. Home/About/Music remain footer-less (confirmed).
- No dark-theme palette design happens as part of this PRD's implementation phases — a dedicated design pass (separate deliverable, see Open Questions) produces the dark palette before Phase 1 begins.
- No numeric 1–100 rank column added to `top_100_albums` — Top 100 keeps its existing tier + alphabetical-within-tier + client-side sort behavior.
- No vinyl-purchase link added to Top 100 albums — schema has no column for it; that gap is out of scope here.
- No changes to `privacy.tsx` / `terms.tsx` legal copy (visual reskin only, if touched at all).

## Current State (Repository Audit)

### Existing related code
- `app/root.tsx:1-129` — shell: `ThemeProvider`, dark/light cookie hookup (`NonFlashOfWrongThemeEls`), font `<link>` tags (Outfit, Noto Sans, both loaded via Google Fonts CDN — no `@fontsource` packages actually used despite being in `package.json` deps), single `<body>` background/text color class.
- `app/utils/theme-provider.tsx` — `ThemeProvider`, `useTheme()` hook, `Theme` enum (`LIGHT`/`DARK`), `isTheme` guard, `NonFlashOfWrongThemeEls` component. Reusable as-is for the dark/light half of theming; the accent-color picker should follow the exact same pattern (new parallel context/cookie, not a rewrite of this one).
- `app/utils/theme.server.ts:1-33` — `getThemeSession(request)`: cookie-session-backed getter/setter for theme (`my_remix_theme` cookie, httpOnly, secure, sameSite lax, `SESSION_SECRET`-signed). Template for the new accent-color cookie.
- `app/routes/action.set-theme.tsx` — action route that commits the theme cookie. Template for a new `action.set-accent.tsx`.
- `tailwind.config.js:1-15` — `darkMode: 'class'`, `fontFamily.display`/`fontFamily.body` both currently `Outfit`. No color tokens defined (all Tailwind defaults + hardcoded orange-* classes throughout components).
- `app/styles/global.css`, `app/styles/app.css` (generated by `npm run build:css`) — Tailwind layers only, no custom CSS beyond a `.no-scrollbar` utility.
- `app/components/NavHeader/index.tsx:1-67` — top nav shell: "AZ" logo badge (orange-themed), `DarkModeToggle` (uses `useTheme()`), 4 `IconButton` nav links (Home/Fantasy Football/Music/About). This is where the new accent-swatch picker UI and the visual reskin of the logo/nav both land.
- `app/routes/_index.tsx:10-58` — Home page, zero loader, static content (name, descriptor, 6 randomly-selected memoji images, social IconButtons).
- `app/routes/about.tsx:4-40` — About page, zero loader, 100% static prose (family, employer, teams, vinyl collecting). Content itself will change (new facts), but the "no loader" pattern stays.
- `app/routes/fantasy_football.tsx:1-86` — FF layout + parent loader. Fetches `manager` (id, name), `season` (year, champ) ordered desc, and RPC `all_time()`. Derives `latestChampionFirstName` (L35-42) — this is the exact "reigning champion" logic the artifact re-invents; reuse directly, do not re-derive.
- `app/routes/fantasy_football._index.tsx` — FF home hero + footer (site attribution, Privacy/Terms links). Only page with a footer today.
- `app/routes/fantasy_football.all_time.tsx` — league-wide standings, `useFootballContext()`'s `allTime`, sorted by win% client-side.
- `app/routes/fantasy_football.season.$year.tsx` — season overview, RPC `season_details(year)`.
- `app/routes/fantasy_football.matchups.tsx` — week-by-week scorecards, RPC `week_matchups(week, year)`, returns `game_details[]` (already models bye/winners-bracket/toilet-bowl via `is_bye_week`/`is_winners_bracket`/`is_toilet_bowl`/`is_playoffs`).
- `app/routes/fantasy_football.manager.$id.tsx` — manager profile, RPC `manager_seasons(id)` + `opponents(id)`.
- `app/routes/fantasy_football.head_to_head.tsx` — H2H comparison, RPC `head_to_head(a,b)` + `head_to_head_matchups(a,b)`.
- `app/components/ScoreCard/index.tsx:1-165` — matchup card; reads `game_details` composite type directly (`home_team`/`away_team`/`home_manager_name`/`away_manager_name`/`home_logo`/`away_logo`/scores/seeds/badges). Currently falls back to a generic `football-ball` icon when `home_logo`/`away_logo` is null — this is the exact spot where the new deterministic manager-color avatar replaces the icon fallback.
- `app/routes/music.tsx` — Music page loader fetches `top_100_albums`, `albums_of_the_year`, and `music_history` (L97-206); the last is fetched but never rendered (component only renders Top100/Annual tabs today, L288-447). Client-side Tier/Genre/Artist/Date sort for Top 100 (L209-286) — must be preserved per resolved decision.
- `app/routes/music_.story.$year.tsx` — full-screen story/carousel viewer, date-gated reveal (`reveal_date = Dec (26 - rank)`), progress dots, blurred background, swipe/keyboard nav (L156-334). Already matches the artifact's "Story" screen almost exactly — reskin only.
- `app/routes/music_.share.$id.tsx` — single shareable `music_history` record with OG tags.
- `app/routes/random_album.tsx:38-284` — Shuffle: combines + dedupes `top_100_albums` + `albums_of_the_year`, picker → spin (~2s) → redirect via native URI scheme, no web fallback.
- `app/components/Top100Card`, `AlbumOfTheYearListCard`, `AlbumStorySlide`, `StoryProgressDots`, `RecentMusicCard` (built, unused), `LazyImage` (has its own skeleton + fade-in — reuse for all image loading), `StatCard`, `Breadcrumb`, `ScrollablePills`, `Tabs`, `Modal`, `Popover`, `Select`, `ListBox`, `Switch`, `Button`, `IconButton`, `Icon`, `StickyHeader`, `SideNavigation` (built, unused in shell today).
- `db_types.ts` — Supabase-generated types; source of truth for every schema fact cited in this PRD (verified directly, not assumed): `manager` (no color column), `season.teams: number[]`, `top_100_albums` (no vinyl column), `albums_of_the_year` (has `vinyl_link`), `music_history` (has `vinyl_url`).

### Gaps identified
- No design-token layer (CSS custom properties or Tailwind theme extension) for accent color — every component hardcodes `orange-*` Tailwind classes directly. This must be introduced before any component reskin can be "theme-aware."
- No accent-color persistence mechanism (cookie or otherwise) — net new.
- No manager avatar color anywhere in the data model or UI — net new (client-side derivation only, per resolved decision).
- No dark-theme design for the new visual language — the artifact only designs a light variant. Net new design work, not a port.
- No loading/empty/error state components beyond `LazyImage`'s generic skeleton — net new for FF and Music routes.
- `music_history`/`RecentMusicCard` — data and component both exist but are fully disconnected from any route. Needs a new tab/UI in `music.tsx`, not new data plumbing.
- No global footer — footer only exists on `fantasy_football._index.tsx`. Confirmed: stays page-local, not promoted to a global footer (see Open Questions (Resolved)).

## Architecture and Ownership Plan

### App layer (routes)
- `app/root.tsx` — add new Google Fonts `<link>` entries (Instrument Serif, Space Grotesk, IBM Plex Mono) alongside existing Outfit/Noto Sans (keep old fonts loaded only if still referenced anywhere after the reskin; remove if fully replaced). Add accent-color loader read (parallel to existing theme loader read) and pass down via a new `AccentProvider`.
- `app/routes/action.set-theme.tsx` — no change.
- `app/routes/action.set-accent.tsx` — **new**, mirrors `action.set-theme.tsx` exactly, using a new `accent.server.ts` cookie session helper.
- `app/routes/_index.tsx` — reskin only; replace hardcoded "16 seasons" style copy with derived counts sourced from a loader (currently this route has no loader — add one that reuses the same Supabase queries as `fantasy_football.tsx`'s parent loader, or lifts season-count/team-count into a small shared query helper — see DRY plan).
- `app/routes/about.tsx` — content update (new facts confirmed, with "Callan" name correction) + reskin. Still no loader needed (fully static).
- `app/routes/fantasy_football*.tsx` (all 10 route files) — reskin components only; loaders untouched.
- `app/routes/music.tsx` — reskin + wire up the "Feed" tab using existing `music_history` loader data (already fetched, L97-206) and existing `RecentMusicCard` component; add relative-time formatting for `created_at`.
- `app/routes/music_.story.$year.tsx`, `music_.share.$id.tsx`, `random_album.tsx` — reskin only.

### Data layer (Supabase)
- No schema migrations required for any of the resolved decisions (manager colors computed client-side; no vinyl column added; no rank column added).
- Shuffle web fallback (reading `apple_music_url`/`spotify_url` as a fallback href) confirmed deferred, out of scope — no data-layer change needed here.
- No changes to any RPC function signatures.

### Shared/UI library (`app/components/*`)
- **New components:**
  - `AccentSwatchPicker` — the 4-color picker UI + `onClick` wiring to the new accent cookie/action route.
  - `ManagerAvatar` — takes a manager id/name, returns a colored circular initial badge; houses the deterministic color-hash logic in one place (used by `ScoreCard`, standings tables, manager profile, H2H, wherever the artifact shows a colored initial).
  - Loading/empty/error state components for FF and Music routes (skeleton rows/cards in the new dashed-border visual language; a shared empty-state and error-state block with retry affordance).
  - `AlbumModal` — confirmed net-new (see Open Questions): no shared album-detail modal exists today. `Top100Card` and `AlbumOfTheYearListCard` currently render artwork/title/artist/links inline on the card itself and never use the existing generic `Modal` component; sharing/linking works via a `?year=&album=` URL param that scrolls the target card into view (`music.tsx` L30-46), not a modal. The artifact's centered-overlay album detail view is a genuinely new interaction pattern, built on top of the existing generic `Modal` component (`app/components/Modal/index.tsx`), used by Top100/Annual/Feed alike.
  - Design tokens: either a new `app/styles/tokens.css` layer (CSS custom properties for accent color swapped via a `data-accent` attribute on `<html>`, same mechanism as `dark` class today) or a Tailwind `theme.extend.colors` addition driven by CSS vars — pick one approach and apply consistently; do not mix.
- **Reused, restyled only (no prop/behavior changes):** `ScoreCard`/`ScoreCardGroup` (swap generic football-icon fallback for `ManagerAvatar`), `StatCard`, `Top100Card`, `AlbumOfTheYearListCard`, `AlbumStorySlide`, `StoryProgressDots`, `RecentMusicCard`, `LazyImage`, `Tabs`, `ScrollablePills`, `Breadcrumb`, `Modal`, `Button`, `IconButton`, `Icon`, `Select`, `ListBox`, `Switch`, `StickyHeader`.
- **Wired in (resolved):** `SideNavigation` — the artifact's mockup shows all 4 nav items directly in the header with no drawer, but the decision is to add a mobile breakpoint where the header collapses to a hamburger trigger opening `SideNavigation` as a drawer. This is new integration work for an existing-but-dormant component, not a reskin of something already wired up.
- **Unused today, evaluate for reuse:** `FullScreenBackground` (empty directory — either delete if truly dead, or this is where the Story viewer's blurred background treatment could live if not already inline in `music_.story.$year.tsx`).

### Services/integrations
- No change. Supabase client (`app/utils/supabase`) untouched.

### Infrastructure (migrations, CI, config)
- `tailwind.config.js` — extend `fontFamily` with the three new font families; add color tokens if going the Tailwind-extend route for accent theming.
- No CI changes. No migrations.

## DRY and Reuse Plan

### Reuse decisions
- `app/utils/theme-provider.tsx` + `theme.server.ts` + `action.set-theme.tsx` → **pattern-clone**, not modify, into an `AccentProvider`/`accent.server.ts`/`action.set-accent.tsx` trio. Keeping them structurally parallel (same cookie-session approach, same `NonFlashOfWrong*Els` SSR-safety technique) means one mental model covers both user preferences.
- `app/routes/fantasy_football.tsx`'s season-count/team-count-deriving logic → extract into a small shared helper (e.g. `app/utils/league-stats.server.ts`) callable from both `fantasy_football.tsx`'s loader and `_index.tsx`'s new loader, so Home's "N seasons" stat and FF's own stats never drift out of sync from two independent queries.
- `ScoreCard`'s existing `home_logo`/`away_logo` null-fallback branch → replace fallback with the new `ManagerAvatar`, do not duplicate avatar logic inline in `ScoreCard`.
- `LazyImage`'s existing skeleton/fade-in → reuse directly for all new album-artwork and any avatar-adjacent imagery; do not build a second image-loading pattern.
- `music.tsx`'s already-fetched `music_history` data + already-built `RecentMusicCard` → wire together directly; this is the textbook "reuse, don't rebuild" case this skill exists to catch.

### Refactors to reduce duplication
- Manager-color derivation must live in exactly one place (`ManagerAvatar` or a small `app/utils/manager-color.ts` helper it wraps) — every screen that shows a manager avatar (standings, season, manager profile, H2H, ScoreCard) imports the same function so the same manager always gets the same color everywhere.
- Season-pill / year-list rendering appears in at least 3 places today (`all_time`/`season.$year` navigation, and implicitly in the artifact's season pills) — if these currently duplicate the "map years to pill props" logic, consolidate into one shared component/hook during the reskin rather than reskinning three copies independently.

## Detailed Implementation Scope

### Phase -1 — Dark-theme design pass (prerequisite, blocks Phase 1+)
- Step 0: Run a dedicated design pass (via `frontend-design` skill or a fresh Claude Design artifact) to produce the dark-theme equivalent of the artifact's light "zine" visual language — dark paper-like background, adapted dashed-border treatment, dot-grid pattern, and text/border contrast for Instrument Serif/Space Grotesk/IBM Plex Mono — independent from and reviewed before any component implementation begins.
  - Files: none (design deliverable, likely a new Claude Design artifact or static reference doc/screenshots attached to this PRD)
  - Acceptance criteria: a reviewed dark-mode palette/reference exists and is approved before Phase 0/1 implementation starts; Phase 0's design-token layer (Step 2) is built to consume both palettes from day one rather than retrofitting dark mode later.

### Phase 0 — Design token & theming infrastructure
- Step 1: Add accent-color cookie infrastructure (`accent.server.ts`, `action.set-accent.tsx`, `AccentProvider`/`useAccent()` mirroring `theme-provider.tsx`).
  - Files: `app/utils/accent.server.ts` (new), `app/utils/accent-provider.tsx` (new), `app/routes/action.set-accent.tsx` (new), `app/root.tsx` (wire loader + provider)
  - Acceptance criteria: reloading the page after picking a swatch shows the same accent with no flash; works with JS disabled falling back gracefully to default orange.
- Step 2: Introduce color/font design tokens (CSS custom properties or Tailwind theme extension) driven by the accent + dark/light state.
  - Files: `tailwind.config.js`, `app/styles/global.css` (or new `tokens.css`)
  - Acceptance criteria: changing accent swatch recolors every previously-orange UI element (nav highlight, active tab, links, buttons) without a page reload.
- Step 3: Load new fonts (Instrument Serif, Space Grotesk, IBM Plex Mono) via the existing Google Fonts `<link>` pattern; retire Outfit/Noto Sans `<link>` tags if no longer referenced anywhere post-reskin.
  - Files: `app/root.tsx`, `tailwind.config.js`

### Phase 1 — Shell (Nav, Footer, global background)
- Step 4: Reskin `NavHeader` (logo badge, nav links, dashed-border/dot-grid shell) and add the new `AccentSwatchPicker`; add a mobile breakpoint where the nav collapses to a hamburger trigger opening `SideNavigation` as a drawer (resolved: wire up the existing-but-dormant component rather than keeping all 4 links inline at every width).
  - Files: `app/components/NavHeader/index.tsx`, new `app/components/AccentSwatchPicker/index.tsx`, `app/components/SideNavigation/index.tsx` (wire in, likely minor prop/behavior additions for open/close state)
  - Acceptance criteria: nav matches artifact's sticky-header layout at desktop widths; below the mobile breakpoint, a hamburger trigger opens `SideNavigation` with the same 4 links; swatch picker updates accent live at all breakpoints.
- Step 5: Footer stays page-local (resolved: no global footer). Reskin the existing footer on `fantasy_football._index.tsx` only; Home/About/Music remain footer-less, matching current behavior.
  - Files: `app/routes/fantasy_football._index.tsx`

### Phase 2 — Home & About
- Step 6: Reskin `_index.tsx`; add a loader that derives real season-count/team-count (via the shared helper from the DRY plan) for the FF nav card's stat line; replace all mock literals per the Hardcoded-Mock Replacement table.
  - Files: `app/routes/_index.tsx`, `app/utils/league-stats.server.ts` (new, shared)
  - Acceptance criteria: FF card's season/team counts always match `fantasy_football.tsx`'s own counts (single source of truth).
- Step 7: Reskin `about.tsx`; update copy with the confirmed facts — third child named **Callan** (not "Calan"), expanded team list (Celtics/Bengals/Bearcats/UT Vols/FC Cincinnati/Reds/Newcastle United), and a "Side Projects" section for Spritz + Tides with App Store links. All facts confirmed accurate by the user except the name correction.
  - Files: `app/routes/about.tsx`
  - Acceptance criteria: About page copy uses "Callan," not the artifact's "Calan" typo.

### Phase 3 — Fantasy Football
- Step 8: Build `ManagerAvatar` (deterministic color-hash from manager id/name against a fixed palette) and wire into `ScoreCard`'s null-logo fallback.
  - Files: new `app/components/ManagerAvatar/index.tsx`, `app/components/ScoreCard/index.tsx`
  - Acceptance criteria: the same manager always renders the same avatar color across every screen; a manager with a real `home_logo`/`away_logo` still shows the real logo (avatar is a fallback, not a replacement).
- Step 9: Reskin FF home/standings/records (`fantasy_football._index.tsx`, `fantasy_football.all_time.tsx`) — season pills, standings table, records tab.
  - Files: `app/routes/fantasy_football._index.tsx`, `app/routes/fantasy_football.all_time.tsx`
  - Acceptance criteria: "N Teams"/"N Seasons" stats are derived, not hardcoded (verify against `league-stats.server.ts`).
- Step 10: Reskin season detail (`fantasy_football.season.$year.tsx`, `fantasy_football.matchups.tsx`) — Overview/Week-by-Week tabs, week pills, matchup cards using `ScoreCard`.
  - Files: `app/routes/fantasy_football.season.$year.tsx`, `app/routes/fantasy_football.matchups.tsx`
- Step 11: Reskin manager profile (`fantasy_football.manager.$id.tsx`) and head-to-head (`fantasy_football.head_to_head.tsx`).
  - Files: `app/routes/fantasy_football.manager.$id.tsx`, `app/routes/fantasy_football.head_to_head.tsx`

### Phase 4 — Music
- Step 12: Reskin Top 100 tab, preserving existing Tier/Genre/Artist/Date sort controls in the new visual language; drop the artifact's "placeholder tiles" disclaimer (real artwork already exists).
  - Files: `app/routes/music.tsx`, `app/components/Top100Card/index.tsx`
- Step 13: Reskin Annual Countdown grid + Story viewer.
  - Files: `app/routes/music.tsx`, `app/routes/music_.story.$year.tsx`, `app/components/AlbumOfTheYearListCard/index.tsx`, `app/components/AlbumStorySlide/index.tsx`, `app/components/StoryProgressDots/index.tsx`
- Step 14: Wire up + reskin the new Feed tab using existing `music_history` loader data and `RecentMusicCard`; add relative-time formatting; design an empty state (never rendered before, no precedent).
  - Files: `app/routes/music.tsx`, `app/components/RecentMusicCard/index.tsx`
  - Acceptance criteria: Feed renders real `music_history` rows with correct relative timestamps; zero-rows case shows a designed empty state, not a blank area.
- Step 15: Reskin Shuffle (`random_album.tsx`) picker/spinner modal chrome; keep native-URI auto-redirect behavior unchanged. Web fallback for "native app not installed" is confirmed deferred — do not add it here; file as a separate future task if desired.
  - Files: `app/routes/random_album.tsx`
- Step 16: Build the new shared `AlbumModal` component (confirmed net-new — no shared album-detail modal exists today; `Top100Card`/`AlbumOfTheYearListCard` currently render details inline on the card and share via a `?year=&album=` scroll-to-card URL param, not a modal). Wire it into Top100/Annual/Feed as the artifact designs, built on the existing generic `Modal` component (`app/components/Modal/index.tsx`), sourcing share URLs from the real existing routes (`/music/share/:id`, `/music/story/:year?album=:rank`) rather than any ad-hoc string construction.
  - Files: new `app/components/AlbumModal/index.tsx`, `app/routes/music.tsx`, `app/components/Top100Card/index.tsx`, `app/components/AlbumOfTheYearListCard/index.tsx`
  - Acceptance criteria: clicking any album (Top100/Annual/Feed) opens the same modal component; the existing inline-card detail rendering is replaced, not duplicated alongside the new modal.

### Phase 5 — State coverage
- Step 17: Design + implement loading/empty/error components in the new visual language; apply to all FF and Music routes.
  - Files: new `app/components/LoadingSkeleton/`, `app/components/EmptyState/`, `app/components/ErrorState/` (or similar), applied across `app/routes/fantasy_football*.tsx` and `app/routes/music*.tsx`
  - Acceptance criteria: every route that fetches data has a designed (not blank/default-browser) loading, empty, and error state; a manager with zero games doesn't crash a win%/record calculation (verify RPC behavior first — see Risks).

## Data and Dependency Changes
- Model/schema/query changes: none. No migrations. Manager colors, accent theme, and Feed tab all use existing columns/tables or pure client-side computation.
- Package manifest updates: none required if new fonts load via Google Fonts `<link>` tags (matching the existing pattern) rather than `@fontsource` packages; if the implementer prefers `@fontsource/instrument-serif` etc., note the already-installed-but-unused `@fontsource/outfit`/`@fontsource/open-sans`/`@fontsource/raleway` packages should either be adopted consistently or removed — don't leave a third, half-used approach.
- Infrastructure changes: none.

## Testing and Validation Plan
- Unit tests: confirmed skip. This repo has no existing test infrastructure (no test runner found in `package.json`) and none is introduced as part of this visual PRD, including for the new `ManagerAvatar` color-hash function and `league-stats.server.ts` helper — stays consistent with the repo's current no-testing state.
- Integration tests: none currently exist; same note as above.
- Manual verification (critical scenarios):
  - Toggle dark/light and all 4 accent swatches on every page (Home, About, FF home/season/manager/H2H, Music Top100/Annual/Story/Feed/Shuffle) — confirm no flash-of-wrong-theme on reload, confirm every previously-orange element responds to accent changes.
  - Confirm the same manager shows the same avatar color across FF standings, season, manager profile, and H2H screens.
  - Confirm Home's "N Seasons"/"N Teams" stats match FF's own displayed counts.
  - Confirm Music Feed renders real `music_history` rows with correct artwork, blurb (when present), links, and a real relative timestamp; confirm the empty state renders correctly by temporarily querying with a filter that returns zero rows.
  - Confirm Shuffle still redirects via native URI scheme exactly as before the reskin (no web fallback added — confirmed deferred).
  - Confirm a manager with 0 games (if one exists, e.g. an `is_active: false` manager who never played) doesn't break any win%/record display.
  - Test at mobile width — the artifact is responsive (uses `clamp()`/`repeat(auto-fit,...)`), confirm the reskin holds up on small screens, especially the season/week pill horizontal scrollers and the Music Feed cards.

## Risks and Mitigations
- Risk: Introducing an accent-color token layer touches nearly every component's className strings — high surface area for visual regressions.
  - Mitigation: do Phase 0 (tokens) and Phase 1 (shell) first and get them reviewed/approved before touching FF/Music screens, so the token approach is validated once rather than re-litigated per phase.
- Risk: `all_time()`/`season_details()`/etc. RPCs may not gracefully handle a manager with `total_games = 0` (division by zero on win%).
  - Mitigation: verify RPC behavior directly (query with a zero-game manager id, or read the RPC SQL in `supabase/migrations/`) before assuming the new empty/zero states are purely a frontend concern.
- Risk: Dark-theme palette for the new visual language doesn't exist yet (artifact only designs light mode) — risk of an inconsistent or rushed dark variant.
  - Mitigation: resolved — Phase -1 (Step 0) is a dedicated design pass, completed and reviewed before Phase 0/1 implementation begins, rather than improvised during component work.
- Risk: Retrofitting `RecentMusicCard`/Feed tab may surface schema assumptions that don't hold for real `music_history` data (e.g., all rows missing blurbs, or very sparse data making the tab look empty most of the time).
  - Mitigation: query the real `music_history` table's row count and completeness before finalizing the Feed tab's design assumptions.

## Open Questions (Resolved)
- **About-page content accuracy:** Confirmed accurate with one correction — the third child's name is **"Callan,"** not the artifact's "Calan." Team list (Celtics/Bengals/Bearcats/UT Vols/FC Cincinnati/Reds/Newcastle United) and Spritz/Tides side-projects section confirmed accurate as-is.
- **Shuffle web fallback:** Deferred, out of scope for this PRD. Shuffle keeps its current native-URI-only redirect with no web fallback when the app isn't installed; reskin the modal chrome only (Step 15). Track the fallback gap as a separate future task if desired.
- **Dark-theme palette:** A dedicated design pass runs first, before any implementation (see Phase -1 / Step 0), rather than being improvised during Phase 0/1 component work.
- **Default accent color:** Orange, confirmed — specifically **`#FF8200`** — matching the current site's brand color for first-time visitors with no cookie set.
- **Footer scope:** Stays page-local. No global footer introduced; only `fantasy_football._index.tsx` keeps its footer, reskinned in place (Step 5). Home/About/Music remain footer-less.
- **Album-detail modal:** Confirmed via direct codebase check — no shared modal exists today. `Top100Card` and `AlbumOfTheYearListCard` render details inline on the card and never use the existing generic `Modal` component; sharing works via a `?year=&album=` URL param that scrolls a card into view (`music.tsx` L30-46), not a modal. A new shared `AlbumModal` component is required (Step 16), built on the existing `Modal` component.
- **Mobile nav:** Wire up the existing-but-unused `SideNavigation` component as a hamburger-triggered drawer below a mobile breakpoint (Step 4), rather than keeping all 4 nav links inline at every width as the artifact's mockup shows.
- **Test coverage:** Skip entirely. No test runner or tests introduced for this PRD's new pure functions (`ManagerAvatar` color-hash, `league-stats.server.ts`), consistent with the repo's current no-testing state.

## Recommended Skills
- `vercel:react-best-practices` — run after editing multiple `.tsx` components during this reskin, per its own trigger condition.
- `vercel:nextjs` is not applicable (this is Remix, not Next.js) — no relevant Vercel framework skill for Remix specifically; rely on general React best practices instead.
- `frontend-design:frontend-design` — recommended for the Phase -1 dark-theme design pass (Step 0), and again during Phase 0/1 for translating the artifact's aesthetic into a coherent, non-templated Tailwind token system.
- `execute-prd` — recommended for actually driving implementation of this PRD step-by-step with compile gates and per-step commits, once this PRD's open questions are resolved.

## Definition of Done
- [ ] All scoped files and modules identified
- [ ] DRY/reuse opportunities addressed (theme-provider pattern cloned for accent, `ManagerAvatar` centralized, `music_history`/`RecentMusicCard` wired instead of rebuilt)
- [ ] Module ownership boundaries respected (no route loader logic changed outside of the two explicitly-scoped additions: Home's new loader, Feed tab wiring)
- [ ] Tests and acceptance criteria defined per phase
- [ ] Open questions resolved or flagged
