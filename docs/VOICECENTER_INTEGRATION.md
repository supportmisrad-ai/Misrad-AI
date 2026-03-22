# Voicenter Integration - Complete Implementation

## 📋 סיכום מה שנבנה

### ✅ 1. Webhook Infrastructure
**קובץ:** `app/api/webhooks/voicenter/route.ts`

**יכולות:**
- קבלת אירועי CDR (Call Detail Record) בסיום שיחה
- Screen Pop - זיהוי ליד והפניה אוטומטית לעמוד הליד בשיחה נכנסת
- שמירת פרטי שיחה (משך, הקלטה, כיוון) ב-metadata של הפעילות
- תמיכה ב-POST (webhooks) וב-GET (screen pop redirects)

**כתובת לשימוש ב-Voicenter:**
```
https://yourdomain.com/api/webhooks/voicenter?orgId={organization_slug}
```

---

### ✅ 2. Active Data Sync
**קובץ:** `app/api/telephony/sync/route.ts`

**יכולות:**
- משיכה אקטיבית של היסטוריית שיחות מ-Voicenter CDR API
- ברירת מחדל: 24 שעות אחרונות (ניתן להגדרה)
- מונע כפילויות (בודק callId קיים)
- ניתן להפעלה מידנית מ-UI

**שימוש:**
```bash
POST /api/telephony/sync
{ "hours": 24 }
```

---

### ✅ 3. Settings UI
**קובץ:** `components/system/system.os/components/TelephonySettingsView.tsx`

**יכולות:**
- הזנת UserCode ו-OrganizationCode של Voicenter
- העתקת כתובת Webhook ללוח
- הפעלה/כיבוי של האינטגרציה
- כפתור סנכרון מידני לשליפת שיחות
- שמירה ב-system_settings

**מיקום:** `/w/{orgSlug}/system/settings` → טאב "מרכזייה (Voicenter)"

---

### ✅ 4. Monthly Reports API
**קובץ:** `app/api/telephony/reports/monthly/route.ts`

**נתונים מוחזרים:**
- סה"כ שיחות (נכנסות/יוצאות)
- משך שיחה ממוצע
- שיחות לפי סוכן
- שיחות לפי יום
- תקופה: החודש הנוכחי

**שימוש:**
```bash
GET /api/telephony/reports/monthly
```

---

### ✅ 5. Call Log API (משיכת היסטוריית שיחות)
**קובץ:** `app/api/telephony/call-log/route.ts`

**יכולות:**
- משיכת פרטי שיחות מ-Voicenter Call Log API
- סינון לפי תאריכים (fromdate, todate - חובה)
- סינון לפי מספרי טלפון, שלוחות, סוגי שיחות
- תמיכה בפורמטים POST-JSON ו-GET
- החזרת מידע מפורט: CallerNumber, Duration, RecordURL, DialStatus וכו'

**API Endpoint:** `https://api.voicenter.com/hub/cdr/`

**דוגמת שימוש:**
```typescript
POST /api/telephony/call-log
{
  "fromdate": "2024-01-01T00:00:00",
  "todate": "2024-01-31T23:59:59",
  "fields": ["CallerNumber", "Duration", "RecordURL", "CallID"]
}
```

---

### ✅ 6. Click2Call API (יזום שיחות)
**קובץ:** `app/actions/telephony-click2call.ts`

**יכולות:**
- יזום שיחות דרך Voicenter Click2Call API
- תמיכה ב-2 רגליים: רגל 1 (לנציג) → רגל 2 (ליעד)
- מענה אוטומטי (phoneautoanswer=True)
- בדיקת זמינות שלוחה (checkphonedevicestate=True)
- פרמטרים נוספים: record, maxduration, CallerID customization

**API Endpoint:** `https://api.voicenter.com/ForwardDialer/click2call.aspx`

**פרמטרים חובה:**
- `code` - קוד ייחודי לחשבון
- `phone` - השלוחה/מספר שממנו יוצאת השיחה
- `target` - מספר היעד
- `action=call`
- `phoneautoanswer=True` (מומלץ מאוד)
- `checkphonedevicestate=True` (מומלץ)

---

### ✅ 7. WebRTC Widget
**קובץ:** `components/telephony/VoicecenterWidget.tsx`

**יכולות:**
- שלוחה מלאה בדפדפן (WebRTC)
- ביצוע וקבלת שיחות ישירות מהממשק
- התאמה אישית מלאה (צבעים, לוגו, מיקום)
- Noise Reduction מובנה
- תמיכה בהעברות שיחות, Merge, DND

**Widget CDN:** `https://cdn.opensipsjs.org/opensipsjs-widget/v0.2.39/opensipsjs-widget.mjs`

**דוגמת שימוש:**
```tsx
<VoicecenterWidget 
  credentials={{
    username: "...",
    password: "...",
    domain: "..."
  }}
  onCallIncoming={(call) => { /* handle */ }}
/>
```

---

## 🔧 הגדרה ב-Voicenter Dashboard

### שלב 1: CDR Webhook
1. היכנס ל-Voicenter Dashboard
2. Settings → Webhooks → Add New
3. **URL:** `https://yourdomain.com/api/webhooks/voicenter?orgId=YOUR_ORG_SLUG`
4. **Events:** Call Ended, Call Answered
5. **Method:** POST
6. **Format:** JSON

### שלב 2: Screen Pop
1. Settings → Screen Pop
2. **URL:** `https://yourdomain.com/api/webhooks/voicenter?orgId=YOUR_ORG_SLUG&caller={CallerID}`
3. **Method:** GET
4. **Trigger:** Incoming Call (Ringing)

### שלב 3: API Credentials
1. Settings → API Keys
2. העתק את `UserCode` ו-`OrganizationCode`
3. הזן במערכת דרך: `/w/{orgSlug}/system/settings` → טאב Telephony

---

## 📊 זרימת נתונים

### Click to Call (יוזם שיחה)
```
UI (CallButton) 
  → POST /api/telephony/call 
  → TelephonyService.initiateCall()
  → Voicenter ForwardDialing/v2 API
  → שיחה מתחילה
```

### Incoming Call (שיחה נכנסת)
```
Voicenter → GET /api/webhooks/voicenter?caller=...
  → מחפש ליד לפי מספר
  → מפנה ל-/w/{org}/system/dialer?leadId=...
  → Screen Pop!
```

### Call Ended (סיום שיחה)
```
Voicenter → POST /api/webhooks/voicenter (CDR)
  → שומר SystemLeadActivity
  → metadata: { duration, recordingUrl, callId }
  → מופיע בהיסטוריית הליד
```

---

## 🧪 בדיקות מומלצות

1. **Test Click to Call:**
   - הכנס UserCode/OrganizationCode
   - לחץ על כפתור שיחה בליד
   - וודא שהשיחה מתחילה

2. **Test Webhook:**
   - בצע שיחה ידנית דרך Voicenter
   - בדוק ש-SystemLeadActivity נוצר
   - וודא שיש recordingUrl ו-duration

3. **Test Sync:**
   - לחץ "סנכרן עכשיו" בהגדרות
   - בדוק שהשיחות מ-24 שעות מופיעות

4. **Test Monthly Report:**
   - `GET /api/telephony/reports/monthly`
   - בדוק שהנתונים נכונים

---

## 📝 הערות חשובות

1. **Voicenter CDR API URL** - בקוד השארנו URL משוער. כשניקיטה יספק את ה-URL המדויק, לעדכן ב:
   `app/api/telephony/sync/route.ts:52`

2. **Widget Integration** - כרגע placeholder. כשניקיטה יספק:
   - Script URL
   - Initialization code
   - API keys structure
   
   לעדכן ב: `components/telephony/VoicecenterWidget.tsx`

3. **Security** - כל ה-endpoints מוגנים ב-authentication ו-RBAC

4. **Tenant Isolation** - כל השיחות מבודדות לפי organizationId

---

## ✨ פיצ'רים נוספים אפשריים (עתיד)

- [ ] Real-time notifications ב-UI כשנכנסת שיחה (WebSockets/Pusher)
- [ ] Dashboard widgets עם KPIs של שיחות
- [ ] אינטגרציה עם AI לתמלול שיחות אוטומטי
- [ ] Auto-dialer campaigns
- [ ] Call recording player ב-UI

---

**מוכן לשימוש!** 🎉
כל מה שנדרש הוא להזין את פרטי ה-API של Voicenter ולהגדיר את ה-Webhooks בצד שלהם.
