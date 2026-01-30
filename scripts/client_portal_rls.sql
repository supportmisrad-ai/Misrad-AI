-- Client Portal RLS (Clerk-based)
--
-- Assumptions:
-- - Your requests to Supabase include a JWT where the Clerk user id is in claim `sub`.
--   (Many Clerk->Supabase setups do this via a custom JWT template.)
-- - Portal users are mapped in public.client_portal_users (organization_id, client_id, clerk_user_id)
--
-- If your claim name differs (e.g. `clerk_user_id`), adjust the function below.

create or replace function public.current_clerk_user_id()
returns text
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '');
$$;

create or replace function public.current_portal_client_ids()
returns table(client_id uuid)
language sql
stable
as $$
  select cpu.client_id
  from public.client_portal_users cpu
  where cpu.clerk_user_id = public.current_clerk_user_id();
$$;

-- Enable RLS
alter table public.client_portal_users enable row level security;
alter table public.client_tasks enable row level security;
alter table public.client_sessions enable row level security;
alter table public.client_feedbacks enable row level security;
alter table public.client_portal_content enable row level security;
alter table public.client_shared_files enable row level security;
alter table public.client_documents enable row level security;
alter table public.client_document_files enable row level security;
alter table public.client_approvals enable row level security;

-- Portal users can only see their own mapping rows
create policy "portal_read_own_mapping" on public.client_portal_users
for select
using (
  clerk_user_id = public.current_clerk_user_id()
);

-- Shared helper: allow read when row.client_id is in mapped client ids
-- Client Tasks
create policy "portal_read_client_tasks" on public.client_tasks
for select
using (
  client_id in (select client_id from public.current_portal_client_ids())
);

-- Client Sessions
create policy "portal_read_client_sessions" on public.client_sessions
for select
using (
  client_id in (select client_id from public.current_portal_client_ids())
);

-- Client Feedbacks
create policy "portal_read_client_feedbacks" on public.client_feedbacks
for select
using (
  client_id in (select client_id from public.current_portal_client_ids())
);

-- Client Portal Content
create policy "portal_read_client_portal_content" on public.client_portal_content
for select
using (
  client_id in (select client_id from public.current_portal_client_ids())
  and coalesce(is_published, false) = true
);

-- Shared Files
create policy "portal_read_client_shared_files" on public.client_shared_files
for select
using (
  client_id in (select client_id from public.current_portal_client_ids())
  and is_visible_to_client = true
);

-- Documents
create policy "portal_read_client_documents" on public.client_documents
for select
using (
  client_id in (select client_id from public.current_portal_client_ids())
  and is_visible_to_client = true
);

-- Document Files
create policy "portal_read_client_document_files" on public.client_document_files
for select
using (
  client_id in (select client_id from public.current_portal_client_ids())
);

-- Approvals
create policy "portal_read_client_approvals" on public.client_approvals
for select
using (
  client_id in (select client_id from public.current_portal_client_ids())
);
