'use server';

import { logger } from '@/lib/server/logger';
import { clerkClient } from '@clerk/nextjs/server';
import { sendInvitationEmail } from './email';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { getSystemFeatureFlags } from '@/lib/server/featureFlags';
import { computeWorkspaceCapabilities } from '@/lib/server/workspaceCapabilities';
import { countOrganizationActiveUsers } from '@/lib/server/seats';
import { getBaseUrl } from '@/lib/utils';
import { generateBaseEmailTemplate, EmailTemplateComponents } from '@/lib/email-templates';

import { asObject, getErrorMessage as getUnknownErrorMessage } from '@/lib/shared/unknown';

/**
 * Server Action: Send team member invitation via Clerk
 */
export async function inviteTeamMember(
  email: string,
  role: string,
  orgSlug?: string
): Promise<{
  success: boolean;
  invitationId?: string;
  error?: string;
  code?: 'UPGRADE_REQUIRED';
  paywall?: { title: string; message: string; recommendedPackageType?: 'the_closer' | 'the_authority' | 'the_operator' | 'the_empire' | 'solo' | 'the_mentor' };
}> {
  try {
    if (!email) {
      return {
        success: false,
        error: 'נדרש אימייל',
      };
    }

    if (!orgSlug) {
      return {
        success: false,
        error: 'חסרה סביבת עבודה (orgSlug)',
      };
    }

    const ws = await requireWorkspaceAccessByOrgSlug(String(orgSlug));

    const flags = await getSystemFeatureFlags();
    const caps = computeWorkspaceCapabilities({
      entitlements: ws?.entitlements,
      fullOfficeRequiresFinance: Boolean(flags.fullOfficeRequiresFinance),
      seatsAllowedOverride: ws.seatsAllowed,
    });

    if (!caps.isTeamManagementEnabled) {
      return {
        success: false,
        error: 'ניהול צוות זמין רק עם מודול Nexus',
      };
    }

    const clerkUserId = await getCurrentUserId();
    if (clerkUserId) {
      const socialUser = await prisma.organizationUser.findUnique({
        where: { clerk_user_id: clerkUserId },
        select: { id: true },
      });

      const socialUserId = socialUser?.id ? String(socialUser.id) : null;
      if (socialUserId) {
        const tm = await prisma.teamMember.findFirst({
          where: {
            user_id: String(socialUserId),
            organization_id: String(ws.id),
          },
          select: { subscription_status: true },
        });

        const subscriptionStatusRaw = tm?.subscription_status;
        const subscriptionStatus = subscriptionStatusRaw ? String(subscriptionStatusRaw) : 'trial';
        const isTrial = subscriptionStatus === 'trial';

        if (isTrial) {
          const activeUsers = await countOrganizationActiveUsers(ws.id);
          if (activeUsers >= 1) {
            return {
              success: false,
              code: 'UPGRADE_REQUIRED',
              error: 'ניהול צוות זמין למנויים משלמים. שדרג עכשיו',
              paywall: {
                title: 'שדרוג נדרש כדי להוסיף משתמשים',
                message: 'ניהול צוות זמין למנויים משלמים. שדרג עכשיו',
                recommendedPackageType: 'the_closer',
              },
            };
          }
        }
      }
    }

    const activeUsers = await countOrganizationActiveUsers(ws.id);
    if (activeUsers >= caps.seatsAllowed) {
      return {
        success: false,
        error: `הגעתם למכסת המשתמשים (${activeUsers} מתוך ${caps.seatsAllowed}). כדי להוסיף משתמשים יש לשדרג חבילה`,
      };
    }

    // Create invitation via Clerk
    const client = await clerkClient();
    const invitation = await client.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: {
        role: role,
        orgSlug: orgSlug || null,
      },
    });

    // Create invitation link - Clerk will send the invitation email automatically
    // We can also send a custom email with a link to sign-in
    const baseUrl = getBaseUrl();
    const lobbyRedirect = orgSlug ? `${baseUrl}/w/${encodeURIComponent(orgSlug)}/lobby` : `${baseUrl}/`;
    const invitationLink = `${baseUrl}/login?mode=sign-up&redirect=${encodeURIComponent('/workspaces/onboarding')}`;
    
    // Send custom invitation email
    const emailResult = await sendTeamInvitationEmail({
      email,
      invitationLink,
      role,
    });

    return {
      success: true,
      invitationId: invitation.id,
    };
  } catch (error: unknown) {
    logger.error('auth', 'Error inviting team member:', error);
    return {
      success: false,
      error: getUnknownErrorMessage(error) || 'שגיאה בשליחת הזמנה',
    };
  }
}

/**
 * Helper: Send team invitation email
 */
async function sendTeamInvitationEmail(params: {
  email: string;
  invitationLink: string;
  role: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { sendInvitationEmail } = await import('./email');
    const { resend, isResendConfigured } = await import('@/lib/resend');

    const resolveRecipientEmail = (originalTo: string): string => {
      const override = process.env.RESEND_TEST_TO;
      if (!override) return originalTo;
      return String(override).trim() || originalTo;
    };

    if (!isResendConfigured() || !resend) {
      // If Resend is not configured, Clerk will send the default invitation email
      return { success: true };
    }

    const roleNames: Record<string, string> = {
      account_manager: 'מנהל לקוח',
      designer: 'מעצב גרפי',
      content_creator: 'קופירייטר',
      social_manager: 'מנהל סושיאל מדיה',
    };

    const roleName = roleNames[params.role] || params.role;

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const toEmail = resolveRecipientEmail(params.email);

    const bodyContent = `
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">שלום,</div>
        
        <div style="font-size:17px;line-height:1.8;color:#334155;margin-bottom:24px;">
            הוזמנת להצטרף לצוות ב-MISRAD בתפקיד <strong style="color:#6366f1;">${roleName}</strong>.
        </div>

        ${EmailTemplateComponents.generateCTAButton({
            text: 'השלמת הרשמה \u2192',
            url: params.invitationLink,
        })}

        <div style="margin-top:28px;font-size:12px;color:#94a3b8;line-height:1.6;text-align:center;">
            הכפתור לא עובד? <a href="${params.invitationLink}" style="color:#6366f1;word-break:break-all;">לחץ כאן</a>
        </div>
    `;

    const html = generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'הזמנה להצטרף לצוות',
        headerGradient: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
        bodyContent,
        showSocialLinks: false,
    });

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: `הזמנה להצטרף ל-MISRAD - ${roleName}`,
      html,
    });

    if (error) {
      logger.error('auth', 'Resend error:', error);
      // Don't fail the invitation if email fails - Clerk will send default email
      return { success: true };
    }

    return { success: true };
  } catch (error: unknown) {
    logger.error('auth', 'Error sending team invitation email:', error);
    // Don't fail the invitation if email fails
    return { success: true };
  }
}

