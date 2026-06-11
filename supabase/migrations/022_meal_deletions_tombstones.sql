-- 022_meal_deletions_tombstones.sql
-- ---------------------------------------------------------------------------
-- TWO-WAY SHEET SYNC support: record meal deletions so the Google Sheet sync
-- can tell "this meal was deleted in the app" apart from "this is a brand-new
-- row in the sheet". Without a tombstone, a row that exists in the sheet but
-- not in the DB is ambiguous (deleted in app? or newly typed in sheet?).
--
-- HOW IT'S USED:
--   • When a meal is deleted from the app, a row is written here.
--   • The sync job reads these tombstones, removes those meals from the sheet,
--     then clears the tombstone (so it's processed exactly once).
--
-- WHY IT'S SAFE FOR THE APP:
--   • New, isolated table + one AFTER DELETE trigger on meals. Nothing the app
--     reads or writes for plans/meals changes. Deleting meals is unaffected
--     (this runs alongside migration 020's cleanup trigger).
--   • Re-running this migration is harmless (idempotent).
-- ---------------------------------------------------------------------------

BEGIN;

CREATE TABLE IF NOT EXISTS public.meal_deletions (
  id          INTEGER PRIMARY KEY,          -- the deleted meal's id
  meal_code   TEXT,                         -- its M-code, for readable logs
  deleted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.meal_deletions ENABLE ROW LEVEL SECURITY;

-- Only the service role (used by the sync edge function) touches this table.
-- No anon/authenticated policies → app clients can't read or write it.
DROP POLICY IF EXISTS "service role manages meal_deletions" ON public.meal_deletions;

CREATE OR REPLACE FUNCTION public.record_meal_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.meal_deletions (id, meal_code, deleted_at)
  VALUES (OLD.id, OLD.meal_code, NOW())
  ON CONFLICT (id) DO UPDATE SET deleted_at = EXCLUDED.deleted_at,
                                 meal_code  = EXCLUDED.meal_code;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_meal_deletion ON public.meals;
CREATE TRIGGER trg_record_meal_deletion
  AFTER DELETE ON public.meals
  FOR EACH ROW
  EXECUTE FUNCTION public.record_meal_deletion();

COMMIT;
