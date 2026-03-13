-- Add missing operations tables

-- Create operations_locations table
CREATE TABLE IF NOT EXISTS operations_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_operations_locations_org_name UNIQUE (organization_id, name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_operations_locations_org_id ON operations_locations(organization_id);

-- Create operations_work_order_types table
CREATE TABLE IF NOT EXISTS operations_work_order_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_operations_work_order_types_org_name UNIQUE (organization_id, name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_operations_work_order_types_org_id ON operations_work_order_types(organization_id);
