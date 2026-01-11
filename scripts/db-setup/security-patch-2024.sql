begin;

-- Ensure helper exists (idempotent)
create or replace function public.current_organization_id()
returns uuid
language sql
stable
set search_path = public
as $$
  select nullif((auth.jwt() -> 'app_metadata' ->> 'organization_id'), '')::uuid;
$$;

create or replace function public.apply_org_rls(p_table text)
returns void
language plpgsql
set search_path = public
as $$
declare
  tbl regclass;
  col text;
  policy_name text := 'org_isolation_all';
  schema_name text;
  table_name_only text;
  col_exists boolean;
  tenant_exists boolean;
  sql text;
begin
  tbl := to_regclass(p_table);
  if tbl is null then
    return;
  end if;

  schema_name := split_part(p_table, '.', 1);
  table_name_only := split_part(p_table, '.', 2);

  select exists(
    select 1
    from information_schema.columns
    where table_schema = schema_name
      and table_name = table_name_only
      and column_name = 'organization_id'
  ) into col_exists;

  select exists(
    select 1
    from information_schema.columns
    where table_schema = schema_name
      and table_name = table_name_only
      and column_name = 'tenant_id'
  ) into tenant_exists;

  execute format('alter table %s enable row level security', p_table);
  execute format('alter table %s force row level security', p_table);

  execute format('drop policy if exists %I on %s', policy_name, p_table);

  if col_exists then
    col := 'organization_id';
    sql := format(
      'create policy %I on %s for all using (%I = public.current_organization_id()) with check (%I = public.current_organization_id())',
      policy_name,
      p_table,
      col,
      col
    );
    execute sql;
  elsif tenant_exists then
    col := 'tenant_id';
    sql := format(
      'create policy %I on %s for all using (%I = public.current_organization_id()) with check (%I = public.current_organization_id())',
      policy_name,
      p_table,
      col,
      col
    );
    execute sql;
  else
    execute format(
      'create policy %I on %s for all using (false) with check (false)',
      policy_name,
      p_table
    );
  end if;
end;
$$;

-- Core tables
select public.apply_org_rls('public.users');
select public.apply_org_rls('public.clients');
select public.apply_org_rls('public.tasks');
select public.apply_org_rls('public.time_entries');
select public.apply_org_rls('public.tenants');
select public.apply_org_rls('public.roles');
select public.apply_org_rls('public.permissions');
select public.apply_org_rls('public.integrations');

-- Social
select public.apply_org_rls('public.social_posts');
select public.apply_org_rls('public.client_requests');
select public.apply_org_rls('public.manager_requests');
select public.apply_org_rls('public.ideas');
select public.apply_org_rls('public.conversations');
select public.apply_org_rls('public.messages');
select public.apply_org_rls('public.social_users');
select public.apply_org_rls('public.social_team_members');
select public.apply_org_rls('public.social_activity_logs');

-- Organizations: table is keyed by id (org id). Must allow only the current org.
-- If the table does not exist, this block is a no-op.
do $$
begin
  if to_regclass('public.organizations') is null then
    return;
  end if;

  execute 'alter table public.organizations enable row level security';
  execute 'alter table public.organizations force row level security';
  execute 'drop policy if exists org_self on public.organizations';
  execute 'create policy org_self on public.organizations for all using (id = public.current_organization_id()) with check (id = public.current_organization_id())';
end;
$$;

-- Nexus tables enabled in supabase-enable-rls.sql
select public.apply_org_rls('public.nexus_clients');
select public.apply_org_rls('public.nexus_tasks');
select public.apply_org_rls('public.nexus_time_entries');
select public.apply_org_rls('public.nexus_users');
select public.apply_org_rls('public.nexus_tenants');
select public.apply_org_rls('public.nexus_team_events');
select public.apply_org_rls('public.nexus_leave_requests');
select public.apply_org_rls('public.nexus_event_attendance');
select public.apply_org_rls('public.nexus_employee_invitation_links');

-- System tables enabled in supabase-enable-rls.sql
select public.apply_org_rls('public.system_leads');
select public.apply_org_rls('public.system_lead_activities');
select public.apply_org_rls('public.system_lead_handovers');
select public.apply_org_rls('public.system_invoices');
select public.apply_org_rls('public.system_calendar_events');
select public.apply_org_rls('public.system_webhook_logs');
select public.apply_org_rls('public.system_call_analyses');
select public.apply_org_rls('public.system_portal_approvals');
select public.apply_org_rls('public.system_portal_tasks');
select public.apply_org_rls('public.system_support_tickets');
select public.apply_org_rls('public.system_tasks');
select public.apply_org_rls('public.system_campaigns');
select public.apply_org_rls('public.system_students');
select public.apply_org_rls('public.system_content_items');
select public.apply_org_rls('public.system_field_agents');
select public.apply_org_rls('public.system_automations');
select public.apply_org_rls('public.system_forms');
select public.apply_org_rls('public.system_partners');
select public.apply_org_rls('public.system_assets');
select public.apply_org_rls('public.system_invitation_links');

-- Misrad / Client OS tables enabled in supabase-enable-rls.sql
select public.apply_org_rls('public.misrad_roles');
select public.apply_org_rls('public.misrad_permissions');
select public.apply_org_rls('public.misrad_integrations');
select public.apply_org_rls('public.misrad_notifications');
select public.apply_org_rls('public.misrad_support_tickets');
select public.apply_org_rls('public.misrad_calendar_sync_log');
select public.apply_org_rls('public.misrad_feature_requests');

commit;
