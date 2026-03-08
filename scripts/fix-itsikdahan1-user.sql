-- ========================================
-- FIX: Create itsikdahan1@gmail.com user in DB
-- ========================================
-- Problem: User exists in Clerk with Super Admin role but not in organization_users
-- Cause: Clerk webhook sync failed to create the user
-- Solution: Manually create the user and organization

-- Step 1: Create user in organization_users
INSERT INTO organization_users (
  id,
  clerk_user_id,
  email,
  full_name,
  role,
  organization_id,
  created_at,
  updated_at,
  terms_accepted_at,
  privacy_accepted_at,
  terms_accepted_version,
  privacy_accepted_version
)
VALUES (
  gen_random_uuid(), -- Auto-generate UUID
  'user_39UkuSmIkk20b1MuAahuYqWHKoe', -- Your Clerk User ID (PROD)
  'itsikdahan1@gmail.com',
  'יצחק דהן',
  'owner', -- Will be updated to SUPER_ADMIN after org creation
  NULL, -- Will be set after organization creation
  NOW(),
  NOW(),
  NOW(), -- Auto-accept legal consent
  NOW(),
  NOW()::text,
  NOW()::text
)
ON CONFLICT (clerk_user_id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = NOW()
RETURNING id, clerk_user_id, email;

-- Step 2: Get the created user ID
DO $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  -- Find the user we just created
  SELECT id INTO v_user_id
  FROM organization_users
  WHERE clerk_user_id = 'user_39UkuSmIkk20b1MuAahuYqWHKoe';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found after creation';
  END IF;

  -- Check if Misrad AI HQ organization exists
  SELECT id INTO v_org_id
  FROM organizations
  WHERE slug = 'misrad-ai-hq'
    AND deleted_at IS NULL
  LIMIT 1;

  -- If org doesn't exist, create it
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (
      id,
      name,
      slug,
      owner_id,
      has_nexus,
      has_social,
      has_system,
      has_finance,
      has_client,
      has_operations,
      subscription_status,
      subscription_plan,
      trial_start_date,
      trial_days,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      'Misrad AI HQ',
      'misrad-ai-hq',
      v_user_id,
      true, -- All modules enabled
      true,
      true,
      true,
      true,
      true,
      'active', -- Production org is active
      'the_empire', -- Highest plan
      NOW(),
      0, -- No trial - already active
      NOW(),
      NOW()
    )
    RETURNING id INTO v_org_id;
  END IF;

  -- Update user with organization_id and set as SUPER_ADMIN
  UPDATE organization_users
  SET 
    organization_id = v_org_id,
    role = 'owner', -- Role in organization_users
    updated_at = NOW()
  WHERE id = v_user_id;

  RAISE NOTICE 'Successfully created/updated user % with organization %', v_user_id, v_org_id;
END $$;

-- Step 3: Verify the fix
SELECT 
  u.id,
  u.clerk_user_id,
  u.email,
  u.full_name,
  u.role,
  u.organization_id,
  o.name AS org_name,
  o.slug AS org_slug,
  o.subscription_status
FROM organization_users u
LEFT JOIN organizations o ON u.organization_id = o.id
WHERE u.clerk_user_id = 'user_39UkuSmIkk20b1MuAahuYqWHKoe';
