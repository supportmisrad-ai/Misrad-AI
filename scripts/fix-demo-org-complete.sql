-- תיקון מלא לבעיות ארגון הדגמה + העברת ארגונים מלקוחות עסקיים
-- תאריך: 2026-03-23
-- מטרה: תיקון שורשי של כל הבעיות

-- =============================================================================
-- חלק 1: העברת ארגונים מלקוחות עסקיים לארגונים עצמאיים
-- =============================================================================

-- 1.1: ניתוק ארגונים מ-business_clients
UPDATE organizations 
SET client_id = NULL,
    updated_at = NOW()
WHERE slug IN ('misrad-ai-demo-il', 'misrad-ai-hq-4b96f01c')
  AND client_id IS NOT NULL;

-- 1.2: עדכון owner_id לסופר אדמין
UPDATE organizations
SET owner_id = (
    SELECT id FROM organization_users 
    WHERE clerk_user_id = 'user_39UkuSmIkk20b1MuAahuYqWHKoe'
    LIMIT 1
),
updated_at = NOW()
WHERE slug IN ('misrad-ai-demo-il', 'misrad-ai-hq-4b96f01c');

-- =============================================================================
-- חלק 2: תיקון אימיילים כפולים ב-NexusUser (הסיבה ל-Unique constraint)
-- =============================================================================

-- 2.1: מציאת אימיילים כפולים
WITH duplicate_emails AS (
    SELECT 
        "organizationId",
        email,
        COUNT(*) as count,
        MIN(id) as first_id
    FROM "NexusUser"
    WHERE "organizationId" = (SELECT id FROM organizations WHERE slug = 'misrad-ai-demo-il')
    GROUP BY "organizationId", email
    HAVING COUNT(*) > 1
)
-- 2.2: מחיקת רשומות כפולות (שומר רק את הראשונה)
DELETE FROM "NexusUser"
WHERE id IN (
    SELECT nu.id
    FROM "NexusUser" nu
    INNER JOIN duplicate_emails de 
        ON nu."organizationId" = de."organizationId" 
        AND nu.email = de.email
    WHERE nu.id != de.first_id
);

-- =============================================================================
-- חלק 3: תיקון נתונים חסרים בארגון הדגמה
-- =============================================================================

-- 3.1: וידוא שיש organization_id תקין
DO $$
DECLARE
    demo_org_id UUID;
BEGIN
    SELECT id INTO demo_org_id FROM organizations WHERE slug = 'misrad-ai-demo-il';
    
    IF demo_org_id IS NULL THEN
        RAISE EXCEPTION 'Demo organization not found!';
    END IF;
    
    RAISE NOTICE 'Demo org ID: %', demo_org_id;
END $$;

-- 3.2: בדיקת משימות (למה הן לא מופיעות?)
SELECT 
    COUNT(*) as total_tasks,
    COUNT(CASE WHEN status = 'Done' THEN 1 END) as done_tasks,
    COUNT(CASE WHEN status != 'Done' THEN 1 END) as active_tasks
FROM "NexusTask"
WHERE "organizationId" = (SELECT id FROM organizations WHERE slug = 'misrad-ai-demo-il');

-- 3.3: בדיקת לקוחות (למה הם לא מופיעים?)
SELECT 
    COUNT(*) as total_clients,
    COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_clients
FROM client_clients
WHERE "organizationId" = (SELECT id FROM organizations WHERE slug = 'misrad-ai-demo-il');

-- =============================================================================
-- חלק 4: אופטימיזציה - מחיקת נתונים מיותרים
-- =============================================================================

-- 4.1: מחיקת משימות ישנות/כפולות (אם יש)
DELETE FROM "NexusTask"
WHERE "organizationId" = (SELECT id FROM organizations WHERE slug = 'misrad-ai-demo-il')
  AND "createdAt" < NOW() - INTERVAL '6 months'
  AND status = 'Done';

-- =============================================================================
-- חלק 5: אימות תקינות
-- =============================================================================

-- 5.1: בדיקת ארגונים
SELECT 
    o.id,
    o.name,
    o.slug,
    o.client_id,
    o.owner_id,
    ou.email as owner_email,
    o.subscription_status,
    o.has_nexus,
    o.created_at
FROM organizations o
LEFT JOIN organization_users ou ON ou.id = o.owner_id
WHERE o.slug IN ('misrad-ai-demo-il', 'misrad-ai-hq-4b96f01c')
ORDER BY o.created_at DESC;

-- 5.2: בדיקת עובדים
SELECT 
    COUNT(*) as total_users,
    COUNT(DISTINCT email) as unique_emails
FROM "NexusUser"
WHERE "organizationId" = (SELECT id FROM organizations WHERE slug = 'misrad-ai-demo-il');

-- 5.3: סיכום
SELECT 
    'Organizations' as table_name,
    COUNT(*) as count
FROM organizations
WHERE slug IN ('misrad-ai-demo-il', 'misrad-ai-hq-4b96f01c')
UNION ALL
SELECT 
    'NexusUsers' as table_name,
    COUNT(*) as count
FROM "NexusUser"
WHERE "organizationId" = (SELECT id FROM organizations WHERE slug = 'misrad-ai-demo-il')
UNION ALL
SELECT 
    'NexusTasks' as table_name,
    COUNT(*) as count
FROM "NexusTask"
WHERE "organizationId" = (SELECT id FROM organizations WHERE slug = 'misrad-ai-demo-il')
UNION ALL
SELECT 
    'ClientClients' as table_name,
    COUNT(*) as count
FROM client_clients
WHERE "organizationId" = (SELECT id FROM organizations WHERE slug = 'misrad-ai-demo-il')
UNION ALL
SELECT 
    'TimeEntries' as table_name,
    COUNT(*) as count
FROM "NexusTimeEntry"
WHERE "organizationId" = (SELECT id FROM organizations WHERE slug = 'misrad-ai-demo-il');
