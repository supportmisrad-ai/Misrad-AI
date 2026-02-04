-- 🇮🇱 עדכון שמות חבילות לעברית

UPDATE organizations SET subscription_plan = 'נקסוס בלבד' WHERE slug = 'nexus-demo';
UPDATE organizations SET subscription_plan = 'חבילת סושיאל' WHERE slug = 'social-demo';
UPDATE organizations SET subscription_plan = 'חבילת סיסטם' WHERE slug = 'system-demo';
UPDATE organizations SET subscription_plan = 'חבילת פיננס' WHERE slug = 'finance-demo';
UPDATE organizations SET subscription_plan = 'חבילת קליינט' WHERE slug = 'client-demo';
UPDATE organizations SET subscription_plan = 'חבילת אופרציות' WHERE slug = 'operations-demo';
UPDATE organizations SET subscription_plan = 'סטארטר' WHERE slug = 'starter-demo';
UPDATE organizations SET subscription_plan = 'צמיחה' WHERE slug = 'growth-demo';
UPDATE organizations SET subscription_plan = 'מקצועי' WHERE slug = 'pro-demo';
UPDATE organizations SET subscription_plan = 'ארגוני' WHERE slug = 'enterprise-demo';
UPDATE organizations SET subscription_plan = 'צמיחה' WHERE slug = 'test-canceled';
UPDATE organizations SET subscription_plan = 'סטארטר' WHERE slug = 'test-expired';

-- ✅ אימות
SELECT 
  slug,
  name,
  subscription_plan,
  subscription_status
FROM organizations
WHERE subscription_plan IS NOT NULL
ORDER BY slug;
