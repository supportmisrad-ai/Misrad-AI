-- Operations Calls V2: buildings, categories, departments, messages, extended work orders
-- Safe idempotent migration (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
-- Generated 2026-02-15

-- ============================================================================
-- 1. operations_buildings
-- ============================================================================
CREATE TABLE IF NOT EXISTS "operations_buildings" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "floors" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_buildings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_operations_buildings_org"
  ON "operations_buildings"("organization_id");

DO $$ BEGIN
  ALTER TABLE "operations_buildings"
    ADD CONSTRAINT "fk_ops_buildings_org"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2. operations_call_categories
-- ============================================================================
CREATE TABLE IF NOT EXISTS "operations_call_categories" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "max_response_minutes" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_call_categories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_operations_call_categories_org"
  ON "operations_call_categories"("organization_id");

DO $$ BEGIN
  ALTER TABLE "operations_call_categories"
    ADD CONSTRAINT "fk_ops_call_categories_org"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 3. operations_departments
-- ============================================================================
CREATE TABLE IF NOT EXISTS "operations_departments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_departments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_operations_departments_org"
  ON "operations_departments"("organization_id");

CREATE UNIQUE INDEX IF NOT EXISTS "uq_operations_departments_org_slug"
  ON "operations_departments"("organization_id", "slug");

DO $$ BEGIN
  ALTER TABLE "operations_departments"
    ADD CONSTRAINT "fk_ops_departments_org"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 4. operations_call_messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS "operations_call_messages" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "author_name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mentions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_call_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_operations_call_messages_wo"
  ON "operations_call_messages"("work_order_id");

CREATE INDEX IF NOT EXISTS "idx_operations_call_messages_org"
  ON "operations_call_messages"("organization_id");

DO $$ BEGIN
  ALTER TABLE "operations_call_messages"
    ADD CONSTRAINT "fk_ops_call_messages_org"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "operations_call_messages"
    ADD CONSTRAINT "fk_ops_call_messages_wo"
    FOREIGN KEY ("work_order_id") REFERENCES "operations_work_orders"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 5. Extend operations_work_orders with new columns
-- ============================================================================
-- Make project_id optional (drop NOT NULL)
ALTER TABLE "operations_work_orders" ALTER COLUMN "project_id" DROP NOT NULL;

-- New fields
ALTER TABLE "operations_work_orders" ADD COLUMN IF NOT EXISTS "priority" TEXT DEFAULT 'NORMAL';
ALTER TABLE "operations_work_orders" ADD COLUMN IF NOT EXISTS "category_id" UUID;
ALTER TABLE "operations_work_orders" ADD COLUMN IF NOT EXISTS "department_id" UUID;
ALTER TABLE "operations_work_orders" ADD COLUMN IF NOT EXISTS "building_id" UUID;
ALTER TABLE "operations_work_orders" ADD COLUMN IF NOT EXISTS "floor" TEXT;
ALTER TABLE "operations_work_orders" ADD COLUMN IF NOT EXISTS "unit" TEXT;
ALTER TABLE "operations_work_orders" ADD COLUMN IF NOT EXISTS "reporter_name" TEXT;
ALTER TABLE "operations_work_orders" ADD COLUMN IF NOT EXISTS "reporter_phone" TEXT;
ALTER TABLE "operations_work_orders" ADD COLUMN IF NOT EXISTS "sla_deadline" TIMESTAMPTZ(6);
ALTER TABLE "operations_work_orders" ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMPTZ(6);
ALTER TABLE "operations_work_orders" ADD COLUMN IF NOT EXISTS "transferred_from_id" UUID;
ALTER TABLE "operations_work_orders" ADD COLUMN IF NOT EXISTS "transfer_approved_by_id" UUID;

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS "idx_ops_wo_category"
  ON "operations_work_orders"("organization_id", "category_id");

CREATE INDEX IF NOT EXISTS "idx_ops_wo_building"
  ON "operations_work_orders"("organization_id", "building_id");

CREATE INDEX IF NOT EXISTS "idx_ops_wo_department"
  ON "operations_work_orders"("organization_id", "department_id");

CREATE INDEX IF NOT EXISTS "idx_ops_wo_priority"
  ON "operations_work_orders"("organization_id", "priority");

CREATE INDEX IF NOT EXISTS "idx_ops_wo_sla_deadline"
  ON "operations_work_orders"("organization_id", "sla_deadline");

-- Foreign keys for new columns
DO $$ BEGIN
  ALTER TABLE "operations_work_orders"
    ADD CONSTRAINT "fk_ops_wo_category"
    FOREIGN KEY ("category_id") REFERENCES "operations_call_categories"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "operations_work_orders"
    ADD CONSTRAINT "fk_ops_wo_department"
    FOREIGN KEY ("department_id") REFERENCES "operations_departments"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "operations_work_orders"
    ADD CONSTRAINT "fk_ops_wo_building"
    FOREIGN KEY ("building_id") REFERENCES "operations_buildings"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
