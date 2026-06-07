-- Fix meals table RLS so trainers (and any authenticated user) can READ meals.
-- Writes (insert/update/delete) stay admin-only.
--
-- Background: migration 012 created an admin-only SELECT policy named
-- "Admins can view all meals", which blocked trainers from loading the meal
-- catalogue (breaking swap/plan screens). This migration removes every known
-- read policy variant and installs a single permissive read policy.

BEGIN;

-- Make sure RLS is on (no-op if already enabled).
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;

-- Drop every read-policy name this table has carried across migrations.
DROP POLICY IF EXISTS "Admins can view all meals" ON meals;
DROP POLICY IF EXISTS "Only admins can read meals" ON meals;
DROP POLICY IF EXISTS "meals_read_all" ON meals;
DROP POLICY IF EXISTS "Anyone can read meals" ON meals;

-- Everyone authenticated can read meals.
CREATE POLICY "Anyone can read meals" ON meals
  FOR SELECT
  USING (TRUE);

COMMIT;

-- Verification (run manually after applying):
--   SELECT COUNT(*) FROM meals;                         -- expect 54
--   SELECT meal_type, COUNT(*) FROM meals GROUP BY 1;   -- Breakfast 24, Lunch/Dinner 24, Snack 6
