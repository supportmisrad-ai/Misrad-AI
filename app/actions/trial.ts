'use server';



import { logger } from '@/lib/server/logger';
/**
 * Trial & Subscription Management Server Actions
 */

import { requireAuth, createSuccessResponse, createErrorResponse } from '@/lib/errorHandler';
import { 
  getTrialInfo, 
  initializeTrial, 
  DEFAULT_TRIAL_DAYS,
  type SubscriptionStatus 
} from '@/lib/trial';

import { requireSuperAdmin } from '@/lib/auth';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

import prisma from '@/lib/prisma';

/**
 * Get trial information for current user
 */
export async function getCurrentUserTrialInfo(): Promise<{
  success: boolean;
  data?: {
    status: SubscriptionStatus;
    trialStartDate: string | null;
    trialDays: number;
    trialEndDate: string | null;
    daysRemaining: number | null;
    isExpired: boolean;
    isActive: boolean;
  };
  error?: string;
}> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    const userId = authCheck.userId || authCheck.data?.userId;
    if (!userId) {
      return { success: false, error: 'נדרשת התחברות' };
    }

    const member = await prisma.teamMember.findFirst({
      where: { user_id: String(userId) },
      select: {
        trial_start_date: true,
        trial_days: true,
        subscription_status: true,
        subscription_start_date: true,
      },
    });

    if (!member) {
      return createErrorResponse('Not found', 'שגיאה בטעינת פרטי טריאל');
    }

    const trialInfo = getTrialInfo(
      member.trial_start_date ? new Date(member.trial_start_date) : null,
      member.trial_days || DEFAULT_TRIAL_DAYS,
      member.subscription_status as SubscriptionStatus | null,
      member.subscription_start_date ? new Date(member.subscription_start_date) : null
    );

    return createSuccessResponse({
      status: trialInfo.status,
      trialStartDate: trialInfo.trialStartDate?.toISOString() || null,
      trialDays: trialInfo.trialDays,
      trialEndDate: trialInfo.trialEndDate?.toISOString() || null,
      daysRemaining: trialInfo.daysRemaining,
      isExpired: trialInfo.isExpired,
      isActive: trialInfo.isActive,
    });
  } catch (error: unknown) {
    logger.error('getCurrentUserTrialInfo', 'Error:', error);
    return createErrorResponse(error, 'שגיאה בטעינת פרטי טריאל');
  }
}

/**
 * Check and update expired trials
 * Should be called periodically (e.g., via cron job or on user login)
 */
export async function checkAndUpdateExpiredTrials(): Promise<{
  success: boolean;
  data?: { updated: number };
  error?: string;
}> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    await requireSuperAdmin();

    return await withTenantIsolationContext(
      {
        source: 'app/actions/trial.checkAndUpdateExpiredTrials',
        reason: 'check_and_update_expired_trials',
        mode: 'global_admin',
        isSuperAdmin: true,
      },
      async () => {

    // Only admins can trigger this check
    // TODO: Add admin check here if needed

    const now = new Date();

    // Get all users in trial status
    const trialUsers = await prisma.teamMember.findMany({
      where: { subscription_status: 'trial' },
      select: { id: true, user_id: true, trial_start_date: true, trial_days: true, subscription_status: true },
    });

    if (!trialUsers || trialUsers.length === 0) {
      return createSuccessResponse({ updated: 0 });
    }

    let updatedCount = 0;

    for (const user of trialUsers) {
      if (!user.trial_start_date) continue;

      const trialStartDate = new Date(user.trial_start_date);
      const trialDays = user.trial_days || DEFAULT_TRIAL_DAYS;
      const trialEndDate = new Date(trialStartDate);
      trialEndDate.setDate(trialEndDate.getDate() + trialDays);

      // Check if trial expired
      if (now > trialEndDate) {
        try {
          await prisma.teamMember.update({
            where: { id: String(user.id) },
            data: {
              subscription_status: 'expired',
              updated_at: now,
            },
          });
          updatedCount++;
        } catch (updateError: unknown) {
          logger.error('checkAndUpdateExpiredTrials', 'Error updating user ${String(user.id)}:', updateError);
        }
      }
    }

        return createSuccessResponse({ updated: updatedCount });
      }
    );
  } catch (error: unknown) {
    logger.error('checkAndUpdateExpiredTrials', 'Error:', error);
    return createErrorResponse(error, 'שגיאה בעדכון טריאלים פגי תוקף');
  }
}

/**
 * Start subscription (activate paid plan)
 */
export async function startSubscription(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return authCheck;
    }

    await requireSuperAdmin();

    return await withTenantIsolationContext(
      {
        source: 'app/actions/trial.startSubscription',
        reason: 'start_subscription',
        mode: 'global_admin',
        isSuperAdmin: true,
      },
      async () => {

    const now = new Date();

    await prisma.teamMember.updateMany({
      where: { user_id: String(authCheck.userId) },
      data: {
        subscription_status: 'active',
        subscription_start_date: now,
        plan: 'pro',
        updated_at: now,
      },
    });

        return createSuccessResponse(true);
      }
    );
  } catch (error: unknown) {
    logger.error('startSubscription', 'Error:', error);
    return createErrorResponse(error, 'שגיאה בהפעלת מנוי');
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return authCheck;
    }

    await requireSuperAdmin();

    return await withTenantIsolationContext(
      {
        source: 'app/actions/trial.cancelSubscription',
        reason: 'cancel_subscription',
        mode: 'global_admin',
        isSuperAdmin: true,
      },
      async () => {

    const now = new Date();

    await prisma.teamMember.updateMany({
      where: { user_id: String(authCheck.userId) },
      data: {
        subscription_status: 'cancelled',
        plan: 'free',
        updated_at: now,
      },
    });

        return createSuccessResponse(true);
      }
    );
  } catch (error: unknown) {
    logger.error('cancelSubscription', 'Error:', error);
    return createErrorResponse(error, 'שגיאה בביטול מנוי');
  }
}

