'use server';

import { logger } from '@/lib/server/logger';
import prisma from '@/lib/prisma';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';
import { sendTrialExpiryWarningEmail, sendTrialExpiredEmail } from '@/lib/email';
import { getBaseUrl } from '@/lib/utils';

/**
 * Check and send warning emails for trials approaching expiry
 * This function is designed to be called by a cron job
 */
export async function sendTrialExpiryWarnings() {
  try {
    logger.info('sendTrialExpiryWarnings', 'Starting trial expiry warning check');

    const now = new Date();
    const WARNING_DAYS = [7, 3, 1]; // Send warnings at 7, 3, and 1 days before expiry

    // Find all organizations in trial status
    const result = await withTenantIsolationContext(
      {
        source: 'lib/services/check-expired-trials.sendTrialExpiryWarnings',
        reason: 'cron_send_trial_warnings',
        mode: 'global_admin',
        isSuperAdmin: true,
        suppressReporting: true,
      },
      async () => {
        // Find organizations with active trials (exclude coupon / paid users)
        const organizations = await prisma.organization.findMany({
          where: {
            subscription_status: 'trial',
            trial_start_date: {
              not: null,
            },
            coupon_redemptions: { none: {} },
          },
          select: {
            id: true,
            name: true,
            slug: true,
            trial_start_date: true,
            trial_days: true,
            trial_extended_days: true,
            owner_id: true,
            owner: {
              select: {
                email: true,
                full_name: true,
              },
            },
          },
        });

        logger.info('sendTrialExpiryWarnings', `Found ${organizations.length} organizations in trial status`);

        const warningsSent = [];

        // Check each organization
        for (const org of organizations) {
          if (!org.trial_start_date || !org.owner?.email) continue;

          const trialStartDate = new Date(org.trial_start_date);
          const totalTrialDays = (org.trial_days || 7) + (org.trial_extended_days || 0);
          const trialEndDate = new Date(trialStartDate);
          trialEndDate.setDate(trialEndDate.getDate() + totalTrialDays);

          // Calculate days remaining
          const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          // Check if we should send a warning email
          if (WARNING_DAYS.includes(daysRemaining)) {
            // Check if we already sent a warning for this day threshold
            const sentRecently = await prisma.billing_events.findFirst({
              where: {
                organization_id: org.id,
                event_type: 'trial_expiry_warning',
                payload: {
                  path: ['daysRemaining'],
                  equals: daysRemaining,
                },
                created_at: {
                  gte: new Date(now.getTime() - 12 * 60 * 60 * 1000), // Within last 12 hours
                },
              },
            });

            if (!sentRecently) {
              const portalUrl = `${getBaseUrl()}/subscribe/checkout`;

              // Send warning email
              const emailResult = await sendTrialExpiryWarningEmail({
                toEmail: org.owner.email,
                organizationName: org.name,
                ownerName: org.owner.full_name,
                daysRemaining,
                portalUrl,
              });

              if (emailResult.success) {
                // Log the warning in billing_events
                await prisma.billing_events.create({
                  data: {
                    organization_id: org.id,
                    event_type: 'trial_expiry_warning',
                    payload: {
                      daysRemaining,
                      trialEndDate: trialEndDate.toISOString(),
                      ownerEmail: org.owner.email,
                      ownerName: org.owner.full_name,
                      sentAt: now.toISOString(),
                    },
                  },
                });

                warningsSent.push({
                  organizationId: org.id,
                  organizationName: org.name,
                  ownerEmail: org.owner.email,
                  daysRemaining,
                });

                logger.info('sendTrialExpiryWarnings', 'Warning email sent', {
                  organizationId: org.id,
                  organizationName: org.name,
                  daysRemaining,
                  ownerEmail: org.owner.email,
                });
              } else {
                logger.warn('sendTrialExpiryWarnings', 'Failed to send warning email', {
                  organizationId: org.id,
                  error: emailResult.error,
                });
              }
            }
          }
        }

        return {
          totalChecked: organizations.length,
          warningsSent: warningsSent.length,
          warnings: warningsSent,
        };
      }
    );

    logger.info('sendTrialExpiryWarnings', 'Completed trial expiry warning check', {
      totalChecked: result.totalChecked,
      warningsSent: result.warningsSent,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    logger.error('sendTrialExpiryWarnings', 'Error sending trial expiry warnings', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check and disable organizations with expired trials
 * This function is designed to be called by a cron job
 */
export async function checkAndDisableExpiredOrganizations() {
  try {
    logger.info('checkAndDisableExpiredOrganizations', 'Starting expired trial check');

    const now = new Date();

    // Find all organizations in trial status
    const result = await withTenantIsolationContext(
      {
        source: 'app/actions/check-expired-trials.checkAndDisableExpiredOrganizations',
        reason: 'cron_check_expired_trials',
        mode: 'global_admin',
        isSuperAdmin: true,
        suppressReporting: true,
      },
      async () => {
        // Find organizations with expired trials (exclude coupon / paid users)
        const organizations = await prisma.organization.findMany({
          where: {
            subscription_status: 'trial',
            trial_start_date: {
              not: null,
            },
            coupon_redemptions: { none: {} },
          },
          select: {
            id: true,
            name: true,
            slug: true,
            trial_start_date: true,
            trial_days: true,
            trial_extended_days: true,
            owner_id: true,
            owner: {
              select: {
                email: true,
                full_name: true,
              },
            },
          },
        });

        logger.info('checkAndDisableExpiredOrganizations', `Found ${organizations.length} organizations in trial status`);

        const expiredOrganizations = [];

        // Check each organization
        for (const org of organizations) {
          if (!org.trial_start_date) continue;

          const trialStartDate = new Date(org.trial_start_date);
          const totalTrialDays = (org.trial_days || 7) + (org.trial_extended_days || 0);
          const trialEndDate = new Date(trialStartDate);
          trialEndDate.setDate(trialEndDate.getDate() + totalTrialDays);

          // Check if trial has expired
          if (now > trialEndDate) {
            expiredOrganizations.push({
              id: org.id,
              name: org.name,
              slug: org.slug,
              owner: org.owner,
              trialEndDate: trialEndDate.toISOString(),
              daysExpired: Math.floor((now.getTime() - trialEndDate.getTime()) / (1000 * 60 * 60 * 24)),
            });
          }
        }

        logger.info('checkAndDisableExpiredOrganizations', `Found ${expiredOrganizations.length} expired trials`);

        // Update expired organizations to 'expired' status
        if (expiredOrganizations.length > 0) {
          const expiredIds = expiredOrganizations.map((o) => o.id);

          await prisma.organization.updateMany({
            where: {
              id: {
                in: expiredIds,
              },
              subscription_status: 'trial', // Double-check to avoid race conditions
            },
            data: {
              subscription_status: 'expired',
              updated_at: now,
            },
          });

          // Log each expired organization and send expiry email
          const portalUrl = `${getBaseUrl()}/subscribe/checkout`;
          for (const org of expiredOrganizations) {
            logger.info('checkAndDisableExpiredOrganizations', 'Disabled expired trial', {
              organizationId: org.id,
              organizationName: org.name,
              organizationSlug: org.slug,
              ownerEmail: org.owner?.email,
              ownerName: org.owner?.full_name,
              trialEndDate: org.trialEndDate,
              daysExpired: org.daysExpired,
            });

            // Send "trial expired" email (day 0)
            if (org.owner?.email && org.daysExpired <= 1) {
              try {
                await sendTrialExpiredEmail({
                  toEmail: org.owner.email,
                  organizationName: org.name,
                  ownerName: org.owner.full_name,
                  portalUrl,
                });
              } catch (emailErr) {
                logger.warn('checkAndDisableExpiredOrganizations', 'Failed to send trial expired email', {
                  organizationId: org.id,
                  error: emailErr instanceof Error ? emailErr.message : 'Unknown',
                });
              }
            }
          }
        }

        return {
          totalChecked: organizations.length,
          totalExpired: expiredOrganizations.length,
          expiredOrganizations: expiredOrganizations.map((o) => ({
            id: o.id,
            name: o.name,
            slug: o.slug,
            ownerEmail: o.owner?.email,
            daysExpired: o.daysExpired,
          })),
        };
      }
    );

    logger.info('checkAndDisableExpiredOrganizations', 'Completed expired trial check', {
      totalChecked: result.totalChecked,
      totalExpired: result.totalExpired,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    logger.error('checkAndDisableExpiredOrganizations', 'Error checking expired trials', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if a specific organization's trial is expired
 * Used for middleware/auth checks
 */
export async function isOrganizationTrialExpired(organizationId: string): Promise<boolean> {
  try {
    const org = await withTenantIsolationContext(
      {
        source: 'app/actions/check-expired-trials.isOrganizationTrialExpired',
        reason: 'check_single_org_trial_status',
        mode: 'global_admin',
        isSuperAdmin: true,
        suppressReporting: true,
      },
      async () => {
        return await prisma.organization.findUnique({
          where: { id: organizationId },
          select: {
            subscription_status: true,
            trial_start_date: true,
            trial_days: true,
            trial_extended_days: true,
          },
        });
      }
    );

    if (!org) return false;

    // If already marked as expired
    if (org.subscription_status === 'expired') return true;

    // If not in trial, not expired
    if (org.subscription_status !== 'trial') return false;

    // Check if trial date has passed
    if (!org.trial_start_date) return false;

    const now = new Date();
    const trialStartDate = new Date(org.trial_start_date);
    const totalTrialDays = (org.trial_days || 7) + (org.trial_extended_days || 0);
    const trialEndDate = new Date(trialStartDate);
    trialEndDate.setDate(trialEndDate.getDate() + totalTrialDays);

    return now > trialEndDate;
  } catch (error) {
    logger.error('isOrganizationTrialExpired', 'Error checking trial status', error);
    return false;
  }
}
