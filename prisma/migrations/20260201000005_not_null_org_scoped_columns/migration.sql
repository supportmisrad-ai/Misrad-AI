DO $$
BEGIN
  IF to_regclass('public.social_clients') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'social_clients'
        AND column_name = 'organization_id'
        AND is_nullable = 'YES'
    ) THEN
      IF EXISTS (SELECT 1 FROM public.social_clients WHERE organization_id IS NULL) THEN
        RAISE EXCEPTION 'social_clients.organization_id contains NULL values';
      END IF;

      ALTER TABLE public.social_clients
        ALTER COLUMN organization_id SET NOT NULL;
    END IF;
  END IF;

  IF to_regclass('public.social_team_members') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'social_team_members'
        AND column_name = 'organization_id'
        AND is_nullable = 'YES'
    ) THEN
      IF EXISTS (SELECT 1 FROM public.social_team_members WHERE organization_id IS NULL) THEN
        RAISE EXCEPTION 'social_team_members.organization_id contains NULL values';
      END IF;

      ALTER TABLE public.social_team_members
        ALTER COLUMN organization_id SET NOT NULL;
    END IF;
  END IF;

  IF to_regclass('public.system_calendar_events') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'system_calendar_events'
        AND column_name = 'organization_id'
        AND is_nullable = 'YES'
    ) THEN
      IF EXISTS (SELECT 1 FROM public.system_calendar_events WHERE organization_id IS NULL) THEN
        RAISE EXCEPTION 'system_calendar_events.organization_id contains NULL values';
      END IF;

      ALTER TABLE public.system_calendar_events
        ALTER COLUMN organization_id SET NOT NULL;
    END IF;
  END IF;

  IF to_regclass('public.system_call_analyses') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'system_call_analyses'
        AND column_name = 'organization_id'
        AND is_nullable = 'YES'
    ) THEN
      IF EXISTS (SELECT 1 FROM public.system_call_analyses WHERE organization_id IS NULL) THEN
        RAISE EXCEPTION 'system_call_analyses.organization_id contains NULL values';
      END IF;

      ALTER TABLE public.system_call_analyses
        ALTER COLUMN organization_id SET NOT NULL;
    END IF;
  END IF;

  IF to_regclass('public.system_invoices') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'system_invoices'
        AND column_name = 'organization_id'
        AND is_nullable = 'YES'
    ) THEN
      IF EXISTS (SELECT 1 FROM public.system_invoices WHERE organization_id IS NULL) THEN
        RAISE EXCEPTION 'system_invoices.organization_id contains NULL values';
      END IF;

      ALTER TABLE public.system_invoices
        ALTER COLUMN organization_id SET NOT NULL;
    END IF;
  END IF;

  IF to_regclass('public.system_lead_activities') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'system_lead_activities'
        AND column_name = 'organization_id'
        AND is_nullable = 'YES'
    ) THEN
      IF EXISTS (SELECT 1 FROM public.system_lead_activities WHERE organization_id IS NULL) THEN
        RAISE EXCEPTION 'system_lead_activities.organization_id contains NULL values';
      END IF;

      ALTER TABLE public.system_lead_activities
        ALTER COLUMN organization_id SET NOT NULL;
    END IF;
  END IF;

  IF to_regclass('public.system_lead_handovers') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'system_lead_handovers'
        AND column_name = 'organization_id'
        AND is_nullable = 'YES'
    ) THEN
      IF EXISTS (SELECT 1 FROM public.system_lead_handovers WHERE organization_id IS NULL) THEN
        RAISE EXCEPTION 'system_lead_handovers.organization_id contains NULL values';
      END IF;

      ALTER TABLE public.system_lead_handovers
        ALTER COLUMN organization_id SET NOT NULL;
    END IF;
  END IF;

  IF to_regclass('public.system_portal_approvals') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'system_portal_approvals'
        AND column_name = 'organization_id'
        AND is_nullable = 'YES'
    ) THEN
      IF EXISTS (SELECT 1 FROM public.system_portal_approvals WHERE organization_id IS NULL) THEN
        RAISE EXCEPTION 'system_portal_approvals.organization_id contains NULL values';
      END IF;

      ALTER TABLE public.system_portal_approvals
        ALTER COLUMN organization_id SET NOT NULL;
    END IF;
  END IF;

  IF to_regclass('public.system_portal_tasks') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'system_portal_tasks'
        AND column_name = 'organization_id'
        AND is_nullable = 'YES'
    ) THEN
      IF EXISTS (SELECT 1 FROM public.system_portal_tasks WHERE organization_id IS NULL) THEN
        RAISE EXCEPTION 'system_portal_tasks.organization_id contains NULL values';
      END IF;

      ALTER TABLE public.system_portal_tasks
        ALTER COLUMN organization_id SET NOT NULL;
    END IF;
  END IF;

  IF to_regclass('public.system_support_tickets') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'system_support_tickets'
        AND column_name = 'organization_id'
        AND is_nullable = 'YES'
    ) THEN
      IF EXISTS (SELECT 1 FROM public.system_support_tickets WHERE organization_id IS NULL) THEN
        RAISE EXCEPTION 'system_support_tickets.organization_id contains NULL values';
      END IF;

      ALTER TABLE public.system_support_tickets
        ALTER COLUMN organization_id SET NOT NULL;
    END IF;
  END IF;
END
$$;
