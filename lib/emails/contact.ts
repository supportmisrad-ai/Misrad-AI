import { getErrorMessage } from '@/lib/shared/unknown';
import { EmailTemplateComponents, generateBaseEmailTemplate } from '../email-templates';
import {
    IS_PROD,
    type ResendSendEmailParams,
    type EmailSendResult,
    resolveSupportFromEmail,
    resolveSystemSupportEmail,
    getResendClient,
    resolveRecipientEmail,
} from './core';

function generateContactFormReceivedEmailHTML(params: {
    name: string;
    message: string;
}): string {
    const greeting = params.name ? `${params.name},` : 'היי,';

    const bodyContent = `
        <div style="font-size:20px;font-weight:700;color:#0f172a;margin-bottom:24px;">${greeting}</div>
        
        <div style="font-size:16px;line-height:1.6;color:#334155;margin-bottom:8px;">
            קיבלנו את הפנייה שלך ונחזור אליך בהקדם.
        </div>
        
        <div style="margin:24px 0;padding:24px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
            <div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">ההודעה שלך</div>
            <div style="font-size:14px;color:#334155;line-height:1.6;margin-top:8px;white-space:pre-line;">${params.message}</div>
        </div>
        
        ${EmailTemplateComponents.generateCallout({
            emoji: '⏱️',
            title: 'זמן מענה משוער: עד 24 שעות',
            text: 'נחזור אליך בהקדם האפשרי. אם יש עניין דחוף — אפשר להשיב ישירות למייל הזה.',
            bgColor: '#f0f9ff',
            borderColor: '#bfdbfe',
            titleColor: '#1e40af',
            textColor: '#1e3a5f',
        })}
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'פנייתך התקבלה',
        bodyContent,
        showSocialLinks: false,
    });
}

function generateContactFormAdminNotificationHTML(params: {
    name: string;
    email: string;
    message: string;
}): string {
    const bodyContent = `
        <div style="font-size:20px;font-weight:700;color:#0f172a;margin-bottom:24px;">פנייה חדשה מטופס צור קשר</div>
        
        <div style="margin:24px 0;padding:24px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
            <table role="presentation" style="width:100%;" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding:0 0 16px;">
                        <div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">שם</div>
                        <div style="font-size:16px;font-weight:600;color:#0f172a;">${params.name}</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:16px 0 0;border-top:1px solid #e2e8f0;">
                        <div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">אימייל</div>
                        <div style="font-size:16px;font-weight:600;color:#0f172a;">
                            <a href="mailto:${params.email}" style="color:#0f172a;text-decoration:none;">${params.email}</a>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:16px 0 0;border-top:1px solid #e2e8f0;">
                        <div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">הודעה</div>
                        <div style="font-size:14px;color:#334155;line-height:1.6;white-space:pre-line;">${params.message}</div>
                    </td>
                </tr>
            </table>
        </div>
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'פנייה חדשה',
        bodyContent,
        showSocialLinks: false,
    });
}

export async function sendContactFormReceivedEmail(params: {
    toEmail: string;
    name: string;
    message: string;
}): Promise<EmailSendResult> {
    try {
        const resend = getResendClient();
        if (!resend) {
            if (!IS_PROD) console.warn('[Email] Resend not configured - contact form email skipped');
            return { success: false, error: 'Email service not configured' };
        }

        const fromEmail = resolveSupportFromEmail();
        const toEmail = resolveRecipientEmail(params.toEmail);
        const html = await generateContactFormReceivedEmailHTML(params);

        const sendParams: ResendSendEmailParams = {
            from: fromEmail,
            to: toEmail,
            subject: 'קיבלנו את הפנייה שלך — MISRAD AI',
            html,
        };
        const { error } = await resend.emails.send(sendParams);

        if (error) {
            if (!IS_PROD) {
                console.error('[Email] Resend error (contact form):', { message: getErrorMessage(error) });
            }
            return { success: false, error: getErrorMessage(error) || 'Failed to send email' };
        }

        return { success: true };
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        if (!IS_PROD) console.error('[Email] Error sending contact form email:', { message });
        return { success: false, error: message || 'Unknown error' };
    }
}

export async function sendContactFormAdminNotification(params: {
    name: string;
    email: string;
    message: string;
}): Promise<EmailSendResult> {
    try {
        const resend = getResendClient();
        if (!resend) {
            return { success: false, error: 'Email service not configured' };
        }

        const adminEmail = await resolveSystemSupportEmail();
        const fromEmail = resolveSupportFromEmail();
        const html = await generateContactFormAdminNotificationHTML(params);

        const sendParams: ResendSendEmailParams = {
            from: fromEmail,
            to: resolveRecipientEmail(adminEmail),
            subject: `פנייה חדשה מ-${params.name} — טופס צור קשר`,
            html,
            replyTo: params.email,
        };
        const { error } = await resend.emails.send(sendParams);

        if (error) {
            if (!IS_PROD) {
                console.error('[Email] Resend error (contact admin):', { message: getErrorMessage(error) });
            }
            return { success: false, error: getErrorMessage(error) || 'Failed to send email' };
        }

        return { success: true };
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        if (!IS_PROD) console.error('[Email] Error sending contact admin notification:', { message });
        return { success: false, error: message || 'Unknown error' };
    }
}
