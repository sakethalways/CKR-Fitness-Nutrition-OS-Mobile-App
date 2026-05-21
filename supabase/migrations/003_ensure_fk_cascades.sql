-- ============================================================================
-- CKR Nutrition OS  —  Phase B2 hotfix
--
-- Idempotent: re-creates the foreign-key constraints that cross-reference
-- trainers / admins so they have the correct ON DELETE behaviour.
--
-- Why: CREATE TABLE IF NOT EXISTS skips constraint changes on existing
-- tables, so any earlier version of 001 that lacked the `on delete set null`
-- clauses leaves stale constraints behind. Without these, deleting a
-- trainer that has rated any plan fails with a FK violation.
--
-- Safe to re-run.
-- ============================================================================

-- ---- clients --------------------------------------------------------------
alter table public.clients
  drop constraint if exists clients_trainer_id_fkey,
  drop constraint if exists clients_deletion_requested_by_fkey;

alter table public.clients
  add constraint clients_trainer_id_fkey
    foreign key (trainer_id)
    references public.trainers(id)
    on delete set null,
  add constraint clients_deletion_requested_by_fkey
    foreign key (deletion_requested_by)
    references public.trainers(id)
    on delete set null;

-- ---- plans ----------------------------------------------------------------
alter table public.plans
  drop constraint if exists plans_rated_by_fkey;

alter table public.plans
  add constraint plans_rated_by_fkey
    foreign key (rated_by)
    references public.trainers(id)
    on delete set null;

-- ---- meal_plan_templates --------------------------------------------------
alter table public.meal_plan_templates
  drop constraint if exists meal_plan_templates_saved_by_admin_id_fkey;

alter table public.meal_plan_templates
  add constraint meal_plan_templates_saved_by_admin_id_fkey
    foreign key (saved_by_admin_id)
    references public.admins(id)
    on delete set null;
