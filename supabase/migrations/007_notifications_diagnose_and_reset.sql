-- ============================================================================
-- CKR Nutrition OS  —  Phase B2 hotfix #6 (diagnose + reset)
--
-- Goal: figure out *for sure* why notifications INSERT keeps returning 403.
--
-- Step 1: log every existing policy + trigger on public.notifications.
--         Look at the "Messages" tab of the SQL Editor after running this
--         file — it will print everything as NOTICEs.
--
-- Step 2: drop every policy on the table.
--
-- Step 3: create ONE ultra-permissive policy for ALL operations to PUBLIC
--         (no role restriction, no qual, no with_check). If INSERT still
--         fails after this, the problem is not RLS — it's a trigger,
--         constraint, or webhook.
--
-- Step 4: force PostgREST to reload its schema cache.
--
-- This is temporary — once we confirm the path works, we tighten back up.
-- ============================================================================

-- ---- STEP 1: log existing state ----
do $$
declare
  pol record;
  trg record;
  cnt int;
begin
  raise notice '=== notifications policies BEFORE ===';
  cnt := 0;
  for pol in
    select policyname, cmd, permissive::text, roles::text,
           qual::text, with_check::text
    from pg_policies
    where schemaname = 'public' and tablename = 'notifications'
    order by cmd, policyname
  loop
    cnt := cnt + 1;
    raise notice
      '  [%] cmd=% perm=% roles=% qual=% with_check=%',
      pol.policyname, pol.cmd, pol.permissive,
      pol.roles, pol.qual, pol.with_check;
  end loop;
  raise notice '  (% policies total)', cnt;

  raise notice '=== notifications triggers BEFORE ===';
  cnt := 0;
  for trg in
    select tgname, pg_get_triggerdef(t.oid) as def
    from pg_trigger t
    join pg_class c on t.tgrelid = c.oid
    where c.relname = 'notifications'
      and not tgisinternal
  loop
    cnt := cnt + 1;
    raise notice '  trigger % :: %', trg.tgname, trg.def;
  end loop;
  raise notice '  (% triggers total)', cnt;

  raise notice '=== is_admin function definition ===';
  for trg in
    select pg_get_functiondef(p.oid) as def
    from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public' and p.proname = 'is_admin'
  loop
    raise notice '%', trg.def;
  end loop;

  raise notice '=== rls state on notifications ===';
  raise notice 'relrowsecurity=%, relforcerowsecurity=%',
    (select relrowsecurity from pg_class where relname = 'notifications'),
    (select relforcerowsecurity from pg_class where relname = 'notifications');
end$$;

-- ---- STEP 2: drop ALL policies on notifications ----
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'notifications'
  loop
    execute format('drop policy if exists %I on public.notifications', pol.policyname);
  end loop;
end$$;

-- ---- STEP 3: fully reset RLS state and install one open policy ----
alter table public.notifications disable row level security;
alter table public.notifications enable row level security;

-- Single permissive policy covering all operations for any caller.
-- THIS IS WIDE OPEN — only for the diagnostic round. We tighten up next.
create policy "notifications_open_diagnostic"
  on public.notifications
  for all
  to public
  using (true)
  with check (true);

-- ---- STEP 4: tell PostgREST to forget any cached schema ----
notify pgrst, 'reload schema';

-- ---- AFTER STATE: confirm we ended up where we wanted ----
do $$
declare
  pol record;
  cnt int := 0;
begin
  raise notice '=== notifications policies AFTER ===';
  for pol in
    select policyname, cmd, permissive::text, roles::text,
           qual::text, with_check::text
    from pg_policies
    where schemaname = 'public' and tablename = 'notifications'
    order by cmd, policyname
  loop
    cnt := cnt + 1;
    raise notice
      '  [%] cmd=% perm=% roles=% qual=% with_check=%',
      pol.policyname, pol.cmd, pol.permissive,
      pol.roles, pol.qual, pol.with_check;
  end loop;
  raise notice '  expected: 1 policy named notifications_open_diagnostic with cmd=ALL';
  raise notice '  actual: % policies', cnt;
end$$;
