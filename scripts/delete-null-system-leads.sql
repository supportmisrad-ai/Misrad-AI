-- Since this system is new, remove any test leads that violate tenant isolation.

DELETE FROM system_leads
WHERE organization_id IS NULL;

SELECT COUNT(*) AS remaining_null_organization_id
FROM system_leads
WHERE organization_id IS NULL;
