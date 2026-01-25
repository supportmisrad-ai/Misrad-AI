-- Manual migration: move Operations runtime DDL (CREATE/ALTER) into migrations.

-- Ensure uuid generator exists (Supabase typically has this, but keep it idempotent).
create extension if not exists "uuid-ossp";

-- ============================================
-- Operations: stock movements
-- ============================================
create table if not exists operations_stock_movements (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null,
  item_id uuid not null,
  work_order_id uuid null,
  qty numeric(12,3) not null,
  direction text not null,
  created_by_type text not null default 'INTERNAL',
  created_by_ref text null,
  note text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_operations_stock_movements_org_id on operations_stock_movements (organization_id);
create index if not exists idx_operations_stock_movements_work_order_id on operations_stock_movements (work_order_id);
create index if not exists idx_operations_stock_movements_item_id on operations_stock_movements (item_id);

-- ============================================
-- Operations: locations
-- ============================================
create table if not exists operations_locations (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_operations_locations_org_id on operations_locations (organization_id);
create unique index if not exists uq_operations_locations_org_name on operations_locations (organization_id, lower(name));

-- ============================================
-- Operations: work order types
-- ============================================
create table if not exists operations_work_order_types (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_operations_work_order_types_org_id on operations_work_order_types (organization_id);
create unique index if not exists uq_operations_work_order_types_org_name on operations_work_order_types (organization_id, lower(name));

-- ============================================
-- Operations: contractor tokens
-- ============================================
create table if not exists operations_contractor_tokens (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null,
  token_hash text not null,
  contractor_label text null,
  expires_at timestamptz not null,
  revoked_at timestamptz null,
  created_by_ref text null,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_operations_contractor_tokens_token_hash on operations_contractor_tokens (token_hash);
create index if not exists idx_operations_contractor_tokens_org_id on operations_contractor_tokens (organization_id);

-- ============================================
-- Operations: work order attachments
-- ============================================
create table if not exists operations_work_order_attachments (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null,
  work_order_id uuid not null,
  storage_bucket text not null default 'operations-files',
  storage_path text not null,
  url text not null,
  mime_type text null,
  created_by_type text not null default 'INTERNAL',
  created_by_ref text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_ops_wo_attachments_org_id on operations_work_order_attachments (organization_id);
create index if not exists idx_ops_wo_attachments_work_order_id on operations_work_order_attachments (work_order_id);

-- ============================================
-- Operations: work order checkins
-- ============================================
create table if not exists operations_work_order_checkins (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null,
  work_order_id uuid not null,
  lat double precision not null,
  lng double precision not null,
  accuracy double precision null,
  created_by_type text not null default 'INTERNAL',
  created_by_ref text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_ops_wo_checkins_org_id on operations_work_order_checkins (organization_id);
create index if not exists idx_ops_wo_checkins_work_order_id on operations_work_order_checkins (work_order_id);

-- ============================================
-- Operations: work_orders columns (previously added at runtime)
-- ============================================
alter table operations_work_orders
  add column if not exists assigned_technician_id uuid null;

create index if not exists idx_operations_work_orders_assigned_technician_id on operations_work_orders (assigned_technician_id);

alter table operations_work_orders
  add column if not exists completion_signature_url text null;

create index if not exists idx_operations_work_orders_completion_signature_url on operations_work_orders (completion_signature_url);

alter table operations_work_orders
  add column if not exists installation_lat double precision null;

alter table operations_work_orders
  add column if not exists installation_lng double precision null;

create index if not exists idx_operations_work_orders_installation_lat on operations_work_orders (installation_lat);
create index if not exists idx_operations_work_orders_installation_lng on operations_work_orders (installation_lng);
