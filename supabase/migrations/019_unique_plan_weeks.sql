-- 019_unique_plan_weeks.sql
-- ---------------------------------------------------------------------------
-- FIX #1: stop duplicate plans.
-- Two plans should never share the same week number for the same client. That
-- is what produced "duplicate plan" rows when a button was double-tapped or two
-- admins acted at once. This adds a database guarantee so it can never happen.
--
-- WHY IT'S SAFE FOR THE APP:
--   • Step 1 first cleans up any existing duplicates by renumbering each
--     client's plans 1..n in their current order. Only rows whose number
--     actually changes are touched — no plans are deleted, nothing is lost.
--   • The app builds the next week as max(week_number)+1, so it keeps working.
--   • If a duplicate insert is ever attempted, Postgres returns code 23505,
--     which the app already turns into a friendly "This already exists."
--     message — it does NOT crash.
--   • Re-running this migration is harmless (idempotent).
-- ---------------------------------------------------------------------------

BEGIN;

-- 1) Normalise existing week numbers so (client_id, week_number) is unique.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY client_id
           ORDER BY week_number, created_at, id
         ) AS rn
  FROM public.plans
)
UPDATE public.plans p
SET week_number = r.rn
FROM ranked r
WHERE p.id = r.id
  AND p.week_number <> r.rn;

-- 2) Add the uniqueness guarantee (only if it isn't already there).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'plans_client_week_unique'
  ) THEN
    ALTER TABLE public.plans
      ADD CONSTRAINT plans_client_week_unique UNIQUE (client_id, week_number);
  END IF;
END $$;

COMMIT;
