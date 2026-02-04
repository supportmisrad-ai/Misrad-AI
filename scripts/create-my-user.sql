-- יצירת משתמש לitsikdahan1@gmail.com
-- הרץ את זה אם אתה לא רוצה להתחבר דרך הממשק

BEGIN;

-- בדוק אם המשתמש כבר קיים
DO $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count 
  FROM social_users 
  WHERE email ILIKE '%itsikdahan1%';
  
  IF user_count > 0 THEN
    RAISE NOTICE 'User already exists!';
  ELSE
    -- צור משתמש חדש עם ה-ID הקבוע הישן
    INSERT INTO social_users (
      id,
      clerk_user_id,
      email,
      full_name,
      role,
      created_at,
      updated_at
    ) VALUES (
      'e0117831-48ed-4548-a2ea-ba246a5b6dcc',
      'user_itsikdahan1_super_admin',
      'itsikdahan1@gmail.com',
      'Itsik Dahan',
      'owner',
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'User created successfully!';
  END IF;
END $$;

COMMIT;

-- הצג את המשתמש
SELECT 
  id,
  email,
  full_name,
  clerk_user_id,
  role,
  created_at
FROM social_users
WHERE email ILIKE '%itsikdahan1%';
