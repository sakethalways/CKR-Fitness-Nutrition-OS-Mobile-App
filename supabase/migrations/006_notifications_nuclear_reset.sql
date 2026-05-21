-- ============================================================================
-- CKR Nutrition OS  —  Phase B2 hotfix #5 (nuclear reset of notifications RLS)
--
-- v2: uses CREATE OR REPLACE FUNCTION instead of DROP, so the 14 dependent
-- policies on other tables stay intact.
--
-- Idempotent — safe to re-run.
-- ============================================================================

-- 1. CREATE OR REPLACE puts is_admin back to the simplest known-good form.
--    Explicitly resets any leftover SET search_path / SECURITY clauses by
--    omitting them here — CREATE OR REPLACE FUNCTION drops any prior SET
--    clauses that aren't restated.
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

-- Forcibly reset SET clauses too (belt + suspenders — if any earlier ALTER
-- FUNCTION pinned search_path, this clears it).
alter function public.is_admin() reset search_path;
alter function public.is_admin() security invoker;

-- 2. Drop EVERY existing policy on notifications, no matter what name.
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

-- 3. Reset RLS state explicitly.
alter table public.notifications disable row level security;
alter table public.notifications enable  row level security;

-- 4. Install the four canonical policies.

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

-- 5. Diagnostic RPC — call from the app to verify the JWT round-trip.
--    Usage from client:
--      const { data } = await supabase.rpc('whoami');
--      // → { uid, jwt_role, is_admin }
create or replace function public.whoami()
returns table(uid uuid, jwt_role text, is_admin boolean)
language sql
stable
as $$
  select
    auth.uid(),
    (auth.jwt() -> 'app_metadata' ->> 'role')::text,
    public.is_admin();
$$;

-- ============================================================================
-- VERIFY (run separately after this migration)
--
-- (a) Policy list — should show exactly 4 rows on notifications:
--
--   select policyname, cmd, qual::text, with_check::text
--   from pg_policies
--   where schemaname = 'public' and tablename = 'notifications'
--   order by cmd, policyname;
--
--   Expected:
--     notifications_delete  | DELETE | <addressee>          | (null)
--     notifications_insert  | INSERT | (null)               | true
--     notifications_select  | SELECT | <addressee>          | (null)
--     notifications_update  | UPDATE | <addressee>          | <addressee>
--
-- (b) Function settings — proconfig column should be NULL (no pinned SET):
--
--   select proname, proconfig, pg_get_functiondef(oid)
--   from pg_proc
--   where proname = 'is_admin'
--     and pronamespace = (select oid from pg_namespace where nspname = 'public');
--
-- (c) From the app (after signing in as admin):
--   const { data } = await supabase.rpc('whoami');
--   // should return: [{ uid: <admin id>, jwt_role: 'admin', is_admin: true }]
-- ============================================================================
