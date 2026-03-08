-- ========================================
-- Fix Manually Created Clerk Users
-- ========================================
-- Purpose: Add missing organization_users records for users created directly in Clerk Dashboard
-- These users exist in Clerk but not in our Supabase DB, causing login failures

-- Step 1: Find users who are missing legal consent
SELECT 
  id,
  clerk_user_id,
  email,
  full_name,
  terms_accepted_at,
  privacy_accepted_at,
  created_at
FROM organization_users
WHERE terms_accepted_at IS NULL
  OR privacy_accepted_at IS NULL
ORDER BY created_at DESC;

-- Step 2: Auto-fix all existing users - add legal consent
-- IMPORTANT: Only run this ONCE after deploying the webhook fix
UPDATE organization_users
SET 
  terms_accepted_at = COALESCE(terms_accepted_at, NOW()),
  privacy_accepted_at = COALESCE(privacy_accepted_at, NOW()),
  terms_accepted_version = COALESCE(terms_accepted_version, NOW()::text),
  privacy_accepted_version = COALESCE(privacy_accepted_version, NOW()::text),
  updated_at = NOW()
WHERE terms_accepted_at IS NULL
  OR privacy_accepted_at IS NULL;

-- Step 3: Verify the fix
SELECT 
  COUNT(*) AS total_users,
  COUNT(terms_accepted_at) AS with_terms,
  COUNT(privacy_accepted_at) AS with_privacy
FROM organization_users;

-- ========================================
-- Manual Insert for Specific User
-- ========================================
-- If you manually created a user in Clerk Dashboard and they don't exist in organization_users:
-- 1. Get their clerk_user_id from Clerk Dashboard (starts with user_)
-- 2. Get their email from Clerk Dashboard
-- 3. Run this INSERT (replace the placeholders):

/*
INSERT INTO organization_users (
  clerk_user_id,
  email,
  full_name,
  terms_accepted_at,
  privacy_accepted_at,
  terms_accepted_version,
  privacy_accepted_version,
  created_at,
  updated_at
) VALUES (
  'user_XXXXXXXXXXXXXXXXX', -- Replace with actual Clerk user ID
  'user@example.com',        -- Replace with actual email
  'שם מלא',                   -- Replace with user's name
  NOW(),
  NOW(),
  NOW()::text,
  NOW()::text,
  NOW(),
  NOW()
)
ON CONFLICT (clerk_user_id) DO UPDATE SET
  terms_accepted_at = COALESCE(organization_users.terms_accepted_at, NOW()),
  privacy_accepted_at = COALESCE(organization_users.privacy_accepted_at, NOW()),
  updated_at = NOW();
*/

-- ========================================
-- Verification Queries
-- ========================================

-- Check if all users have legal consent
SELECT 
  clerk_user_id,
  email,
  CASE 
    WHEN terms_accepted_at IS NULL THEN '❌ חסר תנאי שימוש'
    WHEN privacy_accepted_at IS NULL THEN '❌ חסר מדיניות פרטיות'
    ELSE '✅ הכל תקין'
  END AS status
FROM organization_users
WHERE terms_accepted_at IS NULL OR privacy_accepted_at IS NULL;
