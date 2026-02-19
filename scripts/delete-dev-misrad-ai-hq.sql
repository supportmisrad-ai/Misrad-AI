-- Delete Misrad AI HQ from DEV only
-- Safe for a freshly reset DEV DB that only contains restored superadmin data.

BEGIN;

-- IDs from restore-superadmin.sql
-- Misrad AI HQ
DO $$
DECLARE
  hq_org_id uuid := '185e7212-23fc-4170-98ca-be3213424fc7';
  fallback_org_id uuid := 'f7560b9e-955b-44ad-bb19-7855c4e8a610'; -- Test THE EMPIRE
BEGIN
  -- Point superadmin primary org to a remaining org to avoid broken FK
  UPDATE organization_users
    SET organization_id = fallback_org_id,
        updated_at = now()
    WHERE organization_id = hq_org_id;

  -- Delete rows that depend on HQ org
  DELETE FROM nexus_users WHERE organization_id = hq_org_id;
  DELETE FROM organization_settings WHERE organization_id = hq_org_id;
  DELETE FROM profiles WHERE organization_id = hq_org_id;

  -- Delete the org itself
  DELETE FROM organizations WHERE id = hq_org_id;
END $$;

COMMIT;
