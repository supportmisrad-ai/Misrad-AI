/**
 * MISRAD AI — Booking Reminder Emails
 * Sends appointment reminders to customers
 */

import { getErrorMessage } from '@/lib/shared/unknown';
import { getBaseUrl } from '@/lib/utils';
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

interface BookingReminderParams {
    toEmail: string;
    customerName?: string;
    serviceName: string;
    providerName: string;
    appointmentDate: Date;
    durationMinutes: number;
    locationType: string;
    locationDetails: {
        zoomUrl?: string | null;
        meetUrl?: string | null;
        phone?: string | null;
        address?: string | null;
    };
    cancelUrl: string;
    rescheduleUrl: string;
}

function generateBookingReminderHTML(params: BookingReminderParams): string {
    const assets = getEmailAssets();
    const greeting = params.customerName ? `שלום ${params.customerName},` : 'שלום,';

    // Format date in Hebrew
    const dateStr = new Date(params.appointmentDate).toLocaleDateString('he-IL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });
    const timeStr = new Date(params.appointmentDate).toLocaleTimeString('he-IL', {
        hour: '2-digit',
        minute: '2-digit',
    });

    // Build location info
    let locationInfo = '';
    switch (params.locationType) {
        case 'zoom':
            locationInfo = params.locationDetails.zoomUrl
                ? `<a href="${params.locationDetails.zoomUrl}" style="color:#6366f1;font-weight:700;">הצטרף בזום</a>`
                : 'זום (הקישור יישלח בהודעת וואטסאפ)';
            break;
        case 'meet':
            locationInfo = params.locationDetails.meetUrl
                ? `<a href="${params.locationDetails.meetUrl}" style="color:#6366f1;font-weight:700;">הצטרף ב-Google Meet</a>`
                : 'Google Meet';
            break;
        case 'phone':
            locationInfo = params.locationDetails.phone
                ? `<a href="tel:${params.locationDetails.phone}" style="color:#6366f1;font-weight:700;">${params.locationDetails.phone}</a>`
                : 'טלפון';
            break;
        case 'address':
            locationInfo = params.locationDetails.address || 'כתובת פיזית';
            break;
        default:
            locationInfo = params.locationType;
    }

    const bodyContent = `
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">${greeting}</div>

        ${EmailTemplateComponents.generateFeatureBanner({
            emoji: '📅',
            title: 'תזכורת לפגישה',
            subtitle: 'הפגישה שלך מתקרבת',
            gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        })}

        <div style="font-size:17px;line-height:1.8;color:#334155;margin-bottom:24px;">
            זו תזכורת לפגישה שקבעת עבור <strong>${params.serviceName}</strong>.
        </div>

        <div style="margin:28px 0;padding:24px;background:#f8fafc;border-radius:14px;border:2px solid #e2e8f0;">
            <table role="presentation" style="width:100%;" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
                        <div style="font-size:12px;color:#64748b;margin-bottom:4px;">תאריך</div>
                        <div style="font-size:16px;font-weight:800;color:#0f172a;">${dateStr}</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
                        <div style="font-size:12px;color:#64748b;margin-bottom:4px;">שעה</div>
                        <div style="font-size:16px;font-weight:800;color:#0f172a;">${timeStr}</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
                        <div style="font-size:12px;color:#64748b;margin-bottom:4px;">משך</div>
                        <div style="font-size:16px;font-weight:800;color:#0f172a;">${params.durationMinutes} דקות</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
                        <div style="font-size:12px;color:#64748b;margin-bottom:4px;">נותן השירות</div>
                        <div style="font-size:16px;font-weight:800;color:#0f172a;">${params.providerName}</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:12px 0;">
                        <div style="font-size:12px;color:#64748b;margin-bottom:4px;">מיקום</div>
                        <div style="font-size:16px;font-weight:800;color:#0f172a;direction:ltr;text-align:right;">${locationInfo}</div>
                    </td>
                </tr>
            </table>
        </div>

        ${EmailTemplateComponents.generateDivider()}

        <div style="text-align:center;margin:24px 0;">
            <div style="font-size:14px;color:#64748b;margin-bottom:16px;">צריך לשנות משהו?</div>
            <div style="display:inline-block;margin:0 8px;">
                <a href="${params.rescheduleUrl}" style="display:inline-block;padding:12px 24px;background:#f1f5f9;color:#475569;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">שינוי מועד</a>
            </div>
            <div style="display:inline-block;margin:0 8px;">
                <a href="${params.cancelUrl}" style="display:inline-block;padding:12px 24px;background:#fef2f2;color:#dc2626;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">ביטול פגישה</a>
            </div>
        </div>

        ${EmailTemplateComponents.generateDivider()}

        ${EmailTemplateComponents.generateFounderCard({
            photoUrl: assets.founderPhoto,
            name: assets.founderName,
            title: assets.founderTitle,
            message: 'נשמח לראותך בפגישה. אם יש שאלות או צורך בדחייה - אנחנו פה.',
            signatureText: assets.founderSignature,
        })}
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'תזכורת לפגישה',
        headerGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}

export async function sendBookingReminderEmail(params: BookingReminderParams): Promise<EmailSendResult> {
    try {
        const resend = getResendClient();
        if (!resend) {
            if (!IS_PROD) console.warn('[Email] Email service is not configured - skipping booking reminder email');
            return { success: false, error: 'Email service not configured' };
        }

        const fromEmail = process.env.RESEND_FROM_EMAIL || 'notifications@misrad-ai.com';
        const toEmail = resolveRecipientEmail(params.toEmail);

        const html = generateBookingReminderHTML(params);

        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: toEmail,
            subject: `📅 תזכורת: ${params.serviceName} - ${new Date(params.appointmentDate).toLocaleDateString('he-IL')}`,
            html,
        });

        if (error) {
            if (!IS_PROD) {
                console.error('[Email] Resend error (booking-reminder):', {
                    message: getErrorMessage(error),
                    name: getErrorName(error),
                    code: getErrorCode(error)
                });
            } else {
                console.error('[Email] Resend error (booking-reminder)');
            }
            return { success: false, error: getErrorMessage(error) || 'Failed to send email' };
        }

        console.log('[Email] Booking reminder email sent successfully:', { emailId: data?.id });
        return { success: true };
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        const name = getErrorName(error);
        if (!IS_PROD) {
            console.error('[Email] Error sending booking reminder email:', { message, name });
        } else {
            console.error('[Email] Error sending booking reminder email');
        }
        return { success: false, error: message || 'Unknown error' };
    }
}
