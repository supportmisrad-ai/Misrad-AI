-- Bot / WhatsApp tables for MISRAD AI
-- Safe to run multiple times (IF NOT EXISTS)

DO $$ BEGIN
  CREATE TYPE "BotLeadStatus" AS ENUM ('new', 'qualified', 'demo_booked', 'trial', 'customer', 'churned', 'unsubscribed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "bot_leads" (
  "id"               TEXT PRIMARY KEY,
  "phone"            TEXT NOT NULL UNIQUE,
  "name"             TEXT,
  "business_name"    TEXT,
  "email"            TEXT,
  "industry"         TEXT,
  "org_size"         TEXT,
  "pain_point"       TEXT,
  "selected_plan"    TEXT,
  "source"           TEXT,
  "status"           "BotLeadStatus" NOT NULL DEFAULT 'new',
  "score"            INTEGER NOT NULL DEFAULT 0,
  "last_interaction" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "organization_id"  UUID REFERENCES "organizations"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "bot_leads_status_idx" ON "bot_leads" ("status");
CREATE INDEX IF NOT EXISTS "bot_leads_created_at_idx" ON "bot_leads" ("created_at");
CREATE INDEX IF NOT EXISTS "bot_leads_organization_id_idx" ON "bot_leads" ("organization_id");

CREATE TABLE IF NOT EXISTS "bot_conversations" (
  "id"         TEXT PRIMARY KEY,
  "lead_id"    TEXT NOT NULL REFERENCES "bot_leads"("id") ON DELETE CASCADE,
  "direction"  TEXT NOT NULL,
  "message"    TEXT NOT NULL,
  "rule_id"    TEXT,
  "variables"  JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "bot_conversations_lead_id_idx" ON "bot_conversations" ("lead_id");
CREATE INDEX IF NOT EXISTS "bot_conversations_created_at_idx" ON "bot_conversations" ("created_at");
