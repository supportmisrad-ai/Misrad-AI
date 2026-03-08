/**
 * Social Module Plan-based Limits
 * מגדיר את ההגבלות והתכונות לכל תוכנית
 */

import { SocialPlan, SocialPlanLimits } from '@/types/social';

export const SOCIAL_PLAN_LIMITS: Record<SocialPlan, SocialPlanLimits> = {
  free: {
    maxClients: 1,
    maxPostsPerMonth: 10,
    maxPlatforms: 2,
    maxCampaigns: 0,
    aiContentGeneration: false,
    campaignsSupport: false,
    whiteLabel: false,
    prioritySupport: false,
    customBranding: false,
  },
  
  solo: {
    maxClients: 1,              // ארגון אחד (עצמו)
    maxPostsPerMonth: 100,
    maxPlatforms: 5,
    maxCampaigns: 3,
    aiContentGeneration: true,
    campaignsSupport: true,
    whiteLabel: false,
    prioritySupport: false,
    customBranding: false,
  },
  
  team: {
    maxClients: 1,              // ארגון אחד (עצמו)
    maxPostsPerMonth: 500,
    maxPlatforms: 10,
    maxCampaigns: 10,
    aiContentGeneration: true,
    campaignsSupport: true,
    whiteLabel: false,
    prioritySupport: true,
    customBranding: false,
  },
  
  agency: {
    maxClients: 20,             // סוכנות - עד 20 לקוחות
    maxPostsPerMonth: -1,       // unlimited
    maxPlatforms: -1,           // unlimited
    maxCampaigns: -1,           // unlimited
    aiContentGeneration: true,
    campaignsSupport: true,
    whiteLabel: true,
    prioritySupport: true,
    customBranding: true,
  },
  
  enterprise: {
    maxClients: -1,             // unlimited
    maxPostsPerMonth: -1,       // unlimited
    maxPlatforms: -1,           // unlimited
    maxCampaigns: -1,           // unlimited
    aiContentGeneration: true,
    campaignsSupport: true,
    whiteLabel: true,
    prioritySupport: true,
    customBranding: true,
  },
};

/**
 * בדיקה אם הגעת למגבלת פוסטים
 */
export function hasReachedPostLimit(
  currentCount: number,
  plan: SocialPlan
): { allowed: boolean; limit: number; message?: string } {
  const limits = SOCIAL_PLAN_LIMITS[plan];
  const limit = limits.maxPostsPerMonth;

  if (limit === -1) {
    return { allowed: true, limit: -1 }; // unlimited
  }

  if (currentCount >= limit) {
    return {
      allowed: false,
      limit,
      message: `הגעת למגבלת ${limit} פוסטים לחודש. שדרג את התוכנית שלך כדי להמשיך.`,
    };
  }

  return { allowed: true, limit };
}

/**
 * בדיקה אם הגעת למגבלת לקוחות
 */
export function hasReachedClientLimit(
  currentCount: number,
  plan: SocialPlan
): { allowed: boolean; limit: number; message?: string } {
  const limits = SOCIAL_PLAN_LIMITS[plan];
  const limit = limits.maxClients;

  if (limit === -1) {
    return { allowed: true, limit: -1 }; // unlimited
  }

  if (currentCount >= limit) {
    return {
      allowed: false,
      limit,
      message: `הגעת למגבלת ${limit} לקוחות. שדרג ל-Agency כדי להוסיף עוד לקוחות.`,
    };
  }

  return { allowed: true, limit };
}

/**
 * בדיקה אם הגעת למגבלת פלטפורמות
 */
export function hasReachedPlatformLimit(
  currentCount: number,
  plan: SocialPlan
): { allowed: boolean; limit: number; message?: string } {
  const limits = SOCIAL_PLAN_LIMITS[plan];
  const limit = limits.maxPlatforms;

  if (limit === -1) {
    return { allowed: true, limit: -1 }; // unlimited
  }

  if (currentCount >= limit) {
    return {
      allowed: false,
      limit,
      message: `הגעת למגבלת ${limit} פלטפורמות. שדרג את התוכנית שלך.`,
    };
  }

  return { allowed: true, limit };
}

/**
 * בדיקה אם יש גישה לתכונה
 */
export function hasFeatureAccess(
  plan: SocialPlan,
  feature: keyof SocialPlanLimits
): boolean {
  const limits = SOCIAL_PLAN_LIMITS[plan];
  return Boolean(limits[feature]);
}

/**
 * קבלת תווית התוכנית בעברית
 */
export function getSocialPlanLabel(plan: SocialPlan): string {
  const labels: Record<SocialPlan, string> = {
    free: 'חינם (נסיון)',
    solo: 'Solo - עסק בודד',
    team: 'Team - צוות',
    agency: 'Agency - סוכנות',
    enterprise: 'Enterprise - ארגוני',
  };
  return labels[plan];
}

/**
 * קבלת התוכנית המומלצת בהתאם למספר לקוחות
 */
export function getRecommendedPlan(clientsCount: number): SocialPlan {
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
 * חישוב % שימוש במכסה
 */
export function calculateQuotaUsage(
  current: number,
  plan: SocialPlan,
  type: 'posts' | 'clients' | 'platforms'
): { percentage: number; warning: boolean } {
  const limits = SOCIAL_PLAN_LIMITS[plan];
  let limit: number;

  switch (type) {
    case 'posts':
      limit = limits.maxPostsPerMonth;
      break;
    case 'clients':
      limit = limits.maxClients;
      break;
    case 'platforms':
      limit = limits.maxPlatforms;
      break;
  }

  if (limit === -1) {
    return { percentage: 0, warning: false }; // unlimited
  }

  const percentage = Math.round((current / limit) * 100);
  const warning = percentage >= 80; // אזהרה מעל 80%

  return { percentage, warning };
}
