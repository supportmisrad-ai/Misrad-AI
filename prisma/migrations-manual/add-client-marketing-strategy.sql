-- Add client_marketing_strategy table to Prisma schema
-- This is the actual SQL that will be run

ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "social_plan" VARCHAR(20) DEFAULT 'solo';

CREATE TABLE IF NOT EXISTS client_marketing_strategy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    strategy_data JSONB NOT NULL,
    profile_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_cms_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    CONSTRAINT fk_cms_org FOREIGN KEY (organization_id) REFERENCES "Organization"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cms_client ON client_marketing_strategy(client_id);
CREATE INDEX IF NOT EXISTS idx_cms_org ON client_marketing_strategy(organization_id);

COMMENT ON TABLE client_marketing_strategy IS 'AI-generated marketing strategies for Social module clients';
