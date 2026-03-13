# 🏛️ AI Tower - תוכנית תכנון מקיפה
## מערכת ניהול חכמה מבוססת AI עבור MISRAD AI

**תאריך:** מרץ 2026  
**גרסה:** 1.0  
**סטטוס:** תכנון

---

## 🎯 יעדים עסקיים

1. **צמצום זמן קבלת החלטות** - מה שעות של ניתוח דוחות לשניות של Action Cards
2. **זיהוי בעיות לפני שהן קורות** - חיזוי סיכוני נטישה, עיכובים, חריגות תקציב
3. **אוטומציה של פעולות שגרתיות** - הפחתת 60% מהקליקים הידניים
4. **חיבור מודולים** - מניעת "איים של מידע"

---

## 🏗️ ארכיטקטורת המערכת

### 1. Event Bus (תשתית האירועים)

**מיקום:** `lib/events/event-bus.ts`

**אירועים שיוקמו:**

| קטגוריה | אירוע | מקור |
|---------|-------|------|
| **Nexus** | TASK_CREATED, TASK_COMPLETED, TASK_OVERDUE, PROJECT_STARTED, PROJECT_COMPLETED | cycles.ts, system-tasks.ts |
| **Booking** | BOOKING_CREATED, BOOKING_CONFIRMED, BOOKING_CANCELLED, SLOT_AVAILABLE | booking-appointments.ts |
| **Finance** | INVOICE_CREATED, INVOICE_PAID, INVOICE_OVERDUE, PAYMENT_RECEIVED | billing-actions.ts |
| **Attendance** | ATTENDANCE_PUNCH_IN, ATTENDANCE_PUNCH_OUT, LATE_ARRIVAL, OVERTIME | attendance.ts |
| **Social** | POST_PUBLISHED, POST_SCHEDULED, ENGAGEMENT_SPIKE | posts.ts |
| **Client** | CLIENT_CREATED, CLIENT_STATUS_CHANGED, CLIENT_RISK_DETECTED | client-clients.ts |

**פורמט אירוע אחיד:**
```typescript
interface AppEvent {
  id: string;                    // UUID
  type: EventType;              // סוג האירוע
  timestamp: Date;              // זמן האירוע
  organizationId: string;       // מזהה ארגון
  userId: string;              // מי ביצע
  payload: unknown;            // נתונים ספציפיים
  metadata: {
    source: string;             // מקור הקוד
    version: string;            // גרסת הסכמה
  };
}
```

---

### 2. Watchtower Engine (המוח המרכזי)

**מיקום:** `lib/ai/watchtower-engine.ts`

**רכיבים:**

#### A. Event Processor
- קבלת אירועים בזמן אמת
- אחסון בטבלת `ai_events` לניתוח מאוחר
- הפצה ל-Rule Engine

#### B. Rule Engine (חוקי AI)

**חוקים מובנים:**

| # | שם החוק | טריגר | תנאי | פעולה |
|---|---------|-------|------|-------|
| 1 | Churn Risk | TASK_COMPLETED | 3 משימות הסתיימו, אין פעילות חדשה ב-14 יום | התראה: "סיכון נטישה" |
| 2 | Invoice Opportunity | PROJECT_COMPLETED | פרויקט הסתיים, אין חשבונית פתוחה | הצע: "הוצא חשבונית" |
| 3 | Overload Alert | ATTENDANCE_PUNCH_IN | עובד עם 5+ משימות בפיגור | התראה למנהל |
| 4 | Booking Gap | SLOT_AVAILABLE | 3 חלונות זמן פנויים ברצף | הצע: "שלח תזכורת ללקוחות" |
| 5 | Payment Follow-up | INVOICE_OVERDUE | חשבונית באיחור 7 ימים + לקוח פעיל | פעולה: שליחת תזכורת |
| 6 | Win Back | CLIENT_RISK_DETECTED | לקוח לשעבר עם היסטוריה טובה | הצע: "שלח הצעת מחיר חוזרת" |

#### C. Insight Generator
- יצירת תובנות מבוססות חוקים
- דירוג לפי דחיפות (High/Medium/Low)
- יצירת Action Cards

---

### 3. Action Registry (רישום פעולות)

**מיקום:** `lib/ai/action-registry.ts`

**פעולות זמינות:**

```typescript
type ActionType = 
  | 'SEND_NOTIFICATION'
  | 'CREATE_TASK'
  | 'UPDATE_STATUS'
  | 'SEND_EMAIL'
  | 'SCHEDULE_BOOKING'
  | 'GENERATE_INVOICE'
  | 'WHATSAPP_MESSAGE';

interface Action {
  id: string;
  type: ActionType;
  targetId: string;        // למי (לקוח, עובד, משימה)
  params: Record<string, unknown>;
  requiresApproval: boolean;
  autoExecute: boolean;    // האם לבצע אוטומטית?
}
```

---

### 4. ממשקי משתמש

#### A. Command Center (מרכז בקרה)
**מיקום:** `app/admin/ai-tower/page.tsx`

**רכיבים:**
- **Stats Overview** - מדדים בזמן אמת
- **Action Cards List** - תובנות עם כפתורי פעולה
- **Event Timeline** - ציר זמן של אירועים
- **Quick Actions** - פעולות מהירות (אישור/דחייה)

#### B. Contextual Sidebar (סרגל צדי חכם)
**מיקום:** `components/ai/ContextualSidebar.tsx`

**התנהגות:**
- מופיע בכל מודול
- מציג מידע ממודולים אחרים שרלוונטי לעמוד הנוכחי
- דוגמה: ב-Booking - מראה Balance של הלקוח מ-Finance

#### C. Notification Center (מרכז התראות)
**מיקום:** `components/ai/AINotificationCenter.tsx`

**יכולות:**
- התראות push בזמן אמת
- סינון לפי חומרה
- היסטוריית התראות

---

### 5. מערכת Auto-Pilot (טייס אוטומטי)

**מיקום:** `lib/ai/auto-pilot.ts`

**תרחישים:**

| תרחיש | תנאי | פעולות אוטומטיות |
|-------|------|-----------------|
| Onboarding Flow | לקוח חדש נרשם ב-Landing Page | 1. יצירת פרופיל 2. שליחת מייל ברוכים הבאים 3. קביעת פגישת Onboarding |
| Late Payment | חשבונית באיחור 14 יום | 1. שליחת תזכורת WhatsApp 2. עדכון סטטוס לקוח ל"בסיכון" |
| Project Completion | פרויקט הסתיים בהצלחה | 1. שליחת מייל סיכום ללקוח 2. הצעת חשבונית 3. בקשת המלצה |

---

## 📊 מודל נתונים (Prisma)

### טבלאות חדשות:

```prisma
model AIEvent {
  id              String   @id @default(uuid())
  type            String
  timestamp       DateTime @default(now())
  organizationId  String
  userId          String
  payload         Json
  processed       Boolean  @default(false)
  createdAt       DateTime @default(now())
  
  @@index([organizationId, timestamp])
  @@index([type, processed])
}

model AIInsight {
  id              String   @id @default(uuid())
  organizationId  String
  title           String
  description     String
  severity        String   // high, medium, low
  status          String   @default("active") // active, resolved, dismissed
  ruleId          String   // איזה חוק יצר
  relatedEventIds String[] // אירועים שגרמו
  suggestedAction Json?    // פעולה מומלצת
  executedAt      DateTime?
  dismissedAt     DateTime?
  createdAt       DateTime @default(now())
  
  @@index([organizationId, status])
  @@index([severity, createdAt])
}

model AIRule {
  id          String   @id @default(uuid())
  name        String   @unique
  description String
  eventTypes  String[] // אילו אירועים מפעילים
  conditions  Json     // תנאי החוק
  actions     Json     // מה לעשות
  isActive    Boolean  @default(true)
  priority    Int      @default(100)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model AIActionLog {
  id          String   @id @default(uuid())
  insightId   String
  actionType  String
  status      String   // pending, completed, failed
  params      Json
  result      Json?
  error       String?
  executedAt  DateTime?
  createdAt   DateTime @default(now())
}
```

---

## 🛡️ בטיחות וביצועים

### Beta Guard:
- רק אימייל מורשה (`itsikdahan1@gmail.com`) יכול לראות Action Cards
- פיצ'רים חדשים מוסתרים עד שאושרו

### ביצועים:
- Event emission - fire-and-forget (לא חוסם UI)
- Insights מחושבים ברקע (async processing)
- מטמון (cache) של תובנות פעילות
- הגבלת שאילתות - רק שינויים ב-5 דקות האחרונות

### אבטחה:
- כל Action מוגן ב-permissions
- Auto-pilot actions דורשות אישור מפורש
- לוג מלא של כל פעולה AI

---

## 🚀 שלבי ביצוע

### שלב 1: תשתית (שבוע 1)
- [ ] יצירת Event Bus
- [ ] יצירת טבלאות Prisma
- [ ] חיבור אירועים מ-Nexus
- [ ] Setup Watchtower Engine בסיסי

### שלב 2: חוקים ראשונים (שבוע 2)
- [ ] חוק "Churn Risk"
- [ ] חוק "Invoice Opportunity"
- [ ] חוק "Overload Alert"
- [ ] מערכת Action Cards ראשונית

### שלב 3: חיבור מודולים (שבוע 3)
- [ ] חיבור Booking
- [ ] חיבור Finance
- [ ] חיבור Attendance
- [ ] חיבור Client

### שלב 4: ממשק משתמש (שבוע 4)
- [ ] Command Center מלא
- [ ] Contextual Sidebar
- [ ] Notification Center
- [ ] Mobile responsiveness

### שלב 5: Auto-Pilot (שבוע 5-6)
- [ ] מערכת Auto-Pilot
- [ ] תרחישי Onboarding
- [ ] תרחישי Payment
- [ ] בדיקות וביצועים

---

## 📈 מדדי הצלחה (KPIs)

| מדד | יעד | איך מודדים |
|-----|-----|-----------|
| זמן תגובה לתובנה | < 2 שניות | לוג ה-Event Bus |
| שימוש ב-Action Cards | 70% מהתובנות מקבלות פעולה | טבלת AIActionLog |
| הפחתת קליקים | 40% פחות ניווט בין מודולים | Analytics |
| שביעות רצון | NPS > 50 | סקר משתמשים |

---

## 📝 הערות

- כל הקוד חייב להיות מוגן ב-Beta Guard
- אין שימוש ב-LLM (GPT) בזמן אמת - רק לוגיקה קוד
- כל Action Card חייב לכלול "למה?" (הסבר לוגיקה)
- תמיכה מלאה בעברית (RTL)
