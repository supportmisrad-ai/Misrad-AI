# Voicenter Integration - סיכום השלמת האינטגרציה

## 📋 מה בוצע

### 1. ✅ טיפוסי TypeScript מלאים
**קובץ:** `types/voicecenter.ts`

נוצרו טיפוסים מקיפים לכל ה-APIs של Voicenter:

- **Call Log API Types** - 40+ שדות מפורטים
  - `VoicecenterCallLogRequest` - בקשה למשיכת שיחות
  - `VoicecenterCallLogResponse` - תגובה עם רשימת שיחות
  - `VoicecenterCallLogRecord` - פרטי שיחה בודדת
  - `VoicecenterCallType` - 23 סוגי שיחות שונים
  - `VoicecenterDialStatus` - 18 סטטוסים אפשריים

- **Click2Call API Types**
  - `VoicecenterClick2CallRequest` - בקשה ליזום שיחה
  - `VoicecenterClick2CallResponse` - תגובה עם CallID
  - תמיכה בכל הפרמטרים: `phoneautoanswer`, `checkphonedevicestate`, `record`, וכו'

- **WebRTC Widget Types**
  - `VoicecenterWidgetCredentials` - פרטי התחברות
  - `VoicecenterWidgetTheme` - התאמה אישית מלאה
  - `VoicecenterWidgetCall` - אובייקט שיחה
  - `VoicecenterWidgetAPI` - ממשק ה-API

---

### 2. ✅ Call Log API - משיכת היסטוריית שיחות
**קובץ:** `app/api/telephony/call-log/route.ts`

**יכולות:**
- משיכת שיחות מ-Voicenter Call Log API
- סינון לפי תאריכים (חובה), מספרי טלפון, שלוחות
- תמיכה ב-POST (JSON) וב-GET (query params)
- שמירה אוטומטית ל-DB (אופציונלי)
- זיהוי לידים לפי מספר טלפון
- מניעת כפילויות (בדיקת CallID קיים)

**דוגמת שימוש:**
```bash
POST /api/telephony/call-log?orgSlug=my-org
{
  "fromdate": "2024-01-01T00:00:00",
  "todate": "2024-01-31T23:59:59",
  "saveToDatabase": true,
  "fields": ["CallerNumber", "Duration", "RecordURL", "CallID"]
}
```

**תגובה:**
```json
{
  "success": true,
  "totalHits": 150,
  "returnedHits": 150,
  "savedToDatabase": 45,
  "calls": [...]
}
```

---

### 3. ✅ Click2Call Server Action
**קובץ:** `app/actions/telephony-click2call.ts`

**פונקציות:**
1. **`initiateClick2Call()`** - יזום שיחה
   - פרמטרים: `orgSlug`, `phone` (שלוחה), `target` (יעד)
   - אופציונלי: `leadId`, `record`
   - שימוש ב-`phoneautoanswer=true` (מענה אוטומטי)
   - שימוש ב-`checkphonedevicestate=true` (בדיקת זמינות)
   - יצירת `SystemLeadActivity` אוטומטית

2. **`terminateCall()`** - ניתוק שיחה
   - פרמטרים: `orgSlug`, `phone`

**דוגמת שימוש:**
```typescript
import { initiateClick2Call } from '@/app/actions/telephony-click2call';

const result = await initiateClick2Call({
  orgSlug: 'my-org',
  phone: 'EXTENSION_ID',  // מזהה שלוחה
  target: '0501234567',   // מספר יעד
  leadId: 'lead-uuid',    // אופציונלי
  record: true            // הקלטה
});

if (result.success) {
  console.log('Call initiated:', result.callId);
} else {
  console.error('Error:', result.error);
}
```

---

### 4. ✅ WebRTC Widget מלא
**קובץ:** `components/telephony/VoicecenterWidget.tsx`

**יכולות:**
- טעינה דינמית של OpenSIPS Widget מ-CDN
- התחברות אוטומטית עם credentials
- ממשק עברי (lang: 'he')
- Noise Reduction מובנה
- Floating mode (bottom-center)
- Callbacks לכל אירועי שיחה

**דוגמת שימוש:**
```tsx
import VoicecenterWidget from '@/components/telephony/VoicecenterWidget';

<VoicecenterWidget
  orgSlug="my-org"
  credentials={{
    username: "extension@domain",
    password: "password",
    domain: "sip.voicenter.com"
  }}
  onIncomingCall={(call) => {
    console.log('Incoming call from:', call.remoteIdentity);
  }}
  onCallAnswered={(call) => {
    console.log('Call answered:', call.id);
  }}
  onCallEnded={(call) => {
    console.log('Call ended:', call.id);
  }}
/>
```

---

### 5. ✅ אבטחה - Webhook Signature Verification
**קובץ:** `.env.example`

הוספתי:
```bash
# ─── Voicenter Telephony Integration ─────────────────────────────
# Optional secret to validate incoming webhooks from Voicenter
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Used to verify webhook signatures in production
VOICECENTER_WEBHOOK_SECRET=
```

**הקובץ `app/api/webhooks/voicenter/route.ts` כבר תומך באימות חתימות:**
```typescript
const signature = request.headers.get('x-voicenter-signature');
if (IS_PROD && !verifyWebhookSignature(bodyText, signature)) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
}
```

---

### 6. ✅ תיעוד מעודכן
**קובץ:** `docs/VOICECENTER_INTEGRATION.md`

עודכן עם:
- פרטי Call Log API המדויקים
- פרטי Click2Call API המדויקים
- פרטי WebRTC Widget המדויקים
- דוגמאות קוד מלאות
- הנחיות הגדרה

---

## 🎯 מה כבר היה קיים (מהסשן הקודם)

1. ✅ **Webhook Infrastructure** - `app/api/webhooks/voicenter/route.ts`
   - קבלת CDR events
   - Screen Pop
   - אימות חתימות

2. ✅ **Active Sync API** - `app/api/telephony/sync/route.ts`
   - משיכה ידנית של שיחות (24 שעות אחרונות)

3. ✅ **Settings UI** - `components/system/system.os/components/TelephonySettingsView.tsx`
   - הזנת UserCode ו-OrganizationCode
   - כפתור סנכרון מידני
   - העתקת Webhook URL

4. ✅ **Monthly Reports** - `app/api/telephony/reports/monthly/route.ts`
   - דוחות חודשיים

5. ✅ **Existing Click to Call** - `lib/services/telephony.ts`
   - כבר היה קיים, עכשיו יש גם server action חדש

---

## 📦 קבצים שנוצרו/עודכנו היום

### קבצים חדשים:
1. ✅ `types/voicecenter.ts` - טיפוסי TypeScript מלאים
2. ✅ `app/api/telephony/call-log/route.ts` - Call Log API
3. ✅ `app/actions/telephony-click2call.ts` - Click2Call server actions
4. ✅ `docs/VOICECENTER_INTEGRATION_SUMMARY.md` - מסמך זה

### קבצים מעודכנים:
1. ✅ `components/telephony/VoicecenterWidget.tsx` - שודרג עם קוד אמיתי
2. ✅ `docs/VOICECENTER_INTEGRATION.md` - עודכן עם פרטים מדויקים
3. ✅ `.env.example` - הוספת VOICECENTER_WEBHOOK_SECRET

---

## 🔧 מה צריך להגדיר ב-Voicenter Dashboard

### שלב 1: קבלת פרטי API
1. היכנס ל-Voicenter Dashboard
2. Settings → API Keys
3. העתק:
   - **UserCode** (קוד משתמש)
   - **OrganizationCode** (קוד ארגון)

### שלב 2: הגדרת Webhooks
1. Settings → Webhooks → Add New
2. **URL:** `https://yourdomain.com/api/webhooks/voicenter?orgId=YOUR_ORG_SLUG`
3. **Events:** Call Ended, Call Answered
4. **Method:** POST
5. **Format:** JSON

### שלב 3: Screen Pop (אופציונלי)
1. Settings → Screen Pop
2. **URL:** `https://yourdomain.com/api/webhooks/voicenter?orgId=YOUR_ORG_SLUG&caller={CallerID}`
3. **Method:** GET
4. **Trigger:** Incoming Call (Ringing)

### שלב 4: WebRTC Widget (אופציונלי)
1. Settings → SIP Extensions
2. צור שלוחה חדשה או השתמש בקיימת
3. העתק:
   - **Username** (extension@domain)
   - **Password**
   - **Domain** (sip.voicenter.com)

---

## 🚀 איך להשתמש במערכת

### 1. הגדרה ראשונית
```bash
# 1. הוסף את הפרטים ל-.env.local
VOICECENTER_WEBHOOK_SECRET=your_secret_here

# 2. הכנס למערכת
# נווט ל: /w/{orgSlug}/system/settings
# טאב: "מרכזייה (Voicenter)"

# 3. הזן:
# - UserCode
# - OrganizationCode
# - (אופציונלי) Widget credentials
```

### 2. שימוש ב-Click2Call
```typescript
// בכל קומפוננטה
import { initiateClick2Call } from '@/app/actions/telephony-click2call';

const handleCall = async () => {
  const result = await initiateClick2Call({
    orgSlug: 'my-org',
    phone: 'EXTENSION_ID',
    target: '0501234567',
    leadId: lead.id,
    record: true
  });
  
  if (result.success) {
    toast.success('השיחה החלה!');
  } else {
    toast.error(result.error);
  }
};
```

### 3. משיכת היסטוריית שיחות
```typescript
// Client-side
const response = await fetch(
  `/api/telephony/call-log?orgSlug=${orgSlug}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fromdate: '2024-01-01T00:00:00',
      todate: '2024-01-31T23:59:59',
      saveToDatabase: true
    })
  }
);

const data = await response.json();
console.log(`נמשכו ${data.returnedHits} שיחות, נשמרו ${data.savedToDatabase}`);
```

### 4. שימוש ב-Widget
```tsx
// בדף הראשי של המודול
import VoicecenterWidget from '@/components/telephony/VoicecenterWidget';

export default function SystemPage() {
  return (
    <>
      {/* התוכן הרגיל */}
      
      {/* Widget צף בפינה */}
      <VoicecenterWidget
        orgSlug={orgSlug}
        credentials={widgetCredentials}
        onIncomingCall={(call) => {
          // Screen Pop אוטומטי
          router.push(`/w/${orgSlug}/system/dialer?caller=${call.remoteIdentity}`);
        }}
      />
    </>
  );
}
```

---

## 🧪 בדיקות מומלצות

### 1. בדיקת Click2Call
```bash
# 1. הכנס UserCode/OrganizationCode בהגדרות
# 2. נווט ללקוח/ליד
# 3. לחץ על כפתור השיחה
# 4. וודא:
#    - השיחה מתחילה
#    - נוצר SystemLeadActivity
#    - יש CallID בתגובה
```

### 2. בדיקת Call Log API
```bash
# Terminal:
curl -X POST "http://localhost:3000/api/telephony/call-log?orgSlug=test-org" \
  -H "Content-Type: application/json" \
  -d '{
    "fromdate": "2024-01-01T00:00:00",
    "todate": "2024-01-31T23:59:59",
    "saveToDatabase": true
  }'

# Expected: JSON עם רשימת שיחות
```

### 3. בדיקת Webhook
```bash
# 1. בצע שיחה ידנית דרך Voicenter
# 2. בדוק ש-SystemLeadActivity נוצר
# 3. וודא שיש recordingUrl ו-duration במטא-דאטה
```

### 4. בדיקת Widget
```bash
# 1. הוסף credentials ל-system_settings
# 2. טען דף עם Widget
# 3. וודא:
#    - Widget נטען בהצלחה
#    - אפשר לבצע שיחה
#    - אפשר לקבל שיחה
```

---

## 📊 סטטוס האינטגרציה

| תכונה | סטטוס | קובץ |
|-------|-------|------|
| Webhook CDR | ✅ קיים | `app/api/webhooks/voicenter/route.ts` |
| Screen Pop | ✅ קיים | `app/api/webhooks/voicenter/route.ts` |
| Active Sync | ✅ קיים | `app/api/telephony/sync/route.ts` |
| Settings UI | ✅ קיים | `components/system/.../TelephonySettingsView.tsx` |
| Monthly Reports | ✅ קיים | `app/api/telephony/reports/monthly/route.ts` |
| **Call Log API** | ✅ **חדש** | `app/api/telephony/call-log/route.ts` |
| **Click2Call Action** | ✅ **חדש** | `app/actions/telephony-click2call.ts` |
| **WebRTC Widget** | ✅ **חדש** | `components/telephony/VoicecenterWidget.tsx` |
| **TypeScript Types** | ✅ **חדש** | `types/voicecenter.ts` |
| **Webhook Security** | ✅ **חדש** | `.env.example` + webhook route |

---

## 💡 הערות חשובות

### 1. פרמטרים מומלצים ל-Click2Call
```typescript
{
  phoneautoanswer: true,        // חובה! מענה אוטומטי לנציג
  checkphonedevicestate: true,  // מומלץ! בדיקת זמינות שלוחה
  record: true,                 // הקלטת שיחה
  format: 'JSON'                // תגובה ב-JSON
}
```

### 2. שדות חובה ב-Call Log API
```typescript
{
  code: "...",           // UserCode (חובה)
  fromdate: "...",       // ISO 8601 (חובה)
  todate: "...",         // ISO 8601 (חובה)
  fields: [...]          // רשימת שדות לקבלה (אופציונלי)
}
```

### 3. Widget Credentials
```typescript
{
  username: "extension@domain",  // מזהה שלוחה מלא
  password: "...",               // סיסמת שלוחה
  domain: "sip.voicenter.com"    // דומיין SIP
}
```

### 4. אבטחה
- ב-**PRODUCTION**: חובה להגדיר `VOICECENTER_WEBHOOK_SECRET`
- ב-**DEVELOPMENT**: אופציונלי (לא מאומת)
- Webhook signature מאומת רק ב-production

---

## 🎉 סיכום

**האינטגרציה עם Voicenter הושלמה במלואה!**

✅ **7 קבצים חדשים/מעודכנים**  
✅ **3 APIs מלאים** (Call Log, Click2Call, Widget)  
✅ **טיפוסי TypeScript מקיפים**  
✅ **תיעוד מלא**  
✅ **אבטחה מובנית**  

**מה שנותר:**
1. לקבל מניקיטה את ה-`UserCode` ו-`OrganizationCode` האמיתיים
2. להזין אותם בהגדרות המערכת
3. להגדיר Webhooks ב-Voicenter Dashboard
4. (אופציונלי) להגדיר Widget credentials לשלוחה WebRTC

**הכל מוכן לשימוש!** 🚀
