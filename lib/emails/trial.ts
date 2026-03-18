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

    // Use cleaner colors from the new palette
    const calloutBg = isLastDay ? '#f8fafc' : isUrgent ? '#fffbeb' : '#f8fafc';
    const calloutBorder = isLastDay ? '#e2e8f0' : isUrgent ? '#fde68a' : '#e2e8f0';
    const calloutTitle = isLastDay ? '#0f172a' : isUrgent ? '#92400e' : '#0f172a';
    const calloutText = isLastDay ? '#475569' : isUrgent ? '#92400e' : '#475569';

    const dayLabel = params.daysRemaining === 1
        ? 'יום'
        : params.daysRemaining === 2
        ? 'יומיים'
        : `${params.daysRemaining} ימים`;

    const bodyContent = `
        <div style="font-size:20px;font-weight:700;color:#0f172a;margin-bottom:24px;">${greeting}</div>

        <div style="font-size:16px;line-height:1.6;color:#334155;margin-bottom:24px;">
            רציתי לתת לך תזכורת — תקופת הניסיון של <strong>"${params.organizationName}"</strong>
            מסתיימת ${urgencyText}.
        </div>

        ${EmailTemplateComponents.generateCallout({
            emoji: isLastDay ? '📌' : isUrgent ? '⏳' : '📋',
            title: `נותרו ${dayLabel} לבדוק הכל`,
            text: 'אחרי זה המערכת תמשיך לשמור את כל הנתונים שלך, אבל הגישה תושהה עד שתחליט לחזור. בלי לחץ — הדלת פתוחה תמיד.',
            bgColor: calloutBg,
            borderColor: calloutBorder,
            titleColor: calloutTitle,
            textColor: calloutText,
        })}

        ${EmailTemplateComponents.generateCTAButton({
            text: 'בחירת תוכנית',
            url: params.portalUrl,
        })}

        ${EmailTemplateComponents.generateDivider()}

        ${EmailTemplateComponents.generateFounderCard({
            photoUrl: assets.founderPhoto,
            name: assets.founderName,
            title: assets.founderTitle,
            message: 'אם יש שאלות על התוכניות או שמשהו לא ברור — פשוט תשיב למייל הזה. לא נעלים כאן, אני קורא ומגיב.',
            signatureText: assets.founderSignature,
        })}
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: `תקופת הניסיון מסתיימת ${urgencyText}`,
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
        <div style="font-size:20px;font-weight:700;color:#0f172a;margin-bottom:24px;">${greeting}</div>

        <div style="font-size:16px;line-height:1.6;color:#334155;margin-bottom:24px;">
            תקופת הניסיון של <strong>"${params.organizationName}"</strong>
            הסתיימה. הגישה למערכת הושהתה זמנית עד להשלמת התשלום.
        </div>

        ${EmailTemplateComponents.generateCallout({
            emoji: '💾',
            title: 'הנתונים שלך בטוחים',
            text: 'כל המידע שלך נשמר ומאובטח. ברגע שתחדש את המנוי — הכל יחזור מיידית, בדיוק כפי שהשארת.',
            bgColor: '#f8fafc',
            borderColor: '#e2e8f0',
            titleColor: '#0f172a',
            textColor: '#475569',
        })}

        ${EmailTemplateComponents.generateCTAButton({
            text: 'חידוש הגישה',
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
        const html = await generateTrialExpiryWarningEmailHTML(params);

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
        const html = await generateTrialExpiredEmailHTML({
            organizationName: params.organizationName,
            ownerName: params.ownerName,
            portalUrl: params.portalUrl,
        });

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
