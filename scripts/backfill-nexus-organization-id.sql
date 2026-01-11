-- Backfill nexus_* organization_id deterministically.
 -- Goal: set organization_id ONLY when it can be derived unambiguously, to avoid silent cross-org leakage.
 --
 -- Derivation sources:
 -- - social_users.organization_id via:
 --   - nexus_time_entries.user_id
 --   - nexus_tasks.creator_id
 --   - nexus_tasks.assignee_id
 -- - nexus_tasks.client_id -> nexus_clients.organization_id (after clients are backfilled from tasks)

-- Fallback:
-- After deterministic attempts, assign any remaining NULL organization_id to __PRIMARY_ORG_ID__.
-- Replace __PRIMARY_ORG_ID__ with your organizations.id UUID.

BEGIN;

-- --- Pre-flight: how many NULL orgs exist right now?
SELECT 'nexus_clients' AS table, COUNT(*) AS null_org
FROM nexus_clients
WHERE organization_id IS NULL
UNION ALL
SELECT 'nexus_tasks' AS table, COUNT(*) AS null_org
FROM nexus_tasks
WHERE organization_id IS NULL
UNION ALL
SELECT 'nexus_time_entries' AS table, COUNT(*) AS null_org
FROM nexus_time_entries
WHERE organization_id IS NULL
UNION ALL
SELECT 'nexus_leave_requests' AS table, COUNT(*) AS null_org
FROM nexus_leave_requests
WHERE organization_id IS NULL
UNION ALL
SELECT 'nexus_team_events' AS table, COUNT(*) AS null_org
FROM nexus_team_events
WHERE organization_id IS NULL
UNION ALL
SELECT 'nexus_event_attendance' AS table, COUNT(*) AS null_org
FROM nexus_event_attendance
WHERE organization_id IS NULL
UNION ALL
SELECT 'nexus_employee_invitation_links' AS table, COUNT(*) AS null_org
FROM nexus_employee_invitation_links
WHERE organization_id IS NULL;

-- 1) nexus_time_entries: infer org from social_users.id = nexus_time_entries.user_id
UPDATE nexus_time_entries te
SET organization_id = su.organization_id
FROM social_users su
WHERE te.organization_id IS NULL
  AND su.id::text = te.user_id::text
  AND su.organization_id IS NOT NULL;
 
 -- 2) nexus_tasks: infer org from creator first
 UPDATE nexus_tasks t
 SET organization_id = su.organization_id
 FROM social_users su
 WHERE t.organization_id IS NULL
   AND t.creator_id IS NOT NULL
   AND su.id::text = t.creator_id::text
   AND su.organization_id IS NOT NULL;

 -- 3) nexus_tasks: infer org from assignee (if still NULL)
 UPDATE nexus_tasks t
 SET organization_id = su.organization_id
 FROM social_users su
 WHERE t.organization_id IS NULL
   AND t.assignee_id IS NOT NULL
   AND su.id::text = t.assignee_id::text
   AND su.organization_id IS NOT NULL;

 -- 4) nexus_clients: infer org from tasks that reference the client.
-- Only set when there's exactly 1 distinct org across tasks for that client.
WITH client_org_candidates AS (
  SELECT
    t.client_id,
    COUNT(DISTINCT t.organization_id) AS org_count,
    MIN(t.organization_id::text) AS inferred_org
  FROM nexus_tasks t
  WHERE t.client_id IS NOT NULL
    AND t.organization_id IS NOT NULL
  GROUP BY t.client_id
)
UPDATE nexus_clients c
SET organization_id = cc.inferred_org::uuid
FROM client_org_candidates cc
WHERE c.organization_id IS NULL
  AND cc.client_id::text = c.id::text
  AND cc.org_count = 1;
 
 -- 5) nexus_tasks: infer org from client (if still NULL, and client has org)
 UPDATE nexus_tasks t
 SET organization_id = c.organization_id
 FROM nexus_clients c
 WHERE t.organization_id IS NULL
   AND t.client_id IS NOT NULL
   AND c.id::text = t.client_id::text
   AND c.organization_id IS NOT NULL;

 -- 6) nexus_leave_requests: infer org from employee_id social_users.id
 UPDATE nexus_leave_requests lr
 SET organization_id = su.organization_id
 FROM social_users su
 WHERE lr.organization_id IS NULL
   AND su.id::text = lr.employee_id::text
   AND su.organization_id IS NOT NULL;

 -- 7) nexus_team_events: infer org from organizer_id social_users.id
 UPDATE nexus_team_events ev
 SET organization_id = su.organization_id
 FROM social_users su
 WHERE ev.organization_id IS NULL
   AND ev.organizer_id IS NOT NULL
   AND su.id::text = ev.organizer_id::text
   AND su.organization_id IS NOT NULL;

 -- 8) nexus_event_attendance: infer org from user_id social_users.id
 UPDATE nexus_event_attendance ea
 SET organization_id = su.organization_id
 FROM social_users su
 WHERE ea.organization_id IS NULL
   AND su.id::text = ea.user_id::text
   AND su.organization_id IS NOT NULL;

 -- 9) nexus_employee_invitation_links: infer org from created_by social_users.id
 UPDATE nexus_employee_invitation_links il
 SET organization_id = su.organization_id
 FROM social_users su
 WHERE il.organization_id IS NULL
   AND il.created_by IS NOT NULL
   AND su.id::text = il.created_by::text
   AND su.organization_id IS NOT NULL;

 -- 10) Fallback: assign remaining NULL orgs to primary org id
 UPDATE nexus_clients
 SET organization_id = 'c80eb4b1-9b4e-40a6-94d3-0fa8d9b641a6'::uuid
 WHERE organization_id IS NULL;
 
 UPDATE nexus_tasks
 SET organization_id = 'c80eb4b1-9b4e-40a6-94d3-0fa8d9b641a6'::uuid
 WHERE organization_id IS NULL;
 
 UPDATE nexus_time_entries
 SET organization_id = 'c80eb4b1-9b4e-40a6-94d3-0fa8d9b641a6'::uuid
 WHERE organization_id IS NULL;
 
 UPDATE nexus_leave_requests
 SET organization_id = 'c80eb4b1-9b4e-40a6-94d3-0fa8d9b641a6'::uuid
 WHERE organization_id IS NULL;
 
 UPDATE nexus_team_events
 SET organization_id = 'c80eb4b1-9b4e-40a6-94d3-0fa8d9b641a6'::uuid
 WHERE organization_id IS NULL;
 
 UPDATE nexus_event_attendance
 SET organization_id = 'c80eb4b1-9b4e-40a6-94d3-0fa8d9b641a6'::uuid
 WHERE organization_id IS NULL;
 
 UPDATE nexus_employee_invitation_links
 SET organization_id = 'c80eb4b1-9b4e-40a6-94d3-0fa8d9b641a6'::uuid
 WHERE organization_id IS NULL;

 -- --- Sanity checks: remaining NULL orgs
 SELECT 'nexus_clients' AS table, COUNT(*) AS remaining_null_org
 FROM nexus_clients
 WHERE organization_id IS NULL
 UNION ALL
 SELECT 'nexus_tasks' AS table, COUNT(*) AS remaining_null_org
 FROM nexus_tasks
 WHERE organization_id IS NULL
 UNION ALL
 SELECT 'nexus_time_entries' AS table, COUNT(*) AS remaining_null_org
 FROM nexus_time_entries
 WHERE organization_id IS NULL
 UNION ALL
 SELECT 'nexus_leave_requests' AS table, COUNT(*) AS remaining_null_org
 FROM nexus_leave_requests
 WHERE organization_id IS NULL
 UNION ALL
 SELECT 'nexus_team_events' AS table, COUNT(*) AS remaining_null_org
 FROM nexus_team_events
 WHERE organization_id IS NULL
 UNION ALL
 SELECT 'nexus_event_attendance' AS table, COUNT(*) AS remaining_null_org
 FROM nexus_event_attendance
 WHERE organization_id IS NULL
 UNION ALL
 SELECT 'nexus_employee_invitation_links' AS table, COUNT(*) AS remaining_null_org
 FROM nexus_employee_invitation_links
 WHERE organization_id IS NULL;

 -- --- Conflict checks: clients referenced by tasks from multiple orgs (must be resolved manually before NOT NULL)
 WITH client_org_candidates AS (
   SELECT
     t.client_id,
     COUNT(DISTINCT t.organization_id) AS org_count
   FROM nexus_tasks t
   WHERE t.client_id IS NOT NULL
     AND t.organization_id IS NOT NULL
   GROUP BY t.client_id
 )
 SELECT COUNT(*) AS clients_with_multiple_orgs
 FROM client_org_candidates
 WHERE org_count > 1;
 
 COMMIT;
