import { getErrorMessage } from '@/lib/shared/unknown';
import { getBaseUrl } from '@/lib/utils';
import { EmailTemplateComponents, generateBaseEmailTemplate } from '../email-templates';
import {
    IS_PROD,
    type ResendSendEmailParams,
    type EmailSendResult,
    resolveSupportFromEmail,
    getErrorName,
    getErrorCode,
    getResendClient,
    resolveRecipientEmail,
} from './core';

/**
 * Generate HTML for impersonation OTP email
 * Email is sent to the CLIENT (not admin) with the OTP code
 */
function generateImpersonationOtpEmailHTML(params: {
    clientName: string;
    otpCode: string;
    organizationName: string;
    adminName: string;
}): string {
    const { clientName, otpCode, organizationName, adminName } = params;
    
    const bodyContent = `
        <div style="font-size:22px;font-weight:900;color:#0f172a;margin-bottom:24px;">${clientName},</div>
        
        <div style="font-size:16px;line-height:1.8;color:#334155;margin-bottom:20px;">
            בקשת גישת תמיכה התקבלה עבור הארגון <strong style="color:#6366f1;">${organizationName}</strong>.
        </div>
        
        <div style="margin:24px 0;padding:20px 24px;background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%);border-radius:14px;border:2px solid #f59e0b;">
            <div style="font-size:14px;font-weight:700;color:#92400e;margin-bottom:12px;">
                ⚠️ אישור נדרש
            </div>
            <div style="font-size:15px;line-height:1.7;color:#78350f;">
                נציג תמיכה בשם <strong>${adminName}</strong> מבקש לגשת לחשבון שלך לצורך סיוע טכני.
                <br /><br />
                <strong>אם את/ה מעוניינ/ת בכך</strong> — העבר/י את הקוד הבא לנציג:
            </div>
        </div>
        
        <div style="margin:32px 0;text-align:center;">
            <div style="display:inline-block;padding:20px 40px;background:#0f172a;border-radius:16px;">
                <div style="font-family:ui-monospace,monospace;font-size:36px;font-weight:900;color:#fff;letter-spacing:8px;">
                    ${otpCode}
                </div>
            </div>
        </div>
        
        ${EmailTemplateComponents.generateCallout({
            emoji: '🔒',
            title: 'אבטחה ופרטיות',
            text: 'הקוד תקף ל-10 דקות בלבד. גישת התמיכה תתועד במערכת וניתן יהיה לבקש פירוט בכל עת. אם לא ביקשת סיוע — התעלם/י ממייל זה.',
            bgColor: '#f1f5f9',
            borderColor: '#cbd5e1',
            titleColor: '#334155',
            textColor: '#475569',
        })}
        
        <div style="margin-top:24px;font-size:14px;color:#64748b;line-height:1.7;">
            בברכה,<br />
            <strong>צוות MISRAD AI</strong>
        </div>
    `;
    
    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'קוד אימות לגישת תמיכה',
        headerGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}

/**
 * Send impersonation OTP email to the client
 */
export async function sendImpersonationOtpEmail(params: {
    toEmail: string;
    clientName: string;
    otpCode: string;
    organizationName: string;
    adminName: string;
}): Promise<EmailSendResult> {
    try {
        const resend = getResendClient();
        if (!resend) {
            if (!IS_PROD) console.warn('[Email] Resend not configured - impersonation OTP email skipped');
            return { success: false, error: 'Email service not configured' };
        }

        const fromEmail = resolveSupportFromEmail();
        const toEmail = resolveRecipientEmail(params.toEmail);
        const html = generateImpersonationOtpEmailHTML(params);

        const sendParams: ResendSendEmailParams = {
            from: fromEmail,
            to: toEmail,
            subject: `קוד אימות לגישת תמיכה - ${params.organizationName}`,
            html,
        };
        const { error } = await resend.emails.send(sendParams);

        if (error) {
            if (!IS_PROD) {
                console.error('[Email] Resend error (impersonation OTP):', {
                    message: getErrorMessage(error),
                    name: getErrorName(error),
                    code: getErrorCode(error),
                });
            } else {
                console.error('[Email] Resend error (impersonation OTP)');
            }
            return { success: false, error: getErrorMessage(error) || 'Failed to send OTP email' };
        }

        return { success: true };
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        if (!IS_PROD) {
            console.error('[Email] Error sending impersonation OTP email:', { message });
        } else {
            console.error('[Email] Error sending impersonation OTP email');
        }
        return { success: false, error: message || 'Unknown error' };
    }
}
