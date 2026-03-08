-- ========================================
-- Check User: itsikdahan8@gmail.com (CORRECTED!)
-- ========================================

-- Query 1: Find user record
SELECT 
  id,
  clerk_user_id,
  email,
  full_name,
  role,
  organization_id,
  created_at
FROM organization_users
WHERE LOWER(email) = 'itsikdahan8@gmail.com';

-- Query 2: User's organization with BusinessClient info
SELECT 
  o.id,
  o.name,
  o.slug,
  o.owner_id,
  o.client_id,
  o.subscription_status,
  o.subscription_plan,
  o.created_at,
  bc.company_name AS business_client_name
FROM organizations o
JOIN organization_users u ON o.owner_id = u.id
LEFT JOIN business_clients bc ON o.client_id = bc.id
WHERE LOWER(u.email) = 'itsikdahan8@gmail.com';

-- Query 3: Organizations without BusinessClient
SELECT 
  id,
  name,
  slug,
  client_id,
  subscription_status,
  created_at
FROM organizations
WHERE client_id IS NULL
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- Query 4: All BusinessClients
SELECT 
  id,
  company_name,
  primary_email,
  status,
  created_at
FROM business_clients
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- Query 5: Organizations where user is OWNER
SELECT 
  o.id,
  o.name,
  o.slug,
  o.owner_id,
  o.client_id,
  o.subscription_status,
  o.subscription_plan,
  o.created_at,
  bc.company_name AS business_client_name,
  'owner' AS user_role
FROM organizations o
LEFT JOIN business_clients bc ON o.client_id = bc.id
WHERE o.owner_id IN (
  SELECT id FROM organization_users WHERE LOWER(email) = 'itsikdahan8@gmail.com'
)
AND o.deleted_at IS NULL
ORDER BY o.created_at DESC;

-- Query 6: User's home organization (from organization_users.organization_id)
SELECT 
  u.id AS user_id,
  u.email,
  u.organization_id AS home_org_id,
  o.name AS home_org_name,
  o.slug AS home_org_slug
FROM organization_users u
LEFT JOIN organizations o ON u.organization_id = o.id
WHERE LOWER(u.email) = 'itsikdahan8@gmail.com';

-- Query 7: DEBUG - Check if user exists at all (any variation)
SELECT 
  id,
  clerk_user_id,
  email,
  full_name,
  role,
  organization_id,
  created_at
FROM organization_users
WHERE email ILIKE '%itsik%'
   OR email ILIKE '%dahan%'
ORDER BY created_at DESC
LIMIT 20;

-- Query 8: DEBUG - All organizations (no filter)
SELECT 
  id,
  name,
  slug,
  owner_id,
  client_id,
  subscription_status,
  created_at
FROM organizations
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 20;
