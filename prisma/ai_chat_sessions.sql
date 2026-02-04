-- טבלה לשמירת שיחות AI והנתונים שנאספו
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  organization_id TEXT,
  user_id TEXT,
  pathname TEXT NOT NULL,
  is_sales_mode BOOLEAN DEFAULT false,
  
  -- נתונים שנאספו על המשתמש
  detected_name TEXT,
  detected_company TEXT,
  detected_industry TEXT,
  detected_pain_points JSONB DEFAULT '[]'::jsonb,
  detected_objections JSONB DEFAULT '[]'::jsonb,
  detected_budget TEXT,
  detected_timeline TEXT,
  
  -- מטריקות השיחה
  messages_count INTEGER DEFAULT 0,
  situation_type TEXT, -- browsing/pricing_inquiry/ready_to_buy/objection/comparison/urgent/technical_support
  final_outcome TEXT, -- converted/lost/pending
  
  -- פידבק מהמשתמש
  user_rating INTEGER, -- 1-5
  user_feedback TEXT,
  helpful_yn BOOLEAN,
  
  -- מטאדאטה
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- אינדקסים
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_org ON ai_chat_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_session ON ai_chat_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_sales ON ai_chat_sessions(is_sales_mode);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_situation ON ai_chat_sessions(situation_type);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_started ON ai_chat_sessions(started_at DESC);

-- טבלה להודעות בודדות (אופציונלי - לניתוח מעמיק)
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES ai_chat_sessions(session_id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- user/assistant
  content TEXT NOT NULL,
  quick_actions JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session ON ai_chat_messages(session_id);

COMMENT ON TABLE ai_chat_sessions IS 'שיחות AI Assistant - נתונים לשיפור המערכת';
COMMENT ON TABLE ai_chat_messages IS 'הודעות בודדות בשיחות AI - לניתוח מעמיק';
