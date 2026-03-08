-- Add AI credits to organization for testing
-- Usage: Replace 'misrad-ai-hq' with your org slug

UPDATE "Organization"
SET ai_credits_balance_cents = ai_credits_balance_cents + 100000  -- Add 1000 NIS (100,000 cents)
WHERE slug = 'test-the_closer';  -- Change to your org slug

-- Verify
SELECT slug, ai_credits_balance_cents / 100.0 as balance_nis
FROM "Organization"
WHERE slug = 'test-the_closer';
