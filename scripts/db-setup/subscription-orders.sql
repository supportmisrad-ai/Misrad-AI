-- ============================================
-- Subscription Orders (Manual Bit flow)
-- ============================================

CREATE TABLE IF NOT EXISTS subscription_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    clerk_user_id TEXT,
    social_user_id UUID,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

    package_type TEXT,
    plan_key TEXT,
    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),

    amount DECIMAL(10,2) DEFAULT 0,
    currency TEXT DEFAULT 'ILS',

    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    payment_method TEXT NOT NULL DEFAULT 'bit',

    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,

    bit_reference TEXT,
    bit_payment_link TEXT,
    bit_qr_url TEXT,

    created_at TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE IF EXISTS subscription_orders ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS subscription_orders FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_orders_owner_read ON subscription_orders;
CREATE POLICY subscription_orders_owner_read
ON subscription_orders
FOR SELECT
USING (
  coalesce((auth.jwt() ->> 'sub'), '') <> ''
  AND clerk_user_id = (auth.jwt() ->> 'sub')
);

DROP POLICY IF EXISTS subscription_orders_owner_insert ON subscription_orders;
CREATE POLICY subscription_orders_owner_insert
ON subscription_orders
FOR INSERT
WITH CHECK (
  coalesce((auth.jwt() ->> 'sub'), '') <> ''
  AND clerk_user_id = (auth.jwt() ->> 'sub')
);

DROP POLICY IF EXISTS subscription_orders_owner_update ON subscription_orders;
CREATE POLICY subscription_orders_owner_update
ON subscription_orders
FOR UPDATE
USING (
  coalesce((auth.jwt() ->> 'sub'), '') <> ''
  AND clerk_user_id = (auth.jwt() ->> 'sub')
)
WITH CHECK (
  coalesce((auth.jwt() ->> 'sub'), '') <> ''
  AND clerk_user_id = (auth.jwt() ->> 'sub')
);

-- Social user support (if authenticated via Supabase auth)
DROP POLICY IF EXISTS subscription_orders_social_owner_read ON subscription_orders;
CREATE POLICY subscription_orders_social_owner_read
ON subscription_orders
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND social_user_id = auth.uid()
);

DROP POLICY IF EXISTS subscription_orders_social_owner_insert ON subscription_orders;
CREATE POLICY subscription_orders_social_owner_insert
ON subscription_orders
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND social_user_id = auth.uid()
);

DROP POLICY IF EXISTS subscription_orders_social_owner_update ON subscription_orders;
CREATE POLICY subscription_orders_social_owner_update
ON subscription_orders
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND social_user_id = auth.uid()
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND social_user_id = auth.uid()
);

-- Admin override: super admin can see and manage all orders
DROP POLICY IF EXISTS subscription_orders_super_admin_all ON subscription_orders;
CREATE POLICY subscription_orders_super_admin_all
ON subscription_orders
FOR ALL
USING (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true)
WITH CHECK (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true);

CREATE INDEX IF NOT EXISTS idx_subscription_orders_status ON subscription_orders(status);
CREATE INDEX IF NOT EXISTS idx_subscription_orders_org_id ON subscription_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscription_orders_social_user_id ON subscription_orders(social_user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_orders_clerk_user_id ON subscription_orders(clerk_user_id);

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
      WHERE tgname = 'update_subscription_orders_updated_at'
    ) THEN
      CREATE TRIGGER update_subscription_orders_updated_at
      BEFORE UPDATE ON subscription_orders
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END IF;
END $$;
