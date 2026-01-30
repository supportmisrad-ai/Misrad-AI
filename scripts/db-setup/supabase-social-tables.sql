-- ============================================
-- Nexus OS / Scale CRM - Social Module Tables
-- ============================================

-- ============================================
-- SOCIAL POSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS social_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT,
    platform TEXT NOT NULL CHECK (platform IN ('Facebook', 'Instagram', 'LinkedIn', 'TikTok', 'Twitter', 'YouTube', 'Pinterest', 'Google My Business', 'Website', 'Newsletter', 'Other')),
    status TEXT NOT NULL CHECK (status IN ('Draft', 'Scheduled', 'Published', 'Pending Approval', 'Rejected')),
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    scheduled_date TIMESTAMP WITH TIME ZONE,
    published_date TIMESTAMP WITH TIME ZONE,
    
    -- Media
    media_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
    thumbnail_url TEXT,
    
    -- Metrics
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    clicks_count INTEGER DEFAULT 0,
    reach_count INTEGER DEFAULT 0,
    
    -- Content details
    hashtags TEXT[] DEFAULT ARRAY[]::TEXT[],
    mentions TEXT[] DEFAULT ARRAY[]::TEXT[],
    location TEXT,
    
    -- Approval workflow
    approval_notes TEXT,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SOCIAL TASKS TABLE (Extension of tasks)
-- ============================================
-- Note: We'll use the main 'tasks' table, but this view helps filter social tasks
CREATE OR REPLACE VIEW social_tasks AS
SELECT * FROM tasks WHERE department = 'social' OR 'social' = ANY(tags);

-- ============================================
-- CLIENT REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS client_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    requestor_id UUID, -- Can be external user or linked user
    requestor_name TEXT,
    requestor_email TEXT,
    
    title TEXT NOT NULL,
    description TEXT,
    type TEXT CHECK (type IN ('Post Idea', 'Revision', 'Approval', 'Question', 'Other')),
    status TEXT CHECK (status IN ('New', 'In Progress', 'Resolved', 'Closed')) DEFAULT 'New',
    priority TEXT CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')) DEFAULT 'Medium',
    
    attachments TEXT[] DEFAULT ARRAY[]::TEXT[],
    related_post_id UUID REFERENCES social_posts(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- MANAGER REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS manager_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_id UUID REFERENCES users(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    title TEXT NOT NULL,
    description TEXT,
    type TEXT CHECK (type IN ('Task Assignment', 'Feedback', 'Approval Request', 'Resource Request', 'Other')),
    status TEXT CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Completed')) DEFAULT 'Pending',
    priority TEXT CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')) DEFAULT 'Medium',
    
    due_date TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- IDEAS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ideas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    status TEXT CHECK (status IN ('New', 'Review', 'Approved', 'Rejected', 'Converted')) DEFAULT 'New',
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    platforms TEXT[] DEFAULT ARRAY[]::TEXT[], -- Targeted platforms
    
    -- AI generated metadata
    ai_score INTEGER,
    ai_feedback TEXT,
    
    converted_post_id UUID REFERENCES social_posts(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CONVERSATIONS TABLE (Inbox)
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    external_id TEXT, -- ID from the platform (e.g. FB message ID)
    
    participant_name TEXT,
    participant_avatar TEXT,
    
    last_message_text TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    is_read BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status TEXT CHECK (status IN ('Open', 'Closed', 'Pending')) DEFAULT 'Open',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages within conversations
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_type TEXT CHECK (sender_type IN ('User', 'Client', 'Contact')),
    sender_id UUID, -- If User, link to users table
    
    content TEXT,
    attachments TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    external_id TEXT,
    is_internal_note BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE TRIGGER update_social_posts_updated_at BEFORE UPDATE ON social_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_requests_updated_at BEFORE UPDATE ON client_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manager_requests_updated_at BEFORE UPDATE ON manager_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ideas_updated_at BEFORE UPDATE ON ideas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- USERS TABLE COMPATIBILITY UPDATES
-- Align users table with Server Actions expectations
-- ============================================
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;

-- Ensure uniqueness for Clerk mapping
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_clerk_user_id ON users(clerk_user_id);

ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Provide default role to avoid NOT NULL insert failures
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users ALTER COLUMN role SET DEFAULT 'team_member';
  END IF;
END $$;
