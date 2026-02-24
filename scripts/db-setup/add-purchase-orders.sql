-- Purchase Orders (PO) tables for Operations module
-- Safe to re-run: uses IF NOT EXISTS

CREATE TABLE IF NOT EXISTS operations_purchase_orders (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  supplier_id      UUID REFERENCES operations_suppliers(id) ON UPDATE NO ACTION,
  po_number        TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'DRAFT',
  notes            TEXT,
  total_amount     DECIMAL(12,2),
  currency         TEXT NOT NULL DEFAULT 'ILS',
  expected_delivery TIMESTAMPTZ,
  sent_at          TIMESTAMPTZ,
  received_at      TIMESTAMPTZ,
  created_by       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS operations_po_unique_number_per_org
  ON operations_purchase_orders (organization_id, po_number);
CREATE INDEX IF NOT EXISTS idx_operations_po_org
  ON operations_purchase_orders (organization_id);
CREATE INDEX IF NOT EXISTS idx_operations_po_org_status
  ON operations_purchase_orders (organization_id, status);

CREATE TABLE IF NOT EXISTS operations_purchase_order_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES operations_purchase_orders(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  item_id           UUID REFERENCES operations_items(id) ON UPDATE NO ACTION,
  description       TEXT NOT NULL,
  quantity          DECIMAL(12,3) NOT NULL,
  unit_price        DECIMAL(12,2) NOT NULL,
  total_price       DECIMAL(12,2) NOT NULL,
  received_qty      DECIMAL(12,3) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operations_po_items_po
  ON operations_purchase_order_items (purchase_order_id);
