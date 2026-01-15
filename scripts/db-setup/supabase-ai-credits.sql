ALTER TABLE IF EXISTS public.organization_settings
  ADD COLUMN IF NOT EXISTS ai_quota_cents bigint;

CREATE OR REPLACE FUNCTION public.ai_get_credit_status(
  p_organization_id uuid
)
RETURNS TABLE (
  organization_id uuid,
  period_start timestamptz,
  quota_cents bigint,
  used_cents bigint,
  remaining_cents bigint
)
LANGUAGE sql
STABLE
AS $$
  WITH quota AS (
    SELECT
      os.organization_id,
      os.ai_quota_cents
    FROM public.organization_settings os
    WHERE os.organization_id = p_organization_id
  ),
  usage AS (
    SELECT
      date_trunc('month', now())::timestamptz AS period_start,
      COALESCE(SUM(CASE WHEN l.status = 'success' THEN l.charged_cents ELSE 0 END), 0)::bigint AS used_cents
    FROM public.ai_usage_logs l
    WHERE l.organization_id = p_organization_id
      AND l.created_at >= date_trunc('month', now())
  )
  SELECT
    p_organization_id AS organization_id,
    u.period_start,
    q.ai_quota_cents AS quota_cents,
    u.used_cents,
    CASE
      WHEN q.ai_quota_cents IS NULL THEN NULL
      ELSE GREATEST(q.ai_quota_cents - u.used_cents, 0)
    END AS remaining_cents
  FROM usage u
  LEFT JOIN quota q ON q.organization_id = p_organization_id;
$$;
