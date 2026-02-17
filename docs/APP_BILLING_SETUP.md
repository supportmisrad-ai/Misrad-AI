# 💳 App-Level Billing Setup (Morning Integration)

שכבת Billing ראשית (Level 1) לגביית תשלומים מארגונים באמצעות Morning (חשבונית ירוקה).

---

## 🎯 מה זה עושה?

המערכת מאפשרת לגבות תשלומים מארגונים שמשתמשים באפליקציה:
- ✅ יצירת חשבוניות אוטומטית דרך Morning API
- ✅ קבלת אישורי תשלום דרך Webhooks
- ✅ עדכון אוטומטי של `subscription_status` ל-`active`
- ✅ מעקב אחר MRR (Monthly Recurring Revenue)
- ✅ ניהול מחזורי חיוב (monthly/yearly)

---

## 📦 מבנה הקבצים

```
lib/services/app-billing.ts          # שירות ביילינג ראשי
app/api/webhooks/morning-app/route.ts  # webhook handler לאישורי תשלום
```

---

## 🔧 הגדרות התחלתיות

### 1. הוסף את המשתנים ל-`.env.local`:

```bash
# Morning API Key עבור הארגון שלך (לא של הלקוחות!)
MORNING_APP_API_KEY=your_morning_api_key_here

# Secret לאימות Webhooks
MORNING_WEBHOOK_SECRET=your_generated_secret_here
```

**איך ליצור `MORNING_WEBHOOK_SECRET`:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. הגדר את ה-Webhook ב-Morning:

1. היכנס לחשבון Morning שלך
2. עבור ל-**הגדרות → API → Webhooks**
3. הוסף URL חדש:
   ```
   https://your-domain.com/api/webhooks/morning-app
   ```
4. הגדר את ה-**Secret** שיצרת
5. בחר אירועים:
   - ✅ `document.paid` / `payment.successful`
   - ✅ `document.failed` / `payment.failed`

---

## 💻 שימוש בקוד

### יצירת חשבונית לארגון

```typescript
import { createAppInvoice } from '@/lib/services/app-billing';

// יצירת חשבונית לפי MRR של הארגון
const result = await createAppInvoice('organization-id-here');

if (result.success) {
  console.log('Invoice created:', result.invoiceNumber);
  console.log('Payment URL:', result.paymentUrl);
} else {
  console.error('Error:', result.error);
}

// יצירת חשבונית מותאמת אישית
const customResult = await createAppInvoice('organization-id-here', {
  description: 'חיוב חודשי - מרץ 2024',
  dueDate: new Date('2024-03-31'),
  items: [
    {
      description: 'מנוי Premium',
      quantity: 1,
      price: 499,
      vatRate: 17,
    },
    {
      description: 'משתמשים נוספים (5)',
      quantity: 5,
      price: 39,
      vatRate: 17,
    },
  ],
});
```

### בדיקת סטטוס חיוב של ארגון

```typescript
import { getOrganizationBillingStatus } from '@/lib/services/app-billing';

const status = await getOrganizationBillingStatus('organization-id-here');

if (status) {
  console.log('Is Active:', status.isActive);
  console.log('Is Trial:', status.isTrial);
  console.log('Is Past Due:', status.isPastDue);
  console.log('Days until next billing:', status.daysUntilNextBilling);
  console.log('MRR:', status.mrr);
}
```

### קבלת פרטי ביילינג מלאים

```typescript
import { getOrganizationBilling } from '@/lib/services/app-billing';

const billing = await getOrganizationBilling('organization-id-here');

if (billing) {
  console.log('Organization:', billing.name);
  console.log('MRR:', billing.mrr);
  console.log('Status:', billing.subscriptionStatus);
  console.log('Billing Email:', billing.billingEmail);
  console.log('Next Billing Date:', billing.nextBillingDate);
}
```

---

## 🔄 Flow של תשלום

```
1. יצירת חשבונית
   └─> createAppInvoice()
        └─> Morning API creates invoice
             └─> Returns payment URL

2. לקוח משלם
   └─> Morning processes payment
        └─> Sends webhook to /api/webhooks/morning-app

3. Webhook Handler
   └─> Verifies signature
        └─> Calls markPaymentSuccessful()
             └─> Updates social_organizations:
                  - subscription_status = 'active'
                  - last_payment_date = now
                  - next_billing_date = now + 1 month/year

4. Billing Event
   └─> Creates billing_events record for audit trail
```

---

## 📊 טבלאות מעורבות

### `social_organizations`
```sql
subscription_status  -- 'trial' | 'active' | 'past_due' | 'cancelled'
mrr                  -- Monthly Recurring Revenue (שדה קיים!)
billing_cycle        -- 'monthly' | 'yearly'
billing_email        -- אימייל לשליחת חשבוניות
next_billing_date    -- תאריך חיוב הבא
last_payment_date    -- תאריך תשלום אחרון
last_payment_amount  -- סכום תשלום אחרון
```

### `billing_events`
```sql
-- רשומות אירועים:
- payment_successful
- payment_failed
- webhook_document.paid
- webhook_signature_failed
```

---

## 🔒 אבטחה

### Webhook Signature Verification
ה-webhook handler מאמת כל בקשה באמצעות HMAC SHA256:

```typescript
// Morning שולח header:
x-greeninvoice-signature: <hmac_sha256_hex>

// הקוד מאמת:
const hmac = crypto.createHmac('sha256', MORNING_WEBHOOK_SECRET);
hmac.update(rawBody);
const expectedSignature = hmac.digest('hex');

// Timing-safe comparison
crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
```

### Rate Limiting
כדי להוסיף rate limiting ל-webhook:

```typescript
// התקן upstash rate limit
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(100, '1 h'),
});

const { success } = await ratelimit.limit('morning-webhook');
if (!success) {
  return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
}
```

---

## 🧪 בדיקות

### בדיקת Webhook Locally (ngrok)

```bash
# התקן ngrok
npm install -g ngrok

# הרץ את השרת המקומי
npm run dev

# פתח tunnel
ngrok http 3000

# הגדר ב-Morning:
https://your-ngrok-url.ngrok.io/api/webhooks/morning-app
```

### סימולציה של Webhook

```bash
curl -X POST http://localhost:3000/api/webhooks/morning-app \
  -H "Content-Type: application/json" \
  -H "x-greeninvoice-signature: <calculated_signature>" \
  -d '{
    "type": "document.paid",
    "documentId": "test-invoice-123",
    "amount": 499,
    "status": "paid",
    "metadata": {
      "organizationId": "org-uuid-here"
    }
  }'
```

### Health Check

```bash
curl http://localhost:3000/api/webhooks/morning-app
# Returns: {"status":"ok","webhookSecretConfigured":true}
```

---

## 🔄 Cron Job לגביית תשלומים אוטומטית

ניתן ליצור Cron job שרץ מדי חודש וגובה תשלומים:

```typescript
// app/api/cron/monthly-billing/route.ts
import { createAppInvoice, getOrganizationBillingStatus } from '@/lib/services/app-billing';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  // Verify CRON_SECRET...

  // Get all organizations with active subscriptions
  const orgs = await prisma.social_organizations.findMany({
    where: {
      subscription_status: 'active',
      next_billing_date: {
        lte: new Date(), // Billing date has passed
      },
    },
    select: { id: true, name: true },
  });

  const results = [];

  for (const org of orgs) {
    const result = await createAppInvoice(org.id);
    results.push({
      organizationId: org.id,
      success: result.success,
      invoiceNumber: result.invoiceNumber,
    });
  }

  return Response.json({ processed: results.length, results });
}
```

הגדר ב-Vercel Cron:
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/monthly-billing",
    "schedule": "0 9 1 * *"  // 1st of month, 9 AM
  }]
}
```

---

## 📝 הערות חשובות

### 🚨 הפרדה בין Customer Billing ל-App Billing
- ❌ **אל תשתמש** ב-`lib/integrations/green-invoice.ts` לביילינג של המערכת
- ✅ **השתמש תמיד** ב-`lib/services/app-billing.ts`
- 📌 הסיבה: API keys שונים, לוגיקה שונה, אבטחה שונה

### 💡 MRR Management
MRR מחושב באופן ידני ונשמר ב-`social_organizations.mrr`:
```typescript
// עדכון MRR לאחר שינוי מנוי
await prisma.social_organizations.update({
  where: { id: organizationId },
  data: {
    mrr: new Prisma.Decimal(499), // מנוי חדש
  },
});
```

### 🔍 Monitoring
כל אירוע נשמר ב-`billing_events` למעקב ואודיט:
```sql
SELECT
  event_type,
  amount,
  metadata->>'morningInvoiceId' as invoice_id,
  created_at
FROM billing_events
WHERE organization_id = 'org-uuid'
ORDER BY created_at DESC;
```

---

## 🐛 Troubleshooting

### Webhook לא מגיע?
1. ✅ בדוק ש-`MORNING_WEBHOOK_SECRET` מוגדר
2. ✅ בדוק שה-URL נכון ב-Morning settings
3. ✅ בדוק logs ב-Sentry/Vercel
4. ✅ נסה health check: `curl https://your-domain.com/api/webhooks/morning-app`

### Signature validation נכשל?
1. ✅ וודא שה-secret זהה בקוד וב-Morning
2. ✅ בדוק שה-webhook נשלח עם header `x-greeninvoice-signature`
3. ✅ לפיתוח: השאר `MORNING_WEBHOOK_SECRET` ריק (ידלג על validation)

### Organization לא מתעדכן?
1. ✅ בדוק ש-`organizationId` מועבר ב-webhook payload
2. ✅ בדוק ב-`billing_events` אם האירוע נרשם
3. ✅ הרץ query ידנית לבדיקה

---

## 🚀 Production Checklist

- [ ] `MORNING_APP_API_KEY` מוגדר ב-production env
- [ ] `MORNING_WEBHOOK_SECRET` מוגדר ב-production env
- [ ] Webhook URL מוגדר ב-Morning dashboard
- [ ] Secret תואם בין הקוד ל-Morning
- [ ] בדיקת health check עובדת
- [ ] סימולציה של webhook מוצלחת
- [ ] Monitoring הוגדר (Sentry/Logs)
- [ ] Cron job לחיוב חודשי הוגדר (אם רלוונטי)

---

**נבנה על ידי:** Claude Code
**תאריך:** פברואר 2024
**גרסה:** 1.0.0
