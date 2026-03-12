import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/server/logger';
import { DEFAULT_TRIAL_DAYS } from '@/lib/trial';

const MIN_DAYS_BETWEEN_TRIALS = 30; // Minimum 30 days between trial periods

/**
 * POST /api/trial/reset
 * 
 * Resets the trial for an eligible user who has passed the minimum
 * waiting period since their previous trial expired.
 * 
 * Requirements:
 * - User must be authenticated
 * - Previous trial must have expired at least 30 days ago
 * - Organization must be in 'expired' status
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Find user's organization
    const profile = await prisma.profile.findFirst({
      where: { clerkUserId: userId },
      select: { 
        organizationId: true,
        role: true,
      },
    });

    if (!profile?.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No organization found' },
        { status: 404 }
      );
    }

    // Only allow owners to reset trial
    if (profile.role !== 'owner' && profile.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Only organization owners can reset trial' },
        { status: 403 }
      );
    }

    // Get organization details
    const organization = await prisma.organization.findUnique({
      where: { id: profile.organizationId },
      select: {
        id: true,
        slug: true,
        subscription_status: true,
        trial_start_date: true,
        trial_days: true,
        trial_extended_days: true,
        trial_reset_count: true,
      },
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check if organization is in expired status
    if (organization.subscription_status !== 'expired') {
      return NextResponse.json(
        { success: false, error: 'Trial can only be reset for expired subscriptions' },
        { status: 400 }
      );
    }

    // Check if enough time has passed since last trial
    if (organization.trial_start_date) {
      const trialDays = organization.trial_days || DEFAULT_TRIAL_DAYS;
      const extendedDays = organization.trial_extended_days || 0;
      const totalTrialDays = trialDays + extendedDays;
      
      const trialEndDate = new Date(organization.trial_start_date);
      trialEndDate.setDate(trialEndDate.getDate() + totalTrialDays);
      
      const now = new Date();
      const daysSinceExpired = Math.floor((now.getTime() - trialEndDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceExpired < MIN_DAYS_BETWEEN_TRIALS) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Trial can only be reset after ${MIN_DAYS_BETWEEN_TRIALS} days. Please wait ${MIN_DAYS_BETWEEN_TRIALS - daysSinceExpired} more days.`,
            daysRemaining: MIN_DAYS_BETWEEN_TRIALS - daysSinceExpired,
          },
          { status: 400 }
        );
      }
    }

    // Check max reset count (prevent abuse)
    const resetCount = organization.trial_reset_count || 0;
    if (resetCount >= 2) {
      return NextResponse.json(
        { success: false, error: 'Maximum trial resets reached. Please contact support.' },
        { status: 400 }
      );
    }

    // Reset the trial
    const now = new Date();
    const updatedOrg = await prisma.organization.update({
      where: { id: organization.id },
      data: {
        subscription_status: 'trial',
        trial_start_date: now,
        trial_days: DEFAULT_TRIAL_DAYS,
        trial_extended_days: 0,
        trial_reset_count: { increment: 1 },
        updated_at: now,
      },
      select: {
        id: true,
        slug: true,
        subscription_status: true,
        trial_start_date: true,
      },
    });

    // Also update team_members status
    await prisma.teamMember.updateMany({
      where: { organization_id: organization.id },
      data: {
        subscription_status: 'trial',
        trial_start_date: now,
        trial_days: DEFAULT_TRIAL_DAYS,
        updated_at: now,
      },
    });

    logger.info('trial-reset', 'Trial reset successful', {
      organizationId: organization.id,
      userId,
      resetCount: resetCount + 1,
    });

    return NextResponse.json({
      success: true,
      message: 'Trial has been reset successfully',
      organization: {
        id: updatedOrg.id,
        slug: updatedOrg.slug,
        subscriptionStatus: updatedOrg.subscription_status,
        trialStartDate: updatedOrg.trial_start_date?.toISOString(),
      },
      redirectUrl: '/workspaces/onboarding',
    });
  } catch (error) {
    logger.error('trial-reset-api', 'Error resetting trial', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
