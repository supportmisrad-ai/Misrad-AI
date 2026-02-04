---
description: איך לעשות שינויי סכמה בטוחים ללא אובדן נתונים
---

# 🛡️ Safe Schema Changes - תהליך בטוח לשינויי דאטאבייס

## ⚠️ חוקי ברזל - אל תפר!

### ❌ **אסור לעשות:**
1. `prisma db push` על production או staging
2. `prisma migrate dev` ללא בדיקה קודם
3. לשנות סכמה בלי backup
4. למחוק עמודות ישירות מהסכמה

### ✅ **תמיד לעשות:**
1. Backup לפני כל שינוי
2. Migration בדיקה על DB מקומי
3. Review את ה-migration SQL
4. Test על staging לפני production

---

## 📋 תהליך עבודה נכון

### שלב 1: גיבוי (חובה!)
```bash
# גיבוי של הטבלאות הקריטיות
# turbo
npm run db:backup:critical
```

### שלב 2: שינוי הסכמה
ערוך את `prisma/schema.prisma`

### שלב 3: צור migration (אל תריץ!)
```bash
# רק ליצור, לא להריץ
# turbo
npx prisma migrate dev --create-only --schema prisma/schema.prisma
```

### שלב 4: בדוק את ה-SQL
פתח את הקובץ שנוצר ב-`prisma/migrations/[timestamp]_[name]/migration.sql`

**חפש מילים מסוכנות:**
- `DROP TABLE`
- `DROP COLUMN`
- `TRUNCATE`
- `ALTER TABLE ... DROP`

### שלב 5: אם יש DROP/TRUNCATE - עצור!
1. תקן את ה-migration ידנית
2. הוסף `-- Custom migration to preserve data`
3. כתוב migration בטוח (ראה דוגמאות למטה)

### שלב 6: הרץ
```bash
## ⚠️ NEVER DO THIS
```bash
# ❌ BLOCKED: This command is now blocked in package.json
npx prisma migrate dev

# ❌ DON'T: This can cause drift and data loss
npx prisma db push

# ✅ INSTEAD USE: Safe migration workflow
npm run migrate:check      # Check before migrating
npm run migrate:safe <name>  # Create and apply migration safely
```

### שלב 7: בדוק שהנתונים לא נעלמו
```sql
-- turbo
SELECT COUNT(*) FROM organizations;
SELECT COUNT(*) FROM nexus_users;
```

### שלב 8: רק אחרי בדיקה - deploy לפרודקשן
```bash
# turbo
npx prisma migrate deploy --schema prisma/schema.prisma
```

---

## 🔧 דוגמאות ל-Safe Migrations

### דוגמה 1: שינוי שם עמודה (בלי אובדן נתונים)
```sql
-- ❌ לא נכון (Prisma יעשה DROP + CREATE):
ALTER TABLE organizations DROP COLUMN old_name;
ALTER TABLE organizations ADD COLUMN new_name TEXT;

-- ✅ נכון (שומר נתונים):
ALTER TABLE organizations RENAME COLUMN old_name TO new_name;
```

### דוגמה 2: הוספת NOT NULL לעמודה קיימת
```sql
-- ❌ לא נכון (ייכשל אם יש NULL):
ALTER TABLE organizations ALTER COLUMN email SET NOT NULL;

-- ✅ נכון (שלבים):
-- שלב 1: מלא ערכי default
UPDATE organizations SET email = 'noreply@example.com' WHERE email IS NULL;

-- שלב 2: הוסף constraint
ALTER TABLE organizations ALTER COLUMN email SET NOT NULL;
```

### דוגמה 3: מחיקת עמודה
```sql
-- ❌ לא נכון (אובדן נתונים):
ALTER TABLE organizations DROP COLUMN old_column;

-- ✅ נכון (backup קודם):
-- שלב 1: גבה את הנתונים
CREATE TABLE organizations_backup_old_column AS
SELECT id, old_column FROM organizations;

-- שלב 2: מחק
ALTER TABLE organizations DROP COLUMN old_column;
```

---

## 📊 בדיקת שלמות נתונים

### לאחר כל migration - הרץ:
```sql
-- בדוק מספר שורות
SELECT 
  'organizations' as table_name, 
  COUNT(*) as row_count 
FROM organizations
UNION ALL
SELECT 'nexus_users', COUNT(*) FROM nexus_users
UNION ALL
SELECT 'social_users', COUNT(*) FROM social_users;

-- בדוק NULL values בעמודות קריטיות
SELECT COUNT(*) as nulls_found
FROM organizations
WHERE id IS NULL OR name IS NULL;
```

---

## 🆘 אם כבר קרה אסון - Rollback

### אם יש migration אחרון:
```bash
# חזור למצב הקודם
npx prisma migrate resolve --rolled-back [migration_name]
```

### אם אין - restore מ-backup:
```bash
# טען מגיבוי (אם יש)
psql $DATABASE_URL < backups/organizations_backup.sql
```

---

## 🎯 סיכום

1. **תמיד** גבה לפני שינוי סכמה
2. **תמיד** בדוק את ה-migration SQL לפני הרצה
3. **אל תשתמש** ב-`prisma db push` על נתונים אמיתיים
4. **תמיד** בדוק שלמות נתונים אחרי migration
5. **אחסן** backups קבועים

**זכור: נתוני משתמשים = העסק שלך** 💰
