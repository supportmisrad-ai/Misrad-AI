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

function generateOrganizationWelcomeEmailHTML(params: {
    organizationName: string;
    ownerName?: string | null;
    portalUrl: string;
}): string {
    const assets = getEmailAssets();
    const greeting = params.ownerName ? `${params.ownerName},` : 'שלום,';

    const bodyContent = `
        ${EmailTemplateComponents.generateFeatureBanner({
            emoji: '🎉',
            title: `"${params.organizationName}" מוכן לפעולה!`,
            subtitle: 'הארגון שלך ב-MISRAD AI הוקם בהצלחה',
            gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        })}

        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">${greeting}</div>

        <div style="font-size:17px;line-height:1.8;color:#334155;margin-bottom:24px;">
            הארגון <strong style="background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-size:19px;">"${params.organizationName}"</strong> מוכן לפעולה.
            <br />
            הנה 3 צעדים קצרים להתחלה מושלמת:
        </div>

        ${EmailTemplateComponents.generateSteps([
            { title: 'השלמת פרופיל', desc: 'שם העסק, לוגו ופרטי התקשרות' },
            { title: 'הוספת חברי צוות', desc: 'הזמנו עובדים והגדירו הרשאות' },
            { title: 'התחילו לעבוד', desc: 'AI ילמד את הדפוסים שלכם ויתאים את עצמו' },
        ])}

        ${EmailTemplateComponents.generateScreenshot({
            src: assets.welcomeDashboardScreenshot,
            alt: 'MISRAD AI Dashboard',
            title: 'MISRAD AI — הדשבורד שלך',
            href: params.portalUrl,
        })}

        ${EmailTemplateComponents.generateCTAButton({
            text: 'כניסה למערכת →',
            url: params.portalUrl,
        })}

        ${EmailTemplateComponents.generateDivider()}

        ${EmailTemplateComponents.generateFounderCard({
            photoUrl: assets.founderPhoto,
            name: assets.founderName,
            title: assets.founderTitle,
            message: 'שמח שבחרתם ב-MISRAD AI. אנחנו פה בשבילכם — כל שאלה, הצעה, או בעיה, פשוט תשיבו למייל הזה.',
            signatureText: assets.founderSignature,
        })}
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'הארגון שלך מוכן',
        headerGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}

function generateFirstCustomerEmailHTML(params: {
    ownerName?: string | null;
    founderName: string;
    founderPhone: string;
}): string {
    const assets = getEmailAssets();
    const greeting = params.ownerName ? `${params.ownerName},` : 'היי,';

    const bodyContent = `
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">${greeting}</div>

        ${EmailTemplateComponents.generateFounderCard({
            photoUrl: assets.founderPhoto,
            name: assets.founderName,
            title: assets.founderTitle,
            message: 'ראיתי שנרשמת ורציתי לפנות אליך אישית.<br />אני מאמין שאנחנו בונים משהו מיוחד, והדעת שלך חשובה לנו מאוד.<br /><br />אם משהו לא ברור, נתקע או צריך עזרה — אני קרוב כמו הודעה הזאת.',
            signatureText: assets.founderSignature,
        })}

        <div style="margin:28px 0;padding:24px;background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%);border-radius:16px;border:2px solid #fbbf24;text-align:center;">
            <div style="font-size:14px;font-weight:800;color:#78350f;margin-bottom:10px;">
                הנייד האישי שלי
            </div>
            <a href="https://wa.me/${params.founderPhone.replace(/[^0-9]/g, '')}" style="font-size:22px;font-weight:900;color:#0f172a;text-decoration:none;">
                ${params.founderPhone}
            </a>
            <div style="margin-top:8px;font-size:13px;color:#92400e;">
                וואטסאפ, טלפון, SMS — מה שנוח לך
            </div>
        </div>

        <div style="margin-top:28px;font-size:14px;color:#64748b;line-height:1.7;text-align:center;">
            הדלת תמיד פתוחה 💜
        </div>
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'הודעה אישית מהמייסד',
        headerGradient: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}

function generateAbandonedSignupFollowupEmailHTML(params: {
    ownerName?: string | null;
    checkoutUrl: string;
    founderName: string;
    founderPhone?: string | null;
}): string {
    const assets = getEmailAssets();
    const greeting = params.ownerName ? `היי ${params.ownerName},` : 'היי,';
    const founderPhone = String(params.founderPhone || '').trim();

    const bodyContent = `
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:20px;">${greeting}</div>

        <div style="font-size:17px;line-height:1.8;color:#334155;margin-bottom:24px;">
            ראיתי שנרשמת ל-MISRAD ב-24 השעות האחרונות, אבל לא ראיתי מנוי פעיל.
            <br /><br />
            <strong style="color:#6366f1;">רציתי לשאול אם משהו נתקע בדרך, ואם אני יכול לעזור?</strong>
        </div>

        ${EmailTemplateComponents.generateScreenshot({
            src: assets.welcomeDashboardScreenshot,
            alt: 'MISRAD AI Dashboard',
            title: 'MISRAD AI — המערכת מחכה לך',
            href: params.checkoutUrl,
        })}

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

        ${EmailTemplateComponents.generateDivider()}

        ${EmailTemplateComponents.generateFounderCard({
            photoUrl: assets.founderPhoto,
            name: assets.founderName,
            title: assets.founderTitle,
            message: 'אני יודע שהתחלה עם מערכת חדשה יכולה להיות מרתיעה. אם יש משהו שאנחנו יכולים לעשות טוב יותר — אני פה. פשוט תשיב למייל הזה.',
            signatureText: assets.founderSignature,
        })}

        <div style="margin-top:24px;padding:16px;background:#f1f5f9;border-radius:12px;text-align:center;">
            <div style="font-size:12px;color:#64748b;line-height:1.6;">
                אם קיבלת את ההודעה בטעות, אפשר להתעלם
            </div>
        </div>
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'רק לבדוק אם הכל בסדר',
        headerGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}

function generateMisradWelcomeEmailHTML(params: {
    ownerName?: string | null;
    signInUrl: string;
    migrationEmail?: string | null;
    windowsUrl?: string | null;
    androidUrl?: string | null;
}): string {
    const assets = getEmailAssets();
    const greeting = params.ownerName ? `שלום ${params.ownerName},` : 'שלום,';
    const windowsUrl = String(params.windowsUrl ?? (process.env.MISRAD_WINDOWS_DOWNLOAD_URL || '')).trim();
    const androidUrl = String(params.androidUrl ?? (process.env.MISRAD_ANDROID_DOWNLOAD_URL || '')).trim();
    const whatsappUrl = (process.env.MISRAD_SUPPORT_WHATSAPP_URL || '').trim();
    const migrationEmail = String(params.migrationEmail ?? (process.env.MISRAD_MIGRATION_EMAIL || '')).trim();
    const videoUrl = (process.env.MISRAD_WELCOME_VIDEO_URL || '').trim();
    const videoThumbUrl = (process.env.MISRAD_WELCOME_VIDEO_THUMBNAIL_URL || '').trim();

    const videoSection = videoUrl ? EmailTemplateComponents.generateVideoThumbnail({
        thumbnailSrc: videoThumbUrl || assets.demoVideoThumbnail,
        videoUrl,
        alt: 'סרטון הדרכה קצר (60 שניות)',
        caption: 'סרטון קצר: פתיחת קריאת שירות ראשונה (60 שניות)',
    }) : '';

    const windowsBtn = windowsUrl
        ? '<a href="' + windowsUrl + '" style="display:inline-block;margin:0 6px;padding:12px 20px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;text-decoration:none;font-size:14px;font-weight:900;box-shadow:0 4px 8px rgba(99,102,241,0.3);">Windows</a>'
        : '';
    const androidBtn = androidUrl
        ? '<a href="' + androidUrl + '" style="display:inline-block;margin:0 6px;padding:12px 20px;border-radius:10px;background:linear-gradient(135deg,#10b981,#059669);color:white;text-decoration:none;font-size:14px;font-weight:900;box-shadow:0 4px 8px rgba(16,185,129,0.3);">Android</a>'
        : '';
    const downloadSection = (windowsUrl || androidUrl)
        ? '<div style="margin:28px 0;padding:20px;background:#f8fafc;border-radius:14px;border:2px solid #e2e8f0;text-align:center;"><div style="font-size:14px;font-weight:900;color:#475569;margin-bottom:12px;">הורדת האפליקציה</div><div>' + windowsBtn + androidBtn + '</div></div>'
        : '';

    const whatsappSection = whatsappUrl
        ? '<div style="text-align:center;margin:24px 0;"><a href="' + whatsappUrl + '" style="display:inline-block;background:#16a34a;color:white;padding:14px 24px;border-radius:12px;text-decoration:none;font-weight:900;font-size:15px;box-shadow:0 6px 16px rgba(22,163,74,0.4);">קבוצת תמיכה בוואטסאפ</a></div>'
        : '';

    let migrationInner = '';
    if (migrationEmail) {
        migrationInner = '<br><strong>מייל:</strong> <a href="mailto:' + migrationEmail + '" style="color:#c2410c;font-weight:900;text-decoration:none;">' + migrationEmail + '</a>';
    } else if (whatsappUrl) {
        migrationInner = '<br><strong>וואטסאפ:</strong> <a href="' + whatsappUrl + '" style="color:#c2410c;font-weight:900;text-decoration:none;">שלח כאן</a>';
    }
    const migrationSection = (migrationEmail || whatsappUrl)
        ? '<div style="margin:28px 0;padding:20px;background:#fff7ed;border-radius:14px;border:2px solid #fed7aa;"><div style="font-size:15px;font-weight:900;color:#7c2d12;margin-bottom:10px;text-align:center;">ייבוא נתונים מאקסל</div><div style="font-size:14px;color:#9a3412;line-height:1.7;text-align:center;">שלח לנו את האקסלים שלך ונעזור לך לייבא אותם' + migrationInner + '</div></div>'
        : '';

    const bodyContent = `
        ${EmailTemplateComponents.generateHeroImage({
            src: assets.welcomeHero,
            alt: 'ברוכים הבאים ל-MISRAD AI',
            href: params.signInUrl,
        })}

        <div style="font-size:26px;font-weight:900;color:#0f172a;margin-bottom:20px;">${greeting}</div>

        <div style="font-size:18px;line-height:1.8;color:#334155;text-align:center;margin-bottom:32px;">
            <strong style="color:#6366f1;">ברוכים הבאים ל-MISRAD</strong> 🎉
            <br />
            הכנו לך כמה משאבים להתחלה מהירה
        </div>

        ${EmailTemplateComponents.generateScreenshot({
            src: assets.welcomeDashboardScreenshot,
            alt: 'MISRAD AI Dashboard',
            title: 'MISRAD AI — המערכת שלך',
            href: params.signInUrl,
        })}

        ${EmailTemplateComponents.generateCTAButton({
            text: 'כניסה למערכת →',
            url: params.signInUrl,
        })}

        ${videoSection}
        ${downloadSection}
        ${whatsappSection}
        ${migrationSection}
    `;
    
    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'ברוכים הבאים',
        headerGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        bodyContent,
        showSocialLinks: true,
    });
}

export async function sendFirstCustomerEmail(params: {
    toEmail: string;
    ownerName?: string | null;
}): Promise<EmailSendResult> {
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

        console.log('[Email] First customer email sent successfully:', { emailId: data?.id });
        return { success: true };
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        const name = getErrorName(error);
        if (!IS_PROD) {
            console.error('[Email] Error sending first customer email:', { message, name });
        } else {
            console.error('[Email] Error sending first customer email');
        }
        return { success: false, error: message || 'Unknown error' };
    }
}

export async function sendAbandonedSignupFollowupEmail(params: {
    toEmail: string;
    ownerName?: string | null;
    checkoutUrl: string;
}): Promise<EmailSendResult> {
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

        console.log('[Email] Abandoned signup follow-up email sent successfully:', { emailId: data?.id });
        return { success: true };
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        const name = getErrorName(error);
        if (!IS_PROD) {
            console.error('[Email] Error sending abandoned signup followup email:', { message, name });
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
}): Promise<EmailSendResult> {
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
            console.error('[Email] Error sending organization welcome email:', { message, name });
        } else {
            console.error('[Email] Error sending organization welcome email');
        }
        return { success: false, error: message || 'Unknown error' };
    }
}

export async function sendMisradWelcomeEmail(params: {
    toEmail: string;
    ownerName?: string | null;
    signInUrl: string;
}): Promise<EmailSendResult> {
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

        console.log('[Email] MISRAD welcome email sent successfully:', { emailId: data?.id });
        return { success: true };
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        const name = getErrorName(error);
        if (!IS_PROD) {
            console.error('[Email] Error sending MISRAD welcome email:', { message, name });
        } else {
            console.error('[Email] Error sending MISRAD welcome email');
        }
        return { success: false, error: message || 'Unknown error' };
    }
}
