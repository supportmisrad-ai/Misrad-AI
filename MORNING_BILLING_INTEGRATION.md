# ✅ Morning (Green Invoice) Billing Integration - Complete

אינטגרציה מלאה של שכבת Billing ראשית (Level 1) עם Morning לגביית תשלומים מארגונים.

---

## 📦 מה נוצר?

### 1️⃣ **Core Service** - `lib/services/app-billing.ts`
שירות ביילינג ראשי שמטפל בכל הלוגיקה:
- ✅ יצירת חשבוניות דרך Morning API
- ✅ קריאת פרטי חיוב של ארגון
- ✅ עדכון סטטוס תשלום (successful/failed)
- ✅ חישוב ימים עד חיוב הבא
- ✅ שימוש ב-MRR מטבלת `social_organizations`

**Functions:**
```typescript
createAppInvoice(organizationId, options?)
getOrganizationBilling(organizationId)
getOrganizationBillingStatus(organizationId)
markPaymentSuccessful(organizationId, amount, invoiceId)
markPaymentFailed(organizationId, invoiceId, reason)
```

---

### 2️⃣ **Webhook Handler** - `app/api/webhooks/morning-app/route.ts`
מטפל מאובטח לקבלת אישורי תשלום מ-Morning:
- ✅ אימות Signature (HMAC SHA256)
- ✅ עדכון `subscription_status` ל-`active` אוטומטית
- ✅ יצירת רשומות audit trail ב-`billing_events`
- ✅ טיפול באירועים: `document.paid`, `payment.failed`, וכו'
- ✅ Health check endpoint (GET)

**Endpoints:**
```bash
POST /api/webhooks/morning-app  # Webhook receiver
GET  /api/webhooks/morning-app  # Health check
```

---

### 3️⃣ **Server Actions** - `app/actions/app-billing.ts`
Actions נוחים לשימוש מצד הקוד:
- ✅ `createOrganizationInvoice()` - יצירת חשבונית (Admin only)
- ✅ `getOrganizationBillingInfo()` - קבלת פרטי חיוב (Admin only)
- ✅ `getOrganizationBillingStatusAction()` - בדיקת סטטוס (Admin only)
- ✅ `bulkCreateInvoices()` - יצירה באצווה (Admin only)

---

### 4️⃣ **UI Component** - `components/admin/OrganizationBillingPanel.tsx`
דוגמה לקומפוננטת אדמין:
- ✅ תצוגת סטטוס ארגון (Trial/Active/Past Due)
- ✅ תצוגת MRR, מחזור חיוב, ימים עד חיוב הבא
- ✅ כפתור ליצירת חשבונית
- ✅ אזהרות במקרה של חוסרים (אימייל, MRR)

---

### 5️⃣ **Documentation** - `docs/APP_BILLING_SETUP.md`
מדריך מלא עם:
- ✅ הסבר על Flow התשלום
- ✅ הגדרת Webhook ב-Morning
- ✅ דוגמאות קוד מפורטות
- ✅ Troubleshooting
- ✅ Production Checklist

---

### 6️⃣ **Environment Variables** - `.env.example`
```bash
MORNING_APP_API_KEY=        # API Key של Morning עבור הארגון
MORNING_WEBHOOK_SECRET=     # Secret לאימות Webhooks
```

---

## 🚀 Quick Start

### שלב 1: הגדר משתנים
```bash
# .env.local
MORNING_APP_API_KEY=your_morning_api_key_here
MORNING_WEBHOOK_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

### שלב 2: הגדר Webhook ב-Morning
1. התחבר ל-Morning → הגדרות → API → Webhooks
2. הוסף URL: `https://your-domain.com/api/webhooks/morning-app`
3. הגדר את ה-Secret שיצרת
4. בחר אירועים: `document.paid`, `payment.failed`

### שלב 3: צור חשבונית ראשונה
```typescript
import { createOrganizationInvoice } from '@/app/actions/app-billing';

const result = await createOrganizationInvoice('organization-id-here');

if (result.success) {
  console.log('Invoice created:', result.data?.invoiceNumber);
  console.log('Payment URL:', result.data?.paymentUrl);
}
```

### שלב 4: בדוק שה-Webhook עובד
```bash
# Health check
curl https://your-domain.com/api/webhooks/morning-app

# צפי לתשובה:
# {"status":"ok","webhookSecretConfigured":true}
```

---

## 🔄 Flow מלא

```
1. יצירת חשבונית
   └─> createAppInvoice('org-id')
        └─> Morning API: POST /documents
             └─> Returns: invoiceUrl, paymentUrl

2. לקוח משלם
   └─> Morning מעבד תשלום
        └─> Morning webhook: POST /api/webhooks/morning-app
             └─> Payload: { type: "document.paid", ... }

3. Webhook Handler
   └─> Verifies HMAC signature
        └─> Calls markPaymentSuccessful()
             └─> Updates social_organizations:
                  - subscription_status = 'active'
                  - last_payment_date = now
                  - next_billing_date = now + billing_cycle

4. Audit Trail
   └─> Creates billing_events record:
        - event_type: 'payment_successful'
        - metadata: { morningInvoiceId, source }
```

---

## 📊 מבנה הנתונים

### `social_organizations` (טבלה קיימת)
```typescript
{
  mrr: Decimal                    // ✅ כבר קיים! Monthly Recurring Revenue
  subscription_status: string     // 'trial' | 'active' | 'past_due' | 'cancelled'
  billing_cycle: string          // 'monthly' | 'yearly'
  billing_email: string          // אימייל לשליחת חשבוניות
  next_billing_date: Date        // תאריך חיוב הבא
  last_payment_date: Date        // תאריך תשלום אחרון
  last_payment_amount: Decimal   // סכום תשלום אחרון
}
```

### `billing_events` (טבלה קיימת)
```typescript
{
  organization_id: string
  event_type: string             // 'payment_successful', 'payment_failed', 'webhook_*'
  amount: Decimal
  currency: string
  metadata: JSON                 // { morningInvoiceId, source, ... }
  created_at: Date
}
```

---

## 🎯 הבדל בין Customer Billing ל-App Billing

| היבט | Customer Billing | App Billing |
|------|------------------|-------------|
| **קובץ** | `lib/integrations/green-invoice.ts` | `lib/services/app-billing.ts` |
| **API Key** | API key של הלקוח | API key של Misrad-AI |
| **Webhook** | `/api/webhooks/green-invoice` | `/api/webhooks/morning-app` |
| **טבלאות** | `SocialMediaInvoice`, `SocialMediaPaymentOrder` | `social_organizations`, `billing_events` |
| **מטרה** | לקוחות מוציאים חשבוניות ללקוחות שלהם | Misrad-AI גובה כסף מהלקוחות |

**⚠️ אל תערבב ביניהם!**

---

## 🧪 Testing

### Local Testing (עם ngrok)
```bash
# Terminal 1: הרץ את השרת
npm run dev

# Terminal 2: פתח tunnel
ngrok http 3000

# הגדר ב-Morning:
https://your-random-id.ngrok.io/api/webhooks/morning-app
```

### סימולציה של Webhook
```bash
# חשב signature
SECRET="your_webhook_secret"
PAYLOAD='{"type":"document.paid","documentId":"123","amount":499}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" -hex | cut -d' ' -f2)

# שלח webhook
curl -X POST http://localhost:3000/api/webhooks/morning-app \
  -H "Content-Type: application/json" \
  -H "x-greeninvoice-signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

---

## 🔒 אבטחה

### Signature Verification
כל webhook מאומת באמצעות HMAC SHA256:
```typescript
const hmac = crypto.createHmac('sha256', MORNING_WEBHOOK_SECRET);
hmac.update(rawBody);
const expectedSignature = hmac.digest('hex');

// Timing-safe comparison
crypto.timingSafeEqual(
  Buffer.from(receivedSignature),
  Buffer.from(expectedSignature)
);
```

### Authorization
- ✅ רק Super Admins יכולים ליצור חשבוניות
- ✅ Webhook מאומת עם signature
- ✅ Audit trail מלא ב-`billing_events`

---

## 📈 Production Checklist

- [ ] `MORNING_APP_API_KEY` הוגדר ב-production
- [ ] `MORNING_WEBHOOK_SECRET` הוגדר ב-production
- [ ] Webhook URL מוגדר ב-Morning dashboard
- [ ] Secret תואם בין הקוד ל-Morning
- [ ] בדיקת health check עובדת
- [ ] Sentry מוגדר למעקב אחר שגיאות
- [ ] Test webhook נשלח בהצלחה
- [ ] MRR מוגדר לכל ארגון פעיל
- [ ] Billing email מוגדר לכל ארגון

---

## 💡 Tips

### עדכון MRR
```typescript
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

await prisma.social_organizations.update({
  where: { id: 'org-id' },
  data: {
    mrr: new Prisma.Decimal(499),
    billing_cycle: 'monthly',
    billing_email: 'billing@company.com',
  },
});
```

### Cron Job לחיוב חודשי
צור `/api/cron/monthly-billing/route.ts` שמריץ:
```typescript
const orgs = await prisma.social_organizations.findMany({
  where: {
    subscription_status: 'active',
    next_billing_date: { lte: new Date() },
  },
});

for (const org of orgs) {
  await createAppInvoice(org.id);
}
```

---

## 📞 Support

**בעיות?**
1. בדוק את [APP_BILLING_SETUP.md](./docs/APP_BILLING_SETUP.md)
2. בדוק logs ב-Sentry
3. הרץ health check: `curl https://your-domain.com/api/webhooks/morning-app`

**רוצה להוסיף פיצ'רים?**
- Payment links אוטומטיים
- Retry logic לתשלומים כושלים
- Email notifications
- Dashboard לניהול ביילינג

---

## ✨ What's Next?

### אפשרויות הרחבה:
1. **Auto-billing Cron** - חיוב אוטומטי כל חודש
2. **Email Notifications** - שליחת מיילים כשחשבונית נוצרת
3. **Payment Retry Logic** - ניסיון חוזר לתשלומים כושלים
4. **Billing Dashboard** - דאשבורד מלא לניהול כספים
5. **Multi-currency Support** - תמיכה במטבעות נוספים

---

**🎉 Integration Complete!**

כל מה שצריך כדי לגבות תשלומים מארגונים דרך Morning כבר מוכן ומחכה לך.

---

**Built with ❤️ by Claude Code**
