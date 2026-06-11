-- 024_notifications_rls_and_push_token_claim.sql
-- ---------------------------------------------------------------------------
-- NOTIFICATION SYSTEM FIXES (two real issues):
--
-- FIX 1 — notifications RLS left WIDE OPEN by migration 007.
--   007 installed "notifications_open_diagnostic" (FOR ALL TO PUBLIC USING
--   (true)) for a debugging round and said "we tighten up next" — but no later
--   migration ever did. Result: ANY logged-in user could read / update /
--   delete EVERY user's notifications via the API. The app UI filters by
--   recipient, so it looked fine, but the door was open.
--   This restores the strict recipient-scoped policies from 005:
--     • SELECT/UPDATE/DELETE: only the addressee (admin sees admin-role rows,
--       a trainer sees only rows addressed to their id).
--     • INSERT: any authenticated user (trainers must be able to notify the
--       admin; the app decides targeting).
--
-- FIX 2 — push tokens could stay glued to a previous user ("broadcast" feel).
--   device_push_tokens rows are claimed with an upsert, but RLS only lets a
--   user UPDATE their OWN rows. So when a phone switches accounts without a
--   clean sign-out (account switch, reinstall, crash), the token row silently
--   KEEPS the old owner — and that phone keeps receiving the OLD user's
--   pushes (e.g. another trainer's "deletion approved"), which looks exactly
--   like notifications being broadcast to the wrong people.
--   Fixed with two SECURITY DEFINER functions the app calls instead:
--     • claim_push_token(token, platform): reassigns the token row to the
--       caller. Safe because only the physical device knows its own token.
--     • release_push_token(token): deletes the row on sign-out regardless of
--       which user currently owns it.
--
-- Idempotent — safe to re-run.
-- ---------------------------------------------------------------------------

BEGIN;

-- ===== FIX 1: restore strict notifications RLS ==============================

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.notifications',
      pol.policyname
    );
  END LOOP;
END$$;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select"
  ON public.notifications FOR SELECT TO authenticated
  USING (
    (recipient_role = 'admin'   AND public.is_admin())
    OR (recipient_role = 'trainer' AND recipient_id = auth.uid())
  );

CREATE POLICY "notifications_insert"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "notifications_update"
  ON public.notifications FOR UPDATE TO authenticated
  USING (
    (recipient_role = 'admin'   AND public.is_admin())
    OR (recipient_role = 'trainer' AND recipient_id = auth.uid())
  )
  WITH CHECK (
    (recipient_role = 'admin'   AND public.is_admin())
    OR (recipient_role = 'trainer' AND recipient_id = auth.uid())
  );

CREATE POLICY "notifications_delete"
  ON public.notifications FOR DELETE TO authenticated
  USING (
    (recipient_role = 'admin'   AND public.is_admin())
    OR (recipient_role = 'trainer' AND recipient_id = auth.uid())
  );

-- ===== FIX 2: push-token claim / release ====================================

-- Reassign (or create) this device's token row for the CALLING user.
-- SECURITY DEFINER so it can take the row over from a previous owner — safe
-- because the token value itself is the proof of device possession.
CREATE OR REPLACE FUNCTION public.claim_push_token(
  p_token text,
  p_platform text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_platform NOT IN ('ios', 'android') THEN
    RAISE EXCEPTION 'bad platform';
  END IF;

  INSERT INTO public.device_push_tokens
    (user_id, token, platform, last_seen_at, updated_at)
  VALUES
    (auth.uid(), p_token, p_platform, now(), now())
  ON CONFLICT (token) DO UPDATE
    SET user_id      = auth.uid(),   -- take the row over for the new owner
        platform     = EXCLUDED.platform,
        last_seen_at = now(),
        updated_at   = now();
END;
$$;

-- Drop this device's token row on sign-out, regardless of current owner.
CREATE OR REPLACE FUNCTION public.release_push_token(
  p_token text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  DELETE FROM public.device_push_tokens WHERE token = p_token;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_push_token(text, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.release_push_token(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_push_token(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_push_token(text) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
