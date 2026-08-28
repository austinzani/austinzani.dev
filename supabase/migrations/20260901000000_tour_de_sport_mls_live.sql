-- Tour de Sport: MLS scores its LIVE season, frozen at the cutoff.
--
-- The original 20260828 seed migration shipped mls as 'final_prior' (a
-- misreading in AUS-847: the 2027 MLS season, Feb-Dec, is mid-flight on the
-- 2027-08-07 cutoff — the same posture as MLB/NASCAR/PGA/F1, so it must be
-- 'live'). The seed migration itself has been corrected in place — safe
-- because production has never applied any tds_ migration — so fresh
-- databases seed correctly; this follow-up converges databases that already
-- ran the old seed. Idempotent: the WHERE clause makes re-runs no-ops.
--
-- Versioned 20260901000000 (full 14-digit version) so it sorts after
-- 20260831000000 — see the 20260829000000 header for the digits-vs-underscore
-- sort gotcha.

UPDATE public.tds_sports
SET metric_mode = 'live'
WHERE sport_key = 'mls'
  AND metric_mode <> 'live';
