# 📊 Nexus — ניהול, משימות וצוות

> **מחיר:** ₪149/חודש (סולו) | כלול בכל החבילות  
> **משתמשים:** 1 (סולו) או 5 (בחבילה)  
> **תפקיד:** מרכז הבקרה של הארגון — ניהול צוות, משימות, זמן ופעילות ארגונית. AI Intelligence מנתח עומס, מחזה שחיקה, וממליץ הקצאות.

---

## מסכים ופיצ'רים

### 1. Dashboard — לוח בקרה ראשי

| רכיב | תיאור |
|-------|--------|
| **סטטיסטיקות צוות** | כמה Online, כמה משימות פתוחות, Capacity |
| **משימות לפי סטטוס** | New / In Progress / Review / Done (גרף עוגה) |
| **אירועים קרובים** | מהיומן + Due dates |
| **פעילות אחרונה** | Feed של פעולות אחרונות בזמן אמת |
| **KPIs** | משימות שהושלמו השבוע, זמן ממוצע, ציון צוות |

### 2. משימות — מנוע העבודה

| פיצ'ר | תיאור |
|--------|--------|
| **יצירה מהירה** | כותרת + הקצאה = 5 שניות |
| **הקצאה מרובה** | `assignee_ids[]` — משימה למספר אנשים |
| **Timer מובנה** | Start/Stop — מחושב אוטומטית ב-`time_spent` |
| **Priority** | Low / Medium / High + צבע ויזואלי |
| **Tags** | תיוג חופשי (מכירות, פיתוח, דחוף...) |
| **תקשורת פנימית** | הודעות בתוך המשימה (JSONB `messages[]`) |
| **הקלטות קול** | `audio_url` — הקלט הערה קולית |
| **Due Date + Time** | תאריך + שעת יעד |
| **Soft Delete** | `deleted_at` — אפשר לשחזר |
| **אישור** | `requires_approval` — המנהל מאשר |
| **משימה פרטית** | `is_private` — רק המבצע רואה |

**סטטוסים:**
```
New → In Progress → Review → Done
                  ↘ Blocked
```

**Server Action — יצירת משימה:**
```typescript
'use server';
export async function createTask(data: TaskInput) {
  const orgId = await getOrganizationId();
  return prisma.nexusTask.create({
    data: {
      ...data,
      organizationId: orgId,
      status: 'new',
      creatorId: session.userId,
    }
  });
}
```

### 3. צוות — ניהול עובדים

| פיצ'ר | תיאור |
|--------|--------|
| **כרטיס עובד** | שם, תפקיד, מחלקה, אווטאר |
| **Online Status** | ירוק/אפור — מעודכן בזמן אמת |
| **Capacity** | 0-100% — מחושב אוטומטית מעומס משימות |
| **Streak** | ימי רצף עבודה (מוטיבציה) |
| **ציון שבועי** | `weekly_score` — AI מחשב ביצועים |
| **תשלום** | שעתי / חודשי / עמלה / בונוס למשימה |
| **יעדים** | `targets` (JSONB) — מכירות חודשיות, שיחות/יום |
| **הזמנת עובד** | לינק הזמנה / מייל |

**סוגי תשלום:**
| סוג | שדות |
|------|-------|
| שעתי | `hourlyRate` |
| חודשי | `monthlySalary` |
| עמלה | `commission_pct` |
| בונוס | `bonus_per_task`, `accumulated_bonus` |

> ⚠️ **אבטחה:** שדות תשלום הם **רגישים** — רק Admin רואה. לא נשלחים ל-AI.

### 4. דיווחי זמן — Time Tracking

| פיצ'ר | תיאור |
|--------|--------|
| **Punch In/Out** | כפתור התחלה/סיום |
| **חישוב אוטומטי** | `duration` = `end - start` |
| **דוחות חודשיים** | סיכום שעות לפי עובד/מחלקה |
| **Export** | Excel/CSV |

**מודל:**
```typescript
NexusTimeEntry {
  userId: UUID
  startTime: DateTime
  endTime: DateTime
  duration: Integer  // דקות
  description: String
}
```

### 5. Sales Pipeline (בסיסי)

| שלב | תיאור |
|------|--------|
| Incoming | ליד חדש |
| Contacted | יצרנו קשר |
| Meeting | נקבעה פגישה |
| Proposal | נשלחה הצעה |
| Negotiation | מו"מ |
| Won | סגירה |
| Lost | אבד |
| Churned | לקוח שעזב |

**Drag & Drop** — גרור בין שלבים (Framer Motion)

### 6. Intelligence — תובנות AI

| תובנה | תיאור |
|--------|--------|
| **עומס צוות** | מי עמוס מדי? מי פנוי? |
| **חלוקת עבודה** | המלצה להקצאה אופטימלית |
| **תחזית** | צפי השלמת משימות |
| **Streak Report** | מי עובד ברצף? מי ירד? |

---

## מודל נתונים מלא

```sql
-- Tasks
nexus_tasks:
  id, organization_id, title, description
  status (new/in_progress/review/done)
  priority (low/medium/high)
  assignee_ids UUID[]
  due_date, due_time, time_spent, estimated_time
  is_timer_running, is_private
  tags TEXT[], department, client_id
  messages JSONB, audio_url
  requires_approval, approved_by, approved_at
  created_at, updated_at, deleted_at

-- Users
nexus_users:
  id, organization_id, name, email, phone, avatar
  role, department, online, last_seen_at
  capacity, streak_days, weekly_score
  payment_type, hourly_rate, monthly_salary
  commission_pct, bonus_per_task, accumulated_bonus
  targets JSONB, notification_preferences JSONB

-- Time Entries
nexus_time_entries:
  id, organization_id, user_id
  start_time, end_time, duration, description
```

---

## תהליכי עבודה

### תהליך 1: יום עבודה של מנהל
```
1. כנס ל-Dashboard → ראה סטטיסטיקות
2. בדוק משימות ב-Review → אשר/החזר
3. בדוק Capacity → הקצה משימות לעובדים פנויים
4. בדוק Pipeline → עקוב אחרי עסקאות
```

### תהליך 2: יום עבודה של עובד
```
1. כנס למשימות שלי → ראה מה עליך
2. Punch In → התחל לעבוד
3. פתח משימה → הפעל Timer
4. סיים → העבר ל-Review
5. Punch Out → סיום יום
```

---

## הרשאות (RBAC)

| פעולה | Admin | Manager | Member | Viewer |
|-------|-------|---------|--------|--------|
| צפייה במשימות | ✅ כולם | ✅ כולם | ✅ שלו | ✅ כולם |
| יצירת משימה | ✅ | ✅ | ✅ | ❌ |
| עריכה | ✅ כולם | ✅ מחלקה | ✅ שלו | ❌ |
| מחיקה | ✅ | ✅ | ❌ | ❌ |
| צפייה במשכורות | ✅ | ❌ | ❌ | ❌ |
| ניהול צוות | ✅ | ✅ | ❌ | ❌ |

---

## למי זה מתאים?

| ✅ מתאים | ❌ לא מתאים |
|----------|-------------|
| כל עסק עם 3+ עובדים | עצמאיים ללא צוות |
| מנהלים שצריכים תמונת מצב | ארגונים 200+ (שקול להשתמש ב-Jira/Monday) |
| צוותים מבוזרים | |
| עסקים עם דיווחי שעות | |

---

📖 **המשך:** [System — מכירות →](./05-מודול-system.md)
