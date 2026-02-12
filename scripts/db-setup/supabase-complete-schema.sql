-- ============================================
-- MISRAD AI - Complete Supabase Schema
-- ============================================
-- Run this SQL in Supabase SQL Editor to create ALL tables
-- This script will DROP existing tables and recreate them
-- ⚠️ WARNING: This will DELETE ALL DATA! Use only for fresh setup.
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 1: DROP EXISTING TABLES (if they exist)
-- ============================================
-- Uncomment the following lines if you want to drop existing tables
-- ⚠️ THIS WILL DELETE ALL DATA!

-- DROP TABLE IF EXISTS time_entries CASCADE;
-- DROP TABLE IF EXISTS tasks CASCADE;
-- DROP TABLE IF EXISTS integrations CASCADE;
-- DROP TABLE IF EXISTS role_permissions CASCADE;
-- DROP TABLE IF EXISTS permissions CASCADE;
-- DROP TABLE IF EXISTS roles CASCADE;
-- DROP TABLE IF EXISTS clients CASCADE;
-- DROP TABLE IF EXISTS tenants CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- STEP 2: USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT,
    avatar TEXT,
    online BOOLEAN DEFAULT false,
    capacity INTEGER DEFAULT 0,
    email TEXT UNIQUE,
    phone TEXT,
    location TEXT,
    bio TEXT,
    
    -- Payroll Info
    payment_type TEXT CHECK (payment_type IN ('hourly', 'monthly')),
    hourly_rate DECIMAL(10, 2),
    monthly_salary DECIMAL(10, 2),
    
    -- Incentives & Gamification
    commission_pct INTEGER,
    bonus_per_task DECIMAL(10, 2),
    accumulated_bonus DECIMAL(10, 2) DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    weekly_score DECIMAL(5, 2),
    pending_reward JSONB,
    
    -- Targets & Preferences
    targets JSONB,
    notification_preferences JSONB,
    two_factor_enabled BOOLEAN DEFAULT false,
    is_super_admin BOOLEAN DEFAULT false,
    billing_info JSONB,
    
    -- Hierarchy & Roles (NEW)
    manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    role_id UUID, -- Will reference roles table after it's created
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 3: PERMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY, -- 'view_financials', 'manage_team', etc.
    label TEXT NOT NULL,
    description TEXT,
    category TEXT CHECK (category IN ('access', 'management', 'system')) DEFAULT 'access',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 4: ROLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_system BOOLEAN DEFAULT false, -- תפקידי מערכת (מנכ"ל, אדמין) לא ניתנים למחיקה
    permissions TEXT[] DEFAULT ARRAY[]::TEXT[], -- רשימת הרשאות (references permissions.id)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Now add foreign key for role_id in users table
ALTER TABLE users 
ADD CONSTRAINT fk_users_role_id 
FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL;

-- ============================================
-- STEP 5: CLIENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    avatar TEXT,
    package TEXT,
    status TEXT CHECK (status IN ('Active', 'Onboarding', 'Paused')) DEFAULT 'Onboarding',
    contact_person TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assets_folder_url TEXT,
    source TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 6: TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,
    priority TEXT CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    assignee_ids UUID[] DEFAULT ARRAY[]::UUID[],
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Legacy support
    creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date DATE,
    due_time TIME,
    time_spent INTEGER DEFAULT 0, -- in seconds
    estimated_time INTEGER, -- in minutes
    approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    is_timer_running BOOLEAN DEFAULT false,
    messages JSONB DEFAULT '[]'::JSONB,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    is_private BOOLEAN DEFAULT false,
    audio_url TEXT,
    snooze_count INTEGER DEFAULT 0,
    is_focus BOOLEAN DEFAULT false,
    completion_details JSONB,
    department TEXT,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 7: TIME ENTRIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    date DATE NOT NULL,
    duration_minutes INTEGER,
    
    -- Audit Trail Fields
    void_reason TEXT,
    voided_by UUID REFERENCES users(id) ON DELETE SET NULL,
    voided_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 8: TENANTS TABLE (SaaS Multi-tenancy)
-- ============================================
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    owner_email TEXT NOT NULL,
    subdomain TEXT UNIQUE NOT NULL,
    plan TEXT NOT NULL,
    status TEXT CHECK (status IN ('Active', 'Trial', 'Churned', 'Provisioning')) DEFAULT 'Provisioning',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    mrr DECIMAL(10, 2) DEFAULT 0,
    users_count INTEGER DEFAULT 0,
    logo TEXT,
    modules TEXT[] DEFAULT ARRAY[]::TEXT[],
    region TEXT CHECK (region IN ('eu-west', 'us-east', 'il-central')),
    version TEXT,
    allowed_emails TEXT[] DEFAULT ARRAY[]::TEXT[],
    require_approval BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 9: INTEGRATIONS TABLE (Google Calendar, Drive, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Service identification (matches API code)
    service_type TEXT NOT NULL CHECK (service_type IN ('google_calendar', 'google_drive', 'green_invoice', 'slack', 'whatsapp')),
    
    -- OAuth tokens (should be encrypted in production)
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_type TEXT DEFAULT 'Bearer',
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- OAuth scopes granted
    scope TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Service-specific metadata (JSON)
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Connection status
    is_active BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    sync_error TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, tenant_id, service_type) -- One integration per service per user/tenant
);

-- ============================================
-- STEP 10: INDEXES for Performance
-- ============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

-- Clients indexes
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_company_name ON clients(company_name);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_creator_id ON tasks(creator_id);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
-- GIN index for array searches (assignee_ids)
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_ids ON tasks USING GIN(assignee_ids);

-- Time entries indexes
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);
CREATE INDEX IF NOT EXISTS idx_time_entries_start_time ON time_entries(start_time);

-- Tenants indexes
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_owner_email ON tenants(owner_email);

-- Roles indexes
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

-- Integrations indexes
CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_tenant_id ON integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integrations_service_type ON integrations(service_type);
CREATE INDEX IF NOT EXISTS idx_integrations_is_active ON integrations(is_active);

-- ============================================
-- STEP 11: FUNCTIONS for Auto-updating updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- STEP 12: TRIGGERS for updated_at
-- ============================================

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 13: INSERT DEFAULT PERMISSIONS
-- ============================================
INSERT INTO permissions (id, label, description, category) VALUES
    ('view_crm', 'צפייה ב-CRM', 'גישה ללקוחות, לידים ונכסים', 'access'),
    ('view_financials', 'צפייה בנתונים פיננסיים', 'גישה לדוחות פיננסיים ושכר', 'access'),
    ('view_assets', 'צפייה בנכסים', 'גישה לנכסי תוכן וקבצים', 'access'),
    ('view_intelligence', 'צפייה במודיעין', 'גישה לדוחות וניתוחים', 'access'),
    ('manage_team', 'ניהול צוות', 'הוספה, עריכה ומחיקה של עובדים', 'management'),
    ('manage_system', 'ניהול מערכת', 'גישה להגדרות מערכת ו-SaaS Admin', 'system'),
    ('delete_data', 'מחיקת נתונים', 'מחיקת נתונים לצמיתות', 'system')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STEP 14: INSERT DEFAULT ROLES
-- ============================================
INSERT INTO roles (id, name, description, is_system, permissions) VALUES
    (uuid_generate_v4(), 'מנכ״ל', 'מנכ"ל החברה - גישה מלאה', true, ARRAY['view_financials', 'manage_team', 'manage_system', 'delete_data', 'view_intelligence', 'view_crm', 'view_assets']),
    (uuid_generate_v4(), 'אדמין', 'מנהל מערכת - גישה מלאה', true, ARRAY['view_financials', 'manage_team', 'manage_system', 'delete_data', 'view_intelligence', 'view_crm', 'view_assets']),
    (uuid_generate_v4(), 'סמנכ״ל מכירות', 'סמנכ"ל מכירות', false, ARRAY['view_financials', 'view_intelligence', 'view_crm', 'view_assets', 'manage_team']),
    (uuid_generate_v4(), 'מנהלת שיווק', 'מנהלת שיווק', false, ARRAY['manage_team', 'view_intelligence', 'view_assets', 'view_crm']),
    (uuid_generate_v4(), 'איש מכירות', 'איש מכירות', false, ARRAY['view_crm', 'view_intelligence']),
    (uuid_generate_v4(), 'מנהל אופרציה', 'מנהל אופרציה', false, ARRAY['manage_team', 'view_intelligence', 'view_assets', 'view_crm']),
    (uuid_generate_v4(), 'עובד שיווק', 'עובד שיווק', false, ARRAY['view_intelligence', 'view_assets']),
    (uuid_generate_v4(), 'אדמיניסטרציה', 'אדמיניסטרציה', false, ARRAY['view_assets', 'view_crm', 'manage_team', 'view_financials']),
    (uuid_generate_v4(), 'הנהלת חשבונות', 'הנהלת חשבונות', false, ARRAY['view_financials', 'view_assets', 'view_crm']),
    (uuid_generate_v4(), 'מנהל קהילה', 'מנהל קהילה', false, ARRAY['view_crm', 'view_intelligence']),
    (uuid_generate_v4(), 'עובד', 'עובד רגיל', false, ARRAY['view_intelligence']),
    (uuid_generate_v4(), 'פרילנסר', 'פרילנסר', false, ARRAY[]::TEXT[])
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- COMPLETED!
-- ============================================
-- All tables created successfully with proper foreign keys and indexes.
-- Default permissions and roles have been inserted.
-- You can now use the Supabase client in your application.
-- ============================================

