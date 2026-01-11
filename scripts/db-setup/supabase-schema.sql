-- ============================================
-- Nexus OS / Scale CRM - Supabase Schema
-- ============================================
-- Run this SQL in Supabase SQL Editor to create all tables
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT,
    avatar TEXT,
    online BOOLEAN DEFAULT false,
    capacity INTEGER DEFAULT 0,
    email TEXT,
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
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CLIENTS TABLE
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
-- TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,
    priority TEXT CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    assignee_ids UUID[] DEFAULT ARRAY[]::UUID[],
    assignee_id UUID, -- Legacy support
    creator_id UUID,
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
-- TIME ENTRIES TABLE
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
-- TENANTS TABLE (SaaS Multi-tenancy)
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
-- INDEXES for Performance
-- ============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Clients indexes
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_company_name ON clients(company_name);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- Time entries indexes
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);
CREATE INDEX IF NOT EXISTS idx_time_entries_start_time ON time_entries(start_time);

-- Tenants indexes
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_owner_email ON tenants(owner_email);

-- ============================================
-- FUNCTIONS for Auto-updating updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
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

-- ============================================
-- ROW LEVEL SECURITY (RLS) - Optional
-- ============================================
-- Uncomment these if you want to enable RLS
-- Note: Service role key bypasses RLS, so API routes will work

-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Example RLS policy (adjust based on your auth system):
-- CREATE POLICY "Users can view their own data" ON users
--     FOR SELECT USING (auth.uid()::text = id::text);

-- ============================================
-- COMPLETED!
-- ============================================
-- All tables created successfully.
-- You can now use the Supabase client in your application.
-- ============================================

