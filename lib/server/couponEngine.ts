import 'server-only';

import crypto from 'crypto';
import { Prisma } from '@prisma/client';

import prisma from '@/lib/prisma';

type CouponDiscountType = 'PERCENT' | 'FIXED_AMOUNT';

type CouponRow = {
  id: string;
  name: string | null;
  status: string;
  discount_type: CouponDiscountType;
  discount_percent: number | null;
  discount_amount: Prisma.Decimal | null;
  min_order_amount: Prisma.Decimal | null;
  starts_at: Date | null;
  ends_at: Date | null;
  max_redemptions_total: number | null;
};

export type CouponValidationOk = {
  ok: true;
  couponId: string;
  couponName: string | null;
  discountType: CouponDiscountType;
  discountAmount: Prisma.Decimal;
  amountBefore: Prisma.Decimal;
  amountAfter: Prisma.Decimal;
};

export type CouponValidationFail = {
  ok: false;
  reason:
    | 'INVALID_CODE'
    | 'INACTIVE'
    | 'NOT_STARTED'
    | 'EXPIRED'
    | 'MIN_ORDER_AMOUNT'
    | 'ALREADY_REDEEMED'
    | 'MAX_REDEMPTIONS_REACHED'
    | 'ORDER_ALREADY_HAS_COUPON';
};

export type CouponValidationResult = CouponValidationOk | CouponValidationFail;

function moneyDecimal(input: Prisma.Decimal | number | string): Prisma.Decimal {
  if (input instanceof Prisma.Decimal) return input;
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return new Prisma.Decimal(0);
    return new Prisma.Decimal(input);
  }
  const s = String(input || '').trim();
  if (!s) return new Prisma.Decimal(0);
  return new Prisma.Decimal(s);
}

function roundMoney(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function clampNonNegative(value: Prisma.Decimal): Prisma.Decimal {
  if (value.isNaN() || !value.isFinite()) return new Prisma.Decimal(0);
  return value.lessThan(0) ? new Prisma.Decimal(0) : value;
}

function normalizeCouponCode(code: string): string {
  return String(code || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();
}

type CouponDbClient = {
  coupons: {
    findUnique: (args: unknown) => Promise<unknown>;
  };
  coupon_redemptions: {
    findFirst: (args: unknown) => Promise<unknown>;
    count: (args: unknown) => Promise<number>;
    create: (args: unknown) => Promise<unknown>;
  };
  subscription_orders: {
    findFirst: (args: unknown) => Promise<unknown>;
    updateMany: (args: unknown) => Promise<unknown>;
  };
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asDbClient(value: unknown): CouponDbClient {
  const obj = asRecord(value);
  const coupons = asRecord(obj.coupons);
  const coupon_redemptions = asRecord(obj.coupon_redemptions);
  const subscription_orders = asRecord(obj.subscription_orders);

  if (
    typeof coupons.findUnique !== 'function' ||
    typeof coupon_redemptions.findFirst !== 'function' ||
    typeof coupon_redemptions.count !== 'function' ||
    typeof coupon_redemptions.create !== 'function' ||
    typeof subscription_orders.findFirst !== 'function' ||
    typeof subscription_orders.updateMany !== 'function'
  ) {
    throw new Error('Invalid db client passed to CouponEngine');
  }

  return {
    coupons: {
      findUnique: coupons.findUnique as (args: unknown) => Promise<unknown>,
    },
    coupon_redemptions: {
      findFirst: coupon_redemptions.findFirst as (args: unknown) => Promise<unknown>,
      count: coupon_redemptions.count as (args: unknown) => Promise<number>,
      create: coupon_redemptions.create as (args: unknown) => Promise<unknown>,
    },
    subscription_orders: {
      findFirst: subscription_orders.findFirst as (args: unknown) => Promise<unknown>,
      updateMany: subscription_orders.updateMany as (args: unknown) => Promise<unknown>,
    },
  };
}

export function computeCouponCodeHash(code: string): string {
  const normalized = normalizeCouponCode(code);
  const pepper = String(process.env.COUPON_CODE_PEPPER || '').trim();
  if (!pepper) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Missing COUPON_CODE_PEPPER');
    }
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }
  return crypto.createHmac('sha256', pepper).update(normalized).digest('hex');
}

export function computeCouponCodeLast4(code: string): string | null {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return null;
  const last4 = normalized.slice(-4);
  return last4.length === 4 ? last4 : null;
}

function isActiveStatus(status: string): boolean {
  const s = String(status || '').trim().toLowerCase();
  return s === 'active' || s === 'enabled' || s === 'on';
}

function computeDiscountAmount(params: {
  coupon: CouponRow;
  amountBefore: Prisma.Decimal;
}): Prisma.Decimal {
  const amountBefore = clampNonNegative(params.amountBefore);
  const c = params.coupon;

  if (c.discount_type === 'PERCENT') {
    const p = Number.isFinite(Number(c.discount_percent)) ? Math.floor(Number(c.discount_percent)) : 0;
    if (p <= 0) return new Prisma.Decimal(0);
    const pct = Math.min(100, p);
    const raw = amountBefore.mul(pct).div(100);
    const rounded = roundMoney(raw);
    const capped = rounded.greaterThan(amountBefore) ? amountBefore : rounded;
    return clampNonNegative(capped);
  }

  const fixed = c.discount_amount ? roundMoney(moneyDecimal(c.discount_amount)) : new Prisma.Decimal(0);
  const capped = fixed.greaterThan(amountBefore) ? amountBefore : fixed;
  return clampNonNegative(capped);
}

async function loadCouponByCode(code: string): Promise<CouponRow | null> {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return null;

  return await loadCouponByCodeDb(asDbClient(prisma), normalized);
}

async function loadCouponByCodeDb(db: CouponDbClient, code: string): Promise<CouponRow | null> {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return null;

  const codeHash = computeCouponCodeHash(normalized);

  const row = (await db.coupons.findUnique({
    where: { code_hash: codeHash },
    select: {
      id: true,
      name: true,
      status: true,
      discount_type: true,
      discount_percent: true,
      discount_amount: true,
      min_order_amount: true,
      starts_at: true,
      ends_at: true,
      max_redemptions_total: true,
    },
  })) as {
    id: string;
    name: string | null;
    status: string;
    discount_type: CouponDiscountType;
    discount_percent: number | null;
    discount_amount: Prisma.Decimal | null;
    min_order_amount: Prisma.Decimal | null;
    starts_at: Date | null;
    ends_at: Date | null;
    max_redemptions_total: number | null;
  } | null;

  if (!row?.id) return null;
  return {
    id: String(row.id),
    name: row.name == null ? null : String(row.name),
    status: String(row.status),
    discount_type: row.discount_type as CouponDiscountType,
    discount_percent: row.discount_percent == null ? null : Number(row.discount_percent),
    discount_amount: (row.discount_amount as Prisma.Decimal | null) ?? null,
    min_order_amount: (row.min_order_amount as Prisma.Decimal | null) ?? null,
    starts_at: row.starts_at instanceof Date ? row.starts_at : row.starts_at ? new Date(String(row.starts_at)) : null,
    ends_at: row.ends_at instanceof Date ? row.ends_at : row.ends_at ? new Date(String(row.ends_at)) : null,
    max_redemptions_total: row.max_redemptions_total == null ? null : Number(row.max_redemptions_total),
  };
}

async function isCouponAlreadyRedeemedForOrg(params: {
  couponId: string;
  organizationId: string;
}): Promise<boolean> {
  const couponId = String(params.couponId || '').trim();
  const organizationId = String(params.organizationId || '').trim();
  if (!couponId || !organizationId) return false;

  const row = (await asDbClient(prisma).coupon_redemptions.findFirst({
    where: {
      coupon_id: couponId,
      organization_id: organizationId,
    },
    select: { id: true },
  })) as { id: string } | null;

  return Boolean(row?.id);
}

async function isCouponAlreadyRedeemedForOrgDb(
  db: CouponDbClient,
  params: {
    couponId: string;
    organizationId: string;
  }
): Promise<boolean> {
  const couponId = String(params.couponId || '').trim();
  const organizationId = String(params.organizationId || '').trim();
  if (!couponId || !organizationId) return false;

  const row = (await db.coupon_redemptions.findFirst({
    where: {
      coupon_id: couponId,
      organization_id: organizationId,
    },
    select: { id: true },
  })) as { id: string } | null;

  return Boolean(row?.id);
}

async function hasCouponRemainingRedemptionsDb(db: CouponDbClient, coupon: CouponRow): Promise<boolean> {
  const max = coupon.max_redemptions_total == null ? null : Number(coupon.max_redemptions_total);
  if (!max || !Number.isFinite(max) || max <= 0) return true;

  const used = await db.coupon_redemptions.count({
    where: {
      coupon_id: coupon.id,
    },
  });

  return Number(used) < max;
}

export class CouponEngine {
  static async validate(params: {
    code: string;
    organizationId?: string | null;
    amountBefore: Prisma.Decimal | number | string;
    now?: Date;
    checkRedeemed?: boolean;
    db?: unknown;
  }): Promise<CouponValidationResult> {
    const code = String(params.code || '').trim();
    if (!code) return { ok: false, reason: 'INVALID_CODE' };

    const amountBefore = moneyDecimal(params.amountBefore);
    const now = params.now instanceof Date ? params.now : new Date();
    const db = asDbClient(params.db ?? prisma);

    let coupon: CouponRow | null = null;
    try {
      coupon = await loadCouponByCodeDb(db, code);
    } catch {
      coupon = null;
    }

    if (!coupon?.id) return { ok: false, reason: 'INVALID_CODE' };

    if (!isActiveStatus(coupon.status)) return { ok: false, reason: 'INACTIVE' };

    if (coupon.starts_at && now < coupon.starts_at) return { ok: false, reason: 'NOT_STARTED' };
    if (coupon.ends_at && now > coupon.ends_at) return { ok: false, reason: 'EXPIRED' };

    if (coupon.min_order_amount) {
      const min = moneyDecimal(coupon.min_order_amount);
      if (amountBefore.lessThan(min)) return { ok: false, reason: 'MIN_ORDER_AMOUNT' };
    }

    const organizationId = params.organizationId ? String(params.organizationId).trim() : '';
    const checkRedeemed = params.checkRedeemed !== false;
    if (checkRedeemed && organizationId) {
      const redeemed = await isCouponAlreadyRedeemedForOrgDb(db, { couponId: coupon.id, organizationId });
      if (redeemed) return { ok: false, reason: 'ALREADY_REDEEMED' };
    }

    if (!(await hasCouponRemainingRedemptionsDb(db, coupon))) {
      return { ok: false, reason: 'MAX_REDEMPTIONS_REACHED' };
    }

    const discountAmount = computeDiscountAmount({ coupon, amountBefore });
    const amountAfter = clampNonNegative(roundMoney(amountBefore.sub(discountAmount)));

    return {
      ok: true,
      couponId: coupon.id,
      couponName: coupon.name ?? null,
      discountType: coupon.discount_type,
      discountAmount: roundMoney(discountAmount),
      amountBefore: roundMoney(amountBefore),
      amountAfter,
    };
  }

  static async applyToSubscriptionOrder(params: {
    orderId: string;
    organizationId: string;
    couponCode: string;
    clerkUserId?: string | null;
    now?: Date;
    db?: unknown;
  }): Promise<CouponValidationResult> {
    const orderId = String(params.orderId || '').trim();
    const organizationId = String(params.organizationId || '').trim();
    const couponCode = String(params.couponCode || '').trim();
    const now = params.now instanceof Date ? params.now : new Date();

    if (!orderId || !organizationId || !couponCode) return { ok: false, reason: 'INVALID_CODE' };

    const db = asDbClient(params.db ?? prisma);

    const order = (await db.subscription_orders.findFirst({
      where: {
        id: orderId,
        organization_id: organizationId,
      },
      select: {
        id: true,
        organization_id: true,
        amount: true,
        currency: true,
        coupon_id: true,
        amount_before_discount: true,
      },
    })) as {
      id: string;
      organization_id: string | null;
      amount: Prisma.Decimal | null;
      currency: string | null;
      coupon_id: string | null;
      amount_before_discount: Prisma.Decimal | null;
    } | null;

    if (!order?.id) return { ok: false, reason: 'INVALID_CODE' };

    const existingCouponId = order.coupon_id ? String(order.coupon_id) : '';
    if (existingCouponId) return { ok: false, reason: 'ORDER_ALREADY_HAS_COUPON' };

    const amountBefore = moneyDecimal(order.amount ?? 0);

    const validation = await CouponEngine.validate({
      code: couponCode,
      organizationId,
      amountBefore,
      now,
      checkRedeemed: true,
      db,
    });

    if (!validation.ok) return validation;

    try {
      await db.coupon_redemptions.create({
        data: {
          coupon_id: validation.couponId,
          organization_id: organizationId,
          order_id: orderId,
          clerk_user_id: params.clerkUserId ? String(params.clerkUserId) : null,
          redeemed_at: now,
          amount_before: validation.amountBefore,
          discount_amount: validation.discountAmount,
          amount_after: validation.amountAfter,
          created_at: now,
          updated_at: now,
        },
      });
    } catch (e: unknown) {
      const obj = e as { code?: string };
      if (String(obj?.code || '') === 'P2002') {
        return { ok: false, reason: 'ALREADY_REDEEMED' };
      }
      throw e;
    }

    await db.subscription_orders.updateMany({
      where: {
        id: orderId,
        organization_id: organizationId,
        coupon_id: null,
      },
      data: {
        coupon_id: validation.couponId,
        amount_before_discount: validation.amountBefore,
        coupon_discount: validation.discountAmount,
        amount: validation.amountAfter,
        updated_at: now,
      },
    });

    return validation;
  }

  static async applyToSubscriptionOrderAtomic(params: {
    orderId: string;
    organizationId: string;
    couponCode: string;
    clerkUserId?: string | null;
    now?: Date;
  }): Promise<CouponValidationResult> {
    return await prisma.$transaction(
      async (tx) => {
        return await CouponEngine.applyToSubscriptionOrder({
          orderId: params.orderId,
          organizationId: params.organizationId,
          couponCode: params.couponCode,
          clerkUserId: params.clerkUserId,
          now: params.now,
          db: tx,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }
}
