BEGIN;

CREATE OR REPLACE FUNCTION public.current_organization_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_clerk_user_id text;
BEGIN
  BEGIN
    v_org := coalesce(
      nullif(auth.jwt() ->> 'organization_id', ''),
      nullif(auth.jwt() ->> 'org_id', ''),
      nullif(auth.jwt() ->> 'orgId', ''),
      nullif((auth.jwt() -> 'org' ->> 'id'), ''),
      nullif((auth.jwt() -> 'metadata' ->> 'organization_id'), ''),
      nullif((auth.jwt() -> 'public_metadata' ->> 'organization_id'), ''),
      nullif((auth.jwt() -> 'app_metadata' ->> 'organization_id'), '')
    )::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_org := NULL;
  END;

  IF v_org IS NOT NULL THEN
    RETURN v_org;
  END IF;

  v_clerk_user_id := public.current_clerk_user_id();
  IF v_clerk_user_id IS NULL OR length(trim(v_clerk_user_id)) = 0 THEN
    RETURN NULL;
  END IF;

  IF to_regclass('public.social_users') IS NOT NULL THEN
    SELECT su.organization_id
    INTO v_org
    FROM public.social_users su
    WHERE su.clerk_user_id = v_clerk_user_id
    LIMIT 1;

    IF v_org IS NOT NULL THEN
      RETURN v_org;
    END IF;
  END IF;

  IF to_regclass('public.profiles') IS NOT NULL THEN
    SELECT p.organization_id
    INTO v_org
    FROM public.profiles p
    WHERE p.clerk_user_id = v_clerk_user_id
    ORDER BY p.created_at ASC
    LIMIT 1;

    IF v_org IS NOT NULL THEN
      RETURN v_org;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

COMMIT;
