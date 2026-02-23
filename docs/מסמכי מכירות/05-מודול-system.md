# 💼 System — מכירות ו-CRM

> **מחיר:** ₪149/חודש (סולו) | כלול בחבילת מכירות, חבילת הכל  
> **משתמשים:** 1 (סולו) או 5 (בחבילה)  
> 🎁 + מודול Finance במתנה לכל לקוח  
> **תפקיד:** CRM מלא — ניהול לידים, צינור מכירה, חייגן, ניתוח שיחות AI וחיזוי סגירות. ה-AI מנתח כל שיחה, נותן ציון, ואומר לך מה לעשות.

---

## מסכים ופיצ'רים

### 1. ניהול לידים — Pipeline

| פיצ'ר | תיאור |
|--------|--------|
| **8 שלבי Pipeline** | Incoming → Contacted → Meeting → Proposal → Negotiation → Won / Lost / Churned |
| **Drag & Drop** | גרור ליד בין שלבים (Framer Motion) |
| **Lead Scoring** | ציון AI אוטומטי (0-100) לפי פעילות ונתונים |
| **Custom Fields** | שדות מותאמים (JSONB) — industry, employees, budget... |
| **Timeline** | היסטוריית כל האינטראקציות עם הליד |
| **Next Action** | תאריך + תיאור פעולה הבאה |
| **ערך עסקה** | `value` — שווי הליד בש"ח |
| **Tags** | תיוג חופשי לסינון וחיפוש |
| **Source Tracking** | website, referral, cold_call, event... |
| **Soft Delete** | מחיקה רכה עם אפשרות שחזור |

**Pipeline ויזואלי:**
```
Incoming → Contacted → Meeting → Proposal → Negotiation
    ↓          ↓          ↓          ↓            ↓
   Lost      Lost       Lost      Lost      Won ✅ / Lost ❌
```

**Custom Fields — דוגמה:**
```json
{
  "industry": "tech",
  "employees": "50-100",
  "budget": "high",
  "decision_maker": "CTO",
  "competitor": "Salesforce"
}
```

### 2. חייגן (Dialer)

| פיצ'ר | תיאור |
|--------|--------|
| **Click-to-Call** | לחץ על מספר → חייג |
| **היסטוריית שיחות** | כל השיחות מתועדות |
| **הערות שיחה** | רישום מהיר אחרי שיחה |
| **תוצאת שיחה** | answered / no_answer / busy / voicemail |

### 3. חיזוי סגירות (Deal Closure Prediction) ⭐ NEW

**פיצ'ר חדש - פברואר 2026**

| פיצ'ר | תיאור |
|--------|--------|
| **Closure Probability** | 0-100% סיכוי שהליד יסגור |
| **Closure Rationale** | הסבר AI למה הסיכוי כזה |
| **Recommended Action** | פעולה ספציפית + deadline |
| **עדכון דינמי** | מתעדכן אוטומטי עם כל אינטראקציה |

**דוגמה:**
```json
{
  "closureProbability": 75,
  "closureRationale": "הלקוח הביע עניין חזק, יש לו תקציב ו-authority. החיסכון העיקרי הוא זמן על תיאום צוות.",
  "recommendedAction": "שלח הצעת מחיר מפורטת עד יום רביעי. הדגש חיסכון בזמן ניהול (40%)."
}
```

### 4. ניתוח שיחות AI ⭐

| פיצ'ר | תיאור |
|--------|--------|
| **ציון שיחה** | 0-100 (AI מנתח איכות השיחה) |
| **רגש** | חיובי / ניטרלי / שלילי |
| **נושאים** | מה דיברו (מחיר, מוצר, מתחרים...) |
| **התנגדויות** | מה הלקוח התנגד (יקר, לא בטוח...) |
| **נקודות חיכוך** | רגעים בעייתיים בשיחה |
| **המלצות** | מה לעשות עכשיו (שלח הצעה, חזור ביום ראשון...) |

**Output של ניתוח שיחה:**
```json
{
  "score": 85,
  "sentiment": "positive",
  "topics": ["pricing", "features", "timeline"],
  "objections": ["too expensive", "need to think"],
  "friction_points": ["minute 3: hesitation on price"],
  "next_steps": ["Send proposal", "Follow up Thursday"],
  "summary": "שיחה חיובית. הלקוח מעוניין אך מתלבט במחיר."
}
```

### 5. הצעות מחיר

| פיצ'ר | תיאור |
|--------|--------|
| **יצירה מהירה** | בחר מוצרים → הגדר כמות/מחיר → PDF |
| **PDF אוטומטי** | עיצוב מקצועי עם לוגו |
| **שליחה במייל** | ישירות מהמערכת |
| **סטטוס** | draft / sent / viewed / accepted / rejected |

### 6. מוצרים ומחירון

| פיצ'ר | תיאור |
|--------|--------|
| **קטלוג** | שם, תיאור, מחיר, קטגוריה |
| **מלאי** | כמות זמינה |
| **מטבעות** | ILS / USD / EUR |

### 7. Portal שותפים

| פיצ'ר | תיאור |
|--------|--------|
| **הפניות** | שותף שולח ליד |
| **עמלות** | חישוב אוטומטי |
| **מעקב** | סטטוס כל הפנייה |

### 8. אוטומציות

| Trigger | Action |
|---------|--------|
| ליד חדש | יצירת משימה לנציג |
| ליד לא טופל 3 ימים | התראה למנהל |
| ליד עבר ל-Won | שלח מייל ברכה |
| שיחה הסתיימה | צור ניתוח AI |

---

## מודל נתונים

```sql
system_leads:
  id, organization_id
  full_name, company_name, email, phone
  source, stage, value, score
  assigned_to, tags[], custom_fields JSONB
  next_action, next_action_date, last_contact_at
  created_at, updated_at, deleted_at

system_call_analysis:
  id, organization_id
  lead_id, call_duration
  score, sentiment, topics JSONB
  objections JSONB, next_steps JSONB
  summary TEXT

system_pipeline_stages:
  id, organization_id
  name, order, color
```

---

## תהליכי עבודה

### תהליך מכירה מלא
```
1. ליד חדש נכנס (Source: website/referral/event)
2. AI מדרג (Score 0-100)
3. נציג מתקשר (Dialer)
4. AI מנתח שיחה → ציון + המלצות
5. נציג מעביר ל-Meeting
6. אחרי פגישה → Proposal
7. שליחת הצעת מחיר (PDF)
8. מו"מ → Won ✅ או Lost ❌
```

---

## למי זה מתאים?

| ✅ מתאים | ❌ לא מתאים |
|----------|-------------|
| צוותי מכירות B2B | B2C קמעונאי (צריך POS) |
| סוכני ביטוח / נדל"ן | E-commerce (צריך Shopify) |
| Inside Sales | מכירות חד-פעמיות |
| שירותים מקצועיים | |

---

📖 **המשך:** [Social — שיווק →](./06-מודול-social.md)
