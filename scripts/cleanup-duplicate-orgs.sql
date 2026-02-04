-- 🔍 בדיקה: מציאת כל ה-organizations
SELECT 
  id,
  name,
  slug,
  owner_id,
  created_at,
  subscription_status
FROM organizations
ORDER BY slug, created_at;

-- 📊 ספירת כפילויות לפי slug
SELECT 
  slug,
  COUNT(*) as count,
  STRING_AGG(name, ' | ') as names
FROM organizations
GROUP BY slug
HAVING COUNT(*) > 1;

-- ⚠️ לפני מחיקה - בדוק מה למחוק:
-- מציג את כל הארגונים עם מספר הרשומות הקשורות אליהם
SELECT 
  o.id,
  o.name,
  o.slug,
  o.created_at,
  COUNT(DISTINCT su.id) as users_count,
  COUNT(DISTINCT sl.id) as leads_count,
  COUNT(DISTINCT sc.id) as social_clients_count
FROM organizations o
LEFT JOIN social_users su ON su.organization_id = o.id
LEFT JOIN system_leads sl ON sl.organization_id = o.id
LEFT JOIN social_clients sc ON sc.organization_id = o.id
GROUP BY o.id, o.name, o.slug, o.created_at
ORDER BY o.slug, o.created_at;

-- 🗑️ מחיקה (הרץ רק אחרי שבדקת!):
-- מחק organizations ריקים/ישנים עם אותו slug
-- דוגמה - תתאים לפי התוצאות למעלה:

-- DELETE FROM organizations 
-- WHERE id IN (
--   'ID_של_הארגון_שרוצה_למחוק_1',
--   'ID_של_הארגון_שרוצה_למחוק_2'
-- );
