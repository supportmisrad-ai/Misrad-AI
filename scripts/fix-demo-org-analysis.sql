-- ניתוח שורשי של בעיות ארגון הדגמה
-- תאריך: 2026-03-23

-- 1. בדיקת ארגון הדגמה
SELECT 
    id, 
    name, 
    slug, 
    owner_id,
    client_id,
    subscription_status,
    has_nexus,
    created_at
FROM organizations 
WHERE slug IN ('misrad-ai-demo-il', 'misrad-ai-hq-4b96f01c')
ORDER BY created_at DESC;

-- 2. בדיקת business_clients מקושרים
SELECT 
    bc.id,
    bc.company_name,
    bc.primary_email,
    bc.status,
    COUNT(DISTINCT o.id) as linked_orgs_count
FROM business_clients bc
LEFT JOIN organizations o ON o.client_id = bc.id
WHERE bc.company_name IN ('הדגמה - סוכנות דיגיטל פרו', 'Misrad AI HQ')
GROUP BY bc.id, bc.company_name, bc.primary_email, bc.status;

-- 3. בדיקת משימות בארגון הדגמה
SELECT 
    COUNT(*) as tasks_count,
    status,
    priority
FROM "NexusTask"
WHERE "organizationId" = (SELECT id FROM organizations WHERE slug = 'misrad-ai-demo-il')
GROUP BY status, priority
ORDER BY status;

-- 4. בדיקת לקוחות בארגון הדגמה  
SELECT 
    COUNT(*) as clients_count,
    status
FROM client_clients
WHERE "organizationId" = (SELECT id FROM organizations WHERE slug = 'misrad-ai-demo-il')
GROUP BY status;

-- 5. בדיקת אירועים (למה הם כן עובדים?)
SELECT 
    COUNT(*) as events_count,
    DATE("startTime") as event_date
FROM "NexusTimeEntry"
WHERE "organizationId" = (SELECT id FROM organizations WHERE slug = 'misrad-ai-demo-il')
GROUP BY DATE("startTime")
ORDER BY event_date DESC
LIMIT 10;

-- 6. בדיקת עובדים (NexusUser)
SELECT 
    id,
    name,
    email,
    role,
    department
FROM "NexusUser"
WHERE "organizationId" = (SELECT id FROM organizations WHERE slug = 'misrad-ai-demo-il')
ORDER BY name;

-- 7. בדיקת אימיילים כפולים (הסיבה ל-Unique constraint)
SELECT 
    email,
    COUNT(*) as count
FROM "NexusUser"
WHERE "organizationId" = (SELECT id FROM organizations WHERE slug = 'misrad-ai-demo-il')
GROUP BY email
HAVING COUNT(*) > 1;

-- 8. בדיקת organization_users
SELECT 
    ou.id,
    ou.email,
    ou.full_name,
    ou.role,
    o.name as org_name,
    o.slug as org_slug
FROM organization_users ou
LEFT JOIN organizations o ON o.id = ou.organization_id
WHERE ou.clerk_user_id = 'user_39UkuSmIkk20b1MuAahuYqWHKoe'
ORDER BY ou.created_at DESC;
