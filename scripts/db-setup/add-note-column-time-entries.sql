-- Migration: Add 'note' column to nexus_time_entries
-- Purpose: Fix semantic bug where punchIn/punchOut stored notes in void_reason column.
--          void_reason is for voiding entries; note is for general clock-in/out notes.
-- Safe: additive-only, no data loss

-- Step 1: Add the note column (nullable, no default)
ALTER TABLE nexus_time_entries
  ADD COLUMN IF NOT EXISTS note TEXT;

-- Step 2: Migrate existing data — move non-void notes from void_reason to note
-- Only migrate rows where void_reason has a value but the entry was NOT voided
UPDATE nexus_time_entries
SET note = void_reason,
    void_reason = NULL
WHERE void_reason IS NOT NULL
  AND voided_at IS NULL
  AND voided_by IS NULL;

-- Verify
SELECT
  COUNT(*) FILTER (WHERE note IS NOT NULL) AS rows_with_note,
  COUNT(*) FILTER (WHERE void_reason IS NOT NULL AND voided_at IS NULL) AS remaining_misplaced
FROM nexus_time_entries;
