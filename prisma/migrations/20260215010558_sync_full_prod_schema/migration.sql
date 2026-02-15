-- Safe idempotent migration for PRODUCTION (generated 2026-02-15T01:20:17.209Z)

DO $$ BEGIN
  ALTER TABLE "business_metrics" RENAME CONSTRAINT "business_metrics_pkey" TO "business_metrics_pkey1";
EXCEPTION WHEN undefined_object THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "client_dna" RENAME CONSTRAINT "client_dna_pkey" TO "client_dna_pkey1";
EXCEPTION WHEN undefined_object THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "clients" RENAME CONSTRAINT "clients_pkey" TO "clients_pkey1";
EXCEPTION WHEN undefined_object THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "core_system_settings" DROP CONSTRAINT IF EXISTS "social_system_settings_pkey";
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "landing_faq" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "landing_testimonials" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "misrad_clients" ADD COLUMN IF NOT EXISTS "last_contact_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "misrad_meetings" ADD COLUMN IF NOT EXISTS "meeting_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "misrad_support_tickets" ADD COLUMN IF NOT EXISTS "first_response_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS "handled_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS "last_updated_by" UUID,
ADD COLUMN IF NOT EXISTS "read_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS "resolution_time_minutes" INTEGER,
ADD COLUMN IF NOT EXISTS "sla_deadline" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "nexus_time_entries" ADD COLUMN IF NOT EXISTS "end_accuracy" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "end_lat" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "end_lng" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "start_accuracy" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "start_lat" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "start_lng" DOUBLE PRECISION;

DO $$ BEGIN
  ALTER TABLE "organization_users" RENAME CONSTRAINT "social_users_pkey" TO "organization_users_pkey";
EXCEPTION WHEN undefined_object THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_update_trial_end_date ON "organizations";
DROP TRIGGER IF EXISTS trg_update_organization_revenue ON "organizations";

-- AlterTable
ALTER TABLE "organizations" ALTER COLUMN "subscription_status" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "subscription_plan" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "trial_days" SET DEFAULT 7,
ALTER COLUMN "billing_cycle" SET DATA TYPE TEXT,
ALTER COLUMN "billing_email" SET DATA TYPE TEXT,
ALTER COLUMN "payment_method_id" SET DATA TYPE TEXT;

DO $$ BEGIN
  CREATE TRIGGER trg_update_trial_end_date
    BEFORE INSERT OR UPDATE ON "organizations"
    FOR EACH ROW EXECUTE FUNCTION update_trial_end_date();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_update_organization_revenue
    BEFORE INSERT OR UPDATE ON "organizations"
    FOR EACH ROW EXECUTE FUNCTION update_organization_revenue();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "platform_credentials" RENAME CONSTRAINT "platform_credentials_pkey" TO "platform_credentials_pkey1";
EXCEPTION WHEN undefined_object THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "platform_quotas" RENAME CONSTRAINT "platform_quotas_pkey" TO "platform_quotas_pkey1";
EXCEPTION WHEN undefined_object THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "socialmedia_business_metrics" RENAME CONSTRAINT "social_business_metrics_pkey" TO "business_metrics_pkey";
EXCEPTION WHEN undefined_object THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "socialmedia_client_dna" RENAME CONSTRAINT "social_client_dna_pkey" TO "client_dna_pkey";
EXCEPTION WHEN undefined_object THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "socialmedia_clients" DROP CONSTRAINT IF EXISTS "social_clients_pkey";
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "socialmedia_platform_credentials" RENAME CONSTRAINT "social_platform_credentials_pkey" TO "platform_credentials_pkey";
EXCEPTION WHEN undefined_object THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "socialmedia_platform_quotas" RENAME CONSTRAINT "social_platform_quotas_pkey" TO "platform_quotas_pkey";
EXCEPTION WHEN undefined_object THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "socialmedia_posts" RENAME CONSTRAINT "social_posts_pkey" TO "socialmedia_posts_pkey";
EXCEPTION WHEN undefined_object THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "socialmedia_tasks" RENAME CONSTRAINT "social_tasks_pkey" TO "socialmedia_tasks_pkey";
EXCEPTION WHEN undefined_object THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "system_calendar_events" ADD COLUMN IF NOT EXISTS "occurs_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "system_call_analyses" ADD COLUMN IF NOT EXISTS "call_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "team_members" ALTER COLUMN "trial_days" SET DEFAULT 7;

-- CreateTable
CREATE TABLE IF NOT EXISTS "business_clients" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "company_name" TEXT NOT NULL,
    "company_name_en" TEXT,
    "business_number" TEXT,
    "tax_id" TEXT,
    "legal_entity_type" TEXT,
    "primary_email" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "address_street" TEXT,
    "address_city" TEXT,
    "address_state" TEXT,
    "address_postal_code" TEXT,
    "address_country" TEXT DEFAULT 'ישראל',
    "billing_email" TEXT,
    "billing_contact_name" TEXT,
    "billing_address_street" TEXT,
    "billing_address_city" TEXT,
    "billing_address_postal_code" TEXT,
    "industry" TEXT,
    "company_size" TEXT,
    "annual_revenue_range" TEXT,
    "lead_source" TEXT,
    "account_manager_id" UUID,
    "sales_rep_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lifecycle_stage" TEXT NOT NULL DEFAULT 'customer',
    "total_revenue_lifetime" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "mrr" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "arr" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "first_purchase_date" TIMESTAMPTZ(6),
    "last_purchase_date" TIMESTAMPTZ(6),
    "notes" TEXT,
    "tags" TEXT[],
    "custom_fields" JSONB,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "business_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "business_client_contacts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "client_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'contact',
    "title" TEXT,
    "department" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_billing_contact" BOOLEAN NOT NULL DEFAULT false,
    "is_technical_contact" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_client_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT DEFAULT 'info',
    "is_read" BOOLEAN DEFAULT false,
    "target_type" TEXT DEFAULT 'all',
    "target_id" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMPTZ(6)
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "business_clients_business_number_key" ON "business_clients"("business_number");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "business_clients_primary_email_key" ON "business_clients"("primary_email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "business_clients_company_name_idx" ON "business_clients"("company_name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "business_clients_status_idx" ON "business_clients"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "business_clients_lifecycle_stage_idx" ON "business_clients"("lifecycle_stage");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "business_clients_created_at_idx" ON "business_clients"("created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "business_clients_deleted_at_idx" ON "business_clients"("deleted_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "business_clients_business_number_idx" ON "business_clients"("business_number");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "business_client_contacts_client_id_idx" ON "business_client_contacts"("client_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "business_client_contacts_user_id_idx" ON "business_client_contacts"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "business_client_contacts_is_primary_idx" ON "business_client_contacts"("is_primary");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "business_client_contacts_role_idx" ON "business_client_contacts"("role");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "business_client_contacts_client_id_user_id_key" ON "business_client_contacts"("client_id", "user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_activity_logs_organization_id_created_at_idx" ON "misrad_activity_logs"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_ai_liability_risks_organization_id_created_at_idx" ON "misrad_ai_liability_risks"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_ai_tasks_organization_id_created_at_idx" ON "misrad_ai_tasks"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_assigned_forms_organization_id_created_at_idx" ON "misrad_assigned_forms"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_client_actions_organization_id_created_at_idx" ON "misrad_client_actions"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_client_agreements_organization_id_created_at_idx" ON "misrad_client_agreements"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_client_assets_organization_id_created_at_idx" ON "misrad_client_assets"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_client_deliverables_organization_id_created_at_idx" ON "misrad_client_deliverables"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_client_handoffs_organization_id_created_at_idx" ON "misrad_client_handoffs"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_client_transformations_organization_id_created_at_idx" ON "misrad_client_transformations"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_clients_organization_id_created_at_idx" ON "misrad_clients"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_cycle_assets_organization_id_created_at_idx" ON "misrad_cycle_assets"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_cycle_tasks_organization_id_created_at_idx" ON "misrad_cycle_tasks"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_cycles_organization_id_created_at_idx" ON "misrad_cycles"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_emails_organization_id_created_at_idx" ON "misrad_emails"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_feedback_items_organization_id_created_at_idx" ON "misrad_feedback_items"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_form_fields_organization_id_created_at_idx" ON "misrad_form_fields"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_form_responses_organization_id_created_at_idx" ON "misrad_form_responses"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_form_steps_organization_id_created_at_idx" ON "misrad_form_steps"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_form_templates_organization_id_created_at_idx" ON "misrad_form_templates"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_group_events_organization_id_created_at_idx" ON "misrad_group_events"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_invoices_organization_id_created_at_idx" ON "misrad_invoices"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_journey_stages_organization_id_created_at_idx" ON "misrad_journey_stages"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_meeting_analysis_results_organization_id_created_at_idx" ON "misrad_meeting_analysis_results"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_meeting_files_organization_id_created_at_idx" ON "misrad_meeting_files"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_meetings_organization_id_created_at_idx" ON "misrad_meetings"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_misrad_meetings_org_meeting_at" ON "misrad_meetings"("organization_id", "meeting_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_misrad_meetings_client_meeting_at" ON "misrad_meetings"("client_id", "meeting_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_message_attachments_organization_id_created_at_idx" ON "misrad_message_attachments"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_messages_organization_id_created_at_idx" ON "misrad_messages"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_metric_history_organization_id_created_at_idx" ON "misrad_metric_history"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_milestones_organization_id_created_at_idx" ON "misrad_milestones"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_notifications_organization_id_created_at_idx" ON "misrad_notifications"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_opportunities_organization_id_created_at_idx" ON "misrad_opportunities"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_roi_records_organization_id_created_at_idx" ON "misrad_roi_records"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_stakeholders_organization_id_created_at_idx" ON "misrad_stakeholders"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_success_goals_organization_id_created_at_idx" ON "misrad_success_goals"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_workflow_blueprints_organization_id_created_at_idx" ON "misrad_workflow_blueprints"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_workflow_items_organization_id_created_at_idx" ON "misrad_workflow_items"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "misrad_workflow_stages_organization_id_created_at_idx" ON "misrad_workflow_stages"("organization_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "nexus_users_org_email_unique" ON "nexus_users"("organization_id", "email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_system_calendar_events_org_occurs_at" ON "system_calendar_events"("organization_id", "occurs_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_system_call_analyses_org_call_at" ON "system_call_analyses"("organization_id", "call_at");

DO $$ BEGIN
  ALTER TABLE "system_lead_custom_field_definitions" RENAME CONSTRAINT "system_lead_custom_field_defs_organization_id_fkey" TO "system_lead_custom_field_definitions_organization_id_fkey";
EXCEPTION WHEN undefined_object THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "organizations" ADD CONSTRAINT "organizations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "business_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "business_client_contacts" ADD CONSTRAINT "business_client_contacts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "business_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "business_client_contacts" ADD CONSTRAINT "business_client_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "organization_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER INDEX "idx_social_clients_organization_id" RENAME TO "clients_organization_id_idx";
EXCEPTION WHEN undefined_object THEN NULL; WHEN duplicate_object THEN NULL;
END $$;
