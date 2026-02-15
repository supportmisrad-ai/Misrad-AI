# 🔄 Production Database Migration Sync

## מטרה
יישור ה-Production DB למצב DEV הנקי עם 35 מיגרציות.

## מצב נוכחי
- ✅ DEV: נקי, 35 מיגרציות, הכל עובד
- ⚠️ PROD: Dirty State, טבלאות קיימות ללא היסטוריית מיגרציות תואמת
- 📊 נתונים: 16 ארגונים + משתמש אחד (יצחק) - טסטים בלבד

## שלבי התהליך

### 1️⃣ הכנה וגיבוי
```bash
# גיבוי מלא של Production לפני שינויים
node scripts/prod-migration-sync/01-backup-production.js
```

### 2️⃣ בדיקת מצב נוכחי
```bash
# בדיקה מה קיים ב-_prisma_migrations
node scripts/prod-migration-sync/02-check-migrations-status.js
```

### 3️⃣ ניקוי והתחלה מחדש
```bash
# ניקוי _prisma_migrations (אופציונלי - רק אם יש בעיות)
node scripts/prod-migration-sync/03-clean-migrations-table.js
```

### 4️⃣ Baseline
```bash
# סימון המיגרציות הקיימות כ-applied
npx dotenv -e .env.prod_backup -- prisma migrate resolve --applied "20260126000000_init"
```

### 5️⃣ Deploy חדש
```bash
# הרצת כל המיגרציות החדשות
npx dotenv -e .env.prod_backup -- prisma migrate deploy
```

### 6️⃣ אימות
```bash
# בדיקה שהכל תקין
node scripts/prod-migration-sync/06-verify-sync.js
```

## ⚠️ אזהרות
- יש גיבוי לפני כל פעולה
- הנתונים הם טסטים בלבד
- אם משהו משתבש - יש rollback script

## 🔗 קישורים
- [Prisma Migrate Resolve](https://www.prisma.io/docs/orm/reference/prisma-cli-reference#migrate-resolve)
- [Baseline Documentation](https://www.prisma.io/docs/guides/database/production-troubleshooting#baseline-your-production-environment)
