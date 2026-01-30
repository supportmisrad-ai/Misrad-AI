-- Sanity check: count remaining NULL organization_id values in Nexus tables

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
WHERE organization_id IS NULL;
