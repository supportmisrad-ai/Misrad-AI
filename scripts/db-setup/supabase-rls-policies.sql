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

-- Ensure API roles can access the public schema (RLS will still enforce row-level access).
grant usage on schema public to anon, authenticated, service_role;

-- Ensure authenticated can interact with tables (RLS policies control what rows are visible/mutable).
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

do $$
begin
  if to_regclass('public.system_settings') is not null then
    execute 'grant select on table public.system_settings to anon';
  end if;
  if to_regclass('public.social_system_settings') is not null then
    execute 'grant select on table public.social_system_settings to anon';
  end if;
  if to_regclass('public.help_videos') is not null then
    execute 'grant select on table public.help_videos to anon';
  end if;
  if to_regclass('public.global_settings') is not null then
    execute 'grant select on table public.global_settings to anon';
  end if;
end
$$;

-- Keep defaults for future tables.
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;

-- Helper: get current org id from JWT
create or replace function public.current_organization_id()
returns uuid
language sql
stable
set search_path = public
as $$
  select
    coalesce(
      nullif(auth.jwt() ->> 'organization_id', ''),
      nullif(auth.jwt() ->> 'org_id', ''),
      nullif(auth.jwt() ->> 'orgId', ''),
      nullif((auth.jwt() -> 'org' ->> 'id'), ''),
      nullif((auth.jwt() -> 'metadata' ->> 'organization_id'), ''),
      nullif((auth.jwt() -> 'public_metadata' ->> 'organization_id'), ''),
      nullif((auth.jwt() -> 'app_metadata' ->> 'organization_id'), '')
    )::uuid;
$$;

 create or replace function public.current_clerk_user_id()
 returns text
 language sql
 stable
 set search_path = public
 as $$
   select coalesce(
     nullif(auth.jwt() ->> 'clerk_user_id', ''),
     nullif(auth.jwt() ->> 'user_id', ''),
     nullif(auth.jwt() ->> 'sub', ''),
     nullif((auth.jwt() -> 'user' ->> 'id'), '')
   );
 $$;

 create or replace function public.is_member_of_org(p_org_id uuid)
 returns boolean
 language plpgsql
 stable
 set search_path = public
 as $$
 declare
   v_clerk_user_id text;
   v_ok boolean;
 begin
   if p_org_id is null then
     return false;
   end if;

   v_clerk_user_id := public.current_clerk_user_id();
   if v_clerk_user_id is null or length(trim(v_clerk_user_id)) = 0 then
     return false;
   end if;

   select exists (
     select 1
     from public.profiles p
     where p.organization_id = p_org_id
       and p.clerk_user_id = v_clerk_user_id
   ) into v_ok;
   if v_ok then
     return true;
   end if;

   if to_regclass('public.social_users') is not null then
     execute
       'select exists (select 1 from public.social_users su where su.organization_id = $1::uuid and su.clerk_user_id = $2::text)'
     into v_ok
     using p_org_id, v_clerk_user_id;

     if v_ok then
       return true;
     end if;
   end if;

   return false;
 end;
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
  super_admin_select_policy text := 'super_admin_select_all';
  super_admin_write_policy text := 'super_admin_write_requires_org';
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
  execute format('drop policy if exists %I on %s', super_admin_select_policy, p_table);
  execute format('drop policy if exists %I on %s', super_admin_write_policy, p_table);

  if col_exists then
    col := 'organization_id';
    sql := format(
      'create policy %I on %s for all to authenticated using (%I = public.current_organization_id()) with check (%I = public.current_organization_id())',
      policy_name,
      p_table,
      col,
      col
    );
    execute sql;

    -- Super Admin: allow global SELECT.
    sql := format(
      'create policy %I on %s for select to authenticated using (coalesce((auth.jwt() -> ''app_metadata'' ->> ''is_super_admin'')::boolean, false) = true)',
      super_admin_select_policy,
      p_table
    );
    execute sql;

    -- Super Admin: global access, but writes require explicit org column.
    -- NOTE: one policy per table (policy names must be unique per table in Postgres).
    sql := format(
      'create policy %I on %s for all to authenticated using (coalesce((auth.jwt() -> ''app_metadata'' ->> ''is_super_admin'')::boolean, false) = true) with check (coalesce((auth.jwt() -> ''app_metadata'' ->> ''is_super_admin'')::boolean, false) = true and %I is not null)',
      super_admin_write_policy,
      p_table,
      col
    );
    execute sql;
  elsif tenant_exists then
    col := 'tenant_id';
    sql := format(
      'create policy %I on %s for all to authenticated using (%I = public.current_organization_id()) with check (%I = public.current_organization_id())',
      policy_name,
      p_table,
      col,
      col
    );
    execute sql;

    -- Super Admin: allow global SELECT.
    sql := format(
      'create policy %I on %s for select to authenticated using (coalesce((auth.jwt() -> ''app_metadata'' ->> ''is_super_admin'')::boolean, false) = true)',
      super_admin_select_policy,
      p_table
    );
    execute sql;

    -- Super Admin: global access, but writes require explicit tenant column.
    -- NOTE: one policy per table (policy names must be unique per table in Postgres).
    sql := format(
      'create policy %I on %s for all to authenticated using (coalesce((auth.jwt() -> ''app_metadata'' ->> ''is_super_admin'')::boolean, false) = true) with check (coalesce((auth.jwt() -> ''app_metadata'' ->> ''is_super_admin'')::boolean, false) = true and %I is not null)',
      super_admin_write_policy,
      p_table,
      col
    );
    execute sql;
  else
    -- No tenant scoping column found. Deny all access explicitly.
    execute format(
      'create policy %I on %s for all to authenticated using (false) with check (false)',
      policy_name,
      p_table
    );

    -- Super Admin: allow global SELECT even for non-tenant-scoped tables.
    execute format(
      'create policy %I on %s for select to authenticated using (coalesce((auth.jwt() -> ''app_metadata'' ->> ''is_super_admin'')::boolean, false) = true)',
      super_admin_select_policy,
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

-- Subscription / Billing (public)
select public.apply_org_rls('public.subscription_orders');
select public.apply_org_rls('public.subscription_payment_configs');

-- Content injection (public)
select public.apply_org_rls('public.strategic_content');

-- Nexus (prefixed tables)
select public.apply_org_rls('public.nexus_clients');
select public.apply_org_rls('public.nexus_tasks');
select public.apply_org_rls('public.nexus_time_entries');
select public.apply_org_rls('public.nexus_users');
select public.apply_org_rls('public.nexus_tenants');

-- Nexus (additional)
select public.apply_org_rls('public.nexus_team_events');
select public.apply_org_rls('public.nexus_leave_requests');
select public.apply_org_rls('public.nexus_event_attendance');
select public.apply_org_rls('public.nexus_employee_invitation_links');

-- System (prefixed tables)
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

-- Misrad / Client OS (prefixed tables)
select public.apply_org_rls('public.misrad_roles');
select public.apply_org_rls('public.misrad_permissions');
select public.apply_org_rls('public.misrad_integrations');
select public.apply_org_rls('public.misrad_support_tickets');
select public.apply_org_rls('public.misrad_calendar_sync_log');
select public.apply_org_rls('public.misrad_feature_requests');
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

do $$
declare
  r record;
  full_table text;
begin
  for r in
    select table_schema, table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
  loop
    if r.table_name in (
      '_prisma_migrations',
      'ai_provider_keys',
      'organizations',
      'system_settings',
      'social_system_settings',
      'help_videos',
      'partners',
      'client_dna',
      'business_metrics',
      'platform_credentials',
      'platform_quotas',
      'global_settings'
    ) then
      continue;
    end if;

    full_table := format('%I.%I', r.table_schema, r.table_name);
    perform public.apply_org_rls(full_table);
  end loop;
end
$$;

alter table public.organizations enable row level security;
alter table public.organizations force row level security;
drop policy if exists org_self_select on public.organizations;
drop policy if exists super_admin_select_all on public.organizations;
drop policy if exists super_admin_write_all on public.organizations;
create policy org_self_select on public.organizations
for select
to authenticated
using (id = public.current_organization_id());
create policy super_admin_select_all on public.organizations
for select
to authenticated
using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true);
create policy super_admin_write_all on public.organizations
for all
to authenticated
using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true)
with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true);

alter table public.system_settings enable row level security;
alter table public.system_settings force row level security;
drop policy if exists system_settings_public_read on public.system_settings;
drop policy if exists super_admin_select_all on public.system_settings;
drop policy if exists super_admin_write_all on public.system_settings;
create policy system_settings_public_read on public.system_settings
for select
to anon, authenticated
using (tenant_id is null);
create policy super_admin_select_all on public.system_settings
for select
to authenticated
using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true);
create policy super_admin_write_all on public.system_settings
for all
to authenticated
using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true)
with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true);

alter table public.social_system_settings enable row level security;
alter table public.social_system_settings force row level security;
drop policy if exists social_system_settings_public_read on public.social_system_settings;
drop policy if exists super_admin_select_all on public.social_system_settings;
drop policy if exists super_admin_write_all on public.social_system_settings;
create policy social_system_settings_public_read on public.social_system_settings
for select
to anon, authenticated
using (key = 'feature_flags');
create policy super_admin_select_all on public.social_system_settings
for select
to authenticated
using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true);
create policy super_admin_write_all on public.social_system_settings
for all
to authenticated
using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true)
with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true);

 alter table public.help_videos enable row level security;
 alter table public.help_videos force row level security;
 drop policy if exists help_videos_public_read on public.help_videos;
 drop policy if exists help_videos_super_admin_write on public.help_videos;
 create policy help_videos_public_read on public.help_videos
 for select
 to anon, authenticated
 using (true);
 create policy help_videos_super_admin_write on public.help_videos
 for all
 to authenticated
 using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true)
 with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true);

 alter table public.partners enable row level security;
 alter table public.partners force row level security;
 drop policy if exists partners_owner_or_super_admin_select on public.partners;
 drop policy if exists partners_super_admin_write on public.partners;
 create policy partners_owner_or_super_admin_select on public.partners
 for select
 to authenticated
 using (
   coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true
   or exists (
     select 1
     from public.social_users su
     join public.organizations o on o.owner_id = su.id
     where o.id = public.current_organization_id()
       and su.clerk_user_id = public.current_clerk_user_id()
   )
 );
 create policy partners_super_admin_write on public.partners
 for all
 to authenticated
 using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true)
 with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true);

 alter table public.client_dna enable row level security;
 alter table public.client_dna force row level security;
 drop policy if exists client_dna_org_member_all on public.client_dna;
 create policy client_dna_org_member_all on public.client_dna
 for all
 to authenticated
 using (
   public.is_member_of_org(public.current_organization_id())
   and exists (
     select 1
     from public.client_clients c
     where c.id = client_dna.client_id
       and c.organization_id = public.current_organization_id()
   )
 )
 with check (
   public.is_member_of_org(public.current_organization_id())
   and exists (
     select 1
     from public.client_clients c
     where c.id = client_dna.client_id
       and c.organization_id = public.current_organization_id()
   )
 );

alter table public.business_metrics enable row level security;
alter table public.business_metrics force row level security;
drop policy if exists business_metrics_org_member_all on public.business_metrics;
create policy business_metrics_org_member_all on public.business_metrics
for all
to authenticated
using (
  public.is_member_of_org(public.current_organization_id())
  and exists (
    select 1
    from public.client_clients c
    where c.id = business_metrics.client_id
      and c.organization_id = public.current_organization_id()
  )
)
with check (
  public.is_member_of_org(public.current_organization_id())
  and exists (
    select 1
    from public.client_clients c
    where c.id = business_metrics.client_id
      and c.organization_id = public.current_organization_id()
  )
);

alter table public.platform_credentials enable row level security;
alter table public.platform_credentials force row level security;
drop policy if exists platform_credentials_org_member_all on public.platform_credentials;
create policy platform_credentials_org_member_all on public.platform_credentials
for all
to authenticated
using (
  public.is_member_of_org(public.current_organization_id())
  and exists (
    select 1
    from public.client_clients c
    where c.id = platform_credentials.client_id
      and c.organization_id = public.current_organization_id()
  )
)
with check (
  public.is_member_of_org(public.current_organization_id())
  and exists (
    select 1
    from public.client_clients c
    where c.id = platform_credentials.client_id
      and c.organization_id = public.current_organization_id()
  )
);

alter table public.platform_quotas enable row level security;
alter table public.platform_quotas force row level security;
drop policy if exists platform_quotas_org_member_all on public.platform_quotas;
create policy platform_quotas_org_member_all on public.platform_quotas
for all
to authenticated
using (
  public.is_member_of_org(public.current_organization_id())
  and exists (
    select 1
    from public.client_clients c
    where c.id = platform_quotas.client_id
      and c.organization_id = public.current_organization_id()
  )
)
with check (
  public.is_member_of_org(public.current_organization_id())
  and exists (
    select 1
    from public.client_clients c
    where c.id = platform_quotas.client_id
      and c.organization_id = public.current_organization_id()
  )
);

alter table public.global_settings enable row level security;
alter table public.global_settings force row level security;
drop policy if exists global_settings_public_read on public.global_settings;
drop policy if exists global_settings_super_admin_write on public.global_settings;
create policy global_settings_public_read on public.global_settings
for select
to anon, authenticated
using (true);
create policy global_settings_super_admin_write on public.global_settings
for all
to authenticated
using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true)
with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true);

do $$
begin
  if to_regclass('public._prisma_migrations') is null then
    return;
  end if;

  execute 'alter table public._prisma_migrations enable row level security';
  execute 'alter table public._prisma_migrations force row level security';
  execute 'drop policy if exists deny_all on public._prisma_migrations';
  execute 'create policy deny_all on public._prisma_migrations for all to authenticated using (false) with check (false)';
  execute 'revoke all on table public._prisma_migrations from anon, authenticated';
  execute 'revoke all on table public._prisma_migrations from public';
end
$$;

do $$
begin
  if to_regclass('public.ai_provider_keys') is null then
    return;
  end if;

  execute 'alter table public.ai_provider_keys enable row level security';
  execute 'alter table public.ai_provider_keys force row level security';

  execute 'drop policy if exists org_isolation_all on public.ai_provider_keys';
  execute 'drop policy if exists super_admin_select_all on public.ai_provider_keys';
  execute 'drop policy if exists super_admin_write_requires_org on public.ai_provider_keys';
  execute 'drop policy if exists super_admin_write_all on public.ai_provider_keys';

  execute 'drop policy if exists deny_all on public.ai_provider_keys';
  execute 'create policy deny_all on public.ai_provider_keys for all to authenticated using (false) with check (false)';

  execute 'revoke all on table public.ai_provider_keys from anon, authenticated';
  execute 'revoke all on table public.ai_provider_keys from public';

  execute 'grant select, insert, update, delete on table public.ai_provider_keys to service_role';
end
$$;

commit;
