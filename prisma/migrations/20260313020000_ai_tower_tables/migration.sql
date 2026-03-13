-- AI Tower - Database Migration
-- יצירת טבלאות לאבטחה ולוגים של מערכת ה-AI

-- ============================================
-- 1. טבלת לוג גישה ל-AI Tower
-- ============================================
CREATE TABLE IF NOT EXISTS ai_tower_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    email TEXT NOT NULL,
    organization_id UUID,
    action TEXT NOT NULL, -- GRANTED, DENIED, EXECUTE, VIEW
    reason TEXT NOT NULL,
    user_agent TEXT,
    ip TEXT,
    metadata JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- אינדקסים לטבלת Audit Log
CREATE INDEX idx_ai_tower_audit_user_id ON ai_tower_audit_logs(user_id, timestamp DESC);
CREATE INDEX idx_ai_tower_audit_org_id ON ai_tower_audit_logs(organization_id, timestamp DESC);
CREATE INDEX idx_ai_tower_audit_action ON ai_tower_audit_logs(action, timestamp DESC);
CREATE INDEX idx_ai_tower_audit_ip ON ai_tower_audit_logs(ip);

-- ============================================
-- 2. טבלת אירועים
-- ============================================
CREATE TABLE IF NOT EXISTS ai_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL, -- TASK_COMPLETED, INVOICE_OVERDUE, etc.
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    organization_id UUID NOT NULL,
    user_id UUID NOT NULL,
    payload JSONB NOT NULL,
    metadata JSONB,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    processed_at TIMESTAMPTZ
);

-- אינדקסים לטבלת אירועים
CREATE INDEX idx_ai_events_org_timestamp ON ai_events(organization_id, timestamp DESC);
CREATE INDEX idx_ai_events_type_processed ON ai_events(type, processed);
CREATE INDEX idx_ai_events_org_type_timestamp ON ai_events(organization_id, type, timestamp DESC);

-- ============================================
-- 3. טבלת תובנות חכמות
-- ============================================
CREATE TABLE IF NOT EXISTS ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL, -- critical, high, medium, low, info
    status TEXT NOT NULL DEFAULT 'active', -- active, resolved, dismissed, pending_action
    
    -- מקור התובנה
    rule_id TEXT NOT NULL,
    rule_name TEXT NOT NULL,
    related_event_ids UUID[] DEFAULT '{}',
    
    -- קשר לישות
    entity_id UUID,
    entity_type TEXT, -- client, user, task, project, invoice, booking
    
    -- פעולה מומלצת
    suggested_action_type TEXT,
    suggested_action_label TEXT,
    suggested_action_params JSONB,
    requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- מטה-דאטה
    metadata JSONB,
    
    -- זמנים
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID,
    
    -- מי יכול לראות
    visible_to_roles TEXT[] DEFAULT '{}'
);

-- אינדקסים לטבלת תובנות
CREATE INDEX idx_ai_insights_org_status ON ai_insights(organization_id, status);
CREATE INDEX idx_ai_insights_org_severity_created ON ai_insights(organization_id, severity, created_at DESC);
CREATE INDEX idx_ai_insights_entity ON ai_insights(entity_id, entity_type);
CREATE INDEX idx_ai_insights_rule ON ai_insights(rule_id, created_at DESC);
CREATE INDEX idx_ai_insights_status_expires ON ai_insights(status, expires_at);

-- ============================================
-- 4. טבלת לוג פעולות AI
-- ============================================
CREATE TABLE IF NOT EXISTS ai_action_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    insight_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    action_type TEXT NOT NULL, -- SEND_WHATSAPP, CREATE_INVOICE, etc.
    action_params JSONB,
    
    status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, cancelled
    result JSONB,
    error TEXT,
    
    -- אישורים
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    
    -- זמנים
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    executed_at TIMESTAMPTZ
);

-- אינדקסים לטבלת פעולות
CREATE INDEX idx_ai_action_logs_insight ON ai_action_logs(insight_id);
CREATE INDEX idx_ai_action_logs_user_created ON ai_action_logs(user_id, created_at DESC);
CREATE INDEX idx_ai_action_logs_status_created ON ai_action_logs(status, created_at DESC);

-- ============================================
-- 5. טבלת הגדרות חוקי AI
-- ============================================
CREATE TABLE IF NOT EXISTS ai_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID, -- null = global rule
    
    rule_key TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    
    event_types TEXT[] NOT NULL DEFAULT '{}',
    
    conditions JSONB NOT NULL,
    action_type TEXT NOT NULL,
    action_params JSONB,
    
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    priority INT NOT NULL DEFAULT 100,
    cooldown_minutes INT NOT NULL DEFAULT 60,
    severity TEXT NOT NULL DEFAULT 'medium',
    
    visible_to_roles TEXT[] DEFAULT ARRAY['מנכ״ל', 'אדמין', 'סמנכ״ל', 'מנהל'],
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- אינדקסים לטבלת חוקים
CREATE UNIQUE INDEX idx_ai_rules_org_key ON ai_rules(organization_id, rule_key);
CREATE INDEX idx_ai_rules_org_active ON ai_rules(organization_id, is_active);
CREATE INDEX idx_ai_rules_event_types ON ai_rules USING GIN(event_types);

-- ============================================
-- 6. הגדרת RLS (Row Level Security)
-- ============================================

-- AI Tower Audit Logs - רק Super Admin יכול לראות הכל
ALTER TABLE ai_tower_audit_logs ENABLE ROW LEVEL SECURITY;

-- AI Events - רואים רק אירועים של הארגון שלך
ALTER TABLE ai_events ENABLE ROW LEVEL SECURITY;

-- AI Insights - רואים רק תובנות של הארגון שלך
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- AI Action Logs - רואים רק פעולות של הארגון שלך
ALTER TABLE ai_action_logs ENABLE ROW LEVEL SECURITY;

-- AI Rules - רואים רק חוקים של הארגון או global
ALTER TABLE ai_rules ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. הערות
-- ============================================
-- הטבלאות האלו משמשות את מערכת AI Tower (מגדל שמירה)
-- כל גישה נרשמת ב-audit_logs
-- כל אירוע נשמר ב-events
-- כל תובנה נוצרת ב-insights
-- כל פעולה נרשמת ב-action_logs

-- ============================================
-- 8. Cleanup (אם צריך לעשות migrate מחדש)
-- ============================================
-- DROP TABLE IF EXISTS ai_action_logs CASCADE;
-- DROP TABLE IF EXISTS ai_insights CASCADE;
-- DROP TABLE IF EXISTS ai_events CASCADE;
-- DROP TABLE IF EXISTS ai_tower_audit_logs CASCADE;
-- DROP TABLE IF EXISTS ai_rules CASCADE;
