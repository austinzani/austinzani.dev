-- Fantasy Football town hall and rule submission support.
-- This migration is intentionally idempotent so it can be rerun safely.

DO $$
BEGIN
  CREATE TYPE public.league_role AS ENUM ('commissioner', 'manager');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.town_hall_ballot_status AS ENUM ('draft', 'open', 'closed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS public.leagues (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.league_memberships (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  league_id bigint NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  manager_id integer NOT NULL REFERENCES public.manager(id) ON DELETE RESTRICT,
  role public.league_role NOT NULL DEFAULT 'manager',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (league_id, user_id),
  UNIQUE (league_id, manager_id)
);

CREATE TABLE IF NOT EXISTS public.town_hall_ballots (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  league_id bigint NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  title text NOT NULL,
  status public.town_hall_ballot_status NOT NULL DEFAULT 'draft',
  opens_at timestamptz,
  closes_at timestamptz,
  results_visible boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.town_hall_questions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ballot_id bigint NOT NULL REFERENCES public.town_hall_ballots(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.town_hall_answer_options (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  question_id bigint NOT NULL REFERENCES public.town_hall_questions(id) ON DELETE CASCADE,
  label text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.town_hall_responses (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  league_id bigint NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  ballot_id bigint NOT NULL REFERENCES public.town_hall_ballots(id) ON DELETE CASCADE,
  question_id bigint NOT NULL REFERENCES public.town_hall_questions(id) ON DELETE CASCADE,
  option_id bigint NOT NULL REFERENCES public.town_hall_answer_options(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  manager_id integer NOT NULL REFERENCES public.manager(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.rule_submissions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  league_id bigint NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  manager_id integer NOT NULL REFERENCES public.manager(id) ON DELETE RESTRICT,
  content text NOT NULL CHECK (char_length(trim(content)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_league_memberships_user_league
  ON public.league_memberships (user_id, league_id);

CREATE INDEX IF NOT EXISTS idx_town_hall_ballots_league_status_created_at
  ON public.town_hall_ballots (league_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_town_hall_questions_ballot_order
  ON public.town_hall_questions (ballot_id, display_order, id);

CREATE INDEX IF NOT EXISTS idx_town_hall_answer_options_question_order
  ON public.town_hall_answer_options (question_id, display_order, id);

CREATE INDEX IF NOT EXISTS idx_town_hall_responses_ballot
  ON public.town_hall_responses (ballot_id);

CREATE INDEX IF NOT EXISTS idx_town_hall_responses_question_option
  ON public.town_hall_responses (question_id, option_id);

CREATE INDEX IF NOT EXISTS idx_rule_submissions_league_created_at
  ON public.rule_submissions (league_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_row_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_town_hall_response_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  question_ballot_id bigint;
  question_league_id bigint;
  option_question_id bigint;
BEGIN
  SELECT q.ballot_id, b.league_id
  INTO question_ballot_id, question_league_id
  FROM public.town_hall_questions q
  JOIN public.town_hall_ballots b ON b.id = q.ballot_id
  WHERE q.id = NEW.question_id;

  IF question_ballot_id IS NULL THEN
    RAISE EXCEPTION 'Question % does not exist', NEW.question_id;
  END IF;

  IF NEW.ballot_id <> question_ballot_id THEN
    RAISE EXCEPTION 'Response ballot does not match question ballot';
  END IF;

  IF NEW.league_id <> question_league_id THEN
    RAISE EXCEPTION 'Response league does not match question league';
  END IF;

  SELECT ao.question_id
  INTO option_question_id
  FROM public.town_hall_answer_options ao
  WHERE ao.id = NEW.option_id;

  IF option_question_id IS NULL THEN
    RAISE EXCEPTION 'Option % does not exist', NEW.option_id;
  END IF;

  IF NEW.question_id <> option_question_id THEN
    RAISE EXCEPTION 'Selected option does not belong to the question';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_town_hall_responses_set_updated_at ON public.town_hall_responses;
CREATE TRIGGER trg_town_hall_responses_set_updated_at
BEFORE UPDATE ON public.town_hall_responses
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS trg_rule_submissions_set_updated_at ON public.rule_submissions;
CREATE TRIGGER trg_rule_submissions_set_updated_at
BEFORE UPDATE ON public.rule_submissions
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS trg_town_hall_responses_validate ON public.town_hall_responses;
CREATE TRIGGER trg_town_hall_responses_validate
BEFORE INSERT OR UPDATE ON public.town_hall_responses
FOR EACH ROW
EXECUTE FUNCTION public.validate_town_hall_response_integrity();

ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.town_hall_ballots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.town_hall_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.town_hall_answer_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.town_hall_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS leagues_select_for_members ON public.leagues;
CREATE POLICY leagues_select_for_members
ON public.leagues
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.league_memberships lm
    WHERE lm.league_id = public.leagues.id
      AND lm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS league_memberships_select_scoped ON public.league_memberships;
CREATE POLICY league_memberships_select_scoped
ON public.league_memberships
FOR SELECT
USING (
  public.league_memberships.user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.league_memberships lm
    WHERE lm.league_id = public.league_memberships.league_id
      AND lm.user_id = auth.uid()
      AND lm.role = 'commissioner'
  )
);

DROP POLICY IF EXISTS town_hall_ballots_select_for_members ON public.town_hall_ballots;
CREATE POLICY town_hall_ballots_select_for_members
ON public.town_hall_ballots
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.league_memberships lm
    WHERE lm.league_id = public.town_hall_ballots.league_id
      AND lm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS town_hall_ballots_manage_for_commissioners ON public.town_hall_ballots;
CREATE POLICY town_hall_ballots_manage_for_commissioners
ON public.town_hall_ballots
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.league_memberships lm
    WHERE lm.league_id = public.town_hall_ballots.league_id
      AND lm.user_id = auth.uid()
      AND lm.role = 'commissioner'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.league_memberships lm
    WHERE lm.league_id = public.town_hall_ballots.league_id
      AND lm.user_id = auth.uid()
      AND lm.role = 'commissioner'
  )
);

DROP POLICY IF EXISTS town_hall_questions_select_for_members ON public.town_hall_questions;
CREATE POLICY town_hall_questions_select_for_members
ON public.town_hall_questions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.town_hall_ballots b
    JOIN public.league_memberships lm
      ON lm.league_id = b.league_id
    WHERE b.id = public.town_hall_questions.ballot_id
      AND lm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS town_hall_answer_options_select_for_members ON public.town_hall_answer_options;
CREATE POLICY town_hall_answer_options_select_for_members
ON public.town_hall_answer_options
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.town_hall_questions q
    JOIN public.town_hall_ballots b ON b.id = q.ballot_id
    JOIN public.league_memberships lm ON lm.league_id = b.league_id
    WHERE q.id = public.town_hall_answer_options.question_id
      AND lm.user_id = auth.uid()
  )
);

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
      AND b.results_visible = true
      AND lm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS town_hall_responses_insert_for_members ON public.town_hall_responses;
CREATE POLICY town_hall_responses_insert_for_members
ON public.town_hall_responses
FOR INSERT
WITH CHECK (
  public.town_hall_responses.user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.league_memberships lm
    JOIN public.town_hall_ballots b ON b.league_id = lm.league_id
    WHERE lm.user_id = auth.uid()
      AND lm.league_id = public.town_hall_responses.league_id
      AND lm.manager_id = public.town_hall_responses.manager_id
      AND b.id = public.town_hall_responses.ballot_id
      AND b.status = 'open'
  )
);

DROP POLICY IF EXISTS town_hall_responses_update_for_members ON public.town_hall_responses;
CREATE POLICY town_hall_responses_update_for_members
ON public.town_hall_responses
FOR UPDATE
USING (
  public.town_hall_responses.user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.town_hall_ballots b
    WHERE b.id = public.town_hall_responses.ballot_id
      AND b.status = 'open'
  )
)
WITH CHECK (
  public.town_hall_responses.user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.town_hall_ballots b
    WHERE b.id = public.town_hall_responses.ballot_id
      AND b.status = 'open'
  )
);

DROP POLICY IF EXISTS rule_submissions_select_scoped ON public.rule_submissions;
CREATE POLICY rule_submissions_select_scoped
ON public.rule_submissions
FOR SELECT
USING (
  public.rule_submissions.user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.league_memberships lm
    WHERE lm.league_id = public.rule_submissions.league_id
      AND lm.user_id = auth.uid()
      AND lm.role = 'commissioner'
  )
);

DROP POLICY IF EXISTS rule_submissions_insert_for_members ON public.rule_submissions;
CREATE POLICY rule_submissions_insert_for_members
ON public.rule_submissions
FOR INSERT
WITH CHECK (
  public.rule_submissions.user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.league_memberships lm
    WHERE lm.league_id = public.rule_submissions.league_id
      AND lm.user_id = auth.uid()
      AND lm.manager_id = public.rule_submissions.manager_id
  )
);

DROP POLICY IF EXISTS rule_submissions_update_scoped ON public.rule_submissions;
CREATE POLICY rule_submissions_update_scoped
ON public.rule_submissions
FOR UPDATE
USING (
  public.rule_submissions.user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.league_memberships lm
    WHERE lm.league_id = public.rule_submissions.league_id
      AND lm.user_id = auth.uid()
      AND lm.role = 'commissioner'
  )
)
WITH CHECK (
  public.rule_submissions.user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.league_memberships lm
    WHERE lm.league_id = public.rule_submissions.league_id
      AND lm.user_id = auth.uid()
      AND lm.role = 'commissioner'
  )
);

DROP POLICY IF EXISTS rule_submissions_delete_scoped ON public.rule_submissions;
CREATE POLICY rule_submissions_delete_scoped
ON public.rule_submissions
FOR DELETE
USING (
  public.rule_submissions.user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.league_memberships lm
    WHERE lm.league_id = public.rule_submissions.league_id
      AND lm.user_id = auth.uid()
      AND lm.role = 'commissioner'
  )
);

GRANT SELECT ON public.leagues TO authenticated;
GRANT SELECT ON public.league_memberships TO authenticated;
GRANT SELECT ON public.town_hall_ballots TO authenticated;
GRANT SELECT ON public.town_hall_questions TO authenticated;
GRANT SELECT ON public.town_hall_answer_options TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.town_hall_responses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rule_submissions TO authenticated;

GRANT USAGE, SELECT ON SEQUENCE public.leagues_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.league_memberships_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.town_hall_ballots_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.town_hall_questions_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.town_hall_answer_options_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.town_hall_responses_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.rule_submissions_id_seq TO authenticated;

INSERT INTO public.leagues (slug, name)
VALUES ('zaks-league-to-lose', 'Zak''s League to Lose')
ON CONFLICT (slug) DO NOTHING;
