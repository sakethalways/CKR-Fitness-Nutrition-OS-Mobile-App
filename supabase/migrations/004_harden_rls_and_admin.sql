-- ============================================================================
-- CKR Nutrition OS  —  Phase B2 hotfix #3
--
-- Fixes that address:
--   1. "new row violates row-level security policy for table notifications"
--      when admin tries to Save Changes & Notify Trainer (or any cross-role
--      notification insert).
--   2. Supabase security advisor warning: function_search_path_mutable on
--      public.is_admin (mutable search_path).
--   3. Advisor warning: rls_policy_always_true on notifs_insert_any_authenticated.
--   4. Advisor warning: public_bucket_allows_listing on avatars.
--
-- Idempotent — safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Re-create is_admin() with a pinned search_path
--    (PostgreSQL security best practice — prevents privilege escalation via
--    search_path manipulation, and makes the function deterministic in any
--    calling context.)
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- ----------------------------------------------------------------------------
-- 2) Clean reset of notifications policies — explicit instead of "true"
-- ----------------------------------------------------------------------------
drop policy if exists "notifs_select_own"                on public.notifications;
drop policy if exists "notifs_insert_any_authenticated"  on public.notifications;
drop policy if exists "notifs_update_own"                on public.notifications;
drop policy if exists "notifs_delete_own"                on public.notifications;
drop policy if exists "notifications_select"             on public.notifications;
drop policy if exists "notifications_insert"             on public.notifications;
drop policy if exists "notifications_update"             on public.notifications;
drop policy if exists "notifications_delete"             on public.notifications;

-- READ: a user only sees notifications addressed to them
create policy "notifications_select"
  on public.notifications for select to authenticated
  using (
    (recipient_role = 'admin'   and public.is_admin())
    or (recipient_role = 'trainer' and recipient_id = auth.uid())
  );

-- INSERT: explicit rules instead of WITH CHECK (true)
--   - any authenticated user can send a notification to admin
--     (trainer → admin is the main flow)
--   - admin can send a notification to any trainer
--   - admin can also send admin-to-admin (internal mark-as-resolved updates
--     also live as notifications), which the role-clause already covers
create policy "notifications_insert"
  on public.notifications for insert to authenticated
  with check (
    recipient_role = 'admin'
    or (recipient_role = 'trainer' and public.is_admin())
  );

-- UPDATE: only the owner of the notification
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

-- DELETE: only the owner of the notification
create policy "notifications_delete"
  on public.notifications for delete to authenticated
  using (
    (recipient_role = 'admin'   and public.is_admin())
    or (recipient_role = 'trainer' and recipient_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 3) Tighten avatars bucket SELECT
--    Public buckets still serve files via direct URL regardless of SELECT
--    policy. The "public" SELECT policy was only enabling clients to LIST
--    every avatar in the bucket — that's what the advisor flagged.
--    Switching to authenticated-only SELECT keeps URL access for trainers
--    and admins, and blocks anonymous enumeration.
-- ----------------------------------------------------------------------------
drop policy if exists "avatars_public_read"        on storage.objects;
drop policy if exists "avatars_authenticated_read" on storage.objects;

create policy "avatars_authenticated_read"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars');
