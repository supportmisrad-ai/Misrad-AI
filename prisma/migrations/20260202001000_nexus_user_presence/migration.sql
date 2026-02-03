-- Presence / Online status
-- Adds last_seen_at to nexus_users for TTL-based online calculation.

ALTER TABLE IF EXISTS nexus_users
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_nexus_users_last_seen_at
  ON nexus_users (last_seen_at);

-- Best-effort backfill: if legacy online=true, mark them as seen now.
UPDATE nexus_users
SET last_seen_at = COALESCE(last_seen_at, now())
WHERE online IS TRUE;
