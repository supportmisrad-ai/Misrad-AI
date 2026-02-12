-- ==============================================================================
-- CHECK AND CREATE PROFILE
-- ==============================================================================
-- Problem: User redirected to homepage = missing profile record
-- Solution: Check if profile exists, if not create it
-- ==============================================================================

-- Step 1: Check if profile exists
SELECT 
  id,
  clerk_user_id,
  organization_id,
  role,
  created_at
FROM profiles
WHERE clerk_user_id = 'user_39UkuSmIkk20b1MuAahuYqWHKoe';

-- Step 2: If no result above, create profile
INSERT INTO profiles (
  id,
  clerk_user_id,
  organization_id,
  role,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  'user_39UkuSmIkk20b1MuAahuYqWHKoe',
  '74a363b5-764f-47a9-84f0-438e01529db8',
  'owner',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM profiles WHERE clerk_user_id = 'user_39UkuSmIkk20b1MuAahuYqWHKoe'
);

-- Step 3: Verify the profile
SELECT 
  p.id,
  p.clerk_user_id,
  p.organization_id,
  p.role,
  o.name as org_name,
  o.slug as org_slug
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE p.clerk_user_id = 'user_39UkuSmIkk20b1MuAahuYqWHKoe';

-- ==============================================================================
-- Expected result:
-- - profile should exist with organizationId = 74a363b5-764f-47a9-84f0-438e01529db8
-- - org_name: מערכת Misrad AI שלי
-- - org_slug: avoda-sheli
-- ==============================================================================
