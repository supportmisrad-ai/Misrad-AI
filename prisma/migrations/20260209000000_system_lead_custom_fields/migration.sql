ALTER TABLE "system_leads"
  ADD COLUMN IF NOT EXISTS "custom_fields" JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS "system_lead_custom_field_definitions" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "organization_id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'string',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "system_lead_custom_field_definitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "system_lead_custom_field_defs_org_key_key"
  ON "system_lead_custom_field_definitions" ("organization_id", "key");

CREATE INDEX IF NOT EXISTS "idx_system_lead_custom_field_defs_organization_id"
  ON "system_lead_custom_field_definitions" ("organization_id");

DO $$
BEGIN
  IF to_regclass('public.organizations') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'system_lead_custom_field_defs_organization_id_fkey'
    ) THEN
      ALTER TABLE "system_lead_custom_field_definitions"
        ADD CONSTRAINT "system_lead_custom_field_defs_organization_id_fkey"
        FOREIGN KEY ("organization_id")
        REFERENCES "organizations"("id")
        ON DELETE RESTRICT
        ON UPDATE NO ACTION;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.system_lead_custom_field_definitions') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'apply_org_rls'
    ) THEN
      PERFORM public.apply_org_rls('public.system_lead_custom_field_definitions');
    END IF;
  END IF;
END $$;
