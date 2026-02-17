# ✅ Balance System Complete - Organization Financial Balance

מערכת ניהול יתרה (Balance) הושלמה בהצלחה! 💰

---

## 🎯 **מה נבנה?**

מערכת מלאה לניהול יתרה פיננסית של ארגונים:
- ✅ שדה `balance` בטבלת organizations
- ✅ עדכון אוטומטי ביתרה בעת קבלת תשלום (webhook)
- ✅ תצוגת יתרה עם צבעים (אדום לחוב, ירוק לזכות)
- ✅ עדכון יתרה ידני (למזומן/ביט/תיקון)
- ✅ Audit trail מלא ב-`billing_events`
- ✅ Super Admin בלבד

---

## 📦 **1. Schema Changes**

### **Migration:**
`prisma/migrations/20260216000000_add_balance_to_organizations/migration.sql`

```sql
ALTER TABLE "social_organizations"
ADD COLUMN IF NOT EXISTS "balance" DECIMAL(10, 2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS "idx_organizations_balance"
ON "social_organizations"("balance");
```

### **Prisma Schema:**
```prisma
model social_organizations {
  ...
  mrr                Decimal? @default(0) @db.Decimal(10, 2)
  balance            Decimal? @default(0) @db.Decimal(10, 2)  // חדש!
  ...
}
```

**ערך ברירת מחדל:** `0`
**טווח:** `-999,999.99` עד `+999,999.99`

---

## 🔄 **2. Webhook Logic**

### **קובץ:** `lib/services/app-billing.ts`

#### **פונקציה:** `markPaymentSuccessful()`

**לפני:**
```typescript
await prisma.social_organizations.update({
  data: {
    subscription_status: 'active',
    last_payment_amount: amount,
  }
});
```

**אחרי:**
```typescript
const currentBalance = org.balance?.toNumber() ?? 0;
const newBalance = currentBalance + paymentAmount;

await prisma.social_organizations.update({
  data: {
    subscription_status: 'active',
    last_payment_amount: amount,
    balance: newBalance,  // ✅ מוסיף את התשלום ליתרה!
  }
});

// יוצר billing event עם המידע על היתרה
await prisma.billing_events.create({
  data: {
    event_type: 'payment_successful',
    metadata: {
      previousBalance: currentBalance,
      newBalance,
    }
  }
});
```

---

## 🎨 **3. Admin UI - תצוגת יתרה**

### **קובץ:** `components/admin/ManageOrganizationClient.tsx`

### **תצוגה:**

```
┌─────────────────────────────────────────┐
│ טאב: חיוב                                │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────┐  ┌─────────────┐      │
│  │ MRR         │  │ יתרה        │      │
│  │ ₪499        │  │ ₪1,250.00   │      │
│  │ (כחול)      │  │ ✅ זכות     │      │
│  └─────────────┘  │ (ירוק)      │      │
│                   │ [עדכון ידני]│      │
│                   └─────────────┘      │
└─────────────────────────────────────────┘
```

### **צבעים:**
- 🟢 **ירוק** - יתרה חיובית (זכות)
- 🔴 **אדום** - יתרה שלילית (חוב)

```tsx
<div className={`p-6 border-2 rounded-xl ${
  parseFloat(balance) >= 0
    ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
    : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
}`}>
  <h4>יתרה</h4>
  <p className={`text-3xl font-black ${
    parseFloat(balance) >= 0 ? 'text-green-700' : 'text-red-700'
  }`}>
    ₪{parseFloat(balance).toFixed(2)}
  </p>
  <p>{parseFloat(balance) >= 0 ? '✅ זכות' : '⚠️ חוב'}</p>
</div>
```

---

## 🛠️ **4. Manual Balance Adjustment**

### **כפתור:** "עדכון ידני"

**מתי להשתמש:**
- 💵 תשלום במזומן
- 📱 תשלום בביט
- 🏦 העברה בנקאית
- 📋 תיקון ידני של שגיאה

### **UI Form:**

```
┌─────────────────────────────────────────┐
│ ⚠️ עדכון יתרה ידני                     │
│ למקרי תשלום במזומן / ביט / תיקון ידני  │
├─────────────────────────────────────────┤
│                                         │
│  [סכום: ______] [אמצעי: מזומן ▼]       │
│                                         │
│  [סיבה: ________________________]      │
│                                         │
│  [עדכן יתרה]  [ביטול]                  │
└─────────────────────────────────────────┘
```

### **אמצעי תשלום זמינים:**
1. 💵 **מזומן** (`cash`)
2. 📱 **ביט** (`bit`)
3. 🏦 **העברה בנקאית** (`bank_transfer`)
4. 📋 **צ׳ק** (`check`)
5. 🔧 **תיקון ידני** (`correction`)

---

## 💻 **5. Code Functions**

### **Service Layer:** `lib/services/app-billing.ts`

#### **פונקציה חדשה:**
```typescript
async function adjustOrganizationBalance(
  organizationId: string,
  amount: number,
  reason: string,
  paymentMethod: 'cash' | 'bit' | 'bank_transfer' | 'check' | 'correction'
): Promise<{ success: boolean; newBalance?: number; error?: string }>
```

**דוגמה:**
```typescript
// הוספת ₪500 למזומן
await adjustOrganizationBalance(
  'org-id',
  500,
  'תשלום במזומן בפגישה עם הלקוח',
  'cash'
);

// ניכוי ₪100 (תיקון שגיאה)
await adjustOrganizationBalance(
  'org-id',
  -100,
  'תיקון חיוב כפול',
  'correction'
);
```

### **Server Action:** `app/actions/app-billing.ts`

#### **פונקציה חדשה:**
```typescript
async function adjustBalanceManually(
  organizationId: string,
  amount: number,
  reason: string,
  paymentMethod: string
): Promise<ActionResult<{ newBalance: number }>>
```

**בטיחות:**
- ✅ דורש Super Admin
- ✅ בודק קלט תקין
- ✅ דורש סיבה חובה
- ✅ יוצר billing event

---

## 🔄 **6. Balance Flow**

### **Flow 1: Automatic (Webhook)**

```
1. לקוח משלם דרך Morning
   ↓
2. Morning → POST /api/webhooks/morning-app
   ↓
3. markPaymentSuccessful(org, amount)
   ↓
4. currentBalance = ₪0
   newBalance = ₪0 + ₪499 = ₪499
   ↓
5. UPDATE social_organizations
   SET balance = ₪499
   ↓
6. CREATE billing_events
   - event_type: 'payment_successful'
   - metadata: { previousBalance: 0, newBalance: 499 }
```

### **Flow 2: Manual (Admin)**

```
1. Admin → טאב חיוב → [עדכון ידני]
   ↓
2. מזין: סכום ₪200, סיבה "תשלום במזומן", אמצעי "מזומן"
   ↓
3. adjustBalanceManually(org, 200, reason, 'cash')
   ↓
4. currentBalance = ₪499
   newBalance = ₪499 + ₪200 = ₪699
   ↓
5. UPDATE social_organizations
   SET balance = ₪699
   ↓
6. CREATE billing_events
   - event_type: 'manual_balance_adjustment'
   - metadata: {
       paymentMethod: 'cash',
       reason: 'תשלום במזומן',
       adjustmentAmount: 200,
       adjustmentType: 'credit'
     }
```

---

## 📊 **7. Billing Events**

### **סוגי אירועים:**

| Event Type | תיאור | מתי קורה |
|-----------|-------|----------|
| `payment_successful` | תשלום הצליח | Webhook מ-Morning |
| `manual_balance_adjustment` | עדכון יתרה ידני | Admin עדכן באופן ידני |
| `payment_failed` | תשלום נכשל | Webhook מ-Morning |

### **Metadata Structure:**

#### **payment_successful:**
```json
{
  "morningInvoiceId": "inv-123",
  "source": "morning_webhook",
  "previousBalance": 0,
  "newBalance": 499
}
```

#### **manual_balance_adjustment:**
```json
{
  "source": "manual_adjustment",
  "paymentMethod": "cash",
  "reason": "תשלום במזומן בפגישה",
  "previousBalance": 499,
  "newBalance": 699,
  "adjustmentAmount": 200,
  "adjustmentType": "credit"
}
```

---

## 🔒 **8. Security & Validation**

### **Super Admin Only:**
```typescript
// כל הפונקציות מוגנות
await requireSuperAdmin();
```

### **Input Validation:**
```typescript
// סכום
if (!Number.isFinite(amount) || amount === 0) {
  return error('סכום לא תקין');
}

// סיבה
if (!reason || reason.trim().length === 0) {
  return error('יש לציין סיבה לעדכון');
}

// ארגון קיים
const org = await prisma.organizations.findUnique(...);
if (!org) {
  return error('ארגון לא נמצא');
}
```

---

## 📈 **9. Use Cases**

### **Use Case 1: תשלום רגיל דרך Morning**
```
יתרה לפני: ₪0
תשלום: ₪499 (דרך Morning)
יתרה אחרי: ₪499 ✅
```

### **Use Case 2: תשלום במזומן**
```
יתרה לפני: ₪499
תשלום במזומן: ₪200
Admin → עדכון ידני → +₪200
יתרה אחרי: ₪699 ✅
```

### **Use Case 3: תיקון שגיאה**
```
יתרה לפני: ₪699
שגיאה: נגבה פעמיים ₪100
Admin → עדכון ידני → -₪100
יתרה אחרי: ₪599 ✅
```

### **Use Case 4: חוב**
```
יתרה לפני: ₪0
חיוב MRR: -₪499 (לא שולם)
Admin → עדכון ידני → -₪499
יתרה אחרי: -₪499 ⚠️ (אדום)
```

---

## 🎨 **10. UI Screenshots**

### **יתרה חיובית (זכות):**
```
┌──────────────────────┐
│ יתרה    [עדכון ידני] │
│ ₪1,250.00           │
│ ✅ זכות              │
│                      │
│ רקע: ירוק בהיר       │
└──────────────────────┘
```

### **יתרה שלילית (חוב):**
```
┌──────────────────────┐
│ יתרה    [עדכון ידני] │
│ ₪-350.00            │
│ ⚠️ חוב               │
│                      │
│ רקע: אדום בהיר       │
└──────────────────────┘
```

---

## 🧪 **11. Testing**

### **Test 1: Webhook Updates Balance**
```typescript
// Before: balance = 0
await markPaymentSuccessful('org-id', 499, 'inv-123');
// After: balance = 499 ✅
```

### **Test 2: Manual Adjustment**
```typescript
// Before: balance = 499
await adjustOrganizationBalance('org-id', 200, 'cash payment', 'cash');
// After: balance = 699 ✅
```

### **Test 3: Negative Balance**
```typescript
// Before: balance = 100
await adjustOrganizationBalance('org-id', -150, 'correction', 'correction');
// After: balance = -50 ⚠️
```

---

## 📋 **12. Database Queries**

### **Check Balance:**
```sql
SELECT id, name, balance, subscription_status
FROM social_organizations
WHERE id = 'org-uuid';
```

### **Balance History:**
```sql
SELECT
  event_type,
  amount,
  metadata->>'previousBalance' as prev,
  metadata->>'newBalance' as new,
  created_at
FROM billing_events
WHERE organization_id = 'org-uuid'
  AND (event_type = 'payment_successful'
       OR event_type = 'manual_balance_adjustment')
ORDER BY created_at DESC;
```

### **Organizations with Debt:**
```sql
SELECT id, name, balance
FROM social_organizations
WHERE balance < 0
ORDER BY balance ASC;
```

### **Organizations with Credit:**
```sql
SELECT id, name, balance
FROM social_organizations
WHERE balance > 0
ORDER BY balance DESC;
```

---

## 🚀 **13. Future Enhancements**

אופציות להרחבה:
1. **Auto-debit:** ניכוי אוטומטי של MRR מהיתרה
2. **Balance alerts:** התראה כשיתרה נמוכה מ-0
3. **Balance history graph:** גרף של שינויי יתרה לאורך זמן
4. **Billing reports:** דוחות יתרה חודשיים
5. **Balance API:** API לשאילתות יתרה

---

## ✅ **Summary**

**כל מערכת הBalance מוכנה ופועלת!**

- ✅ שדה balance בטבלה
- ✅ עדכון אוטומטי בwebhook
- ✅ תצוגת יתרה עם צבעים
- ✅ עדכון ידני למזומן/ביט
- ✅ Audit trail מלא
- ✅ Super Admin בלבד
- ✅ Validation מלא

**Files Created/Updated:**
```
prisma/migrations/20260216000000_add_balance_to_organizations/migration.sql (חדש)
prisma/schema.prisma (עודכן)
lib/services/app-billing.ts (עודכן)
app/actions/app-billing.ts (עודכן)
components/admin/ManageOrganizationClient.tsx (עודכן)
```

---

**Built by:** Claude Code
**Date:** February 2024
**Version:** 1.0.0
