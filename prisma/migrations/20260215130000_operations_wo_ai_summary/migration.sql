-- Add ai_summary column to operations_work_orders
-- Safe idempotent migration

ALTER TABLE "operations_work_orders" ADD COLUMN IF NOT EXISTS "ai_summary" TEXT;
