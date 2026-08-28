-- Tour de Sport (AUS-849): scoring functions.
--
-- Versioned 20260830000000 so the filename sorts after BOTH 20260828_tour_de_
-- sport_schema.sql and 20260829000000_tour_de_sport_season_lock.sql (see the
-- season-lock migration header for the digits-before-underscore gotcha).
-- Idempotent: DROP FUNCTION IF EXISTS before each CREATE, re-runnable grants.
--
-- Canonical scoring contract: app/utils/tour_de_sport/normalization.ts.
-- The SQL below mirrors it exactly — with N assigned entities the best earns
-- N points down to 1 for the worst, ties on the real-world rank share the
-- AVERAGE of the ordinals they span, so a sport's pool always sums to exactly
-- N * (N + 1) / 2 (105 for the 14-participant season). Averaged ordinals are
-- whole or half numbers, exact in numeric — no tolerance needed.
--
-- SECURITY: both functions are SECURITY INVOKER (the Postgres default, stated
-- explicitly) so the caller's RLS applies — anon can only see assignments,
-- standings, and manual scores for REVEALED sports. Revealed-ness is ALSO an
-- explicit predicate inside tds_sport_scores (belt and braces): even a
-- commissioner or service-role caller gets zero rows for an unrevealed sport,
-- so a privileged call can never publish pre-reveal totals through a cached
-- page.
--
-- Edge rules (implemented + tested):
-- * Snapshot choice: the sport's most recent GOOD snapshot THAT HAS standings
--   rows. A good-but-empty snapshot is skipped (theoretically possible per
--   the ingest contract notes); prior days' snapshots are separate rows.
-- * Missing entity: an assigned entity absent from that snapshot's standings
--   (e.g. a golfer fell out of the top 50) ranks BELOW every present entity,
--   tied with any other missing entities (their ordinals average). The pool
--   still sums to N(N+1)/2. Degenerate corollary: no usable snapshot at all
--   → every entity is "missing", everyone ties at ordinal (N+1)/2 and splits
--   the pool evenly, snapshot metadata is NULL.
-- * Manual override: a tds_manual_scores row REPLACES the computed points for
--   that (sport, participant); the row is flagged overridden and base_points
--   still carries the computed value. Overrides can legitimately break the
--   105 pool invariant for that sport.

-- ---------------------------------------------------------------------------
-- tds_sport_scores: one revealed sport's per-assignment scoring rows
-- ---------------------------------------------------------------------------
-- Zero rows when: season/sport not found, sport not revealed, or the caller's
-- RLS hides the assignments (anon + unrevealed). snapshot_date / fetched_at
-- repeat on every row (staleness metadata for the UI; NULL = no usable
-- snapshot). ordinal is the tie-averaged 1..N position within the assigned
-- field; points = COALESCE(manual override, N + 1 - ordinal).

DROP FUNCTION IF EXISTS public.tds_sport_scores(integer, text);

CREATE OR REPLACE FUNCTION public.tds_sport_scores(
  p_season_year integer,
  p_sport_key text
)
RETURNS TABLE (
  participant_id bigint,
  display_name text,
  entity_id bigint,
  entity_name text,
  entity_image_url text,
  real_rank integer,
  metric_value numeric,
  ordinal numeric,
  base_points numeric,
  points numeric,
  overridden boolean,
  override_reason text,
  snapshot_date date,
  fetched_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH sport AS (
    SELECT sp.id
    FROM public.tds_sports sp
    JOIN public.tds_seasons se ON se.id = sp.season_id
    WHERE se.year = p_season_year
      AND sp.sport_key = p_sport_key
      -- Explicit reveal gate on top of RLS: privileged callers must not leak
      -- pre-reveal data either.
      AND sp.revealed_at IS NOT NULL
  ),
  latest_good AS (
    -- Most recent good snapshot that actually has standings rows.
    SELECT sn.id, sn.snapshot_date, sn.fetched_at
    FROM public.tds_snapshots sn
    JOIN sport ON sport.id = sn.sport_id
    WHERE sn.status = 'good'
      AND EXISTS (
        SELECT 1 FROM public.tds_standings st WHERE st.snapshot_id = sn.id
      )
    ORDER BY sn.snapshot_date DESC
    LIMIT 1
  ),
  assigned AS (
    SELECT
      a.participant_id,
      p.display_name,
      a.entity_id,
      e.name AS entity_name,
      e.image_url AS entity_image_url,
      st.rank AS real_rank,
      st.metric_value,
      lg.snapshot_date,
      lg.fetched_at,
      a.sport_id
    FROM public.tds_assignments a
    JOIN sport ON sport.id = a.sport_id
    JOIN public.tds_participants p ON p.id = a.participant_id
    JOIN public.tds_entities e ON e.id = a.entity_id
    LEFT JOIN latest_good lg ON true
    LEFT JOIN public.tds_standings st
      ON st.snapshot_id = lg.id
     AND st.entity_id = a.entity_id
  ),
  positioned AS (
    SELECT
      assigned.*,
      -- Raw 1..N position; NULLS LAST puts missing entities at the bottom.
      -- entity_id only breaks ties for a deterministic row order — the
      -- AVERAGE below erases its effect on scoring.
      ROW_NUMBER() OVER (
        ORDER BY assigned.real_rank ASC NULLS LAST, assigned.entity_id ASC
      ) AS raw_position,
      COUNT(*) OVER () AS field_size
    FROM assigned
  ),
  averaged AS (
    -- PARTITION BY groups equal real_rank values together and puts every NULL
    -- (missing entity) in one shared partition — exactly the tie groups the
    -- canonical contract averages over.
    SELECT
      positioned.*,
      AVG(positioned.raw_position) OVER (PARTITION BY positioned.real_rank)
        AS avg_ordinal
    FROM positioned
  )
  SELECT
    av.participant_id,
    av.display_name,
    av.entity_id,
    av.entity_name,
    av.entity_image_url,
    av.real_rank,
    av.metric_value,
    av.avg_ordinal AS ordinal,
    (av.field_size + 1) - av.avg_ordinal AS base_points,
    COALESCE(m.points, (av.field_size + 1) - av.avg_ordinal) AS points,
    (m.id IS NOT NULL) AS overridden,
    m.reason AS override_reason,
    av.snapshot_date,
    av.fetched_at
  FROM averaged av
  LEFT JOIN public.tds_manual_scores m
    ON m.sport_id = av.sport_id
   AND m.participant_id = av.participant_id
  ORDER BY av.avg_ordinal ASC, av.entity_id ASC;
$$;

-- ---------------------------------------------------------------------------
-- tds_scoreboard: one row per participant with total + per-sport breakdown
-- ---------------------------------------------------------------------------
-- total_points sums COUNTED sports only: status IN ('counting','final') AND
-- revealed. Pending contributes zero even when revealed; unrevealed always
-- contributes zero. Manual overrides are included (tds_sport_scores already
-- applied them).
--
-- sports jsonb: EVERY sport of the season, ordered by sport_index, one object
-- per sport:
--   { "sport_id": 1, "sport_key": "nhl", "name": "NHL", "sport_index": 0,
--     "status": "counting", "revealed": true, "counted": true,
--     "points": 12.5, "overridden": false,
--     "snapshot_date": "2026-08-28", "fetched_at": "..." }
-- points/overridden/snapshot_date/fetched_at are null for unrevealed sports
-- (tds_sport_scores yields no rows) and for a revealed sport the caller
-- cannot see or that has no assignments yet. A revealed-but-pending sport
-- DOES carry its computed points (counted=false keeps it out of the total) so
-- the UI may preview them. fetched_at is ISO-8601 text; staleness = now() -
-- fetched_at > 48h, computed by the caller.

DROP FUNCTION IF EXISTS public.tds_scoreboard(integer);

CREATE OR REPLACE FUNCTION public.tds_scoreboard(
  p_season_year integer
)
RETURNS TABLE (
  participant_id bigint,
  display_name text,
  manager_id integer,
  total_points numeric,
  sports jsonb
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH season AS (
    SELECT se.id FROM public.tds_seasons se WHERE se.year = p_season_year
  ),
  sports AS (
    SELECT
      sp.id,
      sp.sport_key,
      sp.name,
      sp.sport_index,
      sp.status,
      (sp.revealed_at IS NOT NULL) AS revealed,
      (sp.revealed_at IS NOT NULL AND sp.status IN ('counting', 'final'))
        AS counted
    FROM public.tds_sports sp
    JOIN season se ON se.id = sp.season_id
  ),
  scored AS (
    -- Reuse the canonical per-sport function; unrevealed sports return zero
    -- rows so they can never contribute.
    SELECT
      sp.id AS sport_id,
      sc.participant_id,
      sc.points,
      sc.overridden,
      sc.snapshot_date,
      sc.fetched_at
    FROM sports sp
    CROSS JOIN LATERAL public.tds_sport_scores(p_season_year, sp.sport_key) sc
  ),
  parts AS (
    SELECT p.id, p.display_name, p.manager_id
    FROM public.tds_participants p
    JOIN season se ON se.id = p.season_id
  ),
  cells AS (
    SELECT
      pt.id AS pid,
      pt.display_name,
      pt.manager_id,
      sp.id AS sport_id,
      sp.sport_key,
      sp.name AS sport_name,
      sp.sport_index,
      sp.status,
      sp.revealed,
      sp.counted,
      sc.points,
      sc.overridden,
      sc.snapshot_date,
      sc.fetched_at
    FROM parts pt
    CROSS JOIN sports sp
    LEFT JOIN scored sc
      ON sc.sport_id = sp.id
     AND sc.participant_id = pt.id
  )
  SELECT
    c.pid AS participant_id,
    c.display_name,
    c.manager_id,
    COALESCE(SUM(c.points) FILTER (WHERE c.counted), 0) AS total_points,
    jsonb_agg(
      jsonb_build_object(
        'sport_id', c.sport_id,
        'sport_key', c.sport_key,
        'name', c.sport_name,
        'sport_index', c.sport_index,
        'status', c.status,
        'revealed', c.revealed,
        'counted', c.counted,
        'points', c.points,
        'overridden', c.overridden,
        'snapshot_date', c.snapshot_date,
        'fetched_at', c.fetched_at
      )
      ORDER BY c.sport_index
    ) AS sports
  FROM cells c
  GROUP BY c.pid, c.display_name, c.manager_id
  ORDER BY total_points DESC, c.display_name ASC;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
-- Results are RLS-shaped under SECURITY INVOKER, so public execution is safe:
-- anon sees only revealed sports' data.

GRANT EXECUTE ON FUNCTION public.tds_sport_scores(integer, text)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tds_scoreboard(integer)
  TO anon, authenticated;
