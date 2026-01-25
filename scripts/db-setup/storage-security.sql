-- ============================================================
-- Supabase Storage Security (Private buckets + RLS policies)
-- ============================================================
-- هدف: להפוך buckets לרלוונטיים ל-private ולהוסיף מדיניות גישה בטוחה.
--
-- עקרונות:
-- - buckets: public=false
-- - policies על storage.objects:
--   - SELECT + INSERT למשתמשים מורשים בלבד
--   - התאמה לפי organization_id שנמצא בנתיב (segment ראשון) או ב-metadata
--   - תאימות לאחור ל-bucket attachments שבחלק מהמקומות משתמש בנתיבים שמתחילים ב-userId
--
-- הערות:
-- - service_role עוקף RLS, ולכן server actions עם SERVICE_ROLE_KEY ימשיכו לעבוד.
-- - Signed URLs (createSignedUrl) נוצרים בצד שרת; ה-client לא צריך גישה ישירה ל-storage API.

begin;

-- 1) Ensure buckets are private
update storage.buckets
set public = false
where name in ('attachments', 'call-recordings', 'meeting-recordings', 'operations-files');

-- 2) Helper: get current org id from JWT (compatible with your existing RLS helpers)
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

-- 3) Helper: current clerk user id from JWT
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

-- 4) Helper: parse orgId from storage path (first segment)
create or replace function public.storage_path_org_id(p_path text)
returns uuid
language plpgsql
stable
set search_path = public
as $$
declare
  seg text;
  out_id uuid;
begin
  seg := split_part(coalesce(p_path, ''), '/', 1);
  if seg is null or length(trim(seg)) = 0 then
    return null;
  end if;

  begin
    out_id := seg::uuid;
  exception when others then
    return null;
  end;

  return out_id;
end;
$$;

-- 5) Helper: parse orgId from object metadata
create or replace function public.storage_metadata_org_id(p_metadata jsonb)
returns uuid
language sql
stable
set search_path = public
as $$
  select
    coalesce(
      nullif(p_metadata ->> 'organization_id', ''),
      nullif(p_metadata ->> 'org_id', ''),
      nullif(p_metadata ->> 'orgId', ''),
      nullif(p_metadata ->> 'tenant_id', '')
    )::uuid;
$$;

-- 6) Helper: verify membership in org
-- We support both profiles + social_users tables (existing in your DB).
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

-- 7) Enable + force RLS on storage.objects
alter table storage.objects enable row level security;
alter table storage.objects force row level security;

-- 8) Drop legacy policies that may keep storage public (idempotent)
-- Supabase projects sometimes come with permissive default policies (e.g. "Allow public read ...").
-- We remove only policies that clearly relate to our secured buckets or known permissive templates.
do $$
declare
  p record;
begin
  for p in
    select policyname, coalesce(qual, '') as qual, coalesce(with_check, '') as with_check
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
  loop
    if (
      p.policyname ilike 'Allow public read %'
      or p.policyname ilike 'Allow authenticated uploads %'
      or p.policyname ilike 'Allow users to delete own files %'
      or p.qual ilike '%bucket_id = ''attachments''%'
      or p.qual ilike '%bucket_id = ''call-recordings''%'
      or p.qual ilike '%bucket_id = ''meeting-recordings''%'
      or p.qual ilike '%bucket_id = ''operations-files''%'
      or p.with_check ilike '%bucket_id = ''attachments''%'
      or p.with_check ilike '%bucket_id = ''call-recordings''%'
      or p.with_check ilike '%bucket_id = ''meeting-recordings''%'
      or p.with_check ilike '%bucket_id = ''operations-files''%'
    ) then
      execute format('drop policy if exists %I on storage.objects', p.policyname);
    end if;
  end loop;
end
$$;

-- Drop our policies (safe rerun)
drop policy if exists "storage_objects_select_attachments" on storage.objects;
drop policy if exists "storage_objects_insert_attachments" on storage.objects;
drop policy if exists "storage_objects_select_call_recordings" on storage.objects;
drop policy if exists "storage_objects_insert_call_recordings" on storage.objects;
drop policy if exists "storage_objects_select_meeting_recordings" on storage.objects;
drop policy if exists "storage_objects_insert_meeting_recordings" on storage.objects;
drop policy if exists "storage_objects_select_operations_files" on storage.objects;
drop policy if exists "storage_objects_insert_operations_files" on storage.objects;

-- 9) SELECT policies
-- attachments:
-- - prefer org isolation via path or metadata
-- - backward compatible: allow user-owned paths that start with clerk user id
create policy "storage_objects_select_attachments"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'attachments'
  and (
    (
      public.storage_path_org_id(name) is not null
      and public.storage_path_org_id(name) = public.current_organization_id()
      and public.is_member_of_org(public.current_organization_id())
    )
    or (
      public.storage_metadata_org_id(metadata) is not null
      and public.storage_metadata_org_id(metadata) = public.current_organization_id()
      and public.is_member_of_org(public.current_organization_id())
    )
    or (
      split_part(name, '/', 1) = public.current_clerk_user_id()
    )
  )
);

-- call-recordings (path prefix orgId/...)
create policy "storage_objects_select_call_recordings"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'call-recordings'
  and (
    (
      public.storage_path_org_id(name) = public.current_organization_id()
      and public.is_member_of_org(public.current_organization_id())
    )
    or (
      public.storage_metadata_org_id(metadata) = public.current_organization_id()
      and public.is_member_of_org(public.current_organization_id())
    )
  )
);

-- meeting-recordings (path prefix orgId/...)
create policy "storage_objects_select_meeting_recordings"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'meeting-recordings'
  and (
    (
      public.storage_path_org_id(name) = public.current_organization_id()
      and public.is_member_of_org(public.current_organization_id())
    )
    or (
      public.storage_metadata_org_id(metadata) = public.current_organization_id()
      and public.is_member_of_org(public.current_organization_id())
    )
  )
);

-- operations-files:
-- allow via path orgId prefix (new) OR metadata org id (backward compatible).
create policy "storage_objects_select_operations_files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'operations-files'
  and (
    (
      public.storage_path_org_id(name) = public.current_organization_id()
      and public.is_member_of_org(public.current_organization_id())
    )
    or (
      public.storage_metadata_org_id(metadata) = public.current_organization_id()
      and public.is_member_of_org(public.current_organization_id())
    )
  )
);

-- 10) INSERT policies
-- attachments: allow inserts if orgId is present in path OR metadata OR legacy user-owned path.
create policy "storage_objects_insert_attachments"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'attachments'
  and (
    (
      public.storage_path_org_id(name) is not null
      and public.storage_path_org_id(name) = public.current_organization_id()
      and public.is_member_of_org(public.current_organization_id())
    )
    or (
      public.storage_metadata_org_id(metadata) is not null
      and public.storage_metadata_org_id(metadata) = public.current_organization_id()
      and public.is_member_of_org(public.current_organization_id())
    )
    or (
      split_part(name, '/', 1) = public.current_clerk_user_id()
    )
  )
);

-- call-recordings
create policy "storage_objects_insert_call_recordings"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'call-recordings'
  and (
    (
      public.storage_path_org_id(name) = public.current_organization_id()
      and public.is_member_of_org(public.current_organization_id())
    )
    or (
      public.storage_metadata_org_id(metadata) = public.current_organization_id()
      and public.is_member_of_org(public.current_organization_id())
    )
  )
);

-- meeting-recordings
create policy "storage_objects_insert_meeting_recordings"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'meeting-recordings'
  and (
    (
      public.storage_path_org_id(name) = public.current_organization_id()
      and public.is_member_of_org(public.current_organization_id())
    )
    or (
      public.storage_metadata_org_id(metadata) = public.current_organization_id()
      and public.is_member_of_org(public.current_organization_id())
    )
  )
);

-- operations-files: allow via path orgId prefix (new) OR metadata org id (backward compatible)
create policy "storage_objects_insert_operations_files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'operations-files'
  and (
    (
      public.storage_path_org_id(name) = public.current_organization_id()
      and public.is_member_of_org(public.current_organization_id())
    )
    or (
      public.storage_metadata_org_id(metadata) = public.current_organization_id()
      and public.is_member_of_org(public.current_organization_id())
    )
  )
);

commit;
