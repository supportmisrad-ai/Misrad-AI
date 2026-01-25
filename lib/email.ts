/**
 * Email utility functions using Resend
 */

import { Resend } from 'resend';

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
    
    return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>הזמנה להצטרף ל-Misrad</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; direction: rtl;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    <!-- Header with gradient -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 900; letter-spacing: -0.5px;">
                                Misrad
                            </h1>
                            <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; font-weight: 500;">
                                פלטפורמת ניהול עסקית מתקדמת
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px; font-weight: 800; line-height: 1.3;">
                                ${greeting}
                            </h2>
                            
                            <p style="margin: 0 0 20px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                                העסק שלך <strong style="color: #1a1a1a;">"${tenantName}"</strong> הוקם בהצלחה במערכת Misrad!
                            </p>
                            
                            <p style="margin: 0 0 30px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                                כדי להתחיל להשתמש במערכת, לחץ על הכפתור למטה ויצור חשבון:
                            </p>
                            
                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td align="center" style="padding: 0;">
                                        <a href="${signupUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4); transition: all 0.2s;">
                                            התחל עכשיו - צור חשבון
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            ${subdomain ? `
                            <p style="margin: 30px 0 0 0; color: #718096; font-size: 14px; line-height: 1.6; text-align: center;">
                                או היכנס ישירות ל:<br>
                                <a href="https://${subdomain}.nexus-os.co" style="color: #6366f1; text-decoration: none; font-weight: 600;">https://${subdomain}.nexus-os.co</a>
                            </p>
                            ` : ''}
                            
                            <div style="margin: 40px 0 0 0; padding: 20px 0; border-top: 1px solid #e2e8f0;">
                                <p style="margin: 0 0 10px 0; color: #718096; font-size: 12px; line-height: 1.5;">
                                    <strong style="color: #4a5568;">קישור זה תקף ללא הגבלת זמן.</strong> אם לא יצרת את הבקשה, תוכל להתעלם מהאימייל הזה.
                                </p>
                                <p style="margin: 0; color: #a0aec0; font-size: 12px; line-height: 1.5;">
                                    אם הכפתור לא עובד, העתק והדבק את הקישור הבא לדפדפן שלך:<br>
                                    <a href="${signupUrl}" style="color: #6366f1; word-break: break-all;">${signupUrl}</a>
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0 0 10px 0; color: #718096; font-size: 14px; font-weight: 600;">
                                צוות Misrad
                            </p>
                            <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                                © ${new Date().getFullYear()} Misrad. כל הזכויות שמורות.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

function generateOrganizationWelcomeEmailHTML(params: {
    organizationName: string;
    ownerName?: string | null;
    portalUrl: string;
}): string {
    const greeting = params.ownerName ? `שלום ${params.ownerName},` : 'שלום,';

    return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ברוכים הבאים - ${params.organizationName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; direction: rtl;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    <tr>
                        <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 900; letter-spacing: -0.5px;">Misrad</h1>
                            <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; font-weight: 500;">ברוכים הבאים!</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px; font-weight: 800; line-height: 1.3;">${greeting}</h2>

                            <p style="margin: 0 0 16px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                                הארגון שלך <strong style="color: #1a1a1a;">"${params.organizationName}"</strong> נוצר בהצלחה.
                            </p>
                            <p style="margin: 0 0 30px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                                אפשר להיכנס עכשיו לפורטל שלך בקישור הבא:
                            </p>

                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td align="center" style="padding: 0;">
                                        <a href="${params.portalUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);">
                                            כניסה לפורטל
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <div style="margin: 40px 0 0 0; padding: 20px 0; border-top: 1px solid #e2e8f0;">
                                <p style="margin: 0; color: #a0aec0; font-size: 12px; line-height: 1.5;">
                                    אם הכפתור לא עובד, העתק והדבק את הקישור הבא לדפדפן שלך:<br>
                                    <a href="${params.portalUrl}" style="color: #6366f1; word-break: break-all;">${params.portalUrl}</a>
                                </p>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0 0 10px 0; color: #718096; font-size: 14px; font-weight: 600;">צוות Misrad</p>
                            <p style="margin: 0; color: #a0aec0; font-size: 12px;">© ${new Date().getFullYear()} Misrad. כל הזכויות שמורות.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
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
    
    return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>הזמנה להצטרף לצוות</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; direction: rtl;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    <!-- Header with gradient -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 900; letter-spacing: -0.5px;">
                                הזמנה להצטרף לצוות
                            </h1>
                            <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; font-weight: 500;">
                                Misrad - מערכת ניהול צוות
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px; font-weight: 800; line-height: 1.3;">
                                ${greeting}
                            </h2>
                            
                            <p style="margin: 0 0 20px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                                ${inviter ? `אתה הוזמנת${inviter} להצטרף לצוות!` : 'אתה הוזמנת להצטרף לצוות!'}
                            </p>
                            
                            <div style="background-color: #f7fafc; border-radius: 12px; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; color: #4a5568; font-size: 14px; font-weight: 600;">
                                    פרטי ההזמנה:
                                </p>
                                <p style="margin: 5px 0; color: #718096; font-size: 14px;">
                                    <strong style="color: #4a5568;">מחלקה:</strong> ${department}
                                </p>
                                <p style="margin: 5px 0; color: #718096; font-size: 14px;">
                                    <strong style="color: #4a5568;">תפקיד:</strong> ${role}
                                </p>
                                <p style="margin: 5px 0; color: #718096; font-size: 14px;">
                                    <strong style="color: #4a5568;">אימייל:</strong> ${employeeEmail}
                                </p>
                            </div>
                            
                            <p style="margin: 20px 0 30px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                                כדי להשלים את ההרשמה ולהצטרף לצוות, לחץ על הכפתור למטה:
                            </p>
                            
                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td align="center" style="padding: 0;">
                                        <a href="${invitationUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4); transition: all 0.2s;">
                                            השלם הרשמה
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <div style="margin: 40px 0 0 0; padding: 20px 0; border-top: 1px solid #e2e8f0;">
                                <p style="margin: 0 0 10px 0; color: #718096; font-size: 12px; line-height: 1.5;">
                                    <strong style="color: #4a5568;">קישור זה תקף ל-30 יום.</strong> אם לא יצרת את הבקשה, תוכל להתעלם מהאימייל הזה.
                                </p>
                                <p style="margin: 0; color: #a0aec0; font-size: 12px; line-height: 1.5;">
                                    אם הכפתור לא עובד, העתק והדבק את הקישור הבא לדפדפן שלך:<br>
                                    <a href="${invitationUrl}" style="color: #6366f1; word-break: break-all;">${invitationUrl}</a>
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0 0 10px 0; color: #718096; font-size: 14px; font-weight: 600;">
                                צוות Misrad
                            </p>
                            <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                                © ${new Date().getFullYear()} Misrad. כל הזכויות שמורות.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
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
            console.error('[Email] RESEND_API_KEY is not configured');
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
            console.error('[Email] Resend error:', {
                message: (error as any)?.message,
                name: (error as any)?.name,
                code: (error as any)?.code
            });
            return { success: false, error: error.message || 'Failed to send email' };
        }

        console.log('[Email] Employee invitation email sent successfully:', {
            emailId: data?.id,
            department,
            role
        });

        return { success: true };
    } catch (error: any) {
        console.error('[Email] Error sending employee invitation email:', {
            message: error?.message,
            name: error?.name
        });
        return { success: false, error: error.message || 'Unknown error' };
    }
}

function generateFirstCustomerEmailHTML(params: {
    ownerName?: string | null;
    founderName: string;
    founderPhone: string;
}): string {
    const greeting = params.ownerName ? `היי ${params.ownerName},` : 'היי,';
    return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>הודעה אישית</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; direction: rtl;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    <tr>
                        <td style="background: linear-gradient(135deg, #0f172a 0%, #334155 100%); padding: 34px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 900; letter-spacing: -0.5px;">MISRAD</h1>
                            <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.85); font-size: 13px; font-weight: 600;">הודעה אישית מהמייסד</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 36px 30px;">
                            <div style="color: #0f172a; font-size: 18px; font-weight: 900; margin: 0 0 14px 0;">${greeting}</div>
                            <div style="color: #334155; font-size: 16px; line-height: 1.8;">
                                אני ${params.founderName}, המייסד של MISRAD. ראיתי שנרשמת ואני מתרגש.
                                <br />
                                אני כאן בשבילך אישית.
                                <br /><br />
                                הנה הנייד שלי: <strong style="color: #0f172a;">${params.founderPhone}</strong>
                            </div>

                            <div style="margin: 26px 0 0 0; padding-top: 18px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; line-height: 1.6;">
                                אם קיבלת את ההודעה בטעות, אפשר להתעלם.
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

export async function sendFirstCustomerEmail(params: {
    toEmail: string;
    ownerName?: string | null;
}): Promise<{ success: boolean; error?: string }> {
    try {
        const resend = getResendClient();
        if (!resend) {
            console.warn('[Email] RESEND_API_KEY is not configured - skipping first customer email');
            return { success: false, error: 'Email service not configured' };
        }

        const founderName = (process.env.MISRAD_FOUNDER_NAME || 'איציק').trim();
        const founderPhone = (process.env.MISRAD_FOUNDER_PHONE || '').trim();
        if (!founderPhone) {
            return { success: false, error: 'MISRAD_FOUNDER_PHONE is not configured' };
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
            console.error('[Email] Resend error (first-customer):', {
                message: (error as any)?.message,
                name: (error as any)?.name,
                code: (error as any)?.code
            });
            return { success: false, error: error.message || 'Failed to send email' };
        }

        console.log('[Email] First customer email sent successfully:', {
            emailId: data?.id,
        });

        return { success: true };
    } catch (error: any) {
        console.error('[Email] Error sending first customer email:', {
            message: error?.message,
            name: error?.name
        });
        return { success: false, error: error.message || 'Unknown error' };
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
            console.warn('[Email] RESEND_API_KEY is not configured - skipping welcome email');
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
            console.error('[Email] Resend error (welcome):', {
                message: (error as any)?.message,
                name: (error as any)?.name,
                code: (error as any)?.code
            });
            return { success: false, error: error.message || 'Failed to send email' };
        }

        console.log('[Email] Organization welcome email sent successfully:', {
            emailId: data?.id,
            organizationName: params.organizationName,
        });

        return { success: true };
    } catch (error: any) {
        console.error('[Email] Error sending organization welcome email:', {
            message: error?.message,
            name: error?.name
        });
        return { success: false, error: error.message || 'Unknown error' };
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

    return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ברוכים הבאים ל-MISRAD - בואו נעשה סדר</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; direction: rtl;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    <tr>
                        <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 900; letter-spacing: -0.5px;">MISRAD</h1>
                            <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; font-weight: 500;">ברוכים הבאים - בואו נעשה סדר</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 24px; font-weight: 900; line-height: 1.3;">${greeting}</h2>
                            <p style="margin: 0 0 22px 0; color: #4a5568; font-size: 16px; line-height: 1.7;">
                                כדי שתרגיש בשליטה מהר, הכנו לך התחלה מהירה: כניסה למערכת + סרטון 60 שניות + לינקים חשובים.
                            </p>

                            <table role="presentation" style="width: 100%; margin: 18px 0 24px 0;">
                                <tr>
                                    <td align="center" style="padding: 0;">
                                        <a href="${params.signInUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 800; font-size: 16px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);">
                                            כניסה למערכת
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <div style="background-color: #f7fafc; border-radius: 14px; padding: 18px; margin: 0 0 20px 0;">
                                <div style="color: #475569; font-size: 14px; font-weight: 900; margin: 0 0 10px 0;">
                                    Quick Win: פותחים קריאת שירות ראשונה (60 שניות)
                                </div>
                                ${videoUrl ? `
                                ${videoThumbUrl ? `
                                <a href="${videoUrl}" style="text-decoration: none; display: block;">
                                    <img src="${videoThumbUrl}" alt="סרטון הדרכה" style="width: 100%; max-width: 540px; border-radius: 12px; border: 1px solid #e2e8f0; display: block; margin: 0 auto 12px auto;" />
                                </a>
                                ` : ''}
                                <div style="text-align: center;">
                                    <a href="${videoUrl}" style="display: inline-block; background-color: #0f172a; color: white; padding: 12px 18px; border-radius: 10px; text-decoration: none; font-weight: 900; font-size: 14px;">
                                        צפה בסרטון
                                    </a>
                                </div>
                                ` : `
                                <div style="color: #64748b; font-size: 14px; line-height: 1.6;">נוסיף כאן סרטון קצר שמראה איך פותחים קריאת שירות ראשונה.</div>
                                `}
                            </div>

                            ${(windowsUrl || androidUrl) ? `
                            <table role="presentation" style="width: 100%; margin: 0 0 14px 0;">
                                <tr>
                                    <td align="center" style="padding: 0;">
                                        <div style="color: #718096; font-size: 12px; font-weight: 700; margin: 0 0 10px 0;">הורדת האפליקציה</div>
                                        ${windowsUrl ? `<a href="${windowsUrl}" style="display: inline-block; margin: 0 6px; padding: 10px 14px; border-radius: 10px; border: 1px solid #e2e8f0; background: #ffffff; color: #2d3748; text-decoration: none; font-size: 12px; font-weight: 900;">Windows</a>` : ''}
                                        ${androidUrl ? `<a href="${androidUrl}" style="display: inline-block; margin: 0 6px; padding: 10px 14px; border-radius: 10px; border: 1px solid #e2e8f0; background: #ffffff; color: #2d3748; text-decoration: none; font-size: 12px; font-weight: 900;">Android</a>` : ''}
                                    </td>
                                </tr>
                            </table>
                            ` : ''}

                            ${whatsappUrl ? `
                            <div style="text-align: center; margin: 0 0 18px 0;">
                                <a href="${whatsappUrl}" style="display: inline-block; background-color: #16a34a; color: white; padding: 12px 18px; border-radius: 10px; text-decoration: none; font-weight: 900; font-size: 14px;">
                                    קבוצת תמיכה בוואטסאפ (VIP)
                                </a>
                            </div>
                            ` : ''}

                            ${(migrationEmail || whatsappUrl) ? `
                            <div style="background-color: #fff7ed; border-radius: 14px; padding: 18px; margin: 0 0 8px 0; border: 1px solid #fed7aa;">
                                <div style="color: #7c2d12; font-size: 14px; font-weight: 900; margin: 0 0 8px 0;">מיגרציה מהאקסלים הישנים</div>
                                <div style="color: #9a3412; font-size: 14px; line-height: 1.7;">
                                    שלח לנו את האקסלים הישנים שלך ואנחנו נעזור לך לייבא אותם.
                                    ${migrationEmail ? `<br><strong>מייל:</strong> <a href="mailto:${migrationEmail}" style="color: #c2410c; font-weight: 900; text-decoration: none;">${migrationEmail}</a>` : ''}
                                    ${!migrationEmail && whatsappUrl ? `<br><strong>וואטסאפ:</strong> <a href="${whatsappUrl}" style="color: #c2410c; font-weight: 900; text-decoration: none;">שלח כאן</a>` : ''}
                                </div>
                            </div>
                            ` : ''}

                            <div style="margin: 34px 0 0 0; padding: 20px 0; border-top: 1px solid #e2e8f0;">
                                <p style="margin: 0; color: #a0aec0; font-size: 12px; line-height: 1.5;">
                                    אם הכפתור לא עובד, העתק והדבק את הקישור הבא לדפדפן שלך:<br>
                                    <a href="${params.signInUrl}" style="color: #6366f1; word-break: break-all;">${params.signInUrl}</a>
                                </p>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0 0 10px 0; color: #718096; font-size: 14px; font-weight: 700;">צוות MISRAD</p>
                            <p style="margin: 0; color: #a0aec0; font-size: 12px;">© ${new Date().getFullYear()} MISRAD. כל הזכויות שמורות.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

export async function sendMisradWelcomeEmail(params: {
    toEmail: string;
    ownerName?: string | null;
    signInUrl: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        const resend = getResendClient();
        if (!resend) {
            console.warn('[Email] RESEND_API_KEY is not configured - skipping welcome email');
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
            console.error('[Email] Resend error (misrad-welcome):', {
                message: (error as any)?.message,
                name: (error as any)?.name,
                code: (error as any)?.code
            });
            return { success: false, error: error.message || 'Failed to send email' };
        }

        console.log('[Email] MISRAD welcome email sent successfully:', {
            emailId: data?.id,
        });

        return { success: true };
    } catch (error: any) {
        console.error('[Email] Error sending MISRAD welcome email:', {
            message: error?.message,
            name: error?.name
        });
        return { success: false, error: error.message || 'Unknown error' };
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
            console.error('[Email] RESEND_API_KEY is not configured');
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
            console.error('[Email] Resend error:', {
                message: (error as any)?.message,
                name: (error as any)?.name,
                code: (error as any)?.code
            });
            return { success: false, error: error.message || 'Failed to send email' };
        }

        console.log('[Email] Invitation email sent successfully:', {
            emailId: data?.id,
            tenantName
        });

        return { success: true };
    } catch (error: any) {
        console.error('[Email] Error sending invitation email:', {
            message: error?.message,
            name: error?.name
        });
        return { success: false, error: error.message || 'Unknown error' };
    }
}
