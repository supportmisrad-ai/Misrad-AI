# חוקי פיתוח — MISRAD AI

> **מסמך זה הוא חובה לכל מתכנת שעובד על הפרויקט.**
> כל חוק כאן נובע מתקלה אמיתית שקרתה בפרודקשן או בפיתוח.
> **אל תשנה התנהגויות שמתוארות כאן בלי לקרוא את ההסבר ולקבל אישור.**

---

## 1. אימות וזהות (Clerk)

### 1.1 הרשמה חייבת לכלול `username`
**תקלה:** לופ אינסופי בהרשמה — Clerk דרש `username` כשדה חובה אבל הקוד לא שלח.
**חוק:**
- כל קריאה ל-`signUp.create()` חייבת לכלול `username` שנוצר אוטומטית
- פונקציית `generateUsername(email)` מייצרת username מהאימייל + 4 תווים רנדומליים
- אם יש 409 (username תפוס) — לנסות שוב עם username אחר
- **קבצים:** `CustomAuth.tsx`, `LoginPageClient.tsx`

### 1.2 OAuth continuation חייב לטפל ב-missing fields
**תקלה:** אחרי Google sign-up, Clerk חזר עם `missing_requirements` כי Google לא מספק username.
**חוק:**
- ב-`LoginPageClient.tsx` יש Case 5 שמטפל ב-`signUp.status === 'missing_requirements'` אחרי OAuth
- חייב לבדוק `missingFields` ולספק `username`, `first_name`, `last_name` אוטומטית
- **אסור למחוק את הלוגיקה הזו** גם אם ה-Clerk Dashboard ישתנה

### 1.3 שמירת שם קיים בוובהוק
**תקלה:** Google OAuth דרס שמות שהאדמין הגדיר ידנית.
**חוק:**
- ב-`clerk-webhook.ts`, פונקציית `getOrCreateSupabaseUserFromClerkWebhookAction` מעדיפה שם קיים על שם מ-webhook
- **אסור לשנות** את הלוגיקה של `shouldUpdateName` — היא מונעת דריסת שמות
- **קובץ:** `lib/services/auth/clerk-webhook.ts`

### 1.4 לוקליזציה לעברית
**חוק:**
- `ClerkProviderWithRouter.tsx` חייב לכלול `localization={heIL}` מ-`@clerk/localizations`
- כל הטקסטים של Clerk UI מוצגים בעברית

### 1.5 SSO Callback — מגנון זיהוי לופ
**תקלה:** SSO callback יצר לופ אינסופי של redirects.
**חוק:**
- `sso-callback/page.tsx` משתמש ב-`sessionStorage` לספור ניסיונות
- Threshold = 5 ניסיונות, grace period = 10 שניות
- **אסור להוריד את ה-threshold** — ערך נמוך גורם ל-false positives

---

## 2. בסיס נתונים (Prisma / Supabase)

### 2.1 אין `prisma db push` על production
**תקלה:** אובדן נתונים בפרודקשן.
**חוק:**
- **אסור** להשתמש ב-`prisma db push` על production או staging
- **אסור** להשתמש ב-`prisma migrate dev` ללא בדיקה קודם
- **חובה** לגבות לפני כל שינוי סכמה
- **חובה** לבדוק את ה-SQL של כל migration לפני הרצה
- ראה workflow מלא: `.windsurf/workflows/safe-schema-changes.md`

### 2.2 חיבור ישיר (DIRECT_URL) ל-migrations
**תקלה:** Prisma Migrate תקע כש-DATABASE_URL הצביע על Supabase pooler (PgBouncer, פורט 6543).
**חוק:**
- `prisma/schema.prisma` חייב לכלול `directUrl = env("DIRECT_URL")`
- DIRECT_URL חייב להצביע על פורט 5432 (חיבור ישיר)
- סקריפטים שמריצים migrations מחליפים DATABASE_URL ל-DIRECT_URL כשנגלה pooler

### 2.3 אין interactive transactions עם pooler
**תקלה:** `prisma.$transaction(async (tx) => ...)` נכשל עם `Transaction not found` דרך PgBouncer.
**חוק:**
- **אסור** להשתמש ב-interactive transactions (`$transaction(async ...)`) כשעובדים דרך pooler
- במקום: כתיבות אידמפוטנטיות ברצף (upsert/update) **או** DIRECT_URL

### 2.4 Tenant Isolation — חובה
**חוק:**
- כל query ב-Prisma חייב לעבור דרך `prisma-tenant-guard.ts`
- כל Server Action שנוגע ב-DB חייב לכלול `requireWorkspaceAccess` או `requireSuperAdmin`
- Override ל-tenant isolation דורש `withPrismaTenantIsolationOverride` עם `reason` מפורש
- סקריפט `scripts/security/scan-actions-guards.js` סורק שכל action מוגן
- **אסור** לעקוף את ה-guard ללא הסבר מתועד

### 2.5 `prisma migrate dev --create-only` יכול להיכשל עם P3006
**תקלה:** Shadow database נכשל עם `type already exists`.
**חוק:**
- אם `migrate dev --create-only` נכשל, צור migration ידנית:
  - צור תיקייה `prisma/migrations/<timestamp>_<name>/migration.sql`
  - כתוב SQL עם `IF NOT EXISTS`
  - הרץ עם `prisma migrate deploy` (ללא shadow DB)

### 2.6 Prisma generate — נעילת DLL ב-Windows
**תקלה:** `prisma generate` נכשל עם EPERM/EBUSY כי `query_engine.dll` נעול ע"י Next dev.
**חוק:**
- לפני `prisma generate` — סגור את שרת ה-Next dev וכל תהליכי Node
- סקריפט `scripts/prisma-generate-safe.cjs` מנסה לזהות ולדווח על הבעיה

---

## 3. אבטחה

### 3.1 אין `any` / `as any` בקוד חדש — אף פעם
**תקלה:** שימוש ב-`as any` הסתיר באגי Prisma tenant isolation.
**חוק:**
- **אסור בהחלט** להוסיף `any` או `as any` לקוד חדש
- סקריפט `scripts/security/check-no-new-prisma-as-any.cjs` נכשל ב-CI אם נמצא שימוש חדש
- אם אין ברירה — חובה להוסיף ל-allowlist עם הסבר

### 3.2 נתונים רגישים לא נשלחים ל-AI
**חוק:**
- `lib/ai-security.ts` מפלטר שדות רגישים (משכורות, עמלות, תעריפים)
- `SENSITIVE_FIELDS` = hourlyRate, monthlySalary, commissionPct, ועוד
- **אסור** לשלוח נתונים ל-AI בלי לעבור דרך `filterSensitiveData()`

### 3.3 נתיבי `/api/e2e/*` חסומים בפרודקשן
**חוק:**
- `middleware.ts` חוסם כל גישה ל-`/api/e2e/*` כש-`NODE_ENV === 'production'`
- **אסור** להסיר חסימה זו
- סקריפט `scripts/security/assert-no-prod-bypass.js` מוודא שאין bypass flags בפרודקשן

### 3.4 משתני סביבה אסורים בפרודקשן
**חוק:**
- `MISRAD_ALLOW_SCHEMA_FALLBACKS` — **אסור** בפרודקשן (מסתיר חוסר התאמת סכמה)
- `E2E_BYPASS_MODULE_ENTITLEMENTS` — **אסור** בפרודקשן (עוקף הרשאות מודולים)
- `IS_E2E_TESTING` — **אסור** בפרודקשן (מפעיל מצב בדיקות)

### 3.5 Cron routes מוגנים ב-secret
**חוק:**
- כל route תחת `/api/cron/*` חייב להשתמש ב-`cronGuard()`
- ה-guard בודק `x-cron-secret` או `Authorization: Bearer` מול `CRON_SECRET`

---

## 4. ארכיטקטורה ומבנה קוד

### 4.1 שם המערכת הוא MISRAD AI — ותו לא
**חוק:**
- **אסור** להשתמש ב-"Scale CRM" או "Nexus OS" כשמות מערכת
- Nexus הוא שם מודול (ניהול צוות, משימות, לקוחות), **לא** שם המערכת

### 4.2 `force-dynamic` בכל דף שמשתמש ב-context/provider
**תקלה:** Next.js ניסה לעשות prerender לדפים שדרשו client context (DataProvider).
**חוק:**
- כל דף שמשתמש ב-`useData`, `useAuth`, או provider אחר — חייב `export const dynamic = 'force-dynamic'`
- כל API route — חייב `export const dynamic = 'force-dynamic'`

### 4.3 מודולים ל-legacy DB — חסומים
**חוק:**
- `lib/db.ts` — כל הפונקציות Legacy (RBAC tables) חסומות עם `legacyBlocked()`
- **אסור** להשתמש בפונקציות מ-`lib/db.ts` בקוד חדש — להשתמש ב-Prisma ישירות

### 4.4 Prisma Type Assertions
**חוק:**
- `lib/prisma-type-assertions.ts` מוודא בזמן קומפילציה שהסכמה מכילה את השדות הנדרשים
- אם יש שגיאת TypeScript בקובץ הזה — להריץ `npm run prisma:generate`

### 4.5 redirects — תמיד נתיב מלא
**תקלה:** `router.push('/admin')` הוביל ל-404 כי הנתיב הנכון היה `/social-os/admin`.
**חוק:**
- כל `router.push()` חייב להכיל נתיב מלא מה-root
- **אסור** להשתמש בנתיבים יחסיים בניווט

---

## 5. שבת ומועדים

### 5.1 Shabbat Guard
**חוק:**
- API routes שמשרתים ארגונים עם `is_shabbat_protected = true` חסומים בשבת
- `shabbatGuard()` wrapper ב-`lib/api-shabbat-guard.ts` בודק לפי ארגון
- **אסור** להסיר או לעקוף את ה-guard — יש לקוחות שרוצים שהמערכת תנוח בשבת

---

## 6. אימייל והודעות

### 6.1 Resend — FROM address
**חוק:**
- כתובת השולח: `MISRAD_SUPPORT_FROM_EMAIL` (ברירת מחדל: `support@misrad-ai.com`)
- **אסור** לשנות את כתובת השולח ללא אישור — SPF/DKIM מוגדרים עבורה

---

## 7. CI / CD

### 7.1 CI רץ אוטומטית על כל PR ו-push ל-main
**חוק:**
- Build חייב לעבור
- סקריפטי אבטחה רצים:
  - `check-no-new-prisma-as-any.cjs`
  - `assert-no-prod-bypass.js`
  - `scan-actions-guards.js`
- Playwright security tests רצים
- **אסור** לדחוף קוד שלא עובר build

### 7.2 PowerShell / Windows — `npx.cmd`
**תקלה:** `npx` נחסם ע"י ExecutionPolicy ב-PowerShell.
**חוק:**
- ב-Windows PowerShell, להשתמש ב-`npx.cmd` במקום `npx`
- להימנע מ-`powershell -Command` עם `$env:VAR` — הערכים מתפרשים מוקדם מדי

---

## 8. מבנה הנתונים — מה זה מה

### 8.1 שלושה סוגי "לקוחות"
| מודל | טבלה | מהות |
|-------|-------|-------|
| `ClientClient` | `client_clients` | לקוחות *בתוך* ארגון (מודול Client OS) |
| `BusinessClient` | `business_clients` | לקוחות B2B של MISRAD AI עצמו |
| `Organization` | `social_organizations` | טננטים/ארגונים במערכת (כל ארגון = מנוי) |

### 8.2 חבילות (Plans)
מוגדרות ב-`lib/billing/pricing.ts`:
- `solo`, `the_closer`, `the_authority`, `the_operator`, `the_empire`, `the_mentor`
- **אסור** לקודד חבילות hard-coded — תמיד לקרוא מ-`pricing.ts`

### 8.3 סביבות
| סביבה | DB Region | זיהוי |
|--------|-----------|-------|
| PROD | aws-1-ap-northeast-2 (קוריאה) | `DATABASE_URL` מכיל `northeast-2` |
| DEV | aws-1-ap-south-1 (הודו) | `DATABASE_URL` מכיל `south-1` |

---

## 9. Checklist לפני Push

- [ ] `npm run build` עובר ללא שגיאות
- [ ] אין `as any` חדש (רוץ `node scripts/security/check-no-new-prisma-as-any.cjs`)
- [ ] כל Server Action חדש מוגן ב-tenant isolation
- [ ] כל API route חדש מוגן (auth / cronGuard / shabbatGuard)
- [ ] אין bypass flags פעילים (רוץ `node scripts/security/assert-no-prod-bypass.js`)
- [ ] שינויי סכמה עברו תהליך safe migration
- [ ] כל `router.push()` חדש משתמש בנתיב מלא

---

*עודכן לאחרונה: 19 פברואר 2026*
*גרסה: 1.0*
