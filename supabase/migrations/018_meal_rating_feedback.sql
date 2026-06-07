-- Close the rating feedback loop: when a trainer rates a plan's meals, roll
-- those scores into each meal's `rating` so the generator prioritises
-- well-rated meals (and drops poorly-rated ones).
--
-- meals are admin-write-only via RLS, but TRAINERS submit ratings — so we use
-- a SECURITY DEFINER function that ONLY touches the `rating` column. Input is
-- { "<mealId>": <score 0-10>, ... } (the same shape plans.ratings stores).
--
-- Blend rule: first rating sets the value; subsequent ratings are a 50/50
-- running average (reacts to recent feedback without wild swings). Clamped 0-10.

BEGIN;

CREATE OR REPLACE FUNCTION public.apply_meal_ratings(meal_ratings jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k text;
  v numeric;
BEGIN
  FOR k, v IN SELECT key, value::numeric FROM jsonb_each_text(meal_ratings) LOOP
    IF v IS NULL OR k !~ '^[0-9]+$' THEN
      CONTINUE; -- skip malformed keys/values
    END IF;
    UPDATE meals
    SET rating = LEAST(10, GREATEST(0,
      CASE WHEN rating = 0 THEN round(v)::int
           ELSE round((rating + v) / 2.0)::int
      END))
    WHERE id = k::int;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_meal_ratings(jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.apply_meal_ratings(jsonb) TO authenticated;

COMMIT;
