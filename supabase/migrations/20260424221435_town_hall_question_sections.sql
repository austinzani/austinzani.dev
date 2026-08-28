-- Adds flexible text sections for town hall questions and a default ballot title.

ALTER TABLE public.town_hall_questions
  ADD COLUMN IF NOT EXISTS section text;

UPDATE public.town_hall_questions
SET section = 'General'
WHERE section IS NULL OR btrim(section) = '';

ALTER TABLE public.town_hall_questions
  ALTER COLUMN section SET DEFAULT 'General';

ALTER TABLE public.town_hall_questions
  ALTER COLUMN section SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_town_hall_questions_ballot_section_order
  ON public.town_hall_questions (ballot_id, section, display_order, id);

UPDATE public.town_hall_ballots
SET title = 'Town Hall Vote'
WHERE title IS NULL OR btrim(title) = '';

ALTER TABLE public.town_hall_ballots
  ALTER COLUMN title SET DEFAULT 'Town Hall Vote';
