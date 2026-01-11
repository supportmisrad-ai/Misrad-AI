-- Fix Supabase linter warning: function_search_path_mutable
-- Locks down search_path for selected functions to prevent object shadowing.
-- Applies to all overloads of each function name in schema public.

begin;

do $$
declare
  fn_name text;
  rec record;
begin
  foreach fn_name in array array[
    'update_updated_at_column',
    'update_integrations_updated_at',
    'update_roles_updated_at',
    'get_user_permissions',
    'user_has_permission',
    'generate_invitation_token',
    'update_invitation_links_updated_at',
    'generate_ticket_number',
    'set_ticket_number',
    'set_resolved_at',
    'set_feature_completed_at',
    'update_employee_invitation_updated_at',
    'update_system_settings_updated_at',
    'get_department_manager',
    'get_users_by_department',
    'current_organization_id',
    'apply_org_rls'
  ]
  loop
    for rec in
      select p.oid::regprocedure as regproc
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = fn_name
    loop
      execute format('alter function %s set search_path = pg_catalog, public;', rec.regproc);
    end loop;
  end loop;
end $$;

commit;
