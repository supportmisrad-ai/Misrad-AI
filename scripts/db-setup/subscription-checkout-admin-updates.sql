-- ============================================
-- Subscription Checkout/Admin Updates
-- Adds: pending_verification, payment proof upload, and per-package payment config
-- ============================================

-- 1) Extend subscription_orders statuses + fields for manual verification
ALTER TABLE IF EXISTS subscription_orders
  ADD COLUMN IF NOT EXISTS pending_verification_at TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS proof_image_url TEXT,
  ADD COLUMN IF NOT EXISTS proof_image_path TEXT;

-- Expand status enum/check constraint (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'subscription_orders'
      AND constraint_type = 'CHECK'
      AND constraint_name = 'subscription_orders_status_check'
  ) THEN
    ALTER TABLE subscription_orders DROP CONSTRAINT subscription_orders_status_check;
  END IF;

  ALTER TABLE subscription_orders
    ADD CONSTRAINT subscription_orders_status_check
    CHECK (status IN ('pending', 'pending_verification', 'paid', 'cancelled'));
END $$;

-- 2) Per-package payment configuration (QR + title)
CREATE TABLE IF NOT EXISTS subscription_payment_configs (
  package_type TEXT PRIMARY KEY,
  title TEXT,
  qr_image_url TEXT,
  instructions_text TEXT,
  payment_method TEXT DEFAULT 'manual',
  external_payment_url TEXT,
  created_at TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE IF EXISTS subscription_payment_configs ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS subscription_payment_configs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_payment_configs_public_read ON subscription_payment_configs;
CREATE POLICY subscription_payment_configs_public_read
ON subscription_payment_configs
FOR SELECT
USING (true);

DROP POLICY IF EXISTS subscription_payment_configs_super_admin_write ON subscription_payment_configs;
CREATE POLICY subscription_payment_configs_super_admin_write
ON subscription_payment_configs
FOR ALL
USING (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true)
WITH CHECK (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true);

ALTER TABLE IF EXISTS subscription_payment_configs
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS external_payment_url TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'subscription_payment_configs'
      AND constraint_type = 'CHECK'
      AND constraint_name = 'subscription_payment_configs_payment_method_check'
  ) THEN
    ALTER TABLE subscription_payment_configs DROP CONSTRAINT subscription_payment_configs_payment_method_check;
  END IF;

  ALTER TABLE subscription_payment_configs
    ADD CONSTRAINT subscription_payment_configs_payment_method_check
    CHECK (payment_method IN ('manual', 'automatic'));
END $$;

CREATE INDEX IF NOT EXISTS idx_subscription_payment_configs_package_type
  ON subscription_payment_configs(package_type);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'update_updated_at_column'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger
      WHERE tgname = 'update_subscription_payment_configs_updated_at'
    ) THEN
      CREATE TRIGGER update_subscription_payment_configs_updated_at
      BEFORE UPDATE ON subscription_payment_configs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END IF;
END $$;

INSERT INTO subscription_payment_configs (package_type, title, qr_image_url, instructions_text, payment_method, external_payment_url, updated_at)
VALUES
  ('the_closer', 'תשלום (System)', NULL, 'אנא בצעו תשלום בביט לפי ההנחיות, ואז העלו צילום מסך כהוכחת תשלום.', 'manual', NULL, CURRENT_TIMESTAMP),
  ('the_authority', 'תשלום (Nexus)', NULL, 'אנא בצעו תשלום בביט לפי ההנחיות, ואז העלו צילום מסך כהוכחת תשלום.', 'manual', NULL, CURRENT_TIMESTAMP),
  ('the_mentor', 'תשלום (Client)', NULL, 'אנא בצעו תשלום בביט לפי ההנחיות, ואז העלו צילום מסך כהוכחת תשלום.', 'manual', NULL, CURRENT_TIMESTAMP)
ON CONFLICT (package_type)
DO UPDATE SET
  title = EXCLUDED.title,
  qr_image_url = EXCLUDED.qr_image_url,
  instructions_text = EXCLUDED.instructions_text,
  payment_method = COALESCE(EXCLUDED.payment_method, subscription_payment_configs.payment_method),
  external_payment_url = COALESCE(EXCLUDED.external_payment_url, subscription_payment_configs.external_payment_url),
  updated_at = CURRENT_TIMESTAMP;
