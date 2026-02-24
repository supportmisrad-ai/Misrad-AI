-- AI Credit Functions
-- These functions are called by AIService.reserveCredits / AIService.adjustCredits
-- to debit/adjust AI usage credits for an organization.
--
-- Prerequisites: Organization table must have an `ai_credits_cents` column (integer, default 0).
-- If the column doesn't exist yet, run:
--   ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS ai_credits_cents INTEGER NOT NULL DEFAULT 0;

-- ai_debit_credits: deducts credits from an organization's balance.
-- Throws if insufficient credits.
CREATE OR REPLACE FUNCTION ai_debit_credits(
  p_organization_id UUID,
  p_amount_cents INT
) RETURNS VOID AS $$
BEGIN
  IF p_amount_cents <= 0 THEN
    RETURN;
  END IF;

  UPDATE "Organization"
  SET ai_credits_cents = ai_credits_cents - p_amount_cents
  WHERE id = p_organization_id
    AND ai_credits_cents >= p_amount_cents;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient AI credits for organization %', p_organization_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ai_adjust_credits: adjusts (refunds or adds) credits to an organization's balance.
CREATE OR REPLACE FUNCTION ai_adjust_credits(
  p_organization_id UUID,
  p_delta_cents INT
) RETURNS VOID AS $$
BEGIN
  IF p_delta_cents = 0 THEN
    RETURN;
  END IF;

  UPDATE "Organization"
  SET ai_credits_cents = ai_credits_cents + p_delta_cents
  WHERE id = p_organization_id;
END;
$$ LANGUAGE plpgsql;
