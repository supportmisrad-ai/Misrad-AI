-- Add missing date columns to misrad_invoices (schema expects date_at/due_date_at)

ALTER TABLE "misrad_invoices"
  ADD COLUMN IF NOT EXISTS "date_at" DATE,
  ADD COLUMN IF NOT EXISTS "due_date_at" DATE;

-- Backfill from existing text columns when formatted as YYYY-MM-DD
UPDATE "misrad_invoices"
SET "date_at" = CASE
  WHEN "date" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN "date"::date
  ELSE NULL
END
WHERE "date_at" IS NULL;

UPDATE "misrad_invoices"
SET "due_date_at" = CASE
  WHEN "dueDate" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN "dueDate"::date
  ELSE NULL
END
WHERE "due_date_at" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_misrad_invoices_org_date_at" ON "misrad_invoices"("organization_id", "date_at");
CREATE INDEX IF NOT EXISTS "idx_misrad_invoices_org_due_date_at" ON "misrad_invoices"("organization_id", "due_date_at");
