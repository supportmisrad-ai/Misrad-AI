-- ✅ תיקון מלא וסופי לכל בעיות ארגון הדגמה
-- תאריך: 2026-03-23 02:16
-- הרץ על PROD DATABASE בזהירות!

-- =============================================================================
-- שלב 1: העברת ארגונים מלקוחות עסקיים לארגונים עצמאיים
-- =============================================================================

-- 1.1: ניתוק ארגונים מ-business_clients
UPDATE organizations 
SET 
    client_id = NULL,
    updated_at = NOW()
WHERE slug IN ('misrad-ai-demo-il', 'misrad-ai-hq-4b96f01c')
  AND client_id IS NOT NULL;

-- 1.2: עדכון owner לסופר אדמין (itsikdahan1@gmail.com)
UPDATE organizations
SET 
    owner_id = (
        SELECT id 
        FROM organization_users 
        WHERE clerk_user_id = 'user_39UkuSmIkk20b1MuAahuYqWHKoe'
           OR email ILIKE 'itsikdahan1@gmail.com'
        LIMIT 1
    ),
    updated_at = NOW()
WHERE slug IN ('misrad-ai-demo-il', 'misrad-ai-hq-4b96f01c');

-- =============================================================================
-- שלב 2: ניקוי אימיילים כפולים ב-NexusUser
-- =============================================================================

-- 2.1: מציאת ומחיקת רשומות כפולות (שומר רק את הראשונה לפי created_at)
WITH duplicate_emails AS (
    SELECT 
        "organizationId",
        email,
        MIN("createdAt") as first_created,
        COUNT(*) as count
    FROM "NexusUser"
    WHERE "organizationId" IN (
        SELECT id FROM organizations 
        WHERE slug IN ('misrad-ai-demo-il', 'misrad-ai-hq-4b96f01c')
    )
    GROUP BY "organizationId", email
    HAVING COUNT(*) > 1
),
to_delete AS (
    SELECT nu.id
    FROM "NexusUser" nu
    INNER JOIN duplicate_emails de 
        ON nu."organizationId" = de."organizationId" 
        AND nu.email = de.email
    WHERE nu."createdAt" > de.first_created
)
DELETE FROM "NexusUser"
WHERE id IN (SELECT id FROM to_delete);

-- =============================================================================
-- שלב 3: בדיקת תקינות נתונים
-- =============================================================================

-- 3.1: ספירת משימות (צריך להיות > 0)
SELECT 
    'NexusTasks' as entity,
    COUNT(*) as count,
    COUNT(CASE WHEN status != 'Done' THEN 1 END) as active_count
FROM "NexusTask"
WHERE "organizationId" = (SELECT id FROM organizations WHERE slug = 'misrad-ai-demo-il');

-- 3.2: ספירת לקוחות (צריך להיות > 0)
SELECT 
    'ClientClients' as entity,
    COUNT(*) as count,
    COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_count
FROM client_clients
WHERE "organizationId" = (SELECT id FROM organizations WHERE slug = 'misrad-ai-demo-il');

-- 3.3: ספירת עובדים ייחודיים
SELECT 
    'NexusUsers' as entity,
    COUNT(*) as total_users,
    COUNT(DISTINCT email) as unique_emails
FROM "NexusUser"
WHERE "organizationId" = (SELECT id FROM organizations WHERE slug = 'misrad-ai-demo-il');

-- =============================================================================
-- שלב 4: אימות סופי
-- =============================================================================

SELECT 
    o.slug,
    o.name,
    o.client_id as should_be_null,
    ou.email as owner_email,
    (SELECT COUNT(*) FROM "NexusUser" WHERE "organizationId" = o.id) as users_count,
    (SELECT COUNT(*) FROM "NexusTask" WHERE "organizationId" = o.id) as tasks_count,
    (SELECT COUNT(*) FROM client_clients WHERE "organizationId" = o.id) as clients_count
FROM organizations o
LEFT JOIN organization_users ou ON ou.id = o.owner_id
WHERE o.slug IN ('misrad-ai-demo-il', 'misrad-ai-hq-4b96f01c')
ORDER BY o.slug;
