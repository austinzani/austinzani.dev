-- LOCAL-ONLY fixture: 14 fake active managers so the Tour de Sport season 1
-- participant seed has rows to link against on a fresh local stack (the
-- remote snapshot migration is schema-only — no manager data locally).
--
-- Not auto-applied (config.toml db.seed points at ./seed.sql). Apply manually:
--   docker exec -i supabase_db_austinzani.dev psql -U postgres -d postgres \
--     < supabase/seeds/local_dev_active_managers.sql
-- then re-run the tour_de_sport migration (idempotent) to link participants.
-- NEVER run against production.

INSERT INTO public.manager (name, is_active)
SELECT 'Local Manager ' || lpad(i::text, 2, '0'), true
FROM generate_series(1, 14) AS i
WHERE NOT EXISTS (
  SELECT 1
  FROM public.manager m
  WHERE m.name = 'Local Manager ' || lpad(i::text, 2, '0')
);
