BEGIN;

-- Preconditions:
-- 1) Run scripts/nexus-add-organization-id.sql (adds columns + initial FKs)
-- 2) Run scripts/backfill-nexus-organization-id.sql (fills any NULLs)
-- 3) Verify remaining_null_org = 0 for all tables

-- 1) Enforce NOT NULL
ALTER TABLE nexus_clients
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE nexus_tasks
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE nexus_time_entries
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE nexus_leave_requests
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE nexus_team_events
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE nexus_event_attendance
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE nexus_employee_invitation_links
  ALTER COLUMN organization_id SET NOT NULL;

-- 2) Replace FKs to match NOT NULL semantics (RESTRICT on delete)
ALTER TABLE nexus_clients
  DROP CONSTRAINT IF EXISTS nexus_clients_organization_id_fkey;
ALTER TABLE nexus_clients
  ADD CONSTRAINT nexus_clients_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES organizations(id)
  ON DELETE RESTRICT;

ALTER TABLE nexus_tasks
  DROP CONSTRAINT IF EXISTS nexus_tasks_organization_id_fkey;
ALTER TABLE nexus_tasks
  ADD CONSTRAINT nexus_tasks_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES organizations(id)
  ON DELETE RESTRICT;

ALTER TABLE nexus_time_entries
  DROP CONSTRAINT IF EXISTS nexus_time_entries_organization_id_fkey;
ALTER TABLE nexus_time_entries
  DROP CONSTRAINT IF EXISTS nexus_time_entries_organization_id_fkey1;
ALTER TABLE nexus_time_entries
  ADD CONSTRAINT nexus_time_entries_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES organizations(id)
  ON DELETE RESTRICT;

ALTER TABLE nexus_leave_requests
  DROP CONSTRAINT IF EXISTS nexus_leave_requests_organization_id_fkey;
ALTER TABLE nexus_leave_requests
  ADD CONSTRAINT nexus_leave_requests_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES organizations(id)
  ON DELETE RESTRICT;

ALTER TABLE nexus_team_events
  DROP CONSTRAINT IF EXISTS nexus_team_events_organization_id_fkey;
ALTER TABLE nexus_team_events
  ADD CONSTRAINT nexus_team_events_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES organizations(id)
  ON DELETE RESTRICT;

ALTER TABLE nexus_event_attendance
  DROP CONSTRAINT IF EXISTS nexus_event_attendance_organization_id_fkey;
ALTER TABLE nexus_event_attendance
  ADD CONSTRAINT nexus_event_attendance_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES organizations(id)
  ON DELETE RESTRICT;

ALTER TABLE nexus_employee_invitation_links
  DROP CONSTRAINT IF EXISTS nexus_employee_invitation_links_organization_id_fkey;
ALTER TABLE nexus_employee_invitation_links
  ADD CONSTRAINT nexus_employee_invitation_links_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES organizations(id)
  ON DELETE RESTRICT;

COMMIT;
