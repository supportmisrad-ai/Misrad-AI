-- Quick check: What's the current state?
SELECT 
  u.id,
  u.clerk_user_id,
  u.email,
  u.organization_id,
  o.slug as org_slug,
  o.name as org_name
FROM organization_users u
LEFT JOIN organizations o ON u.organization_id = o.id
WHERE u.email = 'itsikdahan1@gmail.com';
