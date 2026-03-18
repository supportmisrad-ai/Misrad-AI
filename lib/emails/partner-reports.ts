/**
 * MISRAD AI — Partner Monthly Commission Email
 * דו״ח חודשי לשותפים על עמלות והפניות
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

function generatePartnerMonthlyReportHTML(params: {
    partnerName: string;
    month: string;
    year: number;
    totalReferrals: number;
    newReferralsThisMonth: number;
    activeSubscribers: number;
    totalRevenue: number;
    commissionEarned: number;
    unpaidCommission: number;
    referralCode: string;
    dashboardUrl: string;
    currentTier?: string;
    nextTier?: string;
    referralsToNextTier?: number;
    competitionRank?: number;
    competitionPrize?: number;
}): string {
    const assets = getEmailAssets();
    const greeting = `היי ${params.partnerName},`;

    // Tier display
    const tierDisplay = params.currentTier ? `
        <div style="margin:20px 0;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;text-align:center;">
            <div style="font-size:12px;font-weight:600;color:#64748b;margin-bottom:4px;">הדרגה שלך</div>
            <div style="font-size:20px;font-weight:700;color:#0f172a;">${params.currentTier}</div>
            ${params.nextTier ? `<div style="font-size:13px;color:#64748b;margin-top:4px;">עוד ${params.referralsToNextTier || 0} לקוחות לדרגה הבאה!</div>` : ''}
        </div>
    ` : '';

    // Competition display
    const competitionDisplay = params.competitionRank ? `
        <div style="margin:20px 0;padding:16px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;text-align:center;">
            <div style="font-size:12px;font-weight:600;color:#92400e;margin-bottom:4px;">🏆 דירוג בתחרות החודשית</div>
            <div style="font-size:24px;font-weight:700;color:#0f172a;">מקום ${params.competitionRank}</div>
            ${params.competitionRank === 1 ? `<div style="font-size:14px;color:#059669;font-weight:600;margin-top:4px;">🎉 זכית ב-1000₪ בונוס!</div>` : params.competitionRank <= 3 ? `<div style="font-size:13px;color:#92400e;margin-top:4px;">עוד קצת ואתה במקום הראשון!</div>` : ''}
        </div>
    ` : '';

    const bodyContent = `
        <div style="font-size:20px;font-weight:700;color:#0f172a;margin-bottom:20px;">${greeting}</div>

        <div style="font-size:16px;line-height:1.6;color:#334155;margin-bottom:24px;">
            הנה הסיכום שלך לחודש <strong>${params.month} ${params.year}</strong> — 
            המשיכו להפנות לקוחות והעמלות ימשיכו להצטבר 💰
        </div>

        ${tierDisplay}
        ${competitionDisplay}

        ${EmailTemplateComponents.generateInfoBox({
            title: 'סיכום חודשי',
            content: `
📊 סה״כ הפניות: <strong>${params.totalReferrals}</strong>
🆕 הפניות חדשות החודש: <strong>${params.newReferralsThisMonth}</strong>
✅ מנויים פעילים: <strong>${params.activeSubscribers}</strong>
            `.trim(),
            backgroundColor: '#f0fdf4',
            borderColor: '#bbf7d0',
        })}

        ${EmailTemplateComponents.generateInfoBox({
            title: 'הכנסות',
            content: `
💵 הכנסות החודש: <strong style="font-size:18px;color:#059669;">₪${params.totalRevenue.toLocaleString()}</strong>
💰 עמלה שהרווחת: <strong style="font-size:18px;color:#059669;">₪${params.commissionEarned.toLocaleString()}</strong>
📦 עמלה לא שולמה (עדיין): <strong>₪${params.unpaidCommission.toLocaleString()}</strong>
            `.trim(),
            backgroundColor: '#f0fdf4',
            borderColor: '#bbf7d0',
        })}

        <div style="margin:28px 0;padding:20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;text-align:center;">
            <div style="font-size:12px;font-weight:600;color:#64748b;margin-bottom:8px;">
                הקוד האישי שלך להפניות
            </div>
            <div style="font-size:24px;font-weight:700;color:#0f172a;letter-spacing:1px;">
                ${params.referralCode}
            </div>
            <div style="margin-top:8px;font-size:13px;color:#64748b;">
                שתף את הלינק: <a href="${params.dashboardUrl}?ref=${params.referralCode}" style="color:#6366f1;word-break:break-all;">${params.dashboardUrl}?ref=${params.referralCode}</a>
            </div>
        </div>

        ${EmailTemplateComponents.generateCTAButton({
            text: 'צפייה בדו״ח המלא',
            url: params.dashboardUrl,
        })}

        ${EmailTemplateComponents.generateDivider()}

        <div style="font-size:14px;color:#64748b;line-height:1.6;text-align:center;">
            💡 טיפ: שתף את הלינק האישי שלך ברשתות החברתיות, בקבוצות וואטסאפ ועם לקוחות פוטנציאליים.
            <br />
            כל לקוח שנרשם דרכך מקבל <strong>50% הנחה</strong> לחצי שנה!
        </div>

        ${EmailTemplateComponents.generateDivider()}

        ${EmailTemplateComponents.generateFounderCard({
            photoUrl: assets.founderPhoto,
            name: assets.founderName,
            title: assets.founderTitle,
            message: 'השותפות שלך חשובה לנו. אם יש שאלות או צריך עזרה — פשוט תשיב למייל הזה.',
            signatureText: assets.founderSignature,
        })}
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: `דו״ח שותפים - ${params.month} ${params.year}`,
        bodyContent,
        showSocialLinks: false,
    });
}

export async function sendPartnerMonthlyReportEmail(params: {
    toEmail: string;
    partnerName: string;
    month: string;
    year: number;
    totalReferrals: number;
    newReferralsThisMonth: number;
    activeSubscribers: number;
    totalRevenue: number;
    commissionEarned: number;
    unpaidCommission: number;
    referralCode: string;
    dashboardUrl?: string;
}): Promise<EmailSendResult> {
    try {
        const resend = getResendClient();
        if (!resend) {
            if (!IS_PROD) console.warn('[Email] Email service is not configured - skipping partner monthly report');
            return { success: false, error: 'Email service not configured' };
        }

        const html = generatePartnerMonthlyReportHTML({
            partnerName: params.partnerName,
            month: params.month,
            year: params.year,
            totalReferrals: params.totalReferrals,
            newReferralsThisMonth: params.newReferralsThisMonth,
            activeSubscribers: params.activeSubscribers,
            totalRevenue: params.totalRevenue,
            commissionEarned: params.commissionEarned,
            unpaidCommission: params.unpaidCommission,
            referralCode: params.referralCode,
            dashboardUrl: params.dashboardUrl || `${getBaseUrl()}/app/admin/partners`,
        });

        const toEmail = resolveRecipientEmail(params.toEmail);

        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
            to: toEmail,
            subject: `דו״ח שותפים - ${params.month} ${params.year} | MISRAD AI`,
            html,
        });

        if (error) {
            const name = getErrorName(error);
            const code = getErrorCode(error);
            if (!IS_PROD) {
                console.error('[Email] Failed to send partner monthly report:', { name, code, message: error.message });
            } else {
                console.error('[Email] Failed to send partner monthly report');
            }
            return { success: false, error: error.message || 'Failed to send email' };
        }

        console.log('[Email] Partner monthly report sent successfully:', { emailId: data?.id });
        return { success: true };
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        const name = getErrorName(error);
        if (!IS_PROD) {
            console.error('[Email] Error sending partner monthly report:', { message, name });
        } else {
            console.error('[Email] Error sending partner monthly report');
        }
        return { success: false, error: message || 'Unknown error' };
    }
}
