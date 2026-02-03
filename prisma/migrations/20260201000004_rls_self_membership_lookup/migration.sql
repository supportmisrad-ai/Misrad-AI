DO $$
BEGIN
  -- Ensure function exists for shadow DB / non-Supabase environments
  IF to_regprocedure('public.current_clerk_user_id()') IS NULL THEN
    EXECUTE $migrate$
      CREATE FUNCTION public.current_clerk_user_id()
      RETURNS text
      LANGUAGE sql
      STABLE
      AS $$
        SELECT NULL::text;
      $$;
    $migrate$;
  END IF;

  IF to_regclass('public.social_users') IS NOT NULL THEN
    EXECUTE $migrate$
      ALTER TABLE public.social_users ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.social_users FORCE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS social_users_self_select ON public.social_users;
      CREATE POLICY social_users_self_select ON public.social_users
        FOR SELECT
        TO anon, authenticated
        USING (clerk_user_id = public.current_clerk_user_id());
    $migrate$;
  END IF;

  IF to_regclass('public.profiles') IS NOT NULL THEN
    EXECUTE $migrate$
      ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS profiles_self_select ON public.profiles;
      CREATE POLICY profiles_self_select ON public.profiles
        FOR SELECT
        TO anon, authenticated
        USING (clerk_user_id = public.current_clerk_user_id());
    $migrate$;
  END IF;
END
$$;
