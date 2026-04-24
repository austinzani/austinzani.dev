-- Fix recursive RLS evaluation on league_memberships.
--
-- The previous commissioner scope policy queried league_memberships from inside
-- league_memberships RLS, which can recurse infinitely.
-- For current app needs, users only need to read their own membership row.

DROP POLICY IF EXISTS league_memberships_select_scoped ON public.league_memberships;

CREATE POLICY league_memberships_select_scoped
ON public.league_memberships
FOR SELECT
USING (public.league_memberships.user_id = auth.uid());
