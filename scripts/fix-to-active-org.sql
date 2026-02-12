-- ==============================================================================
-- FIX: Link to Active Organization
-- ==============================================================================
-- Problem: User is linked to "טסט - Canceled" (status: canceled)
-- Solution: Link to "מערכת Misrad AI שלי" (status: active, slug: avoda-sheli)
-- ==============================================================================

-- Update organization_id to point to the active "avoda-sheli" workspace
UPDATE organization_users
SET 
  organization_id = '74a363b5-764f-47a9-84f0-438e01529db8',
  updated_at = NOW()
WHERE email = 'itsikdahan1@gmail.com';

-- Verify the fix
SELECT 
  u.id,
  u.clerk_user_id,
  u.email,
  u.organization_id,
  u.role,
  o.name as org_name,
  o.slug as org_slug,
  o.subscription_status
FROM organization_users u
LEFT JOIN organizations o ON u.organization_id = o.id
WHERE u.email = 'itsikdahan1@gmail.com';

-- ==============================================================================
-- Expected result:
-- - organization_id: 74a363b5-764f-47a9-84f0-438e01529db8
-- - org_name: מערכת Misrad AI שלי
-- - org_slug: avoda-sheli
-- - subscription_status: active
-- ==============================================================================
