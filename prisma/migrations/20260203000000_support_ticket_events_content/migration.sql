do $$
begin
  if to_regclass('public.support_ticket_events') is not null then
    alter table public.support_ticket_events
      add column if not exists content text;
  end if;
end $$;
