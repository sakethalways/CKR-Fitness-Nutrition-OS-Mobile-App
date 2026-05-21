-- ============================================================================
-- CKR Nutrition OS  —  Phase B2 hotfix
--
-- Problem: trainers can't read public.admins under the original RLS policy,
-- so getAdminId() returns null on the client → notifications to admin are
-- never created.
--
-- Fix: open public.admins SELECT to any authenticated user. The table only
-- contains (id, name, created_at) — no secrets — so it's safe to expose.
-- Writes are still admin-only (no INSERT/UPDATE policies exist; admin row
-- is created via the bootstrap SQL only).
--
-- Idempotent: safe to re-run.
-- ============================================================================

drop policy if exists "admins_select_self_or_admin" on public.admins;
drop policy if exists "admins_select_all_authenticated" on public.admins;

create policy "admins_select_all_authenticated"
  on public.admins for select to authenticated
  using (true);
