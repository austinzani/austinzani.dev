-- Tour de Sport (AUS-850): commissioner admin escape hatches.
--
-- Versioned 20260831000000 so the filename sorts after ALL prior tds
-- migrations (20260828_..., 20260829000000_..., 20260830000000_... — see the
-- season-lock migration header for the digits-before-underscore gotcha).
-- Idempotent: ADD COLUMN IF NOT EXISTS, DROP POLICY IF EXISTS before CREATE
-- POLICY, DROP FUNCTION IF EXISTS before CREATE, re-runnable grants.
--
-- Three pieces:
-- 1. Emergency-reassignment provenance columns on tds_assignments. Both are
--    set together whenever a commissioner reassigns an entity — loud, never
--    silent (revealed-is-final means every after-the-fact edit is flagged).
-- 2. A commissioner UPDATE policy on tds_assignments. AUS-845 deliberately
--    shipped assignments with NO update/delete ("drawn = final"); this is the
--    flagged escape hatch. The app's admin action only ever changes
--    entity_id + reassigned_at + reassignment_reason on an existing row —
--    participant/tier provenance and the draw record itself stay immutable.
-- 3. tds_sport_scores extended to surface the reassignment flag + reason so
--    the public sport detail page can flag reassigned rows exactly like
--    overridden ones.

-- ---------------------------------------------------------------------------
-- 1. Reassignment provenance columns
-- ---------------------------------------------------------------------------
-- NULL/NULL = the assignment is the untouched draw result. Both non-null =
-- a commissioner emergency reassignment (when + why).

ALTER TABLE public.tds_assignments
  ADD COLUMN IF NOT EXISTS reassigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS reassignment_reason text;

-- ---------------------------------------------------------------------------
-- 2. Commissioner UPDATE on tds_assignments
-- ---------------------------------------------------------------------------
-- Same commissioner predicate as every other tds_ write policy (deliberately
-- not league-scoped — single league). RLS is the real gate; the GRANT just
-- lets it apply.

DROP POLICY IF EXISTS tds_assignments_update_for_commissioners ON public.tds_assignments;
CREATE POLICY tds_assignments_update_for_commissioners
ON public.tds_assignments
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

GRANT UPDATE ON public.tds_assignments TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. tds_sport_scores: + reassigned / reassignment_reason
-- ---------------------------------------------------------------------------
-- CREATE OR REPLACE cannot change a function's return type (42P13), so the
-- function is dropped first — same pattern as the scoring migration. The
-- body is identical to 20260830000000 except for the two appended columns
-- (see that migration's header for the full scoring contract + edge rules).
-- tds_scoreboard calls this via LATERAL with named columns only, so it is
-- unaffected by the additive shape change and is not recreated here.

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
  fetched_at timestamptz,
  reassigned boolean,
  reassignment_reason text
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
      a.sport_id,
      (a.reassigned_at IS NOT NULL) AS reassigned,
      a.reassignment_reason
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
    av.fetched_at,
    av.reassigned,
    av.reassignment_reason
  FROM averaged av
  LEFT JOIN public.tds_manual_scores m
    ON m.sport_id = av.sport_id
   AND m.participant_id = av.participant_id
  ORDER BY av.avg_ordinal ASC, av.entity_id ASC;
$$;

-- DROP FUNCTION discards prior grants — re-grant (RLS still shapes results
-- under SECURITY INVOKER, so public execution stays safe).
GRANT EXECUTE ON FUNCTION public.tds_sport_scores(integer, text)
  TO anon, authenticated;
