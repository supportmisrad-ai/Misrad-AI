import { BILLING_PACKAGES, PackageType } from './pricing';

/**
 * מחזיר את השם בעברית של חבילה לפי ה-subscription_plan
 */
export function getPackageLabelHe(planKey: string | null | undefined): string {
  if (!planKey) return 'ללא חבילה';
  
  const key = planKey as PackageType;
  return BILLING_PACKAGES[key]?.labelHe || planKey;
}

/**
 * מחזיר את המחיר החודשי של חבילה
 */
export function getPackagePrice(planKey: string | null | undefined): number | null {
  if (!planKey) return null;
  
  const key = planKey as PackageType;
  return BILLING_PACKAGES[key]?.monthlyPrice || null;
}

/**
 * מחזיר את המודולים הכלולים בחבילה
 */
export function getPackageModules(planKey: string | null | undefined): string[] {
  if (!planKey) return [];
  
  const key = planKey as PackageType;
  return BILLING_PACKAGES[key]?.modules || [];
}
