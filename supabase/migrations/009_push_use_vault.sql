-- ============================================================================
-- CKR Nutrition OS  —  Phase B3 hotfix
--
-- Migration 008 tried to read the service role key from `current_setting()`
-- (a GUC). On Supabase hosted Postgres, you can't `ALTER DATABASE SET` from
-- the SQL editor — it errors with "permission denied to set parameter".
--
-- Fix: read the service role key from Supabase Vault instead. Vault is the
-- supported way to store secrets that database functions need to read.
-- The project URL is hardcoded (it's already public — it's in your .env).
--
-- After running this migration:
--   • run the `vault.create_secret(...)` statement at the bottom ONCE
--     with your real service role key.
-- ============================================================================

create extension if not exists supabase_vault with schema vault;

create or replace function public.notify_push_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  service_key text;
begin
  select decrypted_secret
    into service_key
    from vault.decrypted_secrets
   where name = 'send_push_service_role_key'
   limit 1;

  if service_key is null or service_key = '' then
    raise notice 'send_push: vault secret "send_push_service_role_key" not set — skipping push for notification %', new.id;
    return new;
  end if;

  begin
    perform net.http_post(
      url := 'https://unmstganlbqhdwdfzpnu.supabase.co/functions/v1/send_push',
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
    raise notice 'send_push: pg_net call failed for notification % — %', new.id, sqlerrm;
  end;

  return new;
end$$;

-- The trigger created by 008 already points at this function name —
-- replacing the function is enough, no need to recreate the trigger.

-- ============================================================================
-- SETUP — run this ONCE, after replacing the placeholder with your real
-- service role key. Safe to re-run (it updates the existing secret instead
-- of erroring on duplicate name).
--
--   do $$
--   declare
--     existing_id uuid;
--   begin
--     select id into existing_id
--       from vault.secrets
--      where name = 'send_push_service_role_key';
--
--     if existing_id is not null then
--       perform vault.update_secret(existing_id, 'PASTE_YOUR_SERVICE_ROLE_KEY_HERE');
--     else
--       perform vault.create_secret(
--         'PASTE_YOUR_SERVICE_ROLE_KEY_HERE',
--         'send_push_service_role_key',
--         'Service role key for send_push edge function trigger'
--       );
--     end if;
--   end$$;
--
-- Verify with:
--   select name, created_at, updated_at
--   from vault.secrets
--   where name = 'send_push_service_role_key';
-- ============================================================================
