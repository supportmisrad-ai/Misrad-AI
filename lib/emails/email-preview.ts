/**
 * MISRAD AI — Email Preview System
 * Generates preview HTML for email templates for testing purposes
 */

import { generateBaseEmailTemplate, EmailTemplateComponents } from '../email-templates';
import { getEmailAssets } from '../email-assets';

export interface EmailPreviewParams {
    emailType: 'welcome' | 'trial-warning' | 'trial-expired' | 'day2-checkin' | 'day7-checkin' | 'booking-reminder' | 'support-ticket' | 'founder-message';
    toEmail?: string;
    organizationName?: string;
    ownerName?: string;
    daysRemaining?: number;
    serviceName?: string;
    appointmentDate?: Date;
}

export function generateEmailPreview(params: EmailPreviewParams): string {
    const assets = getEmailAssets();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://misrad-ai.com';

    switch (params.emailType) {
        case 'welcome':
            return generateWelcomePreview(params, assets, baseUrl);
        case 'trial-warning':
            return generateTrialWarningPreview(params, assets, baseUrl);
        case 'trial-expired':
            return generateTrialExpiredPreview(params, assets, baseUrl);
        case 'day2-checkin':
            return generateDay2CheckinPreview(params, assets, baseUrl);
        case 'day7-checkin':
            return generateDay7CheckinPreview(params, assets, baseUrl);
        case 'booking-reminder':
            return generateBookingReminderPreview(params, assets, baseUrl);
        case 'support-ticket':
            return generateSupportTicketPreview(params, assets, baseUrl);
        case 'founder-message':
            return generateFounderMessagePreview(params, assets, baseUrl);
        default:
            return generateDefaultPreview(params, assets, baseUrl);
    }
}

function generateWelcomePreview(params: EmailPreviewParams, assets: ReturnType<typeof getEmailAssets>, baseUrl: string): string {
    const greeting = params.ownerName ? `שלום ${params.ownerName},` : 'שלום,';

    const bodyContent = `
        <div style="font-size:20px;font-weight:700;color:#0f172a;margin-bottom:8px;">${greeting}</div>

        <div style="font-size:16px;line-height:1.6;color:#334155;margin-bottom:28px;">
            שמחים שהצטרפת ל-<strong>MISRAD AI</strong>.
            <br />
            הנה כל מה שצריך כדי להתחיל מהר:
        </div>

        <table role="presentation" style="width:100%;margin:24px 0;border-collapse:separate;border-spacing:0 10px;" cellpadding="0" cellspacing="0">
            <tr>
                <td style="background:#f0fdf4;border-radius:8px;padding:16px;border:1px solid #bbf7d0;">
                    <div style="font-size:13px;font-weight:700;color:#065f46;margin-bottom:3px;">ניהול לידים ולקוחות</div>
                    <div style="font-size:13px;color:#166534;line-height:1.5;">כל הפניות, השיחות וההיסטוריה במקום אחד</div>
                </td>
            </tr>
            <tr>
                <td style="background:#eff6ff;border-radius:8px;padding:16px;border:1px solid #bfdbfe;">
                    <div style="font-size:13px;font-weight:700;color:#1e40af;margin-bottom:3px;">AI חכם לסיכום שיחות</div>
                    <div style="font-size:13px;color:#1e3a5f;line-height:1.5;">תמלול ועיבוד אוטומטי של שיחות עם לקוחות</div>
                </td>
            </tr>
            <tr>
                <td style="background:#faf5ff;border-radius:8px;padding:16px;border:1px solid #e9d5ff;">
                    <div style="font-size:13px;font-weight:700;color:#5b21b6;margin-bottom:3px;">דוחות ותובנות בזמן אמת</div>
                    <div style="font-size:13px;color:#6b21a8;line-height:1.5;">עקוב אחר ביצועי הצוות ותחזיות מכירה</div>
                </td>
            </tr>
        </table>

        ${EmailTemplateComponents.generateCTAButton({
            text: 'כניסה למערכת',
            url: `${baseUrl}/workspaces`,
        })}

        ${EmailTemplateComponents.generateDivider()}

        ${EmailTemplateComponents.generateFounderCard({
            photoUrl: assets.founderPhoto,
            name: assets.founderName,
            title: assets.founderTitle,
            message: 'שמח שבחרת ב-MISRAD AI. אנחנו פה בשבילך — כל שאלה, הצעה, או בעיה, פשוט תשיב למייל הזה.',
            signatureText: assets.founderSignature,
        })}
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'ברוכים הבאים',
        bodyContent,
        showSocialLinks: true,
    });
}

function generateTrialWarningPreview(params: EmailPreviewParams, assets: ReturnType<typeof getEmailAssets>, baseUrl: string): string {
    const days = params.daysRemaining || 7;
    const greeting = params.ownerName ? `${params.ownerName},` : 'שלום,';
    const urgencyText = days === 1 ? 'מחר' : `בעוד ${days} ימים`;
    const dayLabel = days === 1 ? 'יום' : days === 2 ? 'יומיים' : `${days} ימים`;

    const bodyContent = `
        <div style="font-size:20px;font-weight:700;color:#0f172a;margin-bottom:20px;">${greeting}</div>

        <div style="font-size:16px;line-height:1.6;color:#334155;margin-bottom:24px;">
            תקופת הניסיון של <strong>"${params.organizationName || 'הארגון שלך'}"</strong>
            מסתיימת <strong>${urgencyText}</strong>.
        </div>

        ${EmailTemplateComponents.generateCallout({
            emoji: '⏳',
            title: `נותרו ${dayLabel} בלבד`,
            text: 'לאחר סיום הניסיון הגישה למערכת תושהה. כל הנתונים שלך נשמרים ויחזרו מיד לאחר חידוש.',
            bgColor: '#fffbeb',
            borderColor: '#fde68a',
            titleColor: '#92400e',
            textColor: '#92400e',
        })}

        ${EmailTemplateComponents.generateCTAButton({
            text: 'מעבר לתוכנית בתשלום',
            url: `${baseUrl}/subscribe/checkout`,
        })}

        ${EmailTemplateComponents.generateDivider()}

        ${EmailTemplateComponents.generateFounderCard({
            photoUrl: assets.founderPhoto,
            name: assets.founderName,
            title: assets.founderTitle,
            message: 'אם יש משהו שמפריע לך או שצריך עזרה עם ההחלטה — תשיב למייל הזה ונסדר את זה יחד.',
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

function generateTrialExpiredPreview(params: EmailPreviewParams, assets: ReturnType<typeof getEmailAssets>, baseUrl: string): string {
    const greeting = params.ownerName ? `${params.ownerName},` : 'שלום,';

    const bodyContent = `
        <div style="font-size:20px;font-weight:700;color:#0f172a;margin-bottom:20px;">${greeting}</div>

        <div style="font-size:16px;line-height:1.6;color:#334155;margin-bottom:24px;">
            תקופת הניסיון של <strong>"${params.organizationName || 'הארגון שלך'}"</strong>
            הסתיימה. הגישה למערכת הושהתה זמנית עד להשלמת התשלום.
        </div>

        ${EmailTemplateComponents.generateCTAButton({
            text: 'חידוש מנוי',
            url: `${baseUrl}/subscribe/checkout`,
        })}
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'תקופת הניסיון הסתיימה',
        bodyContent,
        showSocialLinks: false,
    });
}

function generateDay2CheckinPreview(params: EmailPreviewParams, assets: ReturnType<typeof getEmailAssets>, baseUrl: string): string {
    return generateGenericCheckinPreview(params, assets, baseUrl, 'יומיים', 'הכל בסדר?');
}

function generateDay7CheckinPreview(params: EmailPreviewParams, assets: ReturnType<typeof getEmailAssets>, baseUrl: string): string {
    return generateGenericCheckinPreview(params, assets, baseUrl, 'שבוע', 'איך מתקדמים?');
}

function generateGenericCheckinPreview(params: EmailPreviewParams, assets: ReturnType<typeof getEmailAssets>, baseUrl: string, period: string, subtitle: string): string {
    const greeting = params.ownerName ? `${params.ownerName},` : 'שלום,';

    const bodyContent = `
        <div style="font-size:20px;font-weight:700;color:#0f172a;margin-bottom:24px;">${greeting}</div>

        <div style="font-size:16px;line-height:1.6;color:#334155;margin-bottom:24px;">
            רציתי לבדוק שהכל מסתדר עם <strong>"${params.organizationName || 'הארגון שלך'}"</strong>.
            <br />
            עברו ${period} מאז שנפתח — רק רציתי לוודא שאין שום דבר שתקוע.
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
            text: 'כניסה למערכת',
            url: `${baseUrl}/workspaces`,
        })}

        ${EmailTemplateComponents.generateDivider()}

        ${EmailTemplateComponents.generateFounderCard({
            photoUrl: assets.founderPhoto,
            name: assets.founderName,
            title: assets.founderTitle,
            message: 'אני כאן בשבילך. אם צריך — פשוט תשיב למייל הזה.',
            signatureText: assets.founderSignature,
        })}
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: subtitle,
        bodyContent,
        showSocialLinks: false,
    });
}

function generateBookingReminderPreview(params: EmailPreviewParams, assets: ReturnType<typeof getEmailAssets>, baseUrl: string): string {
    const greeting = params.ownerName ? `שלום ${params.ownerName},` : 'שלום,';
    const serviceName = params.serviceName || 'פגישה';
    const dateStr = params.appointmentDate?.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }) || 'היום';
    const timeStr = params.appointmentDate?.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) || '14:00';

    const bodyContent = `
        <div style="font-size:20px;font-weight:700;color:#0f172a;margin-bottom:24px;">${greeting}</div>

        ${EmailTemplateComponents.generateFeatureBanner({
            emoji: '📅',
            title: 'תזכורת לפגישה',
            subtitle: 'הפגישה שלך מתקרבת',
        })}

        <div style="margin:24px 0;padding:24px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
            <table role="presentation" style="width:100%;" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
                        <div style="font-size:12px;color:#64748b;margin-bottom:4px;">שירות</div>
                        <div style="font-size:16px;font-weight:700;color:#0f172a;">${serviceName}</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
                        <div style="font-size:12px;color:#64748b;margin-bottom:4px;">תאריך</div>
                        <div style="font-size:16px;font-weight:700;color:#0f172a;">${dateStr}</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:12px 0;">
                        <div style="font-size:12px;color:#64748b;margin-bottom:4px;">שעה</div>
                        <div style="font-size:16px;font-weight:700;color:#0f172a;">${timeStr}</div>
                    </td>
                </tr>
            </table>
        </div>

        ${EmailTemplateComponents.generateDivider()}

        ${EmailTemplateComponents.generateFounderCard({
            photoUrl: assets.founderPhoto,
            name: assets.founderName,
            title: assets.founderTitle,
            message: 'נשמח לראותך בפגישה. אם יש שאלות או צורך בדחייה — אנחנו פה.',
            signatureText: assets.founderSignature,
        })}
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'תזכורת לפגישה',
        bodyContent,
        showSocialLinks: false,
    });
}

function generateSupportTicketPreview(params: EmailPreviewParams, assets: ReturnType<typeof getEmailAssets>, baseUrl: string): string {
    const greeting = params.ownerName ? `שלום ${params.ownerName},` : 'שלום,';

    const bodyContent = `
        <div style="font-size:20px;font-weight:700;color:#0f172a;margin-bottom:24px;">${greeting}</div>

        ${EmailTemplateComponents.generateFeatureBanner({
            emoji: '🎫',
            title: 'קריאת שירות התקבלה',
            subtitle: 'מספר קריאה: #12345',
        })}

        <div style="font-size:16px;line-height:1.6;color:#334155;margin-bottom:24px;">
            קיבלנו את פנייתך. צוות התמיכה שלנו יבדוק ויחזור אליך בהקדם.
        </div>

        ${EmailTemplateComponents.generateCTAButton({
            text: 'צפייה בקריאה',
            url: `${baseUrl}/support/tickets/12345`,
        })}
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'תמיכה',
        bodyContent,
        showSocialLinks: false,
    });
}

function generateFounderMessagePreview(params: EmailPreviewParams, assets: ReturnType<typeof getEmailAssets>, baseUrl: string): string {
    const greeting = params.ownerName ? `היי ${params.ownerName},` : 'היי,';

    const bodyContent = `
        <div style="font-size:20px;font-weight:700;color:#0f172a;margin-bottom:20px;">${greeting}</div>

        <div style="font-size:16px;line-height:1.6;color:#334155;margin-bottom:24px;">
            ראיתי שנרשמת ל-MISRAD ב-24 השעות האחרונות, אבל לא ראיתי מנוי פעיל.
            <br /><br />
            <strong>רציתי לשאול אם משהו נתקע בדרך, ואם אני יכול לעזור?</strong>
        </div>

        ${EmailTemplateComponents.generateCTAButton({
            text: 'להשלמת מנוי / תשלום',
            url: `${baseUrl}/subscribe/checkout`,
        })}

        ${EmailTemplateComponents.generateDivider()}

        ${EmailTemplateComponents.generateFounderCard({
            photoUrl: assets.founderPhoto,
            name: assets.founderName,
            title: assets.founderTitle,
            message: 'אני יודע שהתחלה עם מערכת חדשה יכולה להיות מרתיעה. אם יש משהו שאנחנו יכולים לעשות טוב יותר — אני פה. פשוט תשיב למייל הזה.',
            signatureText: assets.founderSignature,
        })}
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'רק לבדוק שהכל בסדר',
        bodyContent,
        showSocialLinks: false,
    });
}

function generateDefaultPreview(params: EmailPreviewParams, assets: ReturnType<typeof getEmailAssets>, baseUrl: string): string {
    return generateWelcomePreview(params, assets, baseUrl);
}
