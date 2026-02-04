-- 🗑️ מחיקת כפילויות ריקות של organizations
-- הרץ את זה רק אחרי שאישרת שזה נכון!

-- בדיקה אחרונה לפני מחיקה:
SELECT 
  o.id,
  o.name,
  o.slug,
  o.created_at,
  COUNT(su.id) as users_count
FROM organizations o
LEFT JOIN social_users su ON su.organization_id = o.id
WHERE o.id IN (
  '0e700c6e-c38d-41f0-897e-b5306b8fb264',  -- avoda-sheli (ריק)
  '38008c33-ff2c-4feb-9492-8951b1975df0',  -- avoda-sheli (ריק)
  '1d55b9e2-346f-46d2-b2bc-ab3b0ae61404'   -- tests (ריק)
)
GROUP BY o.id, o.name, o.slug, o.created_at
ORDER BY o.slug, o.created_at;

-- 🔥 מחיקה בפועל (הסר את ההערה כדי להריץ):
-- BEGIN;

-- DELETE FROM organizations 
-- WHERE id IN (
--   '0e700c6e-c38d-41f0-897e-b5306b8fb264',  -- avoda-sheli (ריק)
--   '38008c33-ff2c-4feb-9492-8951b1975df0',  -- avoda-sheli (ריק)
--   '1d55b9e2-346f-46d2-b2bc-ab3b0ae61404'   -- tests (ריק)
-- );

-- COMMIT;

-- ✅ אימות שנשארו רק הנכונים:
SELECT 
  o.id,
  o.name,
  o.slug,
  o.created_at,
  COUNT(su.id) as users_count
FROM organizations o
LEFT JOIN social_users su ON su.organization_id = o.id
GROUP BY o.id, o.name, o.slug, o.created_at
ORDER BY o.slug, o.created_at;
