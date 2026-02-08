DO $$
BEGIN
  IF to_regclass('public.support_ticket_events') IS NULL THEN
    CREATE TABLE public.support_ticket_events (
      id uuid NOT NULL DEFAULT uuid_generate_v4(),
      ticket_id uuid NOT NULL,
      tenant_id uuid,
      actor_id uuid,
      action text NOT NULL,
      content text,
      metadata jsonb DEFAULT '{}'::jsonb,
      created_at timestamptz(6) DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT support_ticket_events_pkey PRIMARY KEY (id),
      CONSTRAINT support_ticket_events_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.misrad_support_tickets(id) ON DELETE CASCADE ON UPDATE NO ACTION
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.support_ticket_events') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS support_ticket_events_ticket_id_idx ON public.support_ticket_events(ticket_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS support_ticket_events_tenant_id_idx ON public.support_ticket_events(tenant_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS support_ticket_events_created_at_idx ON public.support_ticket_events(created_at)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_support_ticket_events_tenant_ticket_created_at ON public.support_ticket_events(tenant_id, ticket_id, created_at)';
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.support_ticket_events') IS NOT NULL THEN
    ALTER TABLE public.support_ticket_events ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.support_ticket_events FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS org_isolation_all ON public.support_ticket_events;
    DROP POLICY IF EXISTS super_admin_select_all ON public.support_ticket_events;
    DROP POLICY IF EXISTS super_admin_write_requires_org ON public.support_ticket_events;

    CREATE POLICY org_isolation_all ON public.support_ticket_events
      FOR ALL
      TO authenticated
      USING (tenant_id = public.current_organization_id())
      WITH CHECK (tenant_id = public.current_organization_id());

    CREATE POLICY super_admin_select_all ON public.support_ticket_events
      FOR SELECT
      TO authenticated
      USING (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true);

    CREATE POLICY super_admin_write_requires_org ON public.support_ticket_events
      FOR ALL
      TO authenticated
      USING (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true)
      WITH CHECK (
        coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true
        AND tenant_id IS NOT NULL
      );
  END IF;
END
$$;
