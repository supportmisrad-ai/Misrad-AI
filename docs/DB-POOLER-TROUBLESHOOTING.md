# מדריך פתרון בעיות חיבור ל-Supabase Pooler

## הבעיה: "Can't reach database server at ...pooler.supabase.com:6543"

כאשר אתה רואה את השגיאה הזו בלוגים של Prisma, זה אומר שהאפליקציה לא מצליחה להתחבר ל-PgBouncer (Pooler) של Supabase.

---

## פתרון מיידי (30 שניות)

### אופציה 1: העדף חיבור ישיר (מומלץ ל-DEV)

הוסף ל-`.env.local`:

```env
# קיים
DATABASE_URL=postgresql://...:6543/postgres  # Pooler (לא עובד כרגע)
DIRECT_URL=postgresql://...:5432/postgres    # חיבור ישיר

# חדש - העדף חיבור ישיר
MISRAD_PRISMA_PREFER_DIRECT=true
```

**מה זה עושה?** המערכת תשתמש אוטומטית ב-DIRECT_URL במקום ב-DATABASE_URL עם Pooler.

### איפה מוצאים את DIRECT_URL?

1. כנס ל-[Supabase Dashboard](https://supabase.com/dashboard)
2. בחר את הפרויקט שלך
3. Project Settings → Database
4. תחת "Connection String" בחר **"PSQL"** (לא "Pooler")
5. העתק את ה-URL - זה DIRECT_URL שלך (פורט 5432)

---

## אופציה 2: הוסף IP ל-Whitelist (פתרון שורשי ל-Pooler)

אם אתה רוצה להמשיך להשתמש ב-Pooler (מומלץ לייצור):

1. מצא את ה-IP הציבורי שלך:
   ```powershell
   # PowerShell
   (Invoke-WebRequest -Uri "https://api.ipify.org?format=json").Content | ConvertFrom-Json | Select-Object -ExpandProperty ip
   ```

2. כנס ל-Supabase Dashboard → Database → Network Restrictions

3. הוסף את ה-IP שלך בפורמט:
   ```
   1.2.3.4/32
   ```

4. לחץ "Save"

5. המתן 2-3 דקות ונסה שוב

---

## אבחון מתקדם

הרץ את סקריפט האבחון:

```powershell
node scripts/diagnose-db-connection.js
```

הסקריפט יבדוק:
- האם DATABASE_URL/DIRECT_URL מוגדרים נכון
- האם ה-IP שלך ב-Whitelist
- חיבור בדיקה לשני ה-URLs
- המלצות ספציפיות למצב שלך

---

## מנגנון Fallback האוטומטי (כבר מוטמע במערכת)

המערכת שלך כוללת מנגנון חכם שמנסה לזהות בעיות Pooler:

```typescript
// lib/prisma-database-url.ts
כאשר MISRAD_PRISMA_PREFER_DIRECT=true:
→ בודק אם DIRECT_URL קיים ואינו Pooler
→ אם כן, משתמש בו
→ אם לא, נשאר עם DATABASE_URL המקורי
```

**היתרונות:**
- ✅ לא צריך לשנות קוד
- ✅ פועל מיד עם הגדרת env var
- ✅ בטוח לשימוש ב-DEV וב-PROD
- ✅ ניתן לבטל בכל עת (להסיר את ה-env var)

---

## תרחישים נפוצים

### סצנריו 1: עובד מהבית (IP דינמי)

**פתרון:** השתמש ב-`MISRAD_PRISMA_PREFER_DIRECT=true`

ה-IP משתנה? לא בעיה - החיבור הישיר לא דורש Whitelist.

### סצנריו 2: משרד עם IP קבוע

**פתרון:** הוסף את IP המשרד ל-Whitelist ב-Supabase

יתרון: Pooler עובד, connection pooling אופטימלי.

### סצנריו 3: PRODUCTION (Vercel)

**חשוב:** ב-Vercel אין בעיית IP כי זה environment מנוהל.

אם יש בעיה ב-PROD:
1. בדוק [Supabase Status](https://status.supabase.com/)
2. ודא שה-pooler מוגדר נכון ב-Vercel env vars
3. השתמש ב-Prisma Accelerate (prisma://) כחלופה

---

## חיבור String Templates

### DEV (עבודה מקומית):
```env
# Option A: ישיר (פשוט, לא דורש whitelist)
DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT_ID.supabase.co:5432/postgres

# Option B: Pooler + fallback לישיר (מומלץ)
DATABASE_URL=postgresql://postgres:PASSWORD@aws-1-ap-south-1.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres:PASSWORD@db.PROJECT_ID.supabase.co:5432/postgres
MISRAD_PRISMA_PREFER_DIRECT=true
```

### PRODUCTION (Vercel):
```env
# Pooler (מומלץ לייצור - connection pooling)
DATABASE_URL=postgresql://postgres:PASSWORD@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10

# או Prisma Accelerate (אופציונלי - edge caching + pooling)
DATABASE_URL=prisma://accelerate.prisma-data.net/?api_key=...
```

---

## בדיקה שאחרי התיקון

```powershell
# 1. עצור את ה-dev server אם רץ

# 2. הרץ אבחון
node scripts/diagnose-db-connection.js

# 3. הרץ את האפליקציה
npm run dev

# 4. בדוק בלוגים - אתה אמור לראות:
# [Prisma] protocol=postgresql:// accelerate=false pooler=false connection_limit=default pool_timeout=default
# או אם משתמש ב-pooler:
# [Prisma] protocol=postgresql:// accelerate=false pooler=true connection_limit=3 pool_timeout=10
```

---

## FAQ

**Q: האם DIRECT_URL בטוח לשימוש?**  
A: כן, זה חיבור TLS מוצפן ישיר ל-PostgreSQL. ההבדל היחיד הוא שאין PgBouncer באמצע.

**Q: האם Pooler טוב יותר?**  
A: בסביבות serverless (Vercel) - כן, כי הוא מנהל connection pooling טוב יותר. בסביבת dev מקומית - לא ממש משנה.

**Q: למה Supabase חוסם את ה-IP שלי?**  
A: זה מנגנון אבטחה. כברירת מחדל רק IPs במאגר המורשים יכולים להתחבר.

**Q: האם אני צריך להגדיר את שניהם?**  
A: לא חובה, אבל מומלץ:
- `DATABASE_URL` עם Pooler (לשימוש כללי)
- `DIRECT_URL` ללא Pooler (ל-migrations ו-fallback)

---

## קישורים מהירים

- [Supabase Dashboard](https://supabase.com/dashboard)
- [Supabase Status](https://status.supabase.com/)
- [Prisma Connection Docs](https://www.prisma.io/docs/orm/overview/databases/supabase)

---

## תמיכה

אם הבעיה נמשכת:
1. הרץ `node scripts/diagnose-db-connection.js`
2. העתק את הפלט
3. בדוק את הלוגים המלאים
4. פנה עם המידע הזה
