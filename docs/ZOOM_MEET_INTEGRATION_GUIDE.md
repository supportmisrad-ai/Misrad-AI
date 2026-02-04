# 🎯 מדריך אינטגרציית Zoom ו-Google Meet

## ✅ מה הושלם

### 1. Google Meet Integration
- **קובץ:** `lib/integrations/google-calendar.ts`
- **תכונה:** יצירת Google Meet link אוטומטית בכל אירוע Calendar
- **סטטוס:** ✅ פעיל (דרך Google Calendar API הקיים)

### 2. Zoom Integration
- **קובץ:** `lib/integrations/zoom.ts`
- **תכונות:**
  - OAuth 2.0 flow מלא
  - יצירת meetings אוטומטית
  - ניהול tokens + auto-refresh
  - מחיקת meetings
- **API Routes:**
  - `/api/integrations/zoom/connect` - התחלת OAuth flow
  - `/api/integrations/zoom/callback` - טיפול בחזרה מ-Zoom
  - `/api/integrations/zoom/disconnect` - ניתוק חיבור

### 3. Meeting Service Wrapper
- **קובץ:** `lib/services/meeting-service.ts`
- **תכונות:**
  - בחירה אוטומטית בין Zoom ו-Meet
  - API מאוחד לשני הפלטפורמות
  - ניהול העדפות משתמש

### 4. Settings UI
- **קובץ:** `components/settings/IntegrationsTab.tsx`
- **תכונות:**
  - UI להתחברות/ניתוק Zoom
  - אינדיקטורי סטטוס בזמן אמת
  - הודעות הצלחה/שגיאה
  - תמיכה בשתי הפלטפורמות

### 5. Status API
- **קובץ:** `/api/integrations/status`
- **תכונה:** בדיקת סטטוס חיבור (Zoom, Meet, Calendar)

---

## 📝 דרישות

### משתני סביבה (.env.local):
```bash
# Zoom OAuth
ZOOM_CLIENT_ID=your_zoom_client_id
ZOOM_CLIENT_SECRET=your_zoom_client_secret
ZOOM_REDIRECT_URI=https://yourdomain.com/api/integrations/zoom/callback

# Google (כבר קיים)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=...
```

### Zoom App Setup:
1. צור OAuth App ב-https://marketplace.zoom.us/develop/create
2. הגדר Scopes: `meeting:write`, `meeting:read`
3. הוסף Redirect URI: `https://yourdomain.com/api/integrations/zoom/callback`

---

## 💻 שימוש בקוד

### דוגמה 1: יצירת פגישה עם בחירה אוטומטית
```typescript
import { createMeeting } from '@/lib/services/meeting-service';

const meeting = await createMeeting({
  userId: 'user_123',
  organizationId: 'org_456',
  title: 'פגישת היכרות',
  startTime: new Date('2026-02-10T10:00:00'),
  duration: 60,
  description: 'פגישה ראשונה',
  // preferredPlatform: 'zoom' | 'meet' | 'none' - אופציונלי
});

console.log(meeting.platform); // 'zoom' או 'meet'
console.log(meeting.joinUrl);  // הלינק לפגישה
```

### דוגמה 2: שימוש ב-NewMeetingModal
```typescript
const handleMeetingSave = async (meetingData: any) => {
  try {
    // יצירת פגישה אוטומטית
    const result = await createMeeting({
      userId: currentUser.id,
      organizationId: currentOrg.id,
      title: meetingData.leadName,
      startTime: new Date(`${meetingData.date}T${meetingData.time}`),
      duration: 60,
      description: meetingData.leadCompany,
      preferredPlatform: meetingData.type === 'zoom' ? 'zoom' : 'none',
    });

    // שמירה ב-DB עם הלינק
    await saveMeetingToDb({
      ...meetingData,
      meetingUrl: result.joinUrl,
      platform: result.platform,
    });

    toast.success('הפגישה נוצרה בהצלחה!');
  } catch (error) {
    toast.error('שגיאה ביצירת הפגישה');
  }
};

<NewMeetingModal
  leads={leads}
  onClose={() => setShowModal(false)}
  onSave={handleMeetingSave}
/>
```

### דוגמה 3: בדיקת סטטוס אינטגרציות
```typescript
import { getConnectedPlatforms } from '@/lib/services/meeting-service';

const platforms = await getConnectedPlatforms(userId, orgId);

if (platforms.zoom) {
  console.log('✅ Zoom מחובר');
}
if (platforms.meet) {
  console.log('✅ Google Meet מחובר');
}
```

---

## 🎨 UI Components

### IntegrationsTab
נמצא ב: `components/settings/IntegrationsTab.tsx`

**תכונות:**
- אינדיקטורי סטטוס עם אייקונים
- כפתורי התחבר/נתק
- הודעות הצלחה/שגיאה מונפשות
- תמיכה ב-loading states

**נגישות:**
- Settings → Integrations tab
- או: `/settings?tab=integrations`

---

## 🔒 אבטחה

### Best Practices:
1. **Tokens במסד נתונים:** מוצפנים ב-`scale_integrations`
2. **Auto-refresh:** Tokens מתרעננים אוטומטית לפני פקיעה
3. **Tenant Isolation:** כל אינטגרציה קשורה ל-`tenant_id`
4. **Error Handling:** שגיאות מטופלות ומדווחות למשתמש

---

## 🚀 Deployment

### Vercel:
1. הוסף environment variables ב-Dashboard
2. Deploy
3. עדכן Redirect URIs ב-Zoom ו-Google לכתובת Production

### Local Development:
```bash
# 1. הוסף credentials ל-.env.local
# 2. הפעל שרת
npm run dev

# 3. התחבר דרך Settings → Integrations
```

---

## 📊 Database Schema

```sql
-- scale_integrations table
service_type: 'zoom' | 'google_calendar' | ...
user_id: string
tenant_id: string (organization)
access_token: string
refresh_token: string
expires_at: timestamp
is_active: boolean
```

---

## ❓ Troubleshooting

### Zoom לא מתחבר
1. בדוק שה-credentials נכונים
2. ודא ש-Redirect URI תואם בדיוק
3. בדוק ש-Scopes מוגדרים נכון

### Google Meet לא עובד
1. Google Meet דורש Google Calendar
2. ודא שהחיבור ל-Calendar פעיל
3. בדוק שיש `conferenceDataVersion: 1` בקריאה

### פגישה נוצרת בלי לינק
1. בדוק שהמשתמש מחובר לפלטפורמה
2. ודא שקוראים ל-`createMeeting()` ולא ישירות ל-API
3. בדוק logs בשרת

---

## 📚 קבצים רלוונטיים

```
lib/
  integrations/
    zoom.ts                    # Zoom OAuth + Meeting creation
    google-calendar.ts         # Google Meet integration
  services/
    meeting-service.ts         # Unified meeting API

app/api/integrations/
  zoom/
    connect/route.ts          # Zoom OAuth start
    callback/route.ts         # Zoom OAuth callback
    disconnect/route.ts       # Zoom disconnect
  status/route.ts             # Integration status check

components/
  settings/
    IntegrationsTab.tsx       # Settings UI
  system/system.os/components/
    NewMeetingModal.tsx       # Meeting creation modal

docs/
  ZOOM_MEET_INTEGRATION_GUIDE.md  # This file
```

---

## ✅ Checklist השלמה

- [x] Zoom OAuth integration
- [x] Google Meet integration
- [x] Meeting Service wrapper
- [x] Settings UI
- [x] Status indicators
- [x] API routes
- [x] Error handling
- [x] Documentation
- [ ] Tests (אופציונלי)
- [ ] עדכון NewMeetingModal לשימוש ב-createMeeting() (אופציונלי)

---

## 🎯 מה עוד אפשר להוסיף?

1. **Microsoft Teams** - אינטגרציה נוספת
2. **Webhooks** - עדכון אוטומטי כשפגישה מתבטלת
3. **Recording** - הקלטת פגישות אוטומטית
4. **Analytics** - סטטיסטיקות על שימוש בפגישות
5. **Reminders** - תזכורות אוטומטיות לפגישות

---

**תאריך עדכון:** פברואר 2026  
**גרסה:** 1.0.0
