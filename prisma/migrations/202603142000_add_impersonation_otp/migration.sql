-- Add OTP fields to ImpersonationSession
ALTER TABLE "impersonation_sessions" ADD COLUMN IF NOT EXISTS "otp_code" TEXT;
ALTER TABLE "impersonation_sessions" ADD COLUMN IF NOT EXISTS "otp_expires_at" TIMESTAMPTZ(6);
ALTER TABLE "impersonation_sessions" ADD COLUMN IF NOT EXISTS "otp_verified_at" TIMESTAMPTZ(6);

-- Add status column (enum)
DO $$ BEGIN
    CREATE TYPE "ImpersonationStatus" AS ENUM ('PENDING_OTP', 'OTP_SENT', 'ACTIVE', 'EXPIRED', 'REVOKED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "impersonation_sessions" ADD COLUMN IF NOT EXISTS "status" "ImpersonationStatus" NOT NULL DEFAULT 'PENDING_OTP';

-- Create ImpersonationAuditLog table
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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT "impersonation_audit_logs_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint
ALTER TABLE "impersonation_audit_logs" 
ADD CONSTRAINT "impersonation_audit_logs_session_id_fkey" 
FOREIGN KEY ("session_id") REFERENCES "impersonation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS "impersonation_audit_logs_admin_user_id_idx" ON "impersonation_audit_logs"("admin_user_id");
CREATE INDEX IF NOT EXISTS "impersonation_audit_logs_client_id_idx" ON "impersonation_audit_logs"("client_id");
CREATE INDEX IF NOT EXISTS "impersonation_audit_logs_created_at_idx" ON "impersonation_audit_logs"("created_at");
