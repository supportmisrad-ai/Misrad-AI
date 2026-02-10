-- ============================================================
-- Migration: Create Clients System (B2B Enterprise Model)
-- Date: 2026-02-10
-- Description: Creates clients table, client_contacts, and updates organizations
-- ============================================================

-- ============================================================
-- PHASE 1: Create business_clients table
-- ============================================================

CREATE TABLE IF NOT EXISTS business_clients (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Business Info (Required)
  company_name VARCHAR(255) NOT NULL,
  company_name_en VARCHAR(255),
  
  -- Legal & Tax
  business_number VARCHAR(50),
  tax_id VARCHAR(50),
  legal_entity_type VARCHAR(50),
  
  -- Contact Info
  primary_email VARCHAR(255) NOT NULL,
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
  industry VARCHAR(100),
  company_size VARCHAR(50),
  annual_revenue_range VARCHAR(50),
  
  -- CRM Fields
  lead_source VARCHAR(100),
  account_manager_id UUID,
  sales_rep_id UUID,
  
  -- Status & Lifecycle
  status VARCHAR(50) DEFAULT 'active',
  lifecycle_stage VARCHAR(50) DEFAULT 'customer',
  
  -- Financial
  total_revenue_lifetime DECIMAL(15,2) DEFAULT 0,
  mrr DECIMAL(10,2) DEFAULT 0,
  arr DECIMAL(10,2) DEFAULT 0,
  
  -- Dates
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  first_purchase_date TIMESTAMPTZ,
  last_purchase_date TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,
  tags TEXT[],
  custom_fields JSONB,
  
  -- Soft Delete
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT business_clients_email_unique UNIQUE (primary_email),
  CONSTRAINT business_clients_business_number_unique UNIQUE (business_number)
);

-- ============================================================
-- PHASE 2: Create indexes for clients
-- ============================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_business_clients_company_name') THEN
    CREATE INDEX idx_business_clients_company_name ON business_clients(company_name);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_business_clients_status') THEN
    CREATE INDEX idx_business_clients_status ON business_clients(status);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_business_clients_lifecycle_stage') THEN
    CREATE INDEX idx_business_clients_lifecycle_stage ON business_clients(lifecycle_stage);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_business_clients_created_at') THEN
    CREATE INDEX idx_business_clients_created_at ON business_clients(created_at);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_business_clients_deleted_at') THEN
    CREATE INDEX idx_business_clients_deleted_at ON business_clients(deleted_at) WHERE deleted_at IS NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_business_clients_business_number') THEN
    CREATE INDEX idx_business_clients_business_number ON business_clients(business_number) WHERE business_number IS NOT NULL;
  END IF;
END $$;

-- ============================================================
-- PHASE 3: Create business_client_contacts junction table
-- ============================================================

CREATE TABLE IF NOT EXISTS business_client_contacts (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Foreign Keys
  client_id UUID NOT NULL REFERENCES business_clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES organization_users(id) ON DELETE CASCADE,
  
  -- Contact Role
  role VARCHAR(50) DEFAULT 'contact',
  title VARCHAR(100),
  department VARCHAR(100),
  
  -- Status
  is_primary BOOLEAN DEFAULT FALSE,
  is_billing_contact BOOLEAN DEFAULT FALSE,
  is_technical_contact BOOLEAN DEFAULT FALSE,
  
  -- Dates
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT business_client_contacts_unique UNIQUE (client_id, user_id)
);

-- ============================================================
-- PHASE 4: Create indexes for business_client_contacts
-- ============================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_business_client_contacts_client_id') THEN
    CREATE INDEX idx_business_client_contacts_client_id ON business_client_contacts(client_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_business_client_contacts_user_id') THEN
    CREATE INDEX idx_business_client_contacts_user_id ON business_client_contacts(user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_business_client_contacts_is_primary') THEN
    CREATE INDEX idx_business_client_contacts_is_primary ON business_client_contacts(is_primary) WHERE is_primary = TRUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_business_client_contacts_role') THEN
    CREATE INDEX idx_business_client_contacts_role ON business_client_contacts(role);
  END IF;
END $$;

-- ============================================================
-- PHASE 5: Update organizations table
-- ============================================================

-- Add client_id column to organizations (nullable - supports B2C)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE organizations 
    ADD COLUMN client_id UUID REFERENCES business_clients(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_organizations_client_id') THEN
    CREATE INDEX idx_organizations_client_id ON organizations(client_id);
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN organizations.client_id IS 'Reference to client (for B2B). NULL for personal/B2C organizations.';

-- ============================================================
-- PHASE 6: Add triggers for updated_at
-- ============================================================

-- Trigger for business_clients
CREATE OR REPLACE FUNCTION update_business_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_business_clients_updated_at
BEFORE UPDATE ON business_clients
FOR EACH ROW
EXECUTE FUNCTION update_business_clients_updated_at();

-- Trigger for business_client_contacts
CREATE OR REPLACE FUNCTION update_business_client_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_business_client_contacts_updated_at
BEFORE UPDATE ON business_client_contacts
FOR EACH ROW
EXECUTE FUNCTION update_business_client_contacts_updated_at();

-- ============================================================
-- PHASE 7: Add comments for documentation
-- ============================================================

COMMENT ON TABLE business_clients IS 'Business clients (companies) for B2B SaaS model';
COMMENT ON TABLE business_client_contacts IS 'Junction table linking business clients to their contact persons (users)';

COMMENT ON COLUMN business_clients.company_name IS 'Official company name (Hebrew)';
COMMENT ON COLUMN business_clients.business_number IS 'Israeli business registration number (עוסק מורשה / ח.ב)';
COMMENT ON COLUMN business_clients.lifecycle_stage IS 'Customer lifecycle: lead, prospect, customer, churned';
COMMENT ON COLUMN business_clients.status IS 'Account status: active, inactive, suspended, churned';
COMMENT ON COLUMN business_clients.mrr IS 'Monthly Recurring Revenue in USD/ILS';
COMMENT ON COLUMN business_clients.arr IS 'Annual Recurring Revenue in USD/ILS';

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Verify tables created
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_clients') THEN
    RAISE NOTICE 'Table business_clients created successfully';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_client_contacts') THEN
    RAISE NOTICE 'Table business_client_contacts created successfully';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'client_id'
  ) THEN
    RAISE NOTICE 'Column client_id added to organizations successfully';
  END IF;
END $$;
