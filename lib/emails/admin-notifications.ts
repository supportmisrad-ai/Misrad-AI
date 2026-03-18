import { getErrorMessage } from '@/lib/shared/unknown';
import { getBaseUrl } from '@/lib/utils';
import { EmailTemplateComponents, generateBaseEmailTemplate } from '../email-templates';
import {
    IS_PROD,
    type ResendSendEmailParams,
    type EmailSendResult,
    resolveSupportFromEmail,
    getErrorName,
    getErrorCode,
    getResendClient,
    resolveRecipientEmail,
    resolveAdminNotificationRecipients,
} from './core';

function generateAdminNewSignupEmailHTML(params: {
    customerName?: string | null;
    customerEmail: string;
    clerkUserId: string;
    signupDate: string;
    organizationName?: string | null;
}): string {
    const name = params.customerName || 'לא ידוע';
    const orgLabel = params.organizationName || 'טרם נוצר';
    const adminUrl = `${getBaseUrl()}/admin/organizations`;

    const bodyContent = `
        ${EmailTemplateComponents.generateFeatureBanner({
            emoji: '🎉',
            title: 'לקוח חדש נרשם!',
            subtitle: 'התראת מנהל',
        })}

        <div style="font-size:20px;font-weight:700;color:#0f172a;margin-bottom:24px;text-align:center;">
            נרשם לקוח חדש ל-MISRAD AI
        </div>

        <div style="margin:24px 0;padding:24px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
            <table role="presentation" style="width:100%;" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding:0 0 16px;">
                        <div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">שם</div>
                        <div style="font-size:16px;font-weight:600;color:#0f172a;">${name}</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:16px 0;border-top:1px solid #e2e8f0;">
                        <div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">אימייל</div>
                        <div style="font-size:16px;font-weight:600;color:#0f172a;">
                            <a href="mailto:${params.customerEmail}" style="color:#0f172a;text-decoration:none;">${params.customerEmail}</a>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:16px 0;border-top:1px solid #e2e8f0;">
                        <div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">ארגון</div>
                        <div style="font-size:16px;font-weight:600;color:#0f172a;">${orgLabel}</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:16px 0 0;border-top:1px solid #e2e8f0;">
                        <div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">תאריך הרשמה</div>
                        <div style="font-size:14px;font-weight:500;color:#334155;">${params.signupDate}</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:16px 0 0;border-top:1px solid #e2e8f0;">
                        <div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Clerk User ID</div>
                        <div style="font-size:12px;font-weight:500;color:#94a3b8;font-family:monospace;">${params.clerkUserId}</div>
                    </td>
                </tr>
            </table>
        </div>

        ${EmailTemplateComponents.generateCTAButton({
            text: 'צפייה בפאנל הניהול',
            url: adminUrl,
        })}

        <div style="margin-top:16px;font-size:13px;color:#64748b;line-height:1.6;text-align:center;">
            התראה זו נשלחת אוטומטית בכל הרשמה חדשה למערכת.
        </div>
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'לקוח חדש נרשם',
        bodyContent,
        showSocialLinks: false,
    });
}

function generateAdminPaymentReceivedEmailHTML(params: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    organizationName?: string | null;
    packageLabel: string;
    billingCycle: string;
    amount: number;
    currency: string;
    orderId: string;
    paymentDate: string;
    hasProofImage: boolean;
}): string {
    const adminUrl = `${getBaseUrl()}/admin/organizations`;
    const billingLabel = params.billingCycle === 'yearly' ? 'שנתי' : 'חודשי';
    const currencySymbol = params.currency === 'ILS' ? '₪' : params.currency;
    const orgLabel = params.organizationName || 'לא ידוע';

    const bodyContent = `
        ${EmailTemplateComponents.generateFeatureBanner({
            emoji: '💳',
            title: 'תשלום התקבל!',
            subtitle: 'לקוח שילם אחרי תקופת ניסיון',
        })}

        <div style="font-size:20px;font-weight:700;color:#0f172a;margin-bottom:24px;text-align:center;">
            לקוח ביצע תשלום — נדרש אישור
        </div>

        <div style="margin:24px 0;padding:24px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;">
            <table role="presentation" style="width:100%;" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding:0 0 16px;">
                        <div style="font-size:12px;font-weight:600;color:#15803d;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">סכום</div>
                        <div style="font-size:28px;font-weight:800;color:#166534;">
                            ${currencySymbol}${params.amount}
                        </div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:16px 0 0;border-top:1px solid #bbf7d0;">
                        <div style="font-size:12px;font-weight:600;color:#15803d;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">חבילה</div>
                        <div style="font-size:16px;font-weight:600;color:#166534;">${params.packageLabel} · ${billingLabel}</div>
                    </td>
                </tr>
            </table>
        </div>

        <div style="margin:24px 0;padding:24px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
            <table role="presentation" style="width:100%;" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding:0 0 16px;">
                        <div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">שם הלקוח</div>
                        <div style="font-size:16px;font-weight:600;color:#0f172a;">${params.customerName}</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:16px 0;border-top:1px solid #e2e8f0;">
                        <div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">אימייל</div>
                        <div style="font-size:16px;font-weight:600;color:#0f172a;">
                            <a href="mailto:${params.customerEmail}" style="color:#0f172a;text-decoration:none;">${params.customerEmail}</a>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:16px 0;border-top:1px solid #e2e8f0;">
                        <div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">טלפון</div>
                        <div style="font-size:16px;font-weight:600;color:#0f172a;">
                            <a href="tel:${params.customerPhone}" style="color:#0f172a;text-decoration:none;">${params.customerPhone}</a>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:16px 0;border-top:1px solid #e2e8f0;">
                        <div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">ארגון</div>
                        <div style="font-size:16px;font-weight:600;color:#0f172a;">${orgLabel}</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:16px 0;border-top:1px solid #e2e8f0;">
                        <div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">מספר הזמנה</div>
                        <div style="font-size:13px;font-weight:500;color:#64748b;font-family:monospace;">${params.orderId}</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:16px 0 0;border-top:1px solid #e2e8f0;">
                        <div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">תאריך</div>
                        <div style="font-size:14px;font-weight:500;color:#334155;">${params.paymentDate}</div>
                    </td>
                </tr>
                ${params.hasProofImage ? `
                <tr>
                    <td style="padding:16px 0 0;border-top:1px solid #e2e8f0;">
                        <div style="display:inline-block;background:#ecfdf5;color:#065f46;padding:4px 12px;border-radius:6px;font-size:13px;font-weight:600;border:1px solid #bbf7d0;">
                            ✓ צילום מסך הוכחה צורף
                        </div>
                    </td>
                </tr>
                ` : `
                <tr>
                    <td style="padding:16px 0 0;border-top:1px solid #e2e8f0;">
                        <div style="display:inline-block;background:#fffbeb;color:#92400e;padding:4px 12px;border-radius:6px;font-size:13px;font-weight:600;border:1px solid #fde68a;">
                            ⚠ לא צורפה הוכחת תשלום
                        </div>
                    </td>
                </tr>
                `}
            </table>
        </div>

        ${EmailTemplateComponents.generateCallout({
            emoji: '⚡',
            title: 'נדרש אישור ידני',
            text: 'יש לאשר את ההזמנה בפאנל הניהול כדי להפעיל את המנוי ללקוח.',
            bgColor: '#fffbeb',
            borderColor: '#fde68a',
            titleColor: '#92400e',
            textColor: '#92400e',
        })}

        ${EmailTemplateComponents.generateCTAButton({
            text: 'אישור הזמנה בפאנל הניהול',
            url: adminUrl,
        })}

        <div style="margin-top:16px;font-size:13px;color:#64748b;line-height:1.6;text-align:center;">
            התראה זו נשלחת אוטומטית בכל הגשת הוכחת תשלום מלקוח.
        </div>
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'תשלום חדש ממתין לאישור',
        bodyContent,
        showSocialLinks: false,
    });
}

export async function sendAdminNewSignupNotification(params: {
    customerName?: string | null;
    customerEmail: string;
    clerkUserId: string;
    organizationName?: string | null;
}): Promise<EmailSendResult> {
    try {
        const resend = getResendClient();
        if (!resend) {
            if (!IS_PROD) console.warn('[Email] Resend not configured - admin signup notification skipped');
            return { success: false, error: 'Email service not configured' };
        }

        const recipients = resolveAdminNotificationRecipients();
        if (!recipients.length) {
            return { success: false, error: 'No admin notification recipients configured' };
        }

        const fromEmail = resolveSupportFromEmail();
        const now = new Date();
        const signupDate = now.toLocaleDateString('he-IL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

        const html = generateAdminNewSignupEmailHTML({
            customerName: params.customerName || null,
            customerEmail: params.customerEmail,
            clerkUserId: params.clerkUserId,
            signupDate,
            organizationName: params.organizationName || null,
        });

        const customerLabel = params.customerName || params.customerEmail;
        const sendParams: ResendSendEmailParams = {
            from: fromEmail,
            to: recipients.map(resolveRecipientEmail),
            subject: `🎉 לקוח חדש נרשם: ${customerLabel}`,
            html,
            replyTo: params.customerEmail,
        };

        const { error } = await resend.emails.send(sendParams);

        if (error) {
            if (!IS_PROD) {
                console.error('[Email] Resend error (admin-signup-notification):', {
                    message: getErrorMessage(error),
                    name: getErrorName(error),
                    code: getErrorCode(error),
                });
            } else {
                console.error('[Email] Resend error (admin-signup-notification)');
            }
            return { success: false, error: getErrorMessage(error) || 'Failed to send admin notification' };
        }

        console.log('[Email] Admin new signup notification sent successfully');
        return { success: true };
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        if (!IS_PROD) {
            console.error('[Email] Error sending admin signup notification:', { message });
        } else {
            console.error('[Email] Error sending admin signup notification');
        }
        return { success: false, error: message || 'Unknown error' };
    }
}

export async function sendAdminPaymentReceivedNotification(params: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    organizationName?: string | null;
    packageLabel: string;
    billingCycle: string;
    amount: number;
    currency: string;
    orderId: string;
    hasProofImage: boolean;
}): Promise<EmailSendResult> {
    try {
        const resend = getResendClient();
        if (!resend) {
            if (!IS_PROD) console.warn('[Email] Resend not configured - admin payment notification skipped');
            return { success: false, error: 'Email service not configured' };
        }

        const recipients = resolveAdminNotificationRecipients();
        if (!recipients.length) {
            return { success: false, error: 'No admin notification recipients configured' };
        }

        const fromEmail = resolveSupportFromEmail();
        const now = new Date();
        const paymentDate = now.toLocaleDateString('he-IL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

        const html = generateAdminPaymentReceivedEmailHTML({
            customerName: params.customerName,
            customerEmail: params.customerEmail,
            customerPhone: params.customerPhone,
            organizationName: params.organizationName || null,
            packageLabel: params.packageLabel,
            billingCycle: params.billingCycle,
            amount: params.amount,
            currency: params.currency,
            orderId: params.orderId,
            paymentDate,
            hasProofImage: params.hasProofImage,
        });

        const currencySymbol = params.currency === 'ILS' ? '₪' : params.currency;
        const sendParams: ResendSendEmailParams = {
            from: fromEmail,
            to: recipients.map(resolveRecipientEmail),
            subject: `💳 תשלום חדש: ${params.customerName} — ${currencySymbol}${params.amount} (${params.packageLabel})`,
            html,
            replyTo: params.customerEmail,
        };

        const { error } = await resend.emails.send(sendParams);

        if (error) {
            if (!IS_PROD) {
                console.error('[Email] Resend error (admin-payment-notification):', {
                    message: getErrorMessage(error),
                    name: getErrorName(error),
                    code: getErrorCode(error),
                });
            } else {
                console.error('[Email] Resend error (admin-payment-notification)');
            }
            return { success: false, error: getErrorMessage(error) || 'Failed to send admin notification' };
        }

        console.log('[Email] Admin payment received notification sent successfully:', {
            orderId: params.orderId,
            amount: params.amount,
        });
        return { success: true };
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        if (!IS_PROD) {
            console.error('[Email] Error sending admin payment notification:', { message });
        } else {
            console.error('[Email] Error sending admin payment notification');
        }
        return { success: false, error: message || 'Unknown error' };
    }
}
