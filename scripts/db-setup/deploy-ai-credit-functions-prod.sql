-- ============================================================
-- PRODUCTION DEPLOYMENT: AI Credit Functions
-- Target: Supabase PROD (aws-1-ap-northeast-2 - Korea)
-- 
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- Make sure you're connected to the PRODUCTION project, NOT dev!
-- ============================================================

-- Step 1: Verify we're on the right database
-- You should see the Organization table with ai_credits_balance_cents column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Organization' 
  AND column_name = 'ai_credits_balance_cents';

-- Step 2: Create/update the debit function
CREATE OR REPLACE FUNCTION ai_debit_credits(
  p_organization_id UUID,
  p_amount_cents BIGINT
) RETURNS VOID AS $$
BEGIN
  IF p_amount_cents <= 0 THEN
    RETURN;
  END IF;

  UPDATE "Organization"
  SET ai_credits_balance_cents = ai_credits_balance_cents - p_amount_cents
  WHERE id = p_organization_id
    AND ai_credits_balance_cents >= p_amount_cents;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient AI credits for organization %', p_organization_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create/update the adjust function  
CREATE OR REPLACE FUNCTION ai_adjust_credits(
  p_organization_id UUID,
  p_delta_cents BIGINT
) RETURNS VOID AS $$
BEGIN
  IF p_delta_cents = 0 THEN
    RETURN;
  END IF;

  UPDATE "Organization"
  SET ai_credits_balance_cents = ai_credits_balance_cents + p_delta_cents
  WHERE id = p_organization_id;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Verify functions were created
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name IN ('ai_debit_credits', 'ai_adjust_credits')
  AND routine_schema = 'public';

-- Step 5: Set initial credits for Misrad AI HQ (the_empire = 25,000 cents)
-- Only run this if balance is currently 0
UPDATE "Organization"
SET ai_credits_balance_cents = 25000
WHERE slug = 'misrad-ai-hq'
  AND ai_credits_balance_cents = 0;

-- Step 6: Verify
SELECT id, name, slug, subscription_plan, subscription_status, ai_credits_balance_cents
FROM "Organization"
WHERE subscription_status IN ('active', 'trial')
ORDER BY name;
