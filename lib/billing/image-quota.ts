import { prisma } from '@/lib/prisma';
import { BILLING_PACKAGES, AI_IMAGE_OVERAGE_PRICE_ILS, type PackageType } from './pricing';

/**
 * בדיקה האם ארגון חרג ממכסת התמונות החודשית
 */
export async function checkImageQuota(organizationId: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  overageCount: number;
  overageCharge: number;
  message?: string;
}> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      subscription_plan: true,
      ai_images_used_this_month: true,
      ai_images_last_reset: true,
    },
  });

  if (!org) {
    return {
      allowed: false,
      used: 0,
      limit: 0,
      overageCount: 0,
      overageCharge: 0,
      message: 'ארגון לא נמצא',
    };
  }

  // בדיקה אם צריך לאפס את הספירה (חודש חדש)
  const now = new Date();
  const lastReset = org.ai_images_last_reset ? new Date(org.ai_images_last_reset) : null;
  const shouldReset = !lastReset || 
    (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear());

  let used = org.ai_images_used_this_month || 0;

  if (shouldReset) {
    // איפוס ספירה לחודש חדש
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        ai_images_used_this_month: 0,
        ai_images_last_reset: now,
      },
    });
    used = 0;
  }

  const packageType = (org.subscription_plan as PackageType) || 'solo';
  const packageDef = BILLING_PACKAGES[packageType];
  const limit = packageDef?.aiImagesPerMonth || 10;

  const overageCount = Math.max(0, used - limit);
  const overageCharge = overageCount * AI_IMAGE_OVERAGE_PRICE_ILS;

  return {
    allowed: true, // תמיד מותר, אבל עם חיוב
    used,
    limit,
    overageCount,
    overageCharge,
  };
}

/**
 * ספירת שימוש בתמונה (מופעל אחרי יצירת תמונה מוצלחת)
 */
export async function incrementImageUsage(organizationId: string): Promise<void> {
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      ai_images_used_this_month: { increment: 1 },
    },
  });
}

/**
 * קבלת סטטיסטיקת שימוש תמונות לארגון
 */
export async function getImageUsageStats(organizationId: string): Promise<{
  used: number;
  limit: number;
  remaining: number;
  overageCount: number;
  overageCharge: number;
  resetDate: Date;
}> {
  const quota = await checkImageQuota(organizationId);
  const remaining = Math.max(0, quota.limit - quota.used);
  
  const now = new Date();
  const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return {
    used: quota.used,
    limit: quota.limit,
    remaining,
    overageCount: quota.overageCount,
    overageCharge: quota.overageCharge,
    resetDate,
  };
}
