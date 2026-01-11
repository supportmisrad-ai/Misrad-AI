-- Backfill system_leads.organization_id using assigned_agent_id
-- Strategy: try to derive org from social_users (direct) and then from social_team_members (via user_id)

-- 1) If assigned_agent_id matches a social user id, use that org
UPDATE system_leads sl
SET organization_id = su.organization_id
FROM social_users su
WHERE sl.organization_id IS NULL
  AND sl.assigned_agent_id IS NOT NULL
  AND su.id = sl.assigned_agent_id
  AND su.organization_id IS NOT NULL;

-- 2) Otherwise, if assigned_agent_id matches a team member user_id, use that org
UPDATE system_leads sl
SET organization_id = tm.organization_id
FROM social_team_members tm
WHERE sl.organization_id IS NULL
  AND sl.assigned_agent_id IS NOT NULL
  AND tm.user_id = sl.assigned_agent_id
  AND tm.organization_id IS NOT NULL;

-- 3) Sanity check (should be 0 before you enforce NOT NULL)
SELECT COUNT(*) AS remaining_null_organization_id
FROM system_leads
WHERE organization_id IS NULL;
