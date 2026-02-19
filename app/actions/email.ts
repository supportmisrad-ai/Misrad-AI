'use server';


import { logger } from '@/lib/server/logger';
import { resend, isResendConfigured } from '@/lib/resend';
import { Client } from '@/types';
import { sendMisradWelcomeEmail } from '@/lib/email';
import { generateBaseEmailTemplate, EmailTemplateComponents } from '@/lib/email-templates';

import { requireAuth } from '@/lib/errorHandler';
import { requireSuperAdmin } from '@/lib/auth';

import { asObject, getErrorMessage as getUnknownErrorMessage } from '@/lib/shared/unknown';

function resolveRecipientEmail(originalTo: string): string {
  const override = process.env.RESEND_TEST_TO;
  if (!override) return originalTo;
  return String(override).trim() || originalTo;
}

interface SendInvitationEmailParams {
  clientName: string;
  clientEmail: string;
  invitationLink: string;
  planName: string;
  planPrice: number;
}

/**
 * Server Action: Send invitation email to client using Resend
 */
export async function sendInvitationEmail(params: SendInvitationEmailParams) {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return {
        success: false,
        error: authCheck.error || 'נדרשת התחברות',
      };
    }

    if (!isResendConfigured()) {
      return {
        success: false,
        error: 'Resend לא מוגדר. נא להגדיר RESEND_API_KEY במשתני הסביבה.',
      };
    }

    if (!resend) {
      return {
        success: false,
        error: 'לקוח Resend לא אותחל.',
      };
    }

    const { clientName, clientEmail, invitationLink, planName, planPrice } = params;

    let systemSupportEmail = 'support@misrad-ai.com';
    try {
      const { getSystemEmailSettingsUnsafe } = await import('@/lib/server/systemEmailSettings');
      const settings = await getSystemEmailSettingsUnsafe();
      if (settings.supportEmail) {
        systemSupportEmail = String(settings.supportEmail).trim() || systemSupportEmail;
      }
    } catch {
      systemSupportEmail = (process.env.MISRAD_SUPPORT_EMAIL || systemSupportEmail).trim() || systemSupportEmail;
    }

    // Get the "from" email from environment or use default
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const toEmail = resolveRecipientEmail(clientEmail);

    const bodyContent = `
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">${clientName},</div>
        
        <div style="font-size:17px;line-height:1.8;color:#334155;margin-bottom:24px;">
            הוזמנת להצטרף ל-MISRAD — מערכת AI לניהול הארגון.
        </div>

        <div style="margin:24px 0;background:#f8fafc;border:2px solid #e2e8f0;border-radius:14px;padding:22px 24px;">
            <div style="font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">חבילת שירות</div>
            <div style="font-size:18px;font-weight:900;color:#0f172a;margin-top:6px;">${planName} — ₪${planPrice.toLocaleString()}/חודש</div>
        </div>

        ${EmailTemplateComponents.generateCTAButton({
            text: 'הגדרת חשבון →',
            url: invitationLink,
        })}

        <div style="margin-top:28px;font-size:12px;color:#94a3b8;line-height:1.6;text-align:center;">
            הכפתור לא עובד? <a href="${invitationLink}" style="color:#6366f1;word-break:break-all;">לחץ כאן</a><br />
            שאלות? <a href="mailto:${systemSupportEmail}" style="color:#6366f1;">${systemSupportEmail}</a>
        </div>
    `;

    const html = generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'הזמנה להצטרף',
        headerGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        bodyContent,
        showSocialLinks: false,
    });

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: `הזמנה להצטרף ל-MISRAD - ${clientName}`,
      html,
    });

    if (error) {
      logger.error('email', 'Resend error:', error);
      return {
        success: false,
        error: error.message || 'שגיאה בשליחת מייל',
      };
    }

    return {
      success: true,
      messageId: data?.id,
      message: 'מייל הזמנה נשלח בהצלחה',
    };
  } catch (error: unknown) {
    logger.error('email', 'Error sending invitation email:', error);
    return {
      success: false,
      error: getUnknownErrorMessage(error) || 'אירעה שגיאה בלתי צפויה',
    };
  }
}

export async function sendMisradWelcomeEmailAction(params: {
  toEmail: string;
  ownerName?: string | null;
  signInUrl: string;
}) {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return {
        success: false,
        error: authCheck.error || 'נדרשת התחברות',
      };
    }

    if (!isResendConfigured()) {
      return {
        success: false,
        error: 'Resend לא מוגדר. נא להגדיר RESEND_API_KEY במשתני הסביבה.',
      };
    }

    const toEmail = String(params.toEmail || '').trim();
    const signInUrl = String(params.signInUrl || '').trim();
    const ownerName = params.ownerName ? String(params.ownerName) : null;

    if (!toEmail) {
      return { success: false, error: 'toEmail חסר' };
    }

    if (!signInUrl) {
      return { success: false, error: 'signInUrl חסר' };
    }

    const res = await sendMisradWelcomeEmail({
      toEmail,
      ownerName,
      signInUrl,
    });

    if (!res.success) {
      return { success: false, error: res.error || 'שגיאה בשליחת מייל' };
    }

    return { success: true };
  } catch (error: unknown) {
    logger.error('email', 'Error sending MISRAD welcome email (action):', error);
    return {
      success: false,
      error: getUnknownErrorMessage(error) || 'אירעה שגיאה בלתי צפויה',
    };
  }
}

/**
 * Server Action: Send test email
 */
export async function sendTestEmail(to: string) {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return {
        success: false,
        error: authCheck.error || 'נדרשת התחברות',
      };
    }

    try {
      await requireSuperAdmin();
    } catch {
      return {
        success: false,
        error: 'אין הרשאה',
      };
    }

    if (!isResendConfigured()) {
      return {
        success: false,
        error: 'Resend לא מוגדר. נא להגדיר RESEND_API_KEY במשתני הסביבה.',
      };
    }

    if (!resend) {
      return {
        success: false,
        error: 'לקוח Resend לא אותחל.',
      };
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const toEmail = resolveRecipientEmail(to);

    const testHtml = generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'מייל בדיקה',
        bodyContent: `
            <div style="text-align:center;margin:24px 0;">
                ${EmailTemplateComponents.Icons.CircleCheck}
            </div>
            <div style="font-size:18px;font-weight:900;color:#0f172a;text-align:center;margin-bottom:16px;">המייל נשלח בהצלחה</div>
            <div style="font-size:15px;color:#334155;text-align:center;line-height:1.7;">Resend מוגדר ועובד כראוי.</div>
        `,
        showSocialLinks: false,
    });

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: 'מייל בדיקה מ-MISRAD AI',
      html: testHtml,
    });

    if (error) {
      logger.error('email', 'Resend error:', error);
      return {
        success: false,
        error: error.message || 'שגיאה בשליחת מייל בדיקה',
      };
    }

    return {
      success: true,
      messageId: data?.id,
      message: 'מייל בדיקה נשלח בהצלחה',
    };
  } catch (error: unknown) {
    logger.error('email', 'Error sending test email:', error);
    return {
      success: false,
      error: getUnknownErrorMessage(error) || 'אירעה שגיאה בלתי צפויה',
    };
  }
}

