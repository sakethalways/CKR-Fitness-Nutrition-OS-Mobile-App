-- 021_add_reel_url_and_meal_code.sql
-- ---------------------------------------------------------------------------
-- FEATURE: per-dish Instagram reel link + human meal code (M1…Mn).
--
-- Each meal row is one calorie bracket; a "dish" is a meal_number (e.g. all 4
-- brackets of "Overnight Oats" share meal_number = 1). The recipe REEL and the
-- display CODE belong to the DISH, so they are the same across a dish's
-- brackets. We store them on every row (denormalised) so the app never needs a
-- lookup, and keep them in step per meal_number.
--
-- WHY IT'S SAFE FOR THE APP:
--   • Purely additive: two new nullable text columns. No existing column,
--     id, or row is touched, so existing plans keep working unchanged.
--   • reel_url stays blank for now — the app shows the link button ONLY when a
--     link exists, so blank = no button (no broken UI).
--   • meal_code is backfilled to 'M' || meal_number for the current catalogue.
--   • Re-running this migration is harmless (idempotent).
-- ---------------------------------------------------------------------------

BEGIN;

-- Instagram reel link for the dish's recipe video (nullable; blank = no link).
ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS reel_url TEXT;

-- Human-friendly per-dish code shown in the UI / PDF / WhatsApp (e.g. "M1").
ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS meal_code TEXT;

-- Backfill the code for the existing catalogue: one code per dish (meal_number).
UPDATE public.meals
SET meal_code = 'M' || meal_number
WHERE meal_code IS NULL;

COMMIT;
