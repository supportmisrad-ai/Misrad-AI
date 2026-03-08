-- Cross-Module Client Links Migration
-- Adds optional client_client_id FK to clients (Social) and misrad_clients (Finance)
-- This makes ClientClient the master record, enabling cross-module client visibility
-- Safe: all columns are nullable, no data is deleted or modified

-- 1. Social clients table: add FK to ClientClient master
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_client_id uuid REFERENCES client_clients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_clients_client_client_id ON clients(client_client_id);

-- 2. Finance clients table: add FK to ClientClient master
ALTER TABLE misrad_clients ADD COLUMN IF NOT EXISTS client_client_id uuid REFERENCES client_clients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_misrad_clients_client_client_id ON misrad_clients(client_client_id);
