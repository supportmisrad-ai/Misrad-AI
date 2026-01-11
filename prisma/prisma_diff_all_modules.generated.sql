-- AlterTable
ALTER TABLE "misrad_notifications" RENAME CONSTRAINT "notifications_pkey" TO "misrad_notifications_pkey",
DROP COLUMN "actor_id",
DROP COLUMN "actor_name",
DROP COLUMN "is_read",
DROP COLUMN "recipient_id",
DROP COLUMN "related_id",
DROP COLUMN "text",
ADD COLUMN     "client_id" UUID,
ADD COLUMN     "isRead" BOOLEAN NOT NULL,
ADD COLUMN     "link" TEXT,
ADD COLUMN     "message" TEXT NOT NULL,
ADD COLUMN     "organization_id" UUID NOT NULL,
ADD COLUMN     "timestamp" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
DROP COLUMN "type",
ADD COLUMN     "type" "MisradNotificationType" NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "logo" TEXT,
ADD COLUMN     "slug" TEXT,
ALTER COLUMN "has_nexus" DROP NOT NULL,
ALTER COLUMN "has_nexus" SET DEFAULT false,
ALTER COLUMN "has_social" DROP NOT NULL,
ALTER COLUMN "has_system" DROP NOT NULL,
ALTER COLUMN "has_finance" DROP NOT NULL,
ALTER COLUMN "has_client" DROP NOT NULL;

-- AlterTable
ALTER TABLE "system_leads" ADD COLUMN     "customer_account_id" UUID,
ADD COLUMN     "organization_id" UUID NOT NULL;

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
CREATE INDEX "idx_notifications_is_read" ON "scale_notifications"("is_read");

-- CreateIndex
CREATE INDEX "idx_notifications_recipient_id" ON "scale_notifications"("recipient_id");

-- CreateIndex
CREATE INDEX "customer_accounts_organization_id_idx" ON "customer_accounts"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_notifications_organization_id_idx" ON "misrad_notifications"("organization_id");

-- CreateIndex
CREATE INDEX "misrad_notifications_client_id_idx" ON "misrad_notifications"("client_id");

-- CreateIndex
CREATE INDEX "misrad_notifications_isRead_idx" ON "misrad_notifications"("isRead");

-- CreateIndex
CREATE INDEX "idx_system_leads_organization_id" ON "system_leads"("organization_id");

-- CreateIndex
CREATE INDEX "idx_system_leads_customer_account_id" ON "system_leads"("customer_account_id");

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
ALTER TABLE "nexus_employee_invitation_links" ADD CONSTRAINT "nexus_employee_invitation_links_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nexus_event_attendance" ADD CONSTRAINT "nexus_event_attendance_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nexus_leave_requests" ADD CONSTRAINT "nexus_leave_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nexus_team_events" ADD CONSTRAINT "nexus_team_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_accounts" ADD CONSTRAINT "customer_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

