/**
 * Social Module Pricing
 * מחירון נפרד למודול Social עם תוכניות מדורגות
 */

import { SocialPlan, SocialPlanLimits } from '@/types/social';
import { SOCIAL_PLAN_LIMITS } from '@/lib/social/plan-limits';

export interface SocialPlanPricing {
  plan: SocialPlan;
  labelHe: string;
  labelEn: string;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  bestFor: string;
  features: string[];
  limits: SocialPlanLimits;
  highlighted?: boolean;
}

export const SOCIAL_PRICING: Record<SocialPlan, SocialPlanPricing> = {
  free: {
    plan: 'free',
    labelHe: 'נסיון חינם',
    labelEn: 'Free Trial',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'התחל עם הבסיס',
    bestFor: 'מתאים לניסיון ראשוני',
    features: [
      '10 פוסטים לחודש',
      '2 פלטפורמות',
      'פרסום ידני',
      'תמיכה בסיסית',
    ],
    limits: SOCIAL_PLAN_LIMITS.free,
  },

  solo: {
    plan: 'solo',
    labelHe: 'Solo',
    labelEn: 'Solo',
    monthlyPrice: 149,
    yearlyPrice: 119, // 20% הנחה
    description: 'עסק בודד עם AI מלא',
    bestFor: 'פרילנסר, עסק קטן',
    features: [
      '100 פוסטים לחודש',
      'עד 5 פלטפורמות',
      '3 campaigns פעילים',
      'AI ליצירת תוכן ✨',
      'AI אסטרטגיית שיווק ✨',
      'פרסום ישיר לרשתות (OAuth כלול)',
      'תזמון חכם',
      'מדריכי Setup מפורטים',
      'תמיכה מהירה בעברית',
    ],
    limits: SOCIAL_PLAN_LIMITS.solo,
    highlighted: false,
  },

  team: {
    plan: 'team',
    labelHe: 'Team',
    labelEn: 'Team',
    monthlyPrice: 299,
    yearlyPrice: 239, // 20% הנחה
    description: 'צוות עם יכולות מתקדמות',
    bestFor: 'צוות שיווק 2-10 איש',
    features: [
      '500 פוסטים לחודש',
      'עד 10 פלטפורמות',
      '10 campaigns פעילים',
      'AI ליצירת תוכן ✨',
      'פרסום ישיר לרשתות',
      'תזמון חכם',
      'ניתוח ביצועים',
      '**תמיכה מועדפת** 🔥',
    ],
    limits: SOCIAL_PLAN_LIMITS.team,
    highlighted: true,
  },

  agency: {
    plan: 'agency',
    labelHe: 'Agency',
    labelEn: 'Agency',
    monthlyPrice: 999,
    yearlyPrice: 799, // 20% הנחה
    description: 'סוכנות שמנהלת לקוחות',
    bestFor: 'סוכנות שיווק עד 20 לקוחות',
    features: [
      '**ללא הגבלת פוסטים** 🚀',
      '**ללא הגבלת פלטפורמות**',
      '**עד 20 לקוחות**',
      'Campaigns ללא הגבלה',
      'AI ליצירת תוכן ✨',
      'AI אסטרטגיית שיווק ללקוח ✨',
      'פרסום ישיר לרשתות (OAuth כלול)',
      '**הכל כלול - ללא תשלומים נוספים** 💎',
      '**White Label** 🎨',
      '**מיתוג מותאם אישית**',
      'דשבורד ניהול לקוחות',
      'Setup Support מלא',
      'תמיכה מועדפת VIP (6 שעות)',
    ],
    limits: SOCIAL_PLAN_LIMITS.agency,
    highlighted: false,
  },

  enterprise: {
    plan: 'enterprise',
    labelHe: 'Enterprise',
    labelEn: 'Enterprise',
    monthlyPrice: 0, // Custom pricing
    yearlyPrice: 0,
    description: 'פתרון ארגוני מותאם',
    bestFor: 'ארגונים גדולים, רשתות',
    features: [
      '**ללא כל הגבלה** ∞',
      'לקוחות בלתי מוגבלים',
      'פלטפורמות בלתי מוגבלות',
      'Campaigns ללא הגבלה',
      'AI ליצירת תוכן ✨',
      'פרסום ישיר לרשתות',
      '**White Label מלא**',
      '**API Access**',
      '**SLA מובטח**',
      'תמיכה ייעודית 24/7',
      'אפשרויות התאמה אישית',
    ],
    limits: SOCIAL_PLAN_LIMITS.enterprise,
    highlighted: false,
  },
};

/**
 * קבלת מחיר חודשי למודול Social
 */
export function getSocialPlanMonthlyPrice(plan: SocialPlan): number {
  return SOCIAL_PRICING[plan].monthlyPrice;
}

/**
 * קבלת מחיר שנתי למודול Social (עם הנחה)
 */
export function getSocialPlanYearlyPrice(plan: SocialPlan): number {
  return SOCIAL_PRICING[plan].yearlyPrice;
}

/**
 * חישוב חיסכון שנתי
 */
export function getSocialYearlySavings(plan: SocialPlan): number {
  const monthly = SOCIAL_PRICING[plan].monthlyPrice;
  const yearly = SOCIAL_PRICING[plan].yearlyPrice;
  return (monthly * 12) - (yearly * 12);
}

/**
 * קבלת התוכנית המומלצת בהתאם למספר לקוחות
 */
export function getRecommendedSocialPlan(clientsCount: number): SocialPlan {
  if (clientsCount === 0 || clientsCount === 1) {
    return 'solo';
  } else if (clientsCount <= 5) {
    return 'team';
  } else if (clientsCount <= 20) {
    return 'agency';
  } else {
    return 'enterprise';
  }
}

/**
 * בדיקה אם התוכנית תומכת במספר לקוחות מסוים
 */
export function canSupportClients(plan: SocialPlan, clientsCount: number): boolean {
  const limits = SOCIAL_PLAN_LIMITS[plan];
  if (limits.maxClients === -1) return true; // unlimited
  return clientsCount <= limits.maxClients;
}
