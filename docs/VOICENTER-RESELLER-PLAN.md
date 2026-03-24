# Voicenter Reseller Integration — תוכנית מלאה

> מסמך תכנון ארכיטקטוני ועסקי לשילוב MISRAD AI כ-Reseller של Voicenter

---

## 1. מה Voicenter מציעים — סיכום המחקר

### 3 מסלולי שותפות:

| מסלול | תיאור | מתאים? |
|-------|--------|---------|
| **Affiliate** | הפניה פשוטה — Voicenter מטפל בכל, אתה מקבל עמלה | ❌ לא מספיק |
| **Partner** | שילוב פתרונות Voicenter בתוך השירותים שלך | ⚠️ חלקי |
| **Reseller** | גישה ישירה למערכת, ניהול לקוחות בעצמאות מלאה, White Label | ✅ מושלם |

### מה מסלול Reseller כולל:
- **חשבון מאסטר** — MISRAD AI מנהל חשבון ראשי ב-CPanel
- **תת-חשבונות** — כל לקוח MISRAD AI = תת-חשבון נפרד ב-Voicenter
- **Hierarchical Account Tree** — CPanel תומך בעץ היררכי של חשבונות
- **White Label** — אפשרות להציג את הטלפוניה תחת המותג של MISRAD AI
- **חיוב עצמאי** — MISRAD AI מחייבת את הלקוחות ישירות (עם מרג'ין)
- **ניהול עצמאי** — שלוחות, IVR, תורים, הקלטות — הכל מנוהל דרכנו

### Voicenter BSS (Business Support Systems):
- **Admin Portal** — ניהול מרכזי
- **CPanel Portal** — ניהול לקוח
- **Customer Management** — Contact Persons, Locations, Users
- **Billing & Payment** — Services, Call Pricing, Invoicing, Collection
- **Sales & Marketing** — Leads, Opportunities, Quotes, Onboarding
- **Tickets** — תמיכה מובנית עם Client Portal

### API/Integrations זמינות:
- **Popup Screen (Screen Pop)** — כבר מחובר! ✅
- **Click2Call** — כבר מחובר! ✅
- **CDR/Calls BI** — כבר מחובר! ✅
- **Real-Time Events** — כבר מחובר! ✅
- **WebRTC Widget** — כבר מחובר! ✅
- **External IVR** — חיבור routing מתקדם דרך DB/CRM שלנו
- **Auto Dialer** — קמפיינים אוטומטיים
- **Blocklist/DNC** — רשימת Do-Not-Call
- **Call Tracking** — מעקב conversions מאתר

---

## 2. המודל העסקי — MISRAD AI כ-Reseller

### Value Proposition:
> "MISRAD AI — מערכת AI שמנהלת את הארגון + טלפוניה מובנית. הכל במקום אחד."

### מקורות הכנסה חדשים:
1. **מנוי טלפוניה חודשי** — ₪49-149/שלוחה (תלוי בחבילה)
2. **דקות שיחה** — מרג'ין על דקות (5-15%)
3. **שירותים נוספים** — הקלטות, IVR מתקדם, Auto Dialer
4. **Onboarding** — דמי הקמה חד-פעמיים ₪200-500

### תמחור מוצע לשלוחה:

| רכיב | עלות Voicenter* | מחיר MISRAD AI | מרג'ין |
|-------|-----------------|----------------|--------|
| שלוחה בסיסית | ~₪25/חודש | ₪49/חודש | ₪24 |
| שלוחה + הקלטות | ~₪35/חודש | ₪79/חודש | ₪44 |
| שלוחה Pro (+ AI) | ~₪45/חודש | ₪149/חודש | ₪104 |

*מחירי Voicenter משוערים — לבדוק עם שחר

### חבילות טלפוניה ב-MISRAD AI:

| חבילה | שלוחות | כולל | מחיר |
|-------|---------|------|------|
| **Starter** | 1-3 | Click2Call, Screen Pop, CDR | ₪99/חודש |
| **Business** | 4-10 | + IVR, הקלטות, WebRTC | ₪299/חודש |
| **Enterprise** | 11+ | + Auto Dialer, AI, API מלא | ₪599/חודש |

---

## 3. ארכיטקטורה טכנית

### 3.1 מה כבר קיים ב-MISRAD AI:
- ✅ `Partner` + `SystemPartner` models (referral tracking)
- ✅ `TelephonyConfig` + `TelephonyCredentials` (per-org settings)
- ✅ Voicenter webhook (CDR + Screen Pop)
- ✅ WebRTC Widget (VoicecenterWidget.tsx)
- ✅ Click2Call integration
- ✅ SSE for real-time events
- ✅ Admin Partners dashboard

### 3.2 מה צריך לבנות:

#### DB Schema — מודלים חדשים:

```prisma
// תת-חשבון Voicenter לכל ארגון
model TelephonySubAccount {
  id                String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId    String       @unique @map("organization_id") @db.Uuid
  voicenterAccountId String?     @map("voicenter_account_id") // ID ב-CPanel
  status            String       @default("pending") // pending, active, suspended, cancelled
  plan              String       @default("starter") // starter, business, enterprise
  maxExtensions     Int          @default(3) @map("max_extensions")
  monthlyPrice      Decimal      @default(0) @map("monthly_price") @db.Decimal(10,2)
  billingCycle      String       @default("monthly") @map("billing_cycle")
  provisionedAt     DateTime?    @map("provisioned_at") @db.Timestamptz(6)
  activatedAt       DateTime?    @map("activated_at") @db.Timestamptz(6)
  cancelledAt       DateTime?    @map("cancelled_at") @db.Timestamptz(6)
  createdAt         DateTime     @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt         DateTime     @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  
  organization      Organization @relation(fields: [organizationId], references: [id])
  extensions        TelephonyExtension[]
  usageRecords      TelephonyUsageRecord[]
  
  @@map("telephony_sub_accounts")
}

// שלוחה בודדת
model TelephonyExtension {
  id                String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  subAccountId      String       @map("sub_account_id") @db.Uuid
  extensionNumber   String       @map("extension_number") // 1001, 1002...
  sipUsername       String?      @map("sip_username")
  displayName       String?      @map("display_name")
  assignedUserId    String?      @map("assigned_user_id") @db.Uuid
  type              String       @default("standard") // standard, queue, ivr
  status            String       @default("active") // active, disabled
  features          Json?        @default("{}")
  createdAt         DateTime     @default(now()) @map("created_at") @db.Timestamptz(6)
  
  subAccount        TelephonySubAccount @relation(fields: [subAccountId], references: [id], onDelete: Cascade)
  
  @@unique([subAccountId, extensionNumber])
  @@map("telephony_extensions")
}

// רשומת שימוש לחיוב
model TelephonyUsageRecord {
  id                String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  subAccountId      String       @map("sub_account_id") @db.Uuid
  periodStart       DateTime     @map("period_start") @db.Timestamptz(6)
  periodEnd         DateTime     @map("period_end") @db.Timestamptz(6)
  totalCalls        Int          @default(0) @map("total_calls")
  totalMinutes      Int          @default(0) @map("total_minutes")
  inboundCalls      Int          @default(0) @map("inbound_calls")
  outboundCalls     Int          @default(0) @map("outbound_calls")
  recordedCalls     Int          @default(0) @map("recorded_calls")
  baseCost          Decimal      @default(0) @map("base_cost") @db.Decimal(10,2)
  minutesCost       Decimal      @default(0) @map("minutes_cost") @db.Decimal(10,2)
  totalCost         Decimal      @default(0) @map("total_cost") @db.Decimal(10,2)
  invoiced          Boolean      @default(false)
  createdAt         DateTime     @default(now()) @map("created_at") @db.Timestamptz(6)
  
  subAccount        TelephonySubAccount @relation(fields: [subAccountId], references: [id], onDelete: Cascade)
  
  @@index([subAccountId, periodStart])
  @@map("telephony_usage_records")
}
```

### 3.3 API Routes חדשים:

| Route | Method | תיאור |
|-------|--------|--------|
| `/api/admin/telephony-reseller` | GET | סיכום כללי — כל תת-החשבונות |
| `/api/admin/telephony-reseller` | POST | Provision תת-חשבון חדש |
| `/api/admin/telephony-reseller/[subAccountId]` | PATCH | עדכון חבילה/סטטוס |
| `/api/admin/telephony-reseller/usage` | GET | דוחות שימוש |
| `/api/workspaces/[slug]/telephony/extensions` | GET/POST | ניהול שלוחות |
| `/api/workspaces/[slug]/telephony/cdr` | GET | היסטוריית שיחות |
| `/api/cron/telephony-billing` | POST | חיוב חודשי אוטומטי |

### 3.4 UI Pages/Components:

#### Admin Level:
- `app/admin/telephony-reseller/` — דשבורד ראשי
  - KPIs: חשבונות פעילים, הכנסה חודשית, שלוחות, דקות
  - טבלת ארגונים + סטטוס טלפוניה
  - Provision wizard
  - Usage reports + graphs

#### Workspace Level:
- הרחבת `TelephonyConfigForm` — ניהול שלוחות
- `ExtensionManagement` — הוספה/עריכה/מחיקה של שלוחות
- `CDRViewer` — היסטוריית שיחות עם פילטרים
- `TelephonyBillingCard` — סיכום חיוב חודשי

---

## 4. זרימת Provisioning

```
לקוח חדש רוצה טלפוניה
  ↓
Admin בוחר חבילה (Starter/Business/Enterprise)
  ↓
MISRAD AI → Voicenter API: Create Sub-Account
  ↓
Voicenter מחזיר: Account ID + Credentials
  ↓
MISRAD AI שומר ב-TelephonySubAccount
  ↓
Admin מגדיר שלוחות (או אוטומטי)
  ↓
MISRAD AI → Voicenter API: Create Extensions
  ↓
SIP Credentials נשמרות ב-TelephonyExtension
  ↓
לקוח מקבל גישה — WebRTC Widget פעיל!
```

---

## 5. שאלות לשיחה עם שחר (Voicenter)

### תמחור:
1. מה המחיר לשלוחה ב-Reseller?
2. יש מינימום שלוחות/חשבונות?
3. מה התמחור לדקות (נכנסות/יוצאות)?
4. יש הנחת נפח?

### טכני:
5. יש API ל-provisioning של תת-חשבונות? (create/update/delete)
6. יש API לניהול שלוחות?
7. האם White Label כולל Softphone/WebRTC בלוגו שלנו?
8. איך עובד ה-billing reporting? יש webhook/API?

### עסקי:
9. מה תנאי ההסכם? (תקופה, ביטול, SLA)
10. האם יש dashboard ל-Reseller עם כל תת-החשבונות?
11. איך מטפלים בתקלות — ישירות מול Voicenter או דרכנו?
12. יש אפשרות ל-co-branding במקום White Label מלא?

---

## 6. Roadmap

### Phase 1 — Foundation (שבוע 1-2)
- [ ] DB Schema: TelephonySubAccount, Extension, UsageRecord
- [ ] Types: Voicenter Reseller types
- [ ] Admin Dashboard UI (read-only — KPIs + table)
- [ ] Manual provisioning via Admin

### Phase 2 — Self-Service (שבוע 3-4)
- [ ] Provisioning Wizard (Admin + Workspace)
- [ ] Extension Management UI
- [ ] CDR Viewer
- [ ] WebRTC Widget per-extension

### Phase 3 — Billing (שבוע 5-6)
- [ ] Usage tracking cron job
- [ ] Monthly billing calculation
- [ ] Invoice generation
- [ ] Payment integration

### Phase 4 — Automation (שבוע 7-8)
- [ ] Auto-provisioning on plan purchase
- [ ] IVR builder UI
- [ ] Auto Dialer campaigns
- [ ] AI call analysis integration

---

## 7. נקודות שהושלמו כבר

| רכיב | סטטוס | קובץ |
|-------|--------|------|
| Webhook CDR + Screen Pop | ✅ פעיל | `app/api/webhooks/voicenter/route.ts` |
| WebRTC Widget | ✅ פעיל | `components/telephony/VoicecenterWidget.tsx` |
| Click2Call | ✅ פעיל | `lib/services/telephony.ts` |
| SSE Real-time Events | ✅ פעיל | `app/api/telephony/events/route.ts` |
| Telephony Config Form | ✅ פעיל | `components/settings/TelephonyConfigForm.tsx` |
| Partner Model | ✅ פעיל | `prisma/schema.prisma` (Partner) |
| Admin Partners UI | ✅ פעיל | `app/admin/partners/AdminPartnersClient.tsx` |
