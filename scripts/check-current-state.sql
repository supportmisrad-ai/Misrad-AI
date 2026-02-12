-- ==============================================================================
-- CHECK CURRENT STATE: What exists in production DB
-- ==============================================================================
-- Run this FIRST to see what we have before making any changes
-- ==============================================================================

-- 1. Check current organization_users record
SELECT 
  id,
  clerk_user_id,
  email,
  full_name,
  organization_id,
  role,
  created_at,
  updated_at
FROM organization_users
WHERE email = 'itsikdahan1@gmail.com';

-- 2. Find all organizations owned by this user
SELECT 
  o.id,
  o.name,
  o.slug,
  o.owner_id,
  o.created_at,
  o.subscription_status,
  o.trial_days
FROM organizations o
WHERE o.owner_id = (
  SELECT id FROM organization_users WHERE email = 'itsikdahan1@gmail.com'
)
ORDER BY o.created_at DESC;

-- 3. Count total organizations
SELECT COUNT(*) as total_organizations
FROM organizations
WHERE owner_id = (
  SELECT id FROM organization_users WHERE email = 'itsikdahan1@gmail.com'
);

-- ==============================================================================
-- COPY THE RESULTS AND SEND THEM TO ME
-- ==============================================================================
