# בדיקות (Testing)

מסמך זה מתאר *בדיוק* איך מריצים את בדיקות ה־E2E (Playwright) בפרויקט, כולל כל משתני הסביבה והתרחישים (Login אוטומטי / Login ידני / Reuse storageState).

> חשוב: בפרויקט הזה בדיקות Playwright מרימות את שרת ה־Next (dev) לבד דרך `webServer` בקובץ `playwright.config.ts`.

## דרישות מקדימות

- Node.js (לפי `package.json`: נדרש Node >= 24)
- `npm install` (כדי להוריד תלויות)
- משתני סביבה ל־Clerk ול־DB/Backends כפי שהמערכת דורשת (בדרך כלל דרך `.env.local`)

## איפה מוגדרים בדיקות Playwright

- **Playwright Config**: `playwright.config.ts`
  - `testDir`: `tests/e2e`
  - `webServer.command`: `npm run dev`
  - `webServer.url`: `E2E_BASE_URL` (ברירת מחדל: `http://localhost:4000`)
  - `use.storageState`: נקבע לפי `E2E_STORAGE_STATE` או ברירת מחדל `test-results/storageState.json`
  - `globalSetup`: `tests/e2e/global-setup.ts`

- **Global Setup (התחברות/Storage State)**: `tests/e2e/global-setup.ts`

## קבצי Environment

### ברירת מחדל
ברירת המחדל של Playwright היא לטעון משתני סביבה מהקובץ:
- `.env.test`

זה מוגדר בשורה:
- `dotenv.config({ path: process.env.E2E_ENV_FILE || '.env.test', override: overrideEnv });`

### העדפת משתני CLI על פני `.env.test`
כדי לאפשר למשתני סביבה שהרצת ב־CLI לנצח את `.env.test`, יש דגל:
- `E2E_ENV_OVERRIDE=1`

ברירת מחדל: `E2E_ENV_OVERRIDE` כבוי.

### קובץ env חלופי
אפשר להצביע על קובץ env אחר באמצעות:
- `E2E_ENV_FILE=...`

דוגמה:
- `E2E_ENV_FILE=.env.test.local`

## משתני סביבה (E2E)

אלו המשתנים המרכזיים שהבדיקות משתמשות בהם (חלקם חובה וחלקם אופציונליים):

### חובה מעשית לרוב הטסטים
- `E2E_BASE_URL`
  - ברירת מחדל: `http://localhost:4000`
  - חייב להתאים לפורט שבו `npm run dev` רץ (בפרויקט זה: `4000`).

- `E2E_ORG_SLUG`
  - ערך ה־orgSlug שנמצא בנתיבים `/w/{orgSlug}/...`
  - בדוגמא מה־`.env.test`: UUID.

### התחברות (Login)
יש 3 מצבים עיקריים:

#### מצב 1: Login אוטומטי (ברירת מחדל)
משתמש ב־`E2E_EMAIL` + `E2E_PASSWORD` ומבצע flow התחברות דרך `/login`.
- `E2E_SKIP_LOGIN=0`
- `E2E_MANUAL_LOGIN=0`
- **חובה**:
  - `E2E_EMAIL`
  - `E2E_PASSWORD`

#### מצב 2: Login ידני (Manual) כדי ליצור storageState
מפעיל חלון התחברות (בדרך כלל עם Google), מחכה לעוגיות Clerk, ואז שומר `storageState`.
- `E2E_MANUAL_LOGIN=1`

אופציונלי (אבל מומלץ ל־Manual):
- `E2E_LOGIN_HEADED=1`
- `E2E_LOGIN_SLOWMO=200` (או ערך אחר)

אופציונלי:
- `E2E_AFTER_LOGIN_PATH`
  - אם לא מוגדר: ברירת מחדל היא `/w/{orgSlug}/system` (אם יש `E2E_ORG_SLUG`) אחרת `/`.

#### מצב 3: דילוג על Login והסתמכות על storageState קיים (Reuse)
הבדיקות לא מבצעות login בכלל, ומצפות שקיים קובץ `storageState` תקין.
- `E2E_SKIP_LOGIN=1`

> חשוב: ב־`global-setup.ts` יש בדיקה שה־storageState באמת מכיל עוגיות Clerk תקינות. אם לא, הריצה תיכשל עם הודעה שמסבירה להריץ פעם אחת עם `E2E_MANUAL_LOGIN=1`.

### תפעול השרת ש-Playwright מרים
- `E2E_RESTART_SERVER=1`
  - מאלץ את Playwright לא לעשות reuse לשרת קיים (אם כבר רץ) ולהרים חדש.

### Entitlements (בייפאס E2E)
- `E2E_BYPASS_MODULE_ENTITLEMENTS=1`
  - מאפשר לעבור מסכי no-access של מודולים בסביבת E2E.

### Storage State
- `E2E_STORAGE_STATE`
  - אם לא מוגדר: `test-results/storageState.json`

> הערה אבטחתית: קבצי storageState מכילים cookies/session. הם **אסורים** לקומיט. הקבצים הללו הוכנסו ל־`.gitignore`.

## פקודות ריצה

> כל הדוגמאות כאן הן ל־PowerShell (Windows).

### התקנת תלויות
```powershell
npm install
```

### הרצת טסט בודד (לדוגמה System Home)
```powershell
npm run test:e2e -- tests/e2e/system/system-home.spec.ts --project=chromium
```

## בדיקת Tenant Guard / Tenant Isolation (קריטית)

בדיקה זו מאמתת Tenant Isolation דרך ה-APIים הפנימיים (כולל Tenant Guard של Prisma). אם מופעלת שכבת RLS ב-Supabase, הבדיקה מכסה גם את `current_organization_id()` ואת הוצאת ה-Org ID מה־Clerk JWT template כדי לוודא שאין דליפה בין טננטים.

הטסט:
- `tests/e2e/security/tenant-isolation.spec.ts`

### דרישות מקדימות
- אם בודקים גם RLS של Supabase: להגדיר ב־`.env.local` (או env ב־CLI): `CLERK_SUPABASE_JWT_TEMPLATE=supabase`
- להגדיר 2 משתמשים אמיתיים ב־Clerk:
  - Victim: `E2E_EMAIL` / `E2E_PASSWORD`
  - Attacker: `E2E_ATTACKER_EMAIL` / `E2E_ATTACKER_PASSWORD`
- `E2E_API_KEY` תואם ל־API routes תחת `/api/e2e/*`

### מומלץ: ליצור storageState נפרד ל‑Victim ול‑Attacker

> קבצי storageState מכילים cookies/session ולכן אסור לקומיט.

#### יצירת Victim storageState
```powershell
$env:E2E_LOGIN_HEADED="1"
$env:E2E_AUTH_EMAIL=$env:E2E_EMAIL
$env:E2E_AUTH_PASSWORD=$env:E2E_PASSWORD
$env:E2E_STORAGE_STATE="tests/e2e/.auth/victim.storageState.json"

npm run e2e:auth
```

#### יצירת Attacker storageState
```powershell
$env:E2E_LOGIN_HEADED="1"
$env:E2E_AUTH_EMAIL=$env:E2E_ATTACKER_EMAIL
$env:E2E_AUTH_PASSWORD=$env:E2E_ATTACKER_PASSWORD
$env:E2E_STORAGE_STATE="tests/e2e/.auth/attacker.storageState.json"

npm run e2e:auth
```

### הרצת הטסט
```powershell
$env:E2E_VICTIM_STORAGE_STATE="tests/e2e/.auth/victim.storageState.json"
$env:E2E_ATTACKER_STORAGE_STATE="tests/e2e/.auth/attacker.storageState.json"

npm run test:e2e -- tests/e2e/security/tenant-isolation.spec.ts
```

### הרצת כל בדיקות System
```powershell
npm run test:e2e -- tests/e2e/system --project=chromium
```

### פתיחת UI של Playwright
```powershell
npm run test:e2e:ui
```

### פתיחת דו"ח ריצה אחרון
```powershell
npm run test:e2e:report
```

## תרחיש מומלץ ל-Login ידני + Reuse storageState

### 1) יצירת storageState (פעם אחת)
```powershell
$env:E2E_MANUAL_LOGIN="1"
$env:E2E_LOGIN_HEADED="1"
$env:E2E_LOGIN_SLOWMO="200"
$env:E2E_SKIP_LOGIN="0"

npm run test:e2e -- tests/e2e/system/system-home.spec.ts --project=chromium
```

בחלון שייפתח:
- מבצעים התחברות (כולל Google אם צריך)
- מחכים שה־global-setup יסיים וישמור `test-results/storageState.json`

### 2) ריצה חוזרת עם reuse (ללא Login)
```powershell
$env:E2E_SKIP_LOGIN="1"
$env:E2E_MANUAL_LOGIN="0"

npm run test:e2e -- tests/e2e/system/system-home.spec.ts --project=chromium
```

## הערות חשובות / Troubleshooting

### (1) שגיאת redirect / חזרה ל-sign-in
- בדוק ש־`E2E_ORG_SLUG` נכון ויש למשתמש גישה ל־workspace.
- בדוק שה־storageState כולל עוגיית `__session` על הדומיין של האפליקציה.

### (2) אם רוצים למחוק session מקומי
- מוחקים את `test-results/storageState.json` (אם קיים).
- מריצים שוב עם `E2E_MANUAL_LOGIN=1` כדי ליצור מחדש.

### (3) Next 16 + proxy.ts
בפרויקט זה Next 16 דורש להשתמש ב־`proxy.ts` בלבד (ולא `middleware.ts`). אם שניהם קיימים בשם הפעיל, השרת יכול ליפול בעת ריצת Playwright.
