-- 020_protect_meals_in_active_plans.sql
-- ---------------------------------------------------------------------------
-- FIX #3: deleting a meal must never leave a "dead" reference in a plan.
-- Plans store their meals as a list of meal ids. There's no link forcing those
-- ids to still exist, so deleting a meal used to leave an orphan id behind and
-- the plan silently showed fewer meals.
--
-- APPROACH: you can ALWAYS delete any meal (active plan or not). When you do,
-- the database automatically strips that meal's id out of every plan that had
-- it — so nothing is ever blocked, and no plan is left pointing at a meal that
-- no longer exists.
--
-- WHY IT'S SAFE FOR THE APP:
--   • Deleting a meal is never blocked — you stay in full control.
--   • Affected plans just lose that one meal from their list; they don't break.
--     (The trainer can swap in a replacement or regenerate the plan.)
--   • No orphan ids remain, so the app never shows a confusing half-empty plan.
--   • Only DELETE on meals is affected. Viewing / adding / editing are untouched.
--   • Re-running this migration is harmless (idempotent).
-- ---------------------------------------------------------------------------

BEGIN;

-- Remove any older blocking trigger/function from a previous version of this
-- migration, so re-applying cleanly switches to the auto-clean behaviour.
DROP TRIGGER IF EXISTS trg_prevent_delete_meal_in_active_plan ON public.meals;
DROP FUNCTION IF EXISTS public.prevent_delete_meal_in_active_plan();

CREATE OR REPLACE FUNCTION public.cleanup_meal_refs_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Strip the deleted meal's id from every plan that referenced it.
  UPDATE public.plans
  SET selected_meal_ids = array_remove(selected_meal_ids, OLD.id::text)
  WHERE OLD.id::text = ANY (selected_meal_ids);
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_meal_refs_on_delete ON public.meals;
CREATE TRIGGER trg_cleanup_meal_refs_on_delete
  BEFORE DELETE ON public.meals
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_meal_refs_on_delete();

COMMIT;
