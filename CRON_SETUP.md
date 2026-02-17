# 🕐 Cron Job Setup - Trial Expiration Check

מדריך להגדרת Cron Job אוטומטי לבדיקת תקופות ניסיון שפגו תוקפן.

## 🎯 מטרה

הרצת בדיקה יומית אוטומטית שמזהה ארגונים שתקופת הניסיון שלהם הסתיימה ומעדכנת את סטטוסם ל-`expired`.

---

## ⚙️ הגדרה ראשונית

### 1. הוספת CRON_SECRET ל-Environment Variables

הוסף את המשתנה הבא ל-`.env` או ל-Environment Variables של ה-deployment שלך:

```bash
CRON_SECRET=your-super-secret-random-string-here
```

**חשוב**: השתמש במחרוזת אקראית ומאובטחת! דוגמה ליצירת secret:

```bash
openssl rand -base64 32
```

או ב-Node.js:

```javascript
require('crypto').randomBytes(32).toString('base64')
```

---

## 🚀 אפשרויות הגדרה

### אופציה 1: Vercel Cron (מומלץ)

אם אתה משתמש ב-Vercel, הוסף את הקובץ `vercel.json` לשורש הפרויקט:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-trial-expiry",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**לוח זמנים**: `0 2 * * *` = כל יום בשעה 02:00 (UTC)

**שים לב**: Vercel Cron מוסיף אוטומטית את ה-authorization header עם הערך של `CRON_SECRET`.

---

### אופציה 2: GitHub Actions

צור קובץ `.github/workflows/check-trial-expiry.yml`:

```yaml
name: Check Trial Expiry

on:
  schedule:
    # Runs every day at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch: # Allows manual trigger

jobs:
  check-trials:
    runs-on: ubuntu-latest
    steps:
      - name: Call Cron Endpoint
        run: |
          curl -X POST https://yourdomain.com/api/cron/check-trial-expiry \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json" \
            -w "\nHTTP Status: %{http_code}\n"
```

**הגדרה**:
1. לך ל-GitHub Repository → Settings → Secrets → Actions
2. הוסף Secret חדש בשם `CRON_SECRET`
3. הכנס את אותו ערך שהגדרת ב-Environment Variables

---

### אופציה 3: ידני (לצורך בדיקה)

ניתן להריץ את הבדיקה ידנית באמצעות curl:

```bash
curl -X POST https://yourdomain.com/api/cron/check-trial-expiry \
  -H "Authorization: Bearer your-cron-secret-here" \
  -H "Content-Type: application/json"
```

תשובה מוצלחת:

```json
{
  "success": true,
  "timestamp": "2024-01-15T14:30:00.000Z",
  "data": {
    "totalChecked": 25,
    "totalExpired": 3,
    "expiredOrganizations": [
      {
        "id": "abc-123",
        "name": "Studio Yoga",
        "slug": "studio-yoga",
        "ownerEmail": "owner@example.com",
        "daysExpired": 2
      }
    ]
  }
}
```

---

## 🔐 אבטחה

### אימות Request

ה-API Route מוגן על ידי בדיקת `Authorization` header:

```typescript
Authorization: Bearer <CRON_SECRET>
```

אם ה-header חסר או לא תקין, התשובה תהיה:

```json
{
  "error": "Unauthorized - invalid token"
}
```

### הגנות נוספות

- ✅ CRON_SECRET חייב להיות מוגדר ב-Environment Variables
- ✅ לא ניתן לגשת לנתיב ללא Authorization header
- ✅ כל ניסיון גישה לא מורשה נרשם ב-logger
- ✅ ה-Secret לא נחשף ב-logs או ב-response

---

## 📊 לוגים ומעקב

### לוגים אוטומטיים

כל הרצה של ה-Cron Job נרשמת באופן אוטומטי:

```typescript
logger.info('check-trial-expiry-cron', 'Starting cron job execution');
logger.info('checkAndDisableExpiredOrganizations', 'Found X organizations in trial status');
logger.info('checkAndDisableExpiredOrganizations', 'Disabled expired trial', {
  organizationId: 'abc-123',
  organizationName: 'Studio Yoga',
  ownerEmail: 'owner@example.com',
  daysExpired: 2
});
```

### מעקב אחר תוצאות

לאחר כל הרצה, תוכל לראות ב-logs:
- כמה ארגונים נבדקו
- כמה ארגונים פג תוקפם
- רשימת הארגונים שעודכנו (עם פרטים מלאים)

---

## 🧪 בדיקה

### בדיקה לוקלית

1. הפעל את השרת המקומי:
   ```bash
   npm run dev
   ```

2. הרץ את הבדיקה:
   ```bash
   curl -X POST http://localhost:3000/api/cron/check-trial-expiry \
     -H "Authorization: Bearer $(grep CRON_SECRET .env | cut -d '=' -f2)" \
     -H "Content-Type: application/json"
   ```

### בדיקה ב-Production

```bash
curl -X POST https://yourdomain.com/api/cron/check-trial-expiry \
  -H "Authorization: Bearer your-production-cron-secret" \
  -H "Content-Type: application/json"
```

---

## 🎨 חוויית משתמש

### מה קורה כשמשתמש מנסה להיכנס לארגון שפג תוקפו?

1. **Middleware Check**: המשתמש מנסה לגשת ל-`/w/[orgSlug]`
2. **Workspace Access Check**: הבדיקה מזהה `subscription_status = 'expired'`
3. **Redirect**: המשתמש מועבר אוטומטית ל-`/app/trial-expired`
4. **Display**: מוצג דף מעוצב עם:
   - הסבר ברור שתקופת הניסיון הסתיימה
   - פרטי יצירת קשר (מייל וטלפון)
   - רשימת החבילות הזמינות
   - כפתור חזרה להתחברות

### דף Trial Expired

- ✅ עיצוב Modern SaaS עם gradients
- ✅ תמיכה מלאה ב-RTL
- ✅ מידע ברור על מה קורה
- ✅ פרטי יצירת קשר בולטים
- ✅ רספונסיבי (מובייל ודסקטופ)

---

## 📋 Checklist לפני Production

- [ ] הוספת `CRON_SECRET` ל-Environment Variables
- [ ] הגדרת Vercel Cron או GitHub Actions
- [ ] בדיקת ה-endpoint ידנית עם curl
- [ ] אימות שהלוגים עובדים
- [ ] בדיקה שדף `/app/trial-expired` נטען כראוי
- [ ] אימות שה-redirect עובד כשמשתמש מנסה לגשת לארגון expired

---

## 🔧 Troubleshooting

### הבעיה: "Cron secret not configured"

**פתרון**: הוסף `CRON_SECRET` ל-.env או ל-Environment Variables של ה-deployment.

### הבעיה: "Unauthorized - invalid token"

**פתרון**: וודא שה-Authorization header נשלח כראוי:
```
Authorization: Bearer <CRON_SECRET>
```

### הבעיה: הבדיקה לא מזהה ארגונים שפגו

**פתרון**:
1. בדוק שיש ארגונים עם `subscription_status = 'trial'`
2. וודא ש-`trial_start_date` מוגדר
3. חשב את תאריך הסיום: `trial_start_date + trial_days + trial_extended_days`

### הבעיה: Super Admin לא יכול לגשת לארגון expired

**פתרון**: Super Admins מקבלים bypass על הבדיקה. אם זה לא עובד, בדוק את הגדרת `isSuperAdmin` ב-Clerk.

---

## 📞 תמיכה

אם נתקלת בבעיות או שאלות, פנה ליצחק:
- 📧 Email: yitzhak@misrad.ai
- 📱 Phone: 054-123-4567

---

## 📝 קבצים רלוונטיים

- **Server Action**: `app/actions/check-expired-trials.ts`
- **API Route**: `app/api/cron/check-trial-expiry/route.ts`
- **Trial Expired Page**: `app/app/trial-expired/page.tsx`
- **Workspace Access**: `lib/server/workspace-access/access.ts`
- **Middleware**: `middleware.ts`

---

**הערה אחרונה**: לאחר הגדרת ה-Cron Job, מומלץ להריץ בדיקה ידנית פעם אחת כדי לוודא שהכל עובד כראוי לפני להסתמך על ההרצות האוטומטיות.
