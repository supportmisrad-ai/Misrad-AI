create extension if not exists "uuid-ossp";

create table if not exists public.nexus_onboarding_settings (
  organization_id uuid primary key,
  template_key text not null,
  selected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nexus_billing_items (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null,
  item_key text not null,
  title text not null,
  cadence text not null,
  amount numeric null,
  currency text not null default 'ILS',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, item_key)
);

create index if not exists idx_nexus_billing_items_org on public.nexus_billing_items (organization_id);
