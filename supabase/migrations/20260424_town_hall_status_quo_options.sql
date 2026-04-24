-- Adds option-level semantics for interpreting proposal outcomes.
-- `is_status_quo = true` marks the answer option that means "no rule change".

ALTER TABLE public.town_hall_answer_options
  ADD COLUMN IF NOT EXISTS is_status_quo boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_town_hall_answer_options_question_status_quo
  ON public.town_hall_answer_options (question_id, is_status_quo);

-- Enforce at most one status-quo option per question.
CREATE UNIQUE INDEX IF NOT EXISTS uq_town_hall_answer_options_status_quo_per_question
  ON public.town_hall_answer_options (question_id)
  WHERE is_status_quo = true;

-- Reasonable default for existing Yes/No ballots:
-- if no status-quo option is configured yet, treat "No" as status quo.
WITH yes_no_questions AS (
  SELECT q.id AS question_id
  FROM public.town_hall_questions q
  JOIN public.town_hall_answer_options ao ON ao.question_id = q.id
  GROUP BY q.id
  HAVING COUNT(*) = 2
     AND BOOL_OR(lower(ao.label) = 'yes')
     AND BOOL_OR(lower(ao.label) = 'no')
),
questions_without_status_quo AS (
  SELECT ynq.question_id
  FROM yes_no_questions ynq
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.town_hall_answer_options ao
    WHERE ao.question_id = ynq.question_id
      AND ao.is_status_quo = true
  )
)
UPDATE public.town_hall_answer_options ao
SET is_status_quo = true
FROM questions_without_status_quo qws
WHERE ao.question_id = qws.question_id
  AND lower(ao.label) = 'no';
