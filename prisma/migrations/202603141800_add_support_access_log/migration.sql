-- Migration: Add SupportAccessLog table for audit logging of support access
-- Created: 2026-03-14
-- Safe to run on production - uses IF NOT EXISTS

-- Create the support access log table
CREATE TABLE IF NOT EXISTS "support_access_logs" (
    "id" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "admin_email" TEXT NOT NULL,
    "target_client_id" TEXT NOT NULL,
    "target_client_name" TEXT NOT NULL,
    "reason" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "accessed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "support_access_logs_pkey" PRIMARY KEY ("id")
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS "support_access_logs_admin_user_id_idx" ON "support_access_logs"("admin_user_id");
CREATE INDEX IF NOT EXISTS "support_access_logs_target_client_id_idx" ON "support_access_logs"("target_client_id");
CREATE INDEX IF NOT EXISTS "support_access_logs_accessed_at_idx" ON "support_access_logs"("accessed_at");
