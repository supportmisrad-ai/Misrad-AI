-- Migration: Add Billing & Trial Management to Organizations
-- Date: 2026-02-10 15:00:00
-- Purpose: Add comprehensive billing, coupon, and trial management fields

-- =============================================================================
-- Add Billing Fields to organizations
-- =============================================================================

-- Client ID (for B2B Enterprise)
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS client_id UUID;

COMMENT ON COLUMN organizations.client_id IS 'Reference to business_clients table for B2B accounts';

-- Active Users Count (for seat management)
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS active_users_count INT DEFAULT 0;

COMMENT ON COLUMN organizations.active_users_count IS 'Number of active users in the organization';

-- Billing Cycle
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20);

COMMENT ON COLUMN organizations.billing_cycle IS 'monthly or yearly';

-- Billing Email (for invoices)
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255);

COMMENT ON COLUMN organizations.billing_email IS 'Email address for billing and invoices';

-- Payment Method ID (Stripe/payment gateway)
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS payment_method_id VARCHAR(255);

COMMENT ON COLUMN organizations.payment_method_id IS 'Payment gateway payment method ID (e.g., Stripe pm_xxx)';

-- Next Billing Date
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS next_billing_date DATE;

COMMENT ON COLUMN organizations.next_billing_date IS 'Next scheduled billing date';

-- MRR (Monthly Recurring Revenue)
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS mrr DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN organizations.mrr IS 'Monthly Recurring Revenue in local currency';

-- ARR (Annual Recurring Revenue)
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS arr DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN organizations.arr IS 'Annual Recurring Revenue (MRR * 12 or yearly price)';

-- Discount Percent (from coupon)
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS discount_percent INT DEFAULT 0;

COMMENT ON COLUMN organizations.discount_percent IS 'Active discount percentage from applied coupon';

-- Trial Extended Days
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS trial_extended_days INT DEFAULT 0;

COMMENT ON COLUMN organizations.trial_extended_days IS 'Additional trial days granted by admin';

-- Trial End Date (computed)
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS trial_end_date DATE;

COMMENT ON COLUMN organizations.trial_end_date IS 'Computed trial end date (trial_start + trial_days + trial_extended_days)';

-- Last Payment Date
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ;

COMMENT ON COLUMN organizations.last_payment_date IS 'Date of last successful payment';

-- Last Payment Amount
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS last_payment_amount DECIMAL(10,2);

COMMENT ON COLUMN organizations.last_payment_amount IS 'Amount of last successful payment';

-- Cancellation Date
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS cancellation_date TIMESTAMPTZ;

COMMENT ON COLUMN organizations.cancellation_date IS 'Date when subscription was cancelled';

-- Cancellation Reason
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

COMMENT ON COLUMN organizations.cancellation_reason IS 'Reason provided for subscription cancellation';

-- =============================================================================
-- Create Indexes for Performance
-- =============================================================================

-- Index on billing_cycle for filtering
CREATE INDEX IF NOT EXISTS idx_organizations_billing_cycle 
ON organizations(billing_cycle) 
WHERE billing_cycle IS NOT NULL;

-- Index on next_billing_date for cron jobs
CREATE INDEX IF NOT EXISTS idx_organizations_next_billing_date 
ON organizations(next_billing_date) 
WHERE next_billing_date IS NOT NULL;

-- Index on trial_end_date for expiration checks
CREATE INDEX IF NOT EXISTS idx_organizations_trial_end_date 
ON organizations(trial_end_date) 
WHERE trial_end_date IS NOT NULL;

-- Index on subscription_status + trial_end_date for trial monitoring
CREATE INDEX IF NOT EXISTS idx_organizations_trial_monitoring 
ON organizations(subscription_status, trial_end_date) 
WHERE subscription_status = 'trial';

-- Index on mrr for revenue reporting
CREATE INDEX IF NOT EXISTS idx_organizations_mrr 
ON organizations(mrr DESC) 
WHERE mrr > 0;

-- Index on client_id + subscription_status for client reporting
CREATE INDEX IF NOT EXISTS idx_organizations_client_revenue 
ON organizations(client_id, subscription_status, mrr) 
WHERE client_id IS NOT NULL;

-- =============================================================================
-- Create Function to Calculate Trial End Date
-- =============================================================================

CREATE OR REPLACE FUNCTION calculate_trial_end_date(
  p_trial_start_date TIMESTAMPTZ,
  p_trial_days INT,
  p_trial_extended_days INT
) RETURNS DATE AS $$
BEGIN
  IF p_trial_start_date IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN (p_trial_start_date + 
    INTERVAL '1 day' * (COALESCE(p_trial_days, 0) + COALESCE(p_trial_extended_days, 0))
  )::DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_trial_end_date IS 'Calculate trial end date from start date, base days, and extended days';

-- =============================================================================
-- Create Trigger to Auto-Update Trial End Date
-- =============================================================================

CREATE OR REPLACE FUNCTION update_trial_end_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if in trial status
  IF NEW.subscription_status = 'trial' THEN
    NEW.trial_end_date := calculate_trial_end_date(
      NEW.trial_start_date,
      NEW.trial_days,
      NEW.trial_extended_days
    );
  ELSE
    -- Clear trial_end_date if not in trial
    NEW.trial_end_date := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_trial_end_date ON organizations;

CREATE TRIGGER trg_update_trial_end_date
  BEFORE INSERT OR UPDATE OF trial_start_date, trial_days, trial_extended_days, subscription_status
  ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_trial_end_date();

COMMENT ON TRIGGER trg_update_trial_end_date ON organizations IS 'Auto-calculate trial_end_date when trial fields change';

-- =============================================================================
-- Create Function to Calculate MRR
-- =============================================================================

CREATE OR REPLACE FUNCTION calculate_organization_mrr(
  p_subscription_plan VARCHAR(50),
  p_seats_allowed INT,
  p_billing_cycle VARCHAR(20),
  p_discount_percent INT
) RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_base_price_per_seat DECIMAL(10,2);
  v_monthly_price DECIMAL(10,2);
  v_discount_multiplier DECIMAL(5,4);
BEGIN
  -- Base prices per seat per month
  v_base_price_per_seat := CASE p_subscription_plan
    WHEN 'starter' THEN 49.00
    WHEN 'pro' THEN 99.00
    WHEN 'agency' THEN 149.00
    WHEN 'custom' THEN 199.00
    ELSE 0.00
  END;
  
  -- Calculate monthly price
  v_monthly_price := v_base_price_per_seat * COALESCE(p_seats_allowed, 1);
  
  -- If yearly billing, divide by 12
  IF p_billing_cycle = 'yearly' THEN
    v_monthly_price := v_monthly_price * 0.85; -- 15% discount for yearly
  END IF;
  
  -- Apply discount
  v_discount_multiplier := 1.0 - (COALESCE(p_discount_percent, 0)::DECIMAL / 100.0);
  
  RETURN ROUND(v_monthly_price * v_discount_multiplier, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_organization_mrr IS 'Calculate MRR based on plan, seats, billing cycle, and discount';

-- =============================================================================
-- Create Trigger to Auto-Update MRR and ARR
-- =============================================================================

CREATE OR REPLACE FUNCTION update_organization_revenue()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate for active/trial subscriptions
  IF NEW.subscription_status IN ('trial', 'active') THEN
    NEW.mrr := calculate_organization_mrr(
      NEW.subscription_plan,
      NEW.seats_allowed,
      NEW.billing_cycle,
      NEW.discount_percent
    );
    NEW.arr := NEW.mrr * 12;
  ELSE
    -- Zero out revenue for cancelled/inactive
    NEW.mrr := 0;
    NEW.arr := 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_organization_revenue ON organizations;

CREATE TRIGGER trg_update_organization_revenue
  BEFORE INSERT OR UPDATE OF subscription_plan, seats_allowed, billing_cycle, discount_percent, subscription_status
  ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_revenue();

COMMENT ON TRIGGER trg_update_organization_revenue ON organizations IS 'Auto-calculate MRR and ARR when billing fields change';

-- =============================================================================
-- Update Existing Organizations
-- =============================================================================

-- Set default billing_cycle for existing orgs
UPDATE organizations
SET billing_cycle = 'monthly'
WHERE billing_cycle IS NULL AND subscription_status IN ('trial', 'active');

-- Calculate trial_end_date for existing trial orgs
UPDATE organizations
SET trial_end_date = calculate_trial_end_date(trial_start_date, trial_days, trial_extended_days)
WHERE subscription_status = 'trial' AND trial_start_date IS NOT NULL;

-- Calculate MRR/ARR for existing orgs
UPDATE organizations
SET 
  mrr = calculate_organization_mrr(subscription_plan, seats_allowed, billing_cycle, discount_percent),
  arr = calculate_organization_mrr(subscription_plan, seats_allowed, billing_cycle, discount_percent) * 12
WHERE subscription_status IN ('trial', 'active');

-- =============================================================================
-- Verification Queries
-- =============================================================================

DO $$
DECLARE
  v_orgs_with_billing INT;
  v_trial_orgs INT;
  v_active_orgs INT;
BEGIN
  SELECT COUNT(*) INTO v_orgs_with_billing
  FROM organizations
  WHERE billing_cycle IS NOT NULL;
  
  SELECT COUNT(*) INTO v_trial_orgs
  FROM organizations
  WHERE subscription_status = 'trial' AND trial_end_date IS NOT NULL;
  
  SELECT COUNT(*) INTO v_active_orgs
  FROM organizations
  WHERE subscription_status = 'active' AND mrr > 0;
  
  RAISE NOTICE 'Organizations with billing cycle: %', v_orgs_with_billing;
  RAISE NOTICE 'Trial organizations with end date: %', v_trial_orgs;
  RAISE NOTICE 'Active organizations with MRR: %', v_active_orgs;
END $$;

-- =============================================================================
-- Table Comments
-- =============================================================================

COMMENT ON TABLE organizations IS 'Organizations (tenants) with full billing, trial, and subscription management';
