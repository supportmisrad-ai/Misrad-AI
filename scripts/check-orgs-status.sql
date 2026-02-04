-- Quick check: what's in the organizations table?

-- 1. Count total organizations
SELECT COUNT(*) as total_orgs FROM organizations;

-- 2. Show all organizations with basic info
SELECT 
  id,
  name,
  slug,
  subscription_status,
  subscription_plan,
  trial_days,
  created_at
FROM organizations
ORDER BY created_at DESC
LIMIT 20;

-- 3. Count by status
SELECT 
  subscription_status,
  COUNT(*) as count
FROM organizations
GROUP BY subscription_status;

-- 4. Count by plan
SELECT 
  subscription_plan,
  COUNT(*) as count
FROM organizations
GROUP BY subscription_plan;
