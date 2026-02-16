-- Fix duplicate columns in profiles table and add missing columns to organization_users

-- Step 1: Drop the duplicate profiles table and recreate it properly
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

-- Indexes
CREATE INDEX idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX idx_profiles_clerk_user_id ON public.profiles(clerk_user_id);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- Step 2: Add missing column to organization_users if it doesn't exist
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

-- Create index on last_location_org
CREATE INDEX IF NOT EXISTS idx_organization_users_last_location_org 
ON public.organization_users(last_location_org);

-- Step 3: Ensure organization_users has proper indexes
CREATE INDEX IF NOT EXISTS idx_organization_users_clerk_user_id 
ON public.organization_users(clerk_user_id);

CREATE INDEX IF NOT EXISTS idx_organization_users_organization_id 
ON public.organization_users(organization_id);

-- Step 4: Add RLS policies for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own profile
CREATE POLICY "Users can read own profile" ON public.profiles
    FOR SELECT
    USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Allow authenticated users to update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Allow service role to manage all profiles
CREATE POLICY "Service role can manage profiles" ON public.profiles
    USING (current_setting('role', true) = 'service_role');

COMMENT ON TABLE public.profiles IS 'User profiles linked to Clerk authentication';
