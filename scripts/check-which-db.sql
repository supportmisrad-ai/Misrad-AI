-- ========================================
-- Check which DB you are connected to
-- ========================================

-- This query will show you the database details
SELECT 
  current_database() as database_name,
  current_user as current_user,
  inet_server_addr() as server_ip,
  inet_server_port() as server_port,
  version() as postgres_version;

-- Check if itsikdahan1@gmail.com exists (PROD)
SELECT 
  'PROD USER FOUND' as status,
  id,
  clerk_user_id,
  email,
  full_name,
  role,
  organization_id,
  created_at
FROM organization_users
WHERE LOWER(email) = 'itsikdahan1@gmail.com'

UNION ALL

-- Check if itsikdahan8@gmail.com exists (DEV)
SELECT 
  'DEV USER FOUND' as status,
  id,
  clerk_user_id,
  email,
  full_name,
  role,
  organization_id,
  created_at
FROM organization_users
WHERE LOWER(email) = 'itsikdahan8@gmail.com';
