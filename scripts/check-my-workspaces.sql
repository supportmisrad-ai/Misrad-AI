-- בדיקה: אילו workspaces יש למשתמש הנוכחי?
-- הרץ את זה כדי לראות בדיוק מה יש לך ב-DB

-- 1. זהה את המשתמש הנוכחי (תחליף את YOUR_CLERK_USER_ID)
WITH my_user AS (
  SELECT 
    id as user_id,
    clerk_user_id,
    organization_id as primary_org_id,
    last_org_slug as last_location_org,
    last_module
  FROM organization_users 
  WHERE clerk_user_id = 'YOUR_CLERK_USER_ID'  -- ⚠️ תחליף את זה ב-clerk_user_id האמיתי שלך
  LIMIT 1
),

-- 2. מצא את כל הארגונים שיש לך גישה אליהם
user_orgs AS (
  -- ארגון ראשי
  SELECT DISTINCT o.id, o.slug, o.name, 'primary' as access_type
  FROM my_user cu
  JOIN organizations o ON o.id = cu.primary_org_id
  WHERE cu.primary_org_id IS NOT NULL

  UNION

  -- ארגונים בבעלות
  SELECT DISTINCT o.id, o.slug, o.name, 'owner' as access_type
  FROM my_user cu
  JOIN organizations o ON o.owner_id = cu.user_id

  UNION

  -- חברות צוות
  SELECT DISTINCT o.id, o.slug, o.name, 'team_member' as access_type
  FROM my_user cu
  JOIN team_members tm ON tm.user_id = cu.user_id
  JOIN organizations o ON o.id = tm.organization_id
)

-- 3. הצג את התוצאות
SELECT 
  uo.slug as workspace_slug,
  uo.name as workspace_name,
  uo.access_type,
  CASE 
    WHEN uo.id = cu.primary_org_id THEN '✅ PRIMARY'
    ELSE ''
  END as is_primary,
  CASE 
    WHEN uo.slug = cu.last_location_org OR uo.id::text = cu.last_location_org THEN '🔵 LAST VISITED'
    ELSE ''
  END as is_last_visited,
  cu.last_module
FROM user_orgs uo
CROSS JOIN my_user cu
ORDER BY 
  CASE WHEN uo.id = cu.primary_org_id THEN 0 ELSE 1 END,
  CASE WHEN uo.slug = cu.last_location_org OR uo.id::text = cu.last_location_org THEN 0 ELSE 1 END,
  uo.name;

-- 4. הצג גם את פרטי המשתמש
SELECT 
  'User Info' as section,
  clerk_user_id,
  organization_id as primary_org_id,
  last_org_slug as last_location_org,
  last_module
FROM organization_users
WHERE clerk_user_id = 'YOUR_CLERK_USER_ID'  -- ⚠️ תחליף את זה ב-clerk_user_id האמיתי שלך
LIMIT 1;
