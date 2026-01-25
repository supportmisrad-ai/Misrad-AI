-- Add route_prefix support for knowledge base route -> video mapping

alter table help_videos add column if not exists route_prefix text;

create index if not exists idx_help_videos_route_prefix on help_videos (route_prefix);
create index if not exists idx_help_videos_module_route_prefix on help_videos (module_key, route_prefix);
