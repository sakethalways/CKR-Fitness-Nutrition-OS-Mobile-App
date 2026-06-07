-- Fix: editing a meal fails with 42703 "record \"new\" has no field \"updated_at\"".
--
-- Cause: migration 010 created the `meals` table WITHOUT an `updated_at` column.
-- Migration 012 ran `CREATE TABLE IF NOT EXISTS meals (... updated_at ...)` — a
-- no-op because the table already existed — but it STILL created the
-- `meals_update_timestamp` trigger that sets NEW.updated_at on every UPDATE.
-- With no such column, every meal UPDATE (e.g. saving a rating) 400s.
--
-- Fix: add the missing column so the existing trigger works.

BEGIN;

ALTER TABLE meals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill nulls and (re)ensure the trigger + function exist and are wired up.
UPDATE meals SET updated_at = COALESCE(updated_at, created_at, NOW());

CREATE OR REPLACE FUNCTION update_meals_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS meals_update_timestamp ON meals;
CREATE TRIGGER meals_update_timestamp
BEFORE UPDATE ON meals
FOR EACH ROW
EXECUTE FUNCTION update_meals_timestamp();

COMMIT;
