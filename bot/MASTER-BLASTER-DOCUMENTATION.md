# מסמך מקור האמת - WAAM-It Blaster (MISRAD AI)

**גרסה:** 4.0  
**תאריך עדכון:** 15/03/2026  
**מטרה:** תיעוד מלא ומסודר של מערכת בלאסטר והאינטגרציה עם MISRAD AI

---

## 🏗️ ארכיטקטורה חדשה (גרסה 4.0)

### מספר 1 (ראשי) = ChatGPT
- עונה על **כל** השאלות
- מפנה לדפים רלוונטיים (`/partners`, `/pricing`, `/login`)
- **לא שולח webhooks** (זה במספר 2)

### מספר 2 (משני) = Rules_webhooks.rules
- רק לשליחת **webhooks** ל-MISRAD AI
- **בלי response** (התשובה מגיעה מ-ChatGPT)
- קובץ: `bot/Rules_webhooks.rules`

---

## ⚠️ עקרון חשוב: אין חיבור ישיר!

**בלאסטר לא תומך בחיבור API ישיר.**  
הדרך היחידה לחבר את הבלאסטר למערכות חיצוניות היא דרך **Google Sheets** + **Make/Integromat** או אינטגרציות דומות.

---

## 🎯 ארכיטקטורת החיבור הנכונה

### ⚠️ חד-כיוונית למידע, דו-כיוונית לשיחה!

**לידים ומידע:** חד-כיוונית (בלאסטר → MISRAD AI)
**שיחות ותגובות:** דו-כיוונית דרך ChatGPT מובנה!

---

## 🤖 הפתרון: ChatGPT מובנה בבלאסטר (גרסת אולטימייט)

### זה משנה הכל!

בלאסטר גרסת **אולטימייט** כוללת **אינטגרציה מלאה עם ChatGPT**:

```
לקוח שואל → ChatGPT עונה → לקוח מקבל תשובה
                              ↓
                         (אם צריך)
                              ↓
                    Rule במספר 2 → Webhook → MISRAD AI
```

### מה אפשר לעשות עם ChatGPT בבלאסטר?

| יכולת | תיאור |
|--------|-------|
| **הודעת מערכת** | הגדרת אישיות ותפקיד ה-AI |
| **בנק ידע** | הטמעת קבצי TXT עם מידע ספציפי |
| **שליחת קבצים** | AI שולח קבצים אוטומטית לפי צורך |
| **פונקציות** | חיבור ל-Webhooks חיצוניים |
| **מילות טריגר** | הפעלה רק כשהלקוח מבקש |
| **הפוגות** | מניעת ספאם |

### איך זה עובד עם MISRAD AI?

1. **לקוח שואל שאלה** → ChatGPT עונה
2. **לקוח מבקש נציג** → נשמר בגיליון → MISRAD AI מקבלת
3. **לקוח מעוניין בשירות** → נשמר כליד → MISRAD AI מקבלת
4. **הצוות רואה את השיחה** ב-MISRAD AI ויכול להמשיך ידנית

---

### זרימת נתונים מלאה:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  לקוח בווטסאפ   │────▶│  WAAM-It         │────▶│  Google Sheets  │
│                 │     │  Blaster         │     │  (Incoming)     │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │  Make           │
                                                 │  (Trigger)      │
                                                 └────────┬────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │  MISRAD AI      │
                                                 │  Webhook API    │
                                                 └─────────────────┘
```

### איך להגיב ללקוחות?

**3 דרכים:**

1. **ChatGPT מובנה** (גרסת אולטימייט) - תגובות חכמות ודינמיות
2. **חוקי הבוט (Rules)** - תגובות אוטומטיות מוגדרות מראש
3. **שליחה ידנית** - אדם אמיתי מגיב דרך הבוט

### מה MISRAD AI כן יכולה לעשות?

| כן | לא |
|-----|-----|
| ✅ לקבל לידים | ❌ לשלוח הודעות ישירות |
| ✅ להציג בפאנל אדמין | ❌ לשלוט בבוט |
| ✅ לשלוח התראות לצוות | ❌ להגיב ללקוחות ישירות |
| ✅ דוחות ואנליטיקס | ❌ לשנות Rules |

**אבל ChatGPT בבלאסטר יכול להגיב!** 🎯

---

## 📊 מבנה Google Sheets

### גיליון 1: Incoming_Leads (לידים נכנסים)
| עמודה | שם | תיאור |
|-------|-----|-------|
| A | Contact | מספר טלפון עם קוד מדינה |
| B | Name | שם הלקוח |
| C | Business_Name | שם העסק |
| D | Industry | תחום/ענף |
| E | Org_Size | גודל ארגון |
| F | Pain_Point | נקודת כאב |
| G | Selected_Plan | חבילה שנבחרה |
| H | Email | אימייל |
| I | Message | תוכן ההודעה |
| J | Source | מקור (whatsapp) |
| K | Rule_ID | מספר כלל |
| L | Type | סוג (lead/signup/demo/support) |
| M | Timestamp | חותמת זמן |


---

## 🔌 הגדרת Webhook ב-Make

### תרחיש 1: לידים נכנסים (מה שראית בתמונה)

**Trigger:** Google Sheets - Watch New Rows  
**Spreadsheet:** MISRAD_AI  
**Sheet:** MISRAD_AI_Leads  
**Headers:** A1:M1

**Action:** HTTP - Make a request
```
URL: https://misrad-ai.com/api/webhooks/blaster?type=lead
Method: POST
Headers:
  - x-webhook-secret: [YOUR_SECRET]
  - Content-Type: application/json

Body:
{
  "phone": "{{Contact}}",
  "name": "{{Name}}",
  "business_name": "{{Business_Name}}",
  "industry": "{{Industry}}",
  "org_size": "{{Org_Size}}",
  "pain_point": "{{Pain_Point}}",
  "selected_plan": "{{Selected_Plan}}",
  "email": "{{Email}}",
  "message": "{{Message}}",
  "source": "{{Source}}",
  "rule_id": "{{Rule_ID}}",
  "timestamp": "{{Timestamp}}"
}
```


### Rules_5.rules (קמפיין לידים רגיל)
- **פורמט:** JSON Array בשורה אחת
- **webhook types:** lead, signup, demo, support
- **כללים עיקריים:** 1, 20, 24-28, 37, 43, 63

### Rules_6.rules (קמפיין שותפים - חדש)
- **פורמט:** JSON Array בשורה אחת
- **webhook types:** campaign_start, partner_signup, affiliate_interest, customer_interest
- **שדות נוספים:** referrer_name, coupon_code, has_media, campaign

---

## 🤖 הגדרת ChatGPT בבלאסטר (גרסת אולטימייט)

### דרישות מוקדמות

1. **גרסת אולטימייט** של WAAM-it Blaster
2. **API Key מ-OpenAI** (מ-OpenAI.com)
3. **טעינת כסף** לחשבון OpenAI (5$ לפחות)

### שלבי הגדרה

#### 1. הגדרת API Key
1. עבור ללשונית **"הודעת הפתיחה"**
2. בחר **ChatGPT** במקום הודעת פתיחה רגילה
3. הדבק את ה-API Key
4. בחר מודל: **GPT-4o mini** (מהיר וזול) או **GPT-4o** (מתקדם)

#### 2. הודעת מערכת (System Prompt)
```
אתה נציג שירות לקוחות של MISRAD AI.
תפקידך:
- לענות על שאלות בנושא המערכת
- להפנות לקוחות מעוניינים לנציג אנושי
- לספק מידע על מחירים וחבילות
- להיות אדיב, מקצועי וקצר

גבולות:
- אל תבטיח הנחות שלא אושרו
- אל תיתן מידע טכני מפורט
- כשהלקוח מבקש נציג - ענה "אעביר אותך לנציג"
```

#### 3. מילות טריגר
הגדר מילים שמפעילות את ChatGPT:
- `נציג` - להעברה לנציג
- `עזרה` - לעזרה כללית
- `מחיר` - למידע על מחירים

#### 4. בנק ידע (Embeddings)
צור קבצי TXT בתיקייה:
- `pricing.txt` - מחירים וחבילות
- `features.txt` - יכולות המערכת
- `faq.txt` - שאלות נפוצות

#### 5. פונקציות (Webhooks)
חיבור ל-MISRAD AI:
```
שם: create_lead
קישור: https://misrad-ai.com/api/webhooks/blaster
תיאור: Create a new lead in MISRAD AI system
פרמטרים: phone, name, interest
```

### דוגמת System Prompt מלא

```markdown
You are a customer service representative for MISRAD AI, a business management platform.

## Your Role:
- Answer questions about the platform
- Help customers understand pricing and packages
- Transfer interested customers to a human agent

## Knowledge:
- Packages: Solo (149₪), The Closer (249₪), The Empire (499₪)
- Features: CRM, invoicing, scheduling, WhatsApp bot
- Support: Available Sunday-Thursday, 9:00-18:00

## Rules:
- Be friendly and professional
- Keep responses short (under 100 words)
- When customer asks for representative, say "I'll connect you" and stop
- Never promise discounts or special deals

## Triggers:
- "נציג" or "representative" → transfer to human
- "מחיר" or "price" → show pricing
- "עזרה" or "help" → offer assistance
```

---

## 🔧 Google Apps Script לחיבור

### URL נוכחי:
```
https://script.google.com/macros/s/AKfycbxaYfqlidnLrgmP1-SkFGwvlDfAKNLiyJAIHRQ1rjdLfCE-eeBXuHu0rc02zP-YlFXT/exec
```

### מה הסקריפט עושה:
1. מקבל נתונים מהבלאסטר
2. שומר בגיליון Google Sheets
3. מעביר ל-MISRAD AI webhook

---

## 🔐 אבטחה

### Webhook Secret
```
c460767c3beeb636df2072746150b402d6295f8c90af33d9cc191824dc0b7630
```

**מיקומים:**
- Google Apps Script: `CONFIG.MISRAD_AI_SECRET`
- MISRAD AI .env: `BLASTER_WEBHOOK_SECRET`
- Make HTTP Header: `x-webhook-secret`

---

## 🚀 שלבי התקנה מלאים

### שלב 1: Google Sheets
1. צור/פתח גיליון בשם `MISRAD_AI`
2. צור טאב `MISRAD_AI_Leads`
3. הוסף כותרות בשורה 1 (A1:M1)
4. הרץ `setupSheets()` ב-Google Apps Script

### שלב 2: Google Apps Script
1. פתח Extensions → Apps Script
2. הדבק את הקוד מ-`google-apps-script-blaster.gs`
3. שמור ופרוס (Deploy)
4. העתק את ה-URL

### שלב 3: Make (Integromat)
1. צור תרחיש חדש
2. הוסף Trigger: Google Sheets - Watch New Rows
3. הגדר: Spreadsheet ID, Sheet Name, Headers range
4. הוסף Action: HTTP - Make a request
5. הגדר את ה-URL, Headers, ו-Body
6. שמור והפעל

### שלב 4: בלאסטר
1. עבור ללשונית "אוטומציה"
2. בחר "לוג הודעות"
3. הגדר:
   - סוג גישה: Google Sheets
   - קישור: URL מה-Apps Script
   - גיליון: MISRAD_AI_Leads
4. הפעל

### שלב 5: בדיקה
1. שלח הודעה לבוט בווטסאפ
2. בדוק שנוצרה שורה בגיליון
3. בדוק שהליד הגיע ל-MISRAD AI

---

## 📋 סוגי Webhooks ב-MISRAD AI

| סוג | מתי נשלח | סטטוס ב-DB |
|-----|----------|------------|
| `lead` | ליד חדש - התעניינות ראשונית | new |
| `signup` | לקוח סיים הרשמה | trial |
| `demo` | בקשת הדגמה/פגישה | demo_booked |
| `support` | פניה לתמיכה | new |
| `campaign_start` | כניסה לקמפיין חדש | campaign |
| `partner_signup` | אדם נרשם כשותף | partner |
| `affiliate_interest` | עניין בתוכנית שותפים | affiliate |
| `customer_interest` | עניין כלקוח | lead |

---

## 🎓 יכולות הבוט (Rules)

### סוגי תגובות אפשריים:
1. **טקסט רגיל** - עם עיצוב (bold, italic, emoji)
2. **קבצים** - תמונות, PDF, וידאו
3. **מדבקות** - קבצי PNG עם רקע שקוף
4. **הקלטות קוליות** - MP3/OGG
5. **הנפשות** - GIF (וידאו עד 6 שניות)
6. **וידאו בועה** - הערת וידאו (עד 60 שניות)
7. **כרטיסי איש קשר** - VCard
8. **מפות מיקום** - עם קואורדינטות
9. **סקרים** - שאלונים עם כפתורים

### תגיות מיוחדות לשליחה:
- `(file)נתיב(/file)` - קובץ
- `(sticker)נתיב(/sticker)` - מדבקה
- `(recording)נתיב(/recording)` - הקלטה
- `(animation)נתיב(/animation)` - הנפשה
- `(circle)נתיב(/circle)` - וידאו בועה

---

## ⚡ אוטומציה מתקדמת בבלאסטר

### שליחת הודעות מתוזמנות:
1. יצירת תזמון בפאנל התזמונים
2. הגדרת תאריך ושעה
3. שליחה מחזורית (אופציונלי)
4. החרגת ימים (שבת וכו')

### רשימות קמפיינים:
- יצירת רשימות נפרדות לנמענים
- הוספה/הסרה/העברה בין רשימות
- טעינה ישירה למסך שליחה

### משתנים (Variables):
- איסוף מידע מהלקוחות
- שימוש בהודעות: `{VAR1}`, `{Name}`
- שמירה בגיליון עם סולמית: `#VAR1`

---

## 🔍 טרoubleshooting

| בעיה | פתרון |
|------|-------|
| בלאסטר לא מזהה גיליון | ודא שהשם מדויק, טען מחדש |
| הלידים לא נכנסים ל-MISRAD | בדוק את ה-webhook URL ב-Make |
| שגיאת 401 | בדוק שה-secret נכון בשני הצדדים |
| המספרים לא מופיעים נכון | ודא שיש קוד מדינה (972...) |
| הבוט לא מגיב | בדוק שהבוט דלוק ומחובר |

---

## 📞 פרטי תמיכה

**מתכנת בלאסטר:** [לפנות לפי הצורך]  
**דוגמאות קוד:** נמצא ב-`/bot/`  
**בדיקת webhook:** `scripts/test-blaster-webhook.js`

---

## 📝 היסטוריית שינויים

### גרסה 3.0 (15/03/2026)
- **גילוי משמעותי:** ChatGPT מובנה בבלאסטר גרסת אולטימייט!
- הוספת מדריך מלא להגדרת ChatGPT
- עדכון ארכיטקטורה: דו-כיוונית לשיחות דרך AI
- הוספת דוגמת System Prompt
- הוספת מידע על בנק ידע ופונקציות

### גרסה 2.0 (14/03/2026)
- תיקון: הסרת אפשרות "חיבור ישיר" שאינה קיימת
- הוספת תיעוד מלא ל-Rules_6 (קמפיין שותפים)
- עדכון מבנה Google Sheets
- תיעוד מלא של תרחיש Make

### גרסה 1.0 (12/03/2025)
- יצירת קמפיין Rules_5
- חיבור ראשוני ל-MISRAD AI

---

**מסמך זה הוא מקור האמת היחיד.**  
כל שינוי צריך להתעדכן כאן תחילה.
