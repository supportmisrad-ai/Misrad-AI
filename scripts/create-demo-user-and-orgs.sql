-- 🎯 יצירת משתמש דמו + 13 ארגוני דמו
-- פותר את בעיית הזרות מפתח (foreign key)

BEGIN;

-- 1. יצירת משתמש דמו
INSERT INTO social_users (id, clerk_user_id, email, full_name, role, created_at, updated_at)
VALUES (
  'e0117831-48ed-4548-a2ea-ba246a5b6dcc',
  'user_demo_owner_12345',
  'demo@misrad-ai.com',
  'Demo Owner',
  'owner',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 2. עדכן organization_id זמני (יעודכן אחרי יצירת הארגונים)
UPDATE social_users 
SET organization_id = 'e0117831-48ed-4548-a2ea-ba246a5b6dcc'
WHERE id = 'e0117831-48ed-4548-a2ea-ba246a5b6dcc';

COMMIT;

-- עכשיו נוצר את הארגונים (עם owner_id תקין):

-- 1. חבילת Nexus (ניהול צוות בלבד)
INSERT INTO organizations (id, name, slug, owner_id, has_nexus, has_social, has_system, has_finance, has_client, has_operations, subscription_status, subscription_plan, trial_days, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'דמו - חבילת Nexus',
  'nexus-demo',
  'e0117831-48ed-4548-a2ea-ba246a5b6dcc',
  true, false, false, false, false, false,
  'active',
  'nexus_only',
  14,
  NOW(),
  NOW()
);

-- 2. חבילת Social (שיווק ומדיה חברתית)
INSERT INTO organizations (id, name, slug, owner_id, has_nexus, has_social, has_system, has_finance, has_client, has_operations, subscription_status, subscription_plan, trial_days, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'דמו - חבילת Social',
  'social-demo',
  'e0117831-48ed-4548-a2ea-ba246a5b6dcc',
  true, true, false, false, false, false,
  'active',
  'social_package',
  14,
  NOW(),
  NOW()
);

-- 3. חבילת System (מכירות וליידים)
INSERT INTO organizations (id, name, slug, owner_id, has_nexus, has_social, has_system, has_finance, has_client, has_operations, subscription_status, subscription_plan, trial_days, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'דמו - חבילת System',
  'system-demo',
  'e0117831-48ed-4548-a2ea-ba246a5b6dcc',
  true, false, true, false, false, false,
  'active',
  'system_package',
  14,
  NOW(),
  NOW()
);

-- 4. חבילת Finance (חשבונאות וחשבוניות)
INSERT INTO organizations (id, name, slug, owner_id, has_nexus, has_social, has_system, has_finance, has_client, has_operations, subscription_status, subscription_plan, trial_days, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'דמו - חבילת Finance',
  'finance-demo',
  'e0117831-48ed-4548-a2ea-ba246a5b6dcc',
  true, false, false, true, false, false,
  'active',
  'finance_package',
  14,
  NOW(),
  NOW()
);

-- 5. חבילת Client (פורטל לקוחות)
INSERT INTO organizations (id, name, slug, owner_id, has_nexus, has_social, has_system, has_finance, has_client, has_operations, subscription_status, subscription_plan, trial_days, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'דמו - חבילת Client',
  'client-demo',
  'e0117831-48ed-4548-a2ea-ba246a5b6dcc',
  true, false, false, false, true, false,
  'active',
  'client_package',
  14,
  NOW(),
  NOW()
);

-- 6. חבילת Operations (ניהול פרויקטים ושטח)
INSERT INTO organizations (id, name, slug, owner_id, has_nexus, has_social, has_system, has_finance, has_client, has_operations, subscription_status, subscription_plan, trial_days, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'דמו - חבילת Operations',
  'operations-demo',
  'e0117831-48ed-4548-a2ea-ba246a5b6dcc',
  true, false, false, false, false, true,
  'active',
  'operations_package',
  14,
  NOW(),
  NOW()
);

-- 7. חבילת Solo (מודול בודד - the_closer)
INSERT INTO organizations (id, name, slug, owner_id, has_nexus, has_social, has_system, has_finance, has_client, has_operations, subscription_status, subscription_plan, trial_days, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'דמו - Solo (Closer)',
  'solo-closer-demo',
  'e0117831-48ed-4548-a2ea-ba246a5b6dcc',
  true, false, true, false, false, false,
  'active',
  'solo',
  14,
  NOW(),
  NOW()
);

-- 8. חבילת The Closer (חבילת מכירות)
INSERT INTO organizations (id, name, slug, owner_id, has_nexus, has_social, has_system, has_finance, has_client, has_operations, subscription_status, subscription_plan, trial_days, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'דמו - חבילת מכירות',
  'the-closer-demo',
  'e0117831-48ed-4548-a2ea-ba246a5b6dcc',
  true, false, true, true, false, false,
  'active',
  'the_closer',
  14,
  NOW(),
  NOW()
);

-- 9. חבילת The Authority (שיווק ומיתוג)
INSERT INTO organizations (id, name, slug, owner_id, has_nexus, has_social, has_system, has_finance, has_client, has_operations, subscription_status, subscription_plan, trial_days, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'דמו - שיווק ומיתוג',
  'the-authority-demo',
  'e0117831-48ed-4548-a2ea-ba246a5b6dcc',
  true, true, false, false, true, false,
  'active',
  'the_authority',
  14,
  NOW(),
  NOW()
);

-- 10. חבילת The Operator (תפעול ושטח)
INSERT INTO organizations (id, name, slug, owner_id, has_nexus, has_social, has_system, has_finance, has_client, has_operations, subscription_status, subscription_plan, trial_days, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'דמו - תפעול ושטח',
  'the-operator-demo',
  'e0117831-48ed-4548-a2ea-ba246a5b6dcc',
  true, false, false, true, false, true,
  'active',
  'the_operator',
  14,
  NOW(),
  NOW()
);

-- 11. חבילת The Empire (הכל כלול)
INSERT INTO organizations (id, name, slug, owner_id, has_nexus, has_social, has_system, has_finance, has_client, has_operations, subscription_status, subscription_plan, trial_days, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'דמו - הכל כלול',
  'the-empire-demo',
  'e0117831-48ed-4548-a2ea-ba246a5b6dcc',
  true, true, true, true, true, true,
  'active',
  'the_empire',
  14,
  NOW(),
  NOW()
);

-- 12. טסט - Trial Mode
INSERT INTO organizations (id, name, slug, owner_id, has_nexus, has_social, has_system, has_finance, has_client, has_operations, subscription_status, subscription_plan, trial_days, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'טסט - Trial',
  'test-trial',
  'e0117831-48ed-4548-a2ea-ba246a5b6dcc',
  true, true, true, true, true, true,
  'trial',
  null,
  14,
  NOW(),
  NOW()
);

-- 13. טסט - Expired
INSERT INTO organizations (id, name, slug, owner_id, has_nexus, has_social, has_system, has_finance, has_client, has_operations, subscription_status, subscription_plan, trial_days, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'טסט - Expired',
  'test-expired',
  'e0117831-48ed-4548-a2ea-ba246a5b6dcc',
  true, false, true, false, false, false,
  'expired',
  'the_closer',
  14,
  NOW(),
  NOW()
);

-- ✅ אימות
SELECT 
  slug,
  name,
  subscription_status,
  subscription_plan,
  trial_days,
  has_nexus, has_social, has_system, has_finance, has_client, has_operations
FROM organizations
WHERE owner_id = 'e0117831-48ed-4548-a2ea-ba246a5b6dcc'
ORDER BY created_at DESC;

SELECT COUNT(*) as total_demo_orgs 
FROM organizations 
WHERE owner_id = 'e0117831-48ed-4548-a2ea-ba246a5b6dcc';
