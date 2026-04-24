-- Town hall lifecycle updates:
-- upcoming -> open -> finished
-- plus response locking after submission.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'town_hall_ballot_status'
      AND e.enumlabel = 'upcoming'
  ) THEN
    ALTER TYPE public.town_hall_ballot_status ADD VALUE 'upcoming';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'town_hall_ballot_status'
      AND e.enumlabel = 'finished'
  ) THEN
    ALTER TYPE public.town_hall_ballot_status ADD VALUE 'finished';
  END IF;
END
$$;

UPDATE public.town_hall_ballots
SET status = 'upcoming'
WHERE status::text = 'draft';

UPDATE public.town_hall_ballots
SET status = 'finished'
WHERE status::text = 'closed';

ALTER TABLE public.town_hall_ballots
  ALTER COLUMN status SET DEFAULT 'upcoming';

UPDATE public.town_hall_ballots
SET results_visible = true
WHERE status::text = 'finished'
  AND results_visible = false;

DROP POLICY IF EXISTS town_hall_responses_select_scoped ON public.town_hall_responses;
CREATE POLICY town_hall_responses_select_scoped
ON public.town_hall_responses
FOR SELECT
USING (
  public.town_hall_responses.user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.league_memberships lm
    WHERE lm.league_id = public.town_hall_responses.league_id
      AND lm.user_id = auth.uid()
      AND lm.role = 'commissioner'
  )
  OR EXISTS (
    SELECT 1
    FROM public.town_hall_ballots b
    JOIN public.league_memberships lm ON lm.league_id = b.league_id
    WHERE b.id = public.town_hall_responses.ballot_id
      AND lm.user_id = auth.uid()
      AND (
        b.status::text = 'finished'
        OR b.results_visible = true
      )
  )
);

DROP POLICY IF EXISTS town_hall_responses_update_for_members ON public.town_hall_responses;
REVOKE UPDATE ON public.town_hall_responses FROM authenticated;
