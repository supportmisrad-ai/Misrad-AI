UPDATE social_users
SET id = gen_random_uuid()
WHERE id IS NULL;

DO $$
DECLARE
  pk_name text;
  pk_def text;
  fk_ref_count int;
BEGIN
  SELECT c.conname, pg_get_constraintdef(c.oid)
  INTO pk_name, pk_def
  FROM pg_constraint c
  WHERE c.conrelid = 'public.social_users'::regclass
    AND c.contype = 'p'
  LIMIT 1;

  SELECT COUNT(*)
  INTO fk_ref_count
  FROM pg_constraint c
  WHERE c.confrelid = 'public.social_users'::regclass
    AND c.contype = 'f';

  IF pk_name IS NOT NULL AND pk_def NOT ILIKE '%(id)%' THEN
    IF fk_ref_count > 0 THEN
      RAISE EXCEPTION 'Cannot change social_users primary key; referenced by % foreign keys', fk_ref_count;
    END IF;

    EXECUTE format('ALTER TABLE public.social_users DROP CONSTRAINT %I', pk_name);
  END IF;

  IF EXISTS (SELECT 1 FROM public.social_users WHERE id IS NULL) THEN
    RAISE EXCEPTION 'social_users.id contains NULL values';
  END IF;

  IF EXISTS (SELECT 1 FROM public.social_users GROUP BY id HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'social_users.id contains duplicate values';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.social_users'::regclass
      AND c.contype = 'p'
  ) THEN
    ALTER TABLE public.social_users
      ADD CONSTRAINT social_users_pkey PRIMARY KEY (id);
  END IF;
END
$$;

WITH org_owner_profile_by_id AS (
  SELECT
    o.id AS organization_id,
    p.clerk_user_id,
    p.email,
    p.full_name,
    p.avatar_url,
    p.role
  FROM organizations o
  JOIN profiles p ON p.id = o.owner_id
),
owner_profile_by_org AS (
  SELECT DISTINCT ON (p.organization_id)
    p.organization_id,
    p.clerk_user_id,
    p.email,
    p.full_name,
    p.avatar_url,
    p.role
  FROM profiles p
  ORDER BY
    p.organization_id,
    CASE WHEN p.role = 'owner' THEN 0 ELSE 1 END,
    p.created_at ASC
),
owner_profile_candidates AS (
  SELECT * FROM org_owner_profile_by_id
  UNION
  SELECT * FROM owner_profile_by_org
),
missing_social_users AS (
  SELECT
    gen_random_uuid() AS id,
    opc.clerk_user_id,
    lower(opc.email) AS email,
    opc.full_name,
    opc.avatar_url,
    now() AS created_at,
    now() AS updated_at,
    opc.organization_id AS organization_id,
    COALESCE(opc.role, 'owner') AS role,
    ARRAY['nexus', 'client']::text[] AS allowed_modules
  FROM owner_profile_candidates opc
  WHERE opc.clerk_user_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM social_users su
      WHERE su.clerk_user_id = opc.clerk_user_id
    )
)
INSERT INTO social_users (
  id,
  clerk_user_id,
  email,
  full_name,
  avatar_url,
  created_at,
  updated_at,
  organization_id,
  role,
  allowed_modules
)
SELECT
  id,
  clerk_user_id,
  email,
  full_name,
  avatar_url,
  created_at,
  updated_at,
  organization_id,
  role,
  allowed_modules
FROM missing_social_users
ON CONFLICT (clerk_user_id) DO NOTHING;

UPDATE organizations o
SET owner_id = su.id
FROM profiles p
JOIN social_users su
  ON su.clerk_user_id = p.clerk_user_id
WHERE p.id = o.owner_id
  AND NOT EXISTS (
    SELECT 1
    FROM social_users su2
    WHERE su2.id = o.owner_id
  )
  AND (o.owner_id IS DISTINCT FROM su.id);

WITH owner_profiles AS (
  SELECT DISTINCT ON (p.organization_id)
    p.organization_id,
    p.clerk_user_id
  FROM profiles p
  ORDER BY
    p.organization_id,
    CASE WHEN p.role = 'owner' THEN 0 ELSE 1 END,
    p.created_at ASC
),
desired_owners AS (
  SELECT
    op.organization_id,
    su.id AS social_user_id
  FROM owner_profiles op
  JOIN social_users su
    ON su.clerk_user_id = op.clerk_user_id
)
UPDATE organizations o
SET owner_id = d.social_user_id
FROM desired_owners d
WHERE o.id = d.organization_id
  AND NOT EXISTS (
    SELECT 1
    FROM social_users su2
    WHERE su2.id = o.owner_id
  )
  AND (o.owner_id IS DISTINCT FROM d.social_user_id);

WITH orphan_orgs AS (
  SELECT o.id AS organization_id
  FROM organizations o
  LEFT JOIN social_users su ON su.id = o.owner_id
  LEFT JOIN profiles p_owner ON p_owner.id = o.owner_id
  LEFT JOIN LATERAL (
    SELECT p.*
    FROM profiles p
    WHERE p.organization_id = o.id
    ORDER BY CASE WHEN p.role = 'owner' THEN 0 ELSE 1 END, p.created_at ASC
    LIMIT 1
  ) p_candidate ON true
  WHERE o.owner_id IS NOT NULL
    AND su.id IS NULL
    AND COALESCE(p_owner.clerk_user_id, p_candidate.clerk_user_id) IS NULL
),
placeholder_social_users AS (
  SELECT
    gen_random_uuid() AS id,
    ('placeholder_' || organization_id::text) AS clerk_user_id,
    NULL::text AS email,
    'System Owner'::text AS full_name,
    NULL::text AS avatar_url,
    now() AS created_at,
    now() AS updated_at,
    organization_id,
    'owner'::text AS role,
    ARRAY['nexus', 'client']::text[] AS allowed_modules
  FROM orphan_orgs
)
INSERT INTO social_users (
  id,
  clerk_user_id,
  email,
  full_name,
  avatar_url,
  created_at,
  updated_at,
  organization_id,
  role,
  allowed_modules
)
SELECT
  id,
  clerk_user_id,
  email,
  full_name,
  avatar_url,
  created_at,
  updated_at,
  organization_id,
  role,
  allowed_modules
FROM placeholder_social_users
ON CONFLICT (clerk_user_id) DO NOTHING;

UPDATE organizations o
SET owner_id = su.id
FROM social_users su
WHERE su.organization_id = o.id
  AND su.clerk_user_id = ('placeholder_' || o.id::text)
  AND NOT EXISTS (
    SELECT 1
    FROM social_users su2
    WHERE su2.id = o.owner_id
  )
  AND (o.owner_id IS DISTINCT FROM su.id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM organizations o
    LEFT JOIN social_users su ON su.id = o.owner_id
    WHERE o.owner_id IS NOT NULL
      AND su.id IS NULL
  ) THEN
    RAISE EXCEPTION 'organizations.owner_id contains values not present in social_users.id';
  END IF;
END
$$;

ALTER TABLE organizations
  DROP CONSTRAINT IF EXISTS organizations_owner_id_fkey;

ALTER TABLE organizations
  ADD CONSTRAINT organizations_owner_id_fkey
  FOREIGN KEY (owner_id)
  REFERENCES social_users(id)
  ON DELETE RESTRICT
  ON UPDATE NO ACTION;
