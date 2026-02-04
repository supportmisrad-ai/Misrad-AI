-- טבלה לשמירת היסטוריית צ'אט עם tenant isolation מלא
CREATE TABLE IF NOT EXISTS module_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  module_key TEXT NOT NULL, -- 'nexus', 'social', 'finance', etc.
  
  -- זיהוי שיחה
  chat_session_id TEXT NOT NULL,
  title TEXT NOT NULL,
  preview TEXT,
  
  -- תוכן
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  messages_count INTEGER DEFAULT 0,
  
  -- מטאדאטה
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- אינדקס ייחודי למניעת כפילויות
  UNIQUE(organization_id, user_id, module_key, chat_session_id)
);

-- אינדקסים לביצועים + tenant isolation
CREATE INDEX IF NOT EXISTS idx_module_chat_org_user ON module_chat_history(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_module_chat_org_user_module ON module_chat_history(organization_id, user_id, module_key);
CREATE INDEX IF NOT EXISTS idx_module_chat_session ON module_chat_history(chat_session_id);
CREATE INDEX IF NOT EXISTS idx_module_chat_updated ON module_chat_history(updated_at DESC);

-- Row Level Security (RLS) לוידוא tenant isolation
ALTER TABLE module_chat_history ENABLE ROW LEVEL SECURITY;

-- פוליסי: משתמש יכול לראות רק את השיחות שלו בארגון שלו
CREATE POLICY module_chat_tenant_isolation ON module_chat_history
  FOR ALL
  USING (
    organization_id = current_setting('app.current_organization_id', true)
    AND user_id = current_setting('app.current_user_id', true)
  );

COMMENT ON TABLE module_chat_history IS 'היסטוריית צ\'אט במודולים - עם tenant isolation מלא (org+user+module)';
