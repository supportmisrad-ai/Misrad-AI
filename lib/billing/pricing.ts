import { OSModuleKey } from '@/lib/os/modules/types';

export type BillingCycle = 'monthly' | 'yearly';

export type PackageType =
  | 'solo'
  | 'the_closer'
  | 'the_authority'
  | 'the_operator'
  | 'the_empire'
  | 'the_mentor';

type PackageDefinition = {
  labelHe: string;
  modules: OSModuleKey[];
  monthlyPrice: number;
};

export const BILLING_PACKAGES: Record<PackageType, PackageDefinition> = {
  solo: {
    labelHe: 'מודול בודד',
    modules: [],
    monthlyPrice: 149,
  },
  the_closer: {
    labelHe: 'חבילת מכירות',
    modules: ['system', 'nexus'],
    monthlyPrice: 249,
  },
  the_authority: {
    labelHe: 'חבילת שיווק ומיתוג',
    modules: ['social', 'client', 'nexus'],
    monthlyPrice: 349,
  },
  the_operator: {
    labelHe: 'חבילת תפעול ושטח',
    modules: ['operations', 'finance', 'nexus'],
    monthlyPrice: 349,
  },
  the_empire: {
    labelHe: 'הכל כלול',
    modules: ['nexus', 'system', 'social', 'client', 'finance', 'operations'],
    monthlyPrice: 499,
  },
  the_mentor: {
    labelHe: 'Legacy',
    modules: ['client', 'finance', 'nexus'],
    monthlyPrice: 349,
  },
};

function applyYearlyDiscount(amount: number, billing: BillingCycle): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (billing !== 'yearly') return amount;
  return Math.round(amount * 0.8);
}

function normalizeSeats(seats: unknown): number | null {
  const n = Number.isFinite(Number(seats)) ? Math.floor(Number(seats)) : null;
  return n && n > 0 ? n : null;
}

export function getSoloModulePriceMonthly(): number {
  return 149;
}

export function hasNexus(modules: OSModuleKey[]): boolean {
  return modules.includes('nexus');
}

export function getIncludedSeatsForModules(modules: OSModuleKey[]): number {
  return hasNexus(modules) ? 5 : 1;
}

export function calculatePackageModules(params: { packageType: PackageType; soloModuleKey?: OSModuleKey | null }): OSModuleKey[] {
  if (params.packageType === 'solo') {
    const mk = params.soloModuleKey ? String(params.soloModuleKey) : '';
    if (!mk) return [];
    return [mk as OSModuleKey];
  }

  const def = BILLING_PACKAGES[params.packageType];
  return def?.modules ? [...def.modules] : [];
}

export function calculateOrderAmount(params: {
  packageType: PackageType;
  soloModuleKey?: OSModuleKey | null;
  billingCycle: BillingCycle;
  seats?: number | null;
}): { amount: number; modules: OSModuleKey[]; includedSeats: number; extraSeats: number } {
  const modules = calculatePackageModules({ packageType: params.packageType, soloModuleKey: params.soloModuleKey ?? null });

  const normalizedSeats = normalizeSeats(params.seats);
  const includedSeats = getIncludedSeatsForModules(modules);
  const desiredSeats = normalizedSeats ?? includedSeats;

  if (desiredSeats > 1 && !hasNexus(modules)) {
    throw new Error('תוספת משתמשים דורשת מודול Nexus פעיל');
  }

  const extraSeats = Math.max(0, desiredSeats - includedSeats);
  const seatSurcharge = extraSeats * 39;

  const baseMonthly =
    params.packageType === 'solo'
      ? getSoloModulePriceMonthly()
      : Number(BILLING_PACKAGES[params.packageType]?.monthlyPrice || 0);

  const amountMonthly = Math.max(0, Math.round(baseMonthly + seatSurcharge));
  const amount = applyYearlyDiscount(amountMonthly, params.billingCycle);

  return { amount, modules, includedSeats, extraSeats };
}
