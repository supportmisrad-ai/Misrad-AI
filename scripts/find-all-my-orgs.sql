-- ========================================
-- Find ALL organizations for itsikdahan1@gmail.com
-- ========================================

-- Get user ID first
WITH user_info AS (
  SELECT id, clerk_user_id, email, full_name
  FROM organization_users
  WHERE clerk_user_id = 'user_39UkuSmIkk20b1MuAahuYqWHKoe'
)
-- Find all organizations where user is owner
SELECT 
  o.id,
  o.name,
  o.slug,
  o.owner_id,
  o.client_id,
  o.subscription_status,
  o.subscription_plan,
  o.has_nexus,
  o.has_social,
  o.has_system,
  o.has_finance,
  o.has_client,
  o.has_operations,
  o.created_at,
  bc.company_name AS business_client_name,
  bc.primary_email AS business_client_email,
  CASE WHEN o.client_id IS NULL THEN '⚠️ NO CLIENT' ELSE '✅ HAS CLIENT' END AS client_status
FROM organizations o
INNER JOIN user_info u ON o.owner_id = u.id
LEFT JOIN business_clients bc ON o.client_id = bc.id
WHERE o.deleted_at IS NULL
ORDER BY o.created_at DESC;

-- Summary: Count by client status
WITH user_info AS (
  SELECT id FROM organization_users
  WHERE clerk_user_id = 'user_39UkuSmIkk20b1MuAahuYqWHKoe'
)
SELECT 
  CASE 
    WHEN o.client_id IS NULL THEN '⚠️ Missing BusinessClient'
    ELSE '✅ Has BusinessClient'
  END AS status,
  COUNT(*) AS count
FROM organizations o
INNER JOIN user_info u ON o.owner_id = u.id
WHERE o.deleted_at IS NULL
GROUP BY CASE WHEN o.client_id IS NULL THEN '⚠️ Missing BusinessClient' ELSE '✅ Has BusinessClient' END;
