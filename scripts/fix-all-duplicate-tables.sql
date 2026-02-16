-- Fix all duplicate columns in production DB
-- This script will drop and recreate the affected tables

BEGIN;

-- ============================================
-- 1. Fix profiles table
-- ============================================
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    clerk_user_id TEXT NOT NULL UNIQUE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    location TEXT,
    bio TEXT,
    notification_preferences JSONB DEFAULT '{}'::jsonb,
    two_factor_enabled BOOLEAN DEFAULT false,
    ui_preferences JSONB DEFAULT '{}'::jsonb,
    social_profile JSONB DEFAULT '{}'::jsonb,
    billing_info JSONB DEFAULT '{}'::jsonb,
    role TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX idx_profiles_clerk_user_id ON public.profiles(clerk_user_id);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- ============================================
-- 2. Fix organizations table (social_organizations)
-- ============================================
-- First, backup existing data
CREATE TEMP TABLE organizations_backup AS 
SELECT DISTINCT ON (id)
    id, name, slug, owner_id, logo, 
    subscription_plan, subscription_status, subscription_start_date,
    seats_allowed, trial_days, trial_start_date,
    has_nexus, has_client, has_finance, has_operations, has_social, has_system,
    ai_credits_balance_cents, partner_id,
    created_at, updated_at
FROM public.organizations
ORDER BY id, created_at DESC;

DROP TABLE IF EXISTS public.organizations CASCADE;

CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    owner_id TEXT,
    logo TEXT,
    subscription_plan TEXT DEFAULT 'solo',
    subscription_status TEXT DEFAULT 'trial',
    subscription_start_date TIMESTAMPTZ,
    seats_allowed INTEGER DEFAULT 1,
    trial_days INTEGER DEFAULT 14,
    trial_start_date TIMESTAMPTZ DEFAULT NOW(),
    has_nexus BOOLEAN DEFAULT false,
    has_client BOOLEAN DEFAULT false,
    has_finance BOOLEAN DEFAULT false,
    has_operations BOOLEAN DEFAULT false,
    has_social BOOLEAN DEFAULT false,
    has_system BOOLEAN DEFAULT true,
    ai_credits_balance_cents INTEGER DEFAULT 0,
    partner_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restore data
INSERT INTO public.organizations 
SELECT * FROM organizations_backup;

CREATE INDEX idx_organizations_slug ON public.organizations(slug);
CREATE INDEX idx_organizations_owner_id ON public.organizations(owner_id);
CREATE INDEX idx_organizations_subscription_status ON public.organizations(subscription_status);

-- ============================================
-- 3. Fix nexus_users table
-- ============================================
-- Backup existing data
CREATE TEMP TABLE nexus_users_backup AS 
SELECT DISTINCT ON (id)
    id, organization_id, name, email, phone, avatar, role, role_id,
    department, managed_department, manager_id, location, bio,
    hourly_rate, monthly_salary, payment_type, commission_pct, bonus_per_task,
    accumulated_bonus, pending_reward, capacity, targets, weekly_score, streak_days,
    online, last_seen_at, is_super_admin, two_factor_enabled,
    notification_preferences, ui_preferences, billing_info,
    created_at, updated_at
FROM public.nexus_users
ORDER BY id, created_at DESC;

DROP TABLE IF EXISTS public.nexus_users CASCADE;

CREATE TABLE public.nexus_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    avatar TEXT,
    role TEXT DEFAULT 'member',
    role_id UUID,
    department TEXT,
    managed_department TEXT,
    manager_id UUID,
    location TEXT,
    bio TEXT,
    hourly_rate NUMERIC(10,2),
    monthly_salary NUMERIC(10,2),
    payment_type TEXT DEFAULT 'monthly',
    commission_pct NUMERIC(5,2) DEFAULT 0,
    bonus_per_task NUMERIC(10,2) DEFAULT 0,
    accumulated_bonus NUMERIC(10,2) DEFAULT 0,
    pending_reward NUMERIC(10,2) DEFAULT 0,
    capacity INTEGER DEFAULT 100,
    targets JSONB DEFAULT '[]'::jsonb,
    weekly_score INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    online BOOLEAN DEFAULT false,
    last_seen_at TIMESTAMPTZ,
    is_super_admin BOOLEAN DEFAULT false,
    two_factor_enabled BOOLEAN DEFAULT false,
    notification_preferences JSONB DEFAULT '{}'::jsonb,
    ui_preferences JSONB DEFAULT '{}'::jsonb,
    billing_info JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restore data
INSERT INTO public.nexus_users 
SELECT * FROM nexus_users_backup;

CREATE INDEX idx_nexus_users_organization_id ON public.nexus_users(organization_id);
CREATE INDEX idx_nexus_users_email ON public.nexus_users(email);
CREATE INDEX idx_nexus_users_role ON public.nexus_users(role);
CREATE INDEX idx_nexus_users_department ON public.nexus_users(department);

-- ============================================
-- 4. Add missing column to organization_users
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_users' 
        AND column_name = 'last_location_org'
    ) THEN
        ALTER TABLE public.organization_users 
        ADD COLUMN last_location_org TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_organization_users_last_location_org 
ON public.organization_users(last_location_org);

COMMIT;

-- Verify fix
SELECT 
    'profiles' as table_name,
    COUNT(DISTINCT column_name) as unique_columns,
    COUNT(*) as total_columns
FROM information_schema.columns 
WHERE table_name = 'profiles'
UNION ALL
SELECT 
    'organizations',
    COUNT(DISTINCT column_name),
    COUNT(*)
FROM information_schema.columns 
WHERE table_name = 'organizations'
UNION ALL
SELECT 
    'nexus_users',
    COUNT(DISTINCT column_name),
    COUNT(*)
FROM information_schema.columns 
WHERE table_name = 'nexus_users';
