-- supabase-final-migration.sql
-- Planning artifact generated from Downloads/client-os reverse-engineering.
-- Safe to review. Do NOT run in production until approved.

begin;

-- Extensions
create extension if not exists "pgcrypto";

-- NOTE: This migration creates only Client OS tables (misrad_*).
-- It does not modify existing tables.

-- 0) Enum types
do $$ begin
  create type misrad_health_status as enum ('CRITICAL','AT_RISK','STABLE','THRIVING');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_sentiment as enum ('POSITIVE','NEUTRAL','NEGATIVE','ANXIOUS');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_client_status as enum ('ACTIVE','LEAD','ARCHIVED','LOST','CHURNED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_client_type as enum ('RETAINER','PROJECT','HOURLY');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_journey_stage_status as enum ('COMPLETED','ACTIVE','PENDING');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_opportunity_status as enum ('NEW','PROPOSED','CLOSED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_success_goal_status as enum ('IN_PROGRESS','ACHIEVED','AT_RISK');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_client_action_type as enum ('APPROVAL','UPLOAD','SIGNATURE','FORM','FEEDBACK');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_client_action_status as enum ('PENDING','COMPLETED','OVERDUE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_assigned_form_status as enum ('SENT','OPENED','IN_PROGRESS','COMPLETED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_feedback_sentiment as enum ('POSITIVE','NEUTRAL','NEGATIVE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_feedback_source as enum ('EMAIL_SURVEY','PLATFORM_POPUP','WHATSAPP_BOT','EXIT_INTERVIEW','PORTAL_FRICTION');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_roi_category as enum ('REVENUE_LIFT','COST_SAVING','EFFICIENCY','REFUND');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_asset_type as enum ('PDF','IMAGE','LINK','FIGMA','DOC');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_asset_category as enum ('BRANDING','LEGAL','INPUT','STRATEGY');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_uploaded_by as enum ('CLIENT','AGENCY');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_deliverable_type as enum ('CAMPAIGN','REPORT','DESIGN','STRATEGY','DEV');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_deliverable_status as enum ('DRAFT','IN_REVIEW','APPROVED','PUBLISHED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_stakeholder_role as enum ('CHAMPION','DECISION_MAKER','INFLUENCER','BLOCKER','GATEKEEPER','USER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_meeting_location as enum ('ZOOM','FRONTAL','PHONE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_meeting_file_type as enum ('PDF','DOC','IMG');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_activity_log_type as enum ('EMAIL','MEETING','DELIVERABLE','SYSTEM','FINANCIAL','STATUS_CHANGE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_invoice_status as enum ('PAID','PENDING','OVERDUE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_agreement_type as enum ('MSA','SOW','NDA','ADDENDUM');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_agreement_status as enum ('ACTIVE','EXPIRED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_cycle_status as enum ('RECRUITING','ACTIVE','COMPLETED','CANCELLED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_group_event_type as enum ('WEBINAR','WORKSHOP','MASTERCLASS');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_group_event_status as enum ('UPCOMING','COMPLETED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_task_priority as enum ('HIGH','NORMAL','LOW');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_task_status as enum ('PENDING','COMPLETED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_liability_risk_level as enum ('HIGH','MEDIUM','LOW');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_field_type as enum ('TEXT','TEXTAREA','SELECT','UPLOAD','DATE','CHECKBOX','RADIO');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_form_category as enum ('ONBOARDING','FEEDBACK','STRATEGY');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_workflow_item_type as enum ('MEETING_ZOOM','MEETING_FRONTAL','TASK_CLIENT','TASK_AGENCY','FORM_SEND','CONTENT_DELIVERY');
exception when duplicate_object then null; end $$;

do $$ begin
  create type misrad_notification_type as enum ('ALERT','MESSAGE','SUCCESS','TASK','SYSTEM');
exception when duplicate_object then null; end $$;

-- 1) Core tables
create table if not exists misrad_clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,

  name text not null,
  industry text not null,
  employee_count int not null,
  logo_initials text not null,

  health_score int not null,
  health_status misrad_health_status not null,
  status misrad_client_status not null,
  type misrad_client_type not null,

  tags text[] not null default '{}',

  monthly_retainer int not null,
  profit_margin int not null,
  lifetime_value int not null,
  hours_logged int not null,
  internal_hourly_rate int not null,
  direct_expenses int not null,
  profitability_verdict text not null,

  last_contact text not null,
  next_renewal text not null,
  main_contact text not null,
  main_contact_role text not null,

  strengths text[] not null default '{}',
  weaknesses text[] not null default '{}',
  sentiment_trend misrad_sentiment[] not null default '{}',

  referral_status text not null,

  cancellation_date text,
  cancellation_reason text,
  cancellation_note text,

  cycle_id uuid,

  health_breakdown jsonb not null default '{}'::jsonb,
  engagement_metrics jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists misrad_clients_org_idx on misrad_clients(organization_id);
create index if not exists misrad_clients_cycle_idx on misrad_clients(cycle_id);

create table if not exists misrad_journey_stages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id uuid not null references misrad_clients(id) on delete cascade,

  name text not null,
  status misrad_journey_stage_status not null,
  date text,
  completion_percentage int,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists misrad_journey_stages_org_idx on misrad_journey_stages(organization_id);
create index if not exists misrad_journey_stages_client_idx on misrad_journey_stages(client_id);

create table if not exists misrad_milestones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id uuid not null references misrad_clients(id) on delete cascade,
  stage_id uuid not null references misrad_journey_stages(id) on delete cascade,

  label text not null,
  is_completed boolean not null,
  required boolean not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists misrad_milestones_org_idx on misrad_milestones(organization_id);
create index if not exists misrad_milestones_client_idx on misrad_milestones(client_id);
create index if not exists misrad_milestones_stage_idx on misrad_milestones(stage_id);

create table if not exists misrad_opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id uuid not null references misrad_clients(id) on delete cascade,

  title text not null,
  value int not null,
  match_score int not null,
  status misrad_opportunity_status not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists misrad_opportunities_org_idx on misrad_opportunities(organization_id);
create index if not exists misrad_opportunities_client_idx on misrad_opportunities(client_id);

create table if not exists misrad_success_goals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id uuid not null references misrad_clients(id) on delete cascade,

  title text not null,
  metric_current double precision not null,
  metric_target double precision not null,
  unit text not null,
  deadline text not null,
  status misrad_success_goal_status not null,
  last_updated text not null,
  ai_forecast text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists misrad_success_goals_org_idx on misrad_success_goals(organization_id);
create index if not exists misrad_success_goals_client_idx on misrad_success_goals(client_id);

create table if not exists misrad_metric_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id uuid not null references misrad_clients(id) on delete cascade,
  goal_id uuid not null references misrad_success_goals(id) on delete cascade,

  date text not null,
  value double precision not null,

  created_at timestamptz not null default now()
);

create index if not exists misrad_metric_history_org_idx on misrad_metric_history(organization_id);
create index if not exists misrad_metric_history_client_idx on misrad_metric_history(client_id);
create index if not exists misrad_metric_history_goal_idx on misrad_metric_history(goal_id);

create table if not exists misrad_client_handoffs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id uuid not null unique references misrad_clients(id) on delete cascade,

  sales_rep text not null,
  handoff_date text not null,
  key_promises text[] not null default '{}',
  main_pain_point text not null,
  success_definition_30_days text not null,
  notes text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists misrad_client_handoffs_org_idx on misrad_client_handoffs(organization_id);

create table if not exists misrad_roi_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id uuid not null references misrad_clients(id) on delete cascade,

  date text not null,
  value double precision not null,
  description text not null,
  category misrad_roi_category not null,

  created_at timestamptz not null default now()
);

create index if not exists misrad_roi_records_org_idx on misrad_roi_records(organization_id);
create index if not exists misrad_roi_records_client_idx on misrad_roi_records(client_id);
create index if not exists misrad_roi_records_category_idx on misrad_roi_records(category);

create table if not exists misrad_client_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id uuid not null references misrad_clients(id) on delete cascade,

  title text not null,
  description text not null,
  type misrad_client_action_type not null,
  status misrad_client_action_status not null,
  due_date text not null,
  is_blocking boolean not null,
  last_reminder_sent text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists misrad_client_actions_org_idx on misrad_client_actions(organization_id);
create index if not exists misrad_client_actions_client_idx on misrad_client_actions(client_id);
create index if not exists misrad_client_actions_status_idx on misrad_client_actions(status);

create table if not exists misrad_assigned_forms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id uuid not null references misrad_clients(id) on delete cascade,

  template_id text not null,
  title text not null,
  status misrad_assigned_form_status not null,
  progress int not null,
  date_sent text not null,
  last_activity text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists misrad_assigned_forms_org_idx on misrad_assigned_forms(organization_id);
create index if not exists misrad_assigned_forms_client_idx on misrad_assigned_forms(client_id);
create index if not exists misrad_assigned_forms_template_idx on misrad_assigned_forms(template_id);

create table if not exists misrad_feedback_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id uuid not null references misrad_clients(id) on delete cascade,

  client_name text not null,
  score int not null,
  comment text not null,
  date text not null,
  keywords text[] not null default '{}',
  sentiment misrad_feedback_sentiment not null,
  source misrad_feedback_source not null,

  created_at timestamptz not null default now()
);

create index if not exists misrad_feedback_items_org_idx on misrad_feedback_items(organization_id);
create index if not exists misrad_feedback_items_client_idx on misrad_feedback_items(client_id);
create index if not exists misrad_feedback_items_source_idx on misrad_feedback_items(source);

-- 2) Assets / deliverables / transformations / stakeholders
create table if not exists misrad_client_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id uuid not null references misrad_clients(id) on delete cascade,

  name text not null,
  type misrad_asset_type not null,
  url text not null,
  category misrad_asset_category not null,
  uploaded_by misrad_uploaded_by not null,
  date text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists misrad_client_assets_org_idx on misrad_client_assets(organization_id);
create index if not exists misrad_client_assets_client_idx on misrad_client_assets(client_id);
create index if not exists misrad_client_assets_category_idx on misrad_client_assets(category);

create table if not exists misrad_client_deliverables (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id uuid not null references misrad_clients(id) on delete cascade,

  title text not null,
  description text not null,
  type misrad_deliverable_type not null,
  thumbnail_url text,
  status misrad_deliverable_status not null,
  date text not null,
  tags text[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists misrad_client_deliverables_org_idx on misrad_client_deliverables(organization_id);
create index if not exists misrad_client_deliverables_client_idx on misrad_client_deliverables(client_id);
create index if not exists misrad_client_deliverables_status_idx on misrad_client_deliverables(status);

create table if not exists misrad_client_transformations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id uuid not null references misrad_clients(id) on delete cascade,

  title text not null,
  metrics text,
  is_published boolean not null,
  before jsonb not null,
  after jsonb not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists misrad_client_transformations_org_idx on misrad_client_transformations(organization_id);
create index if not exists misrad_client_transformations_client_idx on misrad_client_transformations(client_id);
create index if not exists misrad_client_transformations_published_idx on misrad_client_transformations(is_published);

create table if not exists misrad_stakeholders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id uuid not null references misrad_clients(id) on delete cascade,

  name text not null,
  job_title text not null,
  nexus_role misrad_stakeholder_role not null,
  influence int not null,
  sentiment int not null,
  last_contact text not null,
  email text,
  avatar_url text,
  notes text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists misrad_stakeholders_org_idx on misrad_stakeholders(organization_id);
create index if not exists misrad_stakeholders_client_idx on misrad_stakeholders(client_id);
create index if not exists misrad_stakeholders_role_idx on misrad_stakeholders(nexus_role);

-- 3) Meetings + AI analysis
create table if not exists misrad_meetings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id uuid not null references misrad_clients(id) on delete cascade,

  date text not null,
  title text not null,
  location misrad_meeting_location not null,
  attendees text[] not null default '{}',

  transcript text not null,
  summary text,
  recording_url text,
  manual_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists misrad_meetings_org_idx on misrad_meetings(organization_id);
create index if not exists misrad_meetings_client_idx on misrad_meetings(client_id);

create table if not exists misrad_meeting_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id uuid not null references misrad_clients(id) on delete cascade,
  meeting_id uuid not null references misrad_meetings(id) on delete cascade,

  name text not null,
  url text not null,
  type misrad_meeting_file_type not null,

  created_at timestamptz not null default now()
);

create index if not exists misrad_meeting_files_org_idx on misrad_meeting_files(organization_id);
create index if not exists misrad_meeting_files_client_idx on misrad_meeting_files(client_id);
create index if not exists misrad_meeting_files_meeting_idx on misrad_meeting_files(meeting_id);

create table if not exists misrad_meeting_analysis_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id uuid not null references misrad_clients(id) on delete cascade,
  meeting_id uuid not null unique references misrad_meetings(id) on delete cascade,

  summary text not null,
  sentiment_score int not null,
  friction_keywords text[] not null default '{}',
  objections text[] not null default '{}',
  compliments text[] not null default '{}',
  decisions text[] not null default '{}',
  intents text[] not null default '{}',
  stories text[] not null default '{}',
  slang text[] not null default '{}',
  rating jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists misrad_meeting_analysis_results_org_idx on misrad_meeting_analysis_results(organization_id);
create index if not exists misrad_meeting_analysis_results_client_idx on misrad_meeting_analysis_results(client_id);

create table if not exists misrad_ai_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id uuid not null references misrad_clients(id) on delete cascade,
  analysis_id uuid not null references misrad_meeting_analysis_results(id) on delete cascade,

  bucket text not null,
  task text not null,
  deadline text not null,
  priority misrad_task_priority not null,
  status misrad_task_status not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists misrad_ai_tasks_org_idx on misrad_ai_tasks(organization_id);
create index if not exists misrad_ai_tasks_client_idx on misrad_ai_tasks(client_id);
create index if not exists misrad_ai_tasks_analysis_idx on misrad_ai_tasks(analysis_id);
create index if not exists misrad_ai_tasks_bucket_idx on misrad_ai_tasks(bucket);

create table if not exists misrad_ai_liability_risks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id uuid not null references misrad_clients(id) on delete cascade,
  analysis_id uuid not null references misrad_meeting_analysis_results(id) on delete cascade,

  quote text not null,
  context text not null,
  risk_level misrad_liability_risk_level not null,

  created_at timestamptz not null default now()
);

create index if not exists misrad_ai_liability_risks_org_idx on misrad_ai_liability_risks(organization_id);
create index if not exists misrad_ai_liability_risks_client_idx on misrad_ai_liability_risks(client_id);
create index if not exists misrad_ai_liability_risks_analysis_idx on misrad_ai_liability_risks(analysis_id);
create index if not exists misrad_ai_liability_risks_level_idx on misrad_ai_liability_risks(risk_level);

-- 4) Email Center
create table if not exists misrad_emails (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id uuid references misrad_clients(id) on delete set null,

  sender text not null,
  sender_email text not null,
  subject text not null,
  snippet text not null,
  body text not null,
  timestamp text not null,
  is_read boolean not null,
  tags text[] not null default '{}',
  avatar_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists misrad_emails_org_idx on misrad_emails(organization_id);
create index if not exists misrad_emails_client_idx on misrad_emails(client_id);
create index if not exists misrad_emails_is_read_idx on misrad_emails(is_read);

-- 5) Finance: invoices + agreements
create table if not exists misrad_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id uuid not null references misrad_clients(id) on delete cascade,

  number text not null,
  amount int not null,
  date text not null,
  due_date text not null,
  status misrad_invoice_status not null,
  download_url text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists misrad_invoices_org_idx on misrad_invoices(organization_id);
create index if not exists misrad_invoices_client_idx on misrad_invoices(client_id);
create index if not exists misrad_invoices_status_idx on misrad_invoices(status);

create table if not exists misrad_client_agreements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id uuid not null references misrad_clients(id) on delete cascade,

  title text not null,
  type misrad_agreement_type not null,
  signed_date text not null,
  expiry_date text,
  status misrad_agreement_status not null,
  file_url text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists misrad_client_agreements_org_idx on misrad_client_agreements(organization_id);
create index if not exists misrad_client_agreements_client_idx on misrad_client_agreements(client_id);
create index if not exists misrad_client_agreements_status_idx on misrad_client_agreements(status);

-- 6) Cycles
create table if not exists misrad_cycles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,

  name text not null,
  description text not null,
  start_date text not null,
  end_date text not null,
  status misrad_cycle_status not null,
  group_links jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists misrad_cycles_org_idx on misrad_cycles(organization_id);
create index if not exists misrad_cycles_status_idx on misrad_cycles(status);

-- Link clients -> cycles (existing schema uses client.cycleId)
do $$ begin
  alter table misrad_clients
    add constraint misrad_clients_cycle_fk
    foreign key (cycle_id) references misrad_cycles(id) on delete set null;
exception
  when duplicate_object then null;
end $$;

create table if not exists misrad_cycle_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  cycle_id uuid not null references misrad_cycles(id) on delete cascade,

  title text not null,
  description text not null,
  type misrad_client_action_type not null,
  status misrad_client_action_status not null,
  due_date text not null,
  is_blocking boolean not null,
  last_reminder_sent text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists misrad_cycle_tasks_org_idx on misrad_cycle_tasks(organization_id);
create index if not exists misrad_cycle_tasks_cycle_idx on misrad_cycle_tasks(cycle_id);

create table if not exists misrad_cycle_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  cycle_id uuid not null references misrad_cycles(id) on delete cascade,

  name text not null,
  type misrad_asset_type not null,
  url text not null,
  category misrad_asset_category not null,
  uploaded_by misrad_uploaded_by not null,
  date text not null,

  created_at timestamptz not null default now()
);

create index if not exists misrad_cycle_assets_org_idx on misrad_cycle_assets(organization_id);
create index if not exists misrad_cycle_assets_cycle_idx on misrad_cycle_assets(cycle_id);

create table if not exists misrad_group_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  cycle_id uuid references misrad_cycles(id) on delete set null,

  title text not null,
  type misrad_group_event_type not null,
  date text not null,
  target_segment text not null,
  attendees_count int not null,
  link text not null,
  status misrad_group_event_status not null,
  attendees jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists misrad_group_events_org_idx on misrad_group_events(organization_id);
create index if not exists misrad_group_events_cycle_idx on misrad_group_events(cycle_id);
create index if not exists misrad_group_events_status_idx on misrad_group_events(status);

-- 7) Workflow builder
create table if not exists misrad_workflow_blueprints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,

  name text not null,
  description text not null,
  total_duration text not null,
  tags text[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists misrad_workflow_blueprints_org_idx on misrad_workflow_blueprints(organization_id);

create table if not exists misrad_workflow_stages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  blueprint_id uuid not null references misrad_workflow_blueprints(id) on delete cascade,

  title text not null,
  duration text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists misrad_workflow_stages_org_idx on misrad_workflow_stages(organization_id);
create index if not exists misrad_workflow_stages_blueprint_idx on misrad_workflow_stages(blueprint_id);

create table if not exists misrad_workflow_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  stage_id uuid not null references misrad_workflow_stages(id) on delete cascade,

  type misrad_workflow_item_type not null,
  title text not null,
  description text not null,
  is_automated boolean not null,
  asset_link text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists misrad_workflow_items_org_idx on misrad_workflow_items(organization_id);
create index if not exists misrad_workflow_items_stage_idx on misrad_workflow_items(stage_id);

-- 8) Forms
create table if not exists misrad_form_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,

  title text not null,
  description text not null,
  is_active boolean not null,
  category misrad_form_category not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists misrad_form_templates_org_idx on misrad_form_templates(organization_id);
create index if not exists misrad_form_templates_category_idx on misrad_form_templates(category);

create table if not exists misrad_form_steps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  template_id uuid not null references misrad_form_templates(id) on delete cascade,

  title text not null,
  description text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists misrad_form_steps_org_idx on misrad_form_steps(organization_id);
create index if not exists misrad_form_steps_template_idx on misrad_form_steps(template_id);

create table if not exists misrad_form_fields (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  step_id uuid not null references misrad_form_steps(id) on delete cascade,

  label text not null,
  type misrad_field_type not null,
  required boolean not null,
  options text[] not null default '{}',
  placeholder text,
  helper_text text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists misrad_form_fields_org_idx on misrad_form_fields(organization_id);
create index if not exists misrad_form_fields_step_idx on misrad_form_fields(step_id);

create table if not exists misrad_form_responses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id uuid not null references misrad_clients(id) on delete cascade,

  template_id uuid not null references misrad_form_templates(id) on delete cascade,
  assigned_form_id uuid references misrad_assigned_forms(id) on delete set null,

  status misrad_assigned_form_status not null,
  progress int not null,
  answers jsonb not null default '{}'::jsonb,

  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists misrad_form_responses_org_idx on misrad_form_responses(organization_id);
create index if not exists misrad_form_responses_client_idx on misrad_form_responses(client_id);
create index if not exists misrad_form_responses_template_idx on misrad_form_responses(template_id);
create index if not exists misrad_form_responses_assigned_idx on misrad_form_responses(assigned_form_id);

-- 9) Notifications + activity logs + module settings
create table if not exists misrad_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id uuid references misrad_clients(id) on delete set null,

  type misrad_notification_type not null,
  title text not null,
  message text not null,
  timestamp text not null,
  is_read boolean not null,
  link text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists misrad_notifications_org_idx on misrad_notifications(organization_id);
create index if not exists misrad_notifications_client_idx on misrad_notifications(client_id);
create index if not exists misrad_notifications_is_read_idx on misrad_notifications(is_read);

create table if not exists misrad_activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id uuid not null references misrad_clients(id) on delete cascade,

  type misrad_activity_log_type not null,
  description text not null,
  date text not null,
  is_risk boolean not null,

  created_at timestamptz not null default now()
);

create index if not exists misrad_activity_logs_org_idx on misrad_activity_logs(organization_id);
create index if not exists misrad_activity_logs_client_idx on misrad_activity_logs(client_id);
create index if not exists misrad_activity_logs_type_idx on misrad_activity_logs(type);
create index if not exists misrad_activity_logs_is_risk_idx on misrad_activity_logs(is_risk);

create table if not exists misrad_module_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique,

  cycles boolean not null,
  intelligence boolean not null,
  portals boolean not null,
  workflows boolean not null,
  feedback boolean not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists misrad_module_settings_org_idx on misrad_module_settings(organization_id);

-- 10) updated_at triggers
create or replace function misrad_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ begin
  create trigger misrad_clients_set_updated_at before update on misrad_clients
  for each row execute function misrad_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger misrad_journey_stages_set_updated_at before update on misrad_journey_stages
  for each row execute function misrad_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger misrad_milestones_set_updated_at before update on misrad_milestones
  for each row execute function misrad_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger misrad_opportunities_set_updated_at before update on misrad_opportunities
  for each row execute function misrad_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger misrad_success_goals_set_updated_at before update on misrad_success_goals
  for each row execute function misrad_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger misrad_client_handoffs_set_updated_at before update on misrad_client_handoffs
  for each row execute function misrad_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger misrad_client_actions_set_updated_at before update on misrad_client_actions
  for each row execute function misrad_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger misrad_assigned_forms_set_updated_at before update on misrad_assigned_forms
  for each row execute function misrad_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger misrad_client_assets_set_updated_at before update on misrad_client_assets
  for each row execute function misrad_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger misrad_client_deliverables_set_updated_at before update on misrad_client_deliverables
  for each row execute function misrad_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger misrad_client_transformations_set_updated_at before update on misrad_client_transformations
  for each row execute function misrad_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger misrad_stakeholders_set_updated_at before update on misrad_stakeholders
  for each row execute function misrad_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger misrad_meetings_set_updated_at before update on misrad_meetings
  for each row execute function misrad_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger misrad_meeting_analysis_results_set_updated_at before update on misrad_meeting_analysis_results
  for each row execute function misrad_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger misrad_ai_tasks_set_updated_at before update on misrad_ai_tasks
  for each row execute function misrad_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger misrad_emails_set_updated_at before update on misrad_emails
  for each row execute function misrad_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger misrad_invoices_set_updated_at before update on misrad_invoices
  for each row execute function misrad_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger misrad_client_agreements_set_updated_at before update on misrad_client_agreements
  for each row execute function misrad_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger misrad_cycles_set_updated_at before update on misrad_cycles
  for each row execute function misrad_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger misrad_cycle_tasks_set_updated_at before update on misrad_cycle_tasks
  for each row execute function misrad_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger misrad_group_events_set_updated_at before update on misrad_group_events
  for each row execute function misrad_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger misrad_workflow_blueprints_set_updated_at before update on misrad_workflow_blueprints
  for each row execute function misrad_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger misrad_workflow_stages_set_updated_at before update on misrad_workflow_stages
  for each row execute function misrad_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger misrad_workflow_items_set_updated_at before update on misrad_workflow_items
  for each row execute function misrad_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger misrad_form_templates_set_updated_at before update on misrad_form_templates
  for each row execute function misrad_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger misrad_form_steps_set_updated_at before update on misrad_form_steps
  for each row execute function misrad_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger misrad_form_fields_set_updated_at before update on misrad_form_fields
  for each row execute function misrad_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger misrad_form_responses_set_updated_at before update on misrad_form_responses
  for each row execute function misrad_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger misrad_notifications_set_updated_at before update on misrad_notifications
  for each row execute function misrad_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger misrad_module_settings_set_updated_at before update on misrad_module_settings
  for each row execute function misrad_set_updated_at();
exception when duplicate_object then null; end $$;

commit;
