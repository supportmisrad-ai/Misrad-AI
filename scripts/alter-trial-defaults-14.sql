-- DEPRECATED (2026-02-10)
-- Trial duration is now 7 days. This script is intentionally disabled.
-- If you need to alter defaults, create a new script explicitly for 7 days.

-- Align DB defaults: trial_days = 14
-- Safe: changes only column defaults (does not rewrite existing rows)

-- BEGIN;

-- ALTER TABLE organizations
--   ALTER COLUMN trial_days SET DEFAULT 14;

-- ALTER TABLE social_team_members
--   ALTER COLUMN trial_days SET DEFAULT 14;

-- COMMIT;
