-- Operations Contractor Tokens Table
-- Stores temporary access tokens for contractors to view their work orders via portal
-- Token is hashed for security, expires automatically

CREATE TABLE IF NOT EXISTS operations_contractor_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  token_hash text NOT NULL,
  contractor_label text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_contractor_tokens_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Index for fast token lookup (by hash)
CREATE INDEX IF NOT EXISTS idx_operations_contractor_tokens_hash ON operations_contractor_tokens(token_hash);

-- Index for expiration cleanup queries
CREATE INDEX IF NOT EXISTS idx_operations_contractor_tokens_expires ON operations_contractor_tokens(expires_at);

-- Index for organization queries
CREATE INDEX IF NOT EXISTS idx_operations_contractor_tokens_org ON operations_contractor_tokens(organization_id);
