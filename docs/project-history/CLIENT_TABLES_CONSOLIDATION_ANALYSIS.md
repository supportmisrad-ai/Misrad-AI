# ניתוח 5+ טבלאות לקוחות — תוכנית קונסולידציה

> תאריך: 15/02/2026  
> סטטוס: ניתוח מלא — ממתין להחלטה

---

## מצב נוכחי: 6 טבלאות לקוחות

| # | Model | DB Table | שורות שימוש | תפקיד |
|---|-------|----------|-------------|--------|
| 1 | `clients` | `clients` | 16 | Legacy Social CRM clients |
| 2 | `ClientClient` | `client_clients` | **58** | Client OS — הטבלה הראשית |
| 3 | `NexusClient` | `nexus_clients` | 18 | Nexus module clients |
| 4 | `MisradClient` | `misrad_clients` | 9 | Professional services CRM |
| 5 | `CustomerAccount` | `customer_accounts` | 4 | Bridge entity (מקשרת MisradClient ← → Org) |
| 6 | `BusinessClient` | `business_clients` | 10 | B2B CRM של MISRAD AI עצמו (פלטפורמה) |

---

## ניתוח לפי שכבה

### שכבת פלטפורמה (MISRAD AI כעסק)

**`BusinessClient`** — ✅ נשאר נפרד, תפקיד ייחודי
- מנהל את **הלקוחות של MISRAD AI עצמו** (B2B SaaS)
- שדות: company_name, business_number, tax_id, billing info, MRR, ARR
- Relations: organizations (טננטים), contacts
- **אין חפיפה** עם שאר הטבלאות — זה CRM למכירות הפלטפורמה

### שכבת טננט (לקוחות של המשתמשים)

#### `ClientClient` — ⭐ הטבלה המרכזית (58 שימושים)
- **Client OS module** — ניהול לקוחות בתוך ארגון
- שדות: fullName, phone, email, notes, metadata (JSON)
- Relations: approvals, documents, feedbacks, notes, portal, sessions, tasks, files, serviceTier
- **הכי מפותחת** — עם מערכת portal, documents, approvals, sessions

#### `NexusClient` — 🔄 חופף עם ClientClient (18 שימושים)
- שדות: name, companyName, email, phone, status, contactPerson, joinedAt, source, package, avatar
- Relations: רק organization
- **שדות ייחודיים**: `package`, `contactPerson`, `assetsFolderUrl`, `source`
- כל השדות הייחודיים יכולים להיות optional fields או metadata ב-ClientClient

#### `clients` — 🏚️ Legacy (16 שימושים, 11 קבצים)
- שדות: name, company_name, phone, email, avatar, brand_voice, posting_rhythm, portal_token, plan, monthly_fee
- Relations: business_metrics, client_dna, operations_projects, platform_credentials, platform_quotas
- **שדות ייחודיים**: `brand_voice`, `posting_rhythm`, `portal_token`, `plan`, `monthly_fee`, `payment_*`
- הקבצים שמשתמשים: admin-cockpit, admin-payments, payments, campaigns, posts, ideas, requests, system-leads, voice

#### `MisradClient` — 🧩 מומחה (9 שימושים)
- שדות: ~30 שדות מומחים (healthScore, profitMargin, lifetimeValue, hoursLogged, etc.)
- Relations: ~20 relations (invoices, meetings, agreements, deliverables, milestones, etc.)
- מחובר ל-CustomerAccount
- **שדות ייחודיים**: כמעט כולם — זו ישות שונה מהותית (פרויקט/retainer, לא רק contact)

#### `CustomerAccount` — 🔗 Bridge (4 שימושים)
- שדות: name, company_name, phone, email
- Relations: misradClients, systemLeads
- **רק ב-`customer-accounts.ts`** — מאוד מבודד
- תפקיד: מקשר בין MisradClient ל-Organization

---

## תוכנית קונסולידציה (3 פאזות)

### Phase 1: מיגרציה NexusClient → ClientClient ⚠️ סיכון נמוך

**מה**: מיזוג NexusClient לתוך ClientClient  
**למה**: חפיפה כמעט מלאה בשדות  
**השפעה**: 18 שימושים צריכים עדכון

**צעדים:**
1. הוסף שדות optional ל-ClientClient:
   - `companyName String?` (כבר אין — אבל `fullName` קיים)
   - `package String?`
   - `contactPerson String?`
   - `source String?`
   - `assetsFolderUrl String?`
   - `avatar String?`
   - `joinedAt DateTime?`
2. צור migration שמעתיקה data מ-nexus_clients → client_clients (per org)
3. צור compatibility view/function שקוראת מ-ClientClient עם mapping
4. עדכן 18 code references
5. **אל תמחק את nexus_clients** — השאר כ-readonly archive

### Phase 2: מיגרציה clients (legacy) → ClientClient ⚠️ סיכון בינוני

**מה**: מיזוג `clients` Legacy לתוך ClientClient  
**למה**: טבלה ישנה, רק 16 שימושים, שדות בסיסיים  
**השפעה**: 16 שימושים + 5 relations

**צעדים:**
1. הוסף שדות optional ל-ClientClient:
   - `brandVoice String?`
   - `postingRhythm String?`
   - `portalToken String?` (ייתכן שצריך unique)
   - `plan String?`
   - `monthlyFee Decimal?`
   - `paymentStatus String?`
   - `color String?`
   - `onboardingStatus String?`
2. צור migration שמעתיקה data
3. מעביר relations: `business_metrics`, `client_dna`, `operations_projects`, `platform_credentials`, `platform_quotas` → לקשר ל-ClientClient
4. עדכן 16 code references (11 קבצים)
5. **אל תמחק את clients** — השאר כ-readonly archive

### Phase 3: מיזוג CustomerAccount לתוך ClientClient ⚠️ סיכון נמוך

**מה**: מיזוג CustomerAccount לתוך ClientClient  
**למה**: רק 4 שימושים, ישות דקה שמשמשת כ-bridge  
**השפעה**: 4 שימושים

**צעדים:**
1. הוסף ל-ClientClient:
   - `systemLeads SystemLead[]` relation
   - `misradClients MisradClient[]` relation
2. עדכן MisradClient: `clientClientId String?` (instead of customerAccountId)
3. עדכן 4 code references ב-customer-accounts.ts
4. **אל תמחק את customer_accounts** — השאר כ-readonly archive

### MisradClient — ❌ לא ממזגים

**למה**: MisradClient הוא ישות שונה מהותית — זה "פרויקט/retainer CRM" עם ~30 שדות מומחים ו-~20 relations. מיזוגו לתוך ClientClient יהרוס את ה-separation of concerns.

**במקום**: MisradClient ישאר כ-"client profile extension" שמקושר ל-ClientClient דרך `clientClientId`.

---

## סיכום: מצב יעד

```
AFTER CONSOLIDATION:

Platform Level (unchanged):
  └── BusinessClient — B2B CRM של MISRAD AI

Tenant Level:
  └── ClientClient — ⭐ THE unified client table
        ├── optional fields from NexusClient (Phase 1)
        ├── optional fields from clients/legacy (Phase 2)
        ├── direct link to SystemLead (Phase 3)
        └── link to MisradClient as "profile extension"

  └── MisradClient — stays separate, linked via clientClientId
        └── Professional services/retainer CRM extension

Archive (read-only, eventually drop):
  ├── nexus_clients
  ├── clients  
  └── customer_accounts
```

---

## סיכונים

| סיכון | סבירות | פתרון |
|--------|---------|--------|
| אובדן נתונים במיגרציה | בינוני | backup לפני כל שלב, dry-run scripts |
| שבירת portal_token unique | גבוה | ודא uniqueness לפני migration |
| Foreign key conflicts | בינוני | Migrate relations אחרי data |
| Performance regression | נמוך | אינדקסים חדשים |
| Code regressions | בינוני | Run full test suite + manual QA |

---

## עדיפות ביצוע

1. **Phase 1** (NexusClient → ClientClient) — 🟢 הכי נמוך סיכון, הכי גבוה ערך
2. **Phase 3** (CustomerAccount merge) — 🟢 רק 4 שימושים
3. **Phase 2** (clients legacy → ClientClient) — 🟡 יותר מורכב בגלל relations
