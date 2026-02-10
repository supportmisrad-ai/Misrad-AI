-- AlterTable: Add missing fields to nexus_tenants
ALTER TABLE "nexus_tenants" 
ADD COLUMN IF NOT EXISTS "phone" TEXT,
ADD COLUMN IF NOT EXISTS "max_users" INTEGER,
ADD COLUMN IF NOT EXISTS "default_language" TEXT DEFAULT 'he',
ADD COLUMN IF NOT EXISTS "activation_date" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- Add index for phone lookups
CREATE INDEX IF NOT EXISTS "idx_nexus_tenants_phone" ON "nexus_tenants"("phone");
