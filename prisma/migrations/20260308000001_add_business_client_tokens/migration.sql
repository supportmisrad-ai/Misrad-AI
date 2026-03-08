-- Add Business Client Tokens table for Magic Link authentication
-- This allows business clients to securely access their invoices via magic links

CREATE TABLE IF NOT EXISTS business_client_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token VARCHAR(255) NOT NULL UNIQUE,
  business_client_id UUID NOT NULL REFERENCES business_clients(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  
  CONSTRAINT business_client_tokens_token_unique UNIQUE (token)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_client_tokens_token ON business_client_tokens(token);
CREATE INDEX IF NOT EXISTS idx_business_client_tokens_business_client_id ON business_client_tokens(business_client_id);
CREATE INDEX IF NOT EXISTS idx_business_client_tokens_expires_at ON business_client_tokens(expires_at);

-- Comment
COMMENT ON TABLE business_client_tokens IS 'Magic link tokens for business client portal access';
COMMENT ON COLUMN business_client_tokens.token IS 'Secure random token for magic link authentication';
COMMENT ON COLUMN business_client_tokens.expires_at IS 'Token expiration time (7 days from creation)';
COMMENT ON COLUMN business_client_tokens.last_used_at IS 'Last time this token was used for authentication';
