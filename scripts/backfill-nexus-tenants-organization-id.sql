-- One-time backfill: link nexus_tenants.organization_id to organizations.id
--
-- Rules (in order):
-- 1) If tenant.subdomain matches organizations.slug (case-insensitive) and exactly 1 org matches => link
-- 2) Else if tenant.owner_email matches a social_users.email (case-insensitive) and that user is the organizations.owner_id => link (only when unique)
--
-- Safety principles:
-- - NEVER overwrite an existing organization_id
-- - Only set organization_id when the mapping is unambiguous
-- - Provide reports for anything unresolved/ambiguous

BEGIN;

-- Preflight
SELECT
  COUNT(*) AS total_tenants,
  COUNT(*) FILTER (WHERE organization_id IS NULL) AS tenants_missing_org
FROM nexus_tenants;

-- 1) subdomain => organizations.slug (unique match)
WITH slug_matches AS (
  SELECT
    t.id AS tenant_id,
    MIN(o.id)::uuid AS org_id,
    COUNT(*) AS org_count
  FROM nexus_tenants t
  JOIN organizations o
    ON lower(o.slug) = lower(t.subdomain)
  WHERE t.organization_id IS NULL
    AND t.subdomain IS NOT NULL
    AND length(trim(t.subdomain)) > 0
    AND o.slug IS NOT NULL
    AND length(trim(o.slug)) > 0
  GROUP BY t.id
)
UPDATE nexus_tenants t
SET organization_id = sm.org_id
FROM slug_matches sm
WHERE t.id = sm.tenant_id
  AND sm.org_count = 1
  AND t.organization_id IS NULL;

-- 2) owner_email => social_users.email => organizations.owner_id (unique match)
WITH owner_matches AS (
  SELECT
    t.id AS tenant_id,
    MIN(o.id)::uuid AS org_id,
    COUNT(*) AS org_count
  FROM nexus_tenants t
  JOIN social_users su
    ON lower(su.email) = lower(t.owner_email)
  JOIN organizations o
    ON o.owner_id::text = su.id::text
  WHERE t.organization_id IS NULL
    AND t.owner_email IS NOT NULL
    AND length(trim(t.owner_email)) > 0
  GROUP BY t.id
)
UPDATE nexus_tenants t
SET organization_id = om.org_id
FROM owner_matches om
WHERE t.id = om.tenant_id
  AND om.org_count = 1
  AND t.organization_id IS NULL;

-- Report: unresolved tenants
SELECT
  t.id,
  t.subdomain,
  t.owner_email,
  t.status,
  t.created_at
FROM nexus_tenants t
WHERE t.organization_id IS NULL
ORDER BY t.created_at NULLS LAST;

-- Report: ambiguous slug matches
WITH slug_ambiguous AS (
  SELECT
    t.id AS tenant_id,
    t.subdomain,
    COUNT(*) AS org_count
  FROM nexus_tenants t
  JOIN organizations o
    ON lower(o.slug) = lower(t.subdomain)
  WHERE t.organization_id IS NULL
    AND t.subdomain IS NOT NULL
    AND length(trim(t.subdomain)) > 0
    AND o.slug IS NOT NULL
    AND length(trim(o.slug)) > 0
  GROUP BY t.id, t.subdomain
)
SELECT *
FROM slug_ambiguous
WHERE org_count > 1
ORDER BY org_count DESC;

-- Report: ambiguous owner email matches
WITH owner_ambiguous AS (
  SELECT
    t.id AS tenant_id,
    t.owner_email,
    COUNT(*) AS org_count
  FROM nexus_tenants t
  JOIN social_users su
    ON lower(su.email) = lower(t.owner_email)
  JOIN organizations o
    ON o.owner_id::text = su.id::text
  WHERE t.organization_id IS NULL
    AND t.owner_email IS NOT NULL
    AND length(trim(t.owner_email)) > 0
  GROUP BY t.id, t.owner_email
)
SELECT *
FROM owner_ambiguous
WHERE org_count > 1
ORDER BY org_count DESC;

-- Postflight
SELECT
  COUNT(*) FILTER (WHERE organization_id IS NULL) AS remaining_null_org,
  COUNT(*) FILTER (WHERE organization_id IS NOT NULL) AS linked
FROM nexus_tenants;

COMMIT;
