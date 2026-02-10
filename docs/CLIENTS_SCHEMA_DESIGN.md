# 🏢 Clients Schema - B2B Enterprise Model

**תאריך:** 10 פברואר 2026  
**מטרה:** מודל מקצועי לניהול לקוחות עסקיים (B2B SaaS)

---

## 🎯 המודל המלא

```
┌─────────────────┐
│    CLIENTS      │  ← לקוח עסקי (חברה/ארגון עסקי)
│  (טבלה חדשה)    │
└────────┬────────┘
         │
         ├─────────► Organizations (1:N)
         │           לקוח יכול להיות בעלים של מספר ארגונים
         │
         └─────────► Client Contacts (N:M)
                     אנשי קשר (organization_users) של הלקוח
```

---

## 📋 טבלת `clients`

```sql
CREATE TABLE clients (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Business Info (חובה)
  company_name VARCHAR(255) NOT NULL,
  company_name_en VARCHAR(255), -- שם באנגלית
  
  -- Legal & Tax
  business_number VARCHAR(50), -- מספר עוסק מורשה / ח.ป
  tax_id VARCHAR(50), -- מס' זהוי מס
  legal_entity_type VARCHAR(50), -- עוסק מורשה, חברה בע"מ, עמותה...
  
  -- Contact Info
  primary_email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50),
  website VARCHAR(255),
  
  -- Address
  address_street VARCHAR(255),
  address_city VARCHAR(100),
  address_state VARCHAR(100),
  address_postal_code VARCHAR(20),
  address_country VARCHAR(100) DEFAULT 'ישראל',
  
  -- Billing Info
  billing_email VARCHAR(255),
  billing_contact_name VARCHAR(255),
  billing_address_street VARCHAR(255),
  billing_address_city VARCHAR(100),
  billing_address_postal_code VARCHAR(20),
  
  -- Business Details
  industry VARCHAR(100), -- תחום עיסוק
  company_size VARCHAR(50), -- 1-10, 11-50, 51-200...
  annual_revenue_range VARCHAR(50), -- טווח הכנסות שנתיות
  
  -- CRM Fields
  lead_source VARCHAR(100), -- מאיפה הגיע הלקוח
  account_manager_id UUID, -- מי מנהל את הלקוח
  sales_rep_id UUID, -- איש מכירות
  
  -- Status & Lifecycle
  status VARCHAR(50) DEFAULT 'active', -- active, inactive, suspended, churned
  lifecycle_stage VARCHAR(50) DEFAULT 'customer', -- lead, prospect, customer, churned
  
  -- Financial
  total_revenue_lifetime DECIMAL(15,2) DEFAULT 0,
  mrr DECIMAL(10,2) DEFAULT 0, -- Monthly Recurring Revenue
  arr DECIMAL(10,2) DEFAULT 0, -- Annual Recurring Revenue
  
  -- Dates
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  first_purchase_date TIMESTAMPTZ,
  last_purchase_date TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT, -- הערות
  tags TEXT[], -- תגיות
  custom_fields JSONB, -- שדות מותאמים אישית
  
  -- Soft Delete
  deleted_at TIMESTAMPTZ,
  
  -- Indexes
  CONSTRAINT clients_email_unique UNIQUE (primary_email),
  CONSTRAINT clients_business_number_unique UNIQUE (business_number)
);

-- Indexes
CREATE INDEX idx_clients_company_name ON clients(company_name);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_lifecycle_stage ON clients(lifecycle_stage);
CREATE INDEX idx_clients_created_at ON clients(created_at);
CREATE INDEX idx_clients_deleted_at ON clients(deleted_at) WHERE deleted_at IS NULL;
```

---

## 📋 טבלת `client_contacts`

```sql
CREATE TABLE client_contacts (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Foreign Keys
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES organization_users(id) ON DELETE CASCADE,
  
  -- Contact Role
  role VARCHAR(50) DEFAULT 'contact', -- primary, billing, technical, contact
  title VARCHAR(100), -- תפקיד בחברה
  department VARCHAR(100), -- מחלקה
  
  -- Status
  is_primary BOOLEAN DEFAULT FALSE,
  is_billing_contact BOOLEAN DEFAULT FALSE,
  is_technical_contact BOOLEAN DEFAULT FALSE,
  
  -- Dates
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT client_contacts_unique UNIQUE (client_id, user_id)
);

-- Indexes
CREATE INDEX idx_client_contacts_client_id ON client_contacts(client_id);
CREATE INDEX idx_client_contacts_user_id ON client_contacts(user_id);
CREATE INDEX idx_client_contacts_is_primary ON client_contacts(is_primary) WHERE is_primary = TRUE;
```

---

## 📋 עדכון טבלת `organizations`

```sql
-- הוספת client_id לטבלת organizations
ALTER TABLE organizations 
ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Index
CREATE INDEX idx_organizations_client_id ON organizations(client_id);

-- לקוח יכול להיות בעלים של מספר ארגונים
-- ארגון שייך ללקוח אחד בלבד (או לאף אחד - למשתמשים פרטיים)
```

---

## 🔄 Flow יצירת לקוח חדש

### תרחיש 1: לקוח חדש (B2B)
```
1. Admin יוצר Client
   ├── שם חברה: "חברת ABC בע"מ"
   ├── מס' עוסק: 123456789
   ├── מייל: info@abc.co.il
   └── ללא Contacts וללא Organizations
   
2. Admin מוסיף Contact (איש קשר)
   ├── יוצר/מחפש User קיים
   ├── מקשר User ← → Client
   └── מגדיר תפקיד: Primary Contact
   
3. Admin/Contact יוצר Organization
   ├── שם: "מחלקת שיווק - ABC"
   ├── client_id: → Client
   └── הארגון שייך ללקוח
```

### תרחיש 2: לקוח פרטי (B2C)
```
1. משתמש נרשם
   ├── יוצר User
   └── ללא Client (משתמש פרטי)
   
2. משתמש יוצר Organization
   ├── שם: "הארגון שלי"
   ├── client_id: NULL (ארגון פרטי)
   └── owner_id: → User
```

---

## 🔑 מפתח קשרים

```
Client (חברת ABC)
  │
  ├─► Contacts (אנשי קשר)
  │    ├─ יוסי כהן (Primary)
  │    ├─ שרה לוי (Billing)
  │    └─ דני ישראלי (Technical)
  │
  └─► Organizations (ארגונים)
       ├─ מחלקת שיווק - ABC
       ├─ מחלקת פיתוח - ABC
       └─ סניף תל אביב - ABC
```

---

## 📊 דוגמאות שימוש

### יצירת לקוח חדש
```typescript
const client = await prisma.client.create({
  data: {
    company_name: "חברת ABC בע\"מ",
    business_number: "123456789",
    primary_email: "info@abc.co.il",
    phone: "03-1234567",
    industry: "Technology",
    company_size: "51-200",
    lifecycle_stage: "customer",
    status: "active"
  }
});
```

### הוספת איש קשר ללקוח
```typescript
const contact = await prisma.client_contact.create({
  data: {
    client_id: client.id,
    user_id: existingUser.id,
    role: "primary",
    title: "CTO",
    is_primary: true
  }
});
```

### יצירת ארגון ללקוח
```typescript
const org = await prisma.organization.create({
  data: {
    name: "מחלקת שיווק - ABC",
    slug: "abc-marketing",
    client_id: client.id,
    owner_id: primaryContact.id,
    // ... rest of fields
  }
});
```

### שאילתה: כל הארגונים של לקוח
```typescript
const clientWithOrgs = await prisma.client.findUnique({
  where: { id: clientId },
  include: {
    organizations: true,
    contacts: {
      include: {
        user: true
      }
    }
  }
});
```

---

## 🎯 יתרונות המודל

### עסקיים:
✅ **הפרדה ברורה** - לקוח (חברה) ≠ משתמש (אדם)  
✅ **ניהול מורכב** - חברה אחת, מספר אנשי קשר  
✅ **Billing מדויק** - חיוב ללקוח, לא למשתמש  
✅ **CRM מלא** - lead source, account manager, lifecycle  
✅ **Reporting** - MRR, ARR, LTV per client  

### טכניים:
✅ **Scalable** - תומך בארגונים גדולים  
✅ **Flexible** - תומך גם ב-B2C (client_id = NULL)  
✅ **Data Integrity** - Foreign Keys, Constraints  
✅ **Audit Trail** - created_at, updated_at, deleted_at  

---

## 🚀 Migration Plan

### שלב 1: יצירת טבלאות
```sql
1. CREATE TABLE clients
2. CREATE TABLE client_contacts
3. ALTER TABLE organizations ADD client_id
```

### שלב 2: מיגרציית נתונים קיימים
```sql
-- Option A: המר כל owner ללקוח
INSERT INTO clients (company_name, primary_email, created_at)
SELECT full_name, email, created_at
FROM organization_users
WHERE role = 'owner';

-- Option B: השאר owners כמו שהם (B2C)
-- רק Admin יצור Clients ידנית (B2B)
```

### שלב 3: עדכון Prisma Schema
```prisma
model Client {
  id                   String              @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  company_name         String
  primary_email        String              @unique
  business_number      String?             @unique
  // ... all fields
  
  organizations        Organization[]      @relation("ClientOrganizations")
  contacts             ClientContact[]
  
  @@map("clients")
}

model ClientContact {
  id                   String              @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  client_id            String              @db.Uuid
  user_id              String              @db.Uuid
  role                 String              @default("contact")
  is_primary           Boolean             @default(false)
  
  client               Client              @relation(fields: [client_id], references: [id], onDelete: Cascade)
  user                 OrganizationUser    @relation(fields: [user_id], references: [id], onDelete: Cascade)
  
  @@unique([client_id, user_id])
  @@map("client_contacts")
}
```

### שלב 4: עדכון קוד
- Server Actions
- Modals
- Dashboards
- Reports

---

## 📝 TODO List

- [ ] יצירת Migration SQL
- [ ] עדכון Prisma Schema
- [ ] יצירת Server Actions ל-Clients
- [ ] Modal ליצירת Client
- [ ] Modal להוספת Contact
- [ ] Modal ליצירת Organization עם Client
- [ ] עדכון Customers Dashboard
- [ ] Client Profile Page
- [ ] עדכון flow הרשמה
- [ ] Documentation

---

**הערה חשובה:** מודל זה תומך ב-**hybrid approach**:
- B2B: Client → Organizations
- B2C: User → Organizations (ללא Client)

זה מאפשר גמישות מקסימלית! 🎯
