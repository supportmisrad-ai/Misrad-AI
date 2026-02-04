-- 🔧 תיקון שמות חבילות בארגוני דמו להתאמה למערכת התמחור

-- מודולים בודדים → solo
UPDATE organizations SET subscription_plan = 'solo' WHERE slug = 'nexus-demo';
UPDATE organizations SET subscription_plan = 'solo' WHERE slug = 'social-demo';
UPDATE organizations SET subscription_plan = 'solo' WHERE slug = 'system-demo';
UPDATE organizations SET subscription_plan = 'solo' WHERE slug = 'finance-demo';
UPDATE organizations SET subscription_plan = 'solo' WHERE slug = 'client-demo';
UPDATE organizations SET subscription_plan = 'solo' WHERE slug = 'operations-demo';

-- חבילת מכירות (System + Nexus) → the_closer
UPDATE organizations SET subscription_plan = 'the_closer' WHERE slug = 'starter-demo';

-- חבילת תפעול (Finance + Nexus) → the_operator (או the_closer אם יש גם System)
UPDATE organizations SET subscription_plan = 'the_operator' WHERE slug = 'growth-demo';

-- חבילת מקצועית → the_authority או the_operator
UPDATE organizations SET subscription_plan = 'the_authority' WHERE slug = 'pro-demo';

-- הכל כלול → the_empire
UPDATE organizations SET subscription_plan = 'the_empire' WHERE slug = 'enterprise-demo';
UPDATE organizations SET subscription_plan = 'the_empire' WHERE slug = 'test-trial';

-- טסטים
UPDATE organizations SET subscription_plan = 'the_closer' WHERE slug = 'test-expired';
UPDATE organizations SET subscription_plan = 'the_operator' WHERE slug = 'test-canceled';

-- ✅ אימות
SELECT 
  slug,
  name,
  subscription_plan,
  subscription_status,
  CONCAT(
    CASE WHEN has_nexus THEN 'N' ELSE '-' END,
    CASE WHEN has_social THEN 'S' ELSE '-' END,
    CASE WHEN has_system THEN 'Y' ELSE '-' END,
    CASE WHEN has_finance THEN 'F' ELSE '-' END,
    CASE WHEN has_client THEN 'C' ELSE '-' END,
    CASE WHEN has_operations THEN 'O' ELSE '-' END
  ) as modules
FROM organizations
ORDER BY subscription_plan, slug;

-- 📊 סיכום חבילות
SELECT 
  subscription_plan,
  COUNT(*) as count,
  STRING_AGG(slug, ', ') as orgs
FROM organizations
WHERE subscription_plan IS NOT NULL
GROUP BY subscription_plan
ORDER BY subscription_plan;
