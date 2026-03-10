-- Create ai_chat_sessions table to store organization-scoped AI chat analytics
-- This matches the expectations of app/actions/ai-chat-sessions.ts and related services.

create table if not exists ai_chat_sessions (
  session_id        text primary key,
  organization_id   uuid not null,
  user_id           text not null,
  pathname          text not null,
  is_sales_mode     boolean not null default false,
  detected_name     text,
  detected_company  text,
  detected_industry text,
  detected_pain_points jsonb,
  detected_objections jsonb,
  detected_budget   text,
  detected_timeline text,
  messages_count    integer not null default 0,
  situation_type    text,
  started_at        timestamptz not null default now(),
  ended_at          timestamptz,
  duration_seconds  integer,
  final_outcome     text,
  user_rating       integer,
  user_feedback     text,
  helpful_yn        boolean,
  updated_at        timestamptz not null default now()
);

create index if not exists idx_ai_chat_sessions_org_started_at
  on ai_chat_sessions (organization_id, started_at desc);

-- Optional helper index for admin analytics by situation_type
create index if not exists idx_ai_chat_sessions_org_situation
  on ai_chat_sessions (organization_id, situation_type);

-- Messages table used by saveChatMessage (organization-scoped through executeRawOrgScoped)
create table if not exists ai_chat_messages (
  id           bigserial primary key,
  session_id   text not null references ai_chat_sessions(session_id) on delete cascade,
  role         text not null,
  content      text not null,
  quick_actions jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists idx_ai_chat_messages_session_created_at
  on ai_chat_messages (session_id, created_at);

