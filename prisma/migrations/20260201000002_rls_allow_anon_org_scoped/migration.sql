DO $$
BEGIN
  IF to_regclass('public.client_clients') IS NOT NULL THEN
    ALTER TABLE public.client_clients ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.client_clients FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS org_isolation_all ON public.client_clients;
    CREATE POLICY org_isolation_all ON public.client_clients
      FOR ALL
      TO anon, authenticated
      USING (organization_id = public.current_organization_id())
      WITH CHECK (organization_id = public.current_organization_id());
  END IF;

  IF to_regclass('public.system_leads') IS NOT NULL THEN
    ALTER TABLE public.system_leads ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.system_leads FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS org_isolation_all ON public.system_leads;
    CREATE POLICY org_isolation_all ON public.system_leads
      FOR ALL
      TO anon, authenticated
      USING (organization_id = public.current_organization_id())
      WITH CHECK (organization_id = public.current_organization_id());
  END IF;

  IF to_regclass('public.social_posts') IS NOT NULL THEN
    ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.social_posts FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS org_isolation_all ON public.social_posts;
    CREATE POLICY org_isolation_all ON public.social_posts
      FOR ALL
      TO anon, authenticated
      USING (organization_id = public.current_organization_id())
      WITH CHECK (organization_id = public.current_organization_id());
  END IF;
END
$$;
