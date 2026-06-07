-- Meal schema cleanup for accurate, safe plans:
--   1) allergens: free-text TEXT  ->  structured TEXT[] tags
--      (so they reliably match the client's selected allergens).
--   2) drop is_shoot_priority (a content/photography flag that was wrongly
--      biasing client meal selection).
--
-- Allergen tag vocabulary (must match the app's Allergen enum):
--   Dairy, Gluten, Nuts, Eggs, Soy, Shellfish, Fish, Sesame
--
-- NOTE: meal data will be wiped and re-added with explicit tags once the app
-- is ready; this migration best-effort-parses existing free text so nothing is
-- left unprotected in the meantime.

BEGIN;

-- 1) allergens TEXT -> TEXT[] -----------------------------------------------
ALTER TABLE meals ADD COLUMN IF NOT EXISTS allergens_tags TEXT[] DEFAULT '{}';

UPDATE meals SET allergens_tags = COALESCE((
  SELECT array_agg(t.tag)
  FROM (VALUES
    ('Dairy'), ('Gluten'), ('Nuts'), ('Eggs'),
    ('Soy'), ('Shellfish'), ('Fish'), ('Sesame')
  ) AS t(tag)
  WHERE meals.allergens IS NOT NULL
    AND meals.allergens ILIKE '%' || t.tag || '%'
), '{}');

ALTER TABLE meals DROP COLUMN IF EXISTS allergens;
ALTER TABLE meals RENAME COLUMN allergens_tags TO allergens;

-- 2) remove shoot priority --------------------------------------------------
ALTER TABLE meals DROP COLUMN IF EXISTS is_shoot_priority;

COMMIT;

-- Verification:
--   SELECT meal_name, allergens FROM meals ORDER BY meal_number LIMIT 10;
--   -- allergens should now be arrays like {Nuts,Dairy}
