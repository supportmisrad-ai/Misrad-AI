DO $$
BEGIN
  IF to_regclass('public.web_push_subscriptions') IS NOT NULL THEN
    ALTER TABLE public.web_push_subscriptions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.web_push_subscriptions FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS org_isolation_all ON public.web_push_subscriptions;
    DROP POLICY IF EXISTS super_admin_select_all ON public.web_push_subscriptions;
    DROP POLICY IF EXISTS super_admin_write_requires_org ON public.web_push_subscriptions;

    CREATE POLICY org_isolation_all ON public.web_push_subscriptions
      FOR ALL
      TO authenticated
      USING (organization_id = public.current_organization_id())
      WITH CHECK (organization_id = public.current_organization_id());

    CREATE POLICY super_admin_select_all ON public.web_push_subscriptions
      FOR SELECT
      TO authenticated
      USING (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true);

    CREATE POLICY super_admin_write_requires_org ON public.web_push_subscriptions
      FOR ALL
      TO authenticated
      USING (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true)
      WITH CHECK (
        coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true
        AND organization_id IS NOT NULL
      );
  END IF;
END
$$;
