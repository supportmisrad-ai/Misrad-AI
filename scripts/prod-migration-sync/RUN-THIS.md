# 🚀 יישור Production למצב DEV - מדריך הרצה

## 📋 סטטוס נוכחי
- ✅ **DEV:** נקי, 35 מיגרציות, כל הטבלאות קיימות
- ⚠️ **PROD:** Dirty State, טבלאות קיימות ללא היסטוריית מיגרציות תואמת
- 📊 **נתונים:** 16 ארגונים + יצחק (טסטים בלבד - בטוח למחוק)

## 🎯 מטרה
סנכרון מלא של Production ל-DEV עם 35 מיגרציות נקיות.

---

## ⚡ אופציה 1: הרצה אוטומטית (מומלץ)

הרץ את הסקריפט המאסטר שעושה הכל בסדר הנכון:

```bash
npx dotenv -e .env.prod_backup -- node scripts/prod-migration-sync/master-sync.js
```

הסקריפט יבצע:
1. ✅ גיבוי מלא
2. ✅ בדיקת מצב נוכחי
3. ✅ ניקוי טבלת מיגרציות (עם אישור)
4. ✅ Baseline למיגרציות הקיימות
5. ✅ Deploy מיגרציות חדשות
6. ✅ אימות סופי

---

## 🔧 אופציה 2: הרצה ידנית שלב-שלב

### שלב 1️⃣: גיבוי (חובה!)
```bash
npx dotenv -e .env.prod_backup -- node scripts/prod-migration-sync/01-backup-production.js
```
**פלט צפוי:** קובץ גיבוי JSON ב-`backups/prod-migration-sync/`

---

### שלב 2️⃣: בדיקת מצב נוכחי
```bash
npx dotenv -e .env.prod_backup -- node scripts/prod-migration-sync/02-check-migrations-status.js
```
**פלט צפוי:**
- רשימת מיגרציות רשומות ב-DB
- רשימת מיגרציות בתיקייה
- ניתוח הבדלים

---

### שלב 3️⃣: ניקוי טבלת מיגרציות (אופציונלי)
⚠️ **הרץ רק אם יש מיגרציות עודפות/מלוכלכות!**

```bash
npx dotenv -e .env.prod_backup -- node scripts/prod-migration-sync/03-clean-migrations-table.js
```
הסקריפט יבקש אישור לפני מחיקה.

---

### שלב 4️⃣: Baseline - סימון מיגרציות כמיושמות

**אופציה A: Baseline אוטומטי לכל המיגרציות**
```bash
npx dotenv -e .env.prod_backup -- node scripts/prod-migration-sync/04-baseline-migrations.js
```

**אופציה B: Baseline ידני למיגרציה ראשונה בלבד**
```bash
npx dotenv -e .env.prod_backup -- npx prisma migrate resolve --applied "20260126000000_init"
```

---

### שלב 5️⃣: Deploy מיגרציות חדשות
```bash
npx dotenv -e .env.prod_backup -- node scripts/prod-migration-sync/05-deploy-migrations.js
```
**או ישירות:**
```bash
npx dotenv -e .env.prod_backup -- npx prisma migrate deploy
```

---

### שלב 6️⃣: אימות סופי
```bash
npx dotenv -e .env.prod_backup -- node scripts/prod-migration-sync/06-verify-sync.js
```
**פלט צפוי:**
- ✅ כל 35 המיגרציות מיושמות
- ✅ כל הטבלאות קיימות
- ✅ עמודות חדשות (שבת, SaaS) קיימות
- ✅ 16 ארגונים עם חבילת the_mentor

---

## 🆘 Rollback במקרה של בעיה

אם משהו השתבש, אפשר לשחזר מהגיבוי:

```bash
npx dotenv -e .env.prod_backup -- node scripts/prod-migration-sync/07-rollback.js backups/prod-migration-sync/backup-[TIMESTAMP].json
```

---

## ✅ סימני הצלחה

אחרי שהכל עובד, תראה:
- ✅ `prisma migrate status` מדווח "Database schema is up to date!"
- ✅ טבלת `_prisma_migrations` מכילה 35 רשומות
- ✅ `social_organizations` כולל עמודות `is_shabbat_protected`, `subscription_plan`, `subscription_status`
- ✅ טבלת `nexus_onboarding_settings` קיימת
- ✅ 16 ארגונים עם `subscription_plan = 'the_mentor'`

---

## 🔍 בדיקות נוספות

### בדיקה מהירה של Prisma:
```bash
npx dotenv -e .env.prod_backup -- npx prisma migrate status
```

### בדיקת טבלאות ישירות:
```bash
npx dotenv -e .env.prod_backup -- node scripts/check-table-exists.js social_organizations
npx dotenv -e .env.prod_backup -- node scripts/check-table-exists.js nexus_onboarding_settings
```

### בדיקת ארגונים עם חבילות:
```bash
npx dotenv -e .env.prod_backup -- node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$queryRaw\`
  SELECT slug, name, subscription_plan, subscription_status 
  FROM social_organizations 
  ORDER BY created_at
\`.then(console.log).finally(() => prisma.\$disconnect());
"
```

---

## 📝 הערות חשובות

1. **גיבוי חובה** - אל תדלג על שלב 1
2. **אישור ידני** - סקריפט 03 (ניקוי) מבקש אישור מפורש
3. **Baseline אחת** - אל תריץ Baseline פעמיים על אותן מיגרציות
4. **בדיקת תוצאות** - הרץ סקריפט 06 (verify) לפני שמסיים
5. **Rollback זמין** - אם משהו משתבש, יש דרך חזרה

---

## 🐛 פתרון בעיות נפוצות

### שגיאה: "Migration already recorded"
👉 המיגרציה כבר רשומה - דלג עליה או נקה את הטבלה (סקריפט 03)

### שגיאה: "Database schema is not in sync"
👉 הרץ `prisma migrate deploy` או סקריפט 05

### שגיאה: "Pooler detected"
👉 ודא ש-`DIRECT_URL` מוגדר ב-`.env.prod_backup`

### שגיאה: "Table already exists"
👉 זה תקין! הרץ Baseline (סקריפט 04) כדי לסמן אותה כמיושמת

---

## 📞 צור קשר

אם יש בעיה או שאלה - שאל אותי ואני אעזור! 🚀
