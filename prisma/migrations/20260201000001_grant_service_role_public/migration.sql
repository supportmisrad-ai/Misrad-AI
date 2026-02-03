DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    RAISE EXCEPTION 'Expected DB role "service_role" to exist, but it was not found in pg_roles';
  END IF;

  GRANT USAGE ON SCHEMA public TO service_role;
  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
  GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
  GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO service_role;

  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON FUNCTIONS TO service_role;

  IF NOT has_table_privilege('service_role', 'public.social_users', 'insert') THEN
    RAISE EXCEPTION 'service_role still missing INSERT privilege on public.social_users after GRANTs';
  END IF;
  IF NOT has_table_privilege('service_role', 'public.social_users', 'update') THEN
    RAISE EXCEPTION 'service_role still missing UPDATE privilege on public.social_users after GRANTs';
  END IF;
END
$$;
