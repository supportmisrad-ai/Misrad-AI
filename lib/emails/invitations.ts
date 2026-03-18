import { getErrorMessage } from '@/lib/shared/unknown';
import { getBaseUrl } from '@/lib/utils';
import { EmailTemplateComponents, generateBaseEmailTemplate } from '../email-templates';
import {
    IS_PROD,
    type EmailSendResult,
    getErrorName,
    getErrorCode,
    getResendClient,
    resolveRecipientEmail,
} from './core';

function generateInvitationEmailHTML(
    tenantName: string,
    ownerName: string | null,
    signupUrl: string,
    subdomain?: string
): string {
    const greeting = ownerName ? `${ownerName},` : 'שלום,';
    
    const bodyContent = `
        <div style="font-size:20px;font-weight:700;color:#0f172a;margin-bottom:24px;">${greeting}</div>
        
        <div style="font-size:16px;line-height:1.6;color:#334155;margin-bottom:32px;">
            העסק <strong>"${tenantName}"</strong> הוקם בהצלחה.
            <br />
            נשאר רק ליצור חשבון ולהתחיל לעבוד.
        </div>
        
        ${EmailTemplateComponents.generateCTAButton({
            text: 'יצירת חשבון',
            url: signupUrl,
        })}
        
        ${subdomain ? `
            <div style="margin:32px 0;padding:24px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;text-align:center;">
                <div style="font-size:12px;font-weight:600;color:#64748b;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">הכתובת הישירה שלך</div>
                <a href="https://${subdomain}.misrad-ai.com" style="color:#0f172a;font-size:18px;font-weight:700;text-decoration:none;">
                    ${subdomain}.misrad-ai.com
                </a>
            </div>
        ` : ''}
        
        <div style="margin-top:32px;font-size:13px;color:#94a3b8;line-height:1.6;text-align:center;">
            הקישור תקף ללא הגבלת זמן. לא יצרת את הבקשה? אפשר להתעלם.
        </div>
    `;
    
    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'העסק שלך מוכן',
        bodyContent,
        showSocialLinks: true,
    });
}

function generateEmployeeInvitationEmailHTML(
    employeeName: string | null,
    employeeEmail: string,
    department: string,
    role: string,
    invitationUrl: string,
    createdByName?: string | null
): string {
    const greeting = employeeName ? `${employeeName},` : 'שלום,';
    const inviter = createdByName ? `${createdByName} ` : '';
    
    const bodyContent = `
        <div style="font-size:20px;font-weight:700;color:#0f172a;margin-bottom:24px;">${greeting}</div>
        
        <div style="font-size:16px;line-height:1.6;color:#334155;margin-bottom:24px;">
            ${inviter ? `${inviter}הזמין אותך להצטרף לצוות` : 'הוזמנת להצטרף לצוות'} ב-MISRAD.
        </div>
        
        <div style="margin:24px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:24px;">
            <table role="presentation" style="width:100%;" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding:0 0 16px;">
                        <div style="font-size:12px;font-weight:600;color:#64748b;letter-spacing:0.5px;margin-bottom:4px;">מחלקה</div>
                        <div style="font-size:16px;font-weight:600;color:#0f172a;">${department}</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:16px 0 0;border-top:1px solid #e2e8f0;">
                        <div style="font-size:12px;font-weight:600;color:#64748b;letter-spacing:0.5px;margin-bottom:4px;">תפקיד</div>
                        <div style="font-size:16px;font-weight:600;color:#0f172a;">${role}</div>
                    </td>
                </tr>
            </table>
        </div>
        
        ${EmailTemplateComponents.generateCTAButton({
            text: 'השלמת הרשמה',
            url: invitationUrl,
        })}
        
        ${EmailTemplateComponents.generateCallout({
            emoji: '⏰',
            title: 'הקישור תקף 30 יום',
            text: 'לאחר מכן תצטרך הזמנה חדשה.',
            bgColor: '#fffbeb',
            borderColor: '#fde68a',
            titleColor: '#92400e',
            textColor: '#92400e',
        })}
        
        <div style="margin-top:28px;font-size:13px;color:#94a3b8;line-height:1.6;text-align:center;">
            לא ביקשת הזמנה זו? אפשר להתעלם מהמייל.
        </div>
    `;
    
    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'הזמנה להצטרף לצוות',
        bodyContent,
        showSocialLinks: false,
    });
}

export async function sendEmployeeInvitationEmail(
    employeeEmail: string,
    employeeName: string | null,
    department: string,
    role: string,
    invitationUrl: string,
    createdByName?: string | null
): Promise<EmailSendResult> {
    try {
        const html = generateEmployeeInvitationEmailHTML(
            employeeName,
            employeeEmail,
            department,
            role,
            invitationUrl,
            createdByName
        );

        const resend = getResendClient();
        if (!resend) {
            if (!IS_PROD) console.error('[Email] Email service is not configured');
            return { success: false, error: 'Email service not configured' };
        }

        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        const toEmail = resolveRecipientEmail(employeeEmail);

        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: toEmail,
            subject: `הזמנה להצטרף לצוות - ${department} - ${role}`,
            html: html,
        });

        if (error) {
            if (!IS_PROD) {
                console.error('[Email] Resend error:', {
                    message: getErrorMessage(error),
                    name: getErrorName(error),
                    code: getErrorCode(error)
                });
            } else {
                console.error('[Email] Resend error');
            }
            return { success: false, error: getErrorMessage(error) || 'Failed to send email' };
        }

        console.log('[Email] Employee invitation email sent successfully:', {
            emailId: data?.id,
            department,
            role
        });

        return { success: true };
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        const name = getErrorName(error);
        if (!IS_PROD) {
            console.error('[Email] Error sending employee invitation email:', {
                message,
                name
            });
        } else {
            console.error('[Email] Error sending employee invitation email');
        }
        return { success: false, error: message || 'Unknown error' };
    }
}

export async function sendTenantInvitationEmail(
    ownerEmail: string,
    tenantName: string,
    signupUrl: string,
    options?: {
        ownerName?: string | null;
        subdomain?: string;
    }
): Promise<EmailSendResult> {
    try {
        const html = generateInvitationEmailHTML(
            tenantName,
            options?.ownerName || null,
            signupUrl,
            options?.subdomain
        );

        const resend = getResendClient();
        if (!resend) {
            if (!IS_PROD) console.error('[Email] Email service is not configured');
            return { success: false, error: 'Email service not configured' };
        }

        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        const toEmail = resolveRecipientEmail(ownerEmail);

        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: toEmail,
            subject: `הזמנה להצטרף ל-MISRAD - ${tenantName}`,
            html: html,
        });

        if (error) {
            if (!IS_PROD) {
                console.error('[Email] Resend error:', {
                    message: getErrorMessage(error),
                    name: getErrorName(error),
                    code: getErrorCode(error)
                });
            } else {
                console.error('[Email] Resend error');
            }
            return { success: false, error: getErrorMessage(error) || 'Failed to send email' };
        }

        console.log('[Email] Invitation email sent successfully:', {
            emailId: data?.id,
            tenantName
        });

        return { success: true };
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        const name = getErrorName(error);
        if (!IS_PROD) {
            console.error('[Email] Error sending invitation email:', {
                message,
                name
            });
        } else {
            console.error('[Email] Error sending invitation email');
        }
        return { success: false, error: message || 'Unknown error' };
    }
}
