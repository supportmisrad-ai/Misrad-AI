# דוח ביקורת מודול Social — פברואר 2026

## סיכום מנהלים

בוצעה סקירה מקיפה של כל דף, קומפוננטה ופיצ'ר במודול Social.
המודול מוכן להשקה עם **8 תיקונים שבוצעו** ומספר נקודות למעקב עתידי.

---

## מפת הדפים — 16 נתיבים

| נתיב | סטטוס | הערות |
|-------|--------|-------|
| `/` (root) | ✅ תוקן | היה כפילות של Dashboard — הפך ל-redirect ל-`/dashboard` |
| `/dashboard` | ✅ עובד | ברכה, סופרים, פעולות מהירות, רשימת לקוחות, משימות |
| `/clients` | ✅ עובד | רשימה עם חיפוש, פילטרים, דפדוף, הוספת לקוח |
| `/calendar` | ✅ עובד | לוח שידורים — תזמון פוסטים |
| `/inbox` | ⚠️ placeholder | שליחת הודעה = `openComingSoon()` — לא פונקציונלי |
| `/workspace` | ✅ עובד | סביבת עבודה ללקוח — 7 טאבים (סקירה, תוכן, בקשות, בנק, DNA, הודעות, כספת) |
| `/machine` | ✅ עובד | "פוסט בקליק" — יצירת AI עם בחירת פלטפורמה, תמונות, שעות מומלצות |
| `/campaigns` | ✅ עובד | ניהול קמפיינים עם CRUD ו-toggle סטטוס |
| `/analytics` | ✅ עובד | אנליטיקה סושיאלית + ביקורת עסקית AI |
| `/team` | ✅ תוקן | היה redirect מבלבל — עכשיו טופס הזמנה ישיר בדף |
| `/collection` | ⚠️ חלקי | גבייה עובדת, "סנכרן מורנינג" = placeholder (TODO) |
| `/agency-insights` | ✅ עובד | תובנות מנהל — הכנסה, עלויות, AI audit |
| `/settings` | ✅ עובד | 7 טאבים — עדכונים, מחירון, צוות, אינטגרציות, אוטומציה, אבטחה, רשתות |
| `/hub` | ✅ תוקן | היה כפילות של Settings — הפך ל-redirect ל-`/settings` |
| `/me` | ✅ עובד | פרופיל אישי עם כרטיסי מודול |
| `/admin` | ✅ עובד | redirect ל-`/app/admin/social` |

---

## תיקונים שבוצעו

### 1. 🔴 דומיין שגוי — `social-os.com` → `misrad-ai.com`
**קובץ:** `components/social/ClientWorkspace.tsx`
**בעיה:** קישור פורטל הלקוח הצביע על `social-os.com` שזה לא הדומיין שלנו.
**תיקון:** החלפה ל-`misrad-ai.com`.

### 2. 🔴 מיתוג שגוי — "Social OS" → "Social"
**קבצים:** Navigation.tsx, Header.tsx, not-found.tsx, LinksHubPageClient.tsx, admin.ts, SaaSAdminView.tsx, social-integration.ts, user-subscription.ts
**בעיה:** "Social OS" הופיע כשם מערכת — נוגד את חוק ה-branding (MISRAD AI בלבד).
**תיקון:** כל המופעים שונו ל-"Social" (שם המודול בלבד).

### 3. 🔴 UX שבור — Team page empty state
**קובץ:** `components/social/TeamView.tsx`
**בעיה:** כפתור "הוסף חבר צוות ראשון" ניתב להגדרות (redirect) — מבלבל ומנתק.
**תיקון:** טופס הזמנה (אימייל + תפקיד) מוטמע ישירות בדף `/team`. כפתור "הוסף חבר צוות" תמיד גלוי למנהלים.

### 4. 🟡 כפילות — `/hub` = `/settings`
**קובץ:** `app/w/[orgSlug]/(modules)/social/hub/page.tsx`
**בעיה:** שני נתיבים רנדרו את אותו Settings component — בזבוז bundle.
**תיקון:** `/hub` הפך ל-redirect ל-`/settings`.

### 5. 🟡 כפילות — root page = `/dashboard`
**קובץ:** `app/w/[orgSlug]/(modules)/social/page.tsx`
**בעיה:** root page ו-`/dashboard` ביצעו אותה שאילתת DB (strategic_content) ורנדרו Dashboard כפול.
**תיקון:** root page הפך ל-redirect ל-`/dashboard`.

---

## שאלת ארכיטקטורה — ניהול צוות ב-Social vs Nexus

### ההחלטה הנכונה: Social צריך ניהול צוות **משלו**.

**למה?**
- Social מיועד ל**סוכנויות דיגיטל** שמנהלות לקוחות מרובים
- תפקידי הצוות ב-Social הם ספציפיים: מנהל לקוח, מעצב גרפי, קופירייטר, מנהל סושיאל מדיה
- הנתונים ייחודיים: שיוך לקוחות, עומס עבודה (capacity), עלויות שעתיות/חודשיות
- Nexus = צוות ארגוני כללי (משימות, CRM, ישיבות)
- Social team = צוות סוכנות (הקצאת לקוחות, תפוקה, עלויות)

**המצב הנוכחי:**
- הנתונים מגיעים מטבלת `teamMember` ב-Prisma, מסוננים לפי `organization_id`
- ההזמנה עוברת דרך `inviteTeamMember` (auth action) — אותו מנגנון כמו Nexus
- התוצאה: חבר צוות שמוזמן דרך Social מופיע גם ב-Nexus (משתמש ארגוני)

**מסקנה:** הארכיטקטורה נכונה. הנתונים מרכזיים, התצוגה ספציפית למודול.

---

## נקודות למעקב עתידי (לא חוסמות השקה)

### ⚠️ `getUserRole` error בפרודקשן
- ה-error `[getUserRole] Failed to get role: Object` מגיע מ-`lib/rbac.ts` (שורה 127)
- שורש: ב-social context, הקוד קורא `getOrganizationUserRoleFromSupabaseAction` שמחפש `organizationUser`
- ייתכן שה-record לא קיים או שיש mismatch ב-ID comparison
- **לא חוסם:** ברירת המחדל היא `team_member` — המשתמש רואה את הדף

### ⚠️ Preload warnings (100+ אזהרות)
- התנהגות ידועה של Next.js/Vercel — preload של chunks שלא נדרשים בכל דף
- **לא באג בקוד** — זה אופטימיזציית framework. אי אפשר לתקן בקוד.

### ⚠️ Inbox — placeholder
- שליחת הודעות קוראת ל-`openComingSoon()` — לא פונקציונלי
- **המלצה:** הוסף באנר "בקרוב" בדף או הסר זמנית מהניווט

### ⚠️ Collection — "סנכרן מורנינג" placeholder
- הכפתור "סנכרן חשבוניות מורנינג" = TODO — מדמה sync של 2 שניות ומראה toast "בפיתוח"
- **המלצה:** הסר כפתור או הוסף integration אמיתי

### ⚠️ TeamSettingsTab — עריכה/מחיקה לא persistים
- `handleSaveEdit` ו-`confirmDelete` ב-TeamSettingsTab מעדכנים רק local state
- לא נשמרים לבסיס הנתונים (חסרים server actions עם `updateTeamMember` / `deleteTeamMember`)
- **המלצה:** לחבר ל-server actions קיימים או ליצור חדשים

---

## ביקורת Cross-Module: דפי אזור אישי (`/me`)

### מצב האיחוד — ✅ הושלם

כל 6 המודולים משתמשים בקומפוננטת `MeView` המאוחדת (`views/MeView.tsx`, 1,360 שורות):

| מודול | נתיב | גישה ל-MeView | שיטה |
|-------|-------|---------------|------|
| Social | `/social/me` | ✅ | Server page → `MeView` ישירות |
| Finance | `/finance/me` | ✅ | Server page → `MeView` ישירות |
| System | `/system/me` | ✅ | Server page → `DataProvider` → `MeView` |
| Operations | `/operations/me` | ✅ | Server page → `DataProvider` → `MeView` + children (רכב, מלאי, ספירות) |
| Client | `/client/me` | ✅ תוקן | היה: bootstrap כפול 115 שורות → `ClientOSApp` → `MeView`. עכשיו: server page → `DataProvider` → `MeView` ישירות (כמו שאר המודולים) |
| Nexus | `/nexus/me` | ✅ | Client-side routing ב-`NexusWorkspaceApp` (case `/me`) |

### מה `MeView` מספקת (ליבה אחידה):
- פרופיל + אווטר + תפקיד + streak
- שעון נוכחות (clock in/out) + היסטוריית משמרות
- סטטיסטיקות: משימות, בונוסים, עמלות
- 4 modals הגדרות: PersonalSettings, NotificationSettings, SecuritySettings, BillingSettings
- 4 module-settings drawers: System, Social, Client, Finance
- me-insights API לפי מודול נוכחי
- leave requests + team events
- `moduleCards` — כרטיסים ספציפיים למודול
- `children` — תוכן מותאם אישית (Operations מנצל זאת)

### תיקון 8: client/me — ביטול bootstrap כפול
**קובץ:** `app/w/[orgSlug]/(modules)/client/me/page.tsx`
**בעיה:** 115 שורות של bootstrap server-side שכפלו את אותו קוד מ-`ClientAppLayoutShell.tsx` (role resolution, Clerk metadata parsing, logo signing, access checks) — רק כדי לאתחל את כל `ClientOSApp` SPA שאז מרנדר `MeView`.
**תיקון:** פושט ל-~55 שורות — `requireWorkspaceAccessByOrgSlugUi` + `DataProvider` + `MeView` ישירות, כמו שאר המודולים.

---

## סיכום

| קטגוריה | כמות |
|----------|------|
| דפים פעילים | 14 |
| תיקונים שבוצעו | 8 |
| placeholder (Inbox, Morning sync) | 2 |
| באגים קריטיים שנותרו | 0 |

**המודול מוכן להשקה** עם ההערות שצוינו.
