# Voicenter Reseller Module - הוראות מיזוג Schema

## ⚠️ חשוב: פעולות נדרשות להשלמת ההתקנה

### 1. מיזוג Prisma Schema

קובץ הסכמה החדש נמצא ב:
```
prisma/schema-additions/voicenter-reseller.prisma
```

**שלבי המיזוג:**

1. **פתח את קובץ הסכמה הראשי:**
   ```
   prisma/schema.prisma
   ```

2. **הוסף את ה-enums בסוף הקובץ (לפני שורות ריקות):**
   ```prisma
   enum TelephonyAccountStatus {
     active
     suspended
     cancelled
     pending
     trial
   }

   enum TelephonyExtensionStatus {
     active
     inactive
     busy
     offline
     dnd
   }

   enum TelephonyExtensionType {
     user
     ivr
     queue
     conference
     fax
     voicemail
   }

   enum TelephonyProvisioningStatus {
     pending
     in_progress
     completed
     failed
     rollback
   }

   enum TelephonyBillingCycle {
     monthly
     quarterly
     yearly
   }

   enum TelephonyCallDirection {
     inbound
     outbound
     internal
   }

   enum TelephonyCallStatus {
     answered
     missed
     voicemail
     busy
     failed
     no_answer
   }
   ```

3. **הוסף את המודלים החדשים בסוף הקובץ:**
   העתק את כל חלק ה-MODELS מקובץ ה-additions לסוף הקובץ.

4. **עדכן את מודל Organization:**
   הוסף את ה-relations החדשים למודל Organization:
   ```prisma
   model Organization {
     // ... existing fields ...
     
     // Voicenter Reseller Relations
     telephony_sub_accounts   TelephonySubAccount[]
     telephony_extensions     TelephonyExtension[]
     telephony_usage_records  TelephonyUsageRecord[]
   }
   ```

### 2. הרצת Prisma Generate

לאחר מיזוג הסכמה:

```bash
npx prisma generate
```

### 3. יצירת Migration (אופציונלי)

```bash
npx prisma migrate dev --name add_voicenter_reseller_models
```

או אם רוצים לדחוף ישירות:
```bash
npx prisma db push
```

---

## 📁 קבצים שנוצרו

### Types
- `types/voicenter-reseller.ts` - כל הטיפוסים למודול

### API Routes
- `app/api/admin/telephony/sub-accounts/route.ts` - CRUD לתת-חשבונות

### UI Components
- `app/admin/telephony/AdminTelephonyDashboard.tsx` - דשבורד ראשי
- `app/admin/telephony/page.tsx` - עמוד ראשי
- `components/ui/alert.tsx` - קומפוננטת Alert

### Prisma Schema Additions
- `prisma/schema-additions/voicenter-reseller.prisma` - סכמה לדוגמה

### Documentation
- `docs/VOICENTER-RESELLER-PLAN.md` - תוכנית מקיפה

---

## 🔧 הגדרות סביבה נדרשות

הוסף לקובץ `.env`:

```env
# Voicenter Reseller
VOICENTER_RESELLER_ID=your_reseller_id_here
VOICENTER_API_KEY=your_api_key_here
VOICENTER_API_SECRET=your_api_secret_here
```

---

## 🚀 שימוש

לאחר השלמת ההתקנה:

1. **גש לדשבורד:** `/app/admin/telephony`
2. **ניהול חשבונות:** צור תת-חשבונות חדשים לארגונים
3. **שלוחות:** הוסף שלוחות לכל חשבון
4. **דוחות:** צפה ב-CDR וניתוח שימוש

---

## ⚡ שגיאות TypeScript צפויות

שגיאות ה-prisma ("Property 'telephonySubAccount' does not exist...") ייפתרו אחרי:
1. מיזוג הסכמה לקובץ schema.prisma
2. הרצת `npx prisma generate`

שגיאות אחרות יש לתקן לפי הצורך.
