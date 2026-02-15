-- Comprehensive migration: create ALL missing operations tables and columns
-- Safe idempotent migration (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
-- Generated 2026-02-15

-- ============================================================================
-- 1. operations_vehicles
-- ============================================================================
CREATE TABLE IF NOT EXISTS "operations_vehicles" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_vehicles_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_operations_vehicles_org"
  ON "operations_vehicles"("organization_id");

-- ============================================================================
-- 2. operations_technician_vehicle_assignments
-- ============================================================================
CREATE TABLE IF NOT EXISTS "operations_technician_vehicle_assignments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "technician_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(6),

    CONSTRAINT "operations_technician_vehicle_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_ops_tech_vehicle_assign_org"
  ON "operations_technician_vehicle_assignments"("organization_id");

CREATE INDEX IF NOT EXISTS "idx_ops_tech_vehicle_assign_active"
  ON "operations_technician_vehicle_assignments"("organization_id", "technician_id", "active");

-- ============================================================================
-- 3. operations_locations
-- ============================================================================
CREATE TABLE IF NOT EXISTS "operations_locations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_locations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_operations_locations_org"
  ON "operations_locations"("organization_id");

CREATE UNIQUE INDEX IF NOT EXISTS "uq_operations_locations_org_name"
  ON "operations_locations"("organization_id", lower("name"));

-- ============================================================================
-- 4. operations_stock_holders
-- ============================================================================
CREATE TABLE IF NOT EXISTS "operations_stock_holders" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "location_id" UUID,
    "vehicle_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_stock_holders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_operations_stock_holders_org"
  ON "operations_stock_holders"("organization_id");

CREATE INDEX IF NOT EXISTS "idx_operations_stock_holders_vehicle"
  ON "operations_stock_holders"("organization_id", "vehicle_id");

CREATE INDEX IF NOT EXISTS "idx_operations_stock_holders_location"
  ON "operations_stock_holders"("organization_id", "location_id");

-- ============================================================================
-- 5. operations_stock_balances
-- ============================================================================
CREATE TABLE IF NOT EXISTS "operations_stock_balances" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "holder_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "on_hand" NUMERIC NOT NULL DEFAULT 0,
    "min_level" NUMERIC NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_stock_balances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_operations_stock_balances_org_holder_item"
  ON "operations_stock_balances"("organization_id", "holder_id", "item_id");

CREATE INDEX IF NOT EXISTS "idx_operations_stock_balances_org"
  ON "operations_stock_balances"("organization_id");

-- ============================================================================
-- 6. operations_stock_movements
-- ============================================================================
CREATE TABLE IF NOT EXISTS "operations_stock_movements" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "work_order_id" UUID,
    "qty" NUMERIC NOT NULL,
    "direction" TEXT NOT NULL,
    "created_by_type" TEXT NOT NULL DEFAULT 'INTERNAL',
    "from_holder_id" UUID,
    "to_holder_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_stock_movements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_operations_stock_movements_org"
  ON "operations_stock_movements"("organization_id");

CREATE INDEX IF NOT EXISTS "idx_operations_stock_movements_wo"
  ON "operations_stock_movements"("organization_id", "work_order_id");

-- ============================================================================
-- 7. operations_work_order_attachments
-- ============================================================================
CREATE TABLE IF NOT EXISTS "operations_work_order_attachments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "storage_bucket" TEXT NOT NULL DEFAULT 'operations-files',
    "storage_path" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mime_type" TEXT,
    "created_by_type" TEXT NOT NULL DEFAULT 'INTERNAL',
    "created_by_ref" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_work_order_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_ops_wo_attachments_org"
  ON "operations_work_order_attachments"("organization_id");

CREATE INDEX IF NOT EXISTS "idx_ops_wo_attachments_wo"
  ON "operations_work_order_attachments"("organization_id", "work_order_id");

-- ============================================================================
-- 8. operations_work_order_checkins
-- ============================================================================
CREATE TABLE IF NOT EXISTS "operations_work_order_checkins" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "created_by_type" TEXT NOT NULL DEFAULT 'INTERNAL',
    "created_by_ref" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_work_order_checkins_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_ops_wo_checkins_org"
  ON "operations_work_order_checkins"("organization_id");

CREATE INDEX IF NOT EXISTS "idx_ops_wo_checkins_wo"
  ON "operations_work_order_checkins"("organization_id", "work_order_id");

-- ============================================================================
-- 9. operations_work_order_types
-- ============================================================================
CREATE TABLE IF NOT EXISTS "operations_work_order_types" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_work_order_types_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_operations_work_order_types_org"
  ON "operations_work_order_types"("organization_id");

CREATE UNIQUE INDEX IF NOT EXISTS "uq_operations_work_order_types_org_name"
  ON "operations_work_order_types"("organization_id", lower("name"));

-- ============================================================================
-- 10. operations_contractor_tokens
-- ============================================================================
CREATE TABLE IF NOT EXISTS "operations_contractor_tokens" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "contractor_label" TEXT,
    "expires_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_contractor_tokens_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_ops_contractor_tokens_org"
  ON "operations_contractor_tokens"("organization_id");

CREATE INDEX IF NOT EXISTS "idx_ops_contractor_tokens_hash"
  ON "operations_contractor_tokens"("token_hash");

-- ============================================================================
-- 11. Missing columns on operations_work_orders
-- ============================================================================
ALTER TABLE "operations_work_orders" ADD COLUMN IF NOT EXISTS "installation_lat" DOUBLE PRECISION;
ALTER TABLE "operations_work_orders" ADD COLUMN IF NOT EXISTS "installation_lng" DOUBLE PRECISION;
ALTER TABLE "operations_work_orders" ADD COLUMN IF NOT EXISTS "stock_source_holder_id" UUID;
ALTER TABLE "operations_work_orders" ADD COLUMN IF NOT EXISTS "completion_signature_url" TEXT;

-- ============================================================================
-- 12. Foreign keys (best-effort, skip if already exist or ref missing)
-- ============================================================================
DO $$ BEGIN
  ALTER TABLE "operations_technician_vehicle_assignments"
    ADD CONSTRAINT "fk_ops_tva_vehicle"
    FOREIGN KEY ("vehicle_id") REFERENCES "operations_vehicles"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "operations_technician_vehicle_assignments"
    ADD CONSTRAINT "fk_ops_tva_technician"
    FOREIGN KEY ("technician_id") REFERENCES "profiles"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "operations_stock_holders"
    ADD CONSTRAINT "fk_ops_sh_location"
    FOREIGN KEY ("location_id") REFERENCES "operations_locations"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "operations_stock_holders"
    ADD CONSTRAINT "fk_ops_sh_vehicle"
    FOREIGN KEY ("vehicle_id") REFERENCES "operations_vehicles"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "operations_stock_balances"
    ADD CONSTRAINT "fk_ops_sb_holder"
    FOREIGN KEY ("holder_id") REFERENCES "operations_stock_holders"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "operations_stock_balances"
    ADD CONSTRAINT "fk_ops_sb_item"
    FOREIGN KEY ("item_id") REFERENCES "operations_items"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "operations_stock_movements"
    ADD CONSTRAINT "fk_ops_sm_item"
    FOREIGN KEY ("item_id") REFERENCES "operations_items"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "operations_stock_movements"
    ADD CONSTRAINT "fk_ops_sm_work_order"
    FOREIGN KEY ("work_order_id") REFERENCES "operations_work_orders"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "operations_work_order_attachments"
    ADD CONSTRAINT "fk_ops_woa_work_order"
    FOREIGN KEY ("work_order_id") REFERENCES "operations_work_orders"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "operations_work_order_checkins"
    ADD CONSTRAINT "fk_ops_woc_work_order"
    FOREIGN KEY ("work_order_id") REFERENCES "operations_work_orders"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "operations_work_orders"
    ADD CONSTRAINT "fk_ops_wo_stock_source"
    FOREIGN KEY ("stock_source_holder_id") REFERENCES "operations_stock_holders"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
