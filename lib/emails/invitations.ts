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
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">${greeting}</div>
        
        <div style="font-size:17px;line-height:1.8;color:#334155;margin-bottom:28px;">
            העסק <strong style="background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-size:19px;">"${tenantName}"</strong> הוקם בהצלחה במערכת.
            <br />
            נשאר רק ליצור חשבון ולהתחיל.
        </div>
        
        ${EmailTemplateComponents.generateCTAButton({
            text: 'יצירת חשבון →',
            url: signupUrl,
        })}
        
        ${subdomain ? `
            <div style="margin:28px 0;padding:18px 24px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;text-align:center;">
                <div style="font-size:12px;font-weight:700;color:#64748b;margin-bottom:6px;">הכתובת הישירה שלך</div>
                <a href="https://${subdomain}.misrad-ai.com" style="color:#6366f1;font-size:16px;font-weight:700;text-decoration:none;">
                    ${subdomain}.misrad-ai.com
                </a>
            </div>
        ` : ''}
        
        <div style="margin-top:32px;font-size:12px;color:#94a3b8;line-height:1.6;text-align:center;">
            הקישור תקף ללא הגבלת זמן. לא יצרת את הבקשה? אפשר להתעלם.
        </div>
    `;
    
    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'העסק שלך מוכן',
        headerGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
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
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">${greeting}</div>
        
        <div style="font-size:17px;line-height:1.8;color:#334155;margin-bottom:24px;">
            ${inviter ? `${inviter}הזמין אותך להצטרף לצוות` : 'הוזמנת להצטרף לצוות'} ב-MISRAD.
        </div>
        
        <div style="margin:24px 0;background:#f8fafc;border:2px solid #e2e8f0;border-radius:14px;padding:22px 24px;">
            <table role="presentation" style="width:100%;" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding:0 0 10px;">
                        <div style="font-size:12px;font-weight:800;color:#64748b;letter-spacing:0.5px;">מחלקה</div>
                        <div style="font-size:16px;font-weight:700;color:#0f172a;margin-top:2px;">${department}</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:10px 0 0;border-top:1px solid #e2e8f0;">
                        <div style="font-size:12px;font-weight:800;color:#64748b;letter-spacing:0.5px;">תפקיד</div>
                        <div style="font-size:16px;font-weight:700;color:#0f172a;margin-top:2px;">${role}</div>
                    </td>
                </tr>
            </table>
        </div>
        
        ${EmailTemplateComponents.generateCTAButton({
            text: 'השלמת הרשמה →',
            url: invitationUrl,
        })}
        
        ${EmailTemplateComponents.generateCallout({
            emoji: '⏰',
            title: 'הקישור תקף 30 יום',
            text: 'לאחר מכן תצטרך הזמנה חדשה.',
            bgColor: '#fff7ed',
            borderColor: '#fed7aa',
            titleColor: '#9a3412',
            textColor: '#9a3412',
        })}
        
        <div style="margin-top:28px;font-size:12px;color:#94a3b8;line-height:1.6;text-align:center;">
            לא ביקשת הזמנה זו? אפשר להתעלם מהמייל.
        </div>
    `;
    
    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'הזמנה להצטרף לצוות',
        headerGradient: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
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
