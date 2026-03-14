# מדריך הפעלה מלא - Blaster + MISRAD AI

## סקירה כללית

```
WhatsApp User
     ↓
Blaster Bot (Rules_5 / Rules_6)
     ↓
Google Apps Script (Web App)
     ↓
Google Sheets (לוגים)
     ↓
MISRAD AI Webhook (/api/webhooks/blaster)
     ↓
Database (BotLead + BotConversation)
```

---

## שלב 1: Google Sheets

### 1.1 יצירת גיליון חדש
1. כנס ל-[sheets.google.com](https://sheets.google.com)
2. צור גיליון חדש בשם `MISRAD AI Bot Logs`

### 1.2 יצירת גיליונות (Sheets)
בתוך הגיליון, צור 4 טאבים:

| שם גיליון | שימוש | כותרות נדרשות |
|-----------|-------|---------------|
| `Variable_Log` | משתנים ופרטים | Contact, Name, Business, Email, Industry, Org_Size, Pain_Point, Selected_Plan, Message, Rule_ID, Timestamp |
| `Lead_Log` | לידים חדשים | Phone, Name, Business, Email, Industry, Org_Size, Pain_Point, Selected_Plan, Status, Source, Timestamp |
| `Conversation_Log` | היסטוריית שיחות | Phone, Message, Direction, Timestamp, Rule_ID |
| `Errors` | שגיאות (נוצר אוטומטית) | Timestamp, Error_Data |

### 1.3 כותרות מומלצות ל-Variable_Log:
```
A1: Contact
B1: Name
C1: Business
D1: Email
E1: Industry
F1: Org_Size
G1: Pain_Point
H1: Selected_Plan
I1: Message
J1: Rule_ID
K1: Timestamp
```

---

## שלב 2: Google Apps Script

### 2.1 יצירת פרויקט
1. כנס ל-[script.google.com](https://script.google.com)
2. לחץ "New Project"
3. שנה שם ל-`MISRAD AI Blaster Integration`

### 2.2 הדבקת הקוד
העתק את הקוד מ-`scripts/google-apps-script-blaster.gs`

### 2.3 עדכון הסוד (חשוב!)
```javascript
const CONFIG = {
  MISRAD_AI_WEBHOOK: "https://misrad-ai.com/api/webhooks/blaster",
  MISRAD_AI_SECRET: "הזן_כאן_את_הסוד_מה_ENV",  // <-- BLASTER_WEBHOOK_SECRET
  LOG_TO_SHEET: true
};
```

**איך לקבל את הסוד:**
```bash
# בדוק את הערך ב-Vercel/Supabase
BLASTER_WEBHOOK_SECRET=xxx
```

### 2.4 פריסה (Deploy)
1. לחץ "Deploy" → "New deployment"
2. בחר סוג: "Web app"
3. תיאור: `MISRAD AI Integration v1.3`
4. Execute as: `Me`
5. Who has access: `Anyone`
6. לחץ "Deploy"
7. **העתק את ה-URL!** (נראה כך: `https://script.google.com/macros/s/XXX/exec`)

---

## שלב 3: הגדרת Blaster

### 3.1 BotApi.json
עדכן את הקובץ `BotApi.json` ב-Blaster:

```json
{
  "apiUrl": "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec",
  "sheets": {
    "variables": "Variable_Log",
    "leads": "Lead_Log",
    "conversations": "Conversation_Log"
  }
}
```

### 3.2 משתנים ב-Blaster
ודא שהמשתנים הבאים מוגדרים:

| משתנה | תיאור | דוגמה |
|-------|-------|-------|
| `{{contact}}` | מספר טלפון | 972559296626 |
| `{{name}}` | שם הלקוח | יוסי כהן |
| `{{business}}` | שם העסק | חברת ייעוץ |
| `{{email}}` | אימייל | yossi@example.com |
| `{{industry}}` | תחום | ייעוץ עסקי |
| `{{org_size}}` | גודל ארגון | 5-10 |
| `{{pain_point}}` | כאב ראשי | ניהול לקוחות |
| `{{selected_plan}}` | חבילה נבחרת | the_empire |
| `{{rule_id}}` | מזהה כלל | campaign-007 |

---

## שלב 4: Webhooks ב-Rules

### Rules_5 (קיים)
| Rule ID | Type | הפעלה |
|---------|------|-------|
| a3d0095b | lead | פתיחה/שלום |
| 1a9e5323 | signup | סיום הרשמה |
| 81f27d03 | demo | בקשת הדגמה |
| be1ed7d6 | support | תמיכה |

### Rules_6 (קמפיין)
| Rule ID | Type | הפעלה |
|---------|------|-------|
| campaign-001 | campaign_start | התחלת קמפיין |
| campaign-003 | customer_interest | "אני רוצה להצטרף כלקוח" |
| campaign-005 | customer_source | "פרסומת בפייסבוק" |
| campaign-006 | affiliate_interest | "אני רוצה להרוויח כסף" |
| campaign-007 | partner_signup | "הרשמה כשותף" |
| campaign-013 | support | "דברו איתי" |
| campaign-014 | signup_click | "להרשמה עם 50% הנחה" |

---

## שלב 5: בדיקה

### 5.1 בדיקת ה-Web App
```bash
# בדיקת גרסה
curl "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=version"

# צפוי: "1.3"
```

### 5.2 בדיקת webhook ל-MISRAD AI
```bash
curl -X POST "https://misrad-ai.com/api/webhooks/blaster?type=lead" \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: YOUR_SECRET" \
  -d '{"phone":"972559296626","name":"Test User","business":"Test Biz"}'
```

### 5.3 בדיקה מה-WhatsApp
1. שלח הודעה לבוט: "היי"
2. בדוק שנוצר שורה ב-Google Sheets
3. בדוק שנוצר BotLead ב-DB

---

## פתרון בעיות

### הבוט לא שולח נתונים
1. בדוק שה-URL ב-BotApi.json נכון
2. בדוק שהגיליונות קיימים עם הכותרות הנכונות
3. בדוק את לוג ה-Errors בגיליון

### הנתונים לא מגיעים ל-MISRAD AI
1. בדוק ש-MISRAD_AI_SECRET נכון
2. בדוק שה-webhook פעיל (לא מחזיר 401)
3. בדוק את הלוגים ב-Google Apps Script

### שגיאת 401 Unauthorized
- הסוד ב-CONFIG לא תואם ל-BLASTER_WEBHOOK_SECRET ב-Vercel

---

## קבצים רלוונטיים

| קובץ | מיקום |
|------|-------|
| Google Apps Script | `scripts/google-apps-script-blaster.gs` |
| Webhook Handler | `app/api/webhooks/blaster/route.ts` |
| Rules_5 | `bot/Rules_5.rules` |
| Rules_6 | `bot/Rules_6.rules` |
| BotLead Model | `prisma/schema.prisma` |

---

## סביבות

| סביבה | Webhook URL |
|-------|-------------|
| Production | `https://misrad-ai.com/api/webhooks/blaster` |
| Development | `http://localhost:3000/api/webhooks/blaster` |

---

**נוצר:** 14/03/2026
**גרסה:** 1.0
