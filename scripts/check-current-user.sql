-- Check current logged in users
SELECT 
  id,
  email,
  full_name,
  clerk_user_id,
  role,
  created_at
FROM social_users
ORDER BY created_at DESC
LIMIT 10;
