# Prisma Accelerate / Caching Layer — המלצה

## מצב נוכחי
- **182 מודלים** ב-`prisma/schema.prisma`
- `prisma generate` לוקח ~15-30 שניות (תלוי במכונה)
- Prisma Client שנוצר הוא ~4MB+ (כולל query engine)
- כל cold start של serverless function טוען את כל ה-client לזיכרון

## בעיות מזוהות

### 1. זמן `prisma generate` ארוך
עם 182 מודלים, כל `generate` לוקח משמעותית יותר מסכמה רגילה (10-30 מודלים).

### 2. גודל Client גדול
Query engine + type definitions עבור 182 מודלים = bundle size משמעותי. משפיע על:
- Cold starts ב-serverless (Vercel/Netlify)
- זיכרון runtime
- זמן build

### 3. Connection pooling
עם 10,000+ משתמשים, כל request פותח חיבור. PgBouncer עוזר אבל מוסיף מורכבות (ראו interactive transactions fix).

## פתרונות מומלצים

### שלב 1: Prisma Accelerate (מיידי, סיכון נמוך)
**מה זה:** שירות managed connection pooling + caching מבית Prisma.

**יתרונות:**
- Connection pooling מובנה (מחליף את PgBouncer)
- Global edge cache לשאילתות read-heavy
- אין צורך בשינויי קוד — רק החלפת `DATABASE_URL`
- תומך ב-interactive transactions ללא `DIRECT_URL` workaround

**מחיר:** Free tier עד 100K queries/month, $29/month ל-Pro.

**איך מפעילים:**
```bash
# 1. נרשמים ב-console.prisma.io
# 2. מקבלים Accelerate URL
# 3. מחליפים DATABASE_URL

# schema.prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")      // Accelerate URL
  directUrl = env("DIRECT_URL")        // Direct connection for migrations
}

# 4. מוסיפים extension
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["accelerate"]
}
```

### שלב 2: Query-level caching (בינוני)
עם Accelerate, אפשר להוסיף caching ברמת שאילתה:
```typescript
const settings = await prisma.coreSystemSettings.findUnique({
  where: { key: 'landing_settings' },
  cacheStrategy: { ttl: 60 },  // cache ל-60 שניות
});
```

שאילתות מומלצות ל-cache:
- `coreSystemSettings` (landing, global settings)
- `organization.findUnique` (tenant lookup)
- `organization_entitlements` (permissions)
- כל lookup שלא משתנה תכופות

### שלב 3: Schema splitting (עתידי, מורכבות גבוהה)
פיצול הסכמה ל-2-3 Prisma clients לפי domain:
- **Core client:** organizations, users, billing (~40 models)
- **Operations client:** operations_*, stock_* (~50 models)  
- **Social/Content client:** social_*, content_* (~50 models)

**יתרון:** כל client קטן יותר, generate מהיר יותר.
**חיסרון:** מורכבות ניהול, cross-schema joins לא אפשריים.

> ⚠️ **המלצה:** להתחיל עם שלב 1 (Accelerate) שנותן ROI מיידי ללא סיכון. שלב 3 רק אם יש בעיית ביצועים מוכחת.

## מדדי הצלחה
| מדד | לפני | אחרי Accelerate (צפוי) |
|------|-------|----------------------|
| Cold start | ~3s | ~1.5s |
| DB connections (peak) | 50+ | 10-15 |
| Avg query latency | 20-50ms | 5-15ms (cached) |
| `prisma generate` | ~20s | ~20s (ללא שינוי) |

## סיכום
- **מיידי:** הפעלת Prisma Accelerate — ROI גבוה, סיכון נמוך
- **קצר-בינוני:** הוספת `cacheStrategy` לשאילתות read-heavy
- **עתידי:** הערכה מחדש של schema splitting רק אם נדרש
