-- Align DB defaults: trial_days = 14
-- Safe: changes only column defaults (does not rewrite existing rows)

BEGIN;

ALTER TABLE organizations
  ALTER COLUMN trial_days SET DEFAULT 14;

ALTER TABLE social_team_members
  ALTER COLUMN trial_days SET DEFAULT 14;

COMMIT;
