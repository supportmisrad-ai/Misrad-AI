/**
 * MISRAD AI — Email HTML Generators
 * All NEW email types that don't exist in email.ts yet.
 * Each function returns raw HTML string via generateBaseEmailTemplate.
 *
 * Naming: generate{EmailTypeId}EmailHTML
 */

import { getBaseUrl } from '@/lib/utils';
import { EmailTemplateComponents, generateBaseEmailTemplate } from './email-templates';
import { getEmailAssets } from './email-assets';

// ══════════════════════════════════════════════════════════════════════
// BILLING EMAILS
// ══════════════════════════════════════════════════════════════════════

export function generatePaymentSuccessEmailHTML(params: {
    ownerName?: string | null;
    organizationName: string;
    amount: number;
    currency?: string;
    invoiceNumber?: string;
    invoiceUrl?: string;
    portalUrl: string;
}): string {
    const greeting = params.ownerName ? `${params.ownerName},` : 'שלום,';
    const curr = params.currency || 'ILS';
    const symbol = curr === 'ILS' ? '₪' : curr;

    const bodyContent = `
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">${greeting}</div>

        <div style="font-size:17px;line-height:1.8;color:#334155;margin-bottom:24px;">
            התשלום עבור <strong style="color:#6366f1;">"${params.organizationName}"</strong> התקבל בהצלחה.
        </div>

        <div style="margin:24px 0;background:#ecfdf5;border:2px solid #a7f3d0;border-radius:14px;padding:24px;text-align:center;">
            <div style="font-size:12px;font-weight:800;color:#065f46;letter-spacing:0.5px;margin-bottom:8px;">סכום ששולם</div>
            <div style="font-size:32px;font-weight:900;color:#059669;">${symbol}${params.amount.toLocaleString()}</div>
            ${params.invoiceNumber ? `<div style="font-size:13px;color:#047857;margin-top:8px;">חשבונית #${params.invoiceNumber}</div>` : ''}
        </div>

        ${params.invoiceUrl ? EmailTemplateComponents.generateSecondaryCTA({
            text: 'צפייה בחשבונית',
            url: params.invoiceUrl,
        }) : ''}

        ${EmailTemplateComponents.generateCTAButton({
            text: 'כניסה למערכת →',
            url: params.portalUrl,
        })}
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'התשלום התקבל',
        headerGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}

export function generateInvoiceCreatedEmailHTML(params: {
    ownerName?: string | null;
    organizationName: string;
    amount: number;
    currency?: string;
    invoiceNumber: string;
    invoiceUrl?: string;
    pdfUrl?: string;
    paymentUrl?: string;
    portalUrl: string;
    description?: string;
    dueDate?: string;
}): string {
    const greeting = params.ownerName ? `${params.ownerName},` : 'שלום,';
    const curr = params.currency || 'ILS';
    const symbol = curr === 'ILS' ? '₪' : curr;

    const bodyContent = `
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">${greeting}</div>

        <div style="font-size:17px;line-height:1.8;color:#334155;margin-bottom:24px;">
            חשבונית חדשה הונפקה עבור <strong style="color:#6366f1;">"${params.organizationName}"</strong>.
            ${params.description ? `<br /><span style="color:#64748b;font-size:14px;">${params.description}</span>` : ''}
        </div>

        <div style="margin:24px 0;background:#eff6ff;border:2px solid #bfdbfe;border-radius:14px;padding:24px;text-align:center;">
            <div style="font-size:12px;font-weight:800;color:#1e40af;letter-spacing:0.5px;margin-bottom:8px;">סכום לתשלום</div>
            <div style="font-size:36px;font-weight:900;color:#1d4ed8;">${symbol}${params.amount.toLocaleString()}</div>
            <div style="font-size:13px;color:#3b82f6;margin-top:8px;">חשבונית #${params.invoiceNumber}</div>
            ${params.dueDate ? `<div style="font-size:12px;color:#64748b;margin-top:4px;">לתשלום עד: ${params.dueDate}</div>` : ''}
        </div>

        ${params.paymentUrl ? EmailTemplateComponents.generateCTAButton({
            text: 'תשלום מאובטח עכשיו →',
            url: params.paymentUrl,
        }) : ''}

        ${params.pdfUrl ? EmailTemplateComponents.generateSecondaryCTA({
            text: 'הורדת חשבונית PDF',
            url: params.pdfUrl,
        }) : params.invoiceUrl ? EmailTemplateComponents.generateSecondaryCTA({
            text: 'צפייה בחשבונית',
            url: params.invoiceUrl,
        }) : ''}

        <div style="margin-top:28px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;font-size:13px;color:#64748b;line-height:1.7;">
            שאלות לגבי החשבונית? השב למייל זה או פנה ל-<a href="mailto:billing@misrad-ai.com" style="color:#6366f1;">billing@misrad-ai.com</a>
        </div>
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'חשבונית חדשה',
        headerGradient: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}

export function generatePaymentFailedEmailHTML(params: {
    ownerName?: string | null;
    organizationName: string;
    amount: number;
    reason?: string;
    retryUrl: string;
}): string {
    const greeting = params.ownerName ? `${params.ownerName},` : 'שלום,';

    const bodyContent = `
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">${greeting}</div>

        <div style="font-size:17px;line-height:1.8;color:#334155;margin-bottom:24px;">
            התשלום עבור <strong style="color:#6366f1;">"${params.organizationName}"</strong> נכשל.
            ${params.reason ? `<br /><span style="color:#94a3b8;font-size:14px;">סיבה: ${params.reason}</span>` : ''}
        </div>

        ${EmailTemplateComponents.generateCallout({
            emoji: '⚠️',
            title: 'מה עכשיו?',
            text: 'יש לעדכן את אמצעי התשלום. אם לא יתעדכן תוך 7 ימים — הגישה למערכת תיחסם.',
            bgColor: '#fff7ed',
            borderColor: '#fed7aa',
            titleColor: '#9a3412',
            textColor: '#9a3412',
        })}

        ${EmailTemplateComponents.generateCTAButton({
            text: 'עדכון אמצעי תשלום →',
            url: params.retryUrl,
        })}

        <div style="margin-top:28px;font-size:13px;color:#64748b;line-height:1.7;text-align:center;">
            שאלות? תשיב למייל הזה או פנה ל-<a href="mailto:billing@misrad-ai.com" style="color:#6366f1;">billing@misrad-ai.com</a>
        </div>
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'בעיה בתשלום',
        headerGradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}

export function generatePlanChangedEmailHTML(params: {
    ownerName?: string | null;
    organizationName: string;
    oldPlan: string;
    newPlan: string;
    newPrice: number;
    effectiveDate: string;
    portalUrl: string;
}): string {
    const greeting = params.ownerName ? `${params.ownerName},` : 'שלום,';

    const bodyContent = `
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">${greeting}</div>

        <div style="font-size:17px;line-height:1.8;color:#334155;margin-bottom:24px;">
            החבילה של <strong style="color:#6366f1;">"${params.organizationName}"</strong> עודכנה בהצלחה.
        </div>

        <div style="margin:24px 0;background:#f8fafc;border:2px solid #e2e8f0;border-radius:14px;padding:22px 24px;">
            <table role="presentation" style="width:100%;" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding:0 0 12px;">
                        <div style="font-size:12px;font-weight:800;color:#64748b;">חבילה קודמת</div>
                        <div style="font-size:16px;font-weight:700;color:#94a3b8;margin-top:4px;text-decoration:line-through;">${params.oldPlan}</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:12px 0 0;border-top:1px solid #e2e8f0;">
                        <div style="font-size:12px;font-weight:800;color:#64748b;">חבילה חדשה</div>
                        <div style="font-size:18px;font-weight:900;color:#6366f1;margin-top:4px;">${params.newPlan} — ₪${params.newPrice.toLocaleString()}/חודש</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:12px 0 0;border-top:1px solid #e2e8f0;">
                        <div style="font-size:12px;font-weight:800;color:#64748b;">תאריך תחילה</div>
                        <div style="font-size:15px;font-weight:700;color:#0f172a;margin-top:4px;">${params.effectiveDate}</div>
                    </td>
                </tr>
            </table>
        </div>

        ${EmailTemplateComponents.generateCTAButton({
            text: 'צפייה בפרטי החבילה →',
            url: params.portalUrl,
        })}
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'החבילה עודכנה',
        headerGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}

export function generateTrialExpiredEmailHTML(params: {
    ownerName?: string | null;
    organizationName: string;
    checkoutUrl: string;
}): string {
    const greeting = params.ownerName ? `${params.ownerName},` : 'שלום,';

    const bodyContent = `
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">${greeting}</div>

        <div style="font-size:17px;line-height:1.8;color:#334155;margin-bottom:24px;">
            תקופת הניסיון של <strong style="color:#6366f1;">"${params.organizationName}"</strong> הסתיימה.
            <br />הגישה למערכת נחסמה, אבל <strong>כל הנתונים שלך נשמרים</strong>.
        </div>

        ${EmailTemplateComponents.generateCTAButton({
            text: 'בחירת חבילה והפעלה מחדש →',
            url: params.checkoutUrl,
        })}

        <div style="margin-top:28px;font-size:13px;color:#64748b;line-height:1.7;text-align:center;">
            שאלות? <a href="mailto:billing@misrad-ai.com" style="color:#6366f1;">billing@misrad-ai.com</a>
        </div>
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'תקופת הניסיון הסתיימה',
        headerGradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}

export function generateSubscriptionCancelledEmailHTML(params: {
    ownerName?: string | null;
    organizationName: string;
    accessEndDate: string;
    reactivateUrl: string;
}): string {
    const greeting = params.ownerName ? `${params.ownerName},` : 'שלום,';

    const bodyContent = `
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">${greeting}</div>

        <div style="font-size:17px;line-height:1.8;color:#334155;margin-bottom:24px;">
            המנוי של <strong style="color:#6366f1;">"${params.organizationName}"</strong> בוטל.
        </div>

        ${EmailTemplateComponents.generateCallout({
            emoji: '📋',
            title: 'מה קורה עכשיו?',
            text: 'הגישה למערכת תישאר פעילה עד ' + params.accessEndDate + '. אחרי כן, הנתונים יישמרו אבל הגישה תיחסם.',
            bgColor: '#eff6ff',
            borderColor: '#bfdbfe',
            titleColor: '#1e40af',
            textColor: '#1e3a5f',
        })}

        ${EmailTemplateComponents.generateCTAButton({
            text: 'הפעלה מחדש →',
            url: params.reactivateUrl,
        })}

        <div style="margin-top:28px;font-size:14px;color:#64748b;line-height:1.7;">
            מצטערים לראות אותך עוזב. אם יש משהו שיכולנו לעשות טוב יותר — נשמח לשמוע.
        </div>
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'המנוי בוטל',
        headerGradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}

// ══════════════════════════════════════════════════════════════════════
// ORGANIZATION LIFECYCLE
// ══════════════════════════════════════════════════════════════════════

export function generateOrgClosedEmailHTML(params: {
    ownerName?: string | null;
    organizationName: string;
    dataRetentionDays: number;
    reactivateUrl: string;
}): string {
    const greeting = params.ownerName ? `${params.ownerName},` : 'שלום,';

    const bodyContent = `
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">${greeting}</div>

        <div style="font-size:17px;line-height:1.8;color:#334155;margin-bottom:24px;">
            הארגון <strong style="color:#6366f1;">"${params.organizationName}"</strong> נסגר בהצלחה.
        </div>

        ${EmailTemplateComponents.generateCallout({
            emoji: '💾',
            title: 'שמירת נתונים',
            text: 'הנתונים שלך נשמרים במערכת למשך ' + params.dataRetentionDays + ' יום. ניתן להפעיל מחדש בכל עת.',
            bgColor: '#eff6ff',
            borderColor: '#bfdbfe',
            titleColor: '#1e40af',
            textColor: '#1e3a5f',
        })}

        ${EmailTemplateComponents.generateCTAButton({
            text: 'הפעלה מחדש →',
            url: params.reactivateUrl,
        })}
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'הארגון נסגר',
        headerGradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}

export function generateTeamMemberRemovedEmailHTML(params: {
    memberName?: string | null;
    organizationName: string;
    removedByName?: string | null;
}): string {
    const greeting = params.memberName ? `${params.memberName},` : 'שלום,';

    const bodyContent = `
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">${greeting}</div>

        <div style="font-size:17px;line-height:1.8;color:#334155;margin-bottom:24px;">
            הגישה שלך לארגון <strong style="color:#6366f1;">"${params.organizationName}"</strong> הוסרה
            ${params.removedByName ? ` על ידי ${params.removedByName}` : ''}.
        </div>

        <div style="font-size:14px;color:#64748b;line-height:1.7;">
            אם לדעתך מדובר בטעות, פנה למנהל הארגון.
        </div>
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'הגישה הוסרה',
        headerGradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}

export function generateTeamRoleChangedEmailHTML(params: {
    memberName?: string | null;
    organizationName: string;
    oldRole: string;
    newRole: string;
    changedByName?: string | null;
    portalUrl: string;
}): string {
    const greeting = params.memberName ? `${params.memberName},` : 'שלום,';

    const bodyContent = `
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">${greeting}</div>

        <div style="font-size:17px;line-height:1.8;color:#334155;margin-bottom:24px;">
            התפקיד שלך ב-<strong style="color:#6366f1;">"${params.organizationName}"</strong> עודכן
            ${params.changedByName ? ` על ידי ${params.changedByName}` : ''}.
        </div>

        <div style="margin:24px 0;background:#f8fafc;border:2px solid #e2e8f0;border-radius:14px;padding:22px 24px;">
            <table role="presentation" style="width:100%;" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding:0 0 10px;">
                        <div style="font-size:12px;font-weight:800;color:#64748b;">תפקיד קודם</div>
                        <div style="font-size:16px;font-weight:700;color:#94a3b8;margin-top:2px;">${params.oldRole}</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:10px 0 0;border-top:1px solid #e2e8f0;">
                        <div style="font-size:12px;font-weight:800;color:#64748b;">תפקיד חדש</div>
                        <div style="font-size:18px;font-weight:900;color:#6366f1;margin-top:2px;">${params.newRole}</div>
                    </td>
                </tr>
            </table>
        </div>

        ${EmailTemplateComponents.generateCTAButton({
            text: 'כניסה למערכת →',
            url: params.portalUrl,
        })}
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'התפקיד עודכן',
        headerGradient: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}

export function generateTeamMemberJoinedEmailHTML(params: {
    ownerName?: string | null;
    memberName: string;
    memberEmail: string;
    role: string;
    organizationName: string;
    portalUrl: string;
}): string {
    const greeting = params.ownerName ? `${params.ownerName},` : 'שלום,';

    const bodyContent = `
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">${greeting}</div>

        <div style="font-size:17px;line-height:1.8;color:#334155;margin-bottom:24px;">
            <strong style="color:#6366f1;">${params.memberName}</strong> הצטרף לצוות של "${params.organizationName}".
        </div>

        <div style="margin:24px 0;background:#ecfdf5;border:2px solid #a7f3d0;border-radius:14px;padding:22px 24px;">
            <table role="presentation" style="width:100%;" cellpadding="0" cellspacing="0">
                <tr><td style="font-size:12px;font-weight:800;color:#065f46;">שם</td></tr>
                <tr><td style="font-size:16px;font-weight:700;color:#0f172a;padding-bottom:10px;">${params.memberName}</td></tr>
                <tr><td style="font-size:12px;font-weight:800;color:#065f46;border-top:1px solid #a7f3d0;padding-top:10px;">תפקיד</td></tr>
                <tr><td style="font-size:16px;font-weight:700;color:#0f172a;">${params.role}</td></tr>
            </table>
        </div>

        ${EmailTemplateComponents.generateCTAButton({
            text: 'ניהול הצוות →',
            url: params.portalUrl,
        })}
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'חבר צוות חדש',
        headerGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}

// ══════════════════════════════════════════════════════════════════════
// SECURITY EMAILS
// ══════════════════════════════════════════════════════════════════════

export function generateSecurityNewDeviceEmailHTML(params: {
    userName?: string | null;
    device: string;
    location: string;
    time: string;
    ip: string;
    securityUrl: string;
}): string {
    const greeting = params.userName ? `${params.userName},` : 'שלום,';

    const bodyContent = `
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">${greeting}</div>

        <div style="font-size:17px;line-height:1.8;color:#334155;margin-bottom:24px;">
            זוהתה כניסה לחשבון שלך מהתקן חדש.
        </div>

        <div style="margin:24px 0;background:#fef2f2;border:2px solid #fecaca;border-radius:14px;padding:22px 24px;">
            <table role="presentation" style="width:100%;" cellpadding="0" cellspacing="0">
                <tr><td style="padding:0 0 8px;"><span style="font-size:12px;font-weight:800;color:#991b1b;">מכשיר:</span> <span style="font-size:14px;color:#0f172a;">${params.device}</span></td></tr>
                <tr><td style="padding:0 0 8px;"><span style="font-size:12px;font-weight:800;color:#991b1b;">מיקום:</span> <span style="font-size:14px;color:#0f172a;">${params.location}</span></td></tr>
                <tr><td style="padding:0 0 8px;"><span style="font-size:12px;font-weight:800;color:#991b1b;">זמן:</span> <span style="font-size:14px;color:#0f172a;">${params.time}</span></td></tr>
                <tr><td><span style="font-size:12px;font-weight:800;color:#991b1b;">IP:</span> <span style="font-size:14px;color:#0f172a;">${params.ip}</span></td></tr>
            </table>
        </div>

        ${EmailTemplateComponents.generateCallout({
            emoji: '🔒',
            title: 'לא את/ה?',
            text: 'אם לא ביצעת את הכניסה הזו, שנה סיסמה מיד.',
            bgColor: '#fef2f2',
            borderColor: '#fecaca',
            titleColor: '#991b1b',
            textColor: '#991b1b',
        })}

        ${EmailTemplateComponents.generateCTAButton({
            text: 'בדיקת אבטחה →',
            url: params.securityUrl,
        })}
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'התראת אבטחה',
        headerGradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}

export function generatePasswordChangedEmailHTML(params: {
    userName?: string | null;
    time: string;
    securityUrl: string;
}): string {
    const greeting = params.userName ? `${params.userName},` : 'שלום,';

    const bodyContent = `
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">${greeting}</div>

        <div style="font-size:17px;line-height:1.8;color:#334155;margin-bottom:24px;">
            הסיסמה של החשבון שלך שונתה בהצלחה ב-${params.time}.
        </div>

        ${EmailTemplateComponents.generateCallout({
            emoji: '🔒',
            title: 'לא שינית סיסמה?',
            text: 'אם לא ביצעת את השינוי, פנה מיד לתמיכה.',
            bgColor: '#fff7ed',
            borderColor: '#fed7aa',
            titleColor: '#9a3412',
            textColor: '#9a3412',
        })}

        ${EmailTemplateComponents.generateCTAButton({
            text: 'הגדרות אבטחה',
            url: params.securityUrl,
        })}
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'הסיסמה שונתה',
        headerGradient: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}

// ══════════════════════════════════════════════════════════════════════
// SYSTEM EMAILS
// ══════════════════════════════════════════════════════════════════════

export function generateWeeklyReportEmailHTML(params: {
    ownerName?: string | null;
    organizationName: string;
    weekRange: string;
    stats: {
        activeUsers: number;
        newClients: number;
        tasksCompleted: number;
        aiCreditsUsed: number;
        aiCreditsTotal: number;
    };
    portalUrl: string;
    chartImageUrl?: string;
    topAchievement?: string;
}): string {
    const assets = getEmailAssets();
    const greeting = params.ownerName ? `${params.ownerName},` : 'שלום,';
    const aiPercent = params.stats.aiCreditsTotal > 0
        ? Math.round((params.stats.aiCreditsUsed / params.stats.aiCreditsTotal) * 100)
        : 0;

    const bodyContent = `
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">${greeting}</div>

        <div style="font-size:17px;line-height:1.8;color:#334155;margin-bottom:24px;">
            הנה הסיכום השבועי של <strong style="color:#6366f1;">"${params.organizationName}"</strong> ☕
            <br /><span style="color:#94a3b8;font-size:14px;">${params.weekRange}</span>
        </div>

        ${params.topAchievement ? EmailTemplateComponents.generateCallout({
            emoji: '🏆',
            title: 'ההישג של השבוע',
            text: params.topAchievement,
            bgColor: '#ecfdf5',
            borderColor: '#a7f3d0',
            titleColor: '#065f46',
            textColor: '#047857',
        }) : ''}

        ${EmailTemplateComponents.generateStatCard({
            items: [
                { label: 'משתמשים פעילים', value: String(params.stats.activeUsers) },
                { label: 'לקוחות חדשים', value: String(params.stats.newClients) },
                { label: 'משימות שהושלמו', value: String(params.stats.tasksCompleted) },
                { label: 'שימוש AI', value: `${aiPercent}%`, color: aiPercent > 80 ? '#ef4444' : aiPercent > 50 ? '#f59e0b' : '#10b981' },
            ],
        })}

        ${params.chartImageUrl || assets.weeklyReportChart ? EmailTemplateComponents.generateScreenshot({
            src: params.chartImageUrl || assets.weeklyReportChart,
            alt: 'תרשים שבועי',
            title: 'MISRAD AI — סטטיסטיקות',
            href: params.portalUrl,
        }) : ''}

        ${EmailTemplateComponents.generateCTAButton({
            text: 'צפייה בדוח המלא →',
            url: params.portalUrl,
        })}

        <div style="margin-top:24px;font-size:13px;color:#64748b;line-height:1.7;text-align:center;">
            שבוע טוב! 💪 צוות MISRAD AI
        </div>
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'דוח שבועי ☕',
        headerGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}

export function generateAiCreditsLowEmailHTML(params: {
    ownerName?: string | null;
    organizationName: string;
    usedPercent: number;
    upgradeUrl: string;
}): string {
    const greeting = params.ownerName ? `${params.ownerName},` : 'שלום,';
    const isExhausted = params.usedPercent >= 100;

    const bodyContent = `
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">${greeting}</div>

        <div style="font-size:17px;line-height:1.8;color:#334155;margin-bottom:24px;">
            ${isExhausted
                ? `מכסת קרדיטי ה-AI של <strong style="color:#ef4444;">"${params.organizationName}"</strong> נגמרה.`
                : `מכסת קרדיטי ה-AI של <strong style="color:#f59e0b;">"${params.organizationName}"</strong> עומדת ב-${params.usedPercent}%.`
            }
        </div>

        <!-- Usage bar -->
        <div style="margin:24px 0;background:#f1f5f9;border-radius:12px;overflow:hidden;height:24px;">
            <div style="height:100%;width:${Math.min(params.usedPercent, 100)}%;background:${isExhausted ? '#ef4444' : '#f59e0b'};border-radius:12px;transition:width 0.3s;"></div>
        </div>

        ${EmailTemplateComponents.generateCTAButton({
            text: isExhausted ? 'שדרוג חבילה →' : 'צפייה בשימוש →',
            url: params.upgradeUrl,
        })}
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: isExhausted ? 'קרדיטי AI נגמרו' : 'קרדיטי AI נמוכים',
        headerGradient: isExhausted
            ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
            : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}

export function generateMaintenanceEmailHTML(params: {
    startTime: string;
    endTime: string;
    description: string;
    affectedServices: string[];
}): string {
    const bodyContent = `
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">שלום,</div>

        <div style="font-size:17px;line-height:1.8;color:#334155;margin-bottom:24px;">
            אנחנו מתכננים חלון תחזוקה קצר כדי לשפר את המערכת עבורך.
        </div>

        <div style="margin:24px 0;background:#f8fafc;border:2px solid #e2e8f0;border-radius:14px;padding:22px 24px;">
            <table role="presentation" style="width:100%;" cellpadding="0" cellspacing="0">
                <tr><td style="padding:0 0 10px;">
                    <div style="font-size:12px;font-weight:800;color:#64748b;">זמן התחלה</div>
                    <div style="font-size:16px;font-weight:700;color:#0f172a;margin-top:2px;">${params.startTime}</div>
                </td></tr>
                <tr><td style="padding:10px 0 0;border-top:1px solid #e2e8f0;">
                    <div style="font-size:12px;font-weight:800;color:#64748b;">זמן סיום משוער</div>
                    <div style="font-size:16px;font-weight:700;color:#0f172a;margin-top:2px;">${params.endTime}</div>
                </td></tr>
                ${params.affectedServices.length > 0 ? `
                <tr><td style="padding:10px 0 0;border-top:1px solid #e2e8f0;">
                    <div style="font-size:12px;font-weight:800;color:#64748b;">שירותים מושפעים</div>
                    <div style="font-size:14px;color:#0f172a;margin-top:4px;">${params.affectedServices.join(' · ')}</div>
                </td></tr>` : ''}
            </table>
        </div>

        <div style="font-size:14px;color:#334155;line-height:1.7;">
            ${params.description}
        </div>

        <div style="margin-top:28px;font-size:13px;color:#64748b;line-height:1.7;text-align:center;">
            מתנצלים על אי-הנוחות ומודים על הסבלנות.
        </div>
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'תחזוקה מתוכננת',
        headerGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}

export function generateVersionUpdateEmailHTML(params: {
    version: string;
    highlights: Array<{ title: string; desc: string }>;
    changelogUrl: string;
    heroImageUrl?: string;
    screenshotUrl?: string;
}): string {
    const assets = getEmailAssets();

    const bodyContent = `
        ${EmailTemplateComponents.generateFeatureBanner({
            emoji: '🎉',
            title: 'MISRAD AI ' + params.version,
            subtitle: 'גרסה חדשה!',
            gradient: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
        })}

        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">שלום,</div>

        <div style="font-size:17px;line-height:1.8;color:#334155;margin-bottom:24px;">
            גרסה <strong style="color:#6366f1;">${params.version}</strong> שוחררה!
            <br />
            אנחנו עובדים בלי הפסקה כדי לתת לכם את הכלי הטוב ביותר.
            <br />
            <strong>שנשארתם איתנו — זה לא מובן מאליו.</strong> 💜
        </div>

        ${params.heroImageUrl || assets.versionHero ? EmailTemplateComponents.generateHeroImage({
            src: params.heroImageUrl || assets.versionHero,
            alt: 'MISRAD AI ' + params.version,
            href: params.changelogUrl,
            caption: 'לחצו להגדלה',
        }) : ''}

        <div style="font-size:18px;font-weight:900;color:#0f172a;margin:28px 0 16px;">מה חדש?</div>

        ${EmailTemplateComponents.generateSteps(params.highlights)}

        ${params.screenshotUrl ? EmailTemplateComponents.generateScreenshot({
            src: params.screenshotUrl,
            alt: 'MISRAD AI Dashboard',
            title: 'MISRAD AI — ' + params.version,
            href: params.changelogUrl,
        }) : ''}

        ${EmailTemplateComponents.generateCTAButton({
            text: 'צפייה ברשימת השינויים →',
            url: params.changelogUrl,
        })}

        ${EmailTemplateComponents.generateDivider()}

        <div style="font-size:14px;color:#64748b;line-height:1.7;text-align:center;">
            יש לכם שאלות? פשוט תשיבו למייל הזה.<br />
            אנחנו כאן (והפעם בלי מדים). 😄
            <br /><br />
            יאללה, חוזרים לעבודה.<br />
            <strong>והפתעות נוספות יגיעו בהמשך</strong> 🔥
            <br /><br />
            <strong>צוות MISRAD AI</strong>
        </div>
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: `גרסה ${params.version} — מה חדש 🎉`,
        headerGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        bodyContent,
        showSocialLinks: true,
    });
}

// ══════════════════════════════════════════════════════════════════════
// SUPPORT EMAILS
// ══════════════════════════════════════════════════════════════════════

export function generateTicketResolvedEmailHTML(params: {
    name?: string | null;
    ticketNumber: string;
    subject: string;
    orgSlug: string;
}): string {
    const greeting = params.name ? `${params.name},` : 'היי,';
    const portalUrl = `${getBaseUrl()}/w/${encodeURIComponent(params.orgSlug)}/support#my-tickets`;

    const bodyContent = `
        <div style="font-size:22px;font-weight:900;color:#0f172a;margin-bottom:24px;">${greeting}</div>

        <div style="font-size:16px;line-height:1.8;color:#334155;margin-bottom:24px;">
            קריאה <strong style="color:#6366f1;">#${params.ticketNumber}</strong> — ${params.subject} — טופלה ונסגרה.
        </div>

        ${EmailTemplateComponents.generateCTAButton({
            text: 'צפייה בקריאה',
            url: portalUrl,
        })}

        <div style="margin-top:24px;font-size:14px;color:#64748b;line-height:1.7;">
            עדיין צריך עזרה? פשוט תשיב למייל הזה.
        </div>
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: `קריאה #${params.ticketNumber} נסגרה`,
        headerGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}

export function generateSatisfactionSurveyEmailHTML(params: {
    name?: string | null;
    ticketNumber: string;
    surveyUrl: string;
}): string {
    const greeting = params.name ? `${params.name},` : 'היי,';

    const bodyContent = `
        <div style="font-size:22px;font-weight:900;color:#0f172a;margin-bottom:24px;">${greeting}</div>

        <div style="font-size:16px;line-height:1.8;color:#334155;margin-bottom:24px;">
            סגרנו את קריאה <strong style="color:#6366f1;">#${params.ticketNumber}</strong>.
            <br />נשמח לשמוע — איך היה השירות?
        </div>

        <!-- Rating scale -->
        <div style="margin:28px 0;text-align:center;">
            <div style="font-size:14px;font-weight:700;color:#64748b;margin-bottom:12px;">דרג את השירות (1-5)</div>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                    ${[1, 2, 3, 4, 5].map((n) => `
                        <td style="padding:0 4px;">
                            <a href="${params.surveyUrl}?rating=${n}" style="display:inline-block;width:48px;height:48px;line-height:48px;border-radius:12px;background:${n <= 2 ? '#fef2f2' : n <= 3 ? '#fffbeb' : '#ecfdf5'};color:${n <= 2 ? '#ef4444' : n <= 3 ? '#f59e0b' : '#10b981'};font-size:20px;font-weight:900;text-decoration:none;text-align:center;">${n}</a>
                        </td>
                    `).join('')}
                </tr>
            </table>
        </div>

        <div style="margin-top:28px;font-size:12px;color:#94a3b8;text-align:center;">
            לוקח 5 שניות — עוזר לנו להשתפר.
        </div>
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'איך היה השירות?',
        headerGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}

// ══════════════════════════════════════════════════════════════════════
// MARKETING EMAILS
// ══════════════════════════════════════════════════════════════════════

export function generateNewsletterEmailHTML(params: {
    title: string;
    preheader: string;
    bannerImageUrl?: string;
    sections: Array<{
        heading: string;
        body: string;
        imageUrl?: string;
        ctaText?: string;
        ctaUrl?: string;
    }>;
    testimonial?: {
        quote: string;
        authorName: string;
        authorTitle?: string;
        authorPhotoUrl?: string;
    };
}): string {
    const assets = getEmailAssets();

    const sectionsHtml = params.sections.map((s) => `
        <div style="margin:24px 0;padding:24px;background:#f8fafc;border-radius:14px;border:1px solid #e2e8f0;">
            ${s.imageUrl ? `<img src="${s.imageUrl}" alt="${s.heading}" style="display:block;width:100%;border-radius:10px;margin-bottom:16px;border:1px solid #e2e8f0;" />` : ''}
            <div style="font-size:18px;font-weight:900;color:#0f172a;margin-bottom:8px;">${s.heading}</div>
            <div style="font-size:15px;color:#334155;line-height:1.7;">${s.body}</div>
            ${s.ctaText && s.ctaUrl ? `
                <div style="margin-top:12px;">
                    <a href="${s.ctaUrl}" style="color:#6366f1;font-weight:700;font-size:14px;text-decoration:none;">${s.ctaText} →</a>
                </div>
            ` : ''}
        </div>
    `).join('');

    const bodyContent = `
        ${params.bannerImageUrl ? EmailTemplateComponents.generateHeroImage({
            src: params.bannerImageUrl || assets.newsletterBanner,
            alt: params.title,
        }) : ''}

        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">שלום,</div>

        ${sectionsHtml}

        ${params.testimonial ? EmailTemplateComponents.generateTestimonial({
            quote: params.testimonial.quote,
            authorName: params.testimonial.authorName,
            authorTitle: params.testimonial.authorTitle,
            authorPhotoUrl: params.testimonial.authorPhotoUrl,
        }) : ''}

        ${EmailTemplateComponents.generateDivider()}

        <div style="font-size:14px;color:#64748b;line-height:1.7;text-align:center;">
            תודה שקראתם 💜<br />
            נתראה בחודש הבא!
        </div>
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: params.title,
        headerGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        bodyContent,
        showSocialLinks: true,
    });
}

export function generateWebinarInviteEmailHTML(params: {
    title: string;
    date: string;
    time: string;
    speaker: string;
    speakerPhotoUrl?: string;
    description: string;
    bannerImageUrl?: string;
    registerUrl: string;
}): string {
    const assets = getEmailAssets();

    const bodyContent = `
        ${params.bannerImageUrl ? EmailTemplateComponents.generateHeroImage({
            src: params.bannerImageUrl || assets.webinarBanner,
            alt: params.title,
            href: params.registerUrl,
        }) : EmailTemplateComponents.generateFeatureBanner({
            emoji: '🎤',
            title: params.title,
            subtitle: params.date + ' · ' + params.time,
        })}

        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">שלום,</div>

        <div style="font-size:17px;line-height:1.8;color:#334155;margin-bottom:24px;">
            מוזמנים לוובינר בנושא <strong style="color:#6366f1;">"${params.title}"</strong>.
        </div>

        <div style="margin:24px 0;background:#f8fafc;border:2px solid #e2e8f0;border-radius:14px;padding:22px 24px;">
            ${params.speakerPhotoUrl ? `<div style="text-align:center;margin-bottom:16px;"><img src="${params.speakerPhotoUrl}" alt="${params.speaker}" width="64" height="64" style="border-radius:50%;border:2px solid #e2e8f0;" /></div>` : ''}
            <table role="presentation" style="width:100%;" cellpadding="0" cellspacing="0">
                <tr><td style="padding:0 0 10px;">
                    <div style="font-size:12px;font-weight:800;color:#64748b;">תאריך</div>
                    <div style="font-size:16px;font-weight:700;color:#0f172a;margin-top:2px;">${params.date}</div>
                </td></tr>
                <tr><td style="padding:10px 0 0;border-top:1px solid #e2e8f0;">
                    <div style="font-size:12px;font-weight:800;color:#64748b;">שעה</div>
                    <div style="font-size:16px;font-weight:700;color:#0f172a;margin-top:2px;">${params.time}</div>
                </td></tr>
                <tr><td style="padding:10px 0 0;border-top:1px solid #e2e8f0;">
                    <div style="font-size:12px;font-weight:800;color:#64748b;">מרצה</div>
                    <div style="font-size:16px;font-weight:700;color:#0f172a;margin-top:2px;">${params.speaker}</div>
                </td></tr>
            </table>
        </div>

        <div style="font-size:15px;color:#334155;line-height:1.7;margin-bottom:24px;">
            ${params.description}
        </div>

        ${EmailTemplateComponents.generateCTAButton({
            text: 'הרשמה לוובינר →',
            url: params.registerUrl,
        })}

        <div style="margin-top:24px;font-size:13px;color:#94a3b8;text-align:center;">
            מקומות מוגבלים — כדאי לתפוס מקום 🎯
        </div>
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'הזמנה לוובינר 🎤',
        headerGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        bodyContent,
        showSocialLinks: true,
    });
}

export function generateNewFeatureEmailHTML(params: {
    featureName: string;
    description: string;
    imageUrl?: string;
    screenshotUrl?: string;
    learnMoreUrl: string;
    highlights?: Array<{ title: string; desc?: string }>;
}): string {
    const assets = getEmailAssets();
    const screenshotSrc = params.screenshotUrl || params.imageUrl || assets.featureScreenshot;

    const bodyContent = `
        ${EmailTemplateComponents.generateFeatureBanner({
            emoji: '🚀',
            title: params.featureName,
            subtitle: 'פיצ\'ר חדש ב-MISRAD AI',
        })}

        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">שלום,</div>

        <div style="font-size:17px;line-height:1.8;color:#334155;margin-bottom:24px;">
            שנשארתם איתנו — זה לא מובן מאליו. 💜
            <br />
            השקנו פיצ'ר חדש: <strong style="color:#6366f1;">${params.featureName}</strong>
        </div>

        ${EmailTemplateComponents.generateScreenshot({
            src: screenshotSrc,
            alt: params.featureName,
            title: 'MISRAD AI — ' + params.featureName,
            href: params.learnMoreUrl,
        })}

        <div style="font-size:15px;color:#334155;line-height:1.7;margin-bottom:24px;">
            ${params.description}
        </div>

        ${params.highlights ? EmailTemplateComponents.generateSteps(params.highlights) : ''}

        ${EmailTemplateComponents.generateCTAButton({
            text: 'לנסות עכשיו →',
            url: params.learnMoreUrl,
        })}

        ${EmailTemplateComponents.generateDivider()}

        ${EmailTemplateComponents.generateFounderCard({
            photoUrl: assets.founderPhoto,
            name: assets.founderName,
            title: assets.founderTitle,
            message: 'עבדנו קשה על הפיצ\'ר הזה — ואם יש לכם רעיונות לשיפורים, אני רוצה לשמוע. פשוט תשיבו למייל הזה.',
            signatureText: assets.founderSignature,
        })}
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'פיצ\'ר חדש',
        headerGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        bodyContent,
        showSocialLinks: true,
    });
}

export function generateReengagementEmailHTML(params: {
    userName?: string | null;
    daysSinceLastLogin: number;
    portalUrl: string;
    newFeatures?: string[];
}): string {
    const assets = getEmailAssets();
    const greeting = params.userName ? `${params.userName},` : 'היי,';

    const featuresHtml = params.newFeatures && params.newFeatures.length > 0
        ? `<div style="margin:24px 0;padding:20px 24px;background:#ecfdf5;border:2px solid #a7f3d0;border-radius:14px;">
            <div style="font-size:13px;font-weight:800;color:#065f46;margin-bottom:8px;">🎁 מה חדש מאז שעזבת:</div>
            ${params.newFeatures.map((f) => `<div style="font-size:14px;color:#0f172a;padding:4px 0;">✅ ${f}</div>`).join('')}
           </div>`
        : '';

    const bodyContent = `
        ${EmailTemplateComponents.generateHeroImage({
            src: assets.reengagementHero,
            alt: 'חיכינו לך',
            href: params.portalUrl,
        })}

        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">${greeting}</div>

        <div style="font-size:17px;line-height:1.8;color:#334155;margin-bottom:24px;">
            לא ראינו אותך ${params.daysSinceLastLogin} ימים.
            <br />
            הכל בסדר? אנחנו שמים לב כשחסר לנו מישהו. 💙
        </div>

        ${featuresHtml}

        ${EmailTemplateComponents.generateScreenshot({
            src: assets.welcomeDashboardScreenshot,
            alt: 'MISRAD AI Dashboard',
            title: 'כך נראית המערכת עכשיו',
            href: params.portalUrl,
        })}

        ${EmailTemplateComponents.generateCTAButton({
            text: 'חזרה ל-MISRAD →',
            url: params.portalUrl,
        })}

        ${EmailTemplateComponents.generateDivider()}

        ${EmailTemplateComponents.generateFounderCard({
            photoUrl: assets.founderPhoto,
            name: assets.founderName,
            title: assets.founderTitle,
            message: 'אני יודע שהחיים עסוקים. אם יש משהו שאנחנו יכולים לעשות טוב יותר — אני פה. תשיב למייל הזה, אני קורא הכל.',
            signatureText: assets.founderSignature,
        })}
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'חיכינו לך 💙',
        headerGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}

// ══════════════════════════════════════════════════════════════════════
// AI REPORTS
// ══════════════════════════════════════════════════════════════════════

export function generateAiMonthlyReportReadyEmailHTML(params: {
    adminName?: string | null;
    organizationName: string;
    periodLabel: string;
    score: number;
    summary: string;
    insightCount: number;
    recommendationCount: number;
    reportUrl: string;
}): string {
    const greeting = params.adminName ? `${params.adminName},` : 'שלום,';
    const scoreColor = params.score >= 70 ? '#059669' : params.score >= 40 ? '#d97706' : '#dc2626';
    const scoreBg = params.score >= 70 ? '#ecfdf5' : params.score >= 40 ? '#fffbeb' : '#fef2f2';
    const scoreBorder = params.score >= 70 ? '#a7f3d0' : params.score >= 40 ? '#fde68a' : '#fecaca';

    const bodyContent = `
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">${greeting}</div>

        <div style="font-size:17px;line-height:1.8;color:#334155;margin-bottom:24px;">
            הדוח החודשי של <strong style="color:#6366f1;">"${params.organizationName}"</strong> מוכן.
            <br /><span style="color:#94a3b8;font-size:14px;">תקופה: ${params.periodLabel}</span>
        </div>

        <div style="margin:24px 0;background:${scoreBg};border:2px solid ${scoreBorder};border-radius:14px;padding:24px;text-align:center;">
            <div style="font-size:12px;font-weight:800;color:${scoreColor};letter-spacing:0.5px;margin-bottom:8px;">ציון בריאות ארגוני</div>
            <div style="font-size:48px;font-weight:900;color:${scoreColor};">${params.score}</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;">מתוך 100</div>
        </div>

        <div style="margin:20px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px 22px;font-size:15px;color:#334155;line-height:1.8;">
            ${params.summary}
        </div>

        <div style="margin:20px 0;display:flex;gap:12px;">
            <div style="flex:1;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px;text-align:center;">
                <div style="font-size:24px;font-weight:900;color:#1d4ed8;">${params.insightCount}</div>
                <div style="font-size:12px;font-weight:700;color:#3b82f6;">תובנות</div>
            </div>
            <div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;text-align:center;">
                <div style="font-size:24px;font-weight:900;color:#16a34a;">${params.recommendationCount}</div>
                <div style="font-size:12px;font-weight:700;color:#22c55e;">המלצות</div>
            </div>
        </div>

        ${EmailTemplateComponents.generateCTAButton({
            text: 'צפייה בדוח המלא →',
            url: params.reportUrl,
        })}

        <div style="margin-top:24px;font-size:13px;color:#64748b;line-height:1.7;text-align:center;">
            הדוח נוצר אוטומטית על בסיס נתוני המערכת בלבד.
        </div>
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'דוח AI חודשי מוכן',
        headerGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}

// ══════════════════════════════════════════════════════════════════════
// ADMIN NOTIFICATION EMAILS
// ══════════════════════════════════════════════════════════════════════

export function generateAdminOrgCreatedEmailHTML(params: {
    organizationName: string;
    ownerEmail: string;
    ownerName?: string | null;
    plan: string;
    adminUrl: string;
}): string {
    const bodyContent = `
        <div style="font-size:22px;font-weight:900;color:#0f172a;margin-bottom:24px;">ארגון חדש נוצר</div>

        <div style="margin:20px 0;background:#ecfdf5;border:2px solid #a7f3d0;border-radius:14px;padding:22px 24px;">
            <table role="presentation" style="width:100%;" cellpadding="0" cellspacing="0">
                <tr><td style="padding:0 0 8px;"><span style="font-size:12px;font-weight:800;color:#065f46;">שם:</span> <span style="font-size:16px;font-weight:700;color:#0f172a;">${params.organizationName}</span></td></tr>
                <tr><td style="padding:0 0 8px;"><span style="font-size:12px;font-weight:800;color:#065f46;">בעלים:</span> <span style="font-size:14px;color:#0f172a;">${params.ownerName || 'לא ידוע'} (${params.ownerEmail})</span></td></tr>
                <tr><td><span style="font-size:12px;font-weight:800;color:#065f46;">חבילה:</span> <span style="font-size:14px;color:#0f172a;">${params.plan}</span></td></tr>
            </table>
        </div>

        ${EmailTemplateComponents.generateCTAButton({
            text: 'פאנל ניהול →',
            url: params.adminUrl,
        })}
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI — Admin',
        headerSubtitle: 'ארגון חדש',
        headerGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}
