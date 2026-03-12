-- ============================================
-- בדיקת לוגו וארגון ב-DB
-- ============================================

-- בדיקת ערכי לוגו לכל הארגונים
SELECT 
    id,
    name,
    slug,
    logo,
    CASE 
        WHEN logo IS NULL THEN 'NULL'
        WHEN logo = '' THEN 'EMPTY'
        WHEN logo LIKE 'sb://%' THEN 'SUPABASE_REF'
        WHEN logo LIKE 'http%' THEN 'URL'
        ELSE 'OTHER'
    END as logo_type,
    LENGTH(logo) as logo_length,
    subscription_status,
    created_at
FROM organization
ORDER BY created_at DESC;

-- בדיקה ספציפית לארגון לפי slug
-- החלף 'your-org-slug' בשם הארגון שלך:
-- SELECT logo, name, id FROM organization WHERE slug = 'your-org-slug';

-- בדיקה האם יש בעיות עם storage refs
SELECT 
    COUNT(*) as total_orgs,
    COUNT(logo) as with_logo,
    COUNT(*) - COUNT(logo) as without_logo,
    COUNT(CASE WHEN logo LIKE 'sb://%' THEN 1 END) as supabase_refs,
    COUNT(CASE WHEN logo LIKE 'http%' THEN 1 END) as direct_urls
FROM organization;
