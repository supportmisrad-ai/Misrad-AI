-- Create API Keys table for public endpoints
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  rate_limit_per_minute INTEGER DEFAULT 10,
  allowed_endpoints TEXT[] DEFAULT ARRAY['public_leads'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS api_rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER DEFAULT 1,
  expires_at TIMESTAMPTZ NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_expires ON api_rate_limits(expires_at);

-- Insert example key (replace with your own secure key!)
INSERT INTO api_keys (name, key, is_active, rate_limit_per_minute, allowed_endpoints)
VALUES (
  'Public Leads API',
  'REPLACE_WITH_YOUR_SECRET_KEY_32_CHARS_MIN',
  true,
  10,
  ARRAY['public_leads']
)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE api_keys IS 'API keys for public endpoints authentication';
COMMENT ON TABLE api_rate_limits IS 'Rate limiting tracking for API requests';
