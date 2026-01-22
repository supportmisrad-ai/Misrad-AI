CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start TIMESTAMPTZ(6) NOT NULL,
  current_period_end TIMESTAMPTZ(6) NOT NULL,
  created_at TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

ALTER TABLE IF EXISTS subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscriptions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscriptions_super_admin_all ON subscriptions;
CREATE POLICY subscriptions_super_admin_all
ON subscriptions
FOR ALL
USING (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true)
WITH CHECK (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true);

DROP POLICY IF EXISTS subscriptions_org_member_read ON subscriptions;
CREATE POLICY subscriptions_org_member_read
ON subscriptions
FOR SELECT
USING (
  coalesce((auth.jwt() ->> 'sub'), '') <> ''
  AND EXISTS (
    SELECT 1
    FROM social_users su
    WHERE su.organization_id = subscriptions.organization_id
      AND su.clerk_user_id = (auth.jwt() ->> 'sub')
  )
);

CREATE TABLE IF NOT EXISTS subscription_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('module', 'seats')),
  module_key TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled')),
  unit_amount DECIMAL(10,2),
  currency TEXT DEFAULT 'ILS',
  start_at TIMESTAMPTZ(6),
  end_at TIMESTAMPTZ(6),
  created_at TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  CONSTRAINT subscription_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT subscription_items_module_key_required CHECK ((kind = 'module' AND module_key IS NOT NULL) OR (kind = 'seats' AND module_key IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_subscription_items_sub_id ON subscription_items(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_items_org_id ON subscription_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscription_items_kind ON subscription_items(kind);
CREATE INDEX IF NOT EXISTS idx_subscription_items_status ON subscription_items(status);

CREATE UNIQUE INDEX IF NOT EXISTS ux_subscription_items_module
  ON subscription_items(subscription_id, kind, module_key)
  WHERE kind = 'module';

CREATE UNIQUE INDEX IF NOT EXISTS ux_subscription_items_seats
  ON subscription_items(subscription_id, kind)
  WHERE kind = 'seats';

ALTER TABLE IF EXISTS subscription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscription_items FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_items_super_admin_all ON subscription_items;
CREATE POLICY subscription_items_super_admin_all
ON subscription_items
FOR ALL
USING (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true)
WITH CHECK (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true);

DROP POLICY IF EXISTS subscription_items_org_member_read ON subscription_items;
CREATE POLICY subscription_items_org_member_read
ON subscription_items
FOR SELECT
USING (
  coalesce((auth.jwt() ->> 'sub'), '') <> ''
  AND EXISTS (
    SELECT 1
    FROM social_users su
    WHERE su.organization_id = subscription_items.organization_id
      AND su.clerk_user_id = (auth.jwt() ->> 'sub')
  )
);

CREATE TABLE IF NOT EXISTS charges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'manual' CHECK (provider IN ('manual', 'credit_card', 'external')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'pending_verification', 'succeeded', 'failed', 'canceled', 'refunded')),
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'ILS',
  external_id TEXT,
  created_at TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_charges_org_id ON charges(organization_id);
CREATE INDEX IF NOT EXISTS idx_charges_sub_id ON charges(subscription_id);
CREATE INDEX IF NOT EXISTS idx_charges_status ON charges(status);

ALTER TABLE IF EXISTS charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS charges FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS charges_super_admin_all ON charges;
CREATE POLICY charges_super_admin_all
ON charges
FOR ALL
USING (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true)
WITH CHECK (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true);

DROP POLICY IF EXISTS charges_org_member_read ON charges;
CREATE POLICY charges_org_member_read
ON charges
FOR SELECT
USING (
  coalesce((auth.jwt() ->> 'sub'), '') <> ''
  AND EXISTS (
    SELECT 1
    FROM social_users su
    WHERE su.organization_id = charges.organization_id
      AND su.clerk_user_id = (auth.jwt() ->> 'sub')
  )
);

CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actor_clerk_user_id TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_billing_events_org_id ON billing_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_sub_id ON billing_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_type ON billing_events(event_type);

ALTER TABLE IF EXISTS billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS billing_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS billing_events_super_admin_all ON billing_events;
CREATE POLICY billing_events_super_admin_all
ON billing_events
FOR ALL
USING (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true)
WITH CHECK (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true);

DROP POLICY IF EXISTS billing_events_org_member_read ON billing_events;
CREATE POLICY billing_events_org_member_read
ON billing_events
FOR SELECT
USING (
  coalesce((auth.jwt() ->> 'sub'), '') <> ''
  AND EXISTS (
    SELECT 1
    FROM social_users su
    WHERE su.organization_id = billing_events.organization_id
      AND su.clerk_user_id = (auth.jwt() ->> 'sub')
  )
);

CREATE OR REPLACE FUNCTION enforce_seat_items_require_nexus() RETURNS TRIGGER AS $$
DECLARE
  has_nexus BOOLEAN;
BEGIN
  IF NEW.kind <> 'seats' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM subscription_items si
    WHERE si.subscription_id = NEW.subscription_id
      AND si.kind = 'module'
      AND si.module_key = 'nexus'
      AND si.status = 'active'
      AND (si.start_at IS NULL OR si.start_at <= NOW())
      AND (si.end_at IS NULL OR si.end_at > NOW())
  ) INTO has_nexus;

  IF NOT has_nexus THEN
    RAISE EXCEPTION 'Cannot have seats item without active nexus module in the same subscription';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'tr_enforce_seat_items_require_nexus'
  ) THEN
    CREATE TRIGGER tr_enforce_seat_items_require_nexus
    BEFORE INSERT OR UPDATE ON subscription_items
    FOR EACH ROW
    EXECUTE FUNCTION enforce_seat_items_require_nexus();
  END IF;
END $$;

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
      WHERE tgname = 'update_subscriptions_updated_at'
    ) THEN
      CREATE TRIGGER update_subscriptions_updated_at
      BEFORE UPDATE ON subscriptions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger
      WHERE tgname = 'update_subscription_items_updated_at'
    ) THEN
      CREATE TRIGGER update_subscription_items_updated_at
      BEFORE UPDATE ON subscription_items
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger
      WHERE tgname = 'update_charges_updated_at'
    ) THEN
      CREATE TRIGGER update_charges_updated_at
      BEFORE UPDATE ON charges
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END IF;
END $$;
