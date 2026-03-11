-- ═══════════════════════════════════════════════════════════════════
-- Migration: Create Client Cycles Tables
-- Created: 2026-03-12
-- Description: Creates tables for client cycles (groups) with tasks and assets
-- ═══════════════════════════════════════════════════════════════════

-- Create ClientCycle table
CREATE TABLE IF NOT EXISTS "client_cycles" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'RECRUITING',
    "start_date" TIMESTAMP WITH TIME ZONE,
    "end_date" TIMESTAMP WITH TIME ZONE,
    "whatsapp_group_link" TEXT,
    "slack_channel_link" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_client_cycles_organization_id" ON "client_cycles"("organization_id");
CREATE INDEX IF NOT EXISTS "idx_client_cycles_status" ON "client_cycles"("status");
CREATE INDEX IF NOT EXISTS "idx_client_cycles_created_at" ON "client_cycles"("created_at");

-- Create CycleClient junction table
CREATE TABLE IF NOT EXISTS "cycle_clients" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "cycle_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "joined_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE("cycle_id", "client_id")
);

CREATE INDEX IF NOT EXISTS "idx_cycle_clients_cycle_id" ON "cycle_clients"("cycle_id");
CREATE INDEX IF NOT EXISTS "idx_cycle_clients_client_id" ON "cycle_clients"("client_id");

-- Create CycleTask table
CREATE TABLE IF NOT EXISTS "cycle_tasks" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "cycle_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "priority" VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    "due_date" TIMESTAMP WITH TIME ZONE,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_cycle_tasks_cycle_id" ON "cycle_tasks"("cycle_id");
CREATE INDEX IF NOT EXISTS "idx_cycle_tasks_status" ON "cycle_tasks"("status");
CREATE INDEX IF NOT EXISTS "idx_cycle_tasks_due_date" ON "cycle_tasks"("due_date");

-- Create CycleTaskCompletion table
CREATE TABLE IF NOT EXISTS "cycle_task_completions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "completed_by" TEXT NOT NULL,
    "completed_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE("task_id", "client_id")
);

CREATE INDEX IF NOT EXISTS "idx_cycle_task_completions_task_id" ON "cycle_task_completions"("task_id");
CREATE INDEX IF NOT EXISTS "idx_cycle_task_completions_client_id" ON "cycle_task_completions"("client_id");

-- Create CycleAsset table
CREATE TABLE IF NOT EXISTS "cycle_assets" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "cycle_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "category" VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    "file_url" TEXT NOT NULL,
    "file_type" VARCHAR(50) NOT NULL,
    "size_bytes" INTEGER,
    "uploaded_by" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_cycle_assets_cycle_id" ON "cycle_assets"("cycle_id");
CREATE INDEX IF NOT EXISTS "idx_cycle_assets_category" ON "cycle_assets"("category");
CREATE INDEX IF NOT EXISTS "idx_cycle_assets_uploaded_at" ON "cycle_assets"("uploaded_at");

-- Add foreign key constraints (if they don't exist)
DO $$
BEGIN
    -- FK for client_cycles -> organizations
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'client_cycles_organization_id_fkey'
    ) THEN
        ALTER TABLE "client_cycles" 
        ADD CONSTRAINT "client_cycles_organization_id_fkey" 
        FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;
    END IF;

    -- FK for cycle_clients -> client_cycles
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'cycle_clients_cycle_id_fkey'
    ) THEN
        ALTER TABLE "cycle_clients" 
        ADD CONSTRAINT "cycle_clients_cycle_id_fkey" 
        FOREIGN KEY ("cycle_id") REFERENCES "client_cycles"("id") ON DELETE CASCADE;
    END IF;

    -- FK for cycle_clients -> clients
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'cycle_clients_client_id_fkey'
    ) THEN
        ALTER TABLE "cycle_clients" 
        ADD CONSTRAINT "cycle_clients_client_id_fkey" 
        FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;
    END IF;

    -- FK for cycle_tasks -> client_cycles
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'cycle_tasks_cycle_id_fkey'
    ) THEN
        ALTER TABLE "cycle_tasks" 
        ADD CONSTRAINT "cycle_tasks_cycle_id_fkey" 
        FOREIGN KEY ("cycle_id") REFERENCES "client_cycles"("id") ON DELETE CASCADE;
    END IF;

    -- FK for cycle_task_completions -> cycle_tasks
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'cycle_task_completions_task_id_fkey'
    ) THEN
        ALTER TABLE "cycle_task_completions" 
        ADD CONSTRAINT "cycle_task_completions_task_id_fkey" 
        FOREIGN KEY ("task_id") REFERENCES "cycle_tasks"("id") ON DELETE CASCADE;
    END IF;

    -- FK for cycle_task_completions -> clients
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'cycle_task_completions_client_id_fkey'
    ) THEN
        ALTER TABLE "cycle_task_completions" 
        ADD CONSTRAINT "cycle_task_completions_client_id_fkey" 
        FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;
    END IF;

    -- FK for cycle_assets -> client_cycles
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'cycle_assets_cycle_id_fkey'
    ) THEN
        ALTER TABLE "cycle_assets" 
        ADD CONSTRAINT "cycle_assets_cycle_id_fkey" 
        FOREIGN KEY ("cycle_id") REFERENCES "client_cycles"("id") ON DELETE CASCADE;
    END IF;
END $$;
