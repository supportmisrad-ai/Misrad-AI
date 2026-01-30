begin;

set local search_path = public;

-- ------------------------------------------------------------
-- System Calendar: typed occurs_at for fast filtering/sorting
-- ------------------------------------------------------------
alter table system_calendar_events
  add column if not exists occurs_at timestamptz null;

create index if not exists system_calendar_events_org_occurs_at_idx
  on system_calendar_events (organization_id, occurs_at);

create or replace function system_calendar_events_compute_occurs_at(p_date text, p_time text)
returns timestamptz
language plpgsql
as $$
declare
  d text;
  t text;
  ts timestamptz;
begin
  d := nullif(trim(coalesce(p_date, '')), '');
  t := nullif(trim(coalesce(p_time, '')), '');
  if d is null then
    return null;
  end if;

  -- Prefer ISO date
  if d ~ '^\d{4}-\d{2}-\d{2}$' then
    if t is not null and t ~ '^\d{2}:\d{2}$' then
      -- Interpret calendar times in IL local time (business expectation)
      ts := ((d || ' ' || t || ':00')::timestamp at time zone 'Asia/Jerusalem');
      return ts;
    end if;
    return ((d || ' 00:00:00')::timestamp at time zone 'Asia/Jerusalem');
  end if;

  -- If already contains timestamp
  if d ~ '^\d{4}-\d{2}-\d{2}T' then
    begin
      return d::timestamptz;
    exception when others then
      return null;
    end;
  end if;

  return null;
end;
$$;

create or replace function system_calendar_events_set_occurs_at()
returns trigger
language plpgsql
as $$
begin
  if new.occurs_at is null then
    new.occurs_at := system_calendar_events_compute_occurs_at(new.date, new.time);
  end if;
  return new;
end;
$$;

do $$ begin
  create trigger system_calendar_events_set_occurs_at
  before insert or update of date, time on system_calendar_events
  for each row execute function system_calendar_events_set_occurs_at();
exception when duplicate_object then null; end $$;

update system_calendar_events e
set occurs_at = system_calendar_events_compute_occurs_at(e.date, e.time)
where e.occurs_at is null;

-- ------------------------------------------------------------
-- Finance: typed date_at / due_date_at for invoices
-- ------------------------------------------------------------
alter table misrad_invoices
  add column if not exists date_at date null;

alter table misrad_invoices
  add column if not exists due_date_at date null;

create index if not exists misrad_invoices_org_date_at_idx
  on misrad_invoices (organization_id, date_at);

create index if not exists misrad_invoices_org_due_date_at_idx
  on misrad_invoices (organization_id, due_date_at);

create or replace function misrad_invoices_parse_date(p text)
returns date
language plpgsql
as $$
declare
  s text;
begin
  s := nullif(trim(coalesce(p, '')), '');
  if s is null then
    return null;
  end if;

  if s ~ '^\d{4}-\d{2}-\d{2}$' then
    return s::date;
  end if;

  if s ~ '^\d{2}\.\d{1,2}\.\d{4}$' then
    return to_date(s, 'DD.MM.YYYY');
  end if;

  if s ~ '^\d{4}-\d{2}-\d{2}T' then
    begin
      return (s::timestamptz)::date;
    exception when others then
      return null;
    end;
  end if;

  return null;
end;
$$;

create or replace function misrad_invoices_set_typed_dates()
returns trigger
language plpgsql
as $$
declare
  due_raw text;
begin
  if new.date_at is null then
    new.date_at := misrad_invoices_parse_date(new.date);
  end if;

  -- support both column names for legacy DBs (due_date vs "dueDate") without
  -- referencing a possibly-missing field.
  if new.due_date_at is null then
    due_raw := nullif(trim(coalesce(to_jsonb(new)->>'due_date', to_jsonb(new)->>'dueDate', '')), '');
    new.due_date_at := misrad_invoices_parse_date(due_raw);
  end if;

  return new;
end;
$$;

do $$ begin
  create trigger misrad_invoices_set_typed_dates
  before insert or update on misrad_invoices
  for each row execute function misrad_invoices_set_typed_dates();
exception when duplicate_object then null; end $$;

update misrad_invoices i
set date_at = coalesce(i.date_at, misrad_invoices_parse_date(i.date))
where i.date_at is null;

update misrad_invoices i
set due_date_at = coalesce(
  i.due_date_at,
  misrad_invoices_parse_date(
    coalesce(
      nullif(trim(coalesce(to_jsonb(i)->>'due_date', '')), ''),
      nullif(trim(coalesce(to_jsonb(i)->>'dueDate', '')), '')
    )
  )
)
where i.due_date_at is null;

-- ------------------------------------------------------------
-- Meetings: typed meeting_at for fast filtering/sorting
-- ------------------------------------------------------------
alter table misrad_meetings
  add column if not exists meeting_at timestamptz null;

create index if not exists misrad_meetings_org_meeting_at_idx
  on misrad_meetings (organization_id, meeting_at);

create index if not exists misrad_meetings_client_meeting_at_idx
  on misrad_meetings (client_id, meeting_at);

create or replace function misrad_meetings_parse_ts(p text)
returns timestamptz
language plpgsql
as $$
declare
  s text;
begin
  s := nullif(trim(coalesce(p, '')), '');
  if s is null then
    return null;
  end if;

  if s ~ '^\d{4}-\d{2}-\d{2}T' then
    begin
      return s::timestamptz;
    exception when others then
      return null;
    end;
  end if;

  if s ~ '^\d{4}-\d{2}-\d{2}$' then
    return ((s || ' 00:00:00')::timestamp at time zone 'Asia/Jerusalem');
  end if;

  if s ~ '^\d{2}\.\d{1,2}\.\d{4}$' then
    return (to_date(s, 'DD.MM.YYYY')::timestamp at time zone 'Asia/Jerusalem');
  end if;

  return null;
end;
$$;

create or replace function misrad_meetings_set_meeting_at()
returns trigger
language plpgsql
as $$
begin
  if new.meeting_at is null then
    new.meeting_at := coalesce(misrad_meetings_parse_ts(new.date), new.created_at);
  end if;
  return new;
end;
$$;

do $$ begin
  create trigger misrad_meetings_set_meeting_at
  before insert or update of date on misrad_meetings
  for each row execute function misrad_meetings_set_meeting_at();
exception when duplicate_object then null; end $$;

update misrad_meetings m
set meeting_at = coalesce(m.meeting_at, misrad_meetings_parse_ts(m.date), m.created_at)
where m.meeting_at is null;

-- ------------------------------------------------------------
-- Call Analyses: typed call_at for fast filtering/sorting
-- ------------------------------------------------------------
alter table system_call_analyses
  add column if not exists call_at timestamptz null;

create index if not exists system_call_analyses_org_call_at_idx
  on system_call_analyses (organization_id, call_at);

create or replace function system_call_analyses_set_call_at()
returns trigger
language plpgsql
as $$
begin
  if new.call_at is null then
    new.call_at := coalesce(misrad_meetings_parse_ts(new.date), new.created_at);
  end if;
  return new;
end;
$$;

do $$ begin
  create trigger system_call_analyses_set_call_at
  before insert or update of date on system_call_analyses
  for each row execute function system_call_analyses_set_call_at();
exception when duplicate_object then null; end $$;

update system_call_analyses a
set call_at = coalesce(a.call_at, misrad_meetings_parse_ts(a.date), a.created_at)
where a.call_at is null;

commit;
