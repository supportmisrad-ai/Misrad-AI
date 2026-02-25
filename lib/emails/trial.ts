import { getErrorMessage } from '@/lib/shared/unknown';
import { EmailTemplateComponents, generateBaseEmailTemplate } from '../email-templates';
import { getEmailAssets } from '../email-assets';
import {
    IS_PROD,
    type EmailSendResult,
    getErrorName,
    getErrorCode,
    getResendClient,
    resolveRecipientEmail,
} from './core';

function generateTrialExpiryWarningEmailHTML(params: {
    organizationName: string;
    ownerName?: string | null;
    daysRemaining: number;
    portalUrl: string;
}): string {
    const assets = getEmailAssets();
    const greeting = params.ownerName ? `${params.ownerName},` : 'שלום,';
    const urgencyColor = params.daysRemaining <= 1 ? '#ef4444' : params.daysRemaining <= 3 ? '#f59e0b' : '#6366f1';
    const urgencyText = params.daysRemaining === 1 ? 'מחר' : `בעוד ${params.daysRemaining} ימים`;
    const isUrgent = params.daysRemaining <= 3;

    const bodyContent = `
        ${isUrgent ? EmailTemplateComponents.generateFeatureBanner({
            emoji: params.daysRemaining <= 1 ? '🚨' : '⏰',
            title: `נותרו ${params.daysRemaining} ${params.daysRemaining === 1 ? 'יום' : 'ימים'} בלבד`,
            subtitle: 'תקופת הניסיון מסתיימת',
            gradient: `linear-gradient(135deg, ${urgencyColor} 0%, #dc2626 100%)`,
        }) : ''}

        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">${greeting}</div>

        <div style="font-size:17px;line-height:1.8;color:#334155;margin-bottom:24px;">
            תקופת הניסיון של <strong style="color:#6366f1;">"${params.organizationName}"</strong>
            תסתיים <strong style="color:${urgencyColor};">${urgencyText}</strong>.
        </div>

        ${EmailTemplateComponents.generateCallout({
            emoji: params.daysRemaining <= 1 ? '🚨' : '📋',
            title: 'מה קורה אחרי סיום הניסיון?',
            text: 'הגישה למערכת תיחסם עד להשלמת התשלום. כל הנתונים שלך נשמרים ויחזרו מיד אחרי חידוש.',
            bgColor: isUrgent ? '#fff7ed' : '#eff6ff',
            borderColor: isUrgent ? '#fed7aa' : '#bfdbfe',
            titleColor: isUrgent ? '#9a3412' : '#1e40af',
            textColor: isUrgent ? '#9a3412' : '#1e3a5f',
        })}

        ${EmailTemplateComponents.generateScreenshot({
            src: assets.welcomeDashboardScreenshot,
            alt: 'MISRAD AI Dashboard',
            title: 'MISRAD AI — המערכת שלך',
            href: params.portalUrl,
        })}

        ${EmailTemplateComponents.generateCTAButton({
            text: 'מעבר לתוכנית בתשלום →',
            url: params.portalUrl,
        })}

        ${EmailTemplateComponents.generateDivider()}

        ${EmailTemplateComponents.generateFounderCard({
            photoUrl: assets.founderPhoto,
            name: assets.founderName,
            title: assets.founderTitle,
            message: 'אם יש משהו שמפריע לך או שצריך עזרה עם ההחלטה — תשיב למייל הזה ונסדר את זה יחד.',
            signatureText: assets.founderSignature,
        })}
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: `תקופת הניסיון מסתיימת ${urgencyText}`,
        headerGradient: `linear-gradient(135deg, ${urgencyColor} 0%, ${isUrgent ? '#dc2626' : '#4f46e5'} 100%)`,
        bodyContent,
        showSocialLinks: false,
    });
}

function generateTrialExpiredEmailHTML(params: {
    organizationName: string;
    ownerName?: string | null;
    portalUrl: string;
}): string {
    const assets = getEmailAssets();
    const greeting = params.ownerName ? `${params.ownerName},` : 'שלום,';

    const bodyContent = `
        ${EmailTemplateComponents.generateFeatureBanner({
            emoji: '🔒',
            title: 'תקופת הניסיון הסתיימה',
            subtitle: 'הגישה למערכת הוגבלה',
            gradient: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
        })}

        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">${greeting}</div>

        <div style="font-size:17px;line-height:1.8;color:#334155;margin-bottom:24px;">
            תקופת הניסיון של <strong style="color:#6366f1;">"${params.organizationName}"</strong>
            <strong style="color:#dc2626;">הסתיימה</strong>. הגישה למערכת הוגבלה עד להשלמת התשלום.
        </div>

        ${EmailTemplateComponents.generateCallout({
            emoji: '💾',
            title: 'המידע שלך בטוח',
            text: 'כל הנתונים שלך נשמרים ומאובטחים. ברגע שתשלים תשלום — הגישה תחזור באופן מיידי עם כל המידע במקומו.',
            bgColor: '#eff6ff',
            borderColor: '#bfdbfe',
            titleColor: '#1e40af',
            textColor: '#1e3a5f',
        })}

        ${EmailTemplateComponents.generateCTAButton({
            text: 'השלם תשלום והמשך להשתמש →',
            url: params.portalUrl,
        })}

        ${EmailTemplateComponents.generateDivider()}

        ${EmailTemplateComponents.generateFounderCard({
            photoUrl: assets.founderPhoto,
            name: assets.founderName,
            title: assets.founderTitle,
            message: 'אם יש שאלות או צריך עזרה עם ההחלטה — השב למייל הזה ונחזור אליך.',
            signatureText: assets.founderSignature,
        })}
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'תקופת הניסיון הסתיימה',
        headerGradient: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}

export async function sendTrialExpiryWarningEmail(params: {
    toEmail: string;
    organizationName: string;
    ownerName?: string | null;
    daysRemaining: number;
    portalUrl: string;
}): Promise<EmailSendResult> {
    try {
        const resend = getResendClient();
        if (!resend) {
            if (!IS_PROD) console.warn('[Email] Email service is not configured - skipping trial expiry warning');
            return { success: false, error: 'Email service not configured' };
        }

        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        const toEmail = resolveRecipientEmail(params.toEmail);
        const html = generateTrialExpiryWarningEmailHTML(params);

        const urgencyPrefix = params.daysRemaining === 1 ? '🚨 מחר!' : params.daysRemaining <= 3 ? '⚠️' : '';
        const subject = `${urgencyPrefix} תקופת הניסיון שלך מסתיימת בעוד ${params.daysRemaining} ימים`;

        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: toEmail,
            subject,
            html,
        });

        if (error) {
            if (!IS_PROD) {
                console.error('[Email] Resend error (trial-expiry-warning):', {
                    message: getErrorMessage(error),
                    name: getErrorName(error),
                    code: getErrorCode(error)
                });
            } else {
                console.error('[Email] Resend error (trial-expiry-warning)');
            }
            return { success: false, error: getErrorMessage(error) || 'Failed to send email' };
        }

        console.log('[Email] Trial expiry warning email sent successfully:', {
            emailId: data?.id,
            organizationName: params.organizationName,
            daysRemaining: params.daysRemaining,
        });

        return { success: true };
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        const name = getErrorName(error);
        if (!IS_PROD) {
            console.error('[Email] Error sending trial expiry warning email:', { message, name });
        } else {
            console.error('[Email] Error sending trial expiry warning email');
        }
        return { success: false, error: message || 'Unknown error' };
    }
}

export async function sendTrialExpiredEmail(params: {
    toEmail: string;
    organizationName: string;
    ownerName?: string | null;
    portalUrl: string;
}): Promise<EmailSendResult> {
    try {
        const resend = getResendClient();
        if (!resend) {
            if (!IS_PROD) console.warn('[Email] Email service is not configured - skipping trial expired email');
            return { success: false, error: 'Email service not configured' };
        }

        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        const toEmail = resolveRecipientEmail(params.toEmail);
        const html = generateTrialExpiredEmailHTML(params);

        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: toEmail,
            subject: '🔒 תקופת הניסיון הסתיימה — MISRAD AI',
            html,
        });

        if (error) {
            if (!IS_PROD) {
                console.error('[Email] Resend error (trial-expired):', {
                    message: getErrorMessage(error),
                    name: getErrorName(error),
                    code: getErrorCode(error)
                });
            } else {
                console.error('[Email] Resend error (trial-expired)');
            }
            return { success: false, error: getErrorMessage(error) || 'Failed to send email' };
        }

        console.log('[Email] Trial expired email sent successfully:', {
            emailId: data?.id,
            organizationName: params.organizationName,
        });

        return { success: true };
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        const name = getErrorName(error);
        if (!IS_PROD) {
            console.error('[Email] Error sending trial expired email:', { message, name });
        } else {
            console.error('[Email] Error sending trial expired email');
        }
        return { success: false, error: message || 'Unknown error' };
    }
}
