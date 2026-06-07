-- Scale foundation for 1000+ users:
--   1) Server-side admin dashboard stats (so counts are correct regardless of
--      the PostgREST 1000-row response cap, and we stop counting in JS memory).
--   2) Trigram indexes so name search stays fast at scale.

BEGIN;

-- Fast case-insensitive name search (ILIKE '%q%') -----------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_clients_name_trgm
  ON public.clients USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_trainers_name_trgm
  ON public.trainers USING gin (name gin_trgm_ops);

-- Admin dashboard stats, computed in SQL ------------------------------------
-- SECURITY DEFINER bypasses RLS, so we gate it to admins explicitly.
CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS TABLE (
  active_clients int,
  critical int,
  completed int,
  active_trainers int,
  avg_rating numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  -- Columns are table-qualified to avoid clashing with the OUT parameter
  -- names (e.g. plans.avg_rating vs the avg_rating OUT column → error 42702).
  RETURN QUERY
  SELECT
    (SELECT count(*) FROM clients c WHERE c.status <> 'Completed')::int,
    (SELECT count(*) FROM clients c WHERE c.status = 'Critical')::int,
    (SELECT count(*) FROM clients c WHERE c.status = 'Completed')::int,
    (SELECT count(*) FROM trainers t WHERE t.is_active)::int,
    COALESCE((SELECT round(avg(p.avg_rating)::numeric, 1)
              FROM plans p WHERE p.avg_rating > 0), 0);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_dashboard_stats() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated;

COMMIT;
