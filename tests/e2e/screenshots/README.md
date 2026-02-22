# Screenshot Capture - MISRAD AI

סקריפט אוטומטי לצילום כל המסכים במערכת MISRAD AI.
פלט: תיקיית `screenshots/` בשורש הפרויקט, מסודר לפי מודול.

## דרישות מקדימות

1. **שרת פיתוח רץ** על `http://127.0.0.1:4000` (`npm run dev`)
2. **storageState תקין** (קובץ auth שנשמר מהתחברות קודמת)

## שלבים

### שלב 1: התחברות (פעם אחת בלבד)

פתח חלון דפדפן Chrome אמיתי, התחבר ידנית, והסקריפט ישמור את ה-session:

```powershell
$env:E2E_MANUAL_LOGIN="1"
$env:E2E_LOGIN_HEADED="1"
$env:E2E_ORG_SLUG="misrad-ai-hq"
$env:E2E_USE_EXISTING_SERVER="1"
npx.cmd playwright test setup-auth.spec.ts
```

> לאחר ההתחברות הידנית, ייווצר קובץ `tests/e2e/.auth/storageState.json`

### שלב 2: צילום כל המסכים

```powershell
$env:E2E_USE_EXISTING_SERVER="1"
$env:E2E_SKIP_LOGIN="1"
$env:E2E_ORG_SLUG="misrad-ai-hq"
npx.cmd playwright test tests/e2e/screenshots/capture-all-screens.spec.ts --timeout 600000
```

## פלט

כל התמונות נשמרות תחת `screenshots/` ישירות:

```
screenshots/
├── 00-auth/           (3 מסכים)  login, sign-in, sign-up
├── 01-lobby/          (4 מסכים)  lobby, support, tickets, billing
├── 02-system/         (17 מסכים) home, HQ, hub, leads, pipeline, calendar, tasks, analytics, AI, reports, comms, dialer, notifications, settings, config, me
├── 03-client/         (14 מסכים) home, dashboard, clients, hub, workflows, portal, cycles, email, forms, feedback, intelligence, analyzer, me
├── 04-finance/        (5 מסכים)  home, overview, invoices, expenses, me
├── 05-social/         (17 מסכים) home, dashboard, calendar, machine, collection, hub, analytics, campaigns, inbox, clients, team, workspace, settings, agency, me, admin, shabbat
├── 06-operations/     (10 מסכים) home, projects, new-project, work-orders, new-WO, contractors, inventory, attendance, settings, me
├── 07-nexus/          (14 מסכים) home, tasks, calendar, clients, team, reports, assets, brain, trash, sales, pipeline, targets, settings, me
└── 08-account/        (1 מסך)    me (אזור אישי)
```

**סה"כ: 85 מסכים** ב-1920×1080 (Full HD), full-page screenshot.

## הגדרות מתקדמות

| משתנה סביבה | ברירת מחדל | תיאור |
|---|---|---|
| `E2E_ORG_SLUG` | `misrad-ai-hq` | ה-slug של הארגון לצילום |
| `SCREENSHOT_WAIT_MS` | `2500` | זמן המתנה (ms) אחרי טעינה לפני צילום |
| `E2E_BASE_URL` | `http://127.0.0.1:4000` | כתובת השרת |

## הערות

- מסכי **auth** מצולמים ללא התחברות (הם ציבוריים)
- מסכי **nexus** משתמשים ב-client-side routing ולכן מקבלים זמן המתנה נוסף
- הסקריפט **לא** מצלם דפים שיווקיים, דפי אדמין גלובלי, או דפי landing
- כל מסך מצולם ברוחב מלא (כולל גלילה) ב-1920×1080
