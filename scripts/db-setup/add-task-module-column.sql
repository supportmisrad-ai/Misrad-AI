-- Add module column to nexus_tasks for cross-module task support
-- Default 'nexus' for all existing tasks

ALTER TABLE nexus_tasks ADD COLUMN IF NOT EXISTS module text NOT NULL DEFAULT 'nexus';

-- Index for filtering tasks by module
CREATE INDEX IF NOT EXISTS idx_nexus_tasks_module ON nexus_tasks(module);

-- Composite index for org + module filtering
CREATE INDEX IF NOT EXISTS idx_nexus_tasks_org_module ON nexus_tasks(organization_id, module);
