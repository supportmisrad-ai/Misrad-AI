import { getErrorMessage } from '@/lib/shared/unknown';
import { generateBaseEmailTemplate } from '../email-templates';
import {
    IS_PROD,
    type ResendSendEmailParams,
    type EmailSendResult,
    resolveSupportFromEmail,
    getResendClient,
    resolveRecipientEmail,
} from './core';

function generateNewLeadNotificationHTML(params: {
    leadName: string;
    leadPhone: string;
    leadEmail?: string;
    leadCompany?: string;
    leadMessage?: string;
    orgName: string;
    leadsPageUrl: string;
}): string {
    const rows: string[] = [];

    rows.push(`
        <tr>
            <td style="padding:0 0 12px;">
                <div style="font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">שם</div>
                <div style="font-size:16px;font-weight:700;color:#0f172a;margin-top:4px;">${params.leadName}</div>
            </td>
        </tr>
    `);

    rows.push(`
        <tr>
            <td style="padding:12px 0 0;border-top:1px solid #e2e8f0;">
                <div style="font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">טלפון</div>
                <div style="font-size:16px;font-weight:700;color:#0f172a;margin-top:4px;" dir="ltr">
                    <a href="tel:${params.leadPhone}" style="color:#0f172a;text-decoration:underline;">${params.leadPhone}</a>
                </div>
            </td>
        </tr>
    `);

    if (params.leadEmail) {
        rows.push(`
            <tr>
                <td style="padding:12px 0 0;border-top:1px solid #e2e8f0;">
                    <div style="font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">אימייל</div>
                    <div style="font-size:16px;font-weight:700;color:#0f172a;margin-top:4px;">
                        <a href="mailto:${params.leadEmail}" style="color:#0f172a;text-decoration:underline;">${params.leadEmail}</a>
                    </div>
                </td>
            </tr>
        `);
    }

    if (params.leadCompany) {
        rows.push(`
            <tr>
                <td style="padding:12px 0 0;border-top:1px solid #e2e8f0;">
                    <div style="font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">חברה</div>
                    <div style="font-size:16px;font-weight:700;color:#0f172a;margin-top:4px;">${params.leadCompany}</div>
                </td>
            </tr>
        `);
    }

    if (params.leadMessage) {
        rows.push(`
            <tr>
                <td style="padding:12px 0 0;border-top:1px solid #e2e8f0;">
                    <div style="font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">הודעה</div>
                    <div style="font-size:14px;color:#334155;line-height:1.7;margin-top:4px;white-space:pre-line;">${params.leadMessage}</div>
                </td>
            </tr>
        `);
    }

    const bodyContent = `
        <div style="font-size:22px;font-weight:900;color:#0f172a;margin-bottom:8px;">ליד חדש מטופס ציבורי!</div>
        <div style="font-size:14px;color:#64748b;margin-bottom:24px;">מישהו מילא את טופס הלידים של <strong>${params.orgName}</strong></div>
        
        <div style="margin:24px 0;padding:20px 24px;background:#f8fafc;border-radius:14px;border:2px solid #e2e8f0;">
            <table role="presentation" style="width:100%;" cellpadding="0" cellspacing="0">
                ${rows.join('')}
            </table>
        </div>

        <div style="text-align:center;margin:32px 0 16px;">
            <a href="${params.leadsPageUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;font-size:16px;font-weight:800;text-decoration:none;padding:14px 32px;border-radius:12px;">
                צפה בלידים שלך
            </a>
        </div>
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'ליד חדש נכנס!',
        headerGradient: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}

export async function sendNewLeadNotificationEmail(params: {
    toEmail: string;
    leadName: string;
    leadPhone: string;
    leadEmail?: string;
    leadCompany?: string;
    leadMessage?: string;
    orgName: string;
    orgSlug: string;
}): Promise<EmailSendResult> {
    try {
        const resend = getResendClient();
        if (!resend) {
            if (!IS_PROD) console.warn('[Email] Resend not configured - lead notification email skipped');
            return { success: false, error: 'Email service not configured' };
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'https://misrad-ai.com';
        const leadsPageUrl = `${baseUrl}/w/${params.orgSlug}/system`;

        const fromEmail = resolveSupportFromEmail();
        const toEmail = resolveRecipientEmail(params.toEmail);
        const html = generateNewLeadNotificationHTML({
            ...params,
            leadsPageUrl,
        });

        const sendParams: ResendSendEmailParams = {
            from: fromEmail,
            to: toEmail,
            subject: `ליד חדש: ${params.leadName} — טופס ציבורי`,
            html,
        };
        const { error } = await resend.emails.send(sendParams);

        if (error) {
            if (!IS_PROD) {
                console.error('[Email] Resend error (new lead):', { message: getErrorMessage(error) });
            }
            return { success: false, error: getErrorMessage(error) || 'Failed to send email' };
        }

        return { success: true };
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        if (!IS_PROD) console.error('[Email] Error sending new lead notification:', { message });
        return { success: false, error: message || 'Unknown error' };
    }
}
