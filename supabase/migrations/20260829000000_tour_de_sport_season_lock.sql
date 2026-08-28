-- Tour de Sport (AUS-845): Season Lock columns + draw-console assignment RLS.
-- Idempotent by construction: ADD COLUMN IF NOT EXISTS, DROP POLICY IF EXISTS
-- before CREATE POLICY, re-runnable grants.
--
-- Versioned 20260829000000 (not a second bare "20260828") so schema_migrations
-- never sees a duplicate version key AND the filename sorts after the base
-- tds_ migration (a same-day long version like 20260828120000 sorts BEFORE
-- "20260828_..." lexicographically — digits < underscore).

-- ---------------------------------------------------------------------------
-- Frozen tiers on sports
-- ---------------------------------------------------------------------------
-- Written once by Season Lock and never edited afterwards. Shape:
--   [ [ {"id": 7, "name": "Colorado Avalanche"}, ... ],   -- tier 0, strongest
--     [ ... ],                                            -- tier 1
--     ... ]
-- Strongest tier first; WITHIN each tier entities appear in frozen standings
-- order (best rank first). That within-tier order is a draw input — the
-- per-sport seeded shuffle consumes the array as stored — so reproducing the
-- draw must read the tiers exactly as published here. Entity names are
-- snapshotted into the JSON so the landing page's provenance table needs no
-- join and later entity renames can't rewrite the published record.
-- A sport locked with no usable standings stores '[]' (not drawable yet).
ALTER TABLE public.tds_sports
  ADD COLUMN IF NOT EXISTS tiers jsonb;

-- ---------------------------------------------------------------------------
-- Frozen draw inputs on seasons
-- ---------------------------------------------------------------------------
-- Written once by Season Lock. Shape:
--   {
--     "participants": [ {"id": 3, "display_name": "..."}, ... ],
--     "sport_indexes": {"nhl": 0, "mlb": 1, ...},
--     "tier_rule": "<the one-sentence published tier rule>"
--   }
-- "participants" is THE frozen DrawInput.participants order: tds_participants
-- of the season ordered by id ascending. Reproduction depends on this exact
-- order; the draw's participant ids are these ids stringified.
-- "sport_indexes" freezes each sport_key's serpentine sport_index.
ALTER TABLE public.tds_seasons
  ADD COLUMN IF NOT EXISTS locked_inputs jsonb;

-- Publicity note: tiers and locked_inputs ride the existing always-public
-- SELECT policies on tds_sports/tds_seasons on purpose. The methodology and
-- tier table are published anyway (that is the point of provenance), and
-- pre-reveal tier visibility leaks nothing about WHO gets WHAT — assignments
-- stay hidden behind the per-sport reveal gate.

-- ---------------------------------------------------------------------------
-- Draw console writes assignments as the signed-in commissioner
-- ---------------------------------------------------------------------------
-- The web app must never need the service-role key: the draw server action
-- runs with the commissioner's own JWT, so assignments get a commissioner
-- INSERT policy (house league_memberships pattern, deliberately not
-- league-scoped — single league).
--
-- Deliberately NO update/delete policies: a drawn sport is final. Emergencies
-- go through the flagged manual-override path (AUS-850), not by rewriting
-- assignment rows from the app.

DROP POLICY IF EXISTS tds_assignments_insert_for_commissioners ON public.tds_assignments;
CREATE POLICY tds_assignments_insert_for_commissioners
ON public.tds_assignments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.league_memberships lm
    WHERE lm.user_id = auth.uid()
      AND lm.role = 'commissioner'
  )
);

-- Commissioners also read assignments BEFORE reveal: the console must
-- re-display a drawn-but-unrevealed sport's saved result (re-click re-fetches,
-- never re-rolls), and PostgREST insert-returning needs SELECT on the new
-- rows. Policies OR together with the public reveal-gated select.
DROP POLICY IF EXISTS tds_assignments_select_for_commissioners ON public.tds_assignments;
CREATE POLICY tds_assignments_select_for_commissioners
ON public.tds_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.league_memberships lm
    WHERE lm.user_id = auth.uid()
      AND lm.role = 'commissioner'
  )
);

-- Season Lock builds tiers FROM standings as the signed-in commissioner, and
-- the public standings policy is reveal-gated — so commissioners get their
-- own SELECT policy. Without it the lock's standings reads silently return
-- zero rows and every sport locks untiered.
DROP POLICY IF EXISTS tds_standings_select_for_commissioners ON public.tds_standings;
CREATE POLICY tds_standings_select_for_commissioners
ON public.tds_standings
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.league_memberships lm
    WHERE lm.user_id = auth.uid()
      AND lm.role = 'commissioner'
  )
);

-- Grants (RLS above is the real gate, matching the base migration's style;
-- SELECT on tds_standings is already granted to authenticated).
GRANT INSERT ON public.tds_assignments TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.tds_assignments_id_seq TO authenticated;
