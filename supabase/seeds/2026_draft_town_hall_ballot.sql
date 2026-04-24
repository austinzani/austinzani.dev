-- Seed: 2026 draft town hall ballot with sectioned Yes/No questions.
-- Requires migrations already applied, especially:
--  - 20260424_fantasy_town_hall_and_rule_submissions.sql
--  - 20260424_town_hall_lifecycle_statuses.sql
--  - 20260424_town_hall_question_sections.sql

DO $$
DECLARE
  v_league_id bigint;
  v_ballot_id bigint;
BEGIN
  SELECT id
  INTO v_league_id
  FROM public.leagues
  WHERE slug = 'zaks-league-to-lose'
  LIMIT 1;

  IF v_league_id IS NULL THEN
    RAISE EXCEPTION 'League with slug % was not found. Run base migration first.', 'zaks-league-to-lose';
  END IF;

  SELECT id
  INTO v_ballot_id
  FROM public.town_hall_ballots
  WHERE league_id = v_league_id
    AND title = '2026 Draft Town Hall'
  ORDER BY id DESC
  LIMIT 1;

  IF v_ballot_id IS NULL THEN
    INSERT INTO public.town_hall_ballots (
      league_id,
      title,
      status,
      results_visible,
      opens_at,
      closes_at,
      published_at
    )
    VALUES (
      v_league_id,
      '2026 Draft Town Hall',
      'upcoming',
      false,
      NULL,
      NULL,
      NULL
    )
    RETURNING id INTO v_ballot_id;
  ELSE
    UPDATE public.town_hall_ballots
    SET status = 'upcoming',
        results_visible = false,
        opens_at = NULL,
        closes_at = NULL,
        published_at = NULL
    WHERE id = v_ballot_id;
  END IF;

  INSERT INTO public.town_hall_questions (ballot_id, prompt, section, display_order, is_required)
  SELECT v_ballot_id, seed.prompt, seed.section, seed.display_order, true
  FROM (
    VALUES
      (
        1,
        'Scoring & Roster',
        'Median scoring (Tony): Add a weekly "phantom" matchup against the league median (teams above median get a W, below get an L).'
      ),
      (
        2,
        'Scoring & Roster',
        'Remove kickers (MC).'
      ),
      (
        3,
        'Scoring & Roster',
        'Remove defenses (MC).'
      ),
      (
        4,
        'Scoring & Roster',
        'Max 3 defenses rostered per team (MC) - only vote if remove defenses fails.'
      ),
      (
        5,
        'Scoring & Roster',
        'Add punters (Alex): +1 pt / 10 yds, -1 pt / 10 return yds, +1 pt inside the 20, +3 pts inside the 10.'
      ),
      (
        6,
        'Scoring & Roster',
        'Auto-sub on Sleeper (DC): Enable Sleeper''s auto-sub feature so inactive starters get swapped automatically.'
      ),
      (
        7,
        'Schedule & Playoffs',
        'Shorten regular season by 1 week (Alex): Playoffs move up one week; championship is Weeks 15-16 instead of 16-17. Rivalry Week stays Week 13, with no double-up to close the season.'
      ),
      (
        8,
        'League Admin',
        'Eliminate transaction fees (MC).'
      ),
      (
        9,
        'League Admin',
        'Commissioner''s annual rule change (Alex / "Mickey rule"): Mickey gets 1 automatic rule change each season that does not need league approval, but must be announced 30+ days before draft day.'
      ),
      (
        10,
        'Traditions & Punishments',
        'Breakfast of Champions (Alex): Draft morning, anyone with a championship prepares their plate first and sits at the main table. Everyone without a ring eats at a folding table with folding chairs.'
      ),
      (
        11,
        'Traditions & Punishments',
        'Last-place hot dog punishment (Alex): Regular season loser eats hot dogs for every meal (documented for the group) until they have eaten as many as Joey Chestnut ate in the current year''s Nathan''s 4th of July Contest.'
      ),
      (
        12,
        'Traditions & Punishments',
        'Destination draft (Alex): Move the draft outside the tri-state area at least some years (Vegas, preseason NFL game, cruise, etc.). Not everyone is required to attend (same as current Hocking Hills attendance). If yes, destination is chosen separately.'
      )
  ) AS seed(display_order, section, prompt)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.town_hall_questions q
    WHERE q.ballot_id = v_ballot_id
      AND q.prompt = seed.prompt
  );

  INSERT INTO public.town_hall_answer_options (question_id, label, display_order, is_status_quo)
  SELECT q.id, answer.label, answer.display_order, answer.is_status_quo
  FROM public.town_hall_questions q
  JOIN (
    VALUES
      ('Yes', 1, false),
      ('No', 2, true)
  ) AS answer(label, display_order, is_status_quo)
    ON true
  WHERE q.ballot_id = v_ballot_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.town_hall_answer_options a
      WHERE a.question_id = q.id
        AND a.label = answer.label
    );
END
$$;
