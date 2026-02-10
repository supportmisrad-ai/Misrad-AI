-- Migration: Add unique constraint on (organizationId, email) to nexus_users
-- Before adding the constraint, we need to clean up existing duplicates

-- Step 1: Identify and merge duplicate nexus_users
-- Keep the oldest record (by created_at) and delete newer duplicates

WITH duplicates AS (
  SELECT 
    id,
    organization_id,
    email,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id, LOWER(TRIM(email))
      ORDER BY created_at ASC, id ASC
    ) AS row_num
  FROM nexus_users
  WHERE email IS NOT NULL
    AND TRIM(email) != ''
)
DELETE FROM nexus_users
WHERE id IN (
  SELECT id 
  FROM duplicates 
  WHERE row_num > 1
);

-- Step 2: Add the unique constraint
-- Note: This constraint allows NULL emails (multiple users with NULL email are allowed)
CREATE UNIQUE INDEX IF NOT EXISTS nexus_users_org_email_unique 
ON nexus_users (organization_id, email)
WHERE email IS NOT NULL AND TRIM(email) != '';
