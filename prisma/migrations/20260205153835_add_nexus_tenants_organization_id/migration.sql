/*
  Warnings:

  - A unique constraint covering the columns `[organization_id]` on the table `nexus_tenants` will be added. If there are existing duplicate values, this will fail.

*/
-- Minimal migration: add nexus_tenants.organization_id (nullable unique) + FK to organizations.

ALTER TABLE "nexus_tenants"
  ADD COLUMN IF NOT EXISTS "organization_id" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "nexus_tenants_organization_id_key"
  ON "nexus_tenants" ("organization_id");

DO $$
BEGIN
  ALTER TABLE "nexus_tenants"
    ADD CONSTRAINT "nexus_tenants_organization_id_fkey"
    FOREIGN KEY ("organization_id")
    REFERENCES "organizations"("id")
    ON DELETE SET NULL
    ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
