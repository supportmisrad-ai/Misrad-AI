create table if not exists profiles (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete restrict,
  clerk_user_id text not null,
  email text,
  full_name text,
  role text,
  avatar_url text,
  phone text,
  location text,
  bio text,
  notification_preferences jsonb not null default '{}'::jsonb,
  two_factor_enabled boolean not null default false,
  ui_preferences jsonb not null default '{}'::jsonb,
  social_profile jsonb not null default '{}'::jsonb,
  billing_info jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, clerk_user_id)
);

create index if not exists profiles_organization_id_idx on profiles (organization_id);
create index if not exists profiles_clerk_user_id_idx on profiles (clerk_user_id);
