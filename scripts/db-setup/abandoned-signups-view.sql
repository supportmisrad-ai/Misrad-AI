CREATE OR REPLACE VIEW v_abandoned_signups_last_24h AS
SELECT
  su.id AS social_user_id,
  su.clerk_user_id,
  su.email,
  su.full_name,
  su.created_at,
  su.organization_id
FROM social_users su
JOIN organizations o
  ON o.id = su.organization_id
WHERE
  su.organization_id IS NOT NULL
  AND su.created_at IS NOT NULL
  AND su.created_at >= (now() - interval '24 hours')
  AND su.id = o.owner_id
  AND NOT EXISTS (
    SELECT 1
    FROM subscriptions s
    WHERE s.organization_id = o.id
      AND s.status = 'active'
      AND s.current_period_end > now()
  );
