DO $mig$
DECLARE
  roles_clause text := NULL;
BEGIN
  IF to_regprocedure('public.current_clerk_user_id()') IS NULL THEN
    EXECUTE 'CREATE FUNCTION public.current_clerk_user_id() RETURNS text LANGUAGE sql STABLE AS $$ SELECT NULL::text $$';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
    AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    roles_clause := 'anon, authenticated';
  END IF;

  IF roles_clause IS NOT NULL AND to_regclass('public.social_users') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.social_users ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.social_users FORCE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS social_users_self_select ON public.social_users';
    EXECUTE format(
      'CREATE POLICY social_users_self_select ON public.social_users FOR SELECT TO %s USING (clerk_user_id = public.current_clerk_user_id())',
      roles_clause
    );
  END IF;

  IF roles_clause IS NOT NULL AND to_regclass('public.profiles') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS profiles_self_select ON public.profiles';
    EXECUTE format(
      'CREATE POLICY profiles_self_select ON public.profiles FOR SELECT TO %s USING (clerk_user_id = public.current_clerk_user_id())',
      roles_clause
    );
  END IF;
END
$mig$;
