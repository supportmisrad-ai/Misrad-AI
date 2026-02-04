-- 🎯 יצירת ארגוני דמו לפי חבילות/מודולים
-- Owner: e0117831-48ed-4548-a2ea-ba246a5b6dcc

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

-- 7. חבילת Starter (Nexus + System)
INSERT INTO organizations (id, name, slug, owner_id, has_nexus, has_social, has_system, has_finance, has_client, has_operations, subscription_status, subscription_plan, trial_days, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'דמו - חבילת Starter',
  'starter-demo',
  'e0117831-48ed-4548-a2ea-ba246a5b6dcc',
  true, false, true, false, false, false,
  'active',
  'starter',
  14,
  NOW(),
  NOW()
);

-- 8. חבילת Growth (Nexus + System + Finance)
INSERT INTO organizations (id, name, slug, owner_id, has_nexus, has_social, has_system, has_finance, has_client, has_operations, subscription_status, subscription_plan, trial_days, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'דמו - חבילת Growth',
  'growth-demo',
  'e0117831-48ed-4548-a2ea-ba246a5b6dcc',
  true, false, true, true, false, false,
  'active',
  'growth',
  14,
  NOW(),
  NOW()
);

-- 9. חבילת Professional (Nexus + System + Finance + Client)
INSERT INTO organizations (id, name, slug, owner_id, has_nexus, has_social, has_system, has_finance, has_client, has_operations, subscription_status, subscription_plan, trial_days, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'דמו - חבילת Pro',
  'pro-demo',
  'e0117831-48ed-4548-a2ea-ba246a5b6dcc',
  true, false, true, true, true, false,
  'active',
  'professional',
  14,
  NOW(),
  NOW()
);

-- 10. חבילת Enterprise (הכל!)
INSERT INTO organizations (id, name, slug, owner_id, has_nexus, has_social, has_system, has_finance, has_client, has_operations, subscription_status, subscription_plan, trial_days, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'דמו - חבילת Enterprise',
  'enterprise-demo',
  'e0117831-48ed-4548-a2ea-ba246a5b6dcc',
  true, true, true, true, true, true,
  'active',
  'enterprise',
  14,
  NOW(),
  NOW()
);

-- 11. טסט - Trial Mode
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

-- 12. טסט - Expired
INSERT INTO organizations (id, name, slug, owner_id, has_nexus, has_social, has_system, has_finance, has_client, has_operations, subscription_status, subscription_plan, trial_days, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'טסט - Expired',
  'test-expired',
  'e0117831-48ed-4548-a2ea-ba246a5b6dcc',
  true, false, true, false, false, false,
  'expired',
  'starter',
  14,
  NOW(),
  NOW()
);

-- 13. טסט - Canceled
INSERT INTO organizations (id, name, slug, owner_id, has_nexus, has_social, has_system, has_finance, has_client, has_operations, subscription_status, subscription_plan, trial_days, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'טסט - Canceled',
  'test-canceled',
  'e0117831-48ed-4548-a2ea-ba246a5b6dcc',
  true, false, true, false, false, false,
  'canceled',
  'growth',
  14,
  NOW(),
  NOW()
);

-- ✅ אימות - צריכים להיות 16 ארגונים בסך הכל (3 קיימים + 13 חדשים)
SELECT 
  slug,
  name,
  subscription_status,
  subscription_plan,
  CONCAT(
    CASE WHEN has_nexus THEN 'N' ELSE '-' END,
    CASE WHEN has_social THEN 'S' ELSE '-' END,
    CASE WHEN has_system THEN 'Y' ELSE '-' END,
    CASE WHEN has_finance THEN 'F' ELSE '-' END,
    CASE WHEN has_client THEN 'C' ELSE '-' END,
    CASE WHEN has_operations THEN 'O' ELSE '-' END
  ) as modules
FROM organizations
ORDER BY slug;
