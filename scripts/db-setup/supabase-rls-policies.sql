-- ============================================================
-- RLS Lockdown Policies (Organization Scoped)
-- ============================================================
--
-- Tenant scoping source of truth: organization_id
--
-- This file:
-- 1) ENABLE + FORCE RLS on all relevant tables
-- 2) Adds an "ALL" policy (SELECT/INSERT/UPDATE/DELETE) that only allows rows
--    where organization_id (or tenant_id fallback) matches the JWT app_metadata organization_id.
--
-- IMPORTANT:
-- - RLS does NOT apply to service_role (it bypasses RLS). Still keep server-side checks.
-- - This script uses dynamic SQL + information_schema checks to avoid failing on missing tables/columns.

begin;

-- Helper: get current org id from JWT
create or replace function public.current_organization_id()
returns uuid
language sql
stable
set search_path = public
as $$
  select nullif((auth.jwt() -> 'app_metadata' ->> 'organization_id'), '')::uuid;
$$;

-- Helper: apply org-scoped RLS to a given table.
-- If the table has organization_id, we scope to it.
-- Else if it has tenant_id, we scope to tenant_id.
-- Else: we do NOT create an allow policy (implicit deny is safest when FORCE RLS is on).
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

  -- Always enable + force RLS first.
  execute format('alter table %s enable row level security', p_table);
  execute format('alter table %s force row level security', p_table);

  -- Recreate policy
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
    -- No tenant scoping column found. Deny all access explicitly.
    execute format(
      'create policy %I on %s for all using (false) with check (false)',
      policy_name,
      p_table
    );
  end if;
end;
$$;

-- Apply to all tables we want locked down.
-- NOTE: list is intentionally explicit to make audits easy.
select public.apply_org_rls('public.users');
select public.apply_org_rls('public.clients');
select public.apply_org_rls('public.tasks');
select public.apply_org_rls('public.time_entries');
select public.apply_org_rls('public.tenants');
select public.apply_org_rls('public.roles');
select public.apply_org_rls('public.permissions');
select public.apply_org_rls('public.integrations');

-- Social tables
select public.apply_org_rls('public.social_posts');
select public.apply_org_rls('public.client_requests');
select public.apply_org_rls('public.manager_requests');
select public.apply_org_rls('public.ideas');
select public.apply_org_rls('public.conversations');
select public.apply_org_rls('public.messages');

-- Misrad / Client OS
select public.apply_org_rls('public.misrad_activity_logs');
select public.apply_org_rls('public.misrad_ai_liability_risks');
select public.apply_org_rls('public.misrad_ai_tasks');
select public.apply_org_rls('public.misrad_assigned_forms');
select public.apply_org_rls('public.misrad_client_actions');
select public.apply_org_rls('public.misrad_client_agreements');
select public.apply_org_rls('public.misrad_client_assets');
select public.apply_org_rls('public.misrad_client_deliverables');
select public.apply_org_rls('public.misrad_client_handoffs');
select public.apply_org_rls('public.misrad_client_transformations');
select public.apply_org_rls('public.misrad_clients');
select public.apply_org_rls('public.misrad_cycle_assets');
select public.apply_org_rls('public.misrad_cycle_tasks');
select public.apply_org_rls('public.misrad_cycles');
select public.apply_org_rls('public.misrad_emails');
select public.apply_org_rls('public.misrad_feedback_items');
select public.apply_org_rls('public.misrad_form_fields');
select public.apply_org_rls('public.misrad_form_responses');
select public.apply_org_rls('public.misrad_form_steps');
select public.apply_org_rls('public.misrad_form_templates');
select public.apply_org_rls('public.misrad_group_events');
select public.apply_org_rls('public.misrad_invoices');
select public.apply_org_rls('public.misrad_journey_stages');
select public.apply_org_rls('public.misrad_meeting_analysis_results');
select public.apply_org_rls('public.misrad_meeting_files');
select public.apply_org_rls('public.misrad_meetings');
select public.apply_org_rls('public.misrad_metric_history');
select public.apply_org_rls('public.misrad_milestones');
select public.apply_org_rls('public.misrad_module_settings');
select public.apply_org_rls('public.misrad_notifications');
select public.apply_org_rls('public.misrad_opportunities');
select public.apply_org_rls('public.misrad_roi_records');
select public.apply_org_rls('public.misrad_stakeholders');
select public.apply_org_rls('public.misrad_success_goals');
select public.apply_org_rls('public.misrad_workflow_blueprints');
select public.apply_org_rls('public.misrad_workflow_items');
select public.apply_org_rls('public.misrad_workflow_stages');

commit;
