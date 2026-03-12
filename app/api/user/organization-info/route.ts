import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/server/logger';
import { DEFAULT_TRIAL_DAYS } from '@/lib/trial';

/**
 * GET /api/user/organization-info
 * 
 * Returns the current user's organization information including trial status.
 * Used by the trial-expired page to determine eligibility for new trial.
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Find user's organization via their profile
    const profile = await prisma.profile.findFirst({
      where: { clerkUserId: userId },
      select: { organizationId: true },
    });

    if (!profile?.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No organization found' },
        { status: 404 }
      );
    }

    // Get organization details
    const organization = await prisma.organization.findUnique({
      where: { id: profile.organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        subscription_status: true,
        trial_start_date: true,
        trial_days: true,
        trial_extended_days: true,
      },
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Calculate trial info
    const trialDays = organization.trial_days || DEFAULT_TRIAL_DAYS;
    const extendedDays = organization.trial_extended_days || 0;
    const totalTrialDays = trialDays + extendedDays;
    
    let trialEndDate: Date | null = null;
    let daysSinceExpired = 0;
    let canStartNewTrial = false;

    if (organization.trial_start_date) {
      trialEndDate = new Date(organization.trial_start_date);
      trialEndDate.setDate(trialEndDate.getDate() + totalTrialDays);
      
      const now = new Date();
      if (now > trialEndDate) {
        daysSinceExpired = Math.floor((now.getTime() - trialEndDate.getTime()) / (1000 * 60 * 60 * 24));
        // Allow new trial if expired more than 30 days ago
        canStartNewTrial = daysSinceExpired >= 30;
      }
    }

    return NextResponse.json({
      success: true,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        subscriptionStatus: organization.subscription_status,
        trialEndDate: trialEndDate?.toISOString() || null,
        daysSinceExpired,
        canStartNewTrial,
      },
    });
  } catch (error) {
    logger.error('organization-info-api', 'Error fetching organization info', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
