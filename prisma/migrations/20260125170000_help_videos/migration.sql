create extension if not exists "uuid-ossp";

create table if not exists help_videos (
  id uuid primary key default uuid_generate_v4(),
  module_key text not null,
  title text not null,
  video_url text not null,
  "order" integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint help_videos_module_key_check check (module_key in ('nexus','system','social','finance','client','operations'))
);

create index if not exists idx_help_videos_module_order on help_videos (module_key, "order");
create index if not exists idx_help_videos_module_key on help_videos (module_key);
