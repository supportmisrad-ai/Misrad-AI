ALTER TABLE IF EXISTS nexus_clients
  ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE IF EXISTS nexus_tasks
  ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE IF EXISTS nexus_time_entries
  ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE IF EXISTS nexus_leave_requests
  ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE IF EXISTS nexus_team_events
  ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE IF EXISTS nexus_event_attendance
  ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE IF EXISTS nexus_employee_invitation_links
  ADD COLUMN IF NOT EXISTS organization_id uuid;

CREATE INDEX IF NOT EXISTS idx_nexus_clients_organization_id
  ON nexus_clients (organization_id);

CREATE INDEX IF NOT EXISTS idx_nexus_tasks_organization_id
  ON nexus_tasks (organization_id);

CREATE INDEX IF NOT EXISTS idx_nexus_time_entries_organization_id
  ON nexus_time_entries (organization_id);

CREATE INDEX IF NOT EXISTS idx_nexus_leave_requests_organization_id
  ON nexus_leave_requests (organization_id);

CREATE INDEX IF NOT EXISTS idx_nexus_team_events_organization_id
  ON nexus_team_events (organization_id);

CREATE INDEX IF NOT EXISTS idx_nexus_event_attendance_organization_id
  ON nexus_event_attendance (organization_id);

CREATE INDEX IF NOT EXISTS idx_nexus_employee_invitation_links_organization_id
  ON nexus_employee_invitation_links (organization_id);

ALTER TABLE nexus_clients
  DROP CONSTRAINT IF EXISTS nexus_clients_organization_id_fkey;
ALTER TABLE nexus_clients
  ADD CONSTRAINT nexus_clients_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES organizations(id)
  ON DELETE SET NULL;

ALTER TABLE nexus_tasks
  DROP CONSTRAINT IF EXISTS nexus_tasks_organization_id_fkey;
ALTER TABLE nexus_tasks
  ADD CONSTRAINT nexus_tasks_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES organizations(id)
  ON DELETE SET NULL;

ALTER TABLE nexus_time_entries
  DROP CONSTRAINT IF EXISTS nexus_time_entries_organization_id_fkey;
ALTER TABLE nexus_time_entries
  DROP CONSTRAINT IF EXISTS nexus_time_entries_organization_id_fkey1;
ALTER TABLE nexus_time_entries
  ADD CONSTRAINT nexus_time_entries_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES organizations(id)
  ON DELETE SET NULL;

ALTER TABLE nexus_leave_requests
  DROP CONSTRAINT IF EXISTS nexus_leave_requests_organization_id_fkey;
ALTER TABLE nexus_leave_requests
  ADD CONSTRAINT nexus_leave_requests_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES organizations(id)
  ON DELETE SET NULL;

ALTER TABLE nexus_team_events
  DROP CONSTRAINT IF EXISTS nexus_team_events_organization_id_fkey;
ALTER TABLE nexus_team_events
  ADD CONSTRAINT nexus_team_events_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES organizations(id)
  ON DELETE SET NULL;

ALTER TABLE nexus_event_attendance
  DROP CONSTRAINT IF EXISTS nexus_event_attendance_organization_id_fkey;
ALTER TABLE nexus_event_attendance
  ADD CONSTRAINT nexus_event_attendance_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES organizations(id)
  ON DELETE SET NULL;

ALTER TABLE nexus_employee_invitation_links
  DROP CONSTRAINT IF EXISTS nexus_employee_invitation_links_organization_id_fkey;
ALTER TABLE nexus_employee_invitation_links
  ADD CONSTRAINT nexus_employee_invitation_links_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES organizations(id)
  ON DELETE SET NULL;
