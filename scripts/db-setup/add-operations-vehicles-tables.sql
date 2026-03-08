-- Create operations_vehicles and operations_technician_vehicle_assignments tables
-- These tables are referenced by the Operations module vehicle management features.

CREATE TABLE IF NOT EXISTS operations_vehicles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operations_vehicles_org
  ON operations_vehicles (organization_id);

CREATE TABLE IF NOT EXISTS operations_technician_vehicle_assignments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  technician_id   UUID NOT NULL,
  vehicle_id      UUID NOT NULL REFERENCES operations_vehicles(id) ON DELETE CASCADE,
  active          BOOLEAN NOT NULL DEFAULT true,
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operations_tech_vehicle_org
  ON operations_technician_vehicle_assignments (organization_id);

CREATE INDEX IF NOT EXISTS idx_operations_tech_vehicle_tech
  ON operations_technician_vehicle_assignments (organization_id, technician_id, active);
