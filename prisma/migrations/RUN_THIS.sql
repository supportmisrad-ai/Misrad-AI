-- 🚀 הרץ את זה בדאטאבייס אחרי שיצרת API key ב-PowerShell!
-- החלף את YOUR_ACTUAL_KEY_FROM_POWERSHELL במפתח שקיבלת

-- Create API Keys table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_expires ON api_rate_limits(expires_at);

-- 👇 החלף את המפתח כאן!
INSERT INTO api_keys (name, key, is_active, rate_limit_per_minute, allowed_endpoints)
VALUES (
  'Landing Pages API',
  '0lgPrb6OxewRGJ4SaLIv5zn1yfsCEMhW',  -- 👈 שים כאן את המפתח שיצרת!
  true,
  10,
  ARRAY['public_leads']
);

-- בדיקה שהכל עבד
SELECT name, key, is_active, rate_limit_per_minute 
FROM api_keys 
WHERE name = 'Landing Pages API';
