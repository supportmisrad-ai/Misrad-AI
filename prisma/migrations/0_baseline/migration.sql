-- CreateEnum
CREATE TYPE "client_status" AS ENUM ('Active', 'Paused', 'Archived', 'Pending Payment', 'Onboarding', 'Overdue');

-- CreateEnum
CREATE TYPE "coupon_discount_type" AS ENUM ('PERCENT', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "member_type" AS ENUM ('employee', 'freelancer');

-- CreateEnum
CREATE TYPE "MisradActivityLogType" AS ENUM ('EMAIL', 'MEETING', 'DELIVERABLE', 'SYSTEM', 'FINANCIAL', 'STATUS_CHANGE');

-- CreateEnum
CREATE TYPE "MisradAgreementStatus" AS ENUM ('ACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MisradAgreementType" AS ENUM ('MSA', 'SOW', 'NDA', 'ADDENDUM');

-- CreateEnum
CREATE TYPE "MisradAssetCategory" AS ENUM ('BRANDING', 'LEGAL', 'INPUT', 'STRATEGY');

-- CreateEnum
CREATE TYPE "MisradAssetType" AS ENUM ('PDF', 'IMAGE', 'LINK', 'FIGMA', 'DOC');

-- CreateEnum
CREATE TYPE "MisradAssignedFormStatus" AS ENUM ('SENT', 'OPENED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MisradClientActionStatus" AS ENUM ('PENDING', 'COMPLETED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "MisradClientActionType" AS ENUM ('APPROVAL', 'UPLOAD', 'SIGNATURE', 'FORM', 'FEEDBACK');

-- CreateEnum
CREATE TYPE "MisradClientStatus" AS ENUM ('ACTIVE', 'LEAD', 'ARCHIVED', 'LOST', 'CHURNED');

-- CreateEnum
CREATE TYPE "MisradClientType" AS ENUM ('RETAINER', 'PROJECT', 'HOURLY');

-- CreateEnum
CREATE TYPE "MisradCycleStatus" AS ENUM ('RECRUITING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MisradDeliverableStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "MisradDeliverableType" AS ENUM ('CAMPAIGN', 'REPORT', 'DESIGN', 'STRATEGY', 'DEV');

-- CreateEnum
CREATE TYPE "MisradFeedbackSentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "MisradFeedbackSource" AS ENUM ('EMAIL_SURVEY', 'PLATFORM_POPUP', 'WHATSAPP_BOT', 'EXIT_INTERVIEW', 'PORTAL_FRICTION');

-- CreateEnum
CREATE TYPE "MisradFieldType" AS ENUM ('TEXT', 'TEXTAREA', 'SELECT', 'UPLOAD', 'DATE', 'CHECKBOX', 'RADIO');

-- CreateEnum
CREATE TYPE "MisradFormCategory" AS ENUM ('ONBOARDING', 'FEEDBACK', 'STRATEGY');

-- CreateEnum
CREATE TYPE "MisradGroupEventStatus" AS ENUM ('UPCOMING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MisradGroupEventType" AS ENUM ('WEBINAR', 'WORKSHOP', 'MASTERCLASS');

-- CreateEnum
CREATE TYPE "MisradHealthStatus" AS ENUM ('CRITICAL', 'AT_RISK', 'STABLE', 'THRIVING');

-- CreateEnum
CREATE TYPE "MisradInvoiceStatus" AS ENUM ('DRAFT', 'PAID', 'PENDING', 'OVERDUE');

-- CreateEnum
CREATE TYPE "MisradJourneyStageStatus" AS ENUM ('COMPLETED', 'ACTIVE', 'PENDING');

-- CreateEnum
CREATE TYPE "MisradLiabilityRiskLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "MisradMeetingFileType" AS ENUM ('PDF', 'DOC', 'IMG');

-- CreateEnum
CREATE TYPE "MisradMeetingLocation" AS ENUM ('ZOOM', 'FRONTAL', 'PHONE');

-- CreateEnum
CREATE TYPE "MisradNotificationType" AS ENUM ('ALERT', 'MESSAGE', 'SUCCESS', 'TASK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "MisradOpportunityStatus" AS ENUM ('NEW', 'PROPOSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "MisradRoiCategory" AS ENUM ('REVENUE_LIFT', 'COST_SAVING', 'EFFICIENCY', 'REFUND');

-- CreateEnum
CREATE TYPE "MisradSentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'ANXIOUS');

-- CreateEnum
CREATE TYPE "MisradStakeholderRole" AS ENUM ('CHAMPION', 'DECISION_MAKER', 'INFLUENCER', 'BLOCKER', 'GATEKEEPER', 'USER');

-- CreateEnum
CREATE TYPE "MisradSuccessGoalStatus" AS ENUM ('IN_PROGRESS', 'ACHIEVED', 'AT_RISK');

-- CreateEnum
CREATE TYPE "MisradTaskPriority" AS ENUM ('HIGH', 'NORMAL', 'LOW');

-- CreateEnum
CREATE TYPE "MisradTaskStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MisradUploadedBy" AS ENUM ('CLIENT', 'AGENCY');

-- CreateEnum
CREATE TYPE "MisradWorkflowItemType" AS ENUM ('MEETING_ZOOM', 'MEETING_FRONTAL', 'TASK_CLIENT', 'TASK_AGENCY', 'FORM_SEND', 'CONTENT_DELIVERY');

-- CreateEnum
CREATE TYPE "onboarding_status" AS ENUM ('invited', 'completed');

-- CreateEnum
CREATE TYPE "post_status" AS ENUM ('draft', 'internal_review', 'scheduled', 'published', 'failed', 'pending_approval');

-- CreateEnum
CREATE TYPE "pricing_plan" AS ENUM ('starter', 'pro', 'agency', 'custom');

-- CreateEnum
CREATE TYPE "social_platform" AS ENUM ('facebook', 'instagram', 'linkedin', 'tiktok', 'twitter', 'google', 'whatsapp', 'threads', 'youtube', 'pinterest', 'portal');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin', 'account_manager', 'content_creator', 'designer', 'client');

-- CreateEnum
CREATE TYPE "MisradSalesTeamMemberRole" AS ENUM ('LEADER', 'CLOSER', 'SDR', 'MEMBER');

-- CreateEnum
CREATE TYPE "MisradFieldAgentStatus" AS ENUM ('AVAILABLE', 'EN_ROUTE', 'ON_SITE', 'BREAK', 'OFFLINE');

-- CreateEnum
CREATE TYPE "MisradFieldVisitStatus" AS ENUM ('UPCOMING', 'CURRENT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BotLeadStatus" AS ENUM ('new', 'qualified', 'demo_booked', 'trial', 'customer', 'churned', 'unsubscribed');

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "team_member_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "target_id" UUID,
    "target_type" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_embeddings" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "module_id" TEXT NOT NULL,
    "user_id" TEXT,
    "is_public_in_org" BOOLEAN NOT NULL DEFAULT false,
    "doc_key" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL DEFAULT 0,
    "content" TEXT NOT NULL,
    "embedding" vector NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_feature_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID,
    "feature_key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "primary_provider" TEXT NOT NULL,
    "primary_model" TEXT NOT NULL,
    "fallback_provider" TEXT,
    "fallback_model" TEXT,
    "reserve_cost_cents" INTEGER NOT NULL DEFAULT 25,
    "timeout_ms" INTEGER NOT NULL DEFAULT 30000,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "backup_provider" TEXT,
    "backup_model" TEXT,
    "base_prompt" TEXT,

    CONSTRAINT "ai_feature_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_model_aliases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "organization_id" UUID,
    "display_name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_model_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_provider_keys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" TEXT NOT NULL,
    "organization_id" UUID,
    "api_key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_provider_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organization_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "feature_key" TEXT NOT NULL,
    "task_kind" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "model_display_name" TEXT,
    "charged_cents" INTEGER NOT NULL DEFAULT 0,
    "latency_ms" INTEGER,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "meta" JSONB,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_updates" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT DEFAULT 'medium',
    "is_published" BOOLEAN DEFAULT true,
    "published_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_events" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "subscription_id" UUID,
    "event_type" TEXT NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_clerk_user_id" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_invoices" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "morning_invoice_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "invoice_url" TEXT,
    "pdf_url" TEXT,
    "payment_url" TEXT,
    "description" TEXT,
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "paid_at" TIMESTAMPTZ(6),
    "due_date" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_metrics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "time_spent_minutes" INTEGER DEFAULT 0,
    "expected_hours" DECIMAL(5,2) DEFAULT 0,
    "punctuality_score" INTEGER DEFAULT 0,
    "responsiveness_score" INTEGER DEFAULT 0,
    "revision_count" INTEGER DEFAULT 0,
    "last_ai_business_audit" TEXT,
    "days_overdue" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_metrics_pkey1" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charges" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "subscription_id" UUID,
    "provider" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT DEFAULT 'ILS',
    "external_id" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_dna" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "brand_summary" TEXT,
    "voice_formal" INTEGER,
    "voice_funny" INTEGER,
    "voice_length" INTEGER,
    "vocabulary_loved" JSONB DEFAULT '[]',
    "vocabulary_forbidden" JSONB DEFAULT '[]',
    "color_primary" TEXT,
    "color_secondary" TEXT,
    "strategy" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_dna_pkey1" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_approvals" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "subject_type" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "document_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requested_by_type" TEXT,
    "requested_by_id" TEXT,
    "approved_by_portal_user_id" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "comment" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_clients" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_documents" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT DEFAULT 'GENERAL',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "is_visible_to_client" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB DEFAULT '{}',
    "created_by_type" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_document_files" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "storage_bucket" TEXT NOT NULL DEFAULT 'client',
    "storage_path" TEXT NOT NULL,
    "file_name" TEXT,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "uploaded_by_type" TEXT,
    "uploaded_by_id" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_document_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_feedbacks" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "rating" SMALLINT NOT NULL,
    "comment" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_internal_notes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_internal_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_portal_content" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "data" JSONB DEFAULT '{}',
    "is_published" BOOLEAN DEFAULT false,
    "published_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_portal_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_portal_invites" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_portal_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_portal_users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "clerk_user_id" TEXT NOT NULL,
    "email" TEXT,
    "full_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_portal_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_profiles" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "classification" TEXT DEFAULT 'DEFAULT',
    "preferences" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "user_id" UUID,
    "name" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "business_id" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "avatar" TEXT,
    "brand_voice" TEXT,
    "posting_rhythm" TEXT,
    "status" TEXT DEFAULT 'Onboarding',
    "onboarding_status" TEXT,
    "invitation_token" TEXT,
    "portal_token" TEXT NOT NULL,
    "color" TEXT,
    "plan" TEXT,
    "monthly_fee" DECIMAL(10,2),
    "next_payment_date" DATE,
    "next_payment_amount" DECIMAL(10,2),
    "payment_status" TEXT,
    "auto_reminders_enabled" BOOLEAN DEFAULT false,
    "saved_card_thumbnail" TEXT,
    "internal_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,

    CONSTRAINT "clients_pkey1" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_service_tiers" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "tier_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "metadata" JSONB DEFAULT '{}',
    "starts_at" TIMESTAMPTZ(6),
    "ends_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_service_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_sessions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "end_at" TIMESTAMPTZ(6),
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "session_type" TEXT,
    "location" TEXT,
    "summary" TEXT,
    "created_by" UUID,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_shared_files" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "storage_bucket" TEXT NOT NULL DEFAULT 'client',
    "storage_path" TEXT NOT NULL,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "is_visible_to_client" BOOLEAN NOT NULL DEFAULT true,
    "uploaded_by_type" TEXT,
    "uploaded_by_id" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_shared_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_tasks" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "priority" TEXT DEFAULT 'medium',
    "due_at" TIMESTAMPTZ(6),
    "assigned_to" UUID,
    "created_by" UUID,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connect_marketplace_listings" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "source_org_id" UUID NOT NULL,
    "source_org_slug" TEXT NOT NULL,
    "source_user_id" UUID,
    "lead_id" UUID NOT NULL,
    "target_geo" TEXT,
    "category" TEXT,
    "price" DECIMAL(10,2),
    "public_description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'LISTED',
    "token" TEXT NOT NULL,
    "interested_name" TEXT,
    "interested_phone" TEXT,
    "interested_at" TIMESTAMPTZ(6),
    "approved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connect_marketplace_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_system_settings" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "key" TEXT NOT NULL,
    "value" JSONB,
    "maintenance_mode" BOOLEAN DEFAULT false,
    "ai_enabled" BOOLEAN DEFAULT true,
    "banner_message" TEXT,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "coupon_redemptions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "coupon_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "order_id" UUID,
    "clerk_user_id" TEXT,
    "redeemed_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "amount_before" DECIMAL(10,2),
    "discount_amount" DECIMAL(10,2),
    "amount_after" DECIMAL(10,2),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "code_hash" VARCHAR(64) NOT NULL,
    "code_last4" VARCHAR(4),
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "discount_type" "coupon_discount_type" NOT NULL,
    "discount_percent" INTEGER,
    "discount_amount" DECIMAL(10,2),
    "min_order_amount" DECIMAL(10,2),
    "starts_at" TIMESTAMPTZ(6),
    "ends_at" TIMESTAMPTZ(6),
    "max_redemptions_total" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "company_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_pairing_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "token" TEXT,
    "device_nonce" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "organization_id" UUID,
    "creator_clerk_user_id" TEXT,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "approved_by_user_id" TEXT,
    "approved_for_user_id" UUID,
    "approved_for_clerk_user_id" TEXT,
    "sign_in_token" TEXT,
    "approved_at" TIMESTAMPTZ(6),
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_pairing_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_whatsapp_reminder_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "client_id" UUID,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "manual_method" TEXT,
    "to_phone" TEXT,
    "message" TEXT,
    "provider" TEXT,
    "provider_message_id" TEXT,
    "error" TEXT,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_whatsapp_reminder_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_settings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "windows_download_url" TEXT,
    "android_download_url" TEXT,
    "admin_android_download_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "global_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_system_metrics" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "total_mrr" DECIMAL(12,2) DEFAULT 0,
    "active_subscriptions" INTEGER DEFAULT 0,
    "overdue_invoices_count" INTEGER DEFAULT 0,
    "api_health_score" INTEGER DEFAULT 100,
    "gemini_token_usage" INTEGER DEFAULT 0,
    "new_clients_this_month" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "global_system_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "help_videos" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "module_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "video_url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "route_prefix" TEXT,
    "duration" TEXT,

    CONSTRAINT "help_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "impersonation_sessions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "admin_user_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "impersonation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_idempotency_keys" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "integration" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "response_status" INTEGER,
    "response_body" JSONB,
    "client_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_credentials" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "integration_name" TEXT NOT NULL,
    "credential_type" TEXT NOT NULL,
    "encrypted_data" JSONB NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_status" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "is_connected" BOOLEAN DEFAULT false,
    "api_key" TEXT,
    "last_sync" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_faq" (
    "id" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "video_url" TEXT,
    "cover_image_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_testimonials" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "image_url" TEXT,
    "video_url" TEXT,
    "cover_image_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_activity_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "type" "MisradActivityLogType" NOT NULL,
    "description" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "date_at" TIMESTAMPTZ(6),
    "isRisk" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "misrad_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_ai_liability_risks" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "analysis_id" UUID NOT NULL,
    "quote" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "riskLevel" "MisradLiabilityRiskLevel" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "misrad_ai_liability_risks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_ai_tasks" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "analysis_id" UUID NOT NULL,
    "bucket" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "deadline" TEXT NOT NULL,
    "deadline_at" DATE,
    "priority" "MisradTaskPriority" NOT NULL,
    "status" "MisradTaskStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_ai_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_assigned_forms" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "MisradAssignedFormStatus" NOT NULL,
    "progress" INTEGER NOT NULL,
    "dateSent" TEXT NOT NULL,
    "date_sent_at" TIMESTAMPTZ(6),
    "lastActivity" TEXT,
    "last_activity_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_assigned_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_clients" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "customer_account_id" UUID,
    "name" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "employeeCount" INTEGER NOT NULL,
    "logoInitials" TEXT NOT NULL,
    "healthScore" INTEGER NOT NULL,
    "healthStatus" "MisradHealthStatus" NOT NULL,
    "status" "MisradClientStatus" NOT NULL,
    "type" "MisradClientType" NOT NULL,
    "tags" TEXT[],
    "monthlyRetainer" INTEGER NOT NULL,
    "profitMargin" INTEGER NOT NULL,
    "lifetimeValue" INTEGER NOT NULL,
    "hoursLogged" INTEGER NOT NULL,
    "internalHourlyRate" INTEGER NOT NULL,
    "directExpenses" INTEGER NOT NULL,
    "profitabilityVerdict" TEXT NOT NULL,
    "lastContact" TEXT NOT NULL,
    "last_contact_at" TIMESTAMP(3),
    "nextRenewal" TEXT NOT NULL,
    "next_renewal_at" DATE,
    "mainContact" TEXT NOT NULL,
    "mainContactRole" TEXT NOT NULL,
    "strengths" TEXT[],
    "weaknesses" TEXT[],
    "sentimentTrend" "MisradSentiment"[],
    "referralStatus" TEXT NOT NULL,
    "cancellationDate" TEXT,
    "cancellation_date_at" DATE,
    "cancellationReason" TEXT,
    "cancellationNote" TEXT,
    "cycleId" UUID,
    "healthBreakdown" JSONB NOT NULL,
    "engagementMetrics" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_client_actions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "MisradClientActionType" NOT NULL,
    "status" "MisradClientActionStatus" NOT NULL,
    "dueDate" TEXT NOT NULL,
    "due_date_at" DATE,
    "isBlocking" BOOLEAN NOT NULL,
    "lastReminderSent" TEXT,
    "last_reminder_sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_client_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_client_agreements" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "type" "MisradAgreementType" NOT NULL,
    "signedDate" TEXT NOT NULL,
    "signed_date_at" DATE,
    "expiryDate" TEXT,
    "expiry_date_at" DATE,
    "status" "MisradAgreementStatus" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_client_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_client_assets" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MisradAssetType" NOT NULL,
    "url" TEXT NOT NULL,
    "category" "MisradAssetCategory" NOT NULL,
    "uploadedBy" "MisradUploadedBy" NOT NULL,
    "date" TEXT NOT NULL,
    "date_at" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_client_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_client_deliverables" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "MisradDeliverableType" NOT NULL,
    "thumbnailUrl" TEXT,
    "status" "MisradDeliverableStatus" NOT NULL,
    "date" TEXT NOT NULL,
    "date_at" DATE,
    "tags" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_client_deliverables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_client_handoffs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "salesRep" TEXT NOT NULL,
    "handoffDate" TEXT NOT NULL,
    "handoff_date_at" DATE,
    "keyPromises" TEXT[],
    "mainPainPoint" TEXT NOT NULL,
    "successDefinition30Days" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_client_handoffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_client_transformations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "metrics" TEXT,
    "isPublished" BOOLEAN NOT NULL,
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_client_transformations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_cycles" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "start_date_at" DATE,
    "endDate" TEXT NOT NULL,
    "end_date_at" DATE,
    "status" "MisradCycleStatus" NOT NULL,
    "groupLinks" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_cycle_assets" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "cycle_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MisradAssetType" NOT NULL,
    "url" TEXT NOT NULL,
    "category" "MisradAssetCategory" NOT NULL,
    "uploadedBy" "MisradUploadedBy" NOT NULL,
    "date" TEXT NOT NULL,
    "date_at" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "misrad_cycle_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_cycle_tasks" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "cycle_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "MisradClientActionType" NOT NULL,
    "status" "MisradClientActionStatus" NOT NULL,
    "dueDate" TEXT NOT NULL,
    "due_date_at" DATE,
    "isBlocking" BOOLEAN NOT NULL,
    "lastReminderSent" TEXT,
    "last_reminder_sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_cycle_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_emails" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID,
    "sender" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "snippet" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "timestamp_at" TIMESTAMPTZ(6),
    "isRead" BOOLEAN NOT NULL,
    "tags" TEXT[],
    "avatarUrl" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_feedback_items" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "clientName" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "date_at" DATE,
    "keywords" TEXT[],
    "sentiment" "MisradFeedbackSentiment" NOT NULL,
    "source" "MisradFeedbackSource" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "misrad_feedback_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_form_fields" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "step_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "type" "MisradFieldType" NOT NULL,
    "required" BOOLEAN NOT NULL,
    "options" TEXT[],
    "placeholder" TEXT,
    "helperText" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_form_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_form_responses" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "assigned_form_id" UUID,
    "status" "MisradAssignedFormStatus" NOT NULL,
    "progress" INTEGER NOT NULL,
    "answers" JSONB NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_form_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_form_steps" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_form_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_form_templates" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL,
    "category" "MisradFormCategory" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_form_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_group_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "cycle_id" UUID,
    "title" TEXT NOT NULL,
    "type" "MisradGroupEventType" NOT NULL,
    "date" TEXT NOT NULL,
    "date_at" DATE,
    "targetSegment" TEXT NOT NULL,
    "attendeesCount" INTEGER NOT NULL,
    "link" TEXT NOT NULL,
    "status" "MisradGroupEventStatus" NOT NULL,
    "attendees" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_group_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_invoices" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "dueDate" TEXT NOT NULL,
    "date_at" DATE,
    "due_date_at" DATE,
    "status" "MisradInvoiceStatus" NOT NULL,
    "downloadUrl" TEXT NOT NULL,
    "draft_description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_journey_stages" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "MisradJourneyStageStatus" NOT NULL,
    "date" TEXT,
    "date_at" DATE,
    "completionPercentage" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_journey_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_meetings" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "date" TEXT NOT NULL,
    "date_at" DATE,
    "meeting_at" TIMESTAMPTZ(6),
    "title" TEXT NOT NULL,
    "location" "MisradMeetingLocation" NOT NULL,
    "attendees" TEXT[],
    "transcript" TEXT NOT NULL,
    "summary" TEXT,
    "recordingUrl" TEXT,
    "manualNotes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_meeting_analysis_results" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "summary" TEXT NOT NULL,
    "sentimentScore" INTEGER NOT NULL,
    "frictionKeywords" TEXT[],
    "objections" TEXT[],
    "compliments" TEXT[],
    "decisions" TEXT[],
    "intents" TEXT[],
    "stories" TEXT[],
    "slang" TEXT[],
    "rating" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_meeting_analysis_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_meeting_files" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "MisradMeetingFileType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "misrad_meeting_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_messages" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "sender_id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read_status" BOOLEAN NOT NULL DEFAULT false,
    "related_project_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_message_attachments" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "misrad_message_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_metric_history" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "goal_id" UUID NOT NULL,
    "date" TEXT NOT NULL,
    "date_at" DATE,
    "value" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "misrad_metric_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_milestones" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "stage_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL,
    "required" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_module_settings" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "cycles" BOOLEAN NOT NULL,
    "intelligence" BOOLEAN NOT NULL,
    "portals" BOOLEAN NOT NULL,
    "workflows" BOOLEAN NOT NULL,
    "feedback" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_module_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_notifications" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID,
    "type" "MisradNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "timestamp_at" TIMESTAMPTZ(6),
    "is_read" BOOLEAN NOT NULL,
    "link" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "recipient_id" UUID,

    CONSTRAINT "misrad_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_opportunities" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "matchScore" INTEGER NOT NULL,
    "status" "MisradOpportunityStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_roi_records" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "date" TEXT NOT NULL,
    "date_at" DATE,
    "value" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "category" "MisradRoiCategory" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "misrad_roi_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_stakeholders" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "nexusRole" "MisradStakeholderRole" NOT NULL,
    "influence" INTEGER NOT NULL,
    "sentiment" INTEGER NOT NULL,
    "lastContact" TEXT NOT NULL,
    "last_contact_at" TIMESTAMPTZ(6),
    "email" TEXT,
    "avatarUrl" TEXT,
    "notes" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_stakeholders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_success_goals" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "metricCurrent" DOUBLE PRECISION NOT NULL,
    "metricTarget" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "deadline" TEXT NOT NULL,
    "deadline_at" DATE,
    "status" "MisradSuccessGoalStatus" NOT NULL,
    "lastUpdated" TEXT NOT NULL,
    "last_updated_at" TIMESTAMPTZ(6),
    "aiForecast" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_success_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_workflow_blueprints" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "totalDuration" TEXT NOT NULL,
    "tags" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_workflow_blueprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_workflow_items" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "stage_id" UUID NOT NULL,
    "type" "MisradWorkflowItemType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isAutomated" BOOLEAN NOT NULL,
    "assetLink" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_workflow_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_workflow_stages" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "blueprint_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_workflow_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "navigation_menu" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "view" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_visible" BOOLEAN DEFAULT true,
    "requires_client" BOOLEAN DEFAULT false,
    "requires_role" JSONB,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "navigation_menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nexus_billing_items" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "item_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cadence" TEXT NOT NULL,
    "amount" DECIMAL,
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nexus_billing_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nexus_employee_invitation_links" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "created_by" UUID,
    "department" TEXT,
    "role" TEXT,
    "employee_email" TEXT,
    "employee_name" TEXT,
    "employee_phone" TEXT,
    "payment_type" TEXT,
    "hourly_rate" DECIMAL(10,2),
    "monthly_salary" DECIMAL(10,2),
    "commission_pct" INTEGER,
    "start_date" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "used_at" TIMESTAMPTZ(6),
    "is_used" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,
    "metadata" JSONB DEFAULT '{}',
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_invitation_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nexus_event_attendance" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" TEXT DEFAULT 'invited',
    "rsvp_at" TIMESTAMPTZ(6),
    "attended_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nexus_leave_requests" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "tenant_id" UUID,
    "employee_id" UUID NOT NULL,
    "leave_type" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "days_requested" DECIMAL(5,2) NOT NULL,
    "reason" TEXT,
    "status" TEXT DEFAULT 'pending',
    "requested_by" UUID,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,
    "notification_sent" BOOLEAN DEFAULT false,
    "employee_notified" BOOLEAN DEFAULT false,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nexus_onboarding_settings" (
    "organization_id" UUID NOT NULL,
    "template_key" TEXT NOT NULL,
    "selected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nexus_onboarding_settings_pkey" PRIMARY KEY ("organization_id")
);

-- CreateTable
CREATE TABLE "nexus_team_events" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "tenant_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "event_type" TEXT NOT NULL,
    "start_date" TIMESTAMPTZ(6) NOT NULL,
    "end_date" TIMESTAMPTZ(6) NOT NULL,
    "all_day" BOOLEAN DEFAULT false,
    "location" TEXT,
    "organizer_id" UUID,
    "required_attendees" UUID[] DEFAULT ARRAY[]::UUID[],
    "optional_attendees" UUID[] DEFAULT ARRAY[]::UUID[],
    "status" TEXT DEFAULT 'scheduled',
    "requires_approval" BOOLEAN DEFAULT false,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "notification_sent" BOOLEAN DEFAULT false,
    "reminder_sent" BOOLEAN DEFAULT false,
    "reminder_days_before" INTEGER DEFAULT 1,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nexus_clients" (
    "id" TEXT NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "avatar" TEXT,
    "package" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Onboarding',
    "contact_person" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assets_folder_url" TEXT,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nexus_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nexus_tasks" (
    "id" TEXT NOT NULL,
    "organization_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "priority" TEXT,
    "assignee_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "assignee_id" TEXT,
    "creator_id" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" DATE,
    "due_time" TIME(6),
    "time_spent" INTEGER NOT NULL DEFAULT 0,
    "estimated_time" INTEGER,
    "approval_status" TEXT,
    "is_timer_running" BOOLEAN NOT NULL DEFAULT false,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "client_id" TEXT,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "audio_url" TEXT,
    "snooze_count" INTEGER NOT NULL DEFAULT 0,
    "is_focus" BOOLEAN NOT NULL DEFAULT false,
    "completion_details" JSONB,
    "department" TEXT,
    "share_token" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nexus_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nexus_tenants" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "owner_email" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT DEFAULT 'Provisioning',
    "joined_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "mrr" DECIMAL(10,2) DEFAULT 0,
    "users_count" INTEGER DEFAULT 0,
    "logo" TEXT,
    "modules" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "region" TEXT,
    "version" TEXT,
    "allowed_emails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "require_approval" BOOLEAN DEFAULT false,
    "phone" TEXT,
    "max_users" INTEGER,
    "default_language" TEXT DEFAULT 'he',
    "activation_date" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "organization_id" UUID,

    CONSTRAINT "nexus_tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nexus_time_entries" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "start_time" TIMESTAMPTZ(6) NOT NULL,
    "end_time" TIMESTAMPTZ(6),
    "start_lat" DOUBLE PRECISION,
    "start_lng" DOUBLE PRECISION,
    "start_accuracy" DOUBLE PRECISION,
    "start_city" TEXT,
    "end_lat" DOUBLE PRECISION,
    "end_lng" DOUBLE PRECISION,
    "end_accuracy" DOUBLE PRECISION,
    "end_city" TEXT,
    "date" DATE NOT NULL,
    "duration_minutes" INTEGER,
    "note" TEXT,
    "void_reason" TEXT,
    "voided_by" UUID,
    "voided_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nexus_time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_monthly_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "employee_name" TEXT NOT NULL,
    "employee_number" TEXT,
    "department" TEXT,
    "standard_daily_hours" DECIMAL(5,2) NOT NULL DEFAULT 9,
    "total_presence_days" INTEGER NOT NULL DEFAULT 0,
    "total_standard_days" INTEGER NOT NULL DEFAULT 0,
    "total_presence_minutes" INTEGER NOT NULL DEFAULT 0,
    "total_standard_minutes" INTEGER NOT NULL DEFAULT 0,
    "total_break_minutes" INTEGER NOT NULL DEFAULT 0,
    "paid_break_minutes" INTEGER NOT NULL DEFAULT 0,
    "total_payable_minutes" INTEGER NOT NULL DEFAULT 0,
    "regular_minutes" INTEGER NOT NULL DEFAULT 0,
    "overtime_100_minutes" INTEGER NOT NULL DEFAULT 0,
    "overtime_125_minutes" INTEGER NOT NULL DEFAULT 0,
    "overtime_150_minutes" INTEGER NOT NULL DEFAULT 0,
    "overtime_175_minutes" INTEGER NOT NULL DEFAULT 0,
    "overtime_200_minutes" INTEGER NOT NULL DEFAULT 0,
    "absence_minutes" INTEGER NOT NULL DEFAULT 0,
    "daily_breakdown" JSONB,
    "events" JSONB,
    "pdf_url" TEXT,
    "sent_at" TIMESTAMPTZ(6),
    "sent_via_email" BOOLEAN NOT NULL DEFAULT false,
    "sent_via_push" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_monthly_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_salary_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "standard_daily_hours" DECIMAL(5,2) NOT NULL DEFAULT 9,
    "break_minutes_per_day" INTEGER NOT NULL DEFAULT 24,
    "paid_break" BOOLEAN NOT NULL DEFAULT true,
    "overtime_125_after" INTEGER NOT NULL DEFAULT 0,
    "overtime_150_after" INTEGER NOT NULL DEFAULT 120,
    "overtime_175_after" INTEGER NOT NULL DEFAULT 0,
    "overtime_200_after" INTEGER NOT NULL DEFAULT 180,
    "weekly_overtime_enabled" BOOLEAN NOT NULL DEFAULT false,
    "weekly_standard_hours" INTEGER NOT NULL DEFAULT 43,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_salary_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nexus_users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "department" TEXT,
    "avatar" TEXT,
    "online" BOOLEAN DEFAULT false,
    "last_seen_at" TIMESTAMPTZ(6),
    "capacity" INTEGER DEFAULT 0,
    "email" TEXT,
    "phone" TEXT,
    "location" TEXT,
    "bio" TEXT,
    "payment_type" TEXT,
    "hourly_rate" DECIMAL(10,2),
    "monthly_salary" DECIMAL(10,2),
    "commission_pct" INTEGER,
    "bonus_per_task" DECIMAL(10,2),
    "accumulated_bonus" DECIMAL(10,2) DEFAULT 0,
    "streak_days" INTEGER DEFAULT 0,
    "weekly_score" DECIMAL(5,2),
    "pending_reward" JSONB,
    "targets" JSONB,
    "notification_preferences" JSONB,
    "two_factor_enabled" BOOLEAN DEFAULT false,
    "is_super_admin" BOOLEAN DEFAULT false,
    "billing_info" JSONB,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "manager_id" UUID,
    "role_id" UUID,
    "managed_department" TEXT,
    "ui_preferences" JSONB DEFAULT '{}',

    CONSTRAINT "nexus_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_tokens" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "integration_name" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "token_type" TEXT DEFAULT 'Bearer',
    "expires_at" TIMESTAMPTZ(6),
    "scope" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations_inventory" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "on_hand" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "min_level" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations_items" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "supplier_id" UUID,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "cost" DECIMAL(12,2),
    "image_url" TEXT,
    "image_vector" vector,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations_projects" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "canonical_client_id" UUID,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "installation_address" TEXT,
    "address_normalized" TEXT,
    "source" TEXT,
    "source_ref_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations_suppliers" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "contact_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations_purchase_orders" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "supplier_id" UUID,
    "po_number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "total_amount" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "expected_delivery" TIMESTAMPTZ(6),
    "sent_at" TIMESTAMPTZ(6),
    "received_at" TIMESTAMPTZ(6),
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations_purchase_order_items" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "purchase_order_id" UUID NOT NULL,
    "item_id" UUID,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,
    "received_qty" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations_contractor_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "contractor_label" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_contractor_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations_work_orders" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "project_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "priority" TEXT DEFAULT 'NORMAL',
    "created_by_type" TEXT NOT NULL DEFAULT 'INTERNAL',
    "created_by_ref" TEXT,
    "installation_address" TEXT,
    "address_normalized" TEXT,
    "scheduled_start" TIMESTAMPTZ(6),
    "scheduled_end" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_technician_id" UUID,
    "installation_lat" DOUBLE PRECISION,
    "installation_lng" DOUBLE PRECISION,
    "stock_source_holder_id" UUID,
    "completion_signature_url" TEXT,
    "category_id" UUID,
    "department_id" UUID,
    "building_id" UUID,
    "floor" TEXT,
    "unit" TEXT,
    "reporter_name" TEXT,
    "reporter_phone" TEXT,
    "sla_deadline" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "transferred_from_id" UUID,
    "transfer_approved_by_id" UUID,
    "ai_summary" TEXT,

    CONSTRAINT "operations_work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations_buildings" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "floors" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations_call_categories" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "max_response_minutes" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_call_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations_departments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations_call_messages" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "author_name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachment_url" TEXT,
    "attachment_type" TEXT,
    "mentions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_call_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_settings" (
    "organization_id" UUID NOT NULL,
    "ai_dna" JSONB NOT NULL DEFAULT '{}',
    "ai_sales_context" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ai_quota_cents" BIGINT,

    CONSTRAINT "organization_settings_pkey" PRIMARY KEY ("organization_id")
);

-- CreateTable
CREATE TABLE "organization_signup_invitations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "token" TEXT NOT NULL,
    "owner_email" TEXT NOT NULL,
    "organization_name" TEXT NOT NULL,
    "desired_slug" TEXT NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "used_by_user_id" UUID,
    "used_by_clerk_user_id" TEXT,
    "organization_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "organization_signup_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "clerk_user_id" TEXT NOT NULL,
    "email" TEXT,
    "full_name" TEXT,
    "avatar_url" TEXT,
    "terms_accepted_at" TIMESTAMPTZ(6),
    "privacy_accepted_at" TIMESTAMPTZ(6),
    "terms_accepted_version" TEXT,
    "privacy_accepted_version" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "organization_id" UUID,
    "role" TEXT DEFAULT 'team_member',
    "allowed_modules" TEXT[] DEFAULT ARRAY['nexus', 'client']::TEXT[],
    "last_org_slug" TEXT,
    "last_module" TEXT,

    CONSTRAINT "organization_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "referral_code" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_credentials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "platform" TEXT NOT NULL,
    "username" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_credentials_pkey1" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_quotas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "platform" TEXT NOT NULL,
    "monthly_limit" INTEGER DEFAULT 0,
    "current_usage" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_quotas_pkey1" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "clerk_user_id" TEXT NOT NULL,
    "email" TEXT,
    "full_name" TEXT,
    "avatar_url" TEXT,
    "phone" TEXT,
    "location" TEXT,
    "bio" TEXT,
    "notification_preferences" JSONB NOT NULL DEFAULT '{}',
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "ui_preferences" JSONB NOT NULL DEFAULT '{}',
    "social_profile" JSONB NOT NULL DEFAULT '{}',
    "billing_info" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_calendar_sync_log" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "integration_id" UUID,
    "event_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_sync_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_feature_requests" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "tenant_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "votes" JSONB DEFAULT '[]',
    "assigned_to" UUID,
    "reviewed_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "metadata" JSONB DEFAULT '{}',
    "admin_notes" TEXT,
    "rejection_reason" TEXT,

    CONSTRAINT "feature_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_integrations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "tenant_id" UUID,
    "service_type" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "token_type" TEXT DEFAULT 'Bearer',
    "expires_at" TIMESTAMPTZ(6),
    "scope" TEXT[],
    "metadata" JSONB DEFAULT '{}',
    "is_active" BOOLEAN DEFAULT true,
    "last_synced_at" TIMESTAMPTZ(6),
    "sync_error" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_permissions" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT DEFAULT 'access',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_roles" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN DEFAULT false,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_support_tickets" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "tenant_id" UUID,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "ticket_number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "assigned_to" UUID,
    "resolved_by" UUID,
    "last_updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "read_at" TIMESTAMPTZ(6),
    "handled_at" TIMESTAMPTZ(6),
    "sla_deadline" TIMESTAMPTZ(6),
    "first_response_at" TIMESTAMPTZ(6),
    "resolution_time_minutes" INTEGER,
    "metadata" JSONB DEFAULT '{}',
    "admin_response" TEXT,
    "resolution_notes" TEXT,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "logo" TEXT,
    "owner_id" UUID NOT NULL,
    "partner_id" UUID,
    "client_id" UUID,
    "has_nexus" BOOLEAN DEFAULT false,
    "has_social" BOOLEAN DEFAULT false,
    "has_system" BOOLEAN DEFAULT false,
    "has_finance" BOOLEAN DEFAULT false,
    "has_client" BOOLEAN DEFAULT false,
    "seats_allowed" INTEGER,
    "active_users_count" INTEGER DEFAULT 0,
    "subscription_plan" VARCHAR(50),
    "subscription_status" VARCHAR(20) DEFAULT 'trial',
    "trial_start_date" TIMESTAMPTZ(6),
    "trial_days" INTEGER DEFAULT 7,
    "subscription_start_date" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "ai_credits_balance_cents" BIGINT NOT NULL DEFAULT 0,
    "has_operations" BOOLEAN NOT NULL DEFAULT false,
    "is_shabbat_protected" BOOLEAN NOT NULL DEFAULT true,
    "is_medical_exempt" BOOLEAN NOT NULL DEFAULT false,
    "billing_cycle" TEXT,
    "billing_email" TEXT,
    "payment_method_id" TEXT,
    "next_billing_date" DATE,
    "mrr" DECIMAL(10,2) DEFAULT 0,
    "arr" DECIMAL(10,2) DEFAULT 0,
    "discount_percent" INTEGER DEFAULT 0,
    "trial_extended_days" INTEGER DEFAULT 0,
    "trial_end_date" DATE,
    "last_payment_date" TIMESTAMPTZ(6),
    "last_payment_amount" DECIMAL(10,2),
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tax_id" TEXT,
    "cancellation_date" TIMESTAMPTZ(6),
    "cancellation_reason" TEXT,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "socialmedia_agency_configs" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "is_enabled" BOOLEAN DEFAULT true,
    "base_price" DECIMAL(10,2) NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "is_recurring" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agency_service_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "socialmedia_ai_opportunities" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "client_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "draft_content" TEXT,
    "media_url" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "socialmedia_automation_rules" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "client_id" UUID,
    "type" TEXT NOT NULL,
    "trigger_days" INTEGER NOT NULL,
    "is_enabled" BOOLEAN DEFAULT true,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "socialmedia_business_metrics" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "client_id" UUID NOT NULL,
    "time_spent_minutes" INTEGER DEFAULT 0,
    "expected_hours" DECIMAL(5,2) DEFAULT 0,
    "punctuality_score" INTEGER DEFAULT 0,
    "responsiveness_score" INTEGER DEFAULT 0,
    "revision_count" INTEGER DEFAULT 0,
    "last_ai_business_audit" TEXT,
    "days_overdue" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "socialmedia_calendar_events" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "client_id" UUID,
    "google_event_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_time" TIMESTAMPTZ(6) NOT NULL,
    "end_time" TIMESTAMPTZ(6),
    "calendar_id" TEXT,
    "is_all_day" BOOLEAN DEFAULT false,
    "location" TEXT,
    "attendees" TEXT[],
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "socialmedia_campaigns" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "client_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT DEFAULT 'draft',
    "objective" TEXT DEFAULT 'awareness',
    "budget" DECIMAL(10,2) NOT NULL,
    "spent" DECIMAL(10,2) DEFAULT 0,
    "roas" DECIMAL(5,2) DEFAULT 0,
    "impressions" INTEGER DEFAULT 0,
    "clicks" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "socialmedia_clients" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "name" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "business_id" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "avatar" TEXT,
    "brand_voice" TEXT,
    "posting_rhythm" TEXT,
    "status" TEXT DEFAULT 'Onboarding',
    "onboarding_status" TEXT,
    "invitation_token" TEXT,
    "portal_token" TEXT NOT NULL,
    "color" TEXT,
    "plan" TEXT,
    "monthly_fee" DECIMAL(10,2),
    "next_payment_date" DATE,
    "next_payment_amount" DECIMAL(10,2),
    "payment_status" TEXT,
    "auto_reminders_enabled" BOOLEAN DEFAULT false,
    "saved_card_thumbnail" TEXT,
    "internal_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,
    "organization_id" UUID NOT NULL
);

-- CreateTable
CREATE TABLE "socialmedia_client_dna" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "client_id" UUID NOT NULL,
    "brand_summary" TEXT,
    "voice_formal" INTEGER,
    "voice_funny" INTEGER,
    "voice_length" INTEGER,
    "vocabulary_loved" JSONB DEFAULT '[]',
    "vocabulary_forbidden" JSONB DEFAULT '[]',
    "color_primary" TEXT,
    "color_secondary" TEXT,
    "target_audience" TEXT,
    "pain_points" TEXT,
    "unique_value" TEXT,
    "competitors" TEXT,
    "main_goal" TEXT,
    "ai_strategy_summary" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_dna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "socialmedia_client_platforms" (
    "client_id" UUID NOT NULL,
    "platform" TEXT NOT NULL,

    CONSTRAINT "client_active_platforms_pkey" PRIMARY KEY ("client_id","platform")
);

-- CreateTable
CREATE TABLE "socialmedia_client_requests" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "media_url" TEXT,
    "status" TEXT DEFAULT 'new',
    "manager_comment" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "socialmedia_conversations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "platform" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "user_avatar" TEXT,
    "last_message" TEXT,
    "unread_count" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "socialmedia_drive_files" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "client_id" UUID,
    "google_file_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mime_type" TEXT,
    "size_bytes" BIGINT,
    "folder_path" TEXT,
    "web_view_link" TEXT,
    "thumbnail_link" TEXT,
    "synced_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drive_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "socialmedia_feedback" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "client_id" UUID,
    "type" TEXT DEFAULT 'other',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT DEFAULT 'new',
    "priority" TEXT DEFAULT 'medium',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "socialmedia_ideas" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ideas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "socialmedia_invoices" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "client_id" UUID NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" DATE NOT NULL,
    "status" TEXT DEFAULT 'pending',
    "download_url" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "socialmedia_manager_requests" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT DEFAULT 'pending',
    "type" TEXT NOT NULL,
    "feedback_from_client" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manager_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "socialmedia_messages" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "is_me" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "socialmedia_payment_orders" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "client_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "status" TEXT DEFAULT 'pending',
    "installments_allowed" INTEGER DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "socialmedia_platform_credentials" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "client_id" UUID NOT NULL,
    "platform" TEXT NOT NULL,
    "username" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "socialmedia_platform_quotas" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "client_id" UUID NOT NULL,
    "platform" TEXT NOT NULL,
    "monthly_limit" INTEGER DEFAULT 0,
    "current_usage" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_quotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "socialmedia_post_comments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "team_member_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "socialmedia_post_platforms" (
    "organization_id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "platform" TEXT NOT NULL,

    CONSTRAINT "post_platforms_pkey" PRIMARY KEY ("post_id","platform")
);

-- CreateTable
CREATE TABLE "socialmedia_post_variations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image_suggestion" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_variations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "socialmedia_sheets_sync_configs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "spreadsheet_id" TEXT NOT NULL,
    "sheet_name" TEXT NOT NULL,
    "sync_type" TEXT NOT NULL,
    "range" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "last_synced_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sheets_sync_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "socialmedia_site_content" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "page" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "socialmedia_sync_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "integration_name" TEXT NOT NULL,
    "sync_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "items_synced" INTEGER DEFAULT 0,
    "error_message" TEXT,
    "started_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "metadata" JSONB,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "socialmedia_tasks" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "client_id" UUID,
    "assigned_to" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_date" DATE NOT NULL,
    "priority" TEXT DEFAULT 'medium',
    "status" TEXT DEFAULT 'todo',
    "type" TEXT DEFAULT 'general',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "socialmedia_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "socialmedia_posts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "media_url" TEXT,
    "status" TEXT DEFAULT 'draft',
    "scheduled_at" TIMESTAMPTZ(6),
    "published_at" TIMESTAMPTZ(6),
    "is_late" BOOLEAN DEFAULT false,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,

    CONSTRAINT "socialmedia_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategic_content" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,

    CONSTRAINT "strategic_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_items" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "subscription_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "module_key" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "unit_amount" DECIMAL(10,2),
    "currency" TEXT DEFAULT 'ILS',
    "start_at" TIMESTAMPTZ(6),
    "end_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "subscription_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_orders" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "clerk_user_id" TEXT,
    "social_user_id" UUID,
    "organization_id" UUID,
    "package_type" TEXT,
    "plan_key" TEXT,
    "billing_cycle" TEXT NOT NULL,
    "amount" DECIMAL(10,2) DEFAULT 0,
    "amount_before_discount" DECIMAL(10,2) DEFAULT 0,
    "coupon_discount" DECIMAL(10,2) DEFAULT 0,
    "currency" TEXT DEFAULT 'ILS',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payment_method" TEXT NOT NULL DEFAULT 'bit',
    "customer_name" TEXT,
    "customer_email" TEXT,
    "customer_phone" TEXT,
    "bit_reference" TEXT,
    "bit_payment_link" TEXT,
    "bit_qr_url" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "pending_verification_at" TIMESTAMPTZ(6),
    "proof_image_url" TEXT,
    "proof_image_path" TEXT,
    "seats" INTEGER,
    "coupon_id" UUID,

    CONSTRAINT "subscription_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_payment_configs" (
    "package_type" TEXT NOT NULL,
    "title" TEXT,
    "qr_image_url" TEXT,
    "instructions_text" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "payment_method" TEXT DEFAULT 'manual',
    "external_payment_url" TEXT,

    CONSTRAINT "subscription_payment_configs_pkey" PRIMARY KEY ("package_type")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "billing_cycle" TEXT NOT NULL,
    "current_period_start" TIMESTAMPTZ(6) NOT NULL,
    "current_period_end" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_ticket_events" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "ticket_id" UUID NOT NULL,
    "tenant_id" UUID,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "content" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_ticket_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_invitation_links" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "token" TEXT NOT NULL,
    "client_id" UUID,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "used_at" TIMESTAMPTZ(6),
    "is_used" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,
    "ceo_name" TEXT,
    "ceo_email" TEXT,
    "ceo_phone" TEXT,
    "company_name" TEXT,
    "company_logo" TEXT,
    "company_address" TEXT,
    "company_website" TEXT,
    "additional_notes" TEXT,
    "source" TEXT DEFAULT 'manual',
    "metadata" JSONB DEFAULT '{}',
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitation_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID,
    "system_flags" JSONB DEFAULT '{}',
    "maintenance_mode" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_assets" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "is_secure" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_automations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN DEFAULT true,
    "trigger_type" TEXT NOT NULL,
    "trigger_status" TEXT,
    "action_type" TEXT NOT NULL,
    "task_title" TEXT,
    "task_due_days" INTEGER,
    "task_priority" TEXT,
    "note_text" TEXT,
    "runs" INTEGER DEFAULT 0,
    "last_run" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_automations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_backups" (
    "id" TEXT NOT NULL,
    "status" TEXT DEFAULT 'pending',
    "size" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "error_message" TEXT,

    CONSTRAINT "system_backups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_calendar_events" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "lead_id" UUID,
    "title" TEXT NOT NULL,
    "lead_name" TEXT NOT NULL,
    "lead_company" TEXT NOT NULL,
    "day_name" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "occurs_at" TIMESTAMPTZ(6),
    "type" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "participants" INTEGER,
    "reminders" JSONB,
    "post_meeting" JSONB,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_call_analyses" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "lead_id" UUID,
    "file_name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "audio_url" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "score" INTEGER DEFAULT 0,
    "intent" TEXT NOT NULL,
    "user_notes" TEXT,
    "transcript" JSONB DEFAULT '[]',
    "topics" JSONB DEFAULT '{}',
    "feedback" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "call_at" TIMESTAMPTZ(6),

    CONSTRAINT "system_call_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_campaigns" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "budget" DECIMAL(10,2) DEFAULT 0,
    "spent" DECIMAL(10,2) DEFAULT 0,
    "leads" INTEGER DEFAULT 0,
    "cpl" DECIMAL(10,2) DEFAULT 0,
    "roas" DECIMAL(10,2) DEFAULT 0,
    "impressions" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_content_items" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "assignee" TEXT NOT NULL,
    "views" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_content_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_field_agents" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "location_x" DECIMAL(10,6) NOT NULL,
    "location_y" DECIMAL(10,6) NOT NULL,
    "avatar" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "current_task" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_field_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_forms" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "views" INTEGER DEFAULT 0,
    "conversions" INTEGER DEFAULT 0,
    "fields" JSONB DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_invoices" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "lead_id" UUID,
    "client" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "refund_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_leads" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "customer_account_id" UUID,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "value" DECIMAL(10,2) DEFAULT 0,
    "last_contact" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "is_hot" BOOLEAN DEFAULT false,
    "score" INTEGER DEFAULT 0,
    "address" TEXT,
    "location_x" DECIMAL(10,6),
    "location_y" DECIMAL(10,6),
    "assigned_agent_id" UUID,
    "subscription_end_date" TIMESTAMPTZ(6),
    "product_interest" TEXT,
    "playbook_step" TEXT,
    "budget_hours" INTEGER,
    "logged_hours" INTEGER,
    "ai_tags" JSONB DEFAULT '[]',
    "closure_probability" INTEGER,
    "closure_rationale" TEXT,
    "recommended_action" TEXT,
    "custom_fields" JSONB DEFAULT '{}',
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "installation_address" TEXT,
    "next_action_date" TIMESTAMPTZ(6),
    "next_action_date_suggestion" TIMESTAMPTZ(6),
    "next_action_note" TEXT,
    "next_action_date_rationale" TEXT,

    CONSTRAINT "system_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_lead_activities" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "direction" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_lead_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_lead_custom_field_definitions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'string',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_lead_custom_field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_lead_handovers" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "non_standard_promises" TEXT NOT NULL,
    "biggest_pain" TEXT NOT NULL,
    "expectations_30_days" TEXT NOT NULL,
    "filled_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_lead_handovers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_partners" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "referrals" INTEGER DEFAULT 0,
    "revenue" DECIMAL(10,2) DEFAULT 0,
    "commission_rate" DECIMAL(5,2) DEFAULT 0,
    "unpaid_commission" DECIMAL(10,2) DEFAULT 0,
    "last_active" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_pipeline_stages" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT,
    "accent" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_pipeline_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_portal_approvals" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_portal_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_portal_tasks" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "form_fields" JSONB DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_portal_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_students" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "progress" INTEGER DEFAULT 0,
    "status" TEXT NOT NULL,
    "cohort" TEXT NOT NULL,
    "last_check_in" TIMESTAMPTZ(6) NOT NULL,
    "next_hot_seat" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_support_tickets" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_tasks" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignee_id" UUID NOT NULL,
    "due_date" TIMESTAMPTZ(6) NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "tags" JSONB DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_webhook_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "timestamp" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "channel" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "system_webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_comments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "team_member_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "member_type" TEXT NOT NULL,
    "avatar" TEXT,
    "active_tasks_count" INTEGER DEFAULT 0,
    "capacity_score" INTEGER DEFAULT 0,
    "hourly_rate" DECIMAL(10,2),
    "monthly_salary" DECIMAL(10,2),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT,
    "plan" TEXT DEFAULT 'free',
    "trial_start_date" TIMESTAMPTZ(6),
    "trial_days" INTEGER DEFAULT 7,
    "subscription_status" TEXT,
    "subscription_start_date" TIMESTAMPTZ(6),
    "organization_id" UUID NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_member_clients" (
    "team_member_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,

    CONSTRAINT "team_member_clients_pkey" PRIMARY KEY ("team_member_id","client_id")
);

-- CreateTable
CREATE TABLE "user_update_views" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "update_id" UUID NOT NULL,
    "viewed_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_update_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_configs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "integration_name" TEXT NOT NULL,
    "webhook_url" TEXT NOT NULL,
    "secret_key" TEXT,
    "events" TEXT[],
    "is_active" BOOLEAN DEFAULT true,
    "last_triggered_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "web_push_subscriptions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "clerk_user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "expiration_time" TIMESTAMPTZ(6),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "web_push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_listings" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "source_org_id" UUID NOT NULL,
    "source_org_slug" TEXT NOT NULL,
    "source_user_id" UUID,
    "lead_id" UUID NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'LINK',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "target_geo" TEXT,
    "price" DECIMAL(10,2),
    "interested_name" TEXT,
    "interested_phone" TEXT,
    "interested_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_clients" (
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
CREATE TABLE "business_client_contacts" (
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
CREATE TABLE "Notification" (
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

-- CreateTable
CREATE TABLE "misrad_sales_teams" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT DEFAULT '#6366f1',
    "target_monthly" INTEGER DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_sales_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_sales_team_members" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "user_id" UUID,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "avatar" TEXT,
    "role" "MisradSalesTeamMemberRole" NOT NULL DEFAULT 'MEMBER',
    "target_monthly" INTEGER DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_sales_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_field_teams" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "area" TEXT,
    "color" TEXT DEFAULT '#f43f5e',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_field_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_field_agents" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "team_id" UUID,
    "user_id" UUID,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "avatar" TEXT,
    "area" TEXT,
    "status" "MisradFieldAgentStatus" NOT NULL DEFAULT 'AVAILABLE',
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "last_location_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_field_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_field_visits" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "client_name" TEXT NOT NULL,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "status" "MisradFieldVisitStatus" NOT NULL DEFAULT 'UPCOMING',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_field_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot_leads" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "business_name" TEXT,
    "email" TEXT,
    "industry" TEXT,
    "org_size" TEXT,
    "pain_point" TEXT,
    "selected_plan" TEXT,
    "source" TEXT,
    "status" "BotLeadStatus" NOT NULL DEFAULT 'new',
    "score" INTEGER NOT NULL DEFAULT 0,
    "last_interaction" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "organization_id" UUID,

    CONSTRAINT "bot_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot_conversations" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "rule_id" TEXT,
    "variables" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bot_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_analytics_sessions" (
    "id" TEXT NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "referrer" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "device_type" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "country" TEXT,
    "city" TEXT,
    "landing_page" TEXT,
    "signup_user_id" TEXT,
    "signed_up_at" TIMESTAMPTZ(6),
    "total_pages" INTEGER NOT NULL DEFAULT 0,
    "total_duration_ms" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_analytics_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_analytics_page_views" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "title" TEXT,
    "referrer_page" TEXT,
    "time_on_page_ms" INTEGER NOT NULL DEFAULT 0,
    "max_scroll_pct" INTEGER NOT NULL DEFAULT 0,
    "entered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMPTZ(6),

    CONSTRAINT "site_analytics_page_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_analytics_events" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_data" JSONB,
    "page_path" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_ratings" (
    "id" TEXT NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "feedback" TEXT,
    "google_clicked" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'in_app',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_sent_logs" (
    "id" TEXT NOT NULL,
    "email_type_id" TEXT NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "organization_id" UUID,
    "user_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "metadata" JSONB DEFAULT '{}',
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_sent_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT DEFAULT 'info',
    "is_read" BOOLEAN DEFAULT false,
    "target_type" TEXT DEFAULT 'all',
    "target_id" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMPTZ(6),

    CONSTRAINT "social_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_social_activity_logs_team_member_created_at" ON "activity_logs"("team_member_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_social_activity_logs_team_member_id" ON "activity_logs"("team_member_id");

-- CreateIndex
CREATE INDEX "idx_ai_embeddings_embedding_cosine" ON "ai_embeddings"("embedding");

-- CreateIndex
CREATE INDEX "idx_ai_embeddings_org" ON "ai_embeddings"("organization_id");

-- CreateIndex
CREATE INDEX "idx_ai_embeddings_org_module" ON "ai_embeddings"("organization_id", "module_id");

-- CreateIndex
CREATE INDEX "idx_ai_embeddings_org_user" ON "ai_embeddings"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_ai_embeddings_org_visibility" ON "ai_embeddings"("organization_id", "is_public_in_org");

-- CreateIndex
CREATE UNIQUE INDEX "ai_embeddings_organization_id_doc_key_chunk_index_key" ON "ai_embeddings"("organization_id", "doc_key", "chunk_index");

-- CreateIndex
CREATE INDEX "ai_feature_settings_feature_idx" ON "ai_feature_settings"("feature_key");

-- CreateIndex
CREATE INDEX "ai_feature_settings_org_idx" ON "ai_feature_settings"("organization_id");

-- CreateIndex
CREATE INDEX "ai_model_aliases_org_idx" ON "ai_model_aliases"("organization_id");

-- CreateIndex
CREATE INDEX "ai_model_aliases_provider_model_idx" ON "ai_model_aliases"("provider", "model");

-- CreateIndex
CREATE INDEX "ai_provider_keys_org_idx" ON "ai_provider_keys"("organization_id");

-- CreateIndex
CREATE INDEX "ai_provider_keys_provider_idx" ON "ai_provider_keys"("provider");

-- CreateIndex
CREATE INDEX "ai_usage_logs_feature_idx" ON "ai_usage_logs"("feature_key");

-- CreateIndex
CREATE INDEX "ai_usage_logs_org_created_idx" ON "ai_usage_logs"("organization_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ai_usage_logs_org_feature_created_idx" ON "ai_usage_logs"("organization_id", "feature_key", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ai_usage_logs_provider_idx" ON "ai_usage_logs"("provider");

-- CreateIndex
CREATE INDEX "idx_billing_events_org_id" ON "billing_events"("organization_id");

-- CreateIndex
CREATE INDEX "idx_billing_events_sub_id" ON "billing_events"("subscription_id");

-- CreateIndex
CREATE INDEX "idx_billing_events_type" ON "billing_events"("event_type");

-- CreateIndex
CREATE INDEX "idx_billing_events_org_type_occurred" ON "billing_events"("organization_id", "event_type", "occurred_at");

-- CreateIndex
CREATE INDEX "idx_billing_invoices_org_id" ON "billing_invoices"("organization_id");

-- CreateIndex
CREATE INDEX "idx_billing_invoices_morning_id" ON "billing_invoices"("morning_invoice_id");

-- CreateIndex
CREATE INDEX "idx_billing_invoices_status" ON "billing_invoices"("status");

-- CreateIndex
CREATE UNIQUE INDEX "idx_business_metrics_client_id_unique" ON "business_metrics"("client_id");

-- CreateIndex
CREATE INDEX "idx_business_metrics_client_id" ON "business_metrics"("client_id");

-- CreateIndex
CREATE INDEX "idx_charges_org_id" ON "charges"("organization_id");

-- CreateIndex
CREATE INDEX "idx_charges_status" ON "charges"("status");

-- CreateIndex
CREATE INDEX "idx_charges_sub_id" ON "charges"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "idx_client_dna_client_id_unique" ON "client_dna"("client_id");

-- CreateIndex
CREATE INDEX "idx_client_approvals_organization_id" ON "client_approvals"("organization_id");

-- CreateIndex
CREATE INDEX "idx_client_approvals_client_id" ON "client_approvals"("client_id");

-- CreateIndex
CREATE INDEX "idx_client_approvals_status" ON "client_approvals"("status");

-- CreateIndex
CREATE INDEX "idx_client_approvals_subject" ON "client_approvals"("subject_type", "subject_id");

-- CreateIndex
CREATE INDEX "idx_client_clients_organization_id" ON "client_clients"("organization_id");

-- CreateIndex
CREATE INDEX "idx_client_clients_full_name" ON "client_clients"("full_name");

-- CreateIndex
CREATE INDEX "idx_client_clients_org_created_at" ON "client_clients"("organization_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_client_documents_organization_id" ON "client_documents"("organization_id");

-- CreateIndex
CREATE INDEX "idx_client_documents_client_id" ON "client_documents"("client_id");

-- CreateIndex
CREATE INDEX "idx_client_documents_status" ON "client_documents"("status");

-- CreateIndex
CREATE INDEX "idx_client_documents_visible" ON "client_documents"("is_visible_to_client");

-- CreateIndex
CREATE INDEX "idx_client_document_files_organization_id" ON "client_document_files"("organization_id");

-- CreateIndex
CREATE INDEX "idx_client_document_files_client_id" ON "client_document_files"("client_id");

-- CreateIndex
CREATE INDEX "idx_client_document_files_document_id" ON "client_document_files"("document_id");

-- CreateIndex
CREATE INDEX "idx_client_feedbacks_organization_id" ON "client_feedbacks"("organization_id");

-- CreateIndex
CREATE INDEX "idx_client_feedbacks_client_id" ON "client_feedbacks"("client_id");

-- CreateIndex
CREATE INDEX "idx_client_feedbacks_rating" ON "client_feedbacks"("rating");

-- CreateIndex
CREATE INDEX "idx_client_feedbacks_created_at" ON "client_feedbacks"("created_at");

-- CreateIndex
CREATE INDEX "idx_client_internal_notes_organization_id" ON "client_internal_notes"("organization_id");

-- CreateIndex
CREATE INDEX "idx_client_internal_notes_client_id" ON "client_internal_notes"("client_id");

-- CreateIndex
CREATE INDEX "idx_client_internal_notes_created_at" ON "client_internal_notes"("created_at");

-- CreateIndex
CREATE INDEX "idx_client_portal_content_organization_id" ON "client_portal_content"("organization_id");

-- CreateIndex
CREATE INDEX "idx_client_portal_content_client_id" ON "client_portal_content"("client_id");

-- CreateIndex
CREATE INDEX "idx_client_portal_content_kind" ON "client_portal_content"("kind");

-- CreateIndex
CREATE INDEX "idx_client_portal_content_is_published" ON "client_portal_content"("is_published");

-- CreateIndex
CREATE INDEX "idx_client_portal_invites_organization_id" ON "client_portal_invites"("organization_id");

-- CreateIndex
CREATE INDEX "idx_client_portal_invites_client_id" ON "client_portal_invites"("client_id");

-- CreateIndex
CREATE INDEX "idx_client_portal_invites_email" ON "client_portal_invites"("email");

-- CreateIndex
CREATE INDEX "idx_client_portal_invites_expires_at" ON "client_portal_invites"("expires_at");

-- CreateIndex
CREATE INDEX "idx_client_portal_users_organization_id" ON "client_portal_users"("organization_id");

-- CreateIndex
CREATE INDEX "idx_client_portal_users_client_id" ON "client_portal_users"("client_id");

-- CreateIndex
CREATE INDEX "idx_client_portal_users_clerk_user_id" ON "client_portal_users"("clerk_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_client_portal_users_org_client_clerk" ON "client_portal_users"("organization_id", "client_id", "clerk_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "client_profiles_client_id_key" ON "client_profiles"("client_id");

-- CreateIndex
CREATE INDEX "idx_client_profiles_organization_id" ON "client_profiles"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "idx_clients_portal_token_unique" ON "clients"("portal_token");

-- CreateIndex
CREATE INDEX "idx_clients_organization_id" ON "clients"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "client_service_tiers_client_id_key" ON "client_service_tiers"("client_id");

-- CreateIndex
CREATE INDEX "idx_client_service_tiers_organization_id" ON "client_service_tiers"("organization_id");

-- CreateIndex
CREATE INDEX "idx_client_service_tiers_tier_key" ON "client_service_tiers"("tier_key");

-- CreateIndex
CREATE INDEX "idx_client_sessions_organization_id" ON "client_sessions"("organization_id");

-- CreateIndex
CREATE INDEX "idx_client_sessions_client_id" ON "client_sessions"("client_id");

-- CreateIndex
CREATE INDEX "idx_client_sessions_start_at" ON "client_sessions"("start_at");

-- CreateIndex
CREATE INDEX "idx_client_shared_files_organization_id" ON "client_shared_files"("organization_id");

-- CreateIndex
CREATE INDEX "idx_client_shared_files_client_id" ON "client_shared_files"("client_id");

-- CreateIndex
CREATE INDEX "idx_client_shared_files_visible" ON "client_shared_files"("is_visible_to_client");

-- CreateIndex
CREATE INDEX "idx_client_tasks_organization_id" ON "client_tasks"("organization_id");

-- CreateIndex
CREATE INDEX "idx_client_tasks_client_id" ON "client_tasks"("client_id");

-- CreateIndex
CREATE INDEX "idx_client_tasks_status" ON "client_tasks"("status");

-- CreateIndex
CREATE INDEX "idx_client_tasks_due_at" ON "client_tasks"("due_at");

-- CreateIndex
CREATE UNIQUE INDEX "connect_marketplace_listings_token_key" ON "connect_marketplace_listings"("token");

-- CreateIndex
CREATE INDEX "idx_connect_marketplace_listings_source_org_id" ON "connect_marketplace_listings"("source_org_id");

-- CreateIndex
CREATE INDEX "idx_connect_marketplace_listings_lead_id" ON "connect_marketplace_listings"("lead_id");

-- CreateIndex
CREATE INDEX "idx_connect_marketplace_listings_status" ON "connect_marketplace_listings"("status");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "core_system_settings"("key");

-- CreateIndex
CREATE INDEX "idx_coupon_redemptions_coupon_id" ON "coupon_redemptions"("coupon_id");

-- CreateIndex
CREATE INDEX "idx_coupon_redemptions_org_id" ON "coupon_redemptions"("organization_id");

-- CreateIndex
CREATE INDEX "idx_coupon_redemptions_order_id" ON "coupon_redemptions"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_redemptions_coupon_org_unique" ON "coupon_redemptions"("coupon_id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_hash_key" ON "coupons"("code_hash");

-- CreateIndex
CREATE INDEX "idx_coupons_status" ON "coupons"("status");

-- CreateIndex
CREATE INDEX "idx_coupons_starts_at" ON "coupons"("starts_at");

-- CreateIndex
CREATE INDEX "idx_coupons_ends_at" ON "coupons"("ends_at");

-- CreateIndex
CREATE INDEX "customer_accounts_organization_id_idx" ON "customer_accounts"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "device_pairing_tokens_code_key" ON "device_pairing_tokens"("code");

-- CreateIndex
CREATE UNIQUE INDEX "device_pairing_tokens_token_key" ON "device_pairing_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "device_pairing_tokens_device_nonce_key" ON "device_pairing_tokens"("device_nonce");

-- CreateIndex
CREATE INDEX "idx_device_pairing_tokens_status" ON "device_pairing_tokens"("status");

-- CreateIndex
CREATE INDEX "idx_device_pairing_tokens_token" ON "device_pairing_tokens"("token");

-- CreateIndex
CREATE INDEX "idx_device_pairing_tokens_expires_at" ON "device_pairing_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "idx_device_pairing_tokens_organization_id" ON "device_pairing_tokens"("organization_id");

-- CreateIndex
CREATE INDEX "finance_whatsapp_reminder_events_invoice_idx" ON "finance_whatsapp_reminder_events"("invoice_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "finance_whatsapp_reminder_events_org_idx" ON "finance_whatsapp_reminder_events"("organization_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_help_videos_module_order" ON "help_videos"("module_key", "order");

-- CreateIndex
CREATE INDEX "idx_help_videos_module_key" ON "help_videos"("module_key");

-- CreateIndex
CREATE INDEX "idx_help_videos_module_route_prefix" ON "help_videos"("module_key", "route_prefix");

-- CreateIndex
CREATE INDEX "idx_help_videos_route_prefix" ON "help_videos"("route_prefix");

-- CreateIndex
CREATE UNIQUE INDEX "impersonation_sessions_token_key" ON "impersonation_sessions"("token");

-- CreateIndex
CREATE INDEX "integration_idempotency_keys_org_idx" ON "integration_idempotency_keys"("organization_id");

-- CreateIndex
CREATE INDEX "integration_idempotency_keys_created_at_idx" ON "integration_idempotency_keys"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "integration_idempotency_keys_unique" ON "integration_idempotency_keys"("organization_id", "integration", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "integration_credentials_user_id_integration_name_key" ON "integration_credentials"("user_id", "integration_name");

-- CreateIndex
CREATE UNIQUE INDEX "integration_status_name_key" ON "integration_status"("name");

-- CreateIndex
CREATE INDEX "landing_faq_is_active_sort_order_idx" ON "landing_faq"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "landing_testimonials_is_active_sort_order_idx" ON "landing_testimonials"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "misrad_activity_logs_organization_id_idx" ON "misrad_activity_logs"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_activity_logs_organization_id_created_at_idx" ON "misrad_activity_logs"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_misrad_activity_logs_org_type_created" ON "misrad_activity_logs"("organization_id", "type", "created_at");

-- CreateIndex
CREATE INDEX "misrad_activity_logs_client_id_idx" ON "misrad_activity_logs"("client_id");

-- CreateIndex
CREATE INDEX "misrad_activity_logs_type_idx" ON "misrad_activity_logs"("type");

-- CreateIndex
CREATE INDEX "misrad_activity_logs_isRisk_idx" ON "misrad_activity_logs"("isRisk");

-- CreateIndex
CREATE INDEX "misrad_ai_liability_risks_organization_id_idx" ON "misrad_ai_liability_risks"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_ai_liability_risks_organization_id_created_at_idx" ON "misrad_ai_liability_risks"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_ai_liability_risks_client_id_idx" ON "misrad_ai_liability_risks"("client_id");

-- CreateIndex
CREATE INDEX "misrad_ai_liability_risks_analysis_id_idx" ON "misrad_ai_liability_risks"("analysis_id");

-- CreateIndex
CREATE INDEX "misrad_ai_liability_risks_riskLevel_idx" ON "misrad_ai_liability_risks"("riskLevel");

-- CreateIndex
CREATE INDEX "misrad_ai_tasks_organization_id_idx" ON "misrad_ai_tasks"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_ai_tasks_organization_id_created_at_idx" ON "misrad_ai_tasks"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_ai_tasks_client_id_idx" ON "misrad_ai_tasks"("client_id");

-- CreateIndex
CREATE INDEX "misrad_ai_tasks_analysis_id_idx" ON "misrad_ai_tasks"("analysis_id");

-- CreateIndex
CREATE INDEX "misrad_ai_tasks_bucket_idx" ON "misrad_ai_tasks"("bucket");

-- CreateIndex
CREATE INDEX "misrad_assigned_forms_organization_id_idx" ON "misrad_assigned_forms"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_assigned_forms_organization_id_created_at_idx" ON "misrad_assigned_forms"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_assigned_forms_client_id_idx" ON "misrad_assigned_forms"("client_id");

-- CreateIndex
CREATE INDEX "misrad_assigned_forms_templateId_idx" ON "misrad_assigned_forms"("templateId");

-- CreateIndex
CREATE INDEX "misrad_clients_organization_id_idx" ON "misrad_clients"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_clients_organization_id_created_at_idx" ON "misrad_clients"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_clients_customer_account_id_idx" ON "misrad_clients"("customer_account_id");

-- CreateIndex
CREATE INDEX "misrad_clients_cycleId_idx" ON "misrad_clients"("cycleId");

-- CreateIndex
CREATE INDEX "misrad_client_actions_organization_id_idx" ON "misrad_client_actions"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_client_actions_organization_id_created_at_idx" ON "misrad_client_actions"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_client_actions_client_id_idx" ON "misrad_client_actions"("client_id");

-- CreateIndex
CREATE INDEX "misrad_client_actions_status_idx" ON "misrad_client_actions"("status");

-- CreateIndex
CREATE INDEX "misrad_client_agreements_organization_id_idx" ON "misrad_client_agreements"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_client_agreements_organization_id_created_at_idx" ON "misrad_client_agreements"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_client_agreements_client_id_idx" ON "misrad_client_agreements"("client_id");

-- CreateIndex
CREATE INDEX "misrad_client_agreements_status_idx" ON "misrad_client_agreements"("status");

-- CreateIndex
CREATE INDEX "misrad_client_assets_organization_id_idx" ON "misrad_client_assets"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_client_assets_organization_id_created_at_idx" ON "misrad_client_assets"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_client_assets_client_id_idx" ON "misrad_client_assets"("client_id");

-- CreateIndex
CREATE INDEX "misrad_client_assets_category_idx" ON "misrad_client_assets"("category");

-- CreateIndex
CREATE INDEX "misrad_client_deliverables_organization_id_idx" ON "misrad_client_deliverables"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_client_deliverables_organization_id_created_at_idx" ON "misrad_client_deliverables"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_client_deliverables_client_id_idx" ON "misrad_client_deliverables"("client_id");

-- CreateIndex
CREATE INDEX "misrad_client_deliverables_status_idx" ON "misrad_client_deliverables"("status");

-- CreateIndex
CREATE UNIQUE INDEX "misrad_client_handoffs_client_id_key" ON "misrad_client_handoffs"("client_id");

-- CreateIndex
CREATE INDEX "misrad_client_handoffs_organization_id_idx" ON "misrad_client_handoffs"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_client_handoffs_organization_id_created_at_idx" ON "misrad_client_handoffs"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_client_transformations_organization_id_idx" ON "misrad_client_transformations"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_client_transformations_organization_id_created_at_idx" ON "misrad_client_transformations"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_client_transformations_client_id_idx" ON "misrad_client_transformations"("client_id");

-- CreateIndex
CREATE INDEX "misrad_client_transformations_isPublished_idx" ON "misrad_client_transformations"("isPublished");

-- CreateIndex
CREATE INDEX "misrad_cycles_organization_id_idx" ON "misrad_cycles"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_cycles_organization_id_created_at_idx" ON "misrad_cycles"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_cycles_status_idx" ON "misrad_cycles"("status");

-- CreateIndex
CREATE INDEX "misrad_cycle_assets_organization_id_idx" ON "misrad_cycle_assets"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_cycle_assets_organization_id_created_at_idx" ON "misrad_cycle_assets"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_cycle_assets_cycle_id_idx" ON "misrad_cycle_assets"("cycle_id");

-- CreateIndex
CREATE INDEX "misrad_cycle_tasks_organization_id_idx" ON "misrad_cycle_tasks"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_cycle_tasks_organization_id_created_at_idx" ON "misrad_cycle_tasks"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_cycle_tasks_cycle_id_idx" ON "misrad_cycle_tasks"("cycle_id");

-- CreateIndex
CREATE INDEX "misrad_emails_organization_id_idx" ON "misrad_emails"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_emails_organization_id_created_at_idx" ON "misrad_emails"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_emails_client_id_idx" ON "misrad_emails"("client_id");

-- CreateIndex
CREATE INDEX "misrad_emails_isRead_idx" ON "misrad_emails"("isRead");

-- CreateIndex
CREATE INDEX "misrad_feedback_items_organization_id_idx" ON "misrad_feedback_items"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_feedback_items_organization_id_created_at_idx" ON "misrad_feedback_items"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_feedback_items_client_id_idx" ON "misrad_feedback_items"("client_id");

-- CreateIndex
CREATE INDEX "misrad_feedback_items_source_idx" ON "misrad_feedback_items"("source");

-- CreateIndex
CREATE INDEX "misrad_form_fields_organization_id_idx" ON "misrad_form_fields"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_form_fields_organization_id_created_at_idx" ON "misrad_form_fields"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_form_fields_step_id_idx" ON "misrad_form_fields"("step_id");

-- CreateIndex
CREATE INDEX "misrad_form_responses_organization_id_idx" ON "misrad_form_responses"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_form_responses_organization_id_created_at_idx" ON "misrad_form_responses"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_form_responses_client_id_idx" ON "misrad_form_responses"("client_id");

-- CreateIndex
CREATE INDEX "misrad_form_responses_template_id_idx" ON "misrad_form_responses"("template_id");

-- CreateIndex
CREATE INDEX "misrad_form_responses_assigned_form_id_idx" ON "misrad_form_responses"("assigned_form_id");

-- CreateIndex
CREATE INDEX "misrad_form_steps_organization_id_idx" ON "misrad_form_steps"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_form_steps_organization_id_created_at_idx" ON "misrad_form_steps"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_form_steps_template_id_idx" ON "misrad_form_steps"("template_id");

-- CreateIndex
CREATE INDEX "misrad_form_templates_organization_id_idx" ON "misrad_form_templates"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_form_templates_organization_id_created_at_idx" ON "misrad_form_templates"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_form_templates_category_idx" ON "misrad_form_templates"("category");

-- CreateIndex
CREATE INDEX "misrad_group_events_organization_id_idx" ON "misrad_group_events"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_group_events_organization_id_created_at_idx" ON "misrad_group_events"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_group_events_cycle_id_idx" ON "misrad_group_events"("cycle_id");

-- CreateIndex
CREATE INDEX "misrad_group_events_status_idx" ON "misrad_group_events"("status");

-- CreateIndex
CREATE INDEX "misrad_invoices_organization_id_idx" ON "misrad_invoices"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_invoices_organization_id_created_at_idx" ON "misrad_invoices"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_invoices_client_id_idx" ON "misrad_invoices"("client_id");

-- CreateIndex
CREATE INDEX "misrad_invoices_status_idx" ON "misrad_invoices"("status");

-- CreateIndex
CREATE INDEX "idx_misrad_invoices_org_date_at" ON "misrad_invoices"("organization_id", "date_at");

-- CreateIndex
CREATE INDEX "idx_misrad_invoices_org_due_date_at" ON "misrad_invoices"("organization_id", "due_date_at");

-- CreateIndex
CREATE INDEX "misrad_journey_stages_organization_id_idx" ON "misrad_journey_stages"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_journey_stages_organization_id_created_at_idx" ON "misrad_journey_stages"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_journey_stages_client_id_idx" ON "misrad_journey_stages"("client_id");

-- CreateIndex
CREATE INDEX "misrad_meetings_organization_id_idx" ON "misrad_meetings"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_meetings_organization_id_created_at_idx" ON "misrad_meetings"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_meetings_client_id_idx" ON "misrad_meetings"("client_id");

-- CreateIndex
CREATE INDEX "idx_misrad_meetings_org_meeting_at" ON "misrad_meetings"("organization_id", "meeting_at");

-- CreateIndex
CREATE INDEX "idx_misrad_meetings_client_meeting_at" ON "misrad_meetings"("client_id", "meeting_at");

-- CreateIndex
CREATE UNIQUE INDEX "misrad_meeting_analysis_results_meeting_id_key" ON "misrad_meeting_analysis_results"("meeting_id");

-- CreateIndex
CREATE INDEX "misrad_meeting_analysis_results_organization_id_idx" ON "misrad_meeting_analysis_results"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_meeting_analysis_results_organization_id_created_at_idx" ON "misrad_meeting_analysis_results"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_meeting_analysis_results_client_id_idx" ON "misrad_meeting_analysis_results"("client_id");

-- CreateIndex
CREATE INDEX "misrad_meeting_files_organization_id_idx" ON "misrad_meeting_files"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_meeting_files_organization_id_created_at_idx" ON "misrad_meeting_files"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_meeting_files_client_id_idx" ON "misrad_meeting_files"("client_id");

-- CreateIndex
CREATE INDEX "misrad_meeting_files_meeting_id_idx" ON "misrad_meeting_files"("meeting_id");

-- CreateIndex
CREATE INDEX "misrad_messages_organization_id_idx" ON "misrad_messages"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_messages_organization_id_created_at_idx" ON "misrad_messages"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_messages_sender_id_idx" ON "misrad_messages"("sender_id");

-- CreateIndex
CREATE INDEX "misrad_messages_recipient_id_idx" ON "misrad_messages"("recipient_id");

-- CreateIndex
CREATE INDEX "misrad_messages_read_status_idx" ON "misrad_messages"("read_status");

-- CreateIndex
CREATE INDEX "misrad_messages_related_project_id_idx" ON "misrad_messages"("related_project_id");

-- CreateIndex
CREATE INDEX "misrad_message_attachments_organization_id_idx" ON "misrad_message_attachments"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_message_attachments_organization_id_created_at_idx" ON "misrad_message_attachments"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_message_attachments_message_id_idx" ON "misrad_message_attachments"("message_id");

-- CreateIndex
CREATE INDEX "misrad_metric_history_organization_id_idx" ON "misrad_metric_history"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_metric_history_organization_id_created_at_idx" ON "misrad_metric_history"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_metric_history_client_id_idx" ON "misrad_metric_history"("client_id");

-- CreateIndex
CREATE INDEX "misrad_metric_history_goal_id_idx" ON "misrad_metric_history"("goal_id");

-- CreateIndex
CREATE INDEX "misrad_milestones_organization_id_idx" ON "misrad_milestones"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_milestones_organization_id_created_at_idx" ON "misrad_milestones"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_milestones_client_id_idx" ON "misrad_milestones"("client_id");

-- CreateIndex
CREATE INDEX "misrad_milestones_stage_id_idx" ON "misrad_milestones"("stage_id");

-- CreateIndex
CREATE UNIQUE INDEX "misrad_module_settings_organization_id_key" ON "misrad_module_settings"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_notifications_organization_id_idx" ON "misrad_notifications"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_notifications_organization_id_created_at_idx" ON "misrad_notifications"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_notifications_client_id_idx" ON "misrad_notifications"("client_id");

-- CreateIndex
CREATE INDEX "idx_misrad_notifications_recipient_id" ON "misrad_notifications"("recipient_id");

-- CreateIndex
CREATE INDEX "misrad_notifications_is_read_idx" ON "misrad_notifications"("is_read");

-- CreateIndex
CREATE INDEX "misrad_opportunities_organization_id_idx" ON "misrad_opportunities"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_opportunities_organization_id_created_at_idx" ON "misrad_opportunities"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_opportunities_client_id_idx" ON "misrad_opportunities"("client_id");

-- CreateIndex
CREATE INDEX "misrad_roi_records_organization_id_idx" ON "misrad_roi_records"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_roi_records_organization_id_created_at_idx" ON "misrad_roi_records"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_roi_records_client_id_idx" ON "misrad_roi_records"("client_id");

-- CreateIndex
CREATE INDEX "misrad_roi_records_category_idx" ON "misrad_roi_records"("category");

-- CreateIndex
CREATE INDEX "misrad_stakeholders_organization_id_idx" ON "misrad_stakeholders"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_stakeholders_organization_id_created_at_idx" ON "misrad_stakeholders"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_stakeholders_client_id_idx" ON "misrad_stakeholders"("client_id");

-- CreateIndex
CREATE INDEX "misrad_stakeholders_nexusRole_idx" ON "misrad_stakeholders"("nexusRole");

-- CreateIndex
CREATE INDEX "misrad_success_goals_organization_id_idx" ON "misrad_success_goals"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_success_goals_organization_id_created_at_idx" ON "misrad_success_goals"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_success_goals_client_id_idx" ON "misrad_success_goals"("client_id");

-- CreateIndex
CREATE INDEX "misrad_workflow_blueprints_organization_id_idx" ON "misrad_workflow_blueprints"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_workflow_blueprints_organization_id_created_at_idx" ON "misrad_workflow_blueprints"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_workflow_items_organization_id_idx" ON "misrad_workflow_items"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_workflow_items_organization_id_created_at_idx" ON "misrad_workflow_items"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_workflow_items_stage_id_idx" ON "misrad_workflow_items"("stage_id");

-- CreateIndex
CREATE INDEX "misrad_workflow_stages_organization_id_idx" ON "misrad_workflow_stages"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_workflow_stages_organization_id_created_at_idx" ON "misrad_workflow_stages"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "misrad_workflow_stages_blueprint_id_idx" ON "misrad_workflow_stages"("blueprint_id");

-- CreateIndex
CREATE INDEX "idx_nexus_billing_items_org" ON "nexus_billing_items"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "nexus_billing_items_organization_id_item_key_key" ON "nexus_billing_items"("organization_id", "item_key");

-- CreateIndex
CREATE UNIQUE INDEX "employee_invitation_links_token_key" ON "nexus_employee_invitation_links"("token");

-- CreateIndex
CREATE INDEX "idx_employee_invitation_links_token" ON "nexus_employee_invitation_links"("token");

-- CreateIndex
CREATE INDEX "idx_nexus_employee_invitation_links_organization_id" ON "nexus_employee_invitation_links"("organization_id");

-- CreateIndex
CREATE INDEX "idx_event_attendance_event" ON "nexus_event_attendance"("event_id");

-- CreateIndex
CREATE INDEX "idx_nexus_event_attendance_organization_id" ON "nexus_event_attendance"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_attendance_event_id_user_id_key" ON "nexus_event_attendance"("event_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_leave_requests_employee" ON "nexus_leave_requests"("employee_id");

-- CreateIndex
CREATE INDEX "idx_nexus_leave_requests_organization_id" ON "nexus_leave_requests"("organization_id");

-- CreateIndex
CREATE INDEX "idx_leave_requests_org_created_at" ON "nexus_leave_requests"("organization_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_leave_requests_org_employee_created_at" ON "nexus_leave_requests"("organization_id", "employee_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_leave_requests_org_status_created_at" ON "nexus_leave_requests"("organization_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_team_events_tenant" ON "nexus_team_events"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_nexus_team_events_organization_id" ON "nexus_team_events"("organization_id");

-- CreateIndex
CREATE INDEX "idx_nexus_team_events_org_start_date" ON "nexus_team_events"("organization_id", "start_date");

-- CreateIndex
CREATE INDEX "idx_nexus_clients_company_name" ON "nexus_clients"("company_name");

-- CreateIndex
CREATE INDEX "idx_nexus_clients_email" ON "nexus_clients"("email");

-- CreateIndex
CREATE INDEX "idx_nexus_clients_organization_id" ON "nexus_clients"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "ux_nexus_clients_org_phone" ON "nexus_clients"("organization_id", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "nexus_tasks_share_token_key" ON "nexus_tasks"("share_token");

-- CreateIndex
CREATE INDEX "idx_nexus_tasks_assignee_id" ON "nexus_tasks"("assignee_id");

-- CreateIndex
CREATE INDEX "idx_nexus_tasks_share_token" ON "nexus_tasks"("share_token");

-- CreateIndex
CREATE INDEX "idx_nexus_tasks_client_id" ON "nexus_tasks"("client_id");

-- CreateIndex
CREATE INDEX "idx_nexus_tasks_created_at" ON "nexus_tasks"("created_at");

-- CreateIndex
CREATE INDEX "idx_nexus_tasks_due_date" ON "nexus_tasks"("due_date");

-- CreateIndex
CREATE INDEX "idx_nexus_tasks_status" ON "nexus_tasks"("status");

-- CreateIndex
CREATE INDEX "idx_nexus_tasks_organization_id" ON "nexus_tasks"("organization_id");

-- CreateIndex
CREATE INDEX "idx_nexus_tasks_org_due_created_at" ON "nexus_tasks"("organization_id", "due_date", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_subdomain_key" ON "nexus_tenants"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "nexus_tenants_organization_id_key" ON "nexus_tenants"("organization_id");

-- CreateIndex
CREATE INDEX "idx_nexus_tenants_phone" ON "nexus_tenants"("phone");

-- CreateIndex
CREATE INDEX "idx_nexus_tenants_owner_email" ON "nexus_tenants"("owner_email");

-- CreateIndex
CREATE INDEX "idx_nexus_tenants_status" ON "nexus_tenants"("status");

-- CreateIndex
CREATE INDEX "idx_nexus_tenants_subdomain" ON "nexus_tenants"("subdomain");

-- CreateIndex
CREATE INDEX "idx_nexus_time_entries_date" ON "nexus_time_entries"("date");

-- CreateIndex
CREATE INDEX "idx_nexus_time_entries_start_time" ON "nexus_time_entries"("start_time");

-- CreateIndex
CREATE INDEX "idx_nexus_time_entries_user_id" ON "nexus_time_entries"("user_id");

-- CreateIndex
CREATE INDEX "idx_nexus_time_entries_organization_id" ON "nexus_time_entries"("organization_id");

-- CreateIndex
CREATE INDEX "idx_nexus_time_entries_org_date" ON "nexus_time_entries"("organization_id", "date");

-- CreateIndex
CREATE INDEX "idx_nexus_time_entries_org_user_date" ON "nexus_time_entries"("organization_id", "user_id", "date");

-- CreateIndex
CREATE INDEX "idx_attendance_monthly_reports_org" ON "attendance_monthly_reports"("organization_id");

-- CreateIndex
CREATE INDEX "idx_attendance_monthly_reports_user" ON "attendance_monthly_reports"("user_id");

-- CreateIndex
CREATE INDEX "idx_attendance_monthly_reports_period" ON "attendance_monthly_reports"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_monthly_reports_org_user_period_key" ON "attendance_monthly_reports"("organization_id", "user_id", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_salary_config_org_key" ON "attendance_salary_configs"("organization_id");

-- CreateIndex
CREATE INDEX "idx_nexus_users_organization_id" ON "nexus_users"("organization_id");

-- CreateIndex
CREATE INDEX "idx_nexus_users_department" ON "nexus_users"("department");

-- CreateIndex
CREATE INDEX "idx_nexus_users_email" ON "nexus_users"("email");

-- CreateIndex
CREATE INDEX "idx_nexus_users_role" ON "nexus_users"("role");

-- CreateIndex
CREATE INDEX "idx_nexus_users_last_seen_at" ON "nexus_users"("last_seen_at");

-- CreateIndex
CREATE UNIQUE INDEX "nexus_users_org_email_unique" ON "nexus_users"("organization_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_tokens_user_id_integration_name_key" ON "oauth_tokens"("user_id", "integration_name");

-- CreateIndex
CREATE INDEX "idx_operations_inventory_org" ON "operations_inventory"("organization_id");

-- CreateIndex
CREATE INDEX "idx_operations_inventory_org_critical" ON "operations_inventory"("organization_id", "min_level", "on_hand");

-- CreateIndex
CREATE UNIQUE INDEX "operations_inventory_unique_item_per_org" ON "operations_inventory"("organization_id", "item_id");

-- CreateIndex
CREATE INDEX "idx_operations_items_image_vector" ON "operations_items"("image_vector");

-- CreateIndex
CREATE INDEX "idx_operations_items_org" ON "operations_items"("organization_id");

-- CreateIndex
CREATE INDEX "idx_operations_projects_org" ON "operations_projects"("organization_id");

-- CreateIndex
CREATE INDEX "idx_operations_projects_org_client" ON "operations_projects"("organization_id", "canonical_client_id");

-- CreateIndex
CREATE INDEX "idx_operations_projects_org_status" ON "operations_projects"("organization_id", "status");

-- CreateIndex
CREATE INDEX "idx_operations_suppliers_org" ON "operations_suppliers"("organization_id");

-- CreateIndex
CREATE INDEX "idx_operations_po_org" ON "operations_purchase_orders"("organization_id");

-- CreateIndex
CREATE INDEX "idx_operations_po_org_status" ON "operations_purchase_orders"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "operations_po_unique_number_per_org" ON "operations_purchase_orders"("organization_id", "po_number");

-- CreateIndex
CREATE INDEX "idx_operations_po_items_po" ON "operations_purchase_order_items"("purchase_order_id");

-- CreateIndex
CREATE INDEX "idx_operations_contractor_tokens_hash" ON "operations_contractor_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "idx_operations_contractor_tokens_org" ON "operations_contractor_tokens"("organization_id");

-- CreateIndex
CREATE INDEX "idx_operations_work_orders_assigned_technician_id" ON "operations_work_orders"("assigned_technician_id");

-- CreateIndex
CREATE INDEX "idx_operations_work_orders_org" ON "operations_work_orders"("organization_id");

-- CreateIndex
CREATE INDEX "idx_operations_work_orders_org_status" ON "operations_work_orders"("organization_id", "status");

-- CreateIndex
CREATE INDEX "idx_operations_work_orders_project" ON "operations_work_orders"("project_id");

-- CreateIndex
CREATE INDEX "idx_ops_wo_category" ON "operations_work_orders"("organization_id", "category_id");

-- CreateIndex
CREATE INDEX "idx_ops_wo_building" ON "operations_work_orders"("organization_id", "building_id");

-- CreateIndex
CREATE INDEX "idx_ops_wo_department" ON "operations_work_orders"("organization_id", "department_id");

-- CreateIndex
CREATE INDEX "idx_ops_wo_priority" ON "operations_work_orders"("organization_id", "priority");

-- CreateIndex
CREATE INDEX "idx_ops_wo_sla_deadline" ON "operations_work_orders"("organization_id", "sla_deadline");

-- CreateIndex
CREATE INDEX "idx_operations_buildings_org" ON "operations_buildings"("organization_id");

-- CreateIndex
CREATE INDEX "idx_operations_call_categories_org" ON "operations_call_categories"("organization_id");

-- CreateIndex
CREATE INDEX "idx_operations_departments_org" ON "operations_departments"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "operations_departments_organization_id_slug_key" ON "operations_departments"("organization_id", "slug");

-- CreateIndex
CREATE INDEX "idx_operations_call_messages_wo" ON "operations_call_messages"("work_order_id");

-- CreateIndex
CREATE INDEX "idx_operations_call_messages_wo_created" ON "operations_call_messages"("work_order_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_operations_call_messages_org" ON "operations_call_messages"("organization_id");

-- CreateIndex
CREATE INDEX "organization_settings_ai_dna_gin_idx" ON "organization_settings" USING GIN ("ai_dna");

-- CreateIndex
CREATE UNIQUE INDEX "organization_signup_invitations_token_key" ON "organization_signup_invitations"("token");

-- CreateIndex
CREATE INDEX "organization_signup_invitations_expires_at_idx" ON "organization_signup_invitations"("expires_at");

-- CreateIndex
CREATE INDEX "organization_signup_invitations_is_active_idx" ON "organization_signup_invitations"("is_active");

-- CreateIndex
CREATE INDEX "organization_signup_invitations_is_used_idx" ON "organization_signup_invitations"("is_used");

-- CreateIndex
CREATE INDEX "organization_signup_invitations_org_id_idx" ON "organization_signup_invitations"("organization_id");

-- CreateIndex
CREATE INDEX "organization_signup_invitations_owner_email_idx" ON "organization_signup_invitations"("owner_email");

-- CreateIndex
CREATE UNIQUE INDEX "users_clerk_user_id_key" ON "organization_users"("clerk_user_id");

-- CreateIndex
CREATE INDEX "idx_social_users_clerk_user_id" ON "organization_users"("clerk_user_id");

-- CreateIndex
CREATE INDEX "users_organization_id_idx" ON "organization_users"("organization_id");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "organization_users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "partners_referral_code_key" ON "partners"("referral_code");

-- CreateIndex
CREATE INDEX "partners_referral_code_idx" ON "partners"("referral_code");

-- CreateIndex
CREATE INDEX "idx_platform_credentials_client_id" ON "platform_credentials"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "idx_platform_credentials_client_id_platform_unique" ON "platform_credentials"("client_id", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "idx_platform_quotas_client_id_platform_unique" ON "platform_quotas"("client_id", "platform");

-- CreateIndex
CREATE INDEX "profiles_organization_id_idx" ON "profiles"("organization_id");

-- CreateIndex
CREATE INDEX "profiles_clerk_user_id_idx" ON "profiles"("clerk_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_organization_id_clerk_user_id_key" ON "profiles"("organization_id", "clerk_user_id");

-- CreateIndex
CREATE INDEX "idx_calendar_sync_log_integration_id" ON "misrad_calendar_sync_log"("integration_id");

-- CreateIndex
CREATE INDEX "idx_integrations_service_type" ON "misrad_integrations"("service_type");

-- CreateIndex
CREATE INDEX "idx_integrations_tenant_id" ON "misrad_integrations"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_integrations_user_id" ON "misrad_integrations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "integrations_user_id_tenant_id_service_type_key" ON "misrad_integrations"("user_id", "tenant_id", "service_type");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "misrad_roles"("name");

-- CreateIndex
CREATE INDEX "idx_roles_name" ON "misrad_roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_ticket_number_key" ON "misrad_support_tickets"("ticket_number");

-- CreateIndex
CREATE INDEX "idx_support_tickets_tenant_created_at" ON "misrad_support_tickets"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_support_tickets_tenant_user_created_at" ON "misrad_support_tickets"("tenant_id", "user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_support_tickets_tenant_status_created_at" ON "misrad_support_tickets"("tenant_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "organizations_owner_id_idx" ON "organizations"("owner_id");

-- CreateIndex
CREATE INDEX "organizations_partner_id_idx" ON "organizations"("partner_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_metrics_client_id_key" ON "socialmedia_business_metrics"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_events_google_event_id_user_id_key" ON "socialmedia_calendar_events"("google_event_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_campaigns_client_id" ON "socialmedia_campaigns"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "clients_portal_token_key" ON "socialmedia_clients"("portal_token");

-- CreateIndex
CREATE INDEX "clients_invitationToken_idx" ON "socialmedia_clients"("invitation_token");

-- CreateIndex
CREATE INDEX "clients_organization_id_idx" ON "socialmedia_clients"("organization_id");

-- CreateIndex
CREATE INDEX "idx_clients_plan" ON "socialmedia_clients"("plan");

-- CreateIndex
CREATE INDEX "idx_clients_status" ON "socialmedia_clients"("status");

-- CreateIndex
CREATE INDEX "idx_clients_user_id" ON "socialmedia_clients"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "client_dna_client_id_key" ON "socialmedia_client_dna"("client_id");

-- CreateIndex
CREATE INDEX "idx_client_dna_client_id" ON "socialmedia_client_dna"("client_id");

-- CreateIndex
CREATE INDEX "idx_client_dna_vocabulary_forbidden" ON "socialmedia_client_dna" USING GIN ("vocabulary_forbidden");

-- CreateIndex
CREATE INDEX "idx_client_dna_vocabulary_loved" ON "socialmedia_client_dna" USING GIN ("vocabulary_loved");

-- CreateIndex
CREATE INDEX "idx_social_client_requests_organization_id" ON "socialmedia_client_requests"("organization_id");

-- CreateIndex
CREATE INDEX "idx_social_client_requests_org_created_at" ON "socialmedia_client_requests"("organization_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_social_client_requests_org_client_created_at" ON "socialmedia_client_requests"("organization_id", "client_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_social_client_requests_client_created_at" ON "socialmedia_client_requests"("client_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_social_client_requests_client_id" ON "socialmedia_client_requests"("client_id");

-- CreateIndex
CREATE INDEX "idx_social_conversations_organization_id" ON "socialmedia_conversations"("organization_id");

-- CreateIndex
CREATE INDEX "idx_social_conversations_org_updated_at" ON "socialmedia_conversations"("organization_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "idx_social_conversations_org_client_updated_at" ON "socialmedia_conversations"("organization_id", "client_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "idx_conversations_client_id" ON "socialmedia_conversations"("client_id");

-- CreateIndex
CREATE INDEX "idx_social_conversations_client_id" ON "socialmedia_conversations"("client_id");

-- CreateIndex
CREATE INDEX "idx_social_conversations_client_updated_at" ON "socialmedia_conversations"("client_id", "updated_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "drive_files_google_file_id_user_id_key" ON "socialmedia_drive_files"("google_file_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_social_ideas_organization_id" ON "socialmedia_ideas"("organization_id");

-- CreateIndex
CREATE INDEX "idx_social_ideas_org_created_at" ON "socialmedia_ideas"("organization_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_social_ideas_org_client_created_at" ON "socialmedia_ideas"("organization_id", "client_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_social_ideas_client_created_at" ON "socialmedia_ideas"("client_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_social_ideas_client_id" ON "socialmedia_ideas"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "socialmedia_invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "idx_invoices_client_id" ON "socialmedia_invoices"("client_id");

-- CreateIndex
CREATE INDEX "idx_social_manager_requests_organization_id" ON "socialmedia_manager_requests"("organization_id");

-- CreateIndex
CREATE INDEX "idx_social_manager_requests_org_created_at" ON "socialmedia_manager_requests"("organization_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_social_manager_requests_org_client_created_at" ON "socialmedia_manager_requests"("organization_id", "client_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_social_manager_requests_client_created_at" ON "socialmedia_manager_requests"("client_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_social_manager_requests_client_id" ON "socialmedia_manager_requests"("client_id");

-- CreateIndex
CREATE INDEX "idx_social_messages_organization_id" ON "socialmedia_messages"("organization_id");

-- CreateIndex
CREATE INDEX "idx_messages_conversation_id" ON "socialmedia_messages"("conversation_id");

-- CreateIndex
CREATE INDEX "idx_social_messages_org_conversation_created_at" ON "socialmedia_messages"("organization_id", "conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_payment_orders_client_id" ON "socialmedia_payment_orders"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_credentials_client_id_platform_key" ON "socialmedia_platform_credentials"("client_id", "platform");

-- CreateIndex
CREATE INDEX "idx_platform_quotas_client_id" ON "socialmedia_platform_quotas"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_quotas_client_id_platform_key" ON "socialmedia_platform_quotas"("client_id", "platform");

-- CreateIndex
CREATE INDEX "idx_social_post_comments_organization_id" ON "socialmedia_post_comments"("organization_id");

-- CreateIndex
CREATE INDEX "idx_social_post_comments_org_post_id" ON "socialmedia_post_comments"("organization_id", "post_id");

-- CreateIndex
CREATE INDEX "idx_social_post_platforms_post_id" ON "socialmedia_post_platforms"("post_id");

-- CreateIndex
CREATE INDEX "idx_social_post_platforms_organization_id" ON "socialmedia_post_platforms"("organization_id");

-- CreateIndex
CREATE INDEX "idx_social_post_variations_organization_id" ON "socialmedia_post_variations"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "sheets_sync_configs_user_id_spreadsheet_id_sheet_name_sync__key" ON "socialmedia_sheets_sync_configs"("user_id", "spreadsheet_id", "sheet_name", "sync_type");

-- CreateIndex
CREATE INDEX "idx_site_content_key" ON "socialmedia_site_content"("key");

-- CreateIndex
CREATE INDEX "idx_site_content_page_section" ON "socialmedia_site_content"("page", "section");

-- CreateIndex
CREATE UNIQUE INDEX "site_content_page_section_key_key" ON "socialmedia_site_content"("page", "section", "key");

-- CreateIndex
CREATE INDEX "idx_social_tasks_organization_id" ON "socialmedia_tasks"("organization_id");

-- CreateIndex
CREATE INDEX "idx_social_tasks_org_due_date" ON "socialmedia_tasks"("organization_id", "due_date");

-- CreateIndex
CREATE INDEX "idx_social_tasks_org_client_due_date" ON "socialmedia_tasks"("organization_id", "client_id", "due_date");

-- CreateIndex
CREATE INDEX "idx_social_tasks_assigned_to" ON "socialmedia_tasks"("assigned_to");

-- CreateIndex
CREATE INDEX "idx_social_tasks_client_id" ON "socialmedia_tasks"("client_id");

-- CreateIndex
CREATE INDEX "idx_social_tasks_client_due_date" ON "socialmedia_tasks"("client_id", "due_date");

-- CreateIndex
CREATE INDEX "idx_social_posts_organization_id" ON "socialmedia_posts"("organization_id");

-- CreateIndex
CREATE INDEX "idx_social_posts_client_id" ON "socialmedia_posts"("client_id");

-- CreateIndex
CREATE INDEX "idx_social_posts_status" ON "socialmedia_posts"("status");

-- CreateIndex
CREATE INDEX "idx_social_posts_org_created_at" ON "socialmedia_posts"("organization_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_social_posts_org_client_created_at" ON "socialmedia_posts"("organization_id", "client_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_social_posts_org_status_created_at" ON "socialmedia_posts"("organization_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_social_posts_client_created_at" ON "socialmedia_posts"("client_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_social_posts_client_scheduled_at" ON "socialmedia_posts"("client_id", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "strategic_content_unique" ON "strategic_content"("module_id", "category", "title");

-- CreateIndex
CREATE INDEX "idx_subscription_items_kind" ON "subscription_items"("kind");

-- CreateIndex
CREATE INDEX "idx_subscription_items_org_id" ON "subscription_items"("organization_id");

-- CreateIndex
CREATE INDEX "idx_subscription_items_status" ON "subscription_items"("status");

-- CreateIndex
CREATE INDEX "idx_subscription_items_sub_id" ON "subscription_items"("subscription_id");

-- CreateIndex
CREATE INDEX "idx_subscription_orders_clerk_user_id" ON "subscription_orders"("clerk_user_id");

-- CreateIndex
CREATE INDEX "idx_subscription_orders_org_id" ON "subscription_orders"("organization_id");

-- CreateIndex
CREATE INDEX "idx_subscription_orders_social_user_id" ON "subscription_orders"("social_user_id");

-- CreateIndex
CREATE INDEX "idx_subscription_orders_status" ON "subscription_orders"("status");

-- CreateIndex
CREATE INDEX "idx_subscription_orders_coupon_id" ON "subscription_orders"("coupon_id");

-- CreateIndex
CREATE INDEX "idx_subscription_payment_configs_package_type" ON "subscription_payment_configs"("package_type");

-- CreateIndex
CREATE INDEX "idx_subscriptions_org_id" ON "subscriptions"("organization_id");

-- CreateIndex
CREATE INDEX "idx_subscriptions_status" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "support_ticket_events_ticket_id_idx" ON "support_ticket_events"("ticket_id");

-- CreateIndex
CREATE INDEX "support_ticket_events_tenant_id_idx" ON "support_ticket_events"("tenant_id");

-- CreateIndex
CREATE INDEX "support_ticket_events_created_at_idx" ON "support_ticket_events"("created_at");

-- CreateIndex
CREATE INDEX "idx_support_ticket_events_tenant_ticket_created_at" ON "support_ticket_events"("tenant_id", "ticket_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "invitation_links_token_key" ON "system_invitation_links"("token");

-- CreateIndex
CREATE INDEX "idx_invitation_links_token" ON "system_invitation_links"("token");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_tenant_id_key" ON "system_settings"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_system_settings_system_flags" ON "system_settings" USING GIN ("system_flags");

-- CreateIndex
CREATE INDEX "idx_system_settings_tenant_id" ON "system_settings"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_system_assets_category" ON "system_assets"("category");

-- CreateIndex
CREATE INDEX "idx_system_assets_type" ON "system_assets"("type");

-- CreateIndex
CREATE INDEX "idx_system_automations_enabled" ON "system_automations"("enabled");

-- CreateIndex
CREATE INDEX "idx_system_automations_trigger_type" ON "system_automations"("trigger_type");

-- CreateIndex
CREATE INDEX "idx_system_calendar_events_date" ON "system_calendar_events"("date");

-- CreateIndex
CREATE INDEX "idx_system_calendar_events_lead_id" ON "system_calendar_events"("lead_id");

-- CreateIndex
CREATE INDEX "idx_system_calendar_events_organization_id" ON "system_calendar_events"("organization_id");

-- CreateIndex
CREATE INDEX "idx_system_calendar_events_org_occurs_at" ON "system_calendar_events"("organization_id", "occurs_at");

-- CreateIndex
CREATE INDEX "idx_system_call_analyses_date" ON "system_call_analyses"("date");

-- CreateIndex
CREATE INDEX "idx_system_call_analyses_lead_id" ON "system_call_analyses"("lead_id");

-- CreateIndex
CREATE INDEX "idx_system_call_analyses_organization_id" ON "system_call_analyses"("organization_id");

-- CreateIndex
CREATE INDEX "idx_system_call_analyses_score" ON "system_call_analyses"("score");

-- CreateIndex
CREATE INDEX "idx_system_call_analyses_org_call_at" ON "system_call_analyses"("organization_id", "call_at");

-- CreateIndex
CREATE INDEX "idx_system_campaigns_created_at" ON "system_campaigns"("created_at");

-- CreateIndex
CREATE INDEX "idx_system_campaigns_status" ON "system_campaigns"("status");

-- CreateIndex
CREATE INDEX "idx_system_content_items_platform" ON "system_content_items"("platform");

-- CreateIndex
CREATE INDEX "idx_system_content_items_status" ON "system_content_items"("status");

-- CreateIndex
CREATE INDEX "idx_system_field_agents_status" ON "system_field_agents"("status");

-- CreateIndex
CREATE INDEX "idx_system_field_agents_user_id" ON "system_field_agents"("user_id");

-- CreateIndex
CREATE INDEX "idx_system_forms_created_at" ON "system_forms"("created_at");

-- CreateIndex
CREATE INDEX "idx_system_forms_status" ON "system_forms"("status");

-- CreateIndex
CREATE INDEX "idx_system_invoices_date" ON "system_invoices"("date");

-- CreateIndex
CREATE INDEX "idx_system_invoices_lead_id" ON "system_invoices"("lead_id");

-- CreateIndex
CREATE INDEX "idx_system_invoices_organization_id" ON "system_invoices"("organization_id");

-- CreateIndex
CREATE INDEX "idx_system_invoices_status" ON "system_invoices"("status");

-- CreateIndex
CREATE INDEX "idx_system_leads_assigned_agent_id" ON "system_leads"("assigned_agent_id");

-- CreateIndex
CREATE INDEX "idx_system_leads_organization_id" ON "system_leads"("organization_id");

-- CreateIndex
CREATE INDEX "idx_system_leads_customer_account_id" ON "system_leads"("customer_account_id");

-- CreateIndex
CREATE INDEX "idx_system_leads_created_at" ON "system_leads"("created_at");

-- CreateIndex
CREATE INDEX "idx_system_leads_is_hot" ON "system_leads"("is_hot");

-- CreateIndex
CREATE INDEX "idx_system_leads_next_action_date" ON "system_leads"("next_action_date");

-- CreateIndex
CREATE INDEX "idx_system_leads_status" ON "system_leads"("status");

-- CreateIndex
CREATE INDEX "idx_system_leads_org_status" ON "system_leads"("organization_id", "status");

-- CreateIndex
CREATE INDEX "idx_system_leads_org_hot_updated_created" ON "system_leads"("organization_id", "is_hot", "updated_at" DESC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_system_lead_activities_lead_id" ON "system_lead_activities"("lead_id");

-- CreateIndex
CREATE INDEX "idx_system_lead_activities_organization_id" ON "system_lead_activities"("organization_id");

-- CreateIndex
CREATE INDEX "idx_system_lead_activities_timestamp" ON "system_lead_activities"("timestamp");

-- CreateIndex
CREATE INDEX "idx_system_lead_custom_field_defs_organization_id" ON "system_lead_custom_field_definitions"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "system_lead_custom_field_defs_org_key_key" ON "system_lead_custom_field_definitions"("organization_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "system_lead_handovers_lead_id_key" ON "system_lead_handovers"("lead_id");

-- CreateIndex
CREATE INDEX "idx_system_lead_handovers_organization_id" ON "system_lead_handovers"("organization_id");

-- CreateIndex
CREATE INDEX "idx_system_partners_status" ON "system_partners"("status");

-- CreateIndex
CREATE INDEX "idx_system_partners_type" ON "system_partners"("type");

-- CreateIndex
CREATE INDEX "idx_system_pipeline_stages_organization_id" ON "system_pipeline_stages"("organization_id");

-- CreateIndex
CREATE INDEX "idx_system_pipeline_stages_org_active_order_created" ON "system_pipeline_stages"("organization_id", "is_active", "order", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "system_pipeline_stages_org_key_key" ON "system_pipeline_stages"("organization_id", "key");

-- CreateIndex
CREATE INDEX "idx_system_portal_approvals_lead_id" ON "system_portal_approvals"("lead_id");

-- CreateIndex
CREATE INDEX "idx_system_portal_approvals_organization_id" ON "system_portal_approvals"("organization_id");

-- CreateIndex
CREATE INDEX "idx_system_portal_approvals_status" ON "system_portal_approvals"("status");

-- CreateIndex
CREATE INDEX "idx_system_portal_tasks_lead_id" ON "system_portal_tasks"("lead_id");

-- CreateIndex
CREATE INDEX "idx_system_portal_tasks_organization_id" ON "system_portal_tasks"("organization_id");

-- CreateIndex
CREATE INDEX "idx_system_portal_tasks_status" ON "system_portal_tasks"("status");

-- CreateIndex
CREATE INDEX "idx_system_students_cohort" ON "system_students"("cohort");

-- CreateIndex
CREATE INDEX "idx_system_students_status" ON "system_students"("status");

-- CreateIndex
CREATE INDEX "idx_system_support_tickets_category" ON "system_support_tickets"("category");

-- CreateIndex
CREATE INDEX "idx_system_support_tickets_lead_id" ON "system_support_tickets"("lead_id");

-- CreateIndex
CREATE INDEX "idx_system_support_tickets_organization_id" ON "system_support_tickets"("organization_id");

-- CreateIndex
CREATE INDEX "idx_system_support_tickets_status" ON "system_support_tickets"("status");

-- CreateIndex
CREATE INDEX "idx_system_tasks_assignee_id" ON "system_tasks"("assignee_id");

-- CreateIndex
CREATE INDEX "idx_system_tasks_due_date" ON "system_tasks"("due_date");

-- CreateIndex
CREATE INDEX "idx_system_tasks_status" ON "system_tasks"("status");

-- CreateIndex
CREATE INDEX "idx_system_webhook_logs_channel" ON "system_webhook_logs"("channel");

-- CreateIndex
CREATE INDEX "idx_system_webhook_logs_timestamp" ON "system_webhook_logs"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_user_id_key" ON "team_members"("user_id");

-- CreateIndex
CREATE INDEX "idx_team_members_email" ON "team_members"("email");

-- CreateIndex
CREATE INDEX "idx_team_members_subscription_status" ON "team_members"("subscription_status");

-- CreateIndex
CREATE INDEX "idx_team_members_trial_start_date" ON "team_members"("trial_start_date");

-- CreateIndex
CREATE INDEX "idx_team_members_user_id" ON "team_members"("user_id");

-- CreateIndex
CREATE INDEX "team_members_organization_id_idx" ON "team_members"("organization_id");

-- CreateIndex
CREATE INDEX "idx_social_team_members_organization_id" ON "team_members"("organization_id");

-- CreateIndex
CREATE INDEX "idx_team_member_clients_client_team" ON "team_member_clients"("client_id", "team_member_id");

-- CreateIndex
CREATE INDEX "idx_team_member_clients_team_member_id" ON "team_member_clients"("team_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_update_views_user_id_update_id_key" ON "user_update_views"("user_id", "update_id");

-- CreateIndex
CREATE INDEX "web_push_subscriptions_organization_id_idx" ON "web_push_subscriptions"("organization_id");

-- CreateIndex
CREATE INDEX "web_push_subscriptions_clerk_user_id_idx" ON "web_push_subscriptions"("clerk_user_id");

-- CreateIndex
CREATE INDEX "web_push_subscriptions_email_idx" ON "web_push_subscriptions"("email");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_web_push_subscriptions_user_endpoint" ON "web_push_subscriptions"("organization_id", "email", "endpoint");

-- CreateIndex
CREATE INDEX "idx_work_listings_source_org_id" ON "work_listings"("source_org_id");

-- CreateIndex
CREATE INDEX "idx_work_listings_lead_id" ON "work_listings"("lead_id");

-- CreateIndex
CREATE INDEX "idx_work_listings_status" ON "work_listings"("status");

-- CreateIndex
CREATE INDEX "idx_work_listings_channel" ON "work_listings"("channel");

-- CreateIndex
CREATE UNIQUE INDEX "business_clients_business_number_key" ON "business_clients"("business_number");

-- CreateIndex
CREATE UNIQUE INDEX "business_clients_primary_email_key" ON "business_clients"("primary_email");

-- CreateIndex
CREATE INDEX "business_clients_company_name_idx" ON "business_clients"("company_name");

-- CreateIndex
CREATE INDEX "business_clients_status_idx" ON "business_clients"("status");

-- CreateIndex
CREATE INDEX "business_clients_lifecycle_stage_idx" ON "business_clients"("lifecycle_stage");

-- CreateIndex
CREATE INDEX "business_clients_created_at_idx" ON "business_clients"("created_at");

-- CreateIndex
CREATE INDEX "business_clients_deleted_at_idx" ON "business_clients"("deleted_at");

-- CreateIndex
CREATE INDEX "business_clients_business_number_idx" ON "business_clients"("business_number");

-- CreateIndex
CREATE INDEX "business_client_contacts_client_id_idx" ON "business_client_contacts"("client_id");

-- CreateIndex
CREATE INDEX "business_client_contacts_user_id_idx" ON "business_client_contacts"("user_id");

-- CreateIndex
CREATE INDEX "business_client_contacts_is_primary_idx" ON "business_client_contacts"("is_primary");

-- CreateIndex
CREATE INDEX "business_client_contacts_role_idx" ON "business_client_contacts"("role");

-- CreateIndex
CREATE UNIQUE INDEX "business_client_contacts_client_id_user_id_key" ON "business_client_contacts"("client_id", "user_id");

-- CreateIndex
CREATE INDEX "misrad_sales_teams_organization_id_idx" ON "misrad_sales_teams"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_sales_teams_organization_id_is_active_idx" ON "misrad_sales_teams"("organization_id", "is_active");

-- CreateIndex
CREATE INDEX "misrad_sales_team_members_organization_id_idx" ON "misrad_sales_team_members"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_sales_team_members_team_id_idx" ON "misrad_sales_team_members"("team_id");

-- CreateIndex
CREATE INDEX "misrad_sales_team_members_user_id_idx" ON "misrad_sales_team_members"("user_id");

-- CreateIndex
CREATE INDEX "misrad_field_teams_organization_id_idx" ON "misrad_field_teams"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_field_teams_organization_id_is_active_idx" ON "misrad_field_teams"("organization_id", "is_active");

-- CreateIndex
CREATE INDEX "misrad_field_agents_organization_id_idx" ON "misrad_field_agents"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_field_agents_team_id_idx" ON "misrad_field_agents"("team_id");

-- CreateIndex
CREATE INDEX "misrad_field_agents_user_id_idx" ON "misrad_field_agents"("user_id");

-- CreateIndex
CREATE INDEX "misrad_field_visits_organization_id_idx" ON "misrad_field_visits"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_field_visits_agent_id_idx" ON "misrad_field_visits"("agent_id");

-- CreateIndex
CREATE INDEX "misrad_field_visits_organization_id_scheduled_at_idx" ON "misrad_field_visits"("organization_id", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "bot_leads_phone_key" ON "bot_leads"("phone");

-- CreateIndex
CREATE INDEX "bot_leads_status_idx" ON "bot_leads"("status");

-- CreateIndex
CREATE INDEX "bot_leads_created_at_idx" ON "bot_leads"("created_at");

-- CreateIndex
CREATE INDEX "bot_leads_organization_id_idx" ON "bot_leads"("organization_id");

-- CreateIndex
CREATE INDEX "bot_conversations_lead_id_idx" ON "bot_conversations"("lead_id");

-- CreateIndex
CREATE INDEX "bot_conversations_created_at_idx" ON "bot_conversations"("created_at");

-- CreateIndex
CREATE INDEX "site_analytics_sessions_visitor_id_idx" ON "site_analytics_sessions"("visitor_id");

-- CreateIndex
CREATE INDEX "site_analytics_sessions_created_at_idx" ON "site_analytics_sessions"("created_at");

-- CreateIndex
CREATE INDEX "site_analytics_sessions_signup_user_id_idx" ON "site_analytics_sessions"("signup_user_id");

-- CreateIndex
CREATE INDEX "site_analytics_sessions_referrer_idx" ON "site_analytics_sessions"("referrer");

-- CreateIndex
CREATE INDEX "site_analytics_sessions_landing_page_idx" ON "site_analytics_sessions"("landing_page");

-- CreateIndex
CREATE INDEX "site_analytics_page_views_session_id_idx" ON "site_analytics_page_views"("session_id");

-- CreateIndex
CREATE INDEX "site_analytics_page_views_path_idx" ON "site_analytics_page_views"("path");

-- CreateIndex
CREATE INDEX "site_analytics_page_views_entered_at_idx" ON "site_analytics_page_views"("entered_at");

-- CreateIndex
CREATE INDEX "site_analytics_events_session_id_idx" ON "site_analytics_events"("session_id");

-- CreateIndex
CREATE INDEX "site_analytics_events_event_type_idx" ON "site_analytics_events"("event_type");

-- CreateIndex
CREATE INDEX "site_analytics_events_created_at_idx" ON "site_analytics_events"("created_at");

-- CreateIndex
CREATE INDEX "customer_ratings_organization_id_idx" ON "customer_ratings"("organization_id");

-- CreateIndex
CREATE INDEX "customer_ratings_created_at_idx" ON "customer_ratings"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "customer_ratings_organization_id_user_id_key" ON "customer_ratings"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "email_sent_logs_email_type_id_idx" ON "email_sent_logs"("email_type_id");

-- CreateIndex
CREATE INDEX "email_sent_logs_organization_id_idx" ON "email_sent_logs"("organization_id");

-- CreateIndex
CREATE INDEX "email_sent_logs_recipient_email_idx" ON "email_sent_logs"("recipient_email");

-- CreateIndex
CREATE INDEX "email_sent_logs_sent_at_idx" ON "email_sent_logs"("sent_at");

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "team_members"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_embeddings" ADD CONSTRAINT "ai_embeddings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_feature_settings" ADD CONSTRAINT "ai_feature_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_model_aliases" ADD CONSTRAINT "ai_model_aliases_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_provider_keys" ADD CONSTRAINT "ai_provider_keys_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "business_metrics" ADD CONSTRAINT "business_metrics_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "client_dna" ADD CONSTRAINT "client_dna_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "client_approvals" ADD CONSTRAINT "client_approvals_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_approvals" ADD CONSTRAINT "client_approvals_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "client_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_approvals" ADD CONSTRAINT "client_approvals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_clients" ADD CONSTRAINT "client_clients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_document_files" ADD CONSTRAINT "client_document_files_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_document_files" ADD CONSTRAINT "client_document_files_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "client_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_document_files" ADD CONSTRAINT "client_document_files_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_feedbacks" ADD CONSTRAINT "client_feedbacks_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_feedbacks" ADD CONSTRAINT "client_feedbacks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_internal_notes" ADD CONSTRAINT "client_internal_notes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_internal_notes" ADD CONSTRAINT "client_internal_notes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_portal_content" ADD CONSTRAINT "client_portal_content_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_portal_content" ADD CONSTRAINT "client_portal_content_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_portal_invites" ADD CONSTRAINT "client_portal_invites_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_portal_invites" ADD CONSTRAINT "client_portal_invites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_portal_users" ADD CONSTRAINT "client_portal_users_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_portal_users" ADD CONSTRAINT "client_portal_users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_service_tiers" ADD CONSTRAINT "client_service_tiers_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_service_tiers" ADD CONSTRAINT "client_service_tiers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_sessions" ADD CONSTRAINT "client_sessions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_sessions" ADD CONSTRAINT "client_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_shared_files" ADD CONSTRAINT "client_shared_files_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_shared_files" ADD CONSTRAINT "client_shared_files_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_tasks" ADD CONSTRAINT "client_tasks_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_tasks" ADD CONSTRAINT "client_tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connect_marketplace_listings" ADD CONSTRAINT "connect_marketplace_listings_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "system_leads"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "connect_marketplace_listings" ADD CONSTRAINT "connect_marketplace_listings_source_org_id_fkey" FOREIGN KEY ("source_org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "subscription_orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "customer_accounts" ADD CONSTRAINT "customer_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_whatsapp_reminder_events" ADD CONSTRAINT "finance_whatsapp_reminder_events_client_fk" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "finance_whatsapp_reminder_events" ADD CONSTRAINT "finance_whatsapp_reminder_events_invoice_fk" FOREIGN KEY ("invoice_id") REFERENCES "misrad_invoices"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "finance_whatsapp_reminder_events" ADD CONSTRAINT "finance_whatsapp_reminder_events_org_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "misrad_activity_logs" ADD CONSTRAINT "misrad_activity_logs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_ai_liability_risks" ADD CONSTRAINT "misrad_ai_liability_risks_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "misrad_meeting_analysis_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_ai_tasks" ADD CONSTRAINT "misrad_ai_tasks_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "misrad_meeting_analysis_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_assigned_forms" ADD CONSTRAINT "misrad_assigned_forms_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_clients" ADD CONSTRAINT "misrad_clients_customer_account_id_fkey" FOREIGN KEY ("customer_account_id") REFERENCES "customer_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_clients" ADD CONSTRAINT "misrad_clients_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "misrad_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_client_actions" ADD CONSTRAINT "misrad_client_actions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_client_agreements" ADD CONSTRAINT "misrad_client_agreements_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_client_assets" ADD CONSTRAINT "misrad_client_assets_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_client_deliverables" ADD CONSTRAINT "misrad_client_deliverables_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_client_handoffs" ADD CONSTRAINT "misrad_client_handoffs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_client_transformations" ADD CONSTRAINT "misrad_client_transformations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_cycle_assets" ADD CONSTRAINT "misrad_cycle_assets_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "misrad_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_cycle_tasks" ADD CONSTRAINT "misrad_cycle_tasks_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "misrad_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_emails" ADD CONSTRAINT "misrad_emails_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_feedback_items" ADD CONSTRAINT "misrad_feedback_items_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_form_fields" ADD CONSTRAINT "misrad_form_fields_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "misrad_form_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_form_responses" ADD CONSTRAINT "misrad_form_responses_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_form_responses" ADD CONSTRAINT "misrad_form_responses_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "misrad_form_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_form_steps" ADD CONSTRAINT "misrad_form_steps_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "misrad_form_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_group_events" ADD CONSTRAINT "misrad_group_events_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "misrad_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_invoices" ADD CONSTRAINT "misrad_invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_journey_stages" ADD CONSTRAINT "misrad_journey_stages_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_meetings" ADD CONSTRAINT "misrad_meetings_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_meeting_analysis_results" ADD CONSTRAINT "misrad_meeting_analysis_results_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_meeting_analysis_results" ADD CONSTRAINT "misrad_meeting_analysis_results_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "misrad_meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_meeting_files" ADD CONSTRAINT "misrad_meeting_files_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_meeting_files" ADD CONSTRAINT "misrad_meeting_files_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "misrad_meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_message_attachments" ADD CONSTRAINT "misrad_message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "misrad_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_metric_history" ADD CONSTRAINT "misrad_metric_history_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_metric_history" ADD CONSTRAINT "misrad_metric_history_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "misrad_success_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_milestones" ADD CONSTRAINT "misrad_milestones_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_milestones" ADD CONSTRAINT "misrad_milestones_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "misrad_journey_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_notifications" ADD CONSTRAINT "misrad_notifications_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_opportunities" ADD CONSTRAINT "misrad_opportunities_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_roi_records" ADD CONSTRAINT "misrad_roi_records_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_stakeholders" ADD CONSTRAINT "misrad_stakeholders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_success_goals" ADD CONSTRAINT "misrad_success_goals_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_workflow_items" ADD CONSTRAINT "misrad_workflow_items_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "misrad_workflow_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_workflow_stages" ADD CONSTRAINT "misrad_workflow_stages_blueprint_id_fkey" FOREIGN KEY ("blueprint_id") REFERENCES "misrad_workflow_blueprints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nexus_employee_invitation_links" ADD CONSTRAINT "nexus_employee_invitation_links_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nexus_event_attendance" ADD CONSTRAINT "nexus_event_attendance_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nexus_leave_requests" ADD CONSTRAINT "nexus_leave_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nexus_team_events" ADD CONSTRAINT "nexus_team_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nexus_clients" ADD CONSTRAINT "nexus_clients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nexus_tasks" ADD CONSTRAINT "nexus_tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nexus_tenants" ADD CONSTRAINT "nexus_tenants_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nexus_time_entries" ADD CONSTRAINT "nexus_time_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_monthly_reports" ADD CONSTRAINT "attendance_monthly_reports_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_salary_configs" ADD CONSTRAINT "attendance_salary_configs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_inventory" ADD CONSTRAINT "operations_inventory_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "operations_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "operations_inventory" ADD CONSTRAINT "operations_inventory_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "operations_items" ADD CONSTRAINT "operations_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "operations_items" ADD CONSTRAINT "operations_items_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "operations_suppliers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "operations_projects" ADD CONSTRAINT "operations_projects_canonical_client_id_fkey" FOREIGN KEY ("canonical_client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "operations_projects" ADD CONSTRAINT "operations_projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "operations_suppliers" ADD CONSTRAINT "operations_suppliers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "operations_purchase_orders" ADD CONSTRAINT "operations_purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "operations_suppliers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "operations_purchase_orders" ADD CONSTRAINT "operations_purchase_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "operations_purchase_order_items" ADD CONSTRAINT "operations_purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "operations_purchase_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "operations_purchase_order_items" ADD CONSTRAINT "operations_purchase_order_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "operations_items"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "operations_contractor_tokens" ADD CONSTRAINT "operations_contractor_tokens_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "operations_work_orders" ADD CONSTRAINT "operations_work_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "operations_work_orders" ADD CONSTRAINT "operations_work_orders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "operations_projects"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "operations_work_orders" ADD CONSTRAINT "operations_work_orders_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "operations_call_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_work_orders" ADD CONSTRAINT "operations_work_orders_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "operations_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_work_orders" ADD CONSTRAINT "operations_work_orders_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "operations_buildings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_buildings" ADD CONSTRAINT "operations_buildings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_call_categories" ADD CONSTRAINT "operations_call_categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_departments" ADD CONSTRAINT "operations_departments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_call_messages" ADD CONSTRAINT "operations_call_messages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_call_messages" ADD CONSTRAINT "operations_call_messages_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "operations_work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_settings" ADD CONSTRAINT "organization_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "organization_users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "platform_credentials" ADD CONSTRAINT "platform_credentials_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "platform_quotas" ADD CONSTRAINT "platform_quotas_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "organization_users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "business_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "socialmedia_clients" ADD CONSTRAINT "clients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "socialmedia_messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "socialmedia_conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "socialmedia_post_comments" ADD CONSTRAINT "post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "socialmedia_posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "socialmedia_post_comments" ADD CONSTRAINT "post_comments_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "team_members"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "socialmedia_post_platforms" ADD CONSTRAINT "post_platforms_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "socialmedia_posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "socialmedia_post_variations" ADD CONSTRAINT "post_variations_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "socialmedia_posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subscription_orders" ADD CONSTRAINT "subscription_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subscription_orders" ADD CONSTRAINT "subscription_orders_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "system_calendar_events" ADD CONSTRAINT "system_calendar_events_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "system_leads"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "system_calendar_events" ADD CONSTRAINT "system_calendar_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "system_call_analyses" ADD CONSTRAINT "system_call_analyses_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "system_leads"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "system_call_analyses" ADD CONSTRAINT "system_call_analyses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "system_invoices" ADD CONSTRAINT "system_invoices_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "system_leads"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "system_invoices" ADD CONSTRAINT "system_invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "system_leads" ADD CONSTRAINT "system_leads_customer_account_id_fkey" FOREIGN KEY ("customer_account_id") REFERENCES "customer_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_leads" ADD CONSTRAINT "system_leads_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_lead_activities" ADD CONSTRAINT "system_lead_activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "system_leads"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "system_lead_activities" ADD CONSTRAINT "system_lead_activities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "system_lead_custom_field_definitions" ADD CONSTRAINT "system_lead_custom_field_definitions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "system_lead_handovers" ADD CONSTRAINT "system_lead_handovers_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "system_leads"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "system_lead_handovers" ADD CONSTRAINT "system_lead_handovers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "system_pipeline_stages" ADD CONSTRAINT "system_pipeline_stages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "system_portal_approvals" ADD CONSTRAINT "system_portal_approvals_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "system_leads"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "system_portal_approvals" ADD CONSTRAINT "system_portal_approvals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "system_portal_tasks" ADD CONSTRAINT "system_portal_tasks_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "system_leads"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "system_portal_tasks" ADD CONSTRAINT "system_portal_tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "system_support_tickets" ADD CONSTRAINT "system_support_tickets_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "system_leads"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "system_support_tickets" ADD CONSTRAINT "system_support_tickets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "team_comments" ADD CONSTRAINT "team_comments_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "team_members"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "team_member_clients" ADD CONSTRAINT "team_member_clients_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "team_members"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_update_views" ADD CONSTRAINT "user_update_views_update_id_fkey" FOREIGN KEY ("update_id") REFERENCES "app_updates"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "work_listings" ADD CONSTRAINT "work_listings_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "system_leads"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "work_listings" ADD CONSTRAINT "work_listings_source_org_id_fkey" FOREIGN KEY ("source_org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "business_client_contacts" ADD CONSTRAINT "business_client_contacts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "business_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_client_contacts" ADD CONSTRAINT "business_client_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "organization_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_sales_team_members" ADD CONSTRAINT "misrad_sales_team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "misrad_sales_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_field_agents" ADD CONSTRAINT "misrad_field_agents_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "misrad_field_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_field_visits" ADD CONSTRAINT "misrad_field_visits_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "misrad_field_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_leads" ADD CONSTRAINT "bot_leads_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_conversations" ADD CONSTRAINT "bot_conversations_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "bot_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_analytics_page_views" ADD CONSTRAINT "site_analytics_page_views_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "site_analytics_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_analytics_events" ADD CONSTRAINT "site_analytics_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "site_analytics_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_ratings" ADD CONSTRAINT "customer_ratings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_ratings" ADD CONSTRAINT "customer_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "organization_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

