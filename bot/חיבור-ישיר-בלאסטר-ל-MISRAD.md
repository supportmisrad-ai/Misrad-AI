# חיבור ישיר - בלאסטר ל-MISRAD AI (ללא גיליון)
# גרסה 1.0 - Simple & Direct

## 🎯 חיבור ישיר ללא Google Sheets

### יתרונות:
- ✅ אין תלות בגוגל
- ✅ מהיר יותר
- ✅ פשוט יותר להגדרה
- ✅ הלידים נכנסים ישר למערכת

---

## 🔧 שלבי התקנה

### 1. מצא את ה-Webhook Secret

הקוד כבר קיים ב-Google Apps Script שלך:
```javascript
const CONFIG = {
  MISRAD_AI_SECRET: "c460767c3beeb636df2072746150b402d6295f8c90af33d9cc191824dc0b7630"
};
```

**העתק את ה-secret הזה** (או השתמש ב-secret חדש שתגדיר ב-.env)

### 2. הוסף Secret ל-.env.local

בקובץ `.env.local` של הפרויקט:
```
BLASTER_WEBHOOK_SECRET=c460767c3beeb636df2072746150b402d6295f8c90af33d9cc191824dc0b7630
```

### 3. הגדר את הבלאסטר (3 שינויים פשוטים)

#### שינוי 1: שליחת הודעה (Leads)
**מקום:** לשונית "אוטומציה" → "שליחת הודעה"

| שדה | ערך |
|-----|-----|
| פעולה | שליחת הודעה |
| סוג גישה | קונסולת ענן |
| קישור | `https://misrad-ai.com/api/webhooks/blaster?type=lead` |
| שיטה | POST |
| Content-Type | application/json |
| x-webhook-secret | `c460767c3beeb636df2072746150b402d6295f8c90af33d9cc191824dc0b7630` |

**Body (JSON):**
```json
{
  "phone": "{contact}",
  "name": "{WhatsName}",
  "message": "{message}",
  "rule_id": "{RuleId}",
  "source": "whatsapp"
}
```

#### שינוי 2: לוג הודעות (Conversations)
**מקום:** לשונית "אוטומציה" → "לוג הודעות"

| שדה | ערך |
|-----|-----|
| פעולה | לוג הודעות |
| סוג גישה | קונסולת ענן |
| קישור | `https://misrad-ai.com/api/webhooks/blaster?type=conversation` |
| שיטה | POST |
| Content-Type | application/json |
| x-webhook-secret | `c460767c3beeb636df2072746150b402d6295f8c90af33d9cc191824dc0b7630` |

#### שינוי 3: משתנים (Variables) - אופציונלי
**מקום:** לשונית "אוטומציה" → עדכון משתנים

| שדה | ערך |
|-----|-----|
| פעולה | עדכון משתנים |
| סוג גישה | קונסולת ענן |
| קישור | `https://misrad-ai.com/api/webhooks/blaster?type=variable` |
| שיטה | POST |
| Content-Type | application/json |
| x-webhook-secret | `c460767c3beeb636df2072746150b402d6295f8c90af33d9cc191824dc0b7630` |

**Body (JSON):**
```json
{
  "phone": "{contact}",
  "business": "{business}",
  "industry": "{industry}",
  "org_size": "{orgsize}",
  "pain_point": "{painpoint}",
  "selected_plan": "{selectedplan}",
  "source": "whatsapp"
}
```

---

## 📝 משתנים זמינים בבלאסטר

השתמש בסוגריים מסולסלים `{}` כדי להזין משתנים:

| משתנה | תיאור |
|-------|-------|
| `{contact}` | מספר טלפון |
| `{WhatsName}` | שם הוואטסאפ |
| `{message}` | תוכן ההודעה |
| `{RuleId}` | מזהה הכלל |
| `{business}` | שם העסק |
| `{industry}` | תחום |
| `{orgsize}` | גודל ארגון |
| `{painpoint}` | נקודת כאב |
| `{selectedplan}` | חבילה שנבחרה |
| `{email}` | אימייל |

---

## ✅ בדיקת חיבור

### בדיקה 1: בדוק בלוגים של Vercel/Netlify
פתח את לוגים והחפש:
```
[blaster-webhook] Received: {...}
```

### בדיקה 2: בדוק בפאנל אדמין
היכנס ל-`/app/admin/bot` וראה אם הלידים מופיעים

### בדיקה 3: בדיקה ידנית
הרץ את הסקריפט הבא:
```bash
curl -X POST https://misrad-ai.com/api/webhooks/blaster?type=lead \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: c460767c3beeb636df2072746150b402d6295f8c90af33d9cc191824dc0b7630" \
  -d '{
    "phone": "972501234567",
    "name": "בדיקה",
    "message": "הודעת בדיקה",
    "business": "עסק בדיקה"
  }'
```

---

## 🆘 פתרון בעיות

| בעיה | פתרון |
|------|--------|
| "401 Unauthorized" | ודא שה-secret נכון בשני המקומות |
| "500 Internal Error" | בדוק לוגים ב-Vercel |
| הליד לא נכנס | בדוק שמספר הטלפון עם קוד מדינה (972...) |
| הודעה לא נשלחת | בדוק ש-"הפעל" מסומן באוטומציה |

---

## 🔐 אבטחה

- השתמש ב-secret חזק (64 תווים)
- שמור את ה-secret ב-.env.local בלבד
- אל תחשוף את ה-secret בקוד Frontend
- חשב להחליף secret כל כמה חודשים

---

## 🎉 סיום

לאחר ההגדרה:
1. הלידים ייכנסו **ישירות** למערכת MISRAD AI
2. אין צורך בגיליון Google
3. אין צורך ב-Google Apps Script
4. הכל במקום אחד!

**מוכן לעבודה! 🚀**
