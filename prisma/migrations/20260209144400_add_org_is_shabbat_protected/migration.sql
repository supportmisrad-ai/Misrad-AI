-- Add organizations.is_shabbat_protected column (non-destructive)
ALTER TABLE "organizations"
ADD COLUMN IF NOT EXISTS "is_shabbat_protected" BOOLEAN NOT NULL DEFAULT true;
