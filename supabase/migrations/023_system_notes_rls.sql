-- 023_system_notes_rls.sql
-- ---------------------------------------------------------------------------
-- SECURITY HARDENING: system_notes (created in migration 010) was the only
-- table without Row Level Security. It holds read-only reference notes about
-- meal standards, so:
--   • logged-in users may READ it,
--   • nobody may write to it from the app (no INSERT/UPDATE/DELETE policy =
--     denied by default once RLS is on; the service role still can).
--
-- Safe for the app: the app never writes system_notes, so nothing breaks.
-- Re-running this migration is harmless (idempotent).
-- ---------------------------------------------------------------------------

BEGIN;

ALTER TABLE public.system_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_notes_read_authenticated" ON public.system_notes;
CREATE POLICY "system_notes_read_authenticated"
  ON public.system_notes FOR SELECT
  TO authenticated
  USING (true);

COMMIT;
