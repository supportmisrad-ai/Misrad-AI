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

                            <table role="presentation" style="width: 100%; margin: 0 0 10px 0;">
                                <tr>
                                    <td align="center" style="padding: 0;">
                                        <div style="color: #718096; font-size: 12px; font-weight: 600; margin: 0 0 10px 0;">
                                            להורדת האפליקציה:
                                        </div>
                                        <a href="#" style="display: inline-block; margin: 0 6px; padding: 8px 12px; border-radius: 10px; border: 1px solid #e2e8f0; background: #ffffff; color: #2d3748; text-decoration: none; font-size: 12px; font-weight: 700;">
                                            הורד ל-Windows
                                        </a>
                                        <a href="#" style="display: inline-block; margin: 0 6px; padding: 8px 12px; border-radius: 10px; border: 1px solid #e2e8f0; background: #ffffff; color: #2d3748; text-decoration: none; font-size: 12px; font-weight: 700;">
                                            הורד ל-Android
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

        // Send email via Resend
        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: employeeEmail,
            subject: `הזמנה להצטרף לצוות - ${department} - ${role}`,
            html: html,
        });

        if (error) {
            console.error('[Email] Resend error:', error);
            return { success: false, error: error.message || 'Failed to send email' };
        }

        console.log('[Email] Employee invitation email sent successfully:', {
            to: employeeEmail,
            emailId: data?.id,
            department,
            role
        });

        return { success: true };
    } catch (error: any) {
        console.error('[Email] Error sending employee invitation email:', error);
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

        const html = generateOrganizationWelcomeEmailHTML({
            organizationName: params.organizationName,
            ownerName: params.ownerName || null,
            portalUrl: params.portalUrl,
        });

        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: params.ownerEmail,
            subject: `ברוכים הבאים! הפורטל של ${params.organizationName} מוכן`,
            html,
        });

        if (error) {
            console.error('[Email] Resend error (welcome):', error);
            return { success: false, error: error.message || 'Failed to send email' };
        }

        console.log('[Email] Organization welcome email sent successfully:', {
            to: params.ownerEmail,
            emailId: data?.id,
            organizationName: params.organizationName,
        });

        return { success: true };
    } catch (error: any) {
        console.error('[Email] Error sending organization welcome email:', error);
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

        // Send email via Resend
        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: ownerEmail,
            subject: `הזמנה להצטרף ל-Misrad - ${tenantName}`,
            html: html,
        });

        if (error) {
            console.error('[Email] Resend error:', error);
            return { success: false, error: error.message || 'Failed to send email' };
        }

        console.log('[Email] Invitation email sent successfully:', {
            to: ownerEmail,
            emailId: data?.id,
            tenantName
        });

        return { success: true };
    } catch (error: any) {
        console.error('[Email] Error sending invitation email:', error);
        return { success: false, error: error.message || 'Unknown error' };
    }
}
