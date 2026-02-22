-- ai_periodic_reports: stores AI-generated periodic reports (monthly/quarterly/annual)
-- Scoped per organization + user. Never cross-references orgs.

CREATE TABLE IF NOT EXISTS ai_periodic_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id         TEXT,                -- clerk user id (NULL = org-wide report)
  report_type     TEXT NOT NULL,       -- 'monthly' | 'quarterly' | 'semi_annual' | 'annual'
  period_label    TEXT NOT NULL,       -- e.g. '2026-02', '2026-Q1', '2026-H1', '2026'
  role_scope      TEXT NOT NULL DEFAULT 'admin', -- 'admin' | 'employee'
  
  -- Snapshot data (raw JSON from cross-module-aggregator)
  snapshot        JSONB NOT NULL DEFAULT '{}',
  
  -- AI-generated content
  ai_summary      TEXT,
  ai_insights     JSONB DEFAULT '[]',  -- [{title, description, severity, actionItem}]
  ai_score        INTEGER,             -- 0-100 health score
  ai_recommendations JSONB DEFAULT '[]', -- [{title, description, priority}]
  
  -- Truth enforcement
  data_sources    JSONB DEFAULT '[]',  -- list of tables/queries used
  generated_by    TEXT DEFAULT 'system', -- 'system' | 'manual'
  
  -- Metadata
  is_read         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_periodic_reports_org ON ai_periodic_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_periodic_reports_user ON ai_periodic_reports(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ai_periodic_reports_period ON ai_periodic_reports(organization_id, report_type, period_label);
