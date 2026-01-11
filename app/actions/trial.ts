'use server';

/**
 * Trial & Subscription Management Server Actions
 */

import { createClient } from '@/lib/supabase';
import { requireAuth, createSuccessResponse, createErrorResponse } from '@/lib/errorHandler';
import { 
  getTrialInfo, 
  initializeTrial, 
  DEFAULT_TRIAL_DAYS,
  type SubscriptionStatus 
} from '@/lib/trial';

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
      return authCheck as any;
    }

    const supabase = createClient();

    // Get user's team member record
    const { data: member, error } = await supabase
      .from('social_team_members')
      .select('trial_start_date, trial_days, subscription_status, subscription_start_date')
      .eq('user_id', authCheck.userId)
      .single();

    if (error || !member) {
      return createErrorResponse(error, 'שגיאה בטעינת פרטי טריאל');
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
  } catch (error: any) {
    console.error('[getCurrentUserTrialInfo] Error:', error);
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
      return authCheck as any;
    }

    // Only admins can trigger this check
    // TODO: Add admin check here if needed

    const supabase = createClient();
    const now = new Date();

    // Get all users in trial status
    const { data: trialUsers, error: fetchError } = await supabase
      .from('social_team_members')
      .select('id, user_id, trial_start_date, trial_days, subscription_status')
      .eq('subscription_status', 'trial');

    if (fetchError) {
      return createErrorResponse(fetchError, 'שגיאה בטעינת משתמשי טריאל');
    }

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
        // Update status to expired
        const { error: updateError } = await supabase
          .from('social_team_members')
          .update({ 
            subscription_status: 'expired',
            updated_at: now.toISOString()
          })
          .eq('id', user.id);

        if (!updateError) {
          updatedCount++;
        } else {
          console.error(`[checkAndUpdateExpiredTrials] Error updating user ${user.id}:`, updateError);
        }
      }
    }

    return createSuccessResponse({ updated: updatedCount });
  } catch (error: any) {
    console.error('[checkAndUpdateExpiredTrials] Error:', error);
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
      return authCheck as any;
    }

    const supabase = createClient();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('social_team_members')
      .update({
        subscription_status: 'active',
        subscription_start_date: now,
        plan: 'pro', // Upgrade to pro when subscription starts
        updated_at: now,
      })
      .eq('user_id', authCheck.userId);

    if (error) {
      return createErrorResponse(error, 'שגיאה בהפעלת מנוי');
    }

    return createSuccessResponse(true);
  } catch (error: any) {
    console.error('[startSubscription] Error:', error);
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
      return authCheck as any;
    }

    const supabase = createClient();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('social_team_members')
      .update({
        subscription_status: 'cancelled',
        plan: 'free', // Downgrade to free
        updated_at: now,
      })
      .eq('user_id', authCheck.userId);

    if (error) {
      return createErrorResponse(error, 'שגיאה בביטול מנוי');
    }

    return createSuccessResponse(true);
  } catch (error: any) {
    console.error('[cancelSubscription] Error:', error);
    return createErrorResponse(error, 'שגיאה בביטול מנוי');
  }
}

