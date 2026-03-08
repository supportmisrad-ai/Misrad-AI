-- ========================================
-- VERIFY: Are we really connected to PROD?
-- ========================================

-- Query 1: Check database connection details
SELECT 
  current_database() as database_name,
  version() as postgres_version,
  'Connected to database' as status;

-- Query 2: Find user by Clerk ID (PROD user)
SELECT 
  'FOUND BY CLERK ID (PROD)' as search_method,
  id,
  clerk_user_id,
  email,
  full_name,
  role,
  organization_id,
  created_at
FROM organization_users
WHERE clerk_user_id = 'user_39UkuSmIkk20b1MuAahuYqWHKoe';

-- Query 3: Find Misrad AI HQ organization
SELECT 
  'SEARCHING MISRAD AI HQ' as search,
  id,
  name,
  slug,
  owner_id,
  subscription_status,
  created_at
FROM organizations
WHERE name ILIKE '%misrad%ai%hq%'
   OR slug ILIKE '%misrad%ai%hq%'
   OR slug = 'misrad-ai-hq'
ORDER BY created_at DESC;

-- Query 4: Count total users and organizations
SELECT 
  (SELECT COUNT(*) FROM organization_users) as total_users,
  (SELECT COUNT(*) FROM organizations WHERE deleted_at IS NULL) as total_orgs,
  (SELECT COUNT(*) FROM business_clients WHERE deleted_at IS NULL) as total_clients;

-- Query 5: Show latest 5 users (to see what's actually in the DB)
SELECT 
  id,
  clerk_user_id,
  email,
  full_name,
  role,
  created_at
FROM organization_users
ORDER BY created_at DESC
LIMIT 5;
