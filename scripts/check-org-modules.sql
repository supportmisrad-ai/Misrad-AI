-- 📊 בדיקת מודולים פעילים בכל organization

SELECT 
  id,
  name,
  slug,
  has_nexus,
  has_social,
  has_system,
  has_finance,
  has_client,
  has_operations,
  subscription_status,
  subscription_plan,
  trial_days
FROM organizations
ORDER BY slug;

-- 📈 סיכום מודולים:
SELECT 
  slug,
  name,
  CASE WHEN has_nexus THEN '✅ Nexus' ELSE '❌ Nexus' END as nexus,
  CASE WHEN has_social THEN '✅ Social' ELSE '❌ Social' END as social,
  CASE WHEN has_system THEN '✅ System' ELSE '❌ System' END as system,
  CASE WHEN has_finance THEN '✅ Finance' ELSE '❌ Finance' END as finance,
  CASE WHEN has_client THEN '✅ Client' ELSE '❌ Client' END as client,
  CASE WHEN has_operations THEN '✅ Operations' ELSE '❌ Operations' END as operations
FROM organizations
ORDER BY slug;
