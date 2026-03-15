/*
 * Fix duplicate slug directly via SQL
 * Run this in Supabase SQL Editor for PROD database
 */

-- First, find all organizations with duplicate slug
SELECT id, name, slug, created_at
FROM organizations
WHERE slug = 'misrad-ai-hq';

-- If there are duplicates, update the newer one(s) with a unique slug
-- Replace <DUPLICATE_ID> with the actual ID of the duplicate organization
-- UPDATE organizations
-- SET slug = 'misrad-ai-hq-' || SUBSTRING(id::text, 1, 8)
-- WHERE id = '<DUPLICATE_ID>';

-- Alternative: Set NULL for the duplicate
-- UPDATE organizations
-- SET slug = NULL
-- WHERE id = '<DUPLICATE_ID>';
