-- Phase 1: Add NexusClient-equivalent fields to ClientClient
-- These fields enable gradual migration from nexus_clients → client_clients

ALTER TABLE "client_clients" ADD COLUMN IF NOT EXISTS "company_name" TEXT;
ALTER TABLE "client_clients" ADD COLUMN IF NOT EXISTS "avatar" TEXT;
ALTER TABLE "client_clients" ADD COLUMN IF NOT EXISTS "package" TEXT;
ALTER TABLE "client_clients" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE "client_clients" ADD COLUMN IF NOT EXISTS "contact_person" TEXT;
ALTER TABLE "client_clients" ADD COLUMN IF NOT EXISTS "joined_at" TIMESTAMP(3);
ALTER TABLE "client_clients" ADD COLUMN IF NOT EXISTS "assets_folder_url" TEXT;
ALTER TABLE "client_clients" ADD COLUMN IF NOT EXISTS "source" TEXT;

-- Index for common queries
CREATE INDEX IF NOT EXISTS "idx_client_clients_status" ON "client_clients" ("status");
CREATE INDEX IF NOT EXISTS "idx_client_clients_source" ON "client_clients" ("source");
CREATE INDEX IF NOT EXISTS "idx_client_clients_company_name" ON "client_clients" ("company_name");
