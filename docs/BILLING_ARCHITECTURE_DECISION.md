# 💰 Billing & Trial Architecture - החלטה ארכיטקטורלית

**תאריך:** 10 פברואר 2026  
**החלטה:** Ultra-Perfectionist ✨

---

## 🎯 השאלות

1. **קופונים והנחות** - ארגון או לקוח?
2. **פרטי תשלום** - ארגון או לקוח?
3. **ימי ניסיון** - ארגון או לקוח?

---

## 🏗️ ההחלטה הסופית

### Level 1: **Organization** (עיקרי)
כל **ארגון** הוא יחידת חיוב עצמאית:

```
Organization
├── Subscription (trial/active/cancelled)
├── Plan (starter/pro/agency)
├── Seats (5/20/50)
├── Trial Days (7/14/30)
├── Billing Info (payment method)
├── Coupon Applied (discount)
└── MRR/ARR (monthly/annual revenue)
```

**למה?**
- כל ארגון משלם בנפרד
- ארגון אחד יכול להיות trial, אחר active
- כל ארגון יכול לקבל קופון שונה
- כל ארגון יכול להיות בחבילה שונה

### Level 2: **BusinessClient** (summary)
**לקוח עסקי** = אגרגציה של כל הארגונים שלו:

```
BusinessClient
├── Total MRR (sum of all orgs)
├── Total ARR (sum of all orgs)
├── Total Organizations (count)
├── Active Organizations (count)
├── Trial Organizations (count)
└── Lifetime Revenue (total)
```

**למה?**
- מבט על כלל הלקוח
- דוחות כספיים
- Account management

---

## 📊 Data Model

### Organization (social_organizations)
```sql
-- ✅ כבר קיים
subscription_status VARCHAR(50) DEFAULT 'trial'
subscription_plan VARCHAR(50)
trial_start_date TIMESTAMPTZ
trial_days INT DEFAULT 7
subscription_start_date TIMESTAMPTZ
seats_allowed INT

-- ⭐ נוסיף
billing_cycle VARCHAR(20)           -- monthly/yearly
billing_email VARCHAR(255)          -- למי לשלוח חשבוניות
payment_method_id VARCHAR(255)      -- Stripe payment method
next_billing_date DATE
mrr DECIMAL(10,2) DEFAULT 0         -- Monthly Recurring Revenue
arr DECIMAL(10,2) DEFAULT 0         -- Annual Recurring Revenue
discount_percent INT DEFAULT 0       -- הנחה מקופון
trial_extended_days INT DEFAULT 0    -- ימי ניסיון נוספים
trial_end_date DATE                  -- מחושב אוטומטית
```

### Coupons (כבר קיים)
```sql
model coupons {
  id String @id
  code_hash String @unique
  discount_percent Int?
  discount_amount_cents Int?
  max_redemptions Int?
  redemptions_count Int
  starts_at DateTime?
  ends_at DateTime?
  created_at DateTime
  updated_at DateTime
  
  redemptions coupon_redemptions[]
}
```

### Coupon Redemptions (כבר קיים)
```sql
model coupon_redemptions {
  id String @id
  coupon_id String
  organization_id String  -- ⭐ per organization!
  redeemed_at DateTime
  
  coupon coupons @relation
  organization social_organizations @relation
}
```

### BusinessClient (aggregated)
```sql
-- ✅ כבר יש
total_revenue_lifetime DECIMAL(15,2) DEFAULT 0
mrr DECIMAL(10,2) DEFAULT 0
arr DECIMAL(10,2) DEFAULT 0

-- ⭐ נוסיף חישוב אוטומטי
-- sum(organizations.mrr) -> client.mrr
-- sum(organizations.arr) -> client.arr
```

---

## 🎨 UI/UX Flow

### 1. Organization Card - כפתורי ניהול
```
┌─────────────────────────────────────┐
│ 🏢 מחלקת שיווק - ABC              │
│ Status: Trial (5 ימים נותרו)       │
│ Plan: Pro | Seats: 5/20            │
│                                     │
│ [💰 Manage Billing]                │
│ [🎟️ Apply Coupon]                 │
│ [⏱️ Extend Trial]                  │
└─────────────────────────────────────┘
```

### 2. Manage Billing Modal
```
┌─────────────────────────────────────┐
│ 💰 ניהול חיובים - מחלקת שיווק     │
│                                     │
│ Subscription Plan: [▼ Pro]         │
│ Billing Cycle: [▼ Monthly]         │
│ Seats: [20]                         │
│                                     │
│ Billing Email: billing@abc.co.il   │
│ Payment Method: •••• 4242          │
│ Next Billing: 15/02/2026            │
│                                     │
│ MRR: ₪299 | ARR: ₪3,588            │
│                                     │
│ [Update Billing Info]               │
└─────────────────────────────────────┘
```

### 3. Apply Coupon Modal
```
┌─────────────────────────────────────┐
│ 🎟️ החלת קופון - מחלקת שיווק       │
│                                     │
│ Coupon Code: [WELCOME20___]        │
│ [Validate]                          │
│                                     │
│ ✅ Valid!                           │
│ Discount: 20% off for 3 months     │
│ Savings: ₪179                       │
│                                     │
│ [Apply Coupon]                      │
└─────────────────────────────────────┘
```

### 4. Extend Trial Modal
```
┌─────────────────────────────────────┐
│ ⏱️ הארכת ניסיון - מחלקת שיווק     │
│                                     │
│ Current Trial: 7 ימים              │
│ Trial Start: 01/02/2026             │
│ Trial End: 08/02/2026               │
│                                     │
│ הוסף ימים: [+14___] ימים           │
│                                     │
│ New Trial End: 22/02/2026           │
│                                     │
│ Reason (optional):                  │
│ [הלקוח ביקש הארכה_______________]  │
│                                     │
│ [Extend Trial]                      │
└─────────────────────────────────────┘
```

---

## 🔧 Server Actions

### billing-actions.ts
```typescript
// Billing Management
export async function updateOrganizationBilling(
  orgId: string,
  input: {
    subscription_plan?: string;
    billing_cycle?: 'monthly' | 'yearly';
    seats_allowed?: number;
    billing_email?: string;
  }
)

// Coupon System
export async function validateCoupon(code: string)
export async function applyCouponToOrganization(
  orgId: string,
  couponCode: string
)

// Trial Management
export async function extendOrganizationTrial(
  orgId: string,
  additionalDays: number,
  reason?: string
)
export async function convertTrialToActive(orgId: string)
export async function cancelSubscription(
  orgId: string,
  reason: string
)

// Calculations
export async function calculateOrganizationMRR(orgId: string)
export async function calculateClientTotalRevenue(clientId: string)
```

---

## 📈 Business Logic

### MRR Calculation
```typescript
// Per Organization
const mrr = basePricePerSeat * seatsAllowed * (1 - discountPercent/100);

// Starter: ₪49/seat * 5 = ₪245/month
// Pro: ₪99/seat * 20 = ₪1,980/month
// Agency: ₪149/seat * 50 = ₪7,450/month
```

### ARR Calculation
```typescript
const arr = mrr * 12;
// או אם billing_cycle = 'yearly':
const arr = yearlyPrice * (1 - discountPercent/100);
```

### Trial End Calculation
```typescript
const trialEndDate = addDays(
  trial_start_date,
  trial_days + trial_extended_days
);
```

### Client Total Revenue
```typescript
const clientMRR = organizations
  .filter(o => o.client_id === clientId)
  .reduce((sum, o) => sum + o.mrr, 0);

const clientARR = clientMRR * 12;
```

---

## 🎯 Use Cases

### תרחיש 1: ארגון חדש עם קופון
```
1. יוצרים Organization
2. מחילים קופון WELCOME20 (20% הנחה ל-3 חודשים)
3. trial_days = 7
4. subscription_plan = 'pro'
5. seats_allowed = 20
6. discount_percent = 20
7. MRR = ₪99 * 20 * 0.8 = ₪1,584
```

### תרחיש 2: הארכת ניסיון
```
1. ארגון בניסיון: trial_days = 7
2. אדמין מאריך: +14 ימים
3. trial_extended_days = 14
4. trial_end_date = trial_start + 7 + 14 = 21 ימים
5. רושמים ב-log למה הארכנו
```

### תרחיש 3: לקוח עסקי עם 3 ארגונים
```
BusinessClient: חברת ABC
├── Organization A (Pro, ₪1,980/mo)
├── Organization B (Starter, ₪245/mo)
└── Organization C (Agency, ₪7,450/mo)

Client Total MRR: ₪9,675
Client Total ARR: ₪116,100
```

---

## ✅ Implementation Checklist

### Phase 1: Schema (Migration)
- [ ] Add billing fields to organizations
- [ ] Add trial_extended_days
- [ ] Add mrr, arr columns
- [ ] Add billing_cycle, billing_email
- [ ] Add payment_method_id
- [ ] Add next_billing_date

### Phase 2: Server Actions
- [ ] updateOrganizationBilling()
- [ ] validateCoupon()
- [ ] applyCouponToOrganization()
- [ ] extendOrganizationTrial()
- [ ] calculateOrganizationMRR()
- [ ] calculateClientTotalRevenue()

### Phase 3: UI Components
- [ ] ManageBillingModal
- [ ] ApplyCouponModal
- [ ] ExtendTrialModal
- [ ] Organization Card - Add action buttons
- [ ] Client Card - Show total MRR/ARR

### Phase 4: Auto-calculations
- [ ] Trigger: calculate MRR on billing update
- [ ] Trigger: calculate Client totals on org update
- [ ] Cron: check trial expiration daily
- [ ] Cron: auto-charge on billing_date

---

## 🚀 Benefits

### For Admin
- ✅ שליטה מלאה על כל ארגון
- ✅ יכולת להחיל קופונים
- ✅ הארכת ניסיון בקליק
- ✅ מעקב MRR/ARR בזמן אמת

### For Business Client
- ✅ כל ארגון בנפרד
- ✅ גמישות בחבילות
- ✅ תצוגה מאוחדת של כל הארגונים

### For Reporting
- ✅ MRR/ARR per organization
- ✅ MRR/ARR per client
- ✅ Coupon usage analytics
- ✅ Trial conversion rate

---

## 🎉 Summary

**ההחלטה:**
- **Billing = Organization Level** (עיקרי)
- **Summary = Client Level** (aggregated)
- **Coupons = Organization Level**
- **Trial = Organization Level**

**Why it's perfect:**
- Maximum flexibility
- Clear separation
- Easy to manage
- Scalable
- Professional

---

**Created:** 10 Feb 2026  
**Status:** Architecture Approved ✅  
**Next:** Implementation
