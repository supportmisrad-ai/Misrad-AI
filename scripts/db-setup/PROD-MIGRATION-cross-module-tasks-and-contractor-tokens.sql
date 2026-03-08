-- ════════════════════════════════════════════════════════════════════════════
-- PROD MIGRATION: Cross-Module Tasks + Contractor Tokens
-- Created: 2026-03-08
-- Run with: node scripts/run-sql.js scripts/db-setup/PROD-MIGRATION-cross-module-tasks-and-contractor-tokens.sql
-- Requires: .env.prod_backup with DATABASE_URL + DIRECT_URL
-- ════════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────────────
-- Part 1: Cross-Module Tasks Architecture
-- ──────────────────────────────────────────────────────────────────────────────

-- Add module column to nexus_tasks for cross-module task support
-- Default 'nexus' for all existing tasks
ALTER TABLE nexus_tasks ADD COLUMN IF NOT EXISTS module text NOT NULL DEFAULT 'nexus';

-- Index for filtering tasks by module
CREATE INDEX IF NOT EXISTS idx_nexus_tasks_module ON nexus_tasks(module);

-- Composite index for org + module filtering (performance optimization)
CREATE INDEX IF NOT EXISTS idx_nexus_tasks_org_module ON nexus_tasks(organization_id, module);

-- ──────────────────────────────────────────────────────────────────────────────
-- Part 2: Operations Contractor Portal Tokens
-- ──────────────────────────────────────────────────────────────────────────────

-- Create contractor tokens table for secure temporary access
CREATE TABLE IF NOT EXISTS operations_contractor_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  token_hash text NOT NULL,
  contractor_label text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_contractor_tokens_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Index for fast token lookup (by hash)
CREATE INDEX IF NOT EXISTS idx_operations_contractor_tokens_hash ON operations_contractor_tokens(token_hash);

-- Index for expiration cleanup queries
CREATE INDEX IF NOT EXISTS idx_operations_contractor_tokens_expires ON operations_contractor_tokens(expires_at);

-- Index for organization queries
CREATE INDEX IF NOT EXISTS idx_operations_contractor_tokens_org ON operations_contractor_tokens(organization_id);

-- ════════════════════════════════════════════════════════════════════════════
-- Migration Complete
-- ════════════════════════════════════════════════════════════════════════════
