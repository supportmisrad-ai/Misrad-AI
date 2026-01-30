begin;

set local search_path = public;

alter table misrad_clients
  add column if not exists last_contact_at timestamptz null;

create index if not exists misrad_clients_org_last_contact_at_idx
  on misrad_clients (organization_id, last_contact_at);

with meeting_events as (
  select
    m.organization_id,
    m.client_id,
    coalesce(
      case
        when m.date ~ '^\\d{4}-\\d{2}-\\d{2}$' then (m.date || 'T00:00:00Z')::timestamptz
        when m.date ~ '^\\d{4}-\\d{2}-\\d{2}T' then m.date::timestamptz
        else null
      end,
      m.created_at
    ) as ts
  from misrad_meetings m
),
email_events as (
  select
    e.organization_id,
    e.client_id,
    coalesce(
      case
        when e.timestamp ~ '^\\d{4}-\\d{2}-\\d{2}$' then (e.timestamp || 'T00:00:00Z')::timestamptz
        when e.timestamp ~ '^\\d{4}-\\d{2}-\\d{2}T' then e.timestamp::timestamptz
        else null
      end,
      e.created_at
    ) as ts
  from misrad_emails e
  where e.client_id is not null
),
message_events as (
  select
    m.organization_id,
    cid as client_id,
    m.created_at as ts
  from (
    select
      mm.organization_id,
      array_remove(
        array[
          (case when mm.sender_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then mm.sender_id::uuid else null end),
          (case when mm.recipient_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then mm.recipient_id::uuid else null end)
        ],
        null
      ) as client_ids,
      mm.created_at
    from misrad_messages mm
  ) m
  cross join unnest(m.client_ids) as cid
  join misrad_clients c
    on c.organization_id = m.organization_id
   and c.id = cid
),
activity_events as (
  select
    a.organization_id,
    a.client_id,
    coalesce(
      case
        when a.date ~ '^\\d{4}-\\d{2}-\\d{2}$' then (a.date || 'T00:00:00Z')::timestamptz
        when a.date ~ '^\\d{4}-\\d{2}-\\d{2}T' then a.date::timestamptz
        else null
      end,
      a.created_at
    ) as ts
  from misrad_activity_logs a
),
events as (
  select * from meeting_events
  union all
  select * from email_events
  union all
  select * from message_events
  union all
  select * from activity_events
),
agg as (
  select
    organization_id,
    client_id,
    max(ts) as max_ts
  from events
  where client_id is not null and ts is not null
  group by 1, 2
)
update misrad_clients c
set last_contact_at = greatest(coalesce(c.last_contact_at, 'epoch'::timestamptz), agg.max_ts)
from agg
where c.id = agg.client_id
  and c.organization_id = agg.organization_id;

commit;
