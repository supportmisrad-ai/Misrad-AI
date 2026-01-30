create extension if not exists "pgcrypto";

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  user_id uuid,

  name text not null,
  company_name text not null,
  business_id text,
  phone text,
  email text,
  avatar text,
  brand_voice text,
  posting_rhythm text,
  status text default 'Onboarding',
  onboarding_status text,
  invitation_token text,
  portal_token text not null,
  color text,

  plan text,
  monthly_fee numeric(10,2),
  next_payment_date date,
  next_payment_amount numeric(10,2),
  payment_status text,
  auto_reminders_enabled boolean default false,
  saved_card_thumbnail text,

  internal_notes text,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  deleted_by uuid
);

create index if not exists idx_clients_organization_id on clients(organization_id);
create index if not exists idx_clients_email on clients(email);
create index if not exists idx_clients_company_name on clients(company_name);
create unique index if not exists idx_clients_portal_token_unique on clients(portal_token);

create table if not exists client_dna (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,

  brand_summary text,
  voice_formal integer,
  voice_funny integer,
  voice_length integer,
  vocabulary_loved jsonb default '[]'::jsonb,
  vocabulary_forbidden jsonb default '[]'::jsonb,
  color_primary text,
  color_secondary text,
  strategy text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists idx_client_dna_client_id_unique on client_dna(client_id);
create index if not exists idx_client_dna_client_id on client_dna(client_id);

create table if not exists business_metrics (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,

  time_spent_minutes integer default 0,
  expected_hours numeric(5,2) default 0,
  punctuality_score integer default 0,
  responsiveness_score integer default 0,
  revision_count integer default 0,
  last_ai_business_audit text,
  days_overdue integer default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists idx_business_metrics_client_id_unique on business_metrics(client_id);
create index if not exists idx_business_metrics_client_id on business_metrics(client_id);

create table if not exists platform_credentials (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,

  platform text not null,
  username text,
  notes text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists idx_platform_credentials_client_id_platform_unique on platform_credentials(client_id, platform);
create index if not exists idx_platform_credentials_client_id on platform_credentials(client_id);

create table if not exists platform_quotas (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,

  platform text not null,
  monthly_limit integer default 0,
  current_usage integer default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists idx_platform_quotas_client_id_platform_unique on platform_quotas(client_id, platform);
create index if not exists idx_platform_quotas_client_id on platform_quotas(client_id);
