/*
  Warnings:

  - The primary key for the `social_clients` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `social_notifications` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `social_system_settings` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- CreateEnum
CREATE TYPE "coupon_discount_type" AS ENUM ('PERCENT', 'FIXED_AMOUNT');

-- AlterTable
ALTER TABLE "subscription_orders" ADD COLUMN     "amount_before_discount" DECIMAL(10,2) DEFAULT 0,
ADD COLUMN     "coupon_discount" DECIMAL(10,2) DEFAULT 0,
ADD COLUMN     "coupon_id" UUID;

-- CreateTable
CREATE TABLE "coupons" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "code_hash" VARCHAR(64) NOT NULL,
    "code_last4" VARCHAR(4),
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "discount_type" "coupon_discount_type" NOT NULL,
    "discount_percent" INTEGER,
    "discount_amount" DECIMAL(10,2),
    "min_order_amount" DECIMAL(10,2),
    "starts_at" TIMESTAMPTZ(6),
    "ends_at" TIMESTAMPTZ(6),
    "max_redemptions_total" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_redemptions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "coupon_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "order_id" UUID,
    "clerk_user_id" TEXT,
    "redeemed_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "amount_before" DECIMAL(10,2),
    "discount_amount" DECIMAL(10,2),
    "amount_after" DECIMAL(10,2),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_hash_key" ON "coupons"("code_hash");

-- CreateIndex
CREATE INDEX "idx_coupons_status" ON "coupons"("status");

-- CreateIndex
CREATE INDEX "idx_coupons_starts_at" ON "coupons"("starts_at");

-- CreateIndex
CREATE INDEX "idx_coupons_ends_at" ON "coupons"("ends_at");

-- CreateIndex
CREATE INDEX "idx_coupon_redemptions_coupon_id" ON "coupon_redemptions"("coupon_id");

-- CreateIndex
CREATE INDEX "idx_coupon_redemptions_org_id" ON "coupon_redemptions"("organization_id");

-- CreateIndex
CREATE INDEX "idx_coupon_redemptions_order_id" ON "coupon_redemptions"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_redemptions_coupon_org_unique" ON "coupon_redemptions"("coupon_id", "organization_id");

-- CreateIndex
CREATE INDEX "idx_subscription_orders_coupon_id" ON "subscription_orders"("coupon_id");

-- AddForeignKey
ALTER TABLE "subscription_orders" ADD CONSTRAINT "subscription_orders_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "subscription_orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_all ON public.coupons;
DROP POLICY IF EXISTS super_admin_select_all ON public.coupons;
DROP POLICY IF EXISTS super_admin_write_all ON public.coupons;

CREATE POLICY deny_all ON public.coupons
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY super_admin_select_all ON public.coupons
FOR SELECT
TO authenticated
USING (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true);

CREATE POLICY super_admin_write_all ON public.coupons
FOR ALL
TO authenticated
USING (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true)
WITH CHECK (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true);

SELECT public.apply_org_rls('public.coupon_redemptions');
