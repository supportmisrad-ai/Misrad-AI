create table if not exists global_settings (
  id text primary key default 'global',
  windows_download_url text null,
  android_download_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into global_settings (id)
values ('global')
on conflict (id) do nothing;

create index if not exists idx_global_settings_updated_at on global_settings (updated_at);
