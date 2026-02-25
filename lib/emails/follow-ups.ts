import { getErrorMessage } from '@/lib/shared/unknown';
import { EmailTemplateComponents, generateBaseEmailTemplate } from '../email-templates';
import { getEmailAssets } from '../email-assets';
import {
    IS_PROD,
    type EmailSendResult,
    getResendClient,
    resolveRecipientEmail,
} from './core';

function generateDay2CheckinEmailHTML(params: {
    ownerName?: string | null;
    organizationName: string;
    portalUrl: string;
}): string {
    const assets = getEmailAssets();
    const greeting = params.ownerName ? `${params.ownerName},` : 'שלום,';
    const founderName = (process.env.MISRAD_FOUNDER_NAME || 'איציק דהן').trim();
    const founderPhone = (process.env.MISRAD_FOUNDER_PHONE || '').trim();
    const whatsappUrl = (process.env.MISRAD_SUPPORT_WHATSAPP_URL || '').trim();

    const whatsappSection = whatsappUrl
        ? '<div style="text-align:center;margin:20px 0;"><a href="' + whatsappUrl + '" style="display:inline-block;background:#16a34a;color:white;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:800;font-size:14px;box-shadow:0 4px 12px rgba(22,163,74,0.3);">וואטסאפ תמיכה</a></div>'
        : '';

    const founderMsg = 'אני כאן בשבילך. אם צריך — ' + (founderPhone ? 'טלפון: ' + founderPhone : 'תשיב למייל הזה') + '.';

    const bodyContent = `
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">${greeting}</div>

        <div style="font-size:17px;line-height:1.9;color:#334155;margin-bottom:24px;">
            רציתי לבדוק שהכל מסתדר עם <strong style="color:#6366f1;">"${params.organizationName}"</strong>.
            <br />
            עברו יומיים מאז שנפתח — רק רציתי לוודא שאין שום דבר שתקוע.
        </div>

        ${EmailTemplateComponents.generateCallout({
            emoji: '💬',
            title: 'צריך עזרה?',
            text: 'אם יש משהו שלא ברור, או שמשהו לא עובד כמו שצריך — פשוט תשיב למייל הזה. אני קורא הכל.',
            bgColor: '#eff6ff',
            borderColor: '#bfdbfe',
            titleColor: '#1e40af',
            textColor: '#1e3a5f',
        })}

        ${EmailTemplateComponents.generateCTAButton({
            text: 'כניסה למערכת →',
            url: params.portalUrl,
        })}

        ${whatsappSection}

        ${EmailTemplateComponents.generateDivider()}

        ${EmailTemplateComponents.generateFounderCard({
            photoUrl: assets.founderPhoto,
            name: founderName,
            title: assets.founderTitle,
            message: founderMsg,
            signatureText: assets.founderSignature,
        })}
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'הכל בסדר?',
        headerGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}

function generateDay7CheckinEmailHTML(params: {
    ownerName?: string | null;
    organizationName: string;
    portalUrl: string;
}): string {
    const assets = getEmailAssets();
    const greeting = params.ownerName ? `${params.ownerName},` : 'שלום,';
    const founderName = (process.env.MISRAD_FOUNDER_NAME || 'איציק דהן').trim();
    const whatsappUrl = (process.env.MISRAD_SUPPORT_WHATSAPP_URL || '').trim();

    const whatsappSection = whatsappUrl
        ? '<div style="text-align:center;margin:20px 0;"><a href="' + whatsappUrl + '" style="display:inline-block;background:#16a34a;color:white;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:800;font-size:14px;box-shadow:0 4px 12px rgba(22,163,74,0.3);">צריכים עזרה? דברו איתנו בוואטסאפ</a></div>'
        : '';

    const bodyContent = `
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">${greeting}</div>

        <div style="font-size:17px;line-height:1.9;color:#334155;margin-bottom:24px;">
            עבר שבוע מאז שהתחלת עם <strong style="color:#6366f1;">"${params.organizationName}"</strong>.
            <br />
            מסתדרים? יש משהו שנוכל לעזור בו?
        </div>

        ${EmailTemplateComponents.generateCallout({
            emoji: '💡',
            title: 'טיפים מהירים',
            text: '<div style="margin-top:8px;line-height:2;">✅ הגדרת שלבי Pipeline מותאמים לעסק שלך<br/>✅ הוספת חברי צוות — כל אחד עם ההרשאות שלו<br/>✅ שימוש ב-AI לסיכום שיחות וניתוח לידים<br/>✅ הגדרת דוחות אוטומטיים</div>',
            bgColor: '#f0fdf4',
            borderColor: '#a7f3d0',
            titleColor: '#065f46',
            textColor: '#047857',
        })}

        ${EmailTemplateComponents.generateCTAButton({
            text: 'כניסה למערכת →',
            url: params.portalUrl,
        })}

        ${whatsappSection}

        ${EmailTemplateComponents.generateDivider()}

        ${EmailTemplateComponents.generateFounderCard({
            photoUrl: assets.founderPhoto,
            name: founderName,
            title: assets.founderTitle,
            message: 'כל שאלה, בעיה, או רעיון — אני כאן. פשוט תשיב למייל הזה.',
            signatureText: assets.founderSignature,
        })}
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'שבוע ראשון — מה שלומך?',
        headerGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}

function generateDay45FeedbackEmailHTML(params: {
    ownerName?: string | null;
    organizationName: string;
    ratingUrl: string;
    googleReviewUrl?: string;
}): string {
    const assets = getEmailAssets();
    const greeting = params.ownerName ? `${params.ownerName},` : 'שלום,';
    const founderName = (process.env.MISRAD_FOUNDER_NAME || 'איציק דהן').trim();
    const googleUrl = params.googleReviewUrl || (process.env.MISRAD_GOOGLE_REVIEW_URL || '').trim();

    const starsHtml = [1, 2, 3, 4, 5].map((n) => {
        const bg = n <= 2 ? 'linear-gradient(135deg,#fef2f2,#fee2e2)' : n <= 3 ? 'linear-gradient(135deg,#fffbeb,#fef3c7)' : 'linear-gradient(135deg,#ecfdf5,#d1fae5)';
        const color = n <= 2 ? '#ef4444' : n <= 3 ? '#f59e0b' : '#10b981';
        return '<td style="padding:0 6px;"><a href="' + params.ratingUrl + '?rating=' + n + '" style="display:inline-block;width:52px;height:52px;line-height:52px;border-radius:14px;background:' + bg + ';color:' + color + ';font-size:22px;font-weight:900;text-decoration:none;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);">' + n + '</a></td>';
    }).join('');

    const googleSection = googleUrl
        ? '<div style="margin:28px 0;padding:20px;background:linear-gradient(135deg,#f0fdf4 0%,#ecfdf5 100%);border-radius:16px;border:2px solid #a7f3d0;text-align:center;"><div style="font-size:14px;font-weight:900;color:#065f46;margin-bottom:10px;">נהנים מ-MISRAD?</div><div style="font-size:13px;color:#047857;margin-bottom:14px;">דירוג בגוגל עוזר לנו מאוד ומאפשר לעוד עסקים לגלות אותנו</div><a href="' + googleUrl + '" style="display:inline-block;background:#059669;color:white;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:800;font-size:14px;box-shadow:0 4px 12px rgba(5,150,105,0.3);">דירוג בגוגל</a></div>'
        : '';

    const bodyContent = `
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">${greeting}</div>

        <div style="font-size:17px;line-height:1.9;color:#334155;margin-bottom:24px;">
            עבר חודש וחצי מאז שהתחלת להשתמש ב-<strong style="color:#6366f1;">"${params.organizationName}"</strong>.
            <br />
            <strong>נשמח מאוד לשמוע ממך משוב כנה</strong> — מה עובד טוב? מה צריך לשפר?
        </div>

        <!-- In-app rating stars -->
        <div style="margin:28px 0;text-align:center;">
            <div style="font-size:15px;font-weight:800;color:#6366f1;margin-bottom:12px;">דרג/י את החוויה שלך</div>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                    ${starsHtml}
                </tr>
            </table>
        </div>

        ${EmailTemplateComponents.generateCTAButton({
            text: 'שליחת משוב מפורט →',
            url: params.ratingUrl,
        })}

        ${googleSection}

        ${EmailTemplateComponents.generateDivider()}

        ${EmailTemplateComponents.generateFounderCard({
            photoUrl: assets.founderPhoto,
            name: founderName,
            title: assets.founderTitle,
            message: 'כל מילה שלך חשובה לי. הפידבק שלך הוא מה שמוביל את הפיתוח שלנו. תודה שאתה איתנו.',
            signatureText: assets.founderSignature,
        })}
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'נשמח לשמוע ממך',
        headerGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}

export async function sendDay2CheckinEmail(params: {
    toEmail: string;
    ownerName?: string | null;
    organizationName: string;
    portalUrl: string;
}): Promise<EmailSendResult> {
    try {
        const resend = getResendClient();
        if (!resend) {
            if (!IS_PROD) console.warn('[Email] Resend not configured - day2 checkin skipped');
            return { success: false, error: 'Email service not configured' };
        }

        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        const toEmail = resolveRecipientEmail(params.toEmail);
        const html = generateDay2CheckinEmailHTML(params);

        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: toEmail,
            subject: `הכל מסתדר עם ${params.organizationName}?`,
            html,
        });

        if (error) {
            if (!IS_PROD) console.error('[Email] Resend error (day2-checkin):', { message: getErrorMessage(error) });
            return { success: false, error: getErrorMessage(error) || 'Failed to send' };
        }

        console.log('[Email] Day 2 check-in email sent:', { emailId: data?.id });
        return { success: true };
    } catch (err: unknown) {
        const msg = getErrorMessage(err);
        if (!IS_PROD) console.error('[Email] Error sending day2 checkin:', { message: msg });
        return { success: false, error: msg || 'Unknown error' };
    }
}

export async function sendDay7CheckinEmail(params: {
    toEmail: string;
    ownerName?: string | null;
    organizationName: string;
    portalUrl: string;
}): Promise<EmailSendResult> {
    try {
        const resend = getResendClient();
        if (!resend) {
            if (!IS_PROD) console.warn('[Email] Resend not configured - day7 checkin skipped');
            return { success: false, error: 'Email service not configured' };
        }

        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        const toEmail = resolveRecipientEmail(params.toEmail);
        const html = generateDay7CheckinEmailHTML(params);

        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: toEmail,
            subject: `שבוע ראשון — מסתדרים עם ${params.organizationName}?`,
            html,
        });

        if (error) {
            if (!IS_PROD) console.error('[Email] Resend error (day7-checkin):', { message: getErrorMessage(error) });
            return { success: false, error: getErrorMessage(error) || 'Failed to send' };
        }

        console.log('[Email] Day 7 check-in email sent:', { emailId: data?.id });
        return { success: true };
    } catch (err: unknown) {
        const msg = getErrorMessage(err);
        if (!IS_PROD) console.error('[Email] Error sending day7 checkin:', { message: msg });
        return { success: false, error: msg || 'Unknown error' };
    }
}

export async function sendDay45FeedbackEmail(params: {
    toEmail: string;
    ownerName?: string | null;
    organizationName: string;
    ratingUrl: string;
    googleReviewUrl?: string;
}): Promise<EmailSendResult> {
    try {
        const resend = getResendClient();
        if (!resend) {
            if (!IS_PROD) console.warn('[Email] Resend not configured - day45 feedback skipped');
            return { success: false, error: 'Email service not configured' };
        }

        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        const toEmail = resolveRecipientEmail(params.toEmail);
        const html = generateDay45FeedbackEmailHTML(params);

        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: toEmail,
            subject: (params.ownerName || 'היי') + ', נשמח לשמוע ממך — MISRAD AI',
            html,
        });

        if (error) {
            if (!IS_PROD) console.error('[Email] Resend error (day45-feedback):', { message: getErrorMessage(error) });
            return { success: false, error: getErrorMessage(error) || 'Failed to send' };
        }

        console.log('[Email] Day 45 feedback email sent:', { emailId: data?.id });
        return { success: true };
    } catch (err: unknown) {
        const msg = getErrorMessage(err);
        if (!IS_PROD) console.error('[Email] Error sending day45 feedback:', { message: msg });
        return { success: false, error: msg || 'Unknown error' };
    }
}
