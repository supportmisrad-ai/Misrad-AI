-- ==============================================================================
-- FINAL FIX: Production User Setup
-- ==============================================================================
-- This script fixes the production login issue by:
-- 1. Updating clerk_user_id to match Production Clerk instance
-- 2. Linking user to their first organization (organization_id)
--
-- Run this ONCE in your Production database (Supabase SQL Editor)
-- ==============================================================================

-- Step 1: Update clerk_user_id for production
UPDATE organization_users
SET clerk_user_id = 'user_39UkuSmIkk20b1MuAahuYqWHKoe'
WHERE email = 'itsikdahan1@gmail.com';

-- Step 2: Link user to their first organization (if not already linked)
UPDATE organization_users
SET organization_id = (
  SELECT id FROM organizations 
  WHERE owner_id = (SELECT id FROM organization_users WHERE email = 'itsikdahan1@gmail.com')
  ORDER BY created_at DESC
  LIMIT 1
)
WHERE email = 'itsikdahan1@gmail.com'
  AND organization_id IS NULL;

-- Step 3: Verify the fix
SELECT 
  u.id,
  u.clerk_user_id,
  u.email,
  u.full_name,
  u.organization_id,
  u.role,
  o.name as org_name,
  o.slug as org_slug
FROM organization_users u
LEFT JOIN organizations o ON u.organization_id = o.id
WHERE u.email = 'itsikdahan1@gmail.com';

-- ==============================================================================
-- Expected result:
-- - clerk_user_id should be: user_39UkuSmIkk20b1MuAahuYqWHKoe
-- - organization_id should NOT be NULL
-- - org_name and org_slug should show your organization
-- ==============================================================================
