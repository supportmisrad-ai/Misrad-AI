# תוכנית מקיפה – שדרוג מודול אופרציה (Operations)

> תאריך: 15.02.2026  
> סטטוס: **ממתין לאישור**

---

## א. באגים ובעיות UI שזוהו

### 1. כפתור "קריאה חדשה" לא פותח חלון
**מצב נוכחי:** הכפתור הוא `<Link>` שמנווט לעמוד `/work-orders/new` — עמוד שלם, לא מודאל.  
**הבעיה:** הניווט כנראה עובד אבל חווית המשתמש לא אינטואיטיבית — צריך לפתוח **מודאל/דיאלוג מהיר** כמו CreateTaskModal בנקסוס.  
**תיקון מוצע:**
- ליצור `CreateWorkOrderModal` — מודאל שנפתח מהכפתור
- מודאל קל עם: כותרת, תיאור, בחירת פרויקט/מבנה, קטגוריה, דחיפות, שיוך טכנאי
- יישמר ויפנה לדף הקריאה החדשה

### 2. כפתור "אזור אישי" בסרגל הצד
**מצב נוכחי:** `{ label: 'אזור אישי', path: '/me', icon: User }` קיים כפריט nav רגיל.  
**הבעיה:** זה לא שייך לניווט הראשי — זה פרופיל/הגדרות אישיות.  
**תיקון מוצע:**
- להסיר מהניווט הראשי
- להעביר לאזור התחתון של הסיידבר (bottomSlot) כפרופיל משתמש — בדיוק כמו בנקסוס
- או לשלב בתפריט פרופיל בהדר

### 3. אין פסי הפרדה בין קבוצות כפתורים
**מצב נוכחי:** `primaryNavPaths` כולל **את כל** הנתיבים → כולם "ראשיים" → אף הפרדה לא מוצגת.  
**הבעיה:** SharedSidebar מציג separator רק כשעוברים מ-primary ל-secondary.  
**תיקון מוצע:**
- לחלק את הנתיבים לקבוצות:
  - **ראשי:** דשבורד, קריאות
  - **ניהול:** פרויקטים, מלאי, קבלנים
  - **מערכת:** הגדרות
- `primaryNavPaths` יכלול רק את הקבוצה הראשית → ההפרדה תופיע אוטומטית

### 4. פופאפ תמיכה לא מופיע באופרציה
**מצב נוכחי:** `onOpenSupportAction={undefined}` ב-OperationsShell. אין SupportModal ב-Operations.  
**תיקון מוצע:**
- להוסיף SupportModal ל-OperationsShell
- לחבר את `onOpenSupportAction` בהדר

### 5. כפתור וידאו כפול
**מצב נוכחי:** `ModuleHelpVideos` מופיע בהדר כ-actionsSlot, וגם בתוך חלון התמיכה.  
**תיקון מוצע:**
- להסיר את כפתור הוידאו העצמאי מהדר
- הוידאו נגיש דרך חלון התמיכה בלבד

---

## ב. ההבדל בין קריאות (Work Orders) לבין משימות (Tasks)

### המצב הנוכחי

| | **משימות (NexusTask)** | **קריאות (OperationsWorkOrder)** |
|---|---|---|
| מיקום | מודול נקסוס | מודול אופרציה |
| מטרה | ניהול עבודה שוטפת פנימית | קריאות שירות/תחזוקה |
| שדות | כותרת, תיאור, סטטוס, עדיפות, שיוכים, תגיות, צ'אט, מחלקה, לקוח, זמן | כותרת, תיאור, סטטוס, פרויקט, כתובת, טכנאי, חתימה |
| חסרונות | - | חסר: קטגוריה, מבנה/קומה, עדיפות, SLA, צ'אט, הרשאות |

### ההגדרה החדשה המוצעת

**משימות (NexusTask)** = עבודה פנימית ארגונית:
- "הכן הצעת מחיר ללקוח X"
- "התקשר לספק Y"  
- שייך למחלקה, ללקוח, לעובד

**קריאות (OperationsWorkOrder → OperationsCall)** = קריאות שירות/תחזוקה שטח:
- "נזילה בקומה 3 בניין A"
- "תקלת מזגן בדירה 12"
- שייך למבנה, לקומה, לקטגוריית תחזוקה, לטכנאי/קבלן
- יש SLA (זמן מקסימלי), דחיפות, צ'אט פנימי

---

## ג. תוכנית מוצעת — "קריאות שירות 2.0"

### שלב 1: שינויי סכמה (Schema)

#### 1.1 טבלה חדשה — `OperationsBuilding` (מבנים)
```prisma
model OperationsBuilding {
  id             String               @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  organizationId String               @map("organization_id") @db.Uuid
  name           String               // "בניין A", "מתחם צפון"
  address        String?
  floors         Int?                 // מספר קומות
  notes          String?
  createdAt      DateTime             @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt      DateTime             @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  organization   social_organizations @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  @@index([organizationId])
  @@map("operations_buildings")
}
```

#### 1.2 טבלה חדשה — `OperationsCallCategory` (קטגוריות קריאה)
```prisma
model OperationsCallCategory {
  id             String               @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  organizationId String               @map("organization_id") @db.Uuid
  name           String               // "חשמל", "אינסטלציה", "מזגנים", "ניקיון"
  color          String?              // צבע לזיהוי
  icon           String?              // שם אייקון
  maxResponseMinutes Int?             @map("max_response_minutes") // SLA — דקות מקסימום
  sortOrder      Int                  @default(0) @map("sort_order")
  isActive       Boolean              @default(true) @map("is_active")
  createdAt      DateTime             @default(now()) @map("created_at") @db.Timestamptz(6)
  organization   social_organizations @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  @@index([organizationId])
  @@map("operations_call_categories")
}
```

#### 1.3 טבלה חדשה — `OperationsDepartment` (מחלקות אופרציה)
```prisma
model OperationsDepartment {
  id             String               @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  organizationId String               @map("organization_id") @db.Uuid
  name           String               // "תחזוקה", "שליחויות", "מלאי", "טכנאים"
  slug           String               // "maintenance", "delivery", "inventory", "technicians"
  icon           String?
  color          String?
  isActive       Boolean              @default(true) @map("is_active")
  createdAt      DateTime             @default(now()) @map("created_at") @db.Timestamptz(6)
  organization   social_organizations @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  @@unique([organizationId, slug])
  @@index([organizationId])
  @@map("operations_departments")
}
```

#### 1.4 שדרוג `OperationsWorkOrder` (הוספת שדות)
```prisma
// שדות חדשים שמתווספים למודל הקיים:
  priority             String?              @default("NORMAL") // LOW | NORMAL | HIGH | URGENT
  categoryId           String?              @map("category_id") @db.Uuid
  departmentId         String?              @map("department_id") @db.Uuid
  buildingId           String?              @map("building_id") @db.Uuid
  floor                String?              // "קומה 3", "קומת קרקע", "גג"
  unit                 String?              // "דירה 12", "חנות 5", "משרד 301"
  reporterName         String?              @map("reporter_name")     // מי דיווח
  reporterPhone        String?              @map("reporter_phone")
  messages             Json                 @default("[]")            // צ'אט פנימי כמו ב-NexusTask
  slaDeadline          DateTime?            @map("sla_deadline") @db.Timestamptz(6) // מחושב אוטומטית
  completedAt          DateTime?            @map("completed_at") @db.Timestamptz(6)
  transferredFromId    String?              @map("transferred_from_id") @db.Uuid  // העברה מטכנאי אחר
  transferApprovedById String?              @map("transfer_approved_by_id") @db.Uuid
  
  // Relations
  category             OperationsCallCategory? @relation(fields: [categoryId], references: [id])
  department           OperationsDepartment?   @relation(fields: [departmentId], references: [id])
  building             OperationsBuilding?     @relation(fields: [buildingId], references: [id])
```

#### 1.5 טבלה חדשה — `OperationsCallMessage` (הודעות בקריאה)
```prisma
model OperationsCallMessage {
  id             String               @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  organizationId String               @map("organization_id") @db.Uuid
  workOrderId    String               @map("work_order_id") @db.Uuid
  authorId       String               @map("author_id") @db.Uuid
  authorName     String               @map("author_name")
  content        String
  mentions       String[]             @default([])  // user IDs of @mentioned people
  createdAt      DateTime             @default(now()) @map("created_at") @db.Timestamptz(6)
  organization   social_organizations @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  @@index([workOrderId])
  @@index([organizationId])
  @@map("operations_call_messages")
}
```

### שלב 2: עדכון UI — סרגל צד וניווט

#### 2.1 מבנה ניווט חדש
```
─── ראשי ───────────────────
  דשבורד
  קריאות שירות
────────────────────────────  ← פס הפרדה
─── ניהול ──────────────────
  פרויקטים
  מבנים                       ← חדש
  מלאי
  קבלנים
────────────────────────────  ← פס הפרדה
─── מערכת ──────────────────
  הגדרות
```

#### 2.2 הסרת "אזור אישי" מהניווט
- מעבר לאזור תחתון (bottomSlot) כפרופיל משתמש
- או לשלב כחלק מהפרופיל בהדר

### שלב 3: מודאל יצירת קריאה חדשה

מודאל מהיר (`CreateCallModal`) עם:
- **כותרת** (חובה)
- **קטגוריה** (dropdown מההגדרות)
- **דחיפות** (רגיל / גבוה / דחוף / קריטי)
- **מבנה** (dropdown) + **קומה** (טקסט חופשי) + **יחידה** (טקסט חופשי)
- **מדווח** (שם + טלפון)
- **תיאור** (אופציונלי)
- **שיוך טכנאי** (אופציונלי)
- **פרויקט** (אופציונלי — לא חובה יותר!)
- **מחלקה** (אופציונלי)

SLA מחושב אוטומטית לפי קטגוריה.

### שלב 4: דף קריאה בודדת (שדרוג)

**כרטיס ראשי:**
- כותרת + סטטוס (badge צבעוני)
- קטגוריה + דחיפות
- מבנה → קומה → יחידה
- מדווח (שם + טלפון)
- טכנאי מוקצה
- SLA countdown (אם אדום = עברנו את הזמן)

**צ'אט משימה:**
- הודעות עם @ mentions
- תזכורות אוטומטיות
- קבצים מצורפים

**היסטוריה:**
- צ'ק-אינים (GPS)
- שינויי סטטוס
- העברות

**פעולות:**
- העבר לטכנאי אחר (עם/בלי אישור מנהל)
- סמן כהושלם + חתימה
- צרף תמונה/קובץ

### שלב 5: הגדרות מודול (Settings)

```
┌──────────────────────────────────────┐
│ הגדרות תפעול                         │
├──────────────────────────────────────┤
│                                      │
│ 📂 קטגוריות תחזוקה                   │
│   ┌─────────┬────────┬──────────┐   │
│   │ שם      │ צבע    │ SLA (דק) │   │
│   ├─────────┼────────┼──────────┤   │
│   │ חשמל    │ 🟡     │ 120      │   │
│   │ אינסטלציה│ 🔵     │ 60       │   │
│   │ מזגנים  │ 🟢     │ 240      │   │
│   │ ניקיון  │ 🟣     │ 480      │   │
│   │ + הוסף קטגוריה              │   │
│   └─────────┴────────┴──────────┘   │
│                                      │
│ 🏢 מבנים                             │
│   ┌─────────┬────────┬──────────┐   │
│   │ שם      │ כתובת  │ קומות    │   │
│   ├─────────┼────────┼──────────┤   │
│   │ בניין A │ רחוב...│ 8        │   │
│   │ + הוסף מבנה                 │   │
│   └─────────┴────────┴──────────┘   │
│                                      │
│ 🏷️ מחלקות                            │
│   ┌──────────┬───────────────────┐  │
│   │ תחזוקה   │ קריאות תחזוקה    │  │
│   │ שליחויות │ משלוחים והובלות  │  │
│   │ טכנאים   │ תיקונים טכניים   │  │
│   │ מלאי     │ ניהול מלאי        │  │
│   │ + הוסף מחלקה                │  │
│   └──────────┴───────────────────┘  │
│                                      │
│ ⏱️ הגדרות SLA                        │
│   □ הצג אינדיקטור אדום כשעוברים    │
│     את זמן ה-SLA                     │
│   □ שלח התראה למנהל כש-SLA עובר    │
│   □ דרוש אישור מנהל להעברת קריאה   │
│                                      │
│ 🎨 מראה קריאות                       │
│   ○ תצוגת תחזוקה (ברירת מחדל)      │
│   ○ תצוגת שליחויות                  │
│   ○ תצוגת טכנאים                    │
│   (משפיע על שדות שמוצגים בכרטיס)    │
│                                      │
└──────────────────────────────────────┘
```

### שלב 6: תצוגות מותאמות לפי מחלקה

המחלקה שנבחרת משפיעה על **אילו שדות מוצגים** בכרטיס קריאה:

| שדה | תחזוקה | שליחויות | טכנאים | מלאי |
|---|:---:|:---:|:---:|:---:|
| מבנה + קומה + יחידה | ✅ | ❌ | ✅ | ❌ |
| כתובת התקנה | ❌ | ✅ | ✅ | ❌ |
| מדווח (שם+טלפון) | ✅ | ✅ | ✅ | ❌ |
| קטגוריה | ✅ | ❌ | ✅ | ❌ |
| SLA | ✅ | ✅ | ✅ | ❌ |
| חומרים מהמלאי | ❌ | ❌ | ✅ | ✅ |
| GPS צ'ק-אין | ✅ | ✅ | ✅ | ❌ |
| חתימה דיגיטלית | ✅ | ✅ | ✅ | ❌ |
| כתובת יעד | ❌ | ✅ | ❌ | ❌ |
| פרויקט | ✅ | ❌ | ✅ | ✅ |

**חשוב:** כל השדות קיימים בסכמה — המחלקה רק קובעת מה **מוצג** ב-UI. זה נותן גמישות מקסימלית.

---

## ד. הרשאות והעברות

### 4.1 העברת קריאה לטכנאי אחר
- כל טכנאי יכול להעביר קריאה
- **אם ההגדרה "דרוש אישור מנהל"** מופעלת → העברה נשמרת כ-PENDING_TRANSFER ומנהל צריך לאשר
- אם לא → העברה ישירה

### 4.2 SLA ואינדיקטורים
- כשנוצרת קריאה, המערכת מחשבת `slaDeadline` = `createdAt + category.maxResponseMinutes`
- כרטיס הקריאה מציג:
  - 🟢 ירוק — בזמן
  - 🟡 צהוב — 75%+ מהזמן עבר
  - 🔴 אדום — עבר את ה-SLA
- אפשר לשלוח התראה (push/email) למנהל כשקריאה הופכת לאדומה

### 4.3 @ Mentions וצ'אט
- בצ'אט של קריאה, `@שם` שולח תזכורת/התראה לאותו עובד
- ההודעות נשמרות ב-`OperationsCallMessage`
- תומך בצירוף תמונות

---

## ה. סיכום שלבי ביצוע

| שלב | תיאור | מורכבות | תלות |
|:---:|---|:---:|:---:|
| **1** | תיקוני באגים: כפתור קריאה, separator, support, וידאו כפול | נמוכה | — |
| **2** | שינויי סכמה: Buildings, Categories, Departments, שדות חדשים ב-WorkOrder | בינונית | — |
| **3** | עמוד הגדרות: CRUD קטגוריות, מבנים, מחלקות, הגדרות SLA | בינונית | שלב 2 |
| **4** | CreateCallModal — מודאל יצירת קריאה חדשה | בינונית | שלב 2 |
| **5** | דף קריאה בודדת — שדרוג עם כל השדות החדשים | גבוהה | שלב 2,3 |
| **6** | צ'אט + @mentions בקריאה | בינונית | שלב 2 |
| **7** | SLA engine + אינדיקטורים + התראות | בינונית | שלב 2,3 |
| **8** | הרשאות העברה + אישור מנהל | נמוכה-בינונית | שלב 2 |
| **9** | תצוגות מותאמות לפי מחלקה | בינונית | שלב 2,3 |

---

## ו. שאלות פתוחות לאישורך

1. **שם הישות:** האם לשנות את השם מ-"work orders" ל-"calls" (קריאות) בכל הקוד? או לשמור work_orders כשם טכני ו"קריאות" רק ב-UI?
2. **פרויקט חובה:** כרגע פרויקט הוא שדה חובה. האם להפוך לאופציונלי? (מומלץ — קריאת תחזוקה לא תמיד קשורה לפרויקט)
3. **מחלקות ברירת מחדל:** האם ליצור מחלקות ברירת מחדל בהרשמה? (תחזוקה, שליחויות, טכנאים, מלאי)
4. **הפרדה מנקסוס:** האם "משימות" במודול אופרציה צריכות להישאר? או שרק "קריאות" קיימות באופרציה ו"משימות" חיות רק בנקסוס?
5. **פורטל קבלן:** האם הפורטל הקיים לקבלנים צריך להציג גם את השדות החדשים (מבנה, קומה, קטגוריה)?

---

**ממתין לאישורך לפני שמתחיל ביישום.** 🚀
