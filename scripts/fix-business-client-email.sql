-- ========================================
-- FIX: Update BusinessClient email from placeholder to real email
-- ========================================
-- Problem: All organizations linked to BusinessClient with placeholder email
-- Current: org-185e7212-23fc-4170-98ca-be3213424fc7@placeholder.local
-- Should be: itsikdahan1@gmail.com

-- Step 1: Check current BusinessClient details
SELECT 
  id,
  company_name,
  primary_email,
  status,
  lifecycle_stage,
  created_at
FROM business_clients
WHERE id = '31e94b9b-069f-41b8-a258-bfb64e46e9e3';

-- Step 2: Update BusinessClient email to real email
UPDATE business_clients
SET 
  primary_email = 'itsikdahan1@gmail.com',
  updated_at = NOW()
WHERE id = '31e94b9b-069f-41b8-a258-bfb64e46e9e3';

-- Step 3: Verify the fix
SELECT 
  bc.id,
  bc.company_name,
  bc.primary_email,
  COUNT(o.id) AS organizations_count,
  STRING_AGG(o.name, ', ' ORDER BY o.created_at) AS org_names
FROM business_clients bc
LEFT JOIN organizations o ON o.client_id = bc.id AND o.deleted_at IS NULL
WHERE bc.id = '31e94b9b-069f-41b8-a258-bfb64e46e9e3'
GROUP BY bc.id, bc.company_name, bc.primary_email;
