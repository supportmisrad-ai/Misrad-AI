-- Add email and phone fields to partners table
ALTER TABLE partners ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS phone TEXT;
CREATE INDEX IF NOT EXISTS partners_email_idx ON partners(email);
