# 🤖 ארכיטקטורת מערכת קרדיטי AI - Misrad AI

> **תאריך:** 8 במרץ 2026  
> **גרסה:** 2.0.0  
> **מחבר:** תיעוד טכני מלא

---

## 📋 סקירה כללית

מערכת **קרדיטי AI** ב-Misrad AI מנהלת את כל השימוש במודלי בינה מלאכותית במערכת, כולל:
- 🗣️ Chat (GPT-4, Claude, Gemini, וכו')
- 🎨 Image Generation (DALL-E, Stable Diffusion)
- 🎙️ Speech-to-Text (Whisper)
- 📝 Embeddings (Vector Search)
- 🧠 AI Analysis & Predictions

---

## 💰 מהם קרדיטי AI?

### **הגדרה:**
**קרדיט AI = 1 סנט (₪0.01)**

כל פעולת AI במערכת צורכת קרדיטים:
- Chat GPT-4: ~25-100 סנטים לשיחה
- Image Generation: ~50-200 סנטים לתמונה
- Speech-to-Text: ~10-30 סנטים לדקת שמע
- Embeddings: ~5-15 סנטים ל-1000 טוקנים

### **מכסות לפי חבילה:**

| חבילה | קרדיטים/חודש | שווה ל |
|-------|--------------|--------|
| **Solo** (149₪) | 5,000 cents | ₪50 |
| **The Closer** (249₪) | 10,000 cents | ₪100 |
| **The Authority** (349₪) | 10,000 cents | ₪100 |
| **The Operator** (349₪) | 10,000 cents | ₪100 |
| **The Empire** (499₪) | 25,000 cents | ₪250 |
| **The Mentor** (499₪) | 25,000 cents | ₪250 |

**מקור:** `lib/billing/pricing.ts:16-23`

---

## 🏗️ ארכיטקטורה טכנית

### **1. אחסון בDB:**

```sql
-- טבלת organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  ai_credits_balance_cents BIGINT DEFAULT 0,  -- ← היתרה הנוכחית
  ...
);
```

**שדה:** `ai_credits_balance_cents`  
**טיפוס:** BIGINT (מספר שלם גדול)  
**יחידה:** סנטים (cents)  
**ברירת מחדל:** 0

---

### **2. תהליך השימוש:**

#### **שלב A: הזמנת קרדיטים (Reserve)**

לפני כל פעולת AI, המערכת **מזמינה** קרדיטים:

```typescript
// lib/services/ai/AIService.ts:1245-1270
private async reserveCredits(params: { 
  organizationId: string; 
  reserveCents: number 
}): Promise<number> {
  // SQL:
  // UPDATE organizations 
  // SET ai_credits_balance_cents = ai_credits_balance_cents - 25
  // WHERE id = 'org-id' AND ai_credits_balance_cents >= 25
  
  // אם אין מספיק → זורק UpgradeRequiredError
}
```

**דוגמה:**
1. משתמש שולח הודעה ל-AI Chat
2. המערכת מעריכה: "זה ייקח ~25 סנטים"
3. SQL: `balance -= 25` (אם יש מספיק)
4. אם אין מספיק → שגיאה: "נגמרו קרדיטי AI"

---

#### **שלב B: ביצוע הפעולה**

```typescript
// קריאה ל-OpenAI / Anthropic / Google
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [...],
});
```

---

#### **שלב C: התאמת יתרה (Adjust)**

אחרי שהפעולה הסתיימה, המערכת **מחזירה/מנכה** קרדיטים לפי השימוש **האמיתי**:

```typescript
// lib/services/ai/AIService.ts:1272-1289
private async adjustCredits(params: { 
  organizationId: string; 
  deltaCents: number  // חיובי = להוסיף, שלילי = לנכות
}): Promise<void> {
  // SQL:
  // UPDATE organizations 
  // SET ai_credits_balance_cents = ai_credits_balance_cents + delta
  // WHERE id = 'org-id'
}
```

**דוגמה:**
1. הזמנו: 25 סנטים
2. השימוש האמיתי: 18 סנטים
3. **החזרה:** `adjustCredits(+7)` → החזרת 7 סנטים ליתרה
4. **או:** השימוש היה 30 סנטים → `adjustCredits(-5)` → ניכוי נוסף של 5

---

### **3. לוג שימוש (Audit Trail):**

כל פעולת AI נרשמת:

```sql
-- טבלת ai_usage_logs
CREATE TABLE ai_usage_logs (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  feature_key VARCHAR(100),         -- 'chat_assistant', 'image_gen', etc.
  provider VARCHAR(50),              -- 'openai', 'anthropic', 'google'
  model VARCHAR(100),                -- 'gpt-4-turbo', 'claude-3-opus'
  charged_cents INTEGER,             -- כמה חויב
  status VARCHAR(20),                -- 'success' / 'error'
  latency_ms INTEGER,                -- כמה זמן לקח
  created_at TIMESTAMPTZ
);
```

**מטרות:**
- 📊 דוחות שימוש חודשיים
- 🔍 ניפוי שגיאות
- 💰 חיוב מדויק
- 📈 Analytics

---

## 🎯 מי אחראי על חלוקת קרדיטים?

### **רמת ארגון (Organization-Level)**

**כל ארגון מקבל מכסה חודשית:**

```typescript
// lib/billing/pricing.ts
export const AI_CREDITS_PER_PLAN: Record<PackageType, number> = {
  solo: 5_000,         // ₪50
  the_empire: 25_000,  // ₪250
};
```

**חשוב להבין:**
- ✅ **אין חלוקה בין משתמשים** - כל הארגון משתף מכסה אחת
- ✅ **First Come First Served** - מי שמשתמש ראשון, צורך
- ✅ **נגמר → כולם חסומים** - עד תוספת קרדיטים או חידוש חודשי

### **דוגמה:**

ארגון "חברת אקס" - חבילת **The Empire** (₪499):
- מכסה חודשית: **25,000 cents** (₪250)
- יש 5 משתמשים:
  - דני (CEO) - השתמש ב-10,000 cents (₪100)
  - רונית (שיווק) - השתמשה ב-8,000 cents (₪80)
  - יוסי (מכירות) - השתמש ב-5,000 cents (₪50)
  - מיכל (תפעול) - השתמשה ב-2,000 cents (₪20)
  - **נותרו:** 0 cents

**מה קורה עכשיו?**
- ❌ כל 5 המשתמשים **לא יכולים** להשתמש ב-AI
- ⚠️ הודעה: "נגמרו קרדיטי AI - פנה למנהל המערכת"
- 💰 פתרון: Super Admin מוסיף קרדיטים ידנית

---

## 🔧 כפתור "+10₪ קרדיטים" - איך זה עובד?

### **מה הכפתור עושה:**

```typescript
// components/saas/AiBrainPanelV2.tsx:565-567
<Button onClick={async () => { 
  await adjustCredits(1000);  // ← מוסיף 1000 cents = ₪10
  addToast('נוספו 10₪ קרדיטים', 'success'); 
}}>
  + 10₪ קרדיטים
</Button>
```

### **שרשרת הפעולות:**

1. **לחיצה על הכפתור** → קורא ל-`adjustCredits(1000)`

2. **Frontend** → שולח POST request:
```typescript
// components/saas/AiBrainPanelV2.tsx:489-498
const adjustCredits = async (deltaCents: number) => {
  const res = await fetch('/api/admin/ai/credits', {
    method: 'POST',
    headers: { 'x-org-id': selectedOrgKey },
    body: JSON.stringify({ deltaCents: 1000 }),
  });
};
```

3. **Backend API** → `/app/api/admin/ai/credits/route.ts`:
```typescript
// שורה 71-129
async function POSTHandler(req: Request) {
  await requireSuperAdmin();  // ← רק Super Admin!
  
  const deltaCents = 1000;
  const current = await getBalance(organizationId);
  const next = current + BigInt(1000);
  
  await prisma.organization.update({
    where: { id: organizationId },
    data: { ai_credits_balance_cents: next }
  });
}
```

4. **DB** → עדכון:
```sql
UPDATE organizations 
SET ai_credits_balance_cents = ai_credits_balance_cents + 1000
WHERE id = 'org-uuid';
```

5. **תוצאה:**
- היתרה עלתה ב-**1000 cents** (₪10)
- המשתמשים יכולים להמשיך להשתמש ב-AI

---

### **מי יכול להשתמש בכפתור?**

**רק Super Admin!**

```typescript
await requireSuperAdmin();  // ← בדיקה קשיחה
```

**למה?**
- 💰 זה **הוספת כסף חינם** - לא יכול להיות נגיש לכולם
- 🔒 רק מנהל המערכת (אתה) יכול להוסיף קרדיטים
- 📊 למטרות תמיכה / בדיקות / מענקים

---

## 🌐 ספקי AI שונים - איך זה עובד?

### **ספקים נתמכים:**

```typescript
// AIService תומך ב:
- OpenAI (GPT-4, DALL-E, Whisper)
- Anthropic (Claude)
- Google (Gemini, PaLM)
- Cohere
- Replicate (Stable Diffusion)
```

### **לוגיקת בחירת ספק:**

```typescript
// lib/services/ai/AIService.ts
class AIService {
  async chat(params) {
    // 1. בדוק איזה ספק מוגדר לפיצ'ר הזה
    const config = await getFeatureConfig(params.featureKey);
    
    // 2. ספק ראשי
    const primaryProvider = config.primary_provider;  // 'openai'
    const primaryModel = config.primary_model;        // 'gpt-4-turbo'
    
    // 3. ספק גיבוי (אם ראשי נכשל)
    const fallbackProvider = config.fallback_provider; // 'anthropic'
    const fallbackModel = config.fallback_model;       // 'claude-3-opus'
    
    // 4. נסה ראשי
    try {
      return await openai.chat(primaryModel, ...);
    } catch (error) {
      // 5. אם נכשל → נסה גיבוי
      return await anthropic.chat(fallbackModel, ...);
    }
  }
}
```

---

### **דוגמה מעשית:**

**פיצ'ר:** `chat_assistant` (צ'אט עם AI)

**הגדרות בטבלה `ai_feature_settings`:**

| Field | Value |
|-------|-------|
| feature_key | `chat_assistant` |
| primary_provider | `openai` |
| primary_model | `gpt-4-turbo` |
| fallback_provider | `anthropic` |
| fallback_model | `claude-3-opus` |
| reserve_cost_cents | 25 |

**תרחיש 1: הכל עובד**
1. משתמש שולח: "מה שלומך?"
2. Reserve: 25 cents
3. OpenAI GPT-4: "שלומי טוב, תודה!"
4. Charged: 18 cents
5. Adjust: +7 cents (החזרה)

**תרחיש 2: OpenAI נפל**
1. משתמש שולח: "מה שלומך?"
2. Reserve: 25 cents
3. OpenAI GPT-4: **ERROR 500**
4. **Fallback** → Anthropic Claude
5. Claude: "שלומי מצוין!"
6. Charged: 22 cents
7. Adjust: +3 cents

**תרחיש 3: שניהם נפלו**
1. משתמש שולח: "מה שלומך?"
2. Reserve: 25 cents
3. OpenAI: ERROR
4. Claude: ERROR
5. **Return Error** למשתמש
6. Adjust: +25 cents (החזרה מלאה)

---

## 📊 UX - חוויית משתמש

### **1. יתרה בזמן אמת:**

```
┌─────────────────────────────────┐
│ יתרה: ₪50 (שימוש: ₪30)        │
│ [🔄 רענן]                       │
└─────────────────────────────────┘
```

**קוד:** `AiBrainPanelV2.tsx:554-564`

---

### **2. התראות:**

#### **80% שימוש:**
```
⚠️ שימוש גבוה בקרדיטי AI
נותרו רק ₪10 מתוך ₪50
שקול להוסיף קרדיטים או לשדרג חבילה
```

#### **100% שימוש:**
```
❌ קרדיטי AI נגמרו!
לא ניתן להשתמש ב-AI עד לתוספת קרדיטים
פנה למנהל המערכת
```

---

### **3. דוחות שימוש:**

```
┌─────────────────────────────────────┐
│ דוח שימוש AI - מרץ 2026            │
├─────────────────────────────────────┤
│ Chat Assistant: ₪120 (48%)         │
│ Image Generation: ₪80 (32%)        │
│ Speech-to-Text: ₪30 (12%)          │
│ Embeddings: ₪20 (8%)               │
├─────────────────────────────────────┤
│ סה"כ: ₪250 / ₪250 (100%)          │
└─────────────────────────────────────┘
```

---

## 🔍 הסבר הכפתורים ב-AI Brain Panel

### **1. יתרה + רענון:**
```typescript
// שורה 554-564
<div>
  יתרה: ₪50 (שימוש: ₪30)
  <Button onClick={loadCreditStatus}>
    <RefreshCw /> ← כפתור רענון (העיגול שראית)
  </Button>
</div>
```

**מה הוא עושה:** מרענן את היתרה מה-DB

---

### **2. +10₪ קרדיטים:**
```typescript
// שורה 565-567
<Button onClick={() => adjustCredits(1000)}>
  + 10₪ קרדיטים
</Button>
```

**מה הוא עושה:** מוסיף 1000 cents (₪10) לארגון

---

### **3. אינדוקס (Play):**
```typescript
// שורה 569-571
<Button onClick={runIngest}>
  <Play /> אינדוקס
</Button>
```

**מה הוא עושה:**
- מריץ **אינדוקס של נתוני AI**
- יוצר Embeddings לכל המסמכים
- מאפשר חיפוש סמנטי
- **לא קשור לקרדיטים** - זה תהליך רקע

---

### **4. Download (JSON):**
```typescript
// שורה 572-574
<Button onClick={downloadAiBackup}>
  <Download />
</Button>
```

**מה הוא עושה:**
- מוריד **גיבוי של הגדרות AI**
- קובץ JSON עם:
  - כל הגדרות הפיצ'רים
  - פרומפטים
  - ספקים
  - מודלים
- **למטרות גיבוי ושחזור**

---

## 🐛 הבעיות שזיהית בתמונה

### **1. יתרה ריקה (לא מציג כלום)**

**סיבה אפשרית:**
- `creditStatus` עדיין null (טוען...)
- או `balance_cents` לא מוגדר ב-DB

**תיקון:** אציג "טוען..." במקום "—"

---

### **2. עיגול מעוך (כפתור רענון)**

**סיבה:**
- כפתור RefreshCw קטן מדי (`w-7 h-7`)
- נראה שבור

**תיקון:** אגדיל ואשפר UI

---

## ✅ סיכום טכני

| שאלה | תשובה |
|------|--------|
| **מה זה קרדיט AI?** | 1 סנט (₪0.01) |
| **כמה מקבלים?** | 5,000-25,000 לפי חבילה |
| **איפה נשמר?** | `organizations.ai_credits_balance_cents` |
| **מי מנהל?** | `lib/services/ai/AIService.ts` |
| **מי צורך?** | כל פעולת AI (chat, image, speech) |
| **מה קורה כשנגמר?** | חסימה עד תוספת/חידוש |
| **מי יכול להוסיף?** | רק Super Admin |
| **אינדוקס זה מה?** | תהליך רקע ליצירת Embeddings |
| **Download JSON?** | גיבוי הגדרות AI |

---

**🎯 המסמך המלא מוכן! עוברים לתיקון ה-UI...**
