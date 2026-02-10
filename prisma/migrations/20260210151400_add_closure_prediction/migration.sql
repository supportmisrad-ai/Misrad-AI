-- AlterTable: Add closure prediction fields to SystemLead
-- Safe migration - adding nullable columns, no data loss

ALTER TABLE "system_leads" 
ADD COLUMN IF NOT EXISTS "closure_probability" INTEGER,
ADD COLUMN IF NOT EXISTS "closure_rationale" TEXT,
ADD COLUMN IF NOT EXISTS "recommended_action" TEXT;

-- No default values needed - nullable columns
-- No data migration needed - new fields will be populated by AI on next score computation
