-- CreateEnum
CREATE TYPE "MisradHealthStatus" AS ENUM ('CRITICAL', 'AT_RISK', 'STABLE', 'THRIVING');

-- CreateEnum
CREATE TYPE "MisradSentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'ANXIOUS');

-- CreateEnum
CREATE TYPE "MisradClientStatus" AS ENUM ('ACTIVE', 'LEAD', 'ARCHIVED', 'LOST', 'CHURNED');

-- CreateEnum
CREATE TYPE "MisradClientType" AS ENUM ('RETAINER', 'PROJECT', 'HOURLY');

-- CreateEnum
CREATE TYPE "MisradJourneyStageStatus" AS ENUM ('COMPLETED', 'ACTIVE', 'PENDING');

-- CreateEnum
CREATE TYPE "MisradOpportunityStatus" AS ENUM ('NEW', 'PROPOSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "MisradSuccessGoalStatus" AS ENUM ('IN_PROGRESS', 'ACHIEVED', 'AT_RISK');

-- CreateEnum
CREATE TYPE "MisradClientActionType" AS ENUM ('APPROVAL', 'UPLOAD', 'SIGNATURE', 'FORM', 'FEEDBACK');

-- CreateEnum
CREATE TYPE "MisradClientActionStatus" AS ENUM ('PENDING', 'COMPLETED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "MisradAssignedFormStatus" AS ENUM ('SENT', 'OPENED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MisradFeedbackSentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "MisradFeedbackSource" AS ENUM ('EMAIL_SURVEY', 'PLATFORM_POPUP', 'WHATSAPP_BOT', 'EXIT_INTERVIEW', 'PORTAL_FRICTION');

-- CreateEnum
CREATE TYPE "MisradRoiCategory" AS ENUM ('REVENUE_LIFT', 'COST_SAVING', 'EFFICIENCY', 'REFUND');

-- CreateEnum
CREATE TYPE "MisradAssetType" AS ENUM ('PDF', 'IMAGE', 'LINK', 'FIGMA', 'DOC');

-- CreateEnum
CREATE TYPE "MisradAssetCategory" AS ENUM ('BRANDING', 'LEGAL', 'INPUT', 'STRATEGY');

-- CreateEnum
CREATE TYPE "MisradUploadedBy" AS ENUM ('CLIENT', 'AGENCY');

-- CreateEnum
CREATE TYPE "MisradDeliverableType" AS ENUM ('CAMPAIGN', 'REPORT', 'DESIGN', 'STRATEGY', 'DEV');

-- CreateEnum
CREATE TYPE "MisradDeliverableStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "MisradStakeholderRole" AS ENUM ('CHAMPION', 'DECISION_MAKER', 'INFLUENCER', 'BLOCKER', 'GATEKEEPER', 'USER');

-- CreateEnum
CREATE TYPE "MisradGroupEventType" AS ENUM ('WEBINAR', 'WORKSHOP', 'MASTERCLASS');

-- CreateEnum
CREATE TYPE "MisradGroupEventStatus" AS ENUM ('UPCOMING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MisradInvoiceStatus" AS ENUM ('PAID', 'PENDING', 'OVERDUE');

-- CreateEnum
CREATE TYPE "MisradAgreementType" AS ENUM ('MSA', 'SOW', 'NDA', 'ADDENDUM');

-- CreateEnum
CREATE TYPE "MisradAgreementStatus" AS ENUM ('ACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MisradCycleStatus" AS ENUM ('RECRUITING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MisradMeetingLocation" AS ENUM ('ZOOM', 'FRONTAL', 'PHONE');

-- CreateEnum
CREATE TYPE "MisradMeetingFileType" AS ENUM ('PDF', 'DOC', 'IMG');

-- CreateEnum
CREATE TYPE "MisradActivityLogType" AS ENUM ('EMAIL', 'MEETING', 'DELIVERABLE', 'SYSTEM', 'FINANCIAL', 'STATUS_CHANGE');

-- CreateEnum
CREATE TYPE "MisradTaskPriority" AS ENUM ('HIGH', 'NORMAL', 'LOW');

-- CreateEnum
CREATE TYPE "MisradTaskStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MisradLiabilityRiskLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "MisradFieldType" AS ENUM ('TEXT', 'TEXTAREA', 'SELECT', 'UPLOAD', 'DATE', 'CHECKBOX', 'RADIO');

-- CreateEnum
CREATE TYPE "MisradFormCategory" AS ENUM ('ONBOARDING', 'FEEDBACK', 'STRATEGY');

-- CreateEnum
CREATE TYPE "MisradWorkflowItemType" AS ENUM ('MEETING_ZOOM', 'MEETING_FRONTAL', 'TASK_CLIENT', 'TASK_AGENCY', 'FORM_SEND', 'CONTENT_DELIVERY');

-- CreateEnum
CREATE TYPE "MisradNotificationType" AS ENUM ('ALERT', 'MESSAGE', 'SUCCESS', 'TASK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "client_status" AS ENUM ('Active', 'Paused', 'Archived', 'Pending Payment', 'Onboarding', 'Overdue');

-- CreateEnum
CREATE TYPE "member_type" AS ENUM ('employee', 'freelancer');

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
    "nextRenewal" TEXT NOT NULL,
    "mainContact" TEXT NOT NULL,
    "mainContactRole" TEXT NOT NULL,
    "strengths" TEXT[],
    "weaknesses" TEXT[],
    "sentimentTrend" "MisradSentiment"[],
    "referralStatus" TEXT NOT NULL,
    "cancellationDate" TEXT,
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
CREATE TABLE "misrad_journey_stages" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "MisradJourneyStageStatus" NOT NULL,
    "date" TEXT,
    "completionPercentage" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_journey_stages_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "misrad_success_goals" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "metricCurrent" DOUBLE PRECISION NOT NULL,
    "metricTarget" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "deadline" TEXT NOT NULL,
    "status" "MisradSuccessGoalStatus" NOT NULL,
    "lastUpdated" TEXT NOT NULL,
    "aiForecast" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_success_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_metric_history" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "goal_id" UUID NOT NULL,
    "date" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "misrad_metric_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_client_handoffs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "salesRep" TEXT NOT NULL,
    "handoffDate" TEXT NOT NULL,
    "keyPromises" TEXT[],
    "mainPainPoint" TEXT NOT NULL,
    "successDefinition30Days" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_client_handoffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_roi_records" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "date" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "category" "MisradRoiCategory" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "misrad_roi_records_pkey" PRIMARY KEY ("id")
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
    "isBlocking" BOOLEAN NOT NULL,
    "lastReminderSent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_client_actions_pkey" PRIMARY KEY ("id")
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
    "lastActivity" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_assigned_forms_pkey" PRIMARY KEY ("id")
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
    "keywords" TEXT[],
    "sentiment" "MisradFeedbackSentiment" NOT NULL,
    "source" "MisradFeedbackSource" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "misrad_feedback_items_pkey" PRIMARY KEY ("id")
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
    "tags" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_client_deliverables_pkey" PRIMARY KEY ("id")
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
    "email" TEXT,
    "avatarUrl" TEXT,
    "notes" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_stakeholders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_meetings" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "date" TEXT NOT NULL,
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
CREATE TABLE "misrad_ai_tasks" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "analysis_id" UUID NOT NULL,
    "bucket" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "deadline" TEXT NOT NULL,
    "priority" "MisradTaskPriority" NOT NULL,
    "status" "MisradTaskStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_ai_tasks_pkey" PRIMARY KEY ("id")
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
    "isRead" BOOLEAN NOT NULL,
    "tags" TEXT[],
    "avatarUrl" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_emails_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "misrad_invoices" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "dueDate" TEXT NOT NULL,
    "status" "MisradInvoiceStatus" NOT NULL,
    "downloadUrl" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_client_agreements" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "type" "MisradAgreementType" NOT NULL,
    "signedDate" TEXT NOT NULL,
    "expiryDate" TEXT,
    "status" "MisradAgreementStatus" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_client_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_cycles" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "status" "MisradCycleStatus" NOT NULL,
    "groupLinks" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_cycles_pkey" PRIMARY KEY ("id")
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
    "isBlocking" BOOLEAN NOT NULL,
    "lastReminderSent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_cycle_tasks_pkey" PRIMARY KEY ("id")
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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "misrad_cycle_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_group_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "cycle_id" UUID,
    "title" TEXT NOT NULL,
    "type" "MisradGroupEventType" NOT NULL,
    "date" TEXT NOT NULL,
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
CREATE TABLE "misrad_notifications" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID,
    "recipient_id" UUID,
    "type" "MisradNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL,
    "link" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "misrad_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misrad_activity_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "type" "MisradActivityLogType" NOT NULL,
    "description" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "isRisk" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "misrad_activity_logs_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "nexus_users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "department" TEXT,
    "avatar" TEXT,
    "online" BOOLEAN DEFAULT false,
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

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
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

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
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
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nexus_time_entries" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "start_time" TIMESTAMPTZ(6) NOT NULL,
    "end_time" TIMESTAMPTZ(6),
    "date" DATE NOT NULL,
    "duration_minutes" INTEGER,
    "void_reason" TEXT,
    "voided_by" UUID,
    "voided_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
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
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "operations_work_orders" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "created_by_type" TEXT NOT NULL DEFAULT 'INTERNAL',
    "created_by_ref" TEXT,
    "installation_address" TEXT,
    "address_normalized" TEXT,
    "scheduled_start" TIMESTAMPTZ(6),
    "scheduled_end" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_work_orders_pkey" PRIMARY KEY ("id")
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
    "installation_address" TEXT,
    "location_x" DECIMAL(10,6),
    "location_y" DECIMAL(10,6),
    "assigned_agent_id" UUID,
    "subscription_end_date" TIMESTAMPTZ(6),
    "product_interest" TEXT,
    "playbook_step" TEXT,
    "budget_hours" INTEGER,
    "logged_hours" INTEGER,
    "ai_tags" JSONB DEFAULT '[]',
    "next_action_date" TIMESTAMPTZ(6),
    "next_action_note" TEXT,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_pipeline_stages" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "stage_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT,
    "accent" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_pipeline_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_lead_activities" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
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
CREATE TABLE "system_lead_handovers" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
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
CREATE TABLE "system_invoices" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
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
CREATE TABLE "system_calendar_events" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "lead_id" UUID,
    "title" TEXT NOT NULL,
    "lead_name" TEXT NOT NULL,
    "lead_company" TEXT NOT NULL,
    "day_name" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
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
CREATE TABLE "system_webhook_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "timestamp" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "channel" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "system_webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_call_analyses" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
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

    CONSTRAINT "system_call_analyses_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "system_portal_approvals" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
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
CREATE TABLE "system_support_tickets" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "lead_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_posts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
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

    CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "scale_notifications" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "recipient_id" UUID,
    "type" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "actor_id" UUID,
    "actor_name" TEXT,
    "related_id" UUID,
    "is_read" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
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
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "metadata" JSONB DEFAULT '{}',
    "admin_response" TEXT,
    "resolution_notes" TEXT,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_activity_logs" (
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
CREATE TABLE "social_agency_service_configs" (
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
CREATE TABLE "social_ai_opportunities" (
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
CREATE TABLE "social_app_updates" (
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
CREATE TABLE "social_automation_rules" (
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
CREATE TABLE "social_business_metrics" (
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
CREATE TABLE "social_calendar_events" (
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
CREATE TABLE "social_campaigns" (
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
CREATE TABLE "social_client_active_platforms" (
    "client_id" UUID NOT NULL,
    "platform" TEXT NOT NULL,

    CONSTRAINT "client_active_platforms_pkey" PRIMARY KEY ("client_id","platform")
);

-- CreateTable
CREATE TABLE "social_client_dna" (
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
CREATE TABLE "social_client_requests" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
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
CREATE TABLE "social_clients" (
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
    "organization_id" UUID
);

-- CreateTable
CREATE TABLE "social_conversations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
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
CREATE TABLE "social_drive_files" (
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
CREATE TABLE "social_feedback" (
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
CREATE TABLE "social_global_system_metrics" (
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
CREATE TABLE "social_ideas" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "client_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ideas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_impersonation_sessions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "admin_user_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "impersonation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_integration_credentials" (
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
CREATE TABLE "social_integration_status" (
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
CREATE TABLE "social_invoices" (
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
CREATE TABLE "social_manager_requests" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
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
CREATE TABLE "social_messages" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "conversation_id" UUID NOT NULL,
    "sender" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "is_me" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_navigation_menu" (
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
CREATE TABLE "social_notifications" (
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
CREATE TABLE "social_oauth_tokens" (
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
CREATE TABLE "organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "logo" TEXT,
    "owner_id" UUID NOT NULL,
    "has_nexus" BOOLEAN DEFAULT false,
    "has_social" BOOLEAN DEFAULT false,
    "has_system" BOOLEAN DEFAULT false,
    "has_finance" BOOLEAN DEFAULT false,
    "has_client" BOOLEAN DEFAULT false,
    "subscription_status" TEXT DEFAULT 'trial',
    "subscription_plan" TEXT,
    "trial_start_date" TIMESTAMPTZ(6),
    "trial_days" INTEGER DEFAULT 30,
    "subscription_start_date" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_features" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "feature_key" TEXT NOT NULL,
    "enabled" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_features_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "social_payment_orders" (
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
CREATE TABLE "social_platform_credentials" (
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
CREATE TABLE "social_platform_quotas" (
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
CREATE TABLE "social_post_comments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "post_id" UUID NOT NULL,
    "team_member_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_post_platforms" (
    "post_id" UUID NOT NULL,
    "platform" TEXT NOT NULL,

    CONSTRAINT "post_platforms_pkey" PRIMARY KEY ("post_id","platform")
);

-- CreateTable
CREATE TABLE "social_post_variations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "post_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image_suggestion" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_variations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_sheets_sync_configs" (
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
CREATE TABLE "social_site_content" (
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
CREATE TABLE "social_sync_logs" (
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
CREATE TABLE "social_system_backups" (
    "id" TEXT NOT NULL,
    "status" TEXT DEFAULT 'pending',
    "size" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "error_message" TEXT,

    CONSTRAINT "system_backups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_system_settings" (
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
CREATE TABLE "social_tasks" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
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

    CONSTRAINT "social_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_team_comments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "team_member_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_team_member_clients" (
    "team_member_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,

    CONSTRAINT "team_member_clients_pkey" PRIMARY KEY ("team_member_id","client_id")
);

-- CreateTable
CREATE TABLE "social_team_members" (
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
    "trial_days" INTEGER DEFAULT 30,
    "subscription_status" TEXT,
    "subscription_start_date" TIMESTAMPTZ(6),
    "organization_id" UUID,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_user_update_views" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "update_id" UUID NOT NULL,
    "viewed_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_update_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "clerk_user_id" TEXT NOT NULL,
    "email" TEXT,
    "full_name" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "organization_id" UUID,
    "role" TEXT DEFAULT 'team_member',
    "allowed_modules" TEXT[] DEFAULT ARRAY['nexus', 'client']::TEXT[]
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
    "notification_preferences" JSONB DEFAULT '{}',
    "two_factor_enabled" BOOLEAN DEFAULT false,
    "ui_preferences" JSONB DEFAULT '{}',
    "social_profile" JSONB DEFAULT '{}',
    "billing_info" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_webhook_configs" (
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
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "misrad_clients_organization_id_idx" ON "misrad_clients"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_clients_customer_account_id_idx" ON "misrad_clients"("customer_account_id");

-- CreateIndex
CREATE INDEX "misrad_clients_cycleId_idx" ON "misrad_clients"("cycleId");

-- CreateIndex
CREATE INDEX "misrad_journey_stages_organization_id_idx" ON "misrad_journey_stages"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_journey_stages_client_id_idx" ON "misrad_journey_stages"("client_id");

-- CreateIndex
CREATE INDEX "misrad_milestones_organization_id_idx" ON "misrad_milestones"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_milestones_client_id_idx" ON "misrad_milestones"("client_id");

-- CreateIndex
CREATE INDEX "misrad_milestones_stage_id_idx" ON "misrad_milestones"("stage_id");

-- CreateIndex
CREATE INDEX "misrad_opportunities_organization_id_idx" ON "misrad_opportunities"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_opportunities_client_id_idx" ON "misrad_opportunities"("client_id");

-- CreateIndex
CREATE INDEX "misrad_success_goals_organization_id_idx" ON "misrad_success_goals"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_success_goals_client_id_idx" ON "misrad_success_goals"("client_id");

-- CreateIndex
CREATE INDEX "misrad_metric_history_organization_id_idx" ON "misrad_metric_history"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_metric_history_client_id_idx" ON "misrad_metric_history"("client_id");

-- CreateIndex
CREATE INDEX "misrad_metric_history_goal_id_idx" ON "misrad_metric_history"("goal_id");

-- CreateIndex
CREATE UNIQUE INDEX "misrad_client_handoffs_client_id_key" ON "misrad_client_handoffs"("client_id");

-- CreateIndex
CREATE INDEX "misrad_client_handoffs_organization_id_idx" ON "misrad_client_handoffs"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_roi_records_organization_id_idx" ON "misrad_roi_records"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_roi_records_client_id_idx" ON "misrad_roi_records"("client_id");

-- CreateIndex
CREATE INDEX "misrad_roi_records_category_idx" ON "misrad_roi_records"("category");

-- CreateIndex
CREATE INDEX "misrad_client_actions_organization_id_idx" ON "misrad_client_actions"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_client_actions_client_id_idx" ON "misrad_client_actions"("client_id");

-- CreateIndex
CREATE INDEX "misrad_client_actions_status_idx" ON "misrad_client_actions"("status");

-- CreateIndex
CREATE INDEX "misrad_assigned_forms_organization_id_idx" ON "misrad_assigned_forms"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_assigned_forms_client_id_idx" ON "misrad_assigned_forms"("client_id");

-- CreateIndex
CREATE INDEX "misrad_assigned_forms_templateId_idx" ON "misrad_assigned_forms"("templateId");

-- CreateIndex
CREATE INDEX "misrad_feedback_items_organization_id_idx" ON "misrad_feedback_items"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_feedback_items_client_id_idx" ON "misrad_feedback_items"("client_id");

-- CreateIndex
CREATE INDEX "misrad_feedback_items_source_idx" ON "misrad_feedback_items"("source");

-- CreateIndex
CREATE INDEX "misrad_client_assets_organization_id_idx" ON "misrad_client_assets"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_client_assets_client_id_idx" ON "misrad_client_assets"("client_id");

-- CreateIndex
CREATE INDEX "misrad_client_assets_category_idx" ON "misrad_client_assets"("category");

-- CreateIndex
CREATE INDEX "misrad_client_deliverables_organization_id_idx" ON "misrad_client_deliverables"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_client_deliverables_client_id_idx" ON "misrad_client_deliverables"("client_id");

-- CreateIndex
CREATE INDEX "misrad_client_deliverables_status_idx" ON "misrad_client_deliverables"("status");

-- CreateIndex
CREATE INDEX "misrad_client_transformations_organization_id_idx" ON "misrad_client_transformations"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_client_transformations_client_id_idx" ON "misrad_client_transformations"("client_id");

-- CreateIndex
CREATE INDEX "misrad_client_transformations_isPublished_idx" ON "misrad_client_transformations"("isPublished");

-- CreateIndex
CREATE INDEX "misrad_stakeholders_organization_id_idx" ON "misrad_stakeholders"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_stakeholders_client_id_idx" ON "misrad_stakeholders"("client_id");

-- CreateIndex
CREATE INDEX "misrad_stakeholders_nexusRole_idx" ON "misrad_stakeholders"("nexusRole");

-- CreateIndex
CREATE INDEX "misrad_meetings_organization_id_idx" ON "misrad_meetings"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_meetings_client_id_idx" ON "misrad_meetings"("client_id");

-- CreateIndex
CREATE INDEX "misrad_meeting_files_organization_id_idx" ON "misrad_meeting_files"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_meeting_files_client_id_idx" ON "misrad_meeting_files"("client_id");

-- CreateIndex
CREATE INDEX "misrad_meeting_files_meeting_id_idx" ON "misrad_meeting_files"("meeting_id");

-- CreateIndex
CREATE UNIQUE INDEX "misrad_meeting_analysis_results_meeting_id_key" ON "misrad_meeting_analysis_results"("meeting_id");

-- CreateIndex
CREATE INDEX "misrad_meeting_analysis_results_organization_id_idx" ON "misrad_meeting_analysis_results"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_meeting_analysis_results_client_id_idx" ON "misrad_meeting_analysis_results"("client_id");

-- CreateIndex
CREATE INDEX "misrad_ai_tasks_organization_id_idx" ON "misrad_ai_tasks"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_ai_tasks_client_id_idx" ON "misrad_ai_tasks"("client_id");

-- CreateIndex
CREATE INDEX "misrad_ai_tasks_analysis_id_idx" ON "misrad_ai_tasks"("analysis_id");

-- CreateIndex
CREATE INDEX "misrad_ai_tasks_bucket_idx" ON "misrad_ai_tasks"("bucket");

-- CreateIndex
CREATE INDEX "misrad_ai_liability_risks_organization_id_idx" ON "misrad_ai_liability_risks"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_ai_liability_risks_client_id_idx" ON "misrad_ai_liability_risks"("client_id");

-- CreateIndex
CREATE INDEX "misrad_ai_liability_risks_analysis_id_idx" ON "misrad_ai_liability_risks"("analysis_id");

-- CreateIndex
CREATE INDEX "misrad_ai_liability_risks_riskLevel_idx" ON "misrad_ai_liability_risks"("riskLevel");

-- CreateIndex
CREATE INDEX "misrad_emails_organization_id_idx" ON "misrad_emails"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_emails_client_id_idx" ON "misrad_emails"("client_id");

-- CreateIndex
CREATE INDEX "misrad_emails_isRead_idx" ON "misrad_emails"("isRead");

-- CreateIndex
CREATE INDEX "misrad_messages_organization_id_idx" ON "misrad_messages"("organization_id");

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
CREATE INDEX "misrad_message_attachments_message_id_idx" ON "misrad_message_attachments"("message_id");

-- CreateIndex
CREATE INDEX "misrad_invoices_organization_id_idx" ON "misrad_invoices"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_invoices_client_id_idx" ON "misrad_invoices"("client_id");

-- CreateIndex
CREATE INDEX "misrad_invoices_status_idx" ON "misrad_invoices"("status");

-- CreateIndex
CREATE INDEX "misrad_client_agreements_organization_id_idx" ON "misrad_client_agreements"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_client_agreements_client_id_idx" ON "misrad_client_agreements"("client_id");

-- CreateIndex
CREATE INDEX "misrad_client_agreements_status_idx" ON "misrad_client_agreements"("status");

-- CreateIndex
CREATE INDEX "misrad_cycles_organization_id_idx" ON "misrad_cycles"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_cycles_status_idx" ON "misrad_cycles"("status");

-- CreateIndex
CREATE INDEX "misrad_cycle_tasks_organization_id_idx" ON "misrad_cycle_tasks"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_cycle_tasks_cycle_id_idx" ON "misrad_cycle_tasks"("cycle_id");

-- CreateIndex
CREATE INDEX "misrad_cycle_assets_organization_id_idx" ON "misrad_cycle_assets"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_cycle_assets_cycle_id_idx" ON "misrad_cycle_assets"("cycle_id");

-- CreateIndex
CREATE INDEX "misrad_group_events_organization_id_idx" ON "misrad_group_events"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_group_events_cycle_id_idx" ON "misrad_group_events"("cycle_id");

-- CreateIndex
CREATE INDEX "misrad_group_events_status_idx" ON "misrad_group_events"("status");

-- CreateIndex
CREATE INDEX "misrad_workflow_blueprints_organization_id_idx" ON "misrad_workflow_blueprints"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_workflow_stages_organization_id_idx" ON "misrad_workflow_stages"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_workflow_stages_blueprint_id_idx" ON "misrad_workflow_stages"("blueprint_id");

-- CreateIndex
CREATE INDEX "misrad_workflow_items_organization_id_idx" ON "misrad_workflow_items"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_workflow_items_stage_id_idx" ON "misrad_workflow_items"("stage_id");

-- CreateIndex
CREATE INDEX "misrad_form_templates_organization_id_idx" ON "misrad_form_templates"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_form_templates_category_idx" ON "misrad_form_templates"("category");

-- CreateIndex
CREATE INDEX "misrad_form_steps_organization_id_idx" ON "misrad_form_steps"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_form_steps_template_id_idx" ON "misrad_form_steps"("template_id");

-- CreateIndex
CREATE INDEX "misrad_form_fields_organization_id_idx" ON "misrad_form_fields"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_form_fields_step_id_idx" ON "misrad_form_fields"("step_id");

-- CreateIndex
CREATE INDEX "misrad_form_responses_organization_id_idx" ON "misrad_form_responses"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_form_responses_client_id_idx" ON "misrad_form_responses"("client_id");

-- CreateIndex
CREATE INDEX "misrad_form_responses_template_id_idx" ON "misrad_form_responses"("template_id");

-- CreateIndex
CREATE INDEX "misrad_form_responses_assigned_form_id_idx" ON "misrad_form_responses"("assigned_form_id");

-- CreateIndex
CREATE INDEX "misrad_notifications_organization_id_idx" ON "misrad_notifications"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_notifications_client_id_idx" ON "misrad_notifications"("client_id");

-- CreateIndex
CREATE INDEX "misrad_notifications_recipient_id_idx" ON "misrad_notifications"("recipient_id");

-- CreateIndex
CREATE INDEX "misrad_notifications_is_read_idx" ON "misrad_notifications"("is_read");

-- CreateIndex
CREATE INDEX "misrad_activity_logs_organization_id_idx" ON "misrad_activity_logs"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_activity_logs_client_id_idx" ON "misrad_activity_logs"("client_id");

-- CreateIndex
CREATE INDEX "misrad_activity_logs_type_idx" ON "misrad_activity_logs"("type");

-- CreateIndex
CREATE INDEX "misrad_activity_logs_isRisk_idx" ON "misrad_activity_logs"("isRisk");

-- CreateIndex
CREATE UNIQUE INDEX "misrad_module_settings_organization_id_key" ON "misrad_module_settings"("organization_id");

-- CreateIndex
CREATE INDEX "idx_users_department" ON "nexus_users"("department");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "nexus_users"("email");

-- CreateIndex
CREATE INDEX "idx_users_role" ON "nexus_users"("role");

-- CreateIndex
CREATE INDEX "idx_clients_company_name" ON "nexus_clients"("company_name");

-- CreateIndex
CREATE INDEX "idx_clients_email" ON "nexus_clients"("email");

-- CreateIndex
CREATE INDEX "idx_nexus_clients_organization_id" ON "nexus_clients"("organization_id");

-- CreateIndex
CREATE INDEX "idx_tasks_assignee_id" ON "nexus_tasks"("assignee_id");

-- CreateIndex
CREATE INDEX "idx_tasks_client_id" ON "nexus_tasks"("client_id");

-- CreateIndex
CREATE INDEX "idx_tasks_created_at" ON "nexus_tasks"("created_at");

-- CreateIndex
CREATE INDEX "idx_tasks_due_date" ON "nexus_tasks"("due_date");

-- CreateIndex
CREATE INDEX "idx_tasks_status" ON "nexus_tasks"("status");

-- CreateIndex
CREATE INDEX "idx_nexus_tasks_organization_id" ON "nexus_tasks"("organization_id");

-- CreateIndex
CREATE INDEX "idx_time_entries_date" ON "nexus_time_entries"("date");

-- CreateIndex
CREATE INDEX "idx_time_entries_start_time" ON "nexus_time_entries"("start_time");

-- CreateIndex
CREATE INDEX "idx_time_entries_user_id" ON "nexus_time_entries"("user_id");

-- CreateIndex
CREATE INDEX "idx_nexus_time_entries_organization_id" ON "nexus_time_entries"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_subdomain_key" ON "nexus_tenants"("subdomain");

-- CreateIndex
CREATE INDEX "idx_tenants_owner_email" ON "nexus_tenants"("owner_email");

-- CreateIndex
CREATE INDEX "idx_tenants_status" ON "nexus_tenants"("status");

-- CreateIndex
CREATE INDEX "idx_tenants_subdomain" ON "nexus_tenants"("subdomain");

-- CreateIndex
CREATE INDEX "idx_operations_suppliers_organization_id" ON "operations_suppliers"("organization_id");

-- CreateIndex
CREATE INDEX "idx_operations_items_organization_id" ON "operations_items"("organization_id");

-- CreateIndex
CREATE INDEX "idx_operations_items_supplier_id" ON "operations_items"("supplier_id");

-- CreateIndex
CREATE INDEX "idx_operations_projects_organization_id" ON "operations_projects"("organization_id");

-- CreateIndex
CREATE INDEX "idx_operations_projects_canonical_client_id" ON "operations_projects"("canonical_client_id");

-- CreateIndex
CREATE INDEX "idx_operations_work_orders_organization_id" ON "operations_work_orders"("organization_id");

-- CreateIndex
CREATE INDEX "idx_operations_work_orders_project_id" ON "operations_work_orders"("project_id");

-- CreateIndex
CREATE INDEX "idx_operations_inventory_organization_id" ON "operations_inventory"("organization_id");

-- CreateIndex
CREATE INDEX "idx_operations_inventory_item_id" ON "operations_inventory"("item_id");

-- CreateIndex
CREATE INDEX "idx_client_clients_organization_id" ON "client_clients"("organization_id");

-- CreateIndex
CREATE INDEX "idx_client_clients_full_name" ON "client_clients"("full_name");

-- CreateIndex
CREATE UNIQUE INDEX "client_profiles_client_id_key" ON "client_profiles"("client_id");

-- CreateIndex
CREATE INDEX "idx_client_profiles_organization_id" ON "client_profiles"("organization_id");

-- CreateIndex
CREATE INDEX "idx_client_internal_notes_organization_id" ON "client_internal_notes"("organization_id");

-- CreateIndex
CREATE INDEX "idx_client_internal_notes_client_id" ON "client_internal_notes"("client_id");

-- CreateIndex
CREATE INDEX "idx_client_internal_notes_created_at" ON "client_internal_notes"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "client_service_tiers_client_id_key" ON "client_service_tiers"("client_id");

-- CreateIndex
CREATE INDEX "idx_client_service_tiers_organization_id" ON "client_service_tiers"("organization_id");

-- CreateIndex
CREATE INDEX "idx_client_service_tiers_tier_key" ON "client_service_tiers"("tier_key");

-- CreateIndex
CREATE INDEX "idx_client_portal_users_organization_id" ON "client_portal_users"("organization_id");

-- CreateIndex
CREATE INDEX "idx_client_portal_users_client_id" ON "client_portal_users"("client_id");

-- CreateIndex
CREATE INDEX "idx_client_portal_users_clerk_user_id" ON "client_portal_users"("clerk_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_client_portal_users_org_client_clerk" ON "client_portal_users"("organization_id", "client_id", "clerk_user_id");

-- CreateIndex
CREATE INDEX "idx_client_portal_invites_organization_id" ON "client_portal_invites"("organization_id");

-- CreateIndex
CREATE INDEX "idx_client_portal_invites_client_id" ON "client_portal_invites"("client_id");

-- CreateIndex
CREATE INDEX "idx_client_portal_invites_email" ON "client_portal_invites"("email");

-- CreateIndex
CREATE INDEX "idx_client_portal_invites_expires_at" ON "client_portal_invites"("expires_at");

-- CreateIndex
CREATE INDEX "idx_client_shared_files_organization_id" ON "client_shared_files"("organization_id");

-- CreateIndex
CREATE INDEX "idx_client_shared_files_client_id" ON "client_shared_files"("client_id");

-- CreateIndex
CREATE INDEX "idx_client_shared_files_visible" ON "client_shared_files"("is_visible_to_client");

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
CREATE INDEX "idx_client_approvals_organization_id" ON "client_approvals"("organization_id");

-- CreateIndex
CREATE INDEX "idx_client_approvals_client_id" ON "client_approvals"("client_id");

-- CreateIndex
CREATE INDEX "idx_client_approvals_status" ON "client_approvals"("status");

-- CreateIndex
CREATE INDEX "idx_client_approvals_subject" ON "client_approvals"("subject_type", "subject_id");

-- CreateIndex
CREATE INDEX "idx_client_tasks_organization_id" ON "client_tasks"("organization_id");

-- CreateIndex
CREATE INDEX "idx_client_tasks_client_id" ON "client_tasks"("client_id");

-- CreateIndex
CREATE INDEX "idx_client_tasks_status" ON "client_tasks"("status");

-- CreateIndex
CREATE INDEX "idx_client_tasks_due_at" ON "client_tasks"("due_at");

-- CreateIndex
CREATE INDEX "idx_client_sessions_organization_id" ON "client_sessions"("organization_id");

-- CreateIndex
CREATE INDEX "idx_client_sessions_client_id" ON "client_sessions"("client_id");

-- CreateIndex
CREATE INDEX "idx_client_sessions_start_at" ON "client_sessions"("start_at");

-- CreateIndex
CREATE INDEX "idx_client_feedbacks_organization_id" ON "client_feedbacks"("organization_id");

-- CreateIndex
CREATE INDEX "idx_client_feedbacks_client_id" ON "client_feedbacks"("client_id");

-- CreateIndex
CREATE INDEX "idx_client_feedbacks_rating" ON "client_feedbacks"("rating");

-- CreateIndex
CREATE INDEX "idx_client_feedbacks_created_at" ON "client_feedbacks"("created_at");

-- CreateIndex
CREATE INDEX "idx_client_portal_content_organization_id" ON "client_portal_content"("organization_id");

-- CreateIndex
CREATE INDEX "idx_client_portal_content_client_id" ON "client_portal_content"("client_id");

-- CreateIndex
CREATE INDEX "idx_client_portal_content_kind" ON "client_portal_content"("kind");

-- CreateIndex
CREATE INDEX "idx_client_portal_content_is_published" ON "client_portal_content"("is_published");

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
CREATE INDEX "idx_system_pipeline_stages_organization_id" ON "system_pipeline_stages"("organization_id");

-- CreateIndex
CREATE INDEX "idx_system_pipeline_stages_sort_order" ON "system_pipeline_stages"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "system_pipeline_stages_org_key" ON "system_pipeline_stages"("organization_id", "stage_key");

-- CreateIndex
CREATE INDEX "idx_system_lead_activities_lead_id" ON "system_lead_activities"("lead_id");

-- CreateIndex
CREATE INDEX "idx_system_lead_activities_timestamp" ON "system_lead_activities"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "system_lead_handovers_lead_id_key" ON "system_lead_handovers"("lead_id");

-- CreateIndex
CREATE INDEX "idx_system_tasks_assignee_id" ON "system_tasks"("assignee_id");

-- CreateIndex
CREATE INDEX "idx_system_tasks_due_date" ON "system_tasks"("due_date");

-- CreateIndex
CREATE INDEX "idx_system_tasks_status" ON "system_tasks"("status");

-- CreateIndex
CREATE INDEX "idx_system_invoices_date" ON "system_invoices"("date");

-- CreateIndex
CREATE INDEX "idx_system_invoices_lead_id" ON "system_invoices"("lead_id");

-- CreateIndex
CREATE INDEX "idx_system_invoices_status" ON "system_invoices"("status");

-- CreateIndex
CREATE INDEX "idx_system_calendar_events_date" ON "system_calendar_events"("date");

-- CreateIndex
CREATE INDEX "idx_system_calendar_events_lead_id" ON "system_calendar_events"("lead_id");

-- CreateIndex
CREATE INDEX "idx_system_campaigns_created_at" ON "system_campaigns"("created_at");

-- CreateIndex
CREATE INDEX "idx_system_campaigns_status" ON "system_campaigns"("status");

-- CreateIndex
CREATE INDEX "idx_system_students_cohort" ON "system_students"("cohort");

-- CreateIndex
CREATE INDEX "idx_system_students_status" ON "system_students"("status");

-- CreateIndex
CREATE INDEX "idx_system_content_items_platform" ON "system_content_items"("platform");

-- CreateIndex
CREATE INDEX "idx_system_content_items_status" ON "system_content_items"("status");

-- CreateIndex
CREATE INDEX "idx_system_field_agents_status" ON "system_field_agents"("status");

-- CreateIndex
CREATE INDEX "idx_system_field_agents_user_id" ON "system_field_agents"("user_id");

-- CreateIndex
CREATE INDEX "idx_system_webhook_logs_channel" ON "system_webhook_logs"("channel");

-- CreateIndex
CREATE INDEX "idx_system_webhook_logs_timestamp" ON "system_webhook_logs"("timestamp");

-- CreateIndex
CREATE INDEX "idx_system_call_analyses_date" ON "system_call_analyses"("date");

-- CreateIndex
CREATE INDEX "idx_system_call_analyses_lead_id" ON "system_call_analyses"("lead_id");

-- CreateIndex
CREATE INDEX "idx_system_call_analyses_score" ON "system_call_analyses"("score");

-- CreateIndex
CREATE INDEX "idx_system_automations_enabled" ON "system_automations"("enabled");

-- CreateIndex
CREATE INDEX "idx_system_automations_trigger_type" ON "system_automations"("trigger_type");

-- CreateIndex
CREATE INDEX "idx_system_forms_created_at" ON "system_forms"("created_at");

-- CreateIndex
CREATE INDEX "idx_system_forms_status" ON "system_forms"("status");

-- CreateIndex
CREATE INDEX "idx_system_partners_status" ON "system_partners"("status");

-- CreateIndex
CREATE INDEX "idx_system_partners_type" ON "system_partners"("type");

-- CreateIndex
CREATE INDEX "idx_system_assets_category" ON "system_assets"("category");

-- CreateIndex
CREATE INDEX "idx_system_assets_type" ON "system_assets"("type");

-- CreateIndex
CREATE INDEX "idx_system_portal_approvals_lead_id" ON "system_portal_approvals"("lead_id");

-- CreateIndex
CREATE INDEX "idx_system_portal_approvals_status" ON "system_portal_approvals"("status");

-- CreateIndex
CREATE INDEX "idx_system_portal_tasks_lead_id" ON "system_portal_tasks"("lead_id");

-- CreateIndex
CREATE INDEX "idx_system_portal_tasks_status" ON "system_portal_tasks"("status");

-- CreateIndex
CREATE INDEX "idx_system_support_tickets_category" ON "system_support_tickets"("category");

-- CreateIndex
CREATE INDEX "idx_system_support_tickets_lead_id" ON "system_support_tickets"("lead_id");

-- CreateIndex
CREATE INDEX "idx_system_support_tickets_status" ON "system_support_tickets"("status");

-- CreateIndex
CREATE INDEX "idx_social_posts_client_id" ON "social_posts"("client_id");

-- CreateIndex
CREATE INDEX "idx_social_posts_status" ON "social_posts"("status");

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
CREATE INDEX "idx_team_events_tenant" ON "nexus_team_events"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_nexus_team_events_organization_id" ON "nexus_team_events"("organization_id");

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
CREATE INDEX "idx_notifications_is_read" ON "scale_notifications"("is_read");

-- CreateIndex
CREATE INDEX "idx_notifications_recipient_id" ON "scale_notifications"("recipient_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "misrad_roles"("name");

-- CreateIndex
CREATE INDEX "idx_roles_name" ON "misrad_roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_ticket_number_key" ON "misrad_support_tickets"("ticket_number");

-- CreateIndex
CREATE UNIQUE INDEX "business_metrics_client_id_key" ON "social_business_metrics"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_events_google_event_id_user_id_key" ON "social_calendar_events"("google_event_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_campaigns_client_id" ON "social_campaigns"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "client_dna_client_id_key" ON "social_client_dna"("client_id");

-- CreateIndex
CREATE INDEX "idx_client_dna_client_id" ON "social_client_dna"("client_id");

-- CreateIndex
CREATE INDEX "idx_client_dna_vocabulary_forbidden" ON "social_client_dna" USING GIN ("vocabulary_forbidden");

-- CreateIndex
CREATE INDEX "idx_client_dna_vocabulary_loved" ON "social_client_dna" USING GIN ("vocabulary_loved");

-- CreateIndex
CREATE UNIQUE INDEX "clients_portal_token_key" ON "social_clients"("portal_token");

-- CreateIndex
CREATE INDEX "clients_invitationToken_idx" ON "social_clients"("invitation_token");

-- CreateIndex
CREATE INDEX "clients_organization_id_idx" ON "social_clients"("organization_id");

-- CreateIndex
CREATE INDEX "idx_clients_plan" ON "social_clients"("plan");

-- CreateIndex
CREATE INDEX "idx_clients_status" ON "social_clients"("status");

-- CreateIndex
CREATE INDEX "idx_clients_user_id" ON "social_clients"("user_id");

-- CreateIndex
CREATE INDEX "idx_conversations_client_id" ON "social_conversations"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "drive_files_google_file_id_user_id_key" ON "social_drive_files"("google_file_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "impersonation_sessions_token_key" ON "social_impersonation_sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "integration_credentials_user_id_integration_name_key" ON "social_integration_credentials"("user_id", "integration_name");

-- CreateIndex
CREATE UNIQUE INDEX "integration_status_name_key" ON "social_integration_status"("name");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "social_invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "idx_invoices_client_id" ON "social_invoices"("client_id");

-- CreateIndex
CREATE INDEX "idx_messages_conversation_id" ON "social_messages"("conversation_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_tokens_user_id_integration_name_key" ON "social_oauth_tokens"("user_id", "integration_name");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_owner_id_key" ON "organizations"("owner_id");

-- CreateIndex
CREATE INDEX "organizations_owner_id_idx" ON "organizations"("owner_id");

-- CreateIndex
CREATE INDEX "organization_features_organization_id_idx" ON "organization_features"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_features_org_feature_key" ON "organization_features"("organization_id", "feature_key");

-- CreateIndex
CREATE INDEX "customer_accounts_organization_id_idx" ON "customer_accounts"("organization_id");

-- CreateIndex
CREATE INDEX "idx_payment_orders_client_id" ON "social_payment_orders"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_credentials_client_id_platform_key" ON "social_platform_credentials"("client_id", "platform");

-- CreateIndex
CREATE INDEX "idx_platform_quotas_client_id" ON "social_platform_quotas"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_quotas_client_id_platform_key" ON "social_platform_quotas"("client_id", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "sheets_sync_configs_user_id_spreadsheet_id_sheet_name_sync__key" ON "social_sheets_sync_configs"("user_id", "spreadsheet_id", "sheet_name", "sync_type");

-- CreateIndex
CREATE INDEX "idx_site_content_key" ON "social_site_content"("key");

-- CreateIndex
CREATE INDEX "idx_site_content_page_section" ON "social_site_content"("page", "section");

-- CreateIndex
CREATE UNIQUE INDEX "site_content_page_section_key_key" ON "social_site_content"("page", "section", "key");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "social_system_settings"("key");

-- CreateIndex
CREATE INDEX "idx_social_tasks_assigned_to" ON "social_tasks"("assigned_to");

-- CreateIndex
CREATE INDEX "idx_social_tasks_client_id" ON "social_tasks"("client_id");

-- CreateIndex
CREATE INDEX "idx_team_member_clients_client_team" ON "social_team_member_clients"("client_id", "team_member_id");

-- CreateIndex
CREATE INDEX "idx_team_member_clients_team_member_id" ON "social_team_member_clients"("team_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_user_id_key" ON "social_team_members"("user_id");

-- CreateIndex
CREATE INDEX "idx_team_members_email" ON "social_team_members"("email");

-- CreateIndex
CREATE INDEX "idx_team_members_subscription_status" ON "social_team_members"("subscription_status");

-- CreateIndex
CREATE INDEX "idx_team_members_trial_start_date" ON "social_team_members"("trial_start_date");

-- CreateIndex
CREATE INDEX "idx_team_members_user_id" ON "social_team_members"("user_id");

-- CreateIndex
CREATE INDEX "team_members_organization_id_idx" ON "social_team_members"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_update_views_user_id_update_id_key" ON "social_user_update_views"("user_id", "update_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_clerk_user_id_key" ON "social_users"("clerk_user_id");

-- CreateIndex
CREATE INDEX "idx_users_clerk_user_id" ON "social_users"("clerk_user_id");

-- CreateIndex
CREATE INDEX "users_organization_id_idx" ON "social_users"("organization_id");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "social_users"("role");

-- CreateIndex
CREATE INDEX "profiles_organization_id_idx" ON "profiles"("organization_id");

-- CreateIndex
CREATE INDEX "profiles_clerk_user_id_idx" ON "profiles"("clerk_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_org_clerk_key" ON "profiles"("organization_id", "clerk_user_id");

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

-- AddForeignKey
ALTER TABLE "misrad_clients" ADD CONSTRAINT "misrad_clients_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "misrad_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_clients" ADD CONSTRAINT "misrad_clients_customer_account_id_fkey" FOREIGN KEY ("customer_account_id") REFERENCES "customer_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_journey_stages" ADD CONSTRAINT "misrad_journey_stages_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_milestones" ADD CONSTRAINT "misrad_milestones_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_milestones" ADD CONSTRAINT "misrad_milestones_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "misrad_journey_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_opportunities" ADD CONSTRAINT "misrad_opportunities_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_success_goals" ADD CONSTRAINT "misrad_success_goals_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_metric_history" ADD CONSTRAINT "misrad_metric_history_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_metric_history" ADD CONSTRAINT "misrad_metric_history_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "misrad_success_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_client_handoffs" ADD CONSTRAINT "misrad_client_handoffs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_roi_records" ADD CONSTRAINT "misrad_roi_records_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_client_actions" ADD CONSTRAINT "misrad_client_actions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_assigned_forms" ADD CONSTRAINT "misrad_assigned_forms_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_feedback_items" ADD CONSTRAINT "misrad_feedback_items_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_client_assets" ADD CONSTRAINT "misrad_client_assets_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_client_deliverables" ADD CONSTRAINT "misrad_client_deliverables_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_client_transformations" ADD CONSTRAINT "misrad_client_transformations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_stakeholders" ADD CONSTRAINT "misrad_stakeholders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_meetings" ADD CONSTRAINT "misrad_meetings_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_meeting_files" ADD CONSTRAINT "misrad_meeting_files_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_meeting_files" ADD CONSTRAINT "misrad_meeting_files_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "misrad_meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_meeting_analysis_results" ADD CONSTRAINT "misrad_meeting_analysis_results_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_meeting_analysis_results" ADD CONSTRAINT "misrad_meeting_analysis_results_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "misrad_meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_ai_tasks" ADD CONSTRAINT "misrad_ai_tasks_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "misrad_meeting_analysis_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_ai_liability_risks" ADD CONSTRAINT "misrad_ai_liability_risks_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "misrad_meeting_analysis_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_emails" ADD CONSTRAINT "misrad_emails_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_message_attachments" ADD CONSTRAINT "misrad_message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "misrad_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_invoices" ADD CONSTRAINT "misrad_invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_client_agreements" ADD CONSTRAINT "misrad_client_agreements_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_cycle_tasks" ADD CONSTRAINT "misrad_cycle_tasks_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "misrad_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_cycle_assets" ADD CONSTRAINT "misrad_cycle_assets_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "misrad_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_group_events" ADD CONSTRAINT "misrad_group_events_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "misrad_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_workflow_stages" ADD CONSTRAINT "misrad_workflow_stages_blueprint_id_fkey" FOREIGN KEY ("blueprint_id") REFERENCES "misrad_workflow_blueprints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_workflow_items" ADD CONSTRAINT "misrad_workflow_items_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "misrad_workflow_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_form_steps" ADD CONSTRAINT "misrad_form_steps_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "misrad_form_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_form_fields" ADD CONSTRAINT "misrad_form_fields_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "misrad_form_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_form_responses" ADD CONSTRAINT "misrad_form_responses_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_form_responses" ADD CONSTRAINT "misrad_form_responses_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "misrad_form_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_notifications" ADD CONSTRAINT "misrad_notifications_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misrad_activity_logs" ADD CONSTRAINT "misrad_activity_logs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "misrad_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nexus_clients" ADD CONSTRAINT "nexus_clients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nexus_tasks" ADD CONSTRAINT "nexus_tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nexus_time_entries" ADD CONSTRAINT "nexus_time_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_suppliers" ADD CONSTRAINT "operations_suppliers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_items" ADD CONSTRAINT "operations_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_items" ADD CONSTRAINT "operations_items_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "operations_suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_projects" ADD CONSTRAINT "operations_projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_work_orders" ADD CONSTRAINT "operations_work_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_work_orders" ADD CONSTRAINT "operations_work_orders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "operations_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_inventory" ADD CONSTRAINT "operations_inventory_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_inventory" ADD CONSTRAINT "operations_inventory_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "operations_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_clients" ADD CONSTRAINT "client_clients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_internal_notes" ADD CONSTRAINT "client_internal_notes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_internal_notes" ADD CONSTRAINT "client_internal_notes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_service_tiers" ADD CONSTRAINT "client_service_tiers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_service_tiers" ADD CONSTRAINT "client_service_tiers_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_portal_users" ADD CONSTRAINT "client_portal_users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_portal_users" ADD CONSTRAINT "client_portal_users_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_portal_invites" ADD CONSTRAINT "client_portal_invites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_portal_invites" ADD CONSTRAINT "client_portal_invites_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_shared_files" ADD CONSTRAINT "client_shared_files_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_shared_files" ADD CONSTRAINT "client_shared_files_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_document_files" ADD CONSTRAINT "client_document_files_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_document_files" ADD CONSTRAINT "client_document_files_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_document_files" ADD CONSTRAINT "client_document_files_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "client_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_approvals" ADD CONSTRAINT "client_approvals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_approvals" ADD CONSTRAINT "client_approvals_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_approvals" ADD CONSTRAINT "client_approvals_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "client_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_tasks" ADD CONSTRAINT "client_tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_tasks" ADD CONSTRAINT "client_tasks_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_sessions" ADD CONSTRAINT "client_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_sessions" ADD CONSTRAINT "client_sessions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_feedbacks" ADD CONSTRAINT "client_feedbacks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_feedbacks" ADD CONSTRAINT "client_feedbacks_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_portal_content" ADD CONSTRAINT "client_portal_content_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_portal_content" ADD CONSTRAINT "client_portal_content_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_leads" ADD CONSTRAINT "system_leads_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_leads" ADD CONSTRAINT "system_leads_customer_account_id_fkey" FOREIGN KEY ("customer_account_id") REFERENCES "customer_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_pipeline_stages" ADD CONSTRAINT "system_pipeline_stages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_lead_activities" ADD CONSTRAINT "system_lead_activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "system_leads"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "system_lead_handovers" ADD CONSTRAINT "system_lead_handovers_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "system_leads"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "system_invoices" ADD CONSTRAINT "system_invoices_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "system_leads"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "system_calendar_events" ADD CONSTRAINT "system_calendar_events_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "system_leads"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "system_call_analyses" ADD CONSTRAINT "system_call_analyses_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "system_leads"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "system_portal_approvals" ADD CONSTRAINT "system_portal_approvals_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "system_leads"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "system_portal_tasks" ADD CONSTRAINT "system_portal_tasks_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "system_leads"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "system_support_tickets" ADD CONSTRAINT "system_support_tickets_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "system_leads"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nexus_employee_invitation_links" ADD CONSTRAINT "nexus_employee_invitation_links_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nexus_event_attendance" ADD CONSTRAINT "nexus_event_attendance_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nexus_leave_requests" ADD CONSTRAINT "nexus_leave_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nexus_team_events" ADD CONSTRAINT "nexus_team_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_activity_logs" ADD CONSTRAINT "activity_logs_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "social_team_members"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "social_clients" ADD CONSTRAINT "clients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "social_messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "social_conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "organization_features" ADD CONSTRAINT "organization_features_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_accounts" ADD CONSTRAINT "customer_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_post_comments" ADD CONSTRAINT "post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "social_post_comments" ADD CONSTRAINT "post_comments_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "social_team_members"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "social_post_platforms" ADD CONSTRAINT "post_platforms_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "social_post_variations" ADD CONSTRAINT "post_variations_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "social_team_comments" ADD CONSTRAINT "team_comments_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "social_team_members"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "social_team_member_clients" ADD CONSTRAINT "team_member_clients_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "social_team_members"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "social_team_members" ADD CONSTRAINT "team_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "social_user_update_views" ADD CONSTRAINT "user_update_views_update_id_fkey" FOREIGN KEY ("update_id") REFERENCES "social_app_updates"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "social_users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

