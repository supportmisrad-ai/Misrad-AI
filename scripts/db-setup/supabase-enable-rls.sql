-- Enables Row Level Security (RLS) on tables exposed via PostgREST.
-- NOTE: Enabling RLS WITHOUT adding policies will block all access via anon/authenticated keys.
-- The Supabase service role key bypasses RLS.

begin;

-- Nexus (public)
alter table if exists public.nexus_clients enable row level security;
alter table if exists public.nexus_tasks enable row level security;
alter table if exists public.nexus_time_entries enable row level security;
alter table if exists public.nexus_users enable row level security;
alter table if exists public.nexus_tenants enable row level security;

-- Nexus (additional)
alter table if exists public.nexus_team_events enable row level security;
alter table if exists public.nexus_leave_requests enable row level security;
alter table if exists public.nexus_event_attendance enable row level security;
alter table if exists public.nexus_employee_invitation_links enable row level security;

-- System (public)
alter table if exists public.system_leads enable row level security;
alter table if exists public.system_lead_activities enable row level security;
alter table if exists public.system_lead_handovers enable row level security;
alter table if exists public.system_invoices enable row level security;
alter table if exists public.system_calendar_events enable row level security;
alter table if exists public.system_webhook_logs enable row level security;
alter table if exists public.system_call_analyses enable row level security;
alter table if exists public.system_portal_approvals enable row level security;
alter table if exists public.system_portal_tasks enable row level security;
alter table if exists public.system_support_tickets enable row level security;
alter table if exists public.system_tasks enable row level security;
alter table if exists public.system_campaigns enable row level security;
alter table if exists public.system_students enable row level security;
alter table if exists public.system_content_items enable row level security;
alter table if exists public.system_field_agents enable row level security;
alter table if exists public.system_automations enable row level security;
alter table if exists public.system_forms enable row level security;
alter table if exists public.system_partners enable row level security;
alter table if exists public.system_assets enable row level security;
alter table if exists public.system_invitation_links enable row level security;

-- Subscription / Billing (public)
alter table if exists public.subscription_orders enable row level security;
alter table if exists public.subscription_payment_configs enable row level security;

-- Content injection (public)
alter table if exists public.strategic_content enable row level security;

-- Misrad / Client OS (public)
alter table if exists public.misrad_roles enable row level security;
alter table if exists public.misrad_permissions enable row level security;
alter table if exists public.misrad_integrations enable row level security;
alter table if exists public.misrad_notifications enable row level security;
alter table if exists public.misrad_support_tickets enable row level security;
alter table if exists public.misrad_calendar_sync_log enable row level security;
alter table if exists public.misrad_feature_requests enable row level security;

commit;
