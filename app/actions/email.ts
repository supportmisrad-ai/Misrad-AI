'use server';

import { resend, isResendConfigured } from '@/lib/resend';
import { Client } from '@/types';

interface SendInvitationEmailParams {
  clientName: string;
  clientEmail: string;
  invitationLink: string;
  planName: string;
  planPrice: number;
}

/**
 * Server Action: Send invitation email to client using Resend
 */
export async function sendInvitationEmail(params: SendInvitationEmailParams) {
  try {
    if (!isResendConfigured()) {
      return {
        success: false,
        error: 'Resend לא מוגדר. נא להגדיר RESEND_API_KEY במשתני הסביבה.',
      };
    }

    if (!resend) {
      return {
        success: false,
        error: 'לקוח Resend לא אותחל.',
      };
    }

    const { clientName, clientEmail, invitationLink, planName, planPrice } = params;

    // Get the "from" email from environment or use default
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: clientEmail,
      subject: `הזמנה להצטרף ל-Social OS - ${clientName}`,
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="he">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>הזמנה ל-Social OS</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; background-color: #f8fafc; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 24px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1e293b; font-size: 28px; font-weight: 900; margin: 0;">Social OS</h1>
              <p style="color: #64748b; font-size: 14px; margin-top: 8px;">מערכת הניהול המתקדמת לניהול סושיאל מדיה</p>
            </div>
            
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); border-radius: 16px; padding: 30px; text-align: center; margin-bottom: 30px;">
              <h2 style="color: white; font-size: 24px; font-weight: 900; margin: 0 0 10px 0;">שלום ${clientName}!</h2>
              <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 0;">הזמנו אותך להצטרף ל-Social OS</p>
            </div>

            <div style="margin-bottom: 30px;">
              <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                אנו שמחים להזמין אותך להצטרף ל-<strong>Social OS</strong>, מערכת הניהול המתקדמת לניהול סושיאל מדיה.
              </p>
              <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                דרך המערכת תוכל:
              </p>
              <ul style="color: #475569; font-size: 15px; line-height: 1.8; padding-right: 20px;">
                <li>לנהל את כל הפלטפורמות שלך במקום אחד</li>
                <li>לאשר פוסטים בקלות</li>
                <li>לצפות בלוח שידורים מלא</li>
                <li>לנהל תשלומים ותשלומים</li>
                <li>ולקבל תובנות על הביצועים</li>
              </ul>
            </div>

            <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
              <p style="color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; margin: 0 0 8px 0;">חבילת שירות</p>
              <p style="color: #1e293b; font-size: 18px; font-weight: 900; margin: 0;">
                ${planName} - ₪${planPrice.toLocaleString()}/חודש
              </p>
            </div>

            <div style="text-align: center; margin-bottom: 30px;">
              <a 
                href="${invitationLink}" 
                style="display: inline-block; background-color: #3b82f6; color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 900; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);"
              >
                התחל עכשיו - הגדר את החשבון שלך
              </a>
            </div>

            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px;">
              <p style="color: #94a3b8; font-size: 12px; line-height: 1.6; margin: 0;">
                אם הכפתור לא עובד, העתק והדבק את הקישור הבא בדפדפן שלך:<br>
                <a href="${invitationLink}" style="color: #3b82f6; word-break: break-all;">${invitationLink}</a>
              </p>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                שאלות? אנחנו כאן לעזור<br>
                <a href="mailto:support@social-os.com" style="color: #3b82f6;">support@social-os.com</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return {
        success: false,
        error: error.message || 'שגיאה בשליחת מייל',
      };
    }

    return {
      success: true,
      messageId: data?.id,
      message: 'מייל הזמנה נשלח בהצלחה',
    };
  } catch (error: any) {
    console.error('Error sending invitation email:', error);
    return {
      success: false,
      error: error.message || 'אירעה שגיאה בלתי צפויה',
    };
  }
}

/**
 * Server Action: Send test email
 */
export async function sendTestEmail(to: string) {
  try {
    if (!isResendConfigured()) {
      return {
        success: false,
        error: 'Resend לא מוגדר. נא להגדיר RESEND_API_KEY במשתני הסביבה.',
      };
    }

    if (!resend) {
      return {
        success: false,
        error: 'לקוח Resend לא אותחל.',
      };
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: to,
      subject: 'Test Email from Social OS',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; direction: rtl; text-align: right;">
          <h1>זהו מייל בדיקה מ-Social OS</h1>
          <p>אם קיבלת את המייל הזה, זה אומר ש-Resend מוגדר נכון! ✅</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return {
        success: false,
        error: error.message || 'שגיאה בשליחת מייל בדיקה',
      };
    }

    return {
      success: true,
      messageId: data?.id,
      message: 'מייל בדיקה נשלח בהצלחה',
    };
  } catch (error: any) {
    console.error('Error sending test email:', error);
    return {
      success: false,
      error: error.message || 'אירעה שגיאה בלתי צפויה',
    };
  }
}

