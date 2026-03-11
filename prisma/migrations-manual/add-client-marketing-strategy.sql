-- Add/update client_marketing_strategy table with all required columns
-- Run this on PROD database

-- Add columns if table exists, or create new table
DO $$
BEGIN
    -- Check if table exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'client_marketing_strategy') THEN
        -- Add missing columns
        ALTER TABLE client_marketing_strategy 
            ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
            ADD COLUMN IF NOT EXISTS generated_by VARCHAR(50);
        
        -- Add missing index
        CREATE INDEX IF NOT EXISTS idx_cms_client_active 
            ON client_marketing_strategy(client_id, is_active);
    ELSE
        -- Create table with all columns
        CREATE TABLE client_marketing_strategy (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            client_id UUID NOT NULL,
            organization_id UUID NOT NULL,
            strategy_data JSONB NOT NULL,
            profile_data JSONB NOT NULL,
            version INTEGER DEFAULT 1,
            is_active BOOLEAN DEFAULT true,
            generated_by VARCHAR(50),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            
            CONSTRAINT fk_cms_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
            CONSTRAINT fk_cms_org FOREIGN KEY (organization_id) REFERENCES "Organization"(id) ON DELETE CASCADE
        );
        
        CREATE INDEX idx_cms_client ON client_marketing_strategy(client_id);
        CREATE INDEX idx_cms_org ON client_marketing_strategy(organization_id);
        CREATE INDEX idx_cms_client_active ON client_marketing_strategy(client_id, is_active);
    END IF;
END $$;

COMMENT ON TABLE client_marketing_strategy IS 'AI-generated marketing strategies for Social module clients';
