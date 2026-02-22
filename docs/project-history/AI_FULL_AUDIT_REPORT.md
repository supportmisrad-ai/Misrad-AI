# דוח ביקורת AI מקיף — MISRAD AI

**תאריך:** 22 פברואר 2026  
**מבצע:** ביקורת מעמיקה של כל רכיבי ה-AI במערכת  
**מטרה:** מיפוי, ניתוח ארכיטקטורה, בידוד נתונים, UI/UX, דוחות תקופתיים, והמלצות

---

## תוכן עניינים
1. [מפת AI מלאה](#1-מפת-ai-מלאה)
2. [ניתוח ארכיטקטורה ובידוד נתונים](#2-ניתוח-ארכיטקטורה-ובידוד-נתונים)
3. [ניתוח לפי מודול](#3-ניתוח-לפי-מודול)
4. [ניתוח UI/UX](#4-ניתוח-uiux)
5. [דוחות AI תקופתיים — מצב קיים וחסרים](#5-דוחות-ai-תקופתיים)
6. [ממצאים קריטיים ובעיות](#6-ממצאים-קריטיים)
7. [המלצות אסטרטגיות](#7-המלצות-אסטרטגיות)
8. [סדר עדיפויות לביצוע](#8-סדר-עדיפויות)

---

## 1. מפת AI מלאה

### 1.1 API Routes (Backend)

| # | Route | מודול | תפקיד | סטטוס |
|---|-------|-------|--------|--------|
| 1 | `/api/ai/chat` | Global | צ'אט AI מרכזי — שיווק (אנונימי) + workspace (מאומת) | ✅ פעיל, מלא |
| 2 | `/api/ai/assistant` | Global | עוזר AI — מכירות (דפי שיווק) + תמיכה (workspace) | ✅ פעיל, מלא |
| 3 | `/api/ai/analyze` | Nexus | "Nexus Brain" — BI/אנליטיקס עם סכמת JSON מובנית | ✅ פעיל |
| 4 | `/api/ai/feedback` | Global | שמירת feedback על שיחות AI | ⚠️ חלקי — רק לוג, אין שמירה ל-DB |
| 5 | `/api/ai/vision/identify` | Operations | זיהוי חלקים בתמונה (Vision AI) | ✅ פעיל |
| 6 | `/api/client-os/ai/success-recommendation` | Client OS | טיפ AI לשימור לקוח | ✅ פעיל |
| 7 | `/api/operations/ai/vision` | Operations | תיאור תמונה למילוי שדה "תיאור פריט" | ✅ פעיל |
| 8 | `/api/settings/ai-key` | Admin | בדיקת סטטוס מפתח AI | ✅ פעיל |
| 9 | `/api/workspaces/[orgSlug]/ai/transcribe` | Global | תמלול אודיו (Speech-to-Text) | ✅ פעיל |
| 10 | `/api/workspaces/[orgSlug]/ai-dna` | Global | DNA ארגוני — קריאה/עדכון | ✅ פעיל |
| 11 | `/api/workspaces/[orgSlug]/operations/work-orders/[id]/ai-summary` | Operations | סיכום AI של קריאת עבודה | ✅ פעיל |
| 12 | `/api/system/ai-history` | System | היסטוריית ניתוחים AI לכל משתמש | ✅ פעיל |
| 13 | `/api/admin/ai/brain-export` | Admin | ייצוא "מוח" AI (הגדרות/prompts) | ✅ פעיל |

### 1.2 Server Actions

| # | Action | מודול | תפקיד | סטטוס |
|---|--------|-------|--------|--------|
| 1 | `generatePostVariationsAction` | Social | יצירת 3 גרסאות לפוסט (Sales/Social/Value) | ✅ פעיל |
| 2 | `generateAIImageAction` | Social | יצירת תמונה AI | ⛔ Placeholder — מחזיר picsum.photos |
| 3 | `getTrendingOpportunitiesAction` | Social | זיהוי הזדמנויות טרנד | ⛔ Placeholder — מחזיר מערך ריק |
| 4 | `getBusinessAuditAction` | Social | ביקורת עסקית ללקוח | ⛔ Placeholder — מחזיר string ריק |
| 5 | `draftAIResponseAction` | Social | טיוטת תגובה AI | ✅ פעיל |
| 6 | `getGlobalAgencyAuditAction` | Nexus | ניתוח רווחיות סוכנות | ✅ פעיל |
| 7 | `analyzeMeetingTranscriptAction` | Client OS | ניתוח תמלול פגישה | ✅ פעיל, מתקדם מאוד |
| 8 | `generateClientInsightAction` | Nexus | תובנה אסטרטגית ללקוח | ✅ פעיל |
| 9 | `generateDailyBriefingAction` | Nexus | "Morning Protocol" — תדריך בוקר | ✅ פעיל |
| 10 | `generateSuccessRecommendationAction` | Nexus/Client | טיפ לשימור לקוח | ✅ פעיל |
| 11 | `generateSmartReplyAction` | Nexus | תשובה חכמה למייל | ✅ פעיל |
| 12 | `upsertChatSession` | Global | שמירת session שיחה | ✅ פעיל |
| 13 | `endChatSession` | Global | סיום session + feedback | ✅ פעיל |
| 14 | `saveChatMessage` | Global | שמירת הודעה בודדת | ⚠️ באג ב-SQL (INSERT+SELECT) |
| 15 | `getAIInsights` | Admin | insights על שיחות AI (SuperAdmin) | ✅ פעיל |

### 1.3 UI Components

| # | Component | מיקום | תפקיד | סטטוס |
|---|-----------|-------|--------|--------|
| 1 | `AiAssistantWidget` | `components/ai/AiAssistantWidget.tsx` | FAB עוזר AI — דפי שיווק בלבד | ✅ פעיל |
| 2 | `AiAssistantWidget` (V2) | `components/ai/AiAssistantWidgetV2.tsx` | גרסה חדשה עם streaming | ⚠️ כפילות — V1 הוא הפעיל |
| 3 | `AiWidget` | `components/ai/AiWidget.tsx` | צ'אט AI מרחף — marketing + workspace | ⚠️ כפילות נוספת |
| 4 | `AIAnalyticsView` (System) | `components/system/AIAnalyticsView.tsx` | דשבורד BI מתקדם עם גרפים | ✅ פעיל |
| 5 | `AIAnalyticsView` (Root) | `components/AIAnalyticsView.tsx` | גרסה ישנה יותר — Coming Soon | ⚠️ Placeholder |
| 6 | `AIAnalyticsView` (system.os) | `components/system/system.os/components/AIAnalyticsView.tsx` | גרסה עם דוח מזויף (setTimeout) | ⛔ Mock data — לא AI אמיתי |
| 7 | `CommandPaletteChat` | `components/command-palette/CommandPaletteChat.tsx` | צ'אט AI בתוך Command Palette | ✅ פעיל |
| 8 | `useAIModuleChat` | `components/command-palette/useAIModuleChat.ts` | Hook מרכזי לצ'אט AI per-module | ✅ פעיל, ליבה |
| 9 | `IntelligenceView` | `views/IntelligenceView.tsx` | מסך "בינה" — שאילתות AI + היסטוריה | ✅ פעיל |
| 10 | `AIChatDemo` | `components/landing/demos/AIChatDemo.tsx` | דמו אנימטיבי ב-Landing | ✅ פעיל (static mock) |
| 11 | `VoiceCommandFab` | `components/voice/VoiceCommandFab.tsx` | כפתור פקודות קוליות | ✅ פעיל |
| 12 | `AdminGlobalAiPageClient` | `app/app/admin/global/ai/` | ניהול "מוח AI" לאדמין | ✅ פעיל |
| 13 | `AdminNexusIntelligencePageClient` | `app/app/admin/nexus/intelligence/` | דוחות בינה לאדמין | ✅ פעיל |

### 1.4 Core Infrastructure

| # | קובץ | תפקיד |
|---|------|--------|
| 1 | `lib/services/ai/AIService.ts` (1615 שורות) | **ליבת AI** — ניתוב providers, caching, DNA, embeddings, semantic search |
| 2 | `lib/services/ai/providers/` | 5 Providers: OpenAI, Gemini, Anthropic, Groq, Deepgram |
| 3 | `lib/ai-security.ts` | סניטציה, בידוד הרשאות, ולידציה של תשובות AI |
| 4 | `lib/services/ai/prompts.json` | תבניות prompt מרכזיות |
| 5 | `lib/services/ai/analyze-meeting-transcript.ts` | ניתוח פגישות — הפיצ'ר הכי מתקדם |
| 6 | `lib/server/aiAbuseGuard.ts` | Rate limiting + load isolation ל-AI |

---

## 2. ניתוח ארכיטקטורה ובידוד נתונים

### 2.1 מה טוב ועובד

✅ **בידוד tenant קשיח:**
- כל API route מאמת `getWorkspaceOrThrow()` / `getWorkspaceContextOrThrow()` — אי אפשר לגשת לנתוני ארגון אחר
- `queryRawOrgScoped` / `executeRawOrgScoped` תמיד מקבלים `organizationId` — כל SQL query מסוננת
- `ai_chat_sessions` כוללות `organization_id` ו-WHERE clause קשיח

✅ **סניטציה לפני שליחה ל-AI:**
- `prepareAIContext()` מסנן שדות רגישים (שכר, אימייל, טלפון, כרטיס אשראי)
- `sanitizeForAI()` עובד רקורסיבית על nested objects
- `validateAIResponse()` מוודא שהתשובה לא מכילה patterns רגישים

✅ **Rate limiting מרובד:**
- IP-level (20/דקה אנונימי, 10/דקה marketing)
- User-level (15/דקה, 500/יום)
- Org-level (120/10 דקות, 5000/יום)
- Redis-based concurrency control (max 8 global, 2 per-org)
- Shabbat guard על כל ה-routes

✅ **AIService — ארכיטקטורה מצוינת:**
- Singleton pattern עם caching
- Multi-provider fallback (primary → fallback → backup)
- DNA integration — כל prompt "שואב" DNA של הארגון
- Feature settings per-org — ניתן לכבות/להדליק AI features
- Semantic search עם pgvector

### 2.2 בעיות קריטיות בבידוד

⛔ **בעיה #1: `getGlobalAgencyAuditAction` מקבל salary data מה-client:**
```
// ai-actions.ts:182-187
const totalStaffCost = team.reduce<number>((sum, m) => {
  const obj = asObject(m);
  const monthlySalary = getNumberProp(obj, 'monthlySalary');
  const hourlyRate = getNumberProp(obj, 'hourlyRate');
  return sum + (monthlySalary || hourlyRate * 160);
}, 0);
```
הנתונים הרגישים (שכר) נשלחים ל-AI prompt. אמנם ה-action דורשת auth, אבל `monthlySalary` ו-`hourlyRate` חייבים להיות מאוגדים בצד השרת, לא להתקבל מ-client.

⛔ **בעיה #2: `saveChatMessage` — SQL שבור:**
```sql
INSERT INTO ai_chat_messages (session_id, role, content, quick_actions)
VALUES ($1, $2, $3, $4)
SELECT $1, $2, $3, $4  -- ← שגיאה! INSERT ואז SELECT ללא UNION
WHERE EXISTS (...)
```
ה-SQL לא תקין — `INSERT ... VALUES` ואז `SELECT` ללא `UNION`. הודעות לא נשמרות בפועל.

⚠️ **בעיה #3: `/api/ai/feedback` — לא שומר כלום:**
```typescript
// TODO: שמירה בפועל למסד נתונים
// await prisma.$executeRaw`...`
```
ה-feedback route מחזיר success אבל רק עושה console.log. אין שמירה ל-DB.

⚠️ **בעיה #4: `ai-security.ts` — validateAIResponse חוסם מילים לגיטימיות:**
הפונקציה חוסמת "rate", "bonus", "salary" בתשובת AI — אבל מנהל שמורשה לראות נתונים פיננסיים יקבל שגיאה אם ה-AI מזכיר "rate of conversion" או "bonus points".

---

## 3. ניתוח לפי מודול

### 3.1 Nexus (ניהול צוות ומשימות)

**מה יש:**
- `IntelligenceView` — מסך בינה עסקית עם שאילתות חופשיות
- `generateDailyBriefingAction` — תדריך בוקר ("Morning Protocol")
- `generateClientInsightAction` — תובנה אסטרטגית ללקוח
- `getGlobalAgencyAuditAction` — ניתוח רווחיות סוכנות
- `generateSmartReplyAction` — מענה חכם למיילים
- Command Palette עם AI per-module
- היסטוריית ניתוחים

**מה חסר (קריטי):**
- ❌ **אין ניתוח יעילות עובדים אוטומטי** — מנהל צריך לשאול ידנית. צריך לייצר "ציון יעילות" אוטומטי על בסיס משימות שהושלמו, זמנים, סטייה מ-SLA
- ❌ **אין "מי יעיל יותר, מי פחות"** — הנתונים קיימים (tasks, time_entries) אבל אין BI אוטומטי שמשווה בין עובדים
- ❌ **אין דוח תקופתי** — ה-"Morning Protocol" עובד on-demand בלבד, לא נשלח אוטומטית
- ❌ **Nexus לא מקבל נתונים מ-System, Finance, Social, Operations** — כל מודול עובד בסילו. צריך aggregation

### 3.2 System (מכירות ולידים)

**מה יש:**
- `AIAnalyticsView` — דשבורד BI עם גרפים (recharts) — pipeline, conversions, sources
- AI Chat ב-Command Palette
- `fetchModuleSnapshot` מחזיר "hottest lead" ל-AI context

**מה חסר:**
- ❌ **AIAnalyticsView מחשב הכל client-side** — אין aggregation בצד השרת. זה בסדר ל-demo, לא ל-production עם אלפי לידים
- ❌ **אין חיזוי סגירות** — כתבנו על זה בחומרי השיווק ("75% סיכוי סגירה") אבל אין ML/AI שעושה את זה
- ❌ **אין התראות AI proactive** — "ליד X לא ענה 3 ימים, כדאי להתקשר"

### 3.3 Client OS (ניהול לקוחות)

**מה יש:**
- `analyzeMeetingTranscript` — **הפיצ'ר הכי מתקדם!** — 13 שדות output כולל commitments, sentiment, liability risks
- `success-recommendation` — טיפ AI לשימור
- `generateClientInsightAction` — תובנה אסטרטגית

**מה חסר:**
- ❌ **אין health score אוטומטי** — ה-healthScore מועבר כפרמטר, לא מחושב מנתונים אמיתיים
- ❌ **אין "Client at Risk" אוטומטי** — מנהל צריך לזהות בעצמו. AI צריך לסרוק פגישות ו-sentiment ולהתריע

### 3.4 Social (שיווק ותוכן)

**מה יש:**
- `generatePostVariationsAction` — 3 גרסאות פוסט עם hashtags per-platform
- `draftAIResponseAction` — טיוטת תגובה
- DNA-based voice customization

**מה חסר:**
- ❌ **`generateAIImageAction` — placeholder!** — מחזיר picsum.photos
- ❌ **`getTrendingOpportunitiesAction` — placeholder!** — מערך ריק
- ❌ **אין ניתוח ביצועי פוסטים** — מה עבד, מה לא, AI recommendation לפוסט הבא
- ❌ **אין "שעות פרסום מיטביות"** — כתבנו על זה בשיווק ("רביעי 11:00") אבל אין לוגיקה

### 3.5 Finance (כספים)

**מה יש:**
- `fetchModuleSnapshot` ב-`/api/ai/chat` — מחשב pipeline, invoices, recurring monthly
- AI chat עם context פיננסי

**מה חסר:**
- ❌ **אין חיזוי תזרים** — AI צריך לחזות cash flow על בסיס invoices + pipeline
- ❌ **אין התראת גבייה** — "חשבונית X ב-overdue של 30 יום"

### 3.6 Operations (תפעול)

**מה יש:**
- `ai-summary` — סיכום AI של קריאת עבודה (מתקדם — כולל הודעות, חומרים, צ'ק-אינים)
- `ai/vision` — שני routes: זיהוי חלקים (general) + תיאור פריט (operations)
- Paywall: 5 סריקות ב-trial

**מה חסר:**
- ❌ **אין ניתוח SLA** — AI צריך לזהות "70% מקריאות העבודה בבניין X חורגות מ-SLA"
- ❌ **אין חיזוי תחזוקה** — Predictive maintenance על בסיס היסטוריית קריאות

---

## 4. ניתוח UI/UX

### 4.1 כפילויות קריטיות (לנקות!)

⛔ **יש 3 (!) widgets של AI צ'אט מרחף:**
1. `AiAssistantWidget.tsx` (843 שורות) — **הפעיל** — נטען ב-`ClientOnlyWidgets`
2. `AiAssistantWidgetV2.tsx` (720 שורות) — **לא בשימוש** — עם streaming אבל לא מיובא
3. `AiWidget.tsx` (388 שורות) — **לא בשימוש** — גרסה שלישית

⛔ **יש 3 (!) גרסאות של AIAnalyticsView:**
1. `components/system/AIAnalyticsView.tsx` (606 שורות) — **הפעיל** — עם recharts
2. `components/AIAnalyticsView.tsx` (103 שורות) — **Placeholder** — Coming Soon
3. `components/system/system.os/components/AIAnalyticsView.tsx` (155 שורות) — **Mock** — setTimeout + fake data

### 4.2 UX — מה טוב

✅ **Command Palette עם AI** — UX מצוין:
- `Ctrl+K` פותח palette
- זיהוי אוטומטי של מודול נוכחי
- Starters context-aware
- היסטוריית שיחות per-module
- Streaming response

✅ **Sales AI Widget:**
- זיהוי סיטואציה (browsing/pricing/objection)
- Quick Actions דינמיות
- זיכרון context מתוך השיחה
- CTA אוטומטי בסוף כל תשובה

✅ **Meeting Analyzer:**
- 13 שדות output מובנים
- Commitments extraction
- Liability detection
- Sentiment scoring

### 4.3 UX — בעיות

⚠️ **AiAssistantWidget — typing animation מיותרת:**
- כל תו מוצג בנפרד בהשהיה של 15ms
- על תשובות של 500+ תווים זה לוקח 7+ שניות לסיום
- הטקסט כבר התקבל מלא מהשרת — האנימציה רק מעכבת
- **המלצה:** הסרה מלאה של typing animation. Streaming מספיק

⚠️ **AiAssistantWidget — אין indication ברור של "Sales vs Support":**
- שני המצבים נראים כמעט זהים
- ההבדל: emoji בכפתור (💰 vs 🤖) ותווית קטנה
- **המלצה:** צבע/gradient שונה לגמרי, הודעת פתיחה שונה

⚠️ **IntelligenceView — כבד מדי:**
- 571 שורות של UI
- שולח את כל ה-tasks + clients + assets ל-API
- על ארגון עם 1000+ פריטים, ה-payload יהיה ענק
- **המלצה:** לשלוח רק aggregated stats, לא raw data

⚠️ **Mobile responsiveness:**
- FAB widget: `w-[360px]` — עובד ב-mobile אבל צפוף
- Command Palette: modal עם width קבוע — צריך max-w-[calc(100vw-2rem)]
- הרוב מטופל אבל יש מקומות עם overflow

---

## 5. דוחות AI תקופתיים

### 5.1 מצב קיים

🔴 **אין מערכת דוחות AI תקופתיים כלל.**

מה שקיים:
- `generateDailyBriefingAction` — on-demand בלבד, לא אוטומטי
- `AdminNexusIntelligencePageClient` — דוחות "סימולציה" בלבד
- `attendance-monthly-reports` — דוח נוכחות חודשי (CRON) — לא AI
- אין CRON job שמייצר דוח AI תקופתי

### 5.2 מה צריך לבנות — ארכיטקטורה מומלצת

#### רמה 1: CRON Jobs

```
/api/cron/ai-monthly-digest     — סוף כל חודש
/api/cron/ai-quarterly-report   — סוף כל רבעון
/api/cron/ai-annual-report      — סוף שנה
```

#### רמה 2: מי מקבל מה

| תפקיד | חודשי | רבעוני | חצי-שנתי | שנתי |
|--------|--------|---------|----------|------|
| **מנכ"ל/אדמין** | KPI Summary + AI Insights על כל המערכת | דוח מלא + השוואת רבעונים + טרנדים | דוח אסטרטגי + התאמות לתכנון | דוח שנתי מלא + תחזית |
| **מנהל צוות** | ביצועי צוות + משימות + יעילות | השוואה בין עובדים + ROI | רב-מודולי | כנ"ל |
| **עובד רגיל** | **רק** הביצועים האישיים שלו | סיכום אישי | - | סיכום שנתי אישי |

#### רמה 3: עמודות קבועות לכל דוח

**דוח מנכ"ל חודשי:**
- סה"כ לידים חדשים / סגירות / אובדן
- הכנסות בפועל vs. יעד
- עלות כוח אדם vs. הכנסות
- יעילות צוות (avg tasks/person)
- לקוחות בסיכון (health < 50)
- SLA compliance %
- AI usage stats (כמה שימושים, כמה feedback חיובי)
- **3 תובנות AI** (הכי חשוב/דחוף)
- **3 המלצות AI** (פעולות קונקרטיות)

**דוח עובד חודשי:**
- משימות שהושלמו / שנדחו
- זמן ממוצע להשלמת משימה
- לקוחות שטופלו
- ציון יעילות אישי (AI-generated)
- **2 תובנות AI** (מה הלך טוב, מה לשפר)
- **1 המלצה AI** (focus area לחודש הבא)

#### רמה 4: בידוד נתונים — כלל ברזל

```
┌─────────────────────────────────────────────┐
│                   CRON JOB                   │
│  1. iterate over all active organizations   │
│  2. for each org:                           │
│     a. fetch data ONLY for this org         │
│     b. generate report ONLY with org data   │
│     c. send ONLY to users IN this org       │
│  3. NEVER cross-reference between orgs      │
│  4. Role-based filtering:                   │
│     - Admin sees all employees              │
│     - Employee sees ONLY their own data     │
│     - Financial data ONLY for managers      │
└─────────────────────────────────────────────┘
```

**חובה:**
- `WHERE organization_id = $1` על כל query
- דוח עובד רגיל חייב לעבור `ONLY own userId` filter
- אסור לשלוח דוח מנכ"ל לעובד
- אסור לשלוח נתוני שכר לעובד שלא מורשה
- כל דוח נשמר ב-DB עם `organization_id` + `user_id` + `report_type` + `period`

---

## 6. ממצאים קריטיים

### 🔴 קריטי (Must Fix Before Launch)

1. **`saveChatMessage` — SQL שבור** — הודעות AI לא נשמרות. תקן את ה-SQL syntax
2. **`/api/ai/feedback` — לא שומר כלום** — Feedback הוא critical signal. חייב לשמור ל-DB
3. **3 כפילויות של AI Widget** — מבלבל בתחזוקה. מחק V2 ו-AiWidget, שמור רק AiAssistantWidget
4. **3 כפילויות של AIAnalyticsView** — מבלבל. מחק את ה-mock ואת ה-Coming Soon
5. **`getGlobalAgencyAuditAction` מקבל שכר מ-client** — העבר חישוב שכר לצד השרת
6. **אין דוחות AI תקופתיים** — הפיצ'ר הכי חשוב שחסר

### 🟡 חשוב (Should Fix Soon)

7. **Placeholders שנמכרו כפיצ'רים:** `generateAIImageAction`, `getTrendingOpportunitiesAction`, `getBusinessAuditAction` — צריך להחליט: לממש או להסיר
8. **`validateAIResponse` חוסם מילים לגיטימיות** — צריך context-aware validation, לא string matching
9. **IntelligenceView שולח raw data** — לעבור ל-aggregated stats
10. **Typing animation מיותרת** — מעכבת UX. להסיר
11. **Nexus לא מקבל cross-module data** — צריך aggregation layer

### 🟢 שיפור (Nice to Have)

12. **AI Vision paywall רק ב-trial** — שקול paywall גם ב-solo plan
13. **Help videos integration** — כבר קיים אבל לא מספיק prominent
14. **Chat history ב-localStorage** — לעבור ל-DB (כבר יש `ai_chat_sessions`)

---

## 7. המלצות אסטרטגיות

### 7.1 ארכיטקטורה: "AI Hub" מרכזי ב-Nexus

הרעיון: Nexus AI צריך להיות ה-"מוח" שמקבל data מכל המודולים.

```
     ┌──────────┐
     │ Nexus AI │ ◄── Central Intelligence Hub
     │  (Brain) │
     └────┬─────┘
          │
    ┌─────┼─────────┬──────────┬──────────┬──────────┐
    ▼     ▼         ▼          ▼          ▼          ▼
 System  Client   Finance  Operations  Social   (future)
  data    data     data      data       data
```

**איך לממש:** בנה `lib/services/ai/cross-module-aggregator.ts`:
- פונקציה `aggregateOrgSnapshot(organizationId)` שמושכת KPIs מכל מודול
- Cache ל-5 דקות (React.cache או Redis)
- שימוש ב-Promise.all לביצועים
- ה-snapshot הזה יזין גם את ה-AI Chat ב-Nexus וגם את הדוחות התקופתיים

### 7.2 דוחות תקופתיים — Flow

```
CRON (monthly) → for each org:
  1. aggregateOrgSnapshot(orgId)
  2. AIService.generateJson({ featureKey: 'reports.monthly.admin', ... })
  3. Save to ai_periodic_reports table
  4. Send email notification (with link, NOT with data in email)
  5. For each employee: generate personal report
```

### 7.3 AI שצריך "לדחוף עסקית"

נכון, AI הוא לא רק פיצ'ר נחמד. הוא צריך לגרום לבעל העסק **להרוויח יותר**:

1. **"כסף על השולחן"** — AI יזהה: לידים חמים שלא טופלו 48+ שעות, חשבוניות overdue, לקוחות שלא היה קשר 30+ יום
2. **"מי מרוויח לי, מי מפסיד"** — AI ירתום time_entries + revenue per client ויראה: "לקוח X עולה לך 50 שעות/חודש אבל מכניס 3,000₪. לקוח Y עולה 10 שעות ומכניס 8,000₪"
3. **"תחזית"** — על בסיס 3 חודשים אחורה, AI יחזה: "בקצב הנוכחי, החודש הבא צפוי הכנסות של X₪"
4. **"התראות חכמות"** — לא push notifications מעצבנים, אלא: כשהמנהל נכנס למערכת, AI Card בראש הדף: "3 דברים שצריך את תשומת הלב שלך"

---

## 8. סדר עדיפויות לביצוע

### Phase 1: ניקיון (שבוע 1)
- [ ] תקן `saveChatMessage` SQL syntax
- [ ] ממש `ai/feedback` — שמירה ל-DB
- [ ] מחק `AiAssistantWidgetV2.tsx` ו-`AiWidget.tsx` (כפילויות)
- [ ] מחק `components/AIAnalyticsView.tsx` ו-`system.os/components/AIAnalyticsView.tsx` (כפילויות)
- [ ] הסר typing animation ב-AiAssistantWidget (UX)
- [ ] תקן `validateAIResponse` — הוסף context-aware logic
- [ ] העבר חישוב שכר ב-`getGlobalAgencyAuditAction` לצד שרת

### Phase 2: Cross-Module Intelligence (שבוע 2-3)
- [ ] בנה `cross-module-aggregator.ts`
- [ ] חבר Nexus AI ל-data מכל המודולים
- [ ] בנה "AI Card" בדשבורד — "3 דברים שצריכים תשומת לב"

### Phase 3: דוחות תקופתיים (שבוע 3-4)
- [ ] צור טבלת `ai_periodic_reports` ב-schema
- [ ] בנה CRON: `/api/cron/ai-monthly-digest`
- [ ] בנה Template לדוח מנכ"ל ולדוח עובד
- [ ] בנה UI לצפייה בדוחות היסטוריים
- [ ] הוסף email notification עם לינק (לא data!)

### Phase 4: Placeholders → Real (שבוע 4-5)
- [ ] ממש `generateAIImageAction` (או הסר מה-UI)
- [ ] ממש `getTrendingOpportunitiesAction` (או הסר)
- [ ] ממש חיזוי סגירות (lead scoring AI)
- [ ] ממש "שעות פרסום מיטביות" (או הסר מהשיווק)

---

## סיכום

**מצב כללי:** הארכיטקטורה בסיסית טובה מאוד — AIService, providers, security, rate limiting כולם מוצקים. הבעיות העיקריות הן:
1. **כפילויות** — 3 widgets, 3 analytics views
2. **Placeholders שנשכחו** — נמכרו כפיצ'רים אבל לא מומשו
3. **חוסר cross-module** — כל מודול בסילו
4. **אין דוחות תקופתיים** — הפיצ'ר הכי חשוב שחסר
5. **באגים ב-feedback/chat-messages** — לא נשמר data חשוב

הפוטנציאל ענק. הבסיס כבר כאן — רק צריך לחבר את הנקודות.
