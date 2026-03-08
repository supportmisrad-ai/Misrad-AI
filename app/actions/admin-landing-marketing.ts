'use server';

import prisma from '@/lib/prisma';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { requireSuperAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { asObjectLoose as asObject } from '@/lib/shared/unknown';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Promotion {
  id: string;
  title: string;
  description: string;
  badge: string;
  discountPercent: number | null;
  discountFixed: number | null;
  couponCode: string;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  showOnPricing: boolean;
  showOnSignup: boolean;
  showOnLanding: boolean;
  ctaText: string;
  ctaUrl: string;
}

export interface ContextualBanner {
  id: string;
  title: string;
  message: string;
  ctaText: string;
  ctaUrl: string;
  bgColor: string;
  textColor: string;
  active: boolean;
  showOnPricing: boolean;
  showOnSignup: boolean;
  showOnLanding: boolean;
  startDate: string | null;
  endDate: string | null;
}

// ─── Promotions ──────────────────────────────────────────────────────────────

const PROMOTIONS_KEY = 'landing_promotions';
const BANNERS_KEY = 'landing_contextual_banners';

function coercePromotions(raw: unknown): Promotion[] {
  const obj = asObject(raw);
  const items = obj?.promotions;
  if (!Array.isArray(items)) return [];
  return items.map((item: unknown, idx: number) => {
    const o = asObject(item);
    if (!o) return null;
    return {
      id: typeof o.id === 'string' ? o.id : `promo_${idx}_${Date.now()}`,
      title: typeof o.title === 'string' ? o.title : '',
      description: typeof o.description === 'string' ? o.description : '',
      badge: typeof o.badge === 'string' ? o.badge : '',
      discountPercent: typeof o.discountPercent === 'number' ? o.discountPercent : null,
      discountFixed: typeof o.discountFixed === 'number' ? o.discountFixed : null,
      couponCode: typeof o.couponCode === 'string' ? o.couponCode : '',
      startDate: typeof o.startDate === 'string' ? o.startDate : null,
      endDate: typeof o.endDate === 'string' ? o.endDate : null,
      active: typeof o.active === 'boolean' ? o.active : false,
      showOnPricing: typeof o.showOnPricing === 'boolean' ? o.showOnPricing : false,
      showOnSignup: typeof o.showOnSignup === 'boolean' ? o.showOnSignup : false,
      showOnLanding: typeof o.showOnLanding === 'boolean' ? o.showOnLanding : false,
      ctaText: typeof o.ctaText === 'string' ? o.ctaText : '',
      ctaUrl: typeof o.ctaUrl === 'string' ? o.ctaUrl : '',
    } satisfies Promotion;
  }).filter((v): v is Promotion => v !== null);
}

function coerceBanners(raw: unknown): ContextualBanner[] {
  const obj = asObject(raw);
  const items = obj?.banners;
  if (!Array.isArray(items)) return [];
  return items.map((item: unknown, idx: number) => {
    const o = asObject(item);
    if (!o) return null;
    return {
      id: typeof o.id === 'string' ? o.id : `banner_${idx}_${Date.now()}`,
      title: typeof o.title === 'string' ? o.title : '',
      message: typeof o.message === 'string' ? o.message : '',
      ctaText: typeof o.ctaText === 'string' ? o.ctaText : '',
      ctaUrl: typeof o.ctaUrl === 'string' ? o.ctaUrl : '',
      bgColor: typeof o.bgColor === 'string' ? o.bgColor : 'bg-blue-50',
      textColor: typeof o.textColor === 'string' ? o.textColor : 'text-blue-900',
      active: typeof o.active === 'boolean' ? o.active : false,
      showOnPricing: typeof o.showOnPricing === 'boolean' ? o.showOnPricing : false,
      showOnSignup: typeof o.showOnSignup === 'boolean' ? o.showOnSignup : false,
      showOnLanding: typeof o.showOnLanding === 'boolean' ? o.showOnLanding : false,
      startDate: typeof o.startDate === 'string' ? o.startDate : null,
      endDate: typeof o.endDate === 'string' ? o.endDate : null,
    } satisfies ContextualBanner;
  }).filter((v): v is ContextualBanner => v !== null);
}

export async function getPromotions() {
  try {
    await requireAuth();
    await requireSuperAdmin();

    const row = await withTenantIsolationContext(
      { source: 'admin_landing_marketing', reason: 'read_promotions', mode: 'global_admin', isSuperAdmin: true },
      async () => prisma.coreSystemSettings.findUnique({ where: { key: PROMOTIONS_KEY }, select: { value: true } })
    );

    return createSuccessResponse({ promotions: coercePromotions(row?.value) });
  } catch (error: unknown) {
    return createErrorResponse(error instanceof Error ? error.message : 'Failed to load promotions');
  }
}

export async function savePromotions(promotions: Promotion[]) {
  try {
    await requireAuth();
    await requireSuperAdmin();

    const value = JSON.parse(JSON.stringify({ promotions }));

    await withTenantIsolationContext(
      { source: 'admin_landing_marketing', reason: 'write_promotions', mode: 'global_admin', isSuperAdmin: true },
      async () => prisma.coreSystemSettings.upsert({
        where: { key: PROMOTIONS_KEY },
        create: { key: PROMOTIONS_KEY, value, updated_at: new Date() },
        update: { value, updated_at: new Date() },
      })
    );

    revalidatePath('/pricing');
    revalidatePath('/');
    return createSuccessResponse({ ok: true });
  } catch (error: unknown) {
    return createErrorResponse(error instanceof Error ? error.message : 'Failed to save promotions');
  }
}

// ─── Contextual Banners ──────────────────────────────────────────────────────

export async function getContextualBanners(): Promise<{ success: true; banners: ContextualBanner[] } | { success: false; error: string }> {
  try {
    await requireAuth();
    await requireSuperAdmin();

    const row = await withTenantIsolationContext(
      { source: 'admin_landing_marketing', reason: 'read_banners', mode: 'global_admin', isSuperAdmin: true },
      async () => prisma.coreSystemSettings.findUnique({ where: { key: BANNERS_KEY }, select: { value: true } })
    );

    return { success: true, banners: coerceBanners(row?.value) };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load banners' };
  }
}

export async function saveContextualBanners(banners: ContextualBanner[]) {
  try {
    await requireAuth();
    await requireSuperAdmin();

    const value = JSON.parse(JSON.stringify({ banners }));

    await withTenantIsolationContext(
      { source: 'admin_landing_marketing', reason: 'write_banners', mode: 'global_admin', isSuperAdmin: true },
      async () => prisma.coreSystemSettings.upsert({
        where: { key: BANNERS_KEY },
        create: { key: BANNERS_KEY, value, updated_at: new Date() },
        update: { value, updated_at: new Date() },
      })
    );

    revalidatePath('/pricing');
    revalidatePath('/');
    return createSuccessResponse({ ok: true });
  } catch (error: unknown) {
    return createErrorResponse(error instanceof Error ? error.message : 'Failed to save banners');
  }
}

// ─── Public read (no auth) ───────────────────────────────────────────────────

export async function getActivePromotionsPublic(): Promise<Promotion[]> {
  try {
    const row = await prisma.coreSystemSettings.findUnique({ where: { key: PROMOTIONS_KEY }, select: { value: true } }).catch(() => null);
    if (!row?.value) return [];
    const all = coercePromotions(row.value);
    const now = new Date().toISOString();
    return all.filter(p => {
      if (!p.active) return false;
      if (p.startDate && now < p.startDate) return false;
      if (p.endDate && now > p.endDate) return false;
      return true;
    });
  } catch {
    return [];
  }
}

export async function getActiveBannersPublic(): Promise<ContextualBanner[]> {
  try {
    const row = await prisma.coreSystemSettings.findUnique({ where: { key: BANNERS_KEY }, select: { value: true } }).catch(() => null);
    if (!row?.value) return [];
    const all = coerceBanners(row.value);
    const now = new Date().toISOString();
    return all.filter(b => {
      if (!b.active) return false;
      if (b.startDate && now < b.startDate) return false;
      if (b.endDate && now > b.endDate) return false;
      return true;
    });
  } catch {
    return [];
  }
}
