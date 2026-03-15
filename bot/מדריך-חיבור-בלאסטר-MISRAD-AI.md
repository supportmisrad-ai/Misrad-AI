# מדריך חיבור מלא - WAAM-It Blaster למערכת MISRAD AI

**גרסה:** 1.0  
**תאריך:** 12/03/2025  
**מטרה:** חיבור ישיר של הבוט למערכת ללא גוגל שיטס

---

## 📋 מה נדרש

### 1. קבצים חדשים שנוצרו
- `BotApi-MISRAD-AI.json` - קונפיגורציה חדשה לבלאסטר
- מסמך זה - הוראות התקנה

### 2. הגדרות במערכת MISRAD AI
וודא שקיים ב-`.env`:
```env
BLASTER_WEBHOOK_SECRET=your_secret_key_here
```

---

## 🚀 שלבי התקנה

### שלב 1: גיבוי הקונפיגורציה הישנה
```
1. כנס לתיקייה: WAAM-It Blaster/
2. שנה שם לקובץ: BotApi.json → BotApi-backup.json
3. שנה שם לקובץ החדש: BotApi-MISRAD-AI.json → BotApi.json
```

### שלב 2: עדכון ה-Webhook Secret
פתח את `BotApi.json` ועדכן את השדה:
```json
"WebhookSecret": "your_actual_secret_from_env"
```

### שלב 3: הפעלת הבלאסטר מחדש
```
1. סגור את תוכנת WAAM-It Blaster
2. הפעל אותה מחדש
3. ודא שהיא מזהה את הקונפיגורציה החדשה
```

### שלב 4: בדיקה
שלח הודעת בדיקה מהוואטסאפ לבוט ובדוק:
1. האם הליד נכנס לטבלת `botLead` במסד הנתונים?
2. האם השיחה נרשמת בטבלת `botConversation`?
3. האם ניתן לראות את הליד בפאנל האדמין?

---

## 📊 מבנה הנתונים

### טבלת botLead (לידים)
| שדה | תיאור | מקור |
|-----|-------|------|
| phone | מספר טלפון | Headers[1] |
| name | שם | Headers[2] |
| business_name | שם עסק | Headers[3] |
| industry | תעשייה | Headers[4] |
| org_size | גודל ארגון | Headers[5] |
| pain_point | נקודת כאב | Headers[6] |
| selected_plan | חבילה נבחרת | Headers[7] |
| email | אימייל | Headers[8] |
| source | מקור | 'whatsapp' |
| status | סטטוס | new/trial/demo_booked |
| score | ציון | מחושב אוטומטית |

### טבלת botConversation (שיחות)
| שדה | תיאור | מקור |
|-----|-------|------|
| lead_id | קשר לליד | יצירה אוטומטית |
| direction | כיוון | 'in' או 'out' |
| message | תוכן ההודעה | Headers[3] |
| rule_id | מזהה כלל | Headers[4] |
| variables | משתנים | כל ה-body |

---

## 🔍 בדיקות

### בדיקת webhook ידנית
```bash
curl -X POST https://misrad-ai.com/api/webhooks/blaster?type=lead \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: YOUR_SECRET" \
  -d '{
    "phone": "972559296626",
    "name": "בדיקה",
    "business": "בדיקה בע"מ",
    "message": "היי, אני רוצה לדבר על מערכת",
    "rule_id": "1"
  }'
```

### בדיקת לידים במסד הנתונים
```sql
SELECT * FROM botLead ORDER BY created_at DESC LIMIT 5;
SELECT * FROM botConversation ORDER BY created_at DESC LIMIT 5;
```

---

## ⚠️ בעיות נפוצות

### הבלאסטר לא מזהה את הקונפיגורציה החדשה
**פתרון:** סגור את הבלאסטר לגמרי (כולל מ-system tray) והפעל מחדש.

### מקבל שגיאת 401 Unauthorized
**פתרון:** בדוק שה-`WebhookSecret` ב-`BotApi.json` תואם ל-`BLASTER_WEBHOOK_SECRET` ב-`.env`.

### הנתונים לא נשמרים
**פתרון:** בדוק שהטבלאות `botLead` ו-`botConversation` קיימות בסכמה:
```bash
npx prisma migrate status
```

### הבלאסטר ממשיך לשלוח לגוגל שיטס
**פתרון:** ודא ששינית את שם הקובץ הנכון - `BotApi.json` צריך להיות הקובץ החדש.

---

## 📝 הגדרות מתקדמות

### סוגי lead (type parameter)
ה-webhook תומך ב-4 סוגים:
- `lead` (ברירת מחדל) - ליד חדש
- `signup` - הרשמה למערכת → מעדכן סטטוס ל-trial
- `demo` - בקשת הדגמה → מעדכן סטטוס ל-demo_booked
- `support` - פניה לתמיכה

### ניקוד לידים (Lead Scoring)
המערכת מחשבת ציון אוטומטית:
- כל אינטראקציה: +1 נקודה
- support: +5 נקודות
- demo: +30 נקודות
- signup: +50 נקודות

---

## 🔄 שחזור למצב קודם

אם צריך לחזור לגוגל שיטס:
```
1. מחק/שנה שם ל-BotApi.json החדש
2. החזר את BotApi-backup.json לשם BotApi.json
3. הפעל מחדש את הבלאסטר
```

---

## 📞 תמיכה

**במקרה של בעיות:**
1. בדוק לוגים בבלאסטר (BotLog.txt)
2. בדוק לוגים במערכת (לוגי Vercel/שרת)
3. ודא שהטבלאות קיימות בסכמת Prisma
4. בדוק שה-secret תואם בשני הצדדים

---

**מסמך זה נוצר אוטומטית**  
**עודכן:** 12/03/2025
