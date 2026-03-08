-- Add Global Promotion System
-- Allows admin to create a single active promotion that appears on all signup/pricing pages
-- with deadline and FOMO messaging

CREATE TABLE IF NOT EXISTS global_promotion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Promotion Details
  title VARCHAR(255) NOT NULL,                    -- e.g., "🔥 הנחת השקה מטורפת!"
  subtitle TEXT,                                  -- e.g., "קבל 50% הנחה על 3 החודשים הראשונים"
  discount_percent INTEGER,                       -- e.g., 50
  discount_amount_cents INTEGER,                  -- Alternative: fixed discount in cents
  
  -- Display Settings
  badge_text VARCHAR(100),                        -- e.g., "⚡ מבצע בזק"
  cta_text VARCHAR(100),                          -- e.g., "תפוס את ההזדמנות"
  urgency_message TEXT,                           -- e.g., "נותרו רק 48 שעות!"
  
  -- Timing
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,                -- Deadline for promotion
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_on_signup BOOLEAN NOT NULL DEFAULT true,
  display_on_pricing BOOLEAN NOT NULL DEFAULT true,
  
  -- Coupon Integration
  coupon_code VARCHAR(50),                        -- Optional: linked coupon code
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_clerk_id VARCHAR(255),
  
  -- Constraints
  CONSTRAINT valid_discount CHECK (
    (discount_percent IS NOT NULL AND discount_percent BETWEEN 1 AND 100) OR
    (discount_amount_cents IS NOT NULL AND discount_amount_cents > 0)
  ),
  CONSTRAINT valid_dates CHECK (expires_at > starts_at)
);

-- Only one active promotion at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_global_promotion_active ON global_promotion(is_active) WHERE is_active = true;

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_global_promotion_expires_at ON global_promotion(expires_at);
CREATE INDEX IF NOT EXISTS idx_global_promotion_active_dates ON global_promotion(is_active, starts_at, expires_at);

-- Comments
COMMENT ON TABLE global_promotion IS 'Global promotional campaigns that appear on signup and pricing pages with FOMO messaging';
COMMENT ON COLUMN global_promotion.title IS 'Main headline for the promotion (Hebrew)';
COMMENT ON COLUMN global_promotion.expires_at IS 'Promotion deadline - creates urgency';
COMMENT ON COLUMN global_promotion.urgency_message IS 'FOMO message like "Only 24 hours left!"';
COMMENT ON COLUMN global_promotion.is_active IS 'Only one promotion can be active at a time (enforced by unique index)';
