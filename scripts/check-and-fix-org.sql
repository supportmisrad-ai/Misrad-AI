-- Step 1: Check current state
SELECT id, clerk_user_id, email, full_name, organization_id, role
FROM organization_users
WHERE email = 'itsikdahan1@gmail.com';

-- Step 2: Find your organizations (owned by you)
SELECT id, name, slug, owner_id
FROM organizations
WHERE owner_id = (
  SELECT id FROM organization_users WHERE email = 'itsikdahan1@gmail.com'
)
ORDER BY created_at DESC
LIMIT 5;

-- Step 3: If organization_id is NULL, link to first organization
UPDATE organization_users
SET organization_id = (
  SELECT id FROM organizations 
  WHERE owner_id = (SELECT id FROM organization_users WHERE email = 'itsikdahan1@gmail.com')
  ORDER BY created_at DESC
  LIMIT 1
)
WHERE email = 'itsikdahan1@gmail.com'
  AND organization_id IS NULL;

-- Step 4: Verify the fix
SELECT id, clerk_user_id, email, full_name, organization_id, role
FROM organization_users
WHERE email = 'itsikdahan1@gmail.com';
