import { getErrorMessage } from '@/lib/shared/unknown';
import { getBaseUrl } from '@/lib/utils';
import { EmailTemplateComponents, generateBaseEmailTemplate } from '../email-templates';
import {
    IS_PROD,
    type ResendSendEmailParams,
    type EmailSendResult,
    resolveSupportFromEmail,
    splitSupportRecipients,
    getErrorName,
    getErrorCode,
    resolveSystemSupportEmail,
    getResendClient,
    resolveRecipientEmail,
} from './core';

function generateSupportTicketReceivedEmailHTML(params: {
    name?: string | null;
    ticketNumber: string;
    subject: string;
    message: string;
    orgSlug: string;
}): string {
    const greeting = params.name ? `${params.name},` : 'היי,';
    const portalUrl = `${getBaseUrl()}/w/${encodeURIComponent(params.orgSlug)}/support#my-tickets`;
    
    const bodyContent = `
        <div style="font-size:22px;font-weight:900;color:#0f172a;margin-bottom:24px;">${greeting}</div>
        
        <div style="font-size:16px;line-height:1.8;color:#334155;margin-bottom:8px;">
            קיבלנו את הדיווח שלך ונטפל בו.
        </div>
        
        <div style="margin:24px 0;padding:20px 24px;background:#f8fafc;border-radius:14px;border:2px solid #e2e8f0;">
            <table role="presentation" style="width:100%;" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding:0 0 12px;">
                        <div style="font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">מספר קריאה</div>
                        <div style="font-size:22px;font-weight:900;background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-top:4px;">#${params.ticketNumber}</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:12px 0 0;border-top:1px solid #e2e8f0;">
                        <div style="font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">נושא</div>
                        <div style="font-size:16px;font-weight:700;color:#0f172a;margin-top:4px;">${params.subject}</div>
                    </td>
                </tr>
                ${params.message ? `
                <tr>
                    <td style="padding:12px 0 0;border-top:1px solid #e2e8f0;">
                        <div style="font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">תיאור</div>
                        <div style="font-size:14px;color:#334155;line-height:1.7;margin-top:4px;white-space:pre-line;">${params.message}</div>
                    </td>
                </tr>
                ` : ''}
            </table>
        </div>
        
        ${EmailTemplateComponents.generateCallout({
            emoji: '⏱️',
            title: 'זמן מענה משוער: 24-48 שעות',
            text: 'נחזור אליך בהקדם האפשרי. אם יש עדכון דחוף — אפשר להשיב ישירות למייל הזה.',
            bgColor: '#eff6ff',
            borderColor: '#bfdbfe',
            titleColor: '#1e40af',
            textColor: '#1e3a5f',
        })}
        
        ${EmailTemplateComponents.generateCTAButton({
            text: 'צפייה בסטטוס הדיווח',
            url: portalUrl,
        })}
    `;
    
    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'הדיווח התקבל',
        headerGradient: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}

function generateSupportTicketReplyEmailHTML(params: {
    name?: string | null;
    ticketNumber: string;
    subject: string;
    reply: string;
    orgSlug: string;
}): string {
    const greeting = params.name ? `${params.name},` : 'היי,';
    const portalUrl = `${getBaseUrl()}/w/${encodeURIComponent(params.orgSlug)}/support#my-tickets`;
    
    const bodyContent = `
        <div style="font-size:22px;font-weight:900;color:#0f172a;margin-bottom:24px;">${greeting}</div>
        
        <div style="font-size:16px;line-height:1.8;color:#334155;margin-bottom:20px;">
            יש לנו עדכון לגבי קריאה <strong style="color:#6366f1;">#${params.ticketNumber}</strong> — ${params.subject}:
        </div>
        
        <div style="margin:24px 0;padding:24px;background:linear-gradient(135deg,#f0f9ff 0%,#eff6ff 100%);border-radius:14px;border-right:4px solid #6366f1;">
            <div style="font-size:15px;font-weight:600;color:#1e293b;line-height:1.8;white-space:pre-line;">
                ${params.reply}
            </div>
        </div>
        
        ${EmailTemplateComponents.generateCTAButton({
            text: 'צפייה בקריאה',
            url: portalUrl,
        })}
        
        <div style="margin-top:24px;font-size:14px;color:#64748b;line-height:1.7;">
            יש עוד שאלות? פשוט תשיב למייל הזה.
        </div>
    `;
    
    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: `עדכון קריאה #${params.ticketNumber}`,
        headerGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}

export async function sendSupportTicketReceivedEmail(params: {
    toEmail: string;
    name?: string | null;
    ticketNumber: string;
    subject: string;
    message: string;
    orgSlug: string;
}): Promise<EmailSendResult> {
    try {
        const resend = getResendClient();
        if (!resend) {
            if (!IS_PROD) console.warn('[Email] Resend not configured - support received email skipped');
            return { success: false, error: 'Email service not configured' };
        }

        const fromEmail = resolveSupportFromEmail();
        const toEmail = resolveRecipientEmail(params.toEmail);
        const html = generateSupportTicketReceivedEmailHTML(params);

        const sendParams: ResendSendEmailParams = {
            from: fromEmail,
            to: toEmail,
            subject: `קיבלנו את הדיווח שלך (#${params.ticketNumber})`,
            html,
        };
        const { error } = await resend.emails.send(sendParams);

        if (error) {
            if (!IS_PROD) {
                console.error('[Email] Resend error (support received):', {
                    message: getErrorMessage(error),
                    name: getErrorName(error),
                    code: getErrorCode(error),
                });
            } else {
                console.error('[Email] Resend error (support received)');
            }
            return { success: false, error: getErrorMessage(error) || 'Failed to send support email' };
        }

        return { success: true };
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        if (!IS_PROD) {
            console.error('[Email] Error sending support received email:', { message });
        } else {
            console.error('[Email] Error sending support received email');
        }
        return { success: false, error: message || 'Unknown error' };
    }
}

export async function sendSupportTicketReplyEmail(params: {
    toEmail: string;
    name?: string | null;
    ticketNumber: string;
    subject: string;
    reply: string;
    orgSlug: string;
}): Promise<EmailSendResult> {
    try {
        const resend = getResendClient();
        if (!resend) {
            if (!IS_PROD) console.warn('[Email] Resend not configured - support reply email skipped');
            return { success: false, error: 'Email service not configured' };
        }

        const fromEmail = resolveSupportFromEmail();
        const toEmail = resolveRecipientEmail(params.toEmail);
        const html = generateSupportTicketReplyEmailHTML(params);

        const sendParams: ResendSendEmailParams = {
            from: fromEmail,
            to: toEmail,
            subject: `עדכון על הדיווח שלך (#${params.ticketNumber})`,
            html,
        };
        const { error } = await resend.emails.send(sendParams);

        if (error) {
            if (!IS_PROD) {
                console.error('[Email] Resend error (support reply):', {
                    message: getErrorMessage(error),
                    name: getErrorName(error),
                    code: getErrorCode(error),
                });
            } else {
                console.error('[Email] Resend error (support reply)');
            }
            return { success: false, error: getErrorMessage(error) || 'Failed to send support email' };
        }

        return { success: true };
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        if (!IS_PROD) {
            console.error('[Email] Error sending support reply email:', { message });
        } else {
            console.error('[Email] Error sending support reply email');
        }
        return { success: false, error: message || 'Unknown error' };
    }
}

export async function sendSupportTicketAdminNotificationEmail(params: {
    ticketNumber: string;
    subject: string;
    message: string;
    orgSlug: string;
    requesterName?: string | null;
    requesterEmail?: string | null;
}): Promise<EmailSendResult> {
    try {
        const resend = getResendClient();
        if (!resend) {
            if (!IS_PROD) console.warn('[Email] Resend not configured - admin notification skipped');
            return { success: false, error: 'Email service not configured' };
        }

        const supportEmail = await resolveSystemSupportEmail();
        const recipients = splitSupportRecipients(supportEmail);
        const fromEmail = resolveSupportFromEmail();
        const html = generateSupportTicketReplyEmailHTML({
            name: params.requesterName || 'צוות תמיכה',
            ticketNumber: params.ticketNumber,
            subject: `דיווח תקלה חדש: ${params.subject}`,
            reply: params.message,
            orgSlug: params.orgSlug,
        });

        const replyTo = params.requesterEmail ? String(params.requesterEmail).trim() : '';
        const sendParams: ResendSendEmailParams = {
            from: fromEmail,
            to: recipients.length ? recipients.map(resolveRecipientEmail) : resolveRecipientEmail(supportEmail),
            subject: `דיווח תקלה חדש (#${params.ticketNumber})`,
            html,
            ...(replyTo ? { replyTo } : {}),
        };
        const { error } = await resend.emails.send(sendParams);

        if (error) {
            if (!IS_PROD) {
                console.error('[Email] Resend error (support admin):', {
                    message: getErrorMessage(error),
                    name: getErrorName(error),
                    code: getErrorCode(error),
                });
            } else {
                console.error('[Email] Resend error (support admin)');
            }
            return { success: false, error: getErrorMessage(error) || 'Failed to send support email' };
        }

        return { success: true };
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        if (!IS_PROD) {
            console.error('[Email] Error sending support admin email:', { message });
        } else {
            console.error('[Email] Error sending support admin email');
        }
        return { success: false, error: message || 'Unknown error' };
    }
}
