-- Safe migration: Add deleted_at column to organizations table for soft-delete support.
-- Non-destructive: only adds a nullable column, no data loss possible.

ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ(6);
