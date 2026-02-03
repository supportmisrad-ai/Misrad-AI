DO $$
BEGIN
  -- social_tasks
  IF to_regclass('public.social_tasks') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'social_tasks'
        AND column_name = 'organization_id'
    ) THEN
      ALTER TABLE public.social_tasks
        ADD COLUMN organization_id uuid;
    END IF;

    -- Backfill from client
    IF to_regclass('public.social_clients') IS NOT NULL THEN
      UPDATE public.social_tasks st
        SET organization_id = sc.organization_id
      FROM public.social_clients sc
      WHERE st.organization_id IS NULL
        AND st.client_id IS NOT NULL
        AND sc.id = st.client_id;
    END IF;

    -- Backfill from assigned team member
    IF to_regclass('public.social_team_members') IS NOT NULL THEN
      UPDATE public.social_tasks st
        SET organization_id = tm.organization_id
      FROM public.social_team_members tm
      WHERE st.organization_id IS NULL
        AND st.assigned_to IS NOT NULL
        AND tm.id = st.assigned_to;
    END IF;

    -- Fallback (single org)
    IF to_regclass('public.social_organizations') IS NOT NULL THEN
      IF (SELECT COUNT(*) FROM public.social_organizations) = 1 THEN
        UPDATE public.social_tasks
          SET organization_id = (SELECT id FROM public.social_organizations LIMIT 1)
        WHERE organization_id IS NULL;
      END IF;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'idx_social_tasks_organization_id'
    ) THEN
      CREATE INDEX idx_social_tasks_organization_id ON public.social_tasks(organization_id);
    END IF;
  END IF;

  -- social_conversations
  IF to_regclass('public.social_conversations') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'social_conversations'
        AND column_name = 'organization_id'
    ) THEN
      ALTER TABLE public.social_conversations
        ADD COLUMN organization_id uuid;
    END IF;

    IF to_regclass('public.social_clients') IS NOT NULL THEN
      UPDATE public.social_conversations c
        SET organization_id = sc.organization_id
      FROM public.social_clients sc
      WHERE c.organization_id IS NULL
        AND sc.id = c.client_id;
    END IF;

    IF to_regclass('public.social_organizations') IS NOT NULL THEN
      IF (SELECT COUNT(*) FROM public.social_organizations) = 1 THEN
        UPDATE public.social_conversations
          SET organization_id = (SELECT id FROM public.social_organizations LIMIT 1)
        WHERE organization_id IS NULL;
      END IF;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'idx_social_conversations_organization_id'
    ) THEN
      CREATE INDEX idx_social_conversations_organization_id ON public.social_conversations(organization_id);
    END IF;
  END IF;

  -- social_messages
  IF to_regclass('public.social_messages') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'social_messages'
        AND column_name = 'organization_id'
    ) THEN
      ALTER TABLE public.social_messages
        ADD COLUMN organization_id uuid;
    END IF;

    IF to_regclass('public.social_conversations') IS NOT NULL THEN
      UPDATE public.social_messages m
        SET organization_id = c.organization_id
      FROM public.social_conversations c
      WHERE m.organization_id IS NULL
        AND c.id = m.conversation_id;
    END IF;

    IF to_regclass('public.social_organizations') IS NOT NULL THEN
      IF (SELECT COUNT(*) FROM public.social_organizations) = 1 THEN
        UPDATE public.social_messages
          SET organization_id = (SELECT id FROM public.social_organizations LIMIT 1)
        WHERE organization_id IS NULL;
      END IF;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'idx_social_messages_organization_id'
    ) THEN
      CREATE INDEX idx_social_messages_organization_id ON public.social_messages(organization_id);
    END IF;
  END IF;

  -- social_ideas
  IF to_regclass('public.social_ideas') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'social_ideas'
        AND column_name = 'organization_id'
    ) THEN
      ALTER TABLE public.social_ideas
        ADD COLUMN organization_id uuid;
    END IF;

    IF to_regclass('public.social_clients') IS NOT NULL THEN
      UPDATE public.social_ideas i
        SET organization_id = sc.organization_id
      FROM public.social_clients sc
      WHERE i.organization_id IS NULL
        AND sc.id = i.client_id;
    END IF;

    IF to_regclass('public.social_organizations') IS NOT NULL THEN
      IF (SELECT COUNT(*) FROM public.social_organizations) = 1 THEN
        UPDATE public.social_ideas
          SET organization_id = (SELECT id FROM public.social_organizations LIMIT 1)
        WHERE organization_id IS NULL;
      END IF;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'idx_social_ideas_organization_id'
    ) THEN
      CREATE INDEX idx_social_ideas_organization_id ON public.social_ideas(organization_id);
    END IF;
  END IF;

  -- social_manager_requests
  IF to_regclass('public.social_manager_requests') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'social_manager_requests'
        AND column_name = 'organization_id'
    ) THEN
      ALTER TABLE public.social_manager_requests
        ADD COLUMN organization_id uuid;
    END IF;

    IF to_regclass('public.social_clients') IS NOT NULL THEN
      UPDATE public.social_manager_requests r
        SET organization_id = sc.organization_id
      FROM public.social_clients sc
      WHERE r.organization_id IS NULL
        AND sc.id = r.client_id;
    END IF;

    IF to_regclass('public.social_organizations') IS NOT NULL THEN
      IF (SELECT COUNT(*) FROM public.social_organizations) = 1 THEN
        UPDATE public.social_manager_requests
          SET organization_id = (SELECT id FROM public.social_organizations LIMIT 1)
        WHERE organization_id IS NULL;
      END IF;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'idx_social_manager_requests_organization_id'
    ) THEN
      CREATE INDEX idx_social_manager_requests_organization_id ON public.social_manager_requests(organization_id);
    END IF;
  END IF;

  -- social_client_requests
  IF to_regclass('public.social_client_requests') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'social_client_requests'
        AND column_name = 'organization_id'
    ) THEN
      ALTER TABLE public.social_client_requests
        ADD COLUMN organization_id uuid;
    END IF;

    IF to_regclass('public.social_clients') IS NOT NULL THEN
      UPDATE public.social_client_requests r
        SET organization_id = sc.organization_id
      FROM public.social_clients sc
      WHERE r.organization_id IS NULL
        AND sc.id = r.client_id;
    END IF;

    IF to_regclass('public.social_organizations') IS NOT NULL THEN
      IF (SELECT COUNT(*) FROM public.social_organizations) = 1 THEN
        UPDATE public.social_client_requests
          SET organization_id = (SELECT id FROM public.social_organizations LIMIT 1)
        WHERE organization_id IS NULL;
      END IF;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'idx_social_client_requests_organization_id'
    ) THEN
      CREATE INDEX idx_social_client_requests_organization_id ON public.social_client_requests(organization_id);
    END IF;
  END IF;

  -- Re-apply org RLS (best effort)
  IF to_regprocedure('public.apply_org_rls(text)') IS NOT NULL THEN
    PERFORM public.apply_org_rls('public.social_tasks');
    PERFORM public.apply_org_rls('public.social_conversations');
    PERFORM public.apply_org_rls('public.social_messages');
    PERFORM public.apply_org_rls('public.social_ideas');
    PERFORM public.apply_org_rls('public.social_manager_requests');
    PERFORM public.apply_org_rls('public.social_client_requests');
  END IF;
END
$$;
