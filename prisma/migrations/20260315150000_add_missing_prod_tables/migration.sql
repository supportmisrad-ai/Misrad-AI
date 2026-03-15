-- Migration: Add missing tables to PROD DB
-- Created: 2026-03-15
-- Tables: impersonation_audit_logs, partner_link_usage

-- ============================================
-- Table: impersonation_audit_logs
-- ============================================
CREATE TABLE IF NOT EXISTS "impersonation_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "admin_user_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "organization_id" UUID,
    "action" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "impersonation_audit_logs_pkey" PRIMARY KEY ("id")
);

-- Create indexes for impersonation_audit_logs
CREATE INDEX IF NOT EXISTS "impersonation_audit_logs_admin_user_id_idx" ON "impersonation_audit_logs"("admin_user_id");
CREATE INDEX IF NOT EXISTS "impersonation_audit_logs_client_id_idx" ON "impersonation_audit_logs"("client_id");
CREATE INDEX IF NOT EXISTS "impersonation_audit_logs_created_at_idx" ON "impersonation_audit_logs"("created_at");

-- Add foreign key to impersonation_sessions (safe - table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'impersonation_sessions') THEN
        ALTER TABLE "impersonation_audit_logs" 
        ADD CONSTRAINT "impersonation_audit_logs_session_id_fkey" 
        FOREIGN KEY ("session_id") REFERENCES "impersonation_sessions"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================
-- Table: partner_link_usage
-- ============================================
CREATE TABLE IF NOT EXISTS "partner_link_usage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "partner_id" UUID NOT NULL,
    "visitor_phone" TEXT,
    "visitor_ip" TEXT,
    "user_agent" TEXT,
    "referrer" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "converted_at" TIMESTAMPTZ(6),
    "commission" DECIMAL(10, 2) DEFAULT 0,

    CONSTRAINT "partner_link_usage_pkey" PRIMARY KEY ("id")
);

-- Create indexes for partner_link_usage
CREATE INDEX IF NOT EXISTS "partner_link_usage_partner_id_idx" ON "partner_link_usage"("partner_id");
CREATE INDEX IF NOT EXISTS "partner_link_usage_created_at_idx" ON "partner_link_usage"("created_at");
CREATE INDEX IF NOT EXISTS "partner_link_usage_converted_idx" ON "partner_link_usage"("converted");

-- Add comments
COMMENT ON TABLE "impersonation_audit_logs" IS 'Audit log for admin impersonation sessions';
COMMENT ON TABLE "partner_link_usage" IS 'Tracking usage of partner referral links';
