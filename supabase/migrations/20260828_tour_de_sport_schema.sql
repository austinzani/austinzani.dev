-- Tour de Sport (AUS-842): tds_ schema + season 1 seed.
-- Idempotent by construction: guarded types, IF NOT EXISTS tables,
-- DROP POLICY IF EXISTS before every CREATE POLICY, ON CONFLICT seeds.
--
-- Visibility model:
--   * seasons / sports / participants / entities / snapshots: public read.
--   * assignments / standings: public read ONLY while the owning sport's
--     revealed_at IS NOT NULL (the per-sport reveal gate).
--   * manual scores: public read once the sport is revealed; commissioners
--     always read (overrides must be visibly flaggable post-reveal).
--   * Ingest writes (entities, snapshots, standings) and the draw's
--     assignment writes: service-role only (service_role bypasses RLS; no
--     anon/authenticated write policies exist).
--   * Season lock, sport status/reveal flips, manual scores: commissioner
--     only, via the house league_memberships role pattern.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  -- 'live': score the sport's season in progress, read live through the
  --         season cutoff date.
  -- 'final_prior': score the most recent COMPLETED season's final standings
  --         (or final/preseason poll) as of the cutoff date.
  CREATE TYPE public.tds_metric_mode AS ENUM ('live', 'final_prior');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  -- 'pending': not yet counting; contributes zero points.
  -- 'counting': ingested and scored.
  -- 'final': result frozen; no further ingestion expected.
  CREATE TYPE public.tds_sport_status AS ENUM ('pending', 'counting', 'final');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.tds_snapshot_status AS ENUM ('good', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tds_seasons (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  year integer NOT NULL UNIQUE,
  cutoff_date date NOT NULL,
  -- Published RNG seed; stays NULL until Season Lock.
  rng_seed text,
  -- Season Lock: freezing tiers + seed. NULL = unlocked.
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tds_sports (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  season_id bigint NOT NULL REFERENCES public.tds_seasons(id) ON DELETE CASCADE,
  -- Stable machine key ('nhl', 'mlb', ...): how adapters and routes address a sport.
  sport_key text NOT NULL,
  name text NOT NULL,
  -- Frozen 0-based position feeding the draw's serpentine ordering.
  -- NEVER renumbered after Season Lock.
  sport_index integer NOT NULL,
  metric_mode public.tds_metric_mode NOT NULL,
  status public.tds_sport_status NOT NULL DEFAULT 'pending',
  -- Per-sport public visibility gate: assignments/standings for this sport
  -- become publicly readable the moment this is set at the live draw.
  revealed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, sport_key),
  UNIQUE (season_id, sport_index)
);
-- Note: no last_ingested_at column on purpose — staleness is derived from the
-- newest good tds_snapshots.fetched_at for the sport.

CREATE TABLE IF NOT EXISTS public.tds_participants (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  season_id bigint NOT NULL REFERENCES public.tds_seasons(id) ON DELETE CASCADE,
  -- Nullable so later seasons can admit non-manager participants.
  manager_id integer REFERENCES public.manager(id) ON DELETE RESTRICT,
  -- Display fallback (and the only identity for non-manager participants).
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, manager_id)
);

CREATE TABLE IF NOT EXISTS public.tds_entities (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sport_id bigint NOT NULL REFERENCES public.tds_sports(id) ON DELETE CASCADE,
  name text NOT NULL,
  -- Cross-source ID map, e.g. {"espn": "12", "mlb_stats": "121"}.
  -- Swapping an adapter must never orphan an assignment.
  source_ids jsonb NOT NULL DEFAULT '{}'::jsonb,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sport_id, name)
);

CREATE TABLE IF NOT EXISTS public.tds_assignments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sport_id bigint NOT NULL REFERENCES public.tds_sports(id) ON DELETE CASCADE,
  participant_id bigint NOT NULL REFERENCES public.tds_participants(id) ON DELETE CASCADE,
  entity_id bigint NOT NULL REFERENCES public.tds_entities(id) ON DELETE RESTRICT,
  -- Provenance for the published methodology: which tier the entity sat in
  -- (0-based) and which slot within that tier the draw handed out.
  tier_index integer,
  tier_slot integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sport_id, participant_id),
  UNIQUE (sport_id, entity_id)
);

CREATE TABLE IF NOT EXISTS public.tds_snapshots (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sport_id bigint NOT NULL REFERENCES public.tds_sports(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  status public.tds_snapshot_status NOT NULL DEFAULT 'good',
  -- Failure detail when status = 'failed'.
  error text,
  -- Raw upstream payload as fetched (public real-world data).
  payload jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  -- Idempotent ingestion: one row per sport per day; re-runs upsert.
  UNIQUE (sport_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS public.tds_standings (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  snapshot_id bigint NOT NULL REFERENCES public.tds_snapshots(id) ON DELETE CASCADE,
  entity_id bigint NOT NULL REFERENCES public.tds_entities(id) ON DELETE CASCADE,
  -- Raw real-world rank (1 = best) before tie-averaging; scoring averages
  -- tied ranks so each sport pays the same 105-point pool.
  rank integer NOT NULL,
  -- The metric behind the rank (points, wins, ranking value...), for display.
  metric_value numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (snapshot_id, entity_id)
);

CREATE TABLE IF NOT EXISTS public.tds_manual_scores (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sport_id bigint NOT NULL REFERENCES public.tds_sports(id) ON DELETE CASCADE,
  participant_id bigint NOT NULL REFERENCES public.tds_participants(id) ON DELETE CASCADE,
  -- Full replacement of the computed points for this (sport, participant).
  points numeric NOT NULL,
  reason text NOT NULL CHECK (char_length(trim(reason)) > 0),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- One active override per participant per sport.
  UNIQUE (sport_id, participant_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_tds_assignments_participant
  ON public.tds_assignments (participant_id);

CREATE INDEX IF NOT EXISTS idx_tds_snapshots_sport_good_date
  ON public.tds_snapshots (sport_id, snapshot_date DESC)
  WHERE status = 'good';

CREATE INDEX IF NOT EXISTS idx_tds_standings_entity
  ON public.tds_standings (entity_id);

CREATE INDEX IF NOT EXISTS idx_tds_manual_scores_participant
  ON public.tds_manual_scores (participant_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers (reuses public.set_row_updated_at from the town hall
-- migration)
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_tds_seasons_set_updated_at ON public.tds_seasons;
CREATE TRIGGER trg_tds_seasons_set_updated_at
BEFORE UPDATE ON public.tds_seasons
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS trg_tds_sports_set_updated_at ON public.tds_sports;
CREATE TRIGGER trg_tds_sports_set_updated_at
BEFORE UPDATE ON public.tds_sports
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS trg_tds_entities_set_updated_at ON public.tds_entities;
CREATE TRIGGER trg_tds_entities_set_updated_at
BEFORE UPDATE ON public.tds_entities
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS trg_tds_assignments_set_updated_at ON public.tds_assignments;
CREATE TRIGGER trg_tds_assignments_set_updated_at
BEFORE UPDATE ON public.tds_assignments
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS trg_tds_manual_scores_set_updated_at ON public.tds_manual_scores;
CREATE TRIGGER trg_tds_manual_scores_set_updated_at
BEFORE UPDATE ON public.tds_manual_scores
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

ALTER TABLE public.tds_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tds_sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tds_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tds_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tds_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tds_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tds_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tds_manual_scores ENABLE ROW LEVEL SECURITY;

-- Public reads ---------------------------------------------------------------

DROP POLICY IF EXISTS tds_seasons_select_public ON public.tds_seasons;
CREATE POLICY tds_seasons_select_public
ON public.tds_seasons
FOR SELECT
USING (true);

DROP POLICY IF EXISTS tds_sports_select_public ON public.tds_sports;
CREATE POLICY tds_sports_select_public
ON public.tds_sports
FOR SELECT
USING (true);

DROP POLICY IF EXISTS tds_participants_select_public ON public.tds_participants;
CREATE POLICY tds_participants_select_public
ON public.tds_participants
FOR SELECT
USING (true);

DROP POLICY IF EXISTS tds_entities_select_public ON public.tds_entities;
CREATE POLICY tds_entities_select_public
ON public.tds_entities
FOR SELECT
USING (true);

-- Snapshots are public real-world data and feed the staleness badge; they
-- carry nothing about who was assigned what, so they are always readable.
DROP POLICY IF EXISTS tds_snapshots_select_public ON public.tds_snapshots;
CREATE POLICY tds_snapshots_select_public
ON public.tds_snapshots
FOR SELECT
USING (true);

-- Reveal-gated reads ---------------------------------------------------------

DROP POLICY IF EXISTS tds_assignments_select_when_revealed ON public.tds_assignments;
CREATE POLICY tds_assignments_select_when_revealed
ON public.tds_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.tds_sports s
    WHERE s.id = public.tds_assignments.sport_id
      AND s.revealed_at IS NOT NULL
  )
);

DROP POLICY IF EXISTS tds_standings_select_when_revealed ON public.tds_standings;
CREATE POLICY tds_standings_select_when_revealed
ON public.tds_standings
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.tds_snapshots sn
    JOIN public.tds_sports s ON s.id = sn.sport_id
    WHERE sn.id = public.tds_standings.snapshot_id
      AND s.revealed_at IS NOT NULL
  )
);

DROP POLICY IF EXISTS tds_manual_scores_select_scoped ON public.tds_manual_scores;
CREATE POLICY tds_manual_scores_select_scoped
ON public.tds_manual_scores
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.tds_sports s
    WHERE s.id = public.tds_manual_scores.sport_id
      AND s.revealed_at IS NOT NULL
  )
  OR EXISTS (
    SELECT 1
    FROM public.league_memberships lm
    WHERE lm.user_id = auth.uid()
      AND lm.role = 'commissioner'
  )
);

-- Commissioner writes --------------------------------------------------------
-- The commissioner check mirrors the town hall pattern: a league_memberships
-- row for auth.uid() with role 'commissioner'. It is deliberately not scoped
-- to a league_id — Tour de Sport belongs to the site's single league.

DROP POLICY IF EXISTS tds_seasons_update_for_commissioners ON public.tds_seasons;
CREATE POLICY tds_seasons_update_for_commissioners
ON public.tds_seasons
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.league_memberships lm
    WHERE lm.user_id = auth.uid()
      AND lm.role = 'commissioner'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.league_memberships lm
    WHERE lm.user_id = auth.uid()
      AND lm.role = 'commissioner'
  )
);

DROP POLICY IF EXISTS tds_sports_update_for_commissioners ON public.tds_sports;
CREATE POLICY tds_sports_update_for_commissioners
ON public.tds_sports
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.league_memberships lm
    WHERE lm.user_id = auth.uid()
      AND lm.role = 'commissioner'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.league_memberships lm
    WHERE lm.user_id = auth.uid()
      AND lm.role = 'commissioner'
  )
);

DROP POLICY IF EXISTS tds_manual_scores_insert_for_commissioners ON public.tds_manual_scores;
CREATE POLICY tds_manual_scores_insert_for_commissioners
ON public.tds_manual_scores
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.league_memberships lm
    WHERE lm.user_id = auth.uid()
      AND lm.role = 'commissioner'
  )
);

DROP POLICY IF EXISTS tds_manual_scores_update_for_commissioners ON public.tds_manual_scores;
CREATE POLICY tds_manual_scores_update_for_commissioners
ON public.tds_manual_scores
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.league_memberships lm
    WHERE lm.user_id = auth.uid()
      AND lm.role = 'commissioner'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.league_memberships lm
    WHERE lm.user_id = auth.uid()
      AND lm.role = 'commissioner'
  )
);

DROP POLICY IF EXISTS tds_manual_scores_delete_for_commissioners ON public.tds_manual_scores;
CREATE POLICY tds_manual_scores_delete_for_commissioners
ON public.tds_manual_scores
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.league_memberships lm
    WHERE lm.user_id = auth.uid()
      AND lm.role = 'commissioner'
  )
);

-- No other write policies exist on purpose: ingestion (entities, snapshots,
-- standings) and the draw's assignment persistence run with the service-role
-- key, which bypasses RLS.

-- ---------------------------------------------------------------------------
-- Grants (RLS above is the real gate; grants follow the town hall style)
-- ---------------------------------------------------------------------------

GRANT SELECT ON public.tds_seasons TO anon, authenticated;
GRANT SELECT ON public.tds_sports TO anon, authenticated;
GRANT SELECT ON public.tds_participants TO anon, authenticated;
GRANT SELECT ON public.tds_entities TO anon, authenticated;
GRANT SELECT ON public.tds_assignments TO anon, authenticated;
GRANT SELECT ON public.tds_snapshots TO anon, authenticated;
GRANT SELECT ON public.tds_standings TO anon, authenticated;
GRANT SELECT ON public.tds_manual_scores TO anon, authenticated;

GRANT UPDATE ON public.tds_seasons TO authenticated;
GRANT UPDATE ON public.tds_sports TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tds_manual_scores TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.tds_manual_scores_id_seq TO authenticated;

-- ---------------------------------------------------------------------------
-- Season 1 seed (idempotent)
-- ---------------------------------------------------------------------------

INSERT INTO public.tds_seasons (name, year, cutoff_date)
VALUES ('Tour de Sport 2027', 2027, DATE '2027-08-07')
ON CONFLICT (year) DO NOTHING;

-- The 12 sports, in the spec's listed order (sport_index 0..11 — frozen; the
-- draw's serpentine input; never renumbered after Season Lock).
--
-- metric_mode reasoning against the 2027-08-07 cutoff:
--   nhl    final_prior — 2026-27 NHL season completes in June 2027; score its
--                        final standings (official NHL API, AUS-843).
--   mlb    live        — 2027 MLB regular season (Apr-Oct) is mid-flight at
--                        the cutoff; read live (MLB Stats API, AUS-846).
--   f1     live        — 2027 F1 championship (Mar-Dec) is mid-flight at the
--                        cutoff; read live (Jolpica, AUS-846).
--   nfl    final_prior — 2026 NFL season ended Feb 2027; the 2027 season
--                        starts after the cutoff (AUS-847).
--   nba    final_prior — 2026-27 NBA season completes June 2027 (AUS-847).
--   mls    final_prior — per AUS-847 the ESPN six all read the most recent
--                        completed season at the cutoff: the 2026 MLS table.
--   epl    final_prior — 2026-27 Premier League completes May 2027 (AUS-847).
--   cfb    final_prior — reads rankings/polls, not live standings; at the
--                        cutoff that is the completed-season/preseason poll
--                        (CFBD + ESPN rankings, AUS-847).
--   cbb    final_prior — AP poll, same posture as CFB (AUS-847).
--   nascar live        — 2027 Cup season (Feb-Nov) is mid-flight at the
--                        cutoff; CF live-points feed (AUS-848).
--   pga    live        — 2027 golf season is mid-flight at the cutoff; ESPN
--                        golf standings read live (AUS-848).
--   atp    live        — ATP world rankings roll weekly and are always
--                        current; read live at the cutoff (AUS-848).
INSERT INTO public.tds_sports (season_id, sport_key, name, sport_index, metric_mode)
SELECT seas.id, v.sport_key, v.name, v.sport_index, v.metric_mode::public.tds_metric_mode
FROM public.tds_seasons seas
JOIN (
  VALUES
    ('nhl',    'NHL',                 0,  'final_prior'),
    ('mlb',    'MLB',                 1,  'live'),
    ('f1',     'Formula 1',           2,  'live'),
    ('nfl',    'NFL',                 3,  'final_prior'),
    ('nba',    'NBA',                 4,  'final_prior'),
    ('mls',    'MLS',                 5,  'final_prior'),
    ('epl',    'Premier League',      6,  'final_prior'),
    ('cfb',    'College Football',    7,  'final_prior'),
    ('cbb',    'College Basketball',  8,  'final_prior'),
    ('nascar', 'NASCAR',              9,  'live'),
    ('pga',    'PGA Tour',            10, 'live'),
    ('atp',    'ATP Tennis',          11, 'live')
) AS v(sport_key, name, sport_index, metric_mode) ON true
WHERE seas.year = 2027
ON CONFLICT (season_id, sport_key) DO NOTHING;

-- Season 1 participants: exactly the active managers, linked by manager_id.
-- Derived dynamically — no hardcoded ids. On an empty local manager table
-- this is a no-op; see supabase/seeds/local_dev_active_managers.sql.
INSERT INTO public.tds_participants (season_id, manager_id, display_name)
SELECT seas.id, m.id, m.name
FROM public.tds_seasons seas
CROSS JOIN public.manager m
WHERE seas.year = 2027
  AND m.is_active = true
ON CONFLICT (season_id, manager_id) DO NOTHING;
