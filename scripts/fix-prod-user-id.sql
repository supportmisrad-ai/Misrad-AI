-- Fix: Update clerk_user_id for production after migrating from dev
-- 
-- Instructions:
-- 1. Find your new Production Clerk User ID:
--    - Go to https://dashboard.clerk.com
--    - Click on "Users" → Find your user
--    - Copy the User ID (starts with "user_...")
--
-- 2. Replace 'NEW_PROD_USER_ID' below with your actual Production User ID
-- 3. Replace 'your-email@example.com' with your actual email
-- 4. Run this in your production database

-- Update the organization_users table with new Production Clerk User ID
UPDATE organization_users
SET clerk_user_id = 'user_39UkuSmIkk20b1MuAahuYqWHKoe'
WHERE email = 'itsikdahan1@gmail.com';

-- Verify the update
SELECT id, clerk_user_id, email, full_name, organization_id, role
FROM organization_users
WHERE email = 'itsikdahan1@gmail.com';
