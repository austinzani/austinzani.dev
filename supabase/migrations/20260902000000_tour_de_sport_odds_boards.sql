-- Tour de Sport (AUS-852): odds boards + the frozen tier basis.
-- Idempotent by construction: ADD COLUMN IF NOT EXISTS only.
--
-- Versioned 20260902000000 (full 14-digit version) so it sorts after
-- 20260901000000 — see the 20260829000000 header for the digits-vs-underscore
-- sort gotcha.

-- ---------------------------------------------------------------------------
-- Commissioner-pasted championship-futures board, per sport
-- ---------------------------------------------------------------------------
-- Saved from the draw console BEFORE Season Lock, edited or cleared freely
-- until lock, immutable afterwards (the app refuses post-lock writes; the
-- lock freezes tier_basis alongside tiers). Shape:
--   {
--     "source": "DraftKings",             -- where the board was read
--     "retrieved_on": "2026-08-20",      -- when it was read (date string)
--     "lines": ["Arsenal -110", ...]     -- the raw pasted lines, prices and
--   }                                     --   all, kept verbatim for provenance
-- Entity names are parsed OUT of "lines" at lock time; the raw lines are the
-- published record. A board only ever REORDERS a sport's existing entity
-- pool — it never creates entities.
ALTER TABLE public.tds_sports
  ADD COLUMN IF NOT EXISTS odds_board jsonb;

-- Which ranking the frozen tiers came from: 'odds' (a saved, fully-matched
-- board ordered the pool, unlisted entities tailing in standings order) or
-- 'standings' (the frozen standings order, as before). Written ONLY at
-- Season Lock, alongside tiers — never before, never changed after.
ALTER TABLE public.tds_sports
  ADD COLUMN IF NOT EXISTS tier_basis text;

-- Publicity + policy note: both columns deliberately ride the EXISTING
-- tds_sports policies — tds_sports_update_for_commissioners covers the
-- console's board writes and the lock's tier_basis write, and the always-on
-- public SELECT covers reads. The board's provenance (source, date, raw
-- lines) is published on purpose: the landing page's Draw Record shows the
-- exact board a sport's tiers were ranked by, so anyone can verify the
-- published basis. No new policies or grants are needed (UPDATE on
-- tds_sports is already granted to authenticated; RLS is the real gate).
