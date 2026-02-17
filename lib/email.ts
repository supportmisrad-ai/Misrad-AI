import { asObject, getErrorMessage } from '@/lib/shared/unknown';
/**
 * Email utility functions using Resend
 */

import { Resend } from 'resend';
import { getBaseUrl } from '@/lib/utils';
import { EmailTemplateComponents, generateBaseEmailTemplate } from './email-templates';

const IS_PROD = process.env.NODE_ENV === 'production';

type ResendSendEmailParams = Parameters<Resend['emails']['send']>[0];

function resolveSupportFromEmail(): string {
    return (process.env.MISRAD_SUPPORT_FROM_EMAIL || 'support@misrad-ai.com').trim() || 'support@misrad-ai.com';
}

function splitSupportRecipients(input: string): string[] {
    return String(input || '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
}

function getErrorField(error: unknown, field: string): string {
    const obj = asObject(error);
    const value = obj ? obj[field] : undefined;
    return typeof value === 'string' ? value : '';
}

function getErrorName(error: unknown): string {
    if (error instanceof Error && error.name) return error.name;
    return getErrorField(error, 'name');
}

function getErrorCode(error: unknown): string {
    return getErrorField(error, 'code');
}

async function resolveSystemSupportEmail(): Promise<string> {
    let fallback = 'support@misrad-ai.com';
    try {
        const { getSystemEmailSettingsUnsafe } = await import('@/lib/server/systemEmailSettings');
        const settings = await getSystemEmailSettingsUnsafe();
        if (settings.supportEmail) {
            return String(settings.supportEmail).trim() || fallback;
        }
    } catch {
        fallback = (process.env.MISRAD_SUPPORT_EMAIL || fallback).trim() || fallback;
    }
    return fallback;
}

function generateSupportTicketReceivedEmailHTML(params: {
    name?: string | null;
    ticketNumber: string;
    subject: string;
    message: string;
    orgSlug: string;
}): string {
    const greeting = params.name ? `היי ${params.name},` : 'היי,';
    const portalUrl = `${getBaseUrl()}/w/${encodeURIComponent(params.orgSlug)}/support#my-tickets`;
    
    const bodyContent = `
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:16px;">${greeting}</div>
        
        <div style="text-align:center;margin:32px 0;">
            ${EmailTemplateComponents.Icons.CircleCheck}
        </div>
        
        <div style="font-size:17px;line-height:1.8;color:#334155;text-align:center;margin-bottom:32px;">
            הדיווח התקבל ונכנס לתור בדיקה.
            <br />
            זמן מענה משוער: 24-48 שעות.
            <br />
            <span style="display:inline-block;margin-top:12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-size:20px;font-weight:900;">
                מספר קריאה: #${params.ticketNumber}
            </span>
        </div>
        
        ${EmailTemplateComponents.generateInfoBox({
            title: 'נושא הדיווח',
            content: `<strong style="color:#0f172a;font-size:16px;">${params.subject}</strong>\n\n${params.message}`,
            backgroundColor: '#f8fafc',
            borderColor: '#e2e8f0',
        })}
        
        ${EmailTemplateComponents.generateCTAButton({
            text: 'לצפייה במרכז הדיווחים',
            url: portalUrl,
        })}
        
        <div style="margin-top:32px;padding:20px;background:#fff7ed;border-radius:14px;border:2px solid #fed7aa;">
            <div style="font-size:14px;color:#9a3412;line-height:1.7;text-align:center;">
                <strong style="color:#7c2d12;">צריך משהו נוסף?</strong>
                <br>
                אפשר להשיב ישירות למייל הזה ונחזור אליך בהקדם.
            </div>
        </div>
    `;
    
    return generateBaseEmailTemplate({
        headerTitle: 'Misrad AI',
        headerSubtitle: 'מרכז דיווח תקלות',
        headerGradient: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
        headerIcon: EmailTemplateComponents.Icons.support,
        bodyContent,
        showSocialLinks: true,
        footerAdditionalInfo: 'אנחנו כאן בשבילך',
    });
}

function generateSupportTicketReplyEmailHTML(params: {
    name?: string | null;
    ticketNumber: string;
    subject: string;
    reply: string;
    orgSlug: string;
}): string {
    const greeting = params.name ? `היי ${params.name},` : 'היי,';
    const portalUrl = `${getBaseUrl()}/w/${encodeURIComponent(params.orgSlug)}/support#my-tickets`;
    
    const bodyContent = `
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:16px;">${greeting}</div>
        
        <div style="text-align:center;margin:32px 0;">
            ${EmailTemplateComponents.Icons.mailOpen}
        </div>
        
        <div style="font-size:17px;line-height:1.8;color:#334155;text-align:center;margin-bottom:32px;">
            עדכון על הדיווח שלך.
            <br />
            <span style="display:inline-block;margin-top:12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-size:20px;font-weight:900;">
                מספר קריאה: #${params.ticketNumber}
            </span>
        </div>
        
        ${EmailTemplateComponents.generateInfoBox({
            title: 'נושא הדיווח',
            content: `<strong style="color:#0f172a;font-size:16px;">${params.subject}</strong>`,
            backgroundColor: '#f1f5f9',
            borderColor: '#cbd5e1',
        })}
        
        <div style="margin:28px 0;padding:24px;background:linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%);border-radius:16px;border:2px solid #e2e8f0;">
            <div style="font-size:13px;font-weight:800;color:#6366f1;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">
                העדכון שלנו
            </div>
            <div style="font-size:15px;font-weight:600;color:#1e293b;line-height:1.8;white-space:pre-line;">
                ${params.reply}
            </div>
        </div>
        
        ${EmailTemplateComponents.generateCTAButton({
            text: 'חזרה למרכז הדיווחים',
            url: portalUrl,
        })}
        
        <div style="margin-top:32px;padding:20px;background:#ecfdf5;border-radius:14px;border:2px solid #a7f3d0;">
            <div style="font-size:14px;color:#065f46;line-height:1.7;text-align:center;">
                <strong style="color:#047857;">יש עוד שאלה?</strong>
                <br>
                אפשר להשיב למייל הזה ואני אחזור אליך.
            </div>
        </div>
    `;
    
    return generateBaseEmailTemplate({
        headerTitle: 'Misrad AI',
        headerSubtitle: 'עדכון לגבי דיווח תקלה',
        headerGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        headerIcon: EmailTemplateComponents.Icons.mailOpen,
        bodyContent,
        showSocialLinks: true,
        footerAdditionalInfo: 'אנחנו כאן בשבילך',
    });
}

export async function sendSupportTicketReceivedEmail(params: {
    toEmail: string;
    name?: string | null;
    ticketNumber: string;
    subject: string;
    message: string;
    orgSlug: string;
}): Promise<{ success: boolean; error?: string }> {
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
}): Promise<{ success: boolean; error?: string }> {
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
}): Promise<{ success: boolean; error?: string }> {
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

// Lazy initialization - only create Resend client when needed
function getResendClient(): Resend | null {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        return null;
    }
    return new Resend(apiKey);
}

function resolveRecipientEmail(originalTo: string): string {
    const override = process.env.RESEND_TEST_TO;
    if (!override) return originalTo;
    return String(override).trim() || originalTo;
}

/**
 * Generate HTML email template for tenant invitation
 */
function generateInvitationEmailHTML(
    tenantName: string,
    ownerName: string | null,
    signupUrl: string,
    subdomain?: string
): string {
    const greeting = ownerName ? `שלום ${ownerName},` : 'שלום,';
    
    const bodyContent = `
        <div style="font-size:26px;font-weight:900;color:#0f172a;margin-bottom:20px;">${greeting}</div>
        
        <div style="text-align:center;margin:32px 0;">
            ${EmailTemplateComponents.Icons.celebration}
        </div>
        
        <div style="font-size:18px;line-height:1.8;color:#334155;text-align:center;margin-bottom:32px;">
            העסק שלך <strong style="background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-size:20px;">"${tenantName}"</strong>
            <br />
            הוקם בהצלחה במערכת Misrad AI
        </div>
        
        ${EmailTemplateComponents.generateInfoBox({
            content: 'כדי להתחיל להשתמש במערכת, לחץ על הכפתור למטה ויצור את החשבון שלך.',
            backgroundColor: '#f0f9ff',
            borderColor: '#bae6fd',
        })}
        
        ${EmailTemplateComponents.generateCTAButton({
            text: 'צור חשבון',
            url: signupUrl,
        })}
        
        ${subdomain ? `
            <div style="margin:32px 0;padding:20px;background:#fefce8;border-radius:14px;border:2px solid #fde047;text-align:center;">
                <div style="font-size:13px;font-weight:800;color:#854d0e;margin-bottom:8px;">
                    הקישור הישיר שלך
                </div>
                <a href="https://${subdomain}.nexus-os.co" style="color:#6366f1;font-size:16px;font-weight:700;text-decoration:none;">
                    https://${subdomain}.nexus-os.co
                </a>
            </div>
        ` : ''}
        
        <div style="margin-top:40px;padding:20px 0;border-top:2px solid #e2e8f0;">
            <div style="font-size:12px;color:#64748b;line-height:1.6;text-align:center;">
                הקישור תקף ללא הגבלת זמן.
                <br>
                אם לא יצרת את הבקשה, אפשר להתעלם מהמייל הזה.
            </div>
        </div>
    `;
    
    return generateBaseEmailTemplate({
        headerTitle: 'Misrad AI',
        headerSubtitle: 'ברוכים הבאים',
        headerGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        headerIcon: EmailTemplateComponents.Icons.rocket,
        bodyContent,
        showSocialLinks: true,
        footerAdditionalInfo: 'אנחנו כאן בשבילך',
    });
}

function generateOrganizationWelcomeEmailHTML(params: {
    organizationName: string;
    ownerName?: string | null;
    portalUrl: string;
}): string {
    const greeting = params.ownerName ? `שלום ${params.ownerName},` : 'שלום,';

    const bodyContent = `
        <div style="font-size:26px;font-weight:900;color:#0f172a;margin-bottom:20px;">${greeting}</div>
        
        <div style="text-align:center;margin:32px 0;">
            ${EmailTemplateComponents.Icons.celebration}
        </div>
        
        <div style="font-size:18px;line-height:1.8;color:#334155;text-align:center;margin-bottom:32px;">
            <strong style="color:#10b981;">הארגון שלך מוכן</strong>
            <br />
            <strong style="background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-size:22px;">"${params.organizationName}"</strong>
            <br />
            נוצר בהצלחה
        </div>
        
        ${EmailTemplateComponents.generateInfoBox({
            content: 'הפורטל שלך מוכן לשימוש. לחץ על הכפתור למטה לכניסה.',
            backgroundColor: '#ecfdf5',
            borderColor: '#a7f3d0',
        })}
        
        ${EmailTemplateComponents.generateCTAButton({
            text: 'כניסה לפורטל',
            url: params.portalUrl,
        })}
        
        <div style="margin-top:40px;padding:24px;background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%);border-radius:16px;border:2px solid #fbbf24;">
            <div style="text-align:center;">
                <div style="font-size:16px;font-weight:900;color:#78350f;margin-bottom:8px;">
                    ממה להתחיל?
                </div>
                <div style="font-size:14px;color:#92400e;line-height:1.7;">
                    מומלץ להתחיל עם הגדרת הפרופיל שלך והוספת חברי צוות.
                    <br>
                    אנחנו כאן לעזור בכל שלב.
                </div>
            </div>
        </div>
    `;
    
    return generateBaseEmailTemplate({
        headerTitle: 'Misrad AI',
        headerSubtitle: 'הארגון שלך מוכן לפעולה',
        headerGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        headerIcon: EmailTemplateComponents.Icons.celebration,
        bodyContent,
        showSocialLinks: true,
        footerAdditionalInfo: 'אנחנו כאן בשבילך',
    });
}

/**
 * Generate HTML email template for employee invitation
 */
function generateEmployeeInvitationEmailHTML(
    employeeName: string | null,
    employeeEmail: string,
    department: string,
    role: string,
    invitationUrl: string,
    createdByName?: string | null
): string {
    const greeting = employeeName ? `שלום ${employeeName},` : `שלום,`;
    const inviter = createdByName ? ` ${createdByName}` : '';
    
    const bodyContent = `
        <div style="font-size:26px;font-weight:900;color:#0f172a;margin-bottom:20px;">${greeting}</div>
        
        <div style="text-align:center;margin:32px 0;">
            ${EmailTemplateComponents.Icons.userPlus}
        </div>
        
        <div style="font-size:18px;line-height:1.8;color:#334155;text-align:center;margin-bottom:32px;">
            ${inviter ? `${inviter} הזמין אותך להצטרף` : 'הוזמנת להצטרף'}
        </div>
        
        ${EmailTemplateComponents.generateInfoBox({
            title: 'פרטי ההזמנה',
            content: `<strong style="color:#6366f1;">מחלקה:</strong> ${department}\n<strong style="color:#6366f1;">תפקיד:</strong> ${role}\n<strong style="color:#6366f1;">אימייל:</strong> ${employeeEmail}`,
            backgroundColor: '#f7fafc',
            borderColor: '#e2e8f0',
        })}
        
        <div style="margin:28px 0;padding:20px;background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%);border-radius:14px;border:2px solid #fbbf24;text-align:center;">
            <div style="font-size:15px;color:#78350f;line-height:1.7;">
                <strong>להשלמת ההרשמה:</strong> לחץ על הכפתור למטה
                <br>
                (הקישור תקף 30 יום)
            </div>
        </div>
        
        ${EmailTemplateComponents.generateCTAButton({
            text: 'השלמת הרשמה',
            url: invitationUrl,
        })}
        
        <div style="margin-top:40px;padding:20px 0;border-top:2px solid #e2e8f0;">
            <div style="font-size:12px;color:#64748b;line-height:1.6;text-align:center;">
                אם לא ביקשת הזמנה זו, אפשר להתעלם מהמייל.
            </div>
        </div>
    `;
    
    return generateBaseEmailTemplate({
        headerTitle: 'הזמנה להצטרף לצוות',
        headerSubtitle: 'Misrad AI - מערכת ניהול צוות מתקדמת',
        headerGradient: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
        headerIcon: EmailTemplateComponents.Icons.userPlus,
        bodyContent,
        showSocialLinks: true,
        footerAdditionalInfo: 'אנחנו כאן בשבילך',
    });
}

/**
 * Send employee invitation email
 */
export async function sendEmployeeInvitationEmail(
    employeeEmail: string,
    employeeName: string | null,
    department: string,
    role: string,
    invitationUrl: string,
    createdByName?: string | null
): Promise<{ success: boolean; error?: string }> {
    try {
        // Generate email HTML
        const html = generateEmployeeInvitationEmailHTML(
            employeeName,
            employeeEmail,
            department,
            role,
            invitationUrl,
            createdByName
        );

        // Get Resend client (lazy initialization)
        const resend = getResendClient();
        if (!resend) {
            if (!IS_PROD) console.error('[Email] Email service is not configured');
            return { success: false, error: 'Email service not configured' };
        }

        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        const toEmail = resolveRecipientEmail(employeeEmail);

        // Send email via Resend
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

function generateFirstCustomerEmailHTML(params: {
    ownerName?: string | null;
    founderName: string;
    founderPhone: string;
}): string {
    const greeting = params.ownerName ? `היי ${params.ownerName},` : 'היי,';
    
    const bodyContent = `
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:20px;">${greeting}</div>
        
        <div style="text-align:center;margin:32px 0;">
            ${EmailTemplateComponents.Icons.userPlus}
        </div>
        
        <div style="font-size:17px;line-height:1.8;color:#334155;text-align:center;margin-bottom:32px;">
            <strong style="color:#6366f1;">הודעה אישית מהמייסד</strong>
        </div>
        
        ${EmailTemplateComponents.generateInfoBox({
            content: `אני ${params.founderName}, המייסד של MISRAD.\n\nראיתי שנרשמת ואני מתרגש.\n\nאני כאן בשבילך אישית.`,
            backgroundColor: '#f0f9ff',
            borderColor: '#bae6fd',
        })}
        
        <div style="margin:32px 0;padding:24px;background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%);border-radius:16px;border:2px solid #fbbf24;text-align:center;">
            <div style="font-size:16px;font-weight:900;color:#78350f;margin-bottom:12px;">
                הנייד שלי
            </div>
            <div style="font-size:20px;font-weight:900;color:#0f172a;">
                ${params.founderPhone}
            </div>
            <div style="margin-top:8px;font-size:13px;color:#92400e;">
                אפשר לשלוח וואטסאפ או להתקשר בכל שעה
            </div>
        </div>
        
        <div style="margin-top:32px;padding:16px;background:#f1f5f9;border-radius:12px;text-align:center;">
            <div style="font-size:12px;color:#64748b;line-height:1.6;">
                אם קיבלת את ההודעה בטעות, אפשר להתעלם
            </div>
        </div>
    `;
    
    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'הודעה אישית מהמייסד',
        headerGradient: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
        bodyContent,
        showSocialLinks: false,
        footerAdditionalInfo: 'תודה שבחרת ב-MISRAD - אנחנו כאן בשבילך',
    });
}

export async function sendFirstCustomerEmail(params: {
    toEmail: string;
    ownerName?: string | null;
}): Promise<{ success: boolean; error?: string }> {
    try {
        const resend = getResendClient();
        if (!resend) {
            if (!IS_PROD) console.warn('[Email] Email service is not configured - skipping first customer email');
            return { success: false, error: 'Email service not configured' };
        }

        const founderName = (process.env.MISRAD_FOUNDER_NAME || 'איציק').trim();
        const founderPhone = (process.env.MISRAD_FOUNDER_PHONE || '').trim();
        if (!founderPhone) {
            return { success: false, error: IS_PROD ? 'Missing required configuration' : 'MISRAD_FOUNDER_PHONE is not configured' };
        }

        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        const toEmail = resolveRecipientEmail(params.toEmail);

        const html = generateFirstCustomerEmailHTML({
            ownerName: params.ownerName || null,
            founderName,
            founderPhone,
        });

        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: toEmail,
            subject: 'הודעה אישית מהמייסד של MISRAD',
            html,
        });

        if (error) {
            if (!IS_PROD) {
                console.error('[Email] Resend error (first-customer):', {
                    message: getErrorMessage(error),
                    name: getErrorName(error),
                    code: getErrorCode(error)
                });
            } else {
                console.error('[Email] Resend error (first-customer)');
            }
            return { success: false, error: getErrorMessage(error) || 'Failed to send email' };
        }

        console.log('[Email] First customer email sent successfully:', {
            emailId: data?.id,
        });

        return { success: true };
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        const name = getErrorName(error);
        if (!IS_PROD) {
            console.error('[Email] Error sending first customer email:', {
                message,
                name
            });
        } else {
            console.error('[Email] Error sending first customer email');
        }
        return { success: false, error: message || 'Unknown error' };
    }
}

function generateAbandonedSignupFollowupEmailHTML(params: {
    ownerName?: string | null;
    checkoutUrl: string;
    founderName: string;
    founderPhone?: string | null;
}): string {
    const greeting = params.ownerName ? `היי ${params.ownerName},` : 'היי,';
    const founderPhone = String(params.founderPhone || '').trim();

    const bodyContent = `
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:20px;">${greeting}</div>
        
        <div style="text-align:center;margin:32px 0;">
            ${EmailTemplateComponents.Icons.support}
        </div>
        
        <div style="font-size:17px;line-height:1.8;color:#334155;margin-bottom:32px;">
            אני ${params.founderName}. ראיתי שנרשמת ל-MISRAD ב-24 השעות האחרונות, אבל לא ראיתי מנוי פעיל.
            <br /><br />
            <strong style="color:#6366f1;">רציתי לשאול אם משהו נתקע בדרך, ואם אני יכול לעזור?</strong>
        </div>
        
        ${EmailTemplateComponents.generateCTAButton({
            text: 'להשלמת מנוי / תשלום',
            url: params.checkoutUrl,
        })}
        
        ${founderPhone ? `
            <div style="margin:32px 0;padding:20px;background:#ecfdf5;border-radius:14px;border:2px solid #a7f3d0;text-align:center;">
                <div style="font-size:15px;color:#065f46;line-height:1.7;">
                    <strong style="color:#047857;">אם נוח יותר</strong>
                    <br>
                    אפשר גם לשלוח לי וואטסאפ או להתקשר:
                    <br>
                    <strong style="font-size:18px;color:#0f172a;">${founderPhone}</strong>
                </div>
            </div>
        ` : ''}
        
        <div style="margin-top:32px;padding:16px;background:#f1f5f9;border-radius:12px;text-align:center;">
            <div style="font-size:12px;color:#64748b;line-height:1.6;">
                אם קיבלת את ההודעה בטעות, אפשר להתעלם
            </div>
        </div>
    `;
    
    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'רק לבדוק אם הכל בסדר',
        headerGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        headerIcon: EmailTemplateComponents.Icons.support,
        bodyContent,
        showSocialLinks: true,
        footerAdditionalInfo: 'אנחנו כאן לעזור',
    });
}

export async function sendAbandonedSignupFollowupEmail(params: {
    toEmail: string;
    ownerName?: string | null;
    checkoutUrl: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        const resend = getResendClient();
        if (!resend) {
            if (!IS_PROD) console.warn('[Email] Email service is not configured - skipping abandoned signup followup email');
            return { success: false, error: 'Email service not configured' };
        }

        const founderName = (process.env.MISRAD_FOUNDER_NAME || 'איציק').trim();
        const founderPhone = (process.env.MISRAD_FOUNDER_PHONE || '').trim();

        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        const toEmail = resolveRecipientEmail(params.toEmail);

        const html = generateAbandonedSignupFollowupEmailHTML({
            ownerName: params.ownerName || null,
            checkoutUrl: params.checkoutUrl,
            founderName,
            founderPhone: founderPhone || null,
        });

        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: toEmail,
            subject: 'רק לבדוק שהכל הסתדר עם ההרשמה ל-MISRAD',
            html,
        });

        if (error) {
            if (!IS_PROD) {
                console.error('[Email] Resend error (abandoned-signup-followup):', {
                    message: getErrorMessage(error),
                    name: getErrorName(error),
                    code: getErrorCode(error)
                });
            } else {
                console.error('[Email] Resend error (abandoned-signup-followup)');
            }
            return { success: false, error: getErrorMessage(error) || 'Failed to send email' };
        }

        console.log('[Email] Abandoned signup follow-up email sent successfully:', {
            emailId: data?.id,
        });

        return { success: true };
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        const name = getErrorName(error);
        if (!IS_PROD) {
            console.error('[Email] Error sending abandoned signup followup email:', {
                message,
                name
            });
        } else {
            console.error('[Email] Error sending abandoned signup followup email');
        }
        return { success: false, error: message || 'Unknown error' };
    }
}

export async function sendOrganizationWelcomeEmail(params: {
    ownerEmail: string;
    organizationName: string;
    portalUrl: string;
    ownerName?: string | null;
}): Promise<{ success: boolean; error?: string }> {
    try {
        const resend = getResendClient();
        if (!resend) {
            if (!IS_PROD) console.warn('[Email] Email service is not configured - skipping welcome email');
            return { success: false, error: 'Email service not configured' };
        }

        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        const toEmail = resolveRecipientEmail(params.ownerEmail);

        const html = generateOrganizationWelcomeEmailHTML({
            organizationName: params.organizationName,
            ownerName: params.ownerName || null,
            portalUrl: params.portalUrl,
        });

        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: toEmail,
            subject: `ברוכים הבאים! הפורטל של ${params.organizationName} מוכן`,
            html,
        });

        if (error) {
            if (!IS_PROD) {
                console.error('[Email] Resend error (welcome):', {
                    message: getErrorMessage(error),
                    name: getErrorName(error),
                    code: getErrorCode(error)
                });
            } else {
                console.error('[Email] Resend error (welcome)');
            }
            return { success: false, error: getErrorMessage(error) || 'Failed to send email' };
        }

        console.log('[Email] Organization welcome email sent successfully:', {
            emailId: data?.id,
            organizationName: params.organizationName,
        });

        return { success: true };
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        const name = getErrorName(error);
        if (!IS_PROD) {
            console.error('[Email] Error sending organization welcome email:', {
                message,
                name
            });
        } else {
            console.error('[Email] Error sending organization welcome email');
        }
        return { success: false, error: message || 'Unknown error' };
    }
}

function generateMisradWelcomeEmailHTML(params: {
    ownerName?: string | null;
    signInUrl: string;
    migrationEmail?: string | null;
    windowsUrl?: string | null;
    androidUrl?: string | null;
}): string {
    const greeting = params.ownerName ? `שלום ${params.ownerName},` : 'שלום,';
    const windowsUrl = String(params.windowsUrl ?? (process.env.MISRAD_WINDOWS_DOWNLOAD_URL || '')).trim();
    const androidUrl = String(params.androidUrl ?? (process.env.MISRAD_ANDROID_DOWNLOAD_URL || '')).trim();
    const whatsappUrl = (process.env.MISRAD_SUPPORT_WHATSAPP_URL || '').trim();
    const migrationEmail = String(params.migrationEmail ?? (process.env.MISRAD_MIGRATION_EMAIL || '')).trim();
    const videoUrl = (process.env.MISRAD_WELCOME_VIDEO_URL || '').trim();
    const videoThumbUrl = (process.env.MISRAD_WELCOME_VIDEO_THUMBNAIL_URL || '').trim();
    
    const bodyContent = `
        <div style="font-size:26px;font-weight:900;color:#0f172a;margin-bottom:20px;">${greeting}</div>
        
        <div style="text-align:center;margin:32px 0;">
            ${EmailTemplateComponents.Icons.rocket}
        </div>
        
        <div style="font-size:18px;line-height:1.8;color:#334155;text-align:center;margin-bottom:32px;">
            <strong style="color:#6366f1;">ברוכים הבאים ל-MISRAD</strong>
            <br />
            הכנו לך כמה משאבים להתחלה מהירה
        </div>
        
        ${EmailTemplateComponents.generateCTAButton({
            text: 'כניסה למערכת',
            url: params.signInUrl,
        })}
        
        ${videoUrl ? `
            <div style="margin:32px 0;padding:24px;background:linear-gradient(135deg,#f0f9ff 0%,#e0f2fe 100%);border-radius:16px;border:2px solid #bae6fd;">
                <div style="font-size:16px;font-weight:900;color:#0c4a6e;margin-bottom:16px;text-align:center;">
                    סרטון קצר: פתיחת קריאת שירות ראשונה (60 שניות)
                </div>
                ${videoThumbUrl ? `
                    <a href="${videoUrl}" style="text-decoration:none;display:block;margin-bottom:12px;">
                        <img src="${videoThumbUrl}" alt="סרטון הדרכה" style="width:100%;max-width:540px;border-radius:12px;border:2px solid #0ea5e9;display:block;margin:0 auto;" />
                    </a>
                ` : ''}
                <div style="text-align:center;">
                    <a href="${videoUrl}" style="display:inline-block;background:#0f172a;color:white;padding:14px 24px;border-radius:12px;text-decoration:none;font-weight:900;font-size:15px;box-shadow:0 4px 12px rgba(15,23,42,0.3);">
                        צפה בסרטון
                    </a>
                </div>
            </div>
        ` : ''}
        
        ${(windowsUrl || androidUrl) ? `
            <div style="margin:28px 0;padding:20px;background:#f8fafc;border-radius:14px;border:2px solid #e2e8f0;text-align:center;">
                <div style="font-size:14px;font-weight:900;color:#475569;margin-bottom:12px;">
                    הורדת האפליקציה
                </div>
                <div>
                    ${windowsUrl ? `<a href="${windowsUrl}" style="display:inline-block;margin:0 6px;padding:12px 20px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;text-decoration:none;font-size:14px;font-weight:900;box-shadow:0 4px 8px rgba(99,102,241,0.3);">Windows</a>` : ''}
                    ${androidUrl ? `<a href="${androidUrl}" style="display:inline-block;margin:0 6px;padding:12px 20px;border-radius:10px;background:linear-gradient(135deg,#10b981,#059669);color:white;text-decoration:none;font-size:14px;font-weight:900;box-shadow:0 4px 8px rgba(16,185,129,0.3);">Android</a>` : ''}
                </div>
            </div>
        ` : ''}
        
        ${whatsappUrl ? `
            <div style="text-align:center;margin:24px 0;">
                <a href="${whatsappUrl}" style="display:inline-block;background:#16a34a;color:white;padding:14px 24px;border-radius:12px;text-decoration:none;font-weight:900;font-size:15px;box-shadow:0 6px 16px rgba(22,163,74,0.4);">
                    קבוצת תמיכה בוואטסאפ
                </a>
            </div>
        ` : ''}
        
        ${(migrationEmail || whatsappUrl) ? `
            <div style="margin:28px 0;padding:20px;background:#fff7ed;border-radius:14px;border:2px solid #fed7aa;">
                <div style="font-size:15px;font-weight:900;color:#7c2d12;margin-bottom:10px;text-align:center;">
                    ייבוא נתונים מאקסל
                </div>
                <div style="font-size:14px;color:#9a3412;line-height:1.7;text-align:center;">
                    שלח לנו את האקסלים שלך ונעזור לך לייבא אותם
                    ${migrationEmail ? `<br><strong>מייל:</strong> <a href="mailto:${migrationEmail}" style="color:#c2410c;font-weight:900;text-decoration:none;">${migrationEmail}</a>` : ''}
                    ${!migrationEmail && whatsappUrl ? `<br><strong>וואטסאפ:</strong> <a href="${whatsappUrl}" style="color:#c2410c;font-weight:900;text-decoration:none;">שלח כאן</a>` : ''}
                </div>
            </div>
        ` : ''}
    `;
    
    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'ברוכים הבאים',
        headerGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        headerIcon: EmailTemplateComponents.Icons.rocket,
        bodyContent,
        showSocialLinks: true,
        footerAdditionalInfo: 'אנחנו כאן בשבילך',
    });
}

export async function sendMisradWelcomeEmail(params: {
    toEmail: string;
    ownerName?: string | null;
    signInUrl: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        const resend = getResendClient();
        if (!resend) {
            if (!IS_PROD) console.warn('[Email] Email service is not configured - skipping welcome email');
            return { success: false, error: 'Email service not configured' };
        }

        let downloadLinks: { windowsDownloadUrl: string | null; androidDownloadUrl: string | null } = {
            windowsDownloadUrl: null,
            androidDownloadUrl: null,
        };
        try {
            const { getGlobalDownloadLinksUnsafe } = await import('@/lib/server/globalDownloadLinks');
            downloadLinks = await getGlobalDownloadLinksUnsafe();
        } catch {
            downloadLinks = {
                windowsDownloadUrl: (process.env.MISRAD_WINDOWS_DOWNLOAD_URL || '').trim() || null,
                androidDownloadUrl: (process.env.MISRAD_ANDROID_DOWNLOAD_URL || '').trim() || null,
            };
        }

        let migrationEmailOverride: string | null = null;
        try {
            const { getSystemEmailSettingsUnsafe } = await import('@/lib/server/systemEmailSettings');
            const settings = await getSystemEmailSettingsUnsafe();
            migrationEmailOverride = settings.migrationEmail ? String(settings.migrationEmail).trim() : null;
        } catch {
            migrationEmailOverride = null;
        }

        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        const toEmail = resolveRecipientEmail(params.toEmail);
        const html = generateMisradWelcomeEmailHTML({
            ownerName: params.ownerName || null,
            signInUrl: params.signInUrl,
            migrationEmail: migrationEmailOverride,
            windowsUrl: downloadLinks.windowsDownloadUrl,
            androidUrl: downloadLinks.androidDownloadUrl,
        });

        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: toEmail,
            subject: `ברוכים הבאים ל-MISRAD - בואו נעשה סדר`,
            html,
        });

        if (error) {
            if (!IS_PROD) {
                console.error('[Email] Resend error (misrad-welcome):', {
                    message: getErrorMessage(error),
                    name: getErrorName(error),
                    code: getErrorCode(error)
                });
            } else {
                console.error('[Email] Resend error (misrad-welcome)');
            }
            return { success: false, error: getErrorMessage(error) || 'Failed to send email' };
        }

        console.log('[Email] MISRAD welcome email sent successfully:', {
            emailId: data?.id,
        });

        return { success: true };
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        const name = getErrorName(error);
        if (!IS_PROD) {
            console.error('[Email] Error sending MISRAD welcome email:', {
                message,
                name
            });
        } else {
            console.error('[Email] Error sending MISRAD welcome email');
        }
        return { success: false, error: message || 'Unknown error' };
    }
}

/**
 * Send tenant invitation email
 */
export async function sendTenantInvitationEmail(
    ownerEmail: string,
    tenantName: string,
    signupUrl: string,
    options?: {
        ownerName?: string | null;
        subdomain?: string;
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        // Generate email HTML
        const html = generateInvitationEmailHTML(
            tenantName,
            options?.ownerName || null,
            signupUrl,
            options?.subdomain
        );

        // Get Resend client (lazy initialization)
        const resend = getResendClient();
        if (!resend) {
            if (!IS_PROD) console.error('[Email] Email service is not configured');
            return { success: false, error: 'Email service not configured' };
        }

        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        const toEmail = resolveRecipientEmail(ownerEmail);

        // Send email via Resend
        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: toEmail,
            subject: `הזמנה להצטרף ל-Misrad - ${tenantName}`,
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

/**
 * Generate HTML email template for trial expiry warning
 */
function generateTrialExpiryWarningEmailHTML(params: {
    organizationName: string;
    ownerName?: string | null;
    daysRemaining: number;
    portalUrl: string;
}): string {
    const greeting = params.ownerName ? `שלום ${params.ownerName},` : 'שלום,';
    const urgencyColor = params.daysRemaining <= 1 ? '#ef4444' : params.daysRemaining <= 3 ? '#f59e0b' : '#6366f1';
    const urgencyText = params.daysRemaining === 1 ? 'מחר' : `בעוד ${params.daysRemaining} ימים`;

    const bodyContent = `
        <div style="font-size:26px;font-weight:900;color:#0f172a;margin-bottom:20px;">${greeting}</div>

        <div style="text-align:center;margin:32px 0;">
            ${EmailTemplateComponents.Icons.support}
        </div>

        <div style="font-size:18px;line-height:1.8;color:#334155;text-align:center;margin-bottom:32px;">
            תקופת הניסיון של <strong style="color:#6366f1;">"${params.organizationName}"</strong>
            <br />
            תסתיים <strong style="color:${urgencyColor};">${urgencyText}</strong>
        </div>

        ${EmailTemplateComponents.generateInfoBox({
            title: 'מה קורה אחרי סיום תקופת הניסיון?',
            content: 'הגישה למערכת תיחסם עד להשלמת התשלום.\nכל הנתונים שלך נשמרים ויחזרו מיד לאחר חידוש המנוי.',
            backgroundColor: params.daysRemaining <= 3 ? '#fff7ed' : '#f0f9ff',
            borderColor: params.daysRemaining <= 3 ? '#fed7aa' : '#bae6fd',
        })}

        ${EmailTemplateComponents.generateCTAButton({
            text: 'השלמת תשלום ומעבר לתוכנית בתשלום',
            url: params.portalUrl,
        })}

        <div style="margin:32px 0;padding:24px;background:linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%);border-radius:16px;border:2px solid #a7f3d0;">
            <div style="font-size:16px;font-weight:900;color:#065f46;margin-bottom:12px;text-align:center;">
                צריך עזרה?
            </div>
            <div style="font-size:14px;color:#047857;line-height:1.7;text-align:center;">
                אנחנו כאן בשבילך! פשוט השב למייל הזה או צור קשר דרך הפורטל.
            </div>
        </div>

        <div style="margin-top:32px;padding:16px;background:#f1f5f9;border-radius:12px;text-align:center;">
            <div style="font-size:12px;color:#64748b;line-height:1.6;">
                כדי לשמור על הרצף והגישה למערכת, מומלץ להשלים את התשלום בהקדם
            </div>
        </div>
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: `תקופת הניסיון מסתיימת ${urgencyText}`,
        headerGradient: `linear-gradient(135deg, ${urgencyColor} 0%, ${params.daysRemaining <= 3 ? '#dc2626' : '#4f46e5'} 100%)`,
        headerIcon: EmailTemplateComponents.Icons.support,
        bodyContent,
        showSocialLinks: true,
        footerAdditionalInfo: 'אנחנו כאן בשבילך',
    });
}

/**
 * Send trial expiry warning email
 */
export async function sendTrialExpiryWarningEmail(params: {
    toEmail: string;
    organizationName: string;
    ownerName?: string | null;
    daysRemaining: number;
    portalUrl: string;
}): Promise<{ success: boolean; error?: string }> {
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
            console.error('[Email] Error sending trial expiry warning email:', {
                message,
                name
            });
        } else {
            console.error('[Email] Error sending trial expiry warning email');
        }
        return { success: false, error: message || 'Unknown error' };
    }
}
