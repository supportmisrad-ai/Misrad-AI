# חיבור WAAM-It Blaster למערכת MISRAD AI

## תיאור המערכת

**WAAM-It Blaster** היא תוכנת Windows לניהול בוט וואטסאפ. הבוט נמצא על מחשב מקומי ומחובר ל-WhatsApp Web.

## ארכיטקטורת החיבור

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  WAAM-It        │────▶│  Google Apps     │────▶│  MISRAD AI      │
│  Blaster        │     │  Script          │     │  Webhook API    │
│  (Local PC)     │     │  (Cloud)         │     │  (/api/webhooks/│
│                 │     │                  │     │   blaster)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                       │                       │
        │                       │                       ▼
        │                       │              ┌──────────────────┐
        │                       │              │  PostgreSQL      │
        │                       │              │  botLead         │
        │                       │              │  botConversation │
        ▼                       ▼              └──────────────────┘
   WhatsApp Web           Google Sheets
   (Chrome/Edge)          (Backup)
```

## מרכיבי המערכת

### 1. WAAM-It Blaster (מחשב מקומי)
**מיקום:** `C:\Program Files\WAAM-It Blaster\` או תיקיית ההתקנה
**קבצים מרכזיים:**
- `BotApi.json` - קונפיגורציית API
- `BotRules.txt` / `Rules_5.rules` - כללי הבוט
- `BotLog.txt` - לוג פעילות
- `settings.json` - הגדרות תוכנה (מוצפן)

### 2. Google Apps Script (גשר)
**פונקציה:** מקבל נתונים מהבלאסטר ומעביר למערכת MISRAD AI
**URL:** `https://script.google.com/macros/s/.../exec`

### 3. MISRAD AI Webhook API
**נתיב:** `POST /api/webhooks/blaster`
**קבצים:**
- `app/api/webhooks/blaster/route.ts` - ה-handler
- `prisma/schema.prisma` - טבלאות BotLead, BotConversation

## טבלאות במסד הנתונים

### BotLead (לידים מהבוט)
```prisma
model BotLead {
  id               String   @id @default(cuid())
  phone            String   @unique
  name             String?
  business_name    String?
  email            String?
  industry         String?
  org_size         String?
  pain_point       String?
  selected_plan    String?
  source           String   @default("whatsapp")
  status           String   @default("new")
  score            Int      @default(0)
  last_interaction DateTime @default(now())
  created_at       DateTime @default(now())
  updated_at       DateTime @updatedAt
  
  conversations    BotConversation[]
}
```

### BotConversation (היסטוריית שיחות)
```prisma
model BotConversation {
  id         String   @id @default(cuid())
  lead_id    String
  direction  String   // "in" | "out"
  message    String?
  rule_id    String?
  variables  Json?
  created_at DateTime @default(now())
  
  lead       BotLead  @relation(fields: [lead_id], references: [id], onDelete: Cascade)
}
```

## הגדרות

### בלאסטר (BotApi.json)
```json
{
  "Sheets": {
    "LogSheet": {
      "AccessType": 0,
      "Id": "https://script.google.com/macros/s/.../exec",
      "Sheet": "Variable_Log",
      "Headers": {
        "Contact": 1,
        "Message": 2,
        "Time": 3,
        "Date": 4,
        "Sent": 5
      }
    },
    "VariableSheet": {
      "AccessType": 0,
      "Id": "https://script.google.com/macros/s/.../exec",
      "Sheet": "Variable_Log",
      "Headers": {
        "Contact": 1,
        "Variable": 3,
        "Value": 4
      }
    },
    "SendMessageSheet": {
      "AccessType": 0,
      "Id": "https://script.google.com/macros/s/.../exec",
      "Sheet": "API_Trigger",
      "Headers": {
        "Contact": 1,
        "Message": 2,
        "Action": 3
      }
    }
  },
  "LogOnly": 0,
  "Enabled": true
}
```

### Google Apps Script
```javascript
const CONFIG = {
  MISRAD_AI_WEBHOOK: "https://misrad-ai.com/api/webhooks/blaster",
  MISRAD_AI_SECRET: process.env.BLASTER_WEBHOOK_SECRET,
  LOG_TO_SHEET: true
};
```

### MISRAD AI (.env.local)
```env
BLASTER_WEBHOOK_SECRET=your_generated_secret_here
```

## סוגי לידים (types)

| סוג | תיאור | סטטוס |
|-----|-------|-------|
| `lead` | ליד רגיל | `new` |
| `signup` | הרשמה למערכת | `trial` |
| `demo` | בקשת הדגמה | `demo_booked` |
| `support` | פניה לתמיכה | `new` |

## Lead Scoring

המערכת מחשבת ציון אוטומטית:
- כל אינטראקציה: +1
- `support`: +5
- `demo`: +30
- `signup`: +50

## בדיקת החיבור

```bash
# Test from Misrad-AI directory
node scripts/test-blaster-webhook.js
```

או:

```powershell
.\scripts\test-blaster-simple.ps1 -Secret "your_secret"
```

## שחזור מגיבוי

אם צריך לחזור לגוגל שיטס בלבד:
1. החלף את הסקריפט ב-Google Apps Script לגרסה ללא forward
2. הסר את `BLASTER_WEBHOOK_SECRET` מ-.env.local

## תמיכה ובעיות

**בעיה נפוצה:** הבלאסטר לא מזהה קובץ BotApi.json
**פתרון:** סגור והפעל מחדש

**בעיה נפוצה:** שגיאת 401 Unauthorized
**פתרון:** בדוק שה-secret תואם בשני הצדדים

---

**עודכן:** 12/03/2025
**גרסה:** 1.0
