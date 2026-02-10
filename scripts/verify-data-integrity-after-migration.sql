-- Data Integrity Verification After Migration
-- Verify no data was lost during table renames

-- Check organizations count (should be same as before)
SELECT 'organizations' as table_name, COUNT(*) as row_count FROM organizations;

-- Check organization_users count (was social_users)
SELECT 'organization_users' as table_name, COUNT(*) as row_count FROM organization_users;

-- Check team_members count (was social_team_members)  
SELECT 'team_members' as table_name, COUNT(*) as row_count FROM team_members;

-- Check all renamed Social Media tables
SELECT 'socialmedia_clients' as table_name, COUNT(*) as row_count FROM socialmedia_clients;
SELECT 'socialmedia_posts' as table_name, COUNT(*) as row_count FROM socialmedia_posts;
SELECT 'socialmedia_campaigns' as table_name, COUNT(*) as row_count FROM socialmedia_campaigns;

-- Verify foreign key relationships still work
SELECT 
  o.id,
  o.name,
  o.owner_id,
  ou.email as owner_email,
  ou.full_name as owner_name
FROM organizations o
LEFT JOIN organization_users ou ON o.owner_id = ou.id
LIMIT 5;

-- Check for any NULL owner_ids (should not exist)
SELECT COUNT(*) as orgs_without_owner 
FROM organizations 
WHERE owner_id IS NULL;

-- Verify indexes still exist (PostgreSQL auto-renames them)
SELECT 
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename IN ('organization_users', 'team_members', 'organizations')
ORDER BY tablename, indexname;
