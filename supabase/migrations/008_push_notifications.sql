-- ============================================================================
-- CKR Nutrition OS  —  Phase B3: real OS-level push notifications
--
-- What this migration sets up:
--   1. public.device_push_tokens  — one row per device per user, with the
--                                    Expo Push Token the OS gave us.
--   2. RLS so each user can only see/manage their own device rows.
--   3. A trigger on public.notifications INSERT that calls the
--      send_push Edge Function via pg_net. That Edge Function looks up
--      tokens for the recipient and POSTs to Expo's push API.
--
-- Idempotent — safe to re-run.
--
-- AFTER running this migration:
--   (a) Deploy the send_push Edge Function (supabase/functions/send_push).
--   (b) Run the two ALTER DATABASE statements at the bottom of this file
--       with your real project URL and service role key. Without those,
--       the trigger is a no-op (it logs a NOTICE and skips).
-- ============================================================================

create extension if not exists pg_net;

-- ---- 1. table ----
create table if not exists public.device_push_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  token        text not null,
  platform     text not null check (platform in ('ios', 'android')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create unique index if not exists device_push_tokens_token_uidx
  on public.device_push_tokens (token);
create index if not exists device_push_tokens_user_idx
  on public.device_push_tokens (user_id);

-- ---- 2. RLS ----
alter table public.device_push_tokens enable row level security;

drop policy if exists "device_push_tokens_select_own" on public.device_push_tokens;
create policy "device_push_tokens_select_own"
  on public.device_push_tokens for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "device_push_tokens_insert_own" on public.device_push_tokens;
create policy "device_push_tokens_insert_own"
  on public.device_push_tokens for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "device_push_tokens_update_own" on public.device_push_tokens;
create policy "device_push_tokens_update_own"
  on public.device_push_tokens for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "device_push_tokens_delete_own" on public.device_push_tokens;
create policy "device_push_tokens_delete_own"
  on public.device_push_tokens for delete to authenticated
  using (user_id = auth.uid());

-- ---- 3. trigger function ----
-- security definer so it can read the GUC settings regardless of caller.
create or replace function public.notify_push_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  supabase_url text;
  service_key  text;
begin
  supabase_url := current_setting('app.settings.supabase_url',     true);
  service_key  := current_setting('app.settings.service_role_key', true);

  -- Skip silently if not configured yet. This keeps INSERTs working
  -- the moment you apply this migration, before the SETUP step below.
  if supabase_url is null or supabase_url = ''
     or service_key  is null or service_key  = '' then
    raise notice 'send_push: app.settings.* not configured — skipping push for notification %', new.id;
    return new;
  end if;

  begin
    perform net.http_post(
      url := supabase_url || '/functions/v1/send_push',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || service_key
      ),
      body := jsonb_build_object(
        'id',             new.id,
        'recipient_role', new.recipient_role,
        'recipient_id',   new.recipient_id,
        'kind',           new.kind,
        'title',          new.title,
        'body',           new.body,
        'payload',        coalesce(new.payload, '{}'::jsonb)
      ),
      timeout_milliseconds := 5000
    );
  exception when others then
    -- NEVER block the INSERT because push failed.
    raise notice 'send_push: pg_net call failed for notification % — %',
                 new.id, sqlerrm;
  end;

  return new;
end$$;

drop trigger if exists notifications_send_push on public.notifications;
create trigger notifications_send_push
  after insert on public.notifications
  for each row execute function public.notify_push_on_insert();

-- ---- 4. Realtime publication membership (so client realtime sub stays consistent) ----
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename  = 'device_push_tokens'
  ) then
    alter publication supabase_realtime add table public.device_push_tokens;
  end if;
end$$;

notify pgrst, 'reload schema';

-- ============================================================================
-- SETUP — run this ONCE, after you have:
--   • deployed the send_push function (`supabase functions deploy send_push`)
--   • copied your project URL  (Settings → API → Project URL)
--   • copied your service_role key  (Settings → API → service_role / secret)
--
-- Paste these two lines into a new SQL editor tab, fill in the values, run.
-- (Comments are kept here so you have the template — don't run THIS file
-- with the placeholders below; pull them into a fresh tab and substitute.)
--
--   alter database postgres
--     set "app.settings.supabase_url"     = 'https://YOUR_REF.supabase.co';
--   alter database postgres
--     set "app.settings.service_role_key" = 'eyJhbG...your service_role key...';
--
-- These settings persist across restarts. After running them, the trigger
-- will fire pushes for every future INSERT into public.notifications.
-- ============================================================================
