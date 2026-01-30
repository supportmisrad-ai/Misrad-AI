'use server';

import { clerkClient } from '@clerk/nextjs/server';
import { sendInvitationEmail } from './email';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { createClient } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { getSystemFeatureFlags } from '@/lib/server/featureFlags';
import { computeWorkspaceCapabilities } from '@/lib/server/workspaceCapabilities';
import { countOrganizationActiveUsers } from '@/lib/server/seats';
import { getBaseUrl } from '@/lib/utils';

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getUnknownErrorMessage(error: unknown): string {
  if (!error) return '';
  if (error instanceof Error) return error.message;
  const obj = asObject(error);
  const msg = obj?.message;
  return typeof msg === 'string' ? msg : '';
}

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
      const supabase = createClient();
      const { data: socialUser } = await supabase
        .from('social_users')
        .select('id')
        .eq('clerk_user_id', clerkUserId)
        .maybeSingle();

      const socialUserObj = asObject(socialUser);
      const socialUserIdRaw = socialUserObj?.id;
      const socialUserId = socialUserIdRaw ? String(socialUserIdRaw) : null;
      if (socialUserId) {
        const { data: tm } = await supabase
          .from('social_team_members')
          .select('subscription_status')
          .eq('user_id', socialUserId)
          .eq('organization_id', ws.id)
          .maybeSingle();

        const tmObj = asObject(tm);
        const subscriptionStatusRaw = tmObj?.subscription_status;
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
    const invitationLink = `${baseUrl}/sign-up?redirect_url=${encodeURIComponent('/workspaces/onboarding')}`;
    
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
    console.error('Error inviting team member:', error);
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

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: `הזמנה להצטרף ל-Social OS - ${roleName}`,
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="he">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>הזמנה ל-Social OS</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; background-color: #f8fafc; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 24px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1e293b; font-size: 28px; font-weight: 900; margin: 0;">Social OS</h1>
              <p style="color: #64748b; font-size: 14px; margin-top: 8px;">מערכת הניהול המתקדמת לניהול סושיאל מדיה</p>
            </div>
            
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); border-radius: 16px; padding: 30px; text-align: center; margin-bottom: 30px;">
              <h2 style="color: white; font-size: 24px; font-weight: 900; margin: 0 0 10px 0;">שלום!</h2>
              <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 0;">הוזמנת להצטרף לצוות ב-Social OS</p>
            </div>

            <div style="margin-bottom: 30px;">
              <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                הוזמנת להצטרף לצוות ב-<strong>Social OS</strong> בתפקיד <strong>${roleName}</strong>.
              </p>
              <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                דרך המערכת תוכל:
              </p>
              <ul style="color: #475569; font-size: 15px; line-height: 1.8; padding-right: 20px;">
                <li>לנהל לקוחות וקמפיינים</li>
                <li>ליצור ולנהל תוכן</li>
                <li>לצפות בביצועים ואנליטיקס</li>
                <li>ולעבוד יחד עם הצוות</li>
              </ul>
            </div>

            <div style="text-align: center; margin-bottom: 30px;">
              <a 
                href="${params.invitationLink}" 
                style="display: inline-block; background-color: #3b82f6; color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 900; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);"
              >
                התחבר עכשיו
              </a>
            </div>

            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px;">
              <p style="color: #94a3b8; font-size: 12px; line-height: 1.6; margin: 0;">
                אם הכפתור לא עובד, העתק והדבק את הקישור הבא בדפדפן שלך:<br>
                <a href="${params.invitationLink}" style="color: #3b82f6; word-break: break-all;">${params.invitationLink}</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      // Don't fail the invitation if email fails - Clerk will send default email
      return { success: true };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error sending team invitation email:', error);
    // Don't fail the invitation if email fails
    return { success: true };
  }
}

