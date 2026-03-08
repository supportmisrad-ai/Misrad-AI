-- Migration: Social Agency Features
-- Add Marketing Strategy storage + update pricing fields
-- Date: 2026-03-08

-- 1. Create Marketing Strategy table
CREATE TABLE IF NOT EXISTS client_marketing_strategy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
    strategy_data JSONB NOT NULL,
    profile_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_client_marketing_strategy_client 
        FOREIGN KEY (client_id) 
        REFERENCES clients(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_client_marketing_strategy_org 
        FOREIGN KEY (organization_id) 
        REFERENCES "Organization"(id) 
        ON DELETE CASCADE
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_client_marketing_strategy_client 
    ON client_marketing_strategy(client_id);
    
CREATE INDEX IF NOT EXISTS idx_client_marketing_strategy_org 
    ON client_marketing_strategy(organization_id);

-- 2. Update social_plan default (already exists from previous migration)
-- ALTER TABLE "Organization" ALTER COLUMN social_plan SET DEFAULT 'solo';

-- 3. Comments for documentation
COMMENT ON TABLE client_marketing_strategy IS 'AI-generated marketing strategies for clients in Social module';
COMMENT ON COLUMN client_marketing_strategy.strategy_data IS 'Full marketing strategy JSON (content pillars, calendar, etc)';
COMMENT ON COLUMN client_marketing_strategy.profile_data IS 'Client profile used to generate strategy';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Social Agency Features migration completed successfully';
END $$;
