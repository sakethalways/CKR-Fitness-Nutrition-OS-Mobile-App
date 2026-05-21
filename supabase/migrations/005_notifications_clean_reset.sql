-- ============================================================================
-- CKR Nutrition OS — Phase B2 hotfix #4
--
-- Resets `is_admin()` to the simplest possible form (no pinned search_path —
-- that change in 004 caused INSERT WITH CHECK to fail) and rebuilds the
-- notifications policies from scratch.
--
-- The INSERT policy is intentionally permissive (WITH CHECK (true)) — the
-- app gates who can target whom. SELECT / UPDATE / DELETE remain locked to
-- the addressee, which is the RLS that actually matters for privacy.
--
-- Idempotent — safe to re-run.
-- ============================================================================

-- 1) Revert is_admin() to the working, simple form
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- 2) Drop EVERY policy currently on notifications (defensive — handles any
-- prior name we used so we always end in a clean state)
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'notifications'
  loop
    execute format(
      'drop policy if exists %I on public.notifications',
      pol.policyname
    );
  end loop;
end$$;

-- 3) Fresh policies
create policy "notifications_select"
  on public.notifications for select to authenticated
  using (
    (recipient_role = 'admin'   and public.is_admin())
    or (recipient_role = 'trainer' and recipient_id = auth.uid())
  );

create policy "notifications_insert"
  on public.notifications for insert to authenticated
  with check (true);

create policy "notifications_update"
  on public.notifications for update to authenticated
  using (
    (recipient_role = 'admin'   and public.is_admin())
    or (recipient_role = 'trainer' and recipient_id = auth.uid())
  )
  with check (
    (recipient_role = 'admin'   and public.is_admin())
    or (recipient_role = 'trainer' and recipient_id = auth.uid())
  );

create policy "notifications_delete"
  on public.notifications for delete to authenticated
  using (
    (recipient_role = 'admin'   and public.is_admin())
    or (recipient_role = 'trainer' and recipient_id = auth.uid())
  );
