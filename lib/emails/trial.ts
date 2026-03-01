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
    const urgencyText = params.daysRemaining === 1 ? 'מחר' : `בעוד ${params.daysRemaining} ימים`;

    const isLastDay = params.daysRemaining <= 1;
    const isUrgent = params.daysRemaining <= 3;

    const headerGradient = isLastDay
        ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
        : isUrgent
        ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'
        : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)';

    const calloutBg = isLastDay ? '#f8fafc' : isUrgent ? '#fffbeb' : '#eff6ff';
    const calloutBorder = isLastDay ? '#e2e8f0' : isUrgent ? '#fcd34d' : '#bfdbfe';
    const calloutTitle = isLastDay ? '#0f172a' : isUrgent ? '#78350f' : '#1e40af';
    const calloutText = isLastDay ? '#475569' : isUrgent ? '#92400e' : '#1e3a5f';

    const dayLabel = params.daysRemaining === 1
        ? 'יום'
        : params.daysRemaining === 2
        ? 'יומיים'
        : `${params.daysRemaining} ימים`;

    const bodyContent = `
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:20px;">${greeting}</div>

        <div style="font-size:17px;line-height:1.8;color:#334155;margin-bottom:24px;">
            תקופת הניסיון של <strong style="color:#6366f1;">"${params.organizationName}"</strong>
            מסתיימת <strong style="color:#0f172a;">${urgencyText}</strong>.
        </div>

        ${EmailTemplateComponents.generateCallout({
            emoji: isLastDay ? '📌' : isUrgent ? '⏳' : '📋',
            title: `נותרו ${dayLabel} בלבד`,
            text: 'לאחר סיום הניסיון הגישה למערכת תושהה. כל הנתונים שלך נשמרים ויחזרו מיד לאחר חידוש.',
            bgColor: calloutBg,
            borderColor: calloutBorder,
            titleColor: calloutTitle,
            textColor: calloutText,
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
        headerGradient,
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
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:20px;">${greeting}</div>

        <div style="font-size:17px;line-height:1.8;color:#334155;margin-bottom:24px;">
            תקופת הניסיון של <strong style="color:#6366f1;">"${params.organizationName}"</strong>
            הסתיימה. הגישה למערכת הושהתה זמנית עד להשלמת התשלום.
        </div>

        ${EmailTemplateComponents.generateCallout({
            emoji: '💾',
            title: 'הנתונים שלך בטוחים',
            text: 'כל המידע שלך נשמר ומאובטח. ברגע שתחדש את המנוי — הכל יחזור מיידית, בדיוק כפי שהשארת.',
            bgColor: '#eff6ff',
            borderColor: '#bfdbfe',
            titleColor: '#1e40af',
            textColor: '#1e3a5f',
        })}

        ${EmailTemplateComponents.generateCTAButton({
            text: 'חידוש הגישה →',
            url: params.portalUrl,
        })}

        ${EmailTemplateComponents.generateDivider()}

        ${EmailTemplateComponents.generateFounderCard({
            photoUrl: assets.founderPhoto,
            name: assets.founderName,
            title: assets.founderTitle,
            message: 'אם יש שאלות או צריך עזרה עם ההחלטה — תשיב למייל הזה ונחזור אליך.',
            signatureText: assets.founderSignature,
        })}
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'הגישה הושהתה זמנית',
        headerGradient: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
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

        const subject = params.daysRemaining === 1
            ? `מחר מסתיים הניסיון — ${params.organizationName}`
            : `נותרו ${params.daysRemaining} ימים לתקופת הניסיון — ${params.organizationName}`;

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
            subject: `הגישה ל-${params.organizationName} הושהתה — MISRAD AI`,
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
