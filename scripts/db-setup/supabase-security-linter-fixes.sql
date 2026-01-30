begin;

-- =====================================================================
-- Supabase Database Linter - Security Fixes (RLS / Function Search Path / Extensions)
-- =====================================================================

-- 1) Move pgvector extension out of public schema
create schema if not exists extensions;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'vector') then
    execute 'alter extension vector set schema extensions';
  else
    execute 'create extension if not exists vector with schema extensions';
  end if;
end
$$;

-- 2) Helper: get current org id from JWT app_metadata
do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'current_organization_id'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    execute $sql$
      create function public.current_organization_id()
      returns uuid
      language sql
      stable
      set search_path = public
      as $fn$
        select nullif((auth.jwt() -> 'app_metadata' ->> 'organization_id'), '')::uuid;
      $fn$;
    $sql$;
  end if;
end
$$;

-- 3) Helper: apply org-scoped RLS to a given table (supports organization_id / tenant_id / client_id)
do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'apply_org_rls'
      and pg_get_function_identity_arguments(p.oid) = 'p_table text'
  ) then
    execute $sql$
      create function public.apply_org_rls(p_table text)
      returns void
      language plpgsql
      set search_path = public
      as $fn$
      declare
        tbl regclass;
        policy_name text := 'org_isolation_all';
        schema_name text;
        table_name_only text;
        has_org_id boolean;
        has_tenant_id boolean;
        has_client_id boolean;
        clients_has_org_id boolean;
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
        ) into has_org_id;

        select exists(
          select 1
          from information_schema.columns
          where table_schema = schema_name
            and table_name = table_name_only
            and column_name = 'tenant_id'
        ) into has_tenant_id;

        select exists(
          select 1
          from information_schema.columns
          where table_schema = schema_name
            and table_name = table_name_only
            and column_name = 'client_id'
        ) into has_client_id;

        select exists(
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = 'clients'
            and column_name = 'organization_id'
        ) into clients_has_org_id;

        -- Always enable + force RLS first.
        execute format('alter table %s enable row level security', p_table);
        execute format('alter table %s force row level security', p_table);

        -- Recreate policy
        execute format('drop policy if exists %I on %s', policy_name, p_table);

        if has_org_id then
          sql := format(
            'create policy %I on %s for all to authenticated using (organization_id = public.current_organization_id()) with check (organization_id = public.current_organization_id())',
            policy_name,
            p_table
          );
          execute sql;

        elsif has_tenant_id then
          sql := format(
            'create policy %I on %s for all to authenticated using (tenant_id = public.current_organization_id()) with check (tenant_id = public.current_organization_id())',
            policy_name,
            p_table
          );
          execute sql;

        elsif has_client_id and clients_has_org_id then
          -- Scope via clients.organization_id
          sql := format(
            'create policy %I on %s for all to authenticated using (exists (select 1 from public.clients c where c.id = client_id and c.organization_id = public.current_organization_id())) with check (exists (select 1 from public.clients c where c.id = client_id and c.organization_id = public.current_organization_id()))',
            policy_name,
            p_table
          );
          execute sql;

        else
          -- No tenant scoping column found. Deny all access explicitly.
          execute format(
            'create policy %I on %s for all to authenticated using (false) with check (false)',
            policy_name,
            p_table
          );
        end if;
      end;
      $fn$;
    $sql$;
  end if;
end
$$;

-- 4) Apply to tables flagged by Supabase linter + critical tables
select public.apply_org_rls('public.profiles');
select public.apply_org_rls('public.organization_settings');

select public.apply_org_rls('public.clients');
select public.apply_org_rls('public.client_dna');
select public.apply_org_rls('public.business_metrics');
select public.apply_org_rls('public.platform_credentials');
select public.apply_org_rls('public.platform_quotas');

select public.apply_org_rls('public.ai_embeddings');
select public.apply_org_rls('public.ai_usage_logs');
select public.apply_org_rls('public.ai_feature_settings');
select public.apply_org_rls('public.ai_model_aliases');

select public.apply_org_rls('public.nexus_billing_items');
select public.apply_org_rls('public.nexus_onboarding_settings');

-- 5) Sensitive data lockdown: ai_provider_keys must not be exposed via PostgREST
--    (no privileges for anon/authenticated + deny-all policy; only service_role/DB owner can access)
do $$
begin
  if to_regclass('public.ai_provider_keys') is null then
    return;
  end if;

  execute 'alter table public.ai_provider_keys enable row level security';
  execute 'alter table public.ai_provider_keys force row level security';

  -- Ensure no other policies are left on this sensitive table.
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

-- 6) Function search_path hardening
--    Note: ai_semantic_search needs extensions schema for the vector type.
do $$
declare
  r record;
begin
  -- All AI functions (keep minimal search_path)
  for r in
    select
      n.nspname as schema_name,
      p.proname as func_name,
      pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname ~ '^ai_'
      and p.proname <> 'ai_semantic_search'
  loop
    execute format(
      'alter function %I.%I(%s) set search_path = public',
      r.schema_name,
      r.func_name,
      r.args
    );
  end loop;

  -- ai_semantic_search needs extensions schema for the vector type
  for r in
    select
      n.nspname as schema_name,
      p.proname as func_name,
      pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'ai_semantic_search'
  loop
    execute format(
      'alter function %I.%I(%s) set search_path = public, extensions',
      r.schema_name,
      r.func_name,
      r.args
    );
  end loop;

  -- Non-AI functions flagged by linter
  for r in
    select
      n.nspname as schema_name,
      p.proname as func_name,
      pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('set_updated_at')
  loop
    execute format(
      'alter function %I.%I(%s) set search_path = public',
      r.schema_name,
      r.func_name,
      r.args
    );
  end loop;
end
$$;

commit;
