-- Coupons: add restriction fields
ALTER TABLE "coupons"
  ADD COLUMN IF NOT EXISTS "max_users" integer;

ALTER TABLE "coupons"
  ADD COLUMN IF NOT EXISTS "allowed_modules" text[] NOT NULL DEFAULT ARRAY[]::text[];

-- Organizations: store applied coupon restrictions as overrides
ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "coupon_seats_cap" integer;

ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "coupon_allowed_modules" text[] NOT NULL DEFAULT ARRAY[]::text[];
