# דוח ביקורת מקיף — מודול System

> תאריך: 22 פברואר 2026  
> סטטוס: **בוצע + תוקן**

---

## 1. מפת המודול — כל הדפים

| נתיב | סטטוס | תיאור | הערות |
|---|---|---|---|
| `/` (workspace) | ✅ תקין | לוח בקרה ראשי (Command Center + Morning Briefing) | חמישה fetches במקביל |
| `/sales_pipeline` | ✅ תקין | לוח Kanban + תצוגת רשימה, ניהול שלבים מותאם אישית | הפיצ'ר הכי בשל במודול |
| `/sales_leads` | ⚠️ כפילות | תצוגת אנשי קשר (ContactsView) | מיותר — sales_pipeline כבר מכיל תצוגת רשימה |
| `/tasks` | ✅ תקין | משימות (משתמש ב-Nexus Tasks) | |
| `/calendar` | ✅ תקין | יומן אירועים + פגישות | שליפת טווח דינמית |
| `/dialer` | ✅ תקין | חייגן + תקשורת | |
| `/reports` | ✅ תקין | דוחות עם גרפים (Recharts) | |
| `/analytics` | ✅ תקין | AI Analytics עם פירוט פייפליין | |
| `/notifications` | ✅ תקין | מרכז התראות | |
| `/me` | ✅ תקין | פרופיל אישי | |
| `/settings` | ✅ תקין | הגדרות (GlobalProfileHub) | |
| `/headquarters` | 🔄 Redirect → `/` | — | |
| `/hub` | 🔄 Redirect → `/settings` | — | |
| `/comms` | 🔄 Redirect → `/dialer` | — | |
| `/ai_analytics` | 🔄 Redirect → `/analytics` | — | |
| `/notifications_center` | 🔄 Redirect → `/notifications` | — | |
| `/system` | 🔄 Redirect → `/settings` | — | |

---

## 2. ממצאים קריטיים (תוקנו)

### 🔴 P0 — 3 פריטי ניווט מובילים ל-404
`constants.ts` הגדיר בתפריט הצדדי 3 עמודים שלא קיימים:
- **quotes** (הצעות מחיר) — אין תיקייה/page
- **finance** (חשבוניות) — אין תיקייה/page  
- **products** (מוצרים) — אין תיקייה/page

**תיקון:** הוסרו מה-NAV_GROUPS. כשהפיצ'רים ייבנו — יתווספו חזרה.

### 🔴 P0 — קובץ `SystemLeadsClient.tsx` יתום
הקובץ קיים ברמה העליונה של המודול אך **שום page לא מייבא אותו**. הוא מכיל UI פשוט יותר של לידים עם כפתור "סגירה (Won)" ישיר — לוגיקה שסותרת את הפייפליין (שחוסם Won עד handover).

**תיקון:** הקובץ נמחק.

### 🟡 P1 — כפילות קוד מסיבית (6 פונקציות × 2-3 קבצים)
הפונקציות הבאות היו מוכפלות:
- `mapDtoToCalendarEvent` + `normalizeCalendarEventType` + `parseCalendarReminders` + `parseCalendarPostMeeting` — ב-`SystemWorkspaceClient.tsx` וגם ב-`SystemCalendarClient.tsx`
- `mapNexusTaskToUiTask` — ב-`SystemWorkspaceClient.tsx` וגם ב-`SystemTasksClient.tsx`
- `mapCampaignDto` — ב-`SystemWorkspaceClient.tsx`, `SystemAnalyticsClient.tsx`, ו-`SystemReportsClient.tsx`
- `toNexusPriority` / `toNexusStatus` — ב-`SystemWorkspaceClient.tsx` וגם ב-`SystemTasksClient.tsx`

**תיקון:** כל הפונקציות חולצו לקבצי utils משותפים תחת `components/system/utils/`.

### 🟡 P1 — Stubs שהפיצ'ר כבר קיים
- **`handleScheduleMeeting`** בפייפליין מציג toast "יתווסף בהמשך" — אבל יומן כבר עובד! → חובר לניווט ליומן.
- **`handleOpenClientPortal`** — stub → נשאר stub (עדיין לא קיים פורטל לקוח).
- **`onAddTask`** ב-LeadModal מפייפליין — stub → חובר לניווט למשימות.

### 🟡 P1 — Assignees לא נטענים בפייפליין
`getSystemLeadAssignees` מיובא אך **אף פעם לא נקרא**. ה-`assignees` שמועבר ל-`LeadModal` הוא תמיד `[]`.

**תיקון:** נוספה טעינה אוטומטית של assignees ב-useEffect.

---

## 3. ממצאים ארכיטקטוניים (לא דרשו תיקון מיידי)

### מערכת משימות כפולה
- **Tasks page** משתמש ב-`listNexusTasksByOrgSlug` (Nexus Tasks) — הטבלה הנכונה
- **system-tasks.ts** מגדיר אקשנים עם טבלת `SystemTask` נפרדת

**הערכה:** הארכיטקטורה הנוכחית נכונה. Nexus Tasks הוא המקור האמיתי. `system-tasks.ts` הוא legacy/backup ולא בשימוש ע"י שום page — אין צורך למחוק כי ייתכן שישמש בעתיד לסוג משימות שונה (system-internal tasks vs user tasks).

### `sales_leads` כפילות של `sales_pipeline`
`sales_pipeline` כבר מכיל toggle בין תצוגת board ורשימה. `sales_leads` מציג ContactsView שהוא בעצם עוד תצוגת רשימה.

**הערכה:** שני הדפים נשארים כי ContactsView נותן חוויה שונה (כרטיסיות אנשי קשר מפורטות, לא טבלה). בהשקה זה עדיין ערך מוסף. בעתיד אפשר לאחד.

### `content: []` ו-`students: []` — Dead Props
ב-`SystemWorkspaceClient.tsx`, שני ה-props האלה תמיד ריקים. הטיפוסים `Student` ו-`ContentItem` קיימים ב-`types.ts` אבל אף פעם לא מאוכלסים.

**הערכה:** לא מוחקים — הם placeholder ל-Content Machine ו-Academy שיתווספו. CommandCenter כבר מטפל בגרסיה (מסתיר סקשנים ריקים).

### 55 קומפוננטות ב-`components/system/` — רוב לא בשימוש ישיר
קומפוננטות כמו `AssetsView`, `AutomationsView`, `CatalogView`, `ClientPortalView`, `FieldManagementView`, `HRView`, `KnowledgeBaseView`, `OperationsHub`, `PartnersView` וכו' — אף אחת לא בשימוש ע"י דפי המודול הנוכחיים.

**הערכה:** לא מוחקים. אלו מוכנים לשלב הבא. אין להם import ב-pages אז לא משפיעים על bundle size (tree-shaking).

---

## 4. חוזקות הארכיטקטורה ✅

1. **ביצועים מצוינים** — Layout עושה רק access check + fire-and-forget location tracking. Data fetching ב-Suspense.
2. **Promise.all בכל מקום** — כל הדפים מבצעים שליפות מקביליות.
3. **Tenant Isolation** — כל אקשן עובר דרך `withWorkspaceTenantContext` או `requireWorkspaceAccessByOrgSlug`.
4. **Cursor-based pagination** — לידים משתמשים ב-cursor pagination נכון.
5. **Optimistic UI** — הפייפליין עושה optimistic updates עם rollback על שגיאה.
6. **Schema Fallbacks** — מטפל ב-schema mismatches בצורה מסודרת.
7. **Error Boundaries** — `ClerkProviderErrorBoundary` עוטף את ה-shell עם fallback.
8. **Mobile-first** — MobileBottomNav + Fan menu + Mobile sidebar — הכל עובד.
9. **Redirects מסודרים** — 6 redirect pages מונעים 404 מנתיבים ישנים.
10. **AI Score** — כל ליד מקבל ציון AI + הסתברות סגירה + המלצה.

---

## 5. סיכום שינויים שבוצעו

| # | שינוי | קובץ |
|---|---|---|
| 1 | הסרת 3 פריטי ניווט שבורים (quotes/finance/products) | `components/system/constants.ts` |
| 2 | מחיקת קובץ יתום SystemLeadsClient.tsx | `app/w/.../system/SystemLeadsClient.tsx` |
| 3 | חילוץ `mapDtoToCalendarEvent` + helpers לקובץ משותף | `components/system/utils/mapCalendarEvent.ts` |
| 4 | חילוץ `mapNexusTaskToUiTask` + helpers לקובץ משותף | `components/system/utils/mapTask.ts` |
| 5 | חילוץ `mapCampaignDto` לקובץ משותף | `components/system/utils/mapCampaign.ts` |
| 6 | הסרת כפילויות מ-SystemWorkspaceClient, SystemCalendarClient, SystemTasksClient, SystemAnalyticsClient, SystemReportsClient | 5 קבצים |
| 7 | חיבור Schedule Meeting מפייפליין ליומן (במקום stub) | `SystemSalesPipelineClient.tsx` |
| 8 | חיבור Add Task מפייפליין לניווט למשימות (במקום stub) | `SystemSalesPipelineClient.tsx` |
| 9 | טעינת Assignees בפייפליין | `SystemSalesPipelineClient.tsx` |
