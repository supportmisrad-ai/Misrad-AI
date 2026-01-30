# החלטת ארכיטקטורה: Prisma First (Tenant Isolation)

## סטטוס

מאושר.

## החלטה

כל גישה לנתונים עסקיים במערכת חייבת להתבצע דרך Prisma בלבד (כולל Server Actions ו-API Routes), כדי להסתמך על ה-Guard המובנה של Tenant Isolation.

**אסור** להשתמש ב-`supabase.from(...)` לצורך קריאה/כתיבה של נתונים עסקיים (למשל: לידים, משתמשים, חשבוניות, לקוחות, פוסטים, משימות).

## מותר להשתמש ב-Supabase רק עבור

- Storage (העלאות/הורדות קבצים)
- Realtime / Broadcast (אם קיים)
- פעולות Infrastructure/תחזוקה ייעודיות
- נתיבי E2E/בדיקות אבטחה ייעודיים

## רציונל

- שכבת Prisma אצלנו כוללת Guard שמונע שאילתות לא-מוגבלות-ארגון ומקטין משמעותית סיכוני Tenant Escape.
- שימוש מקביל ב-Prisma וב-Supabase PostgREST מכפיל סיכונים ומקשה על אכיפת סטנדרט אחיד.

## כללים אופרטיביים

- Server Actions/Routes שמבצעים `supabase.from(...)` על נתונים עסקיים חייבים להיות ממוגרים ל-Prisma.
- אין להוסיף שימושים חדשים ב-`supabase.from(...)` בקוד עסקי.
- כל קריאה ל-Prisma חייבת לכלול `where` עם `organizationId`/`organization_id` בהתאם למודל, למעט פעולות Global Admin מוגדרות.
