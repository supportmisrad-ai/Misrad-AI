-- Create table for pending organization sign-up invitations (Super Admin flow)
-- This table is used by:
-- 1) app/actions/admin-organizations.ts (createOrganizationOrInviteOwner)
-- 2) app/api/webhooks/clerk/route.ts (on user.created/user.updated)

create table if not exists public.organization_signup_invitations (
  id uuid primary key default gen_random_uuid(),

  token text not null unique,
  owner_email text not null,
  organization_name text not null,
  desired_slug text not null,

  is_used boolean not null default false,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  used_at timestamptz null,
  expires_at timestamptz null,

  used_by_user_id uuid null,
  used_by_clerk_user_id text null,
  organization_id uuid null,

  metadata jsonb not null default '{}'::jsonb
);

create index if not exists organization_signup_invitations_owner_email_idx
  on public.organization_signup_invitations (owner_email);

create index if not exists organization_signup_invitations_is_used_idx
  on public.organization_signup_invitations (is_used);

create index if not exists organization_signup_invitations_is_active_idx
  on public.organization_signup_invitations (is_active);

create index if not exists organization_signup_invitations_expires_at_idx
  on public.organization_signup_invitations (expires_at);

create index if not exists organization_signup_invitations_org_id_idx
  on public.organization_signup_invitations (organization_id);
