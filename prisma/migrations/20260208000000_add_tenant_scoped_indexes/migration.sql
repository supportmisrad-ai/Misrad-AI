CREATE INDEX IF NOT EXISTS idx_social_posts_org_created_at
  ON public.social_posts (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_posts_org_client_created_at
  ON public.social_posts (organization_id, client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_posts_org_status_created_at
  ON public.social_posts (organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_conversations_org_updated_at
  ON public.social_conversations (organization_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_conversations_org_client_updated_at
  ON public.social_conversations (organization_id, client_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_tasks_org_due_date
  ON public.social_tasks (organization_id, due_date);

CREATE INDEX IF NOT EXISTS idx_social_tasks_org_client_due_date
  ON public.social_tasks (organization_id, client_id, due_date);

CREATE INDEX IF NOT EXISTS idx_social_post_comments_org_post_id
  ON public.social_post_comments (organization_id, post_id);

CREATE INDEX IF NOT EXISTS idx_social_messages_org_conversation_created_at
  ON public.social_messages (organization_id, conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_social_client_requests_org_created_at
  ON public.social_client_requests (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_client_requests_org_client_created_at
  ON public.social_client_requests (organization_id, client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_manager_requests_org_created_at
  ON public.social_manager_requests (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_manager_requests_org_client_created_at
  ON public.social_manager_requests (organization_id, client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_ideas_org_created_at
  ON public.social_ideas (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_ideas_org_client_created_at
  ON public.social_ideas (organization_id, client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leave_requests_org_created_at
  ON public.nexus_leave_requests (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leave_requests_org_employee_created_at
  ON public.nexus_leave_requests (organization_id, employee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leave_requests_org_status_created_at
  ON public.nexus_leave_requests (organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant_created_at
  ON public.misrad_support_tickets (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant_user_created_at
  ON public.misrad_support_tickets (tenant_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant_status_created_at
  ON public.misrad_support_tickets (tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_ticket_events_tenant_ticket_created_at
  ON public.support_ticket_events (tenant_id, ticket_id, created_at);

CREATE INDEX IF NOT EXISTS idx_nexus_tasks_org_due_created_at
  ON public.nexus_tasks (organization_id, due_date, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_leads_org_hot_updated_created
  ON public.system_leads (organization_id, is_hot, updated_at DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_leads_org_status
  ON public.system_leads (organization_id, status);
