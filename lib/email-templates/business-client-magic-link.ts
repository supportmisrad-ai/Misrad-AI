/**
 * Email Template: Business Client Magic Link
 * Sends a secure magic link to business clients for accessing their invoice portal
 */

export interface BusinessClientMagicLinkParams {
  businessClientName: string;
  organizationName: string;
  magicLink: string;
  expiresAt: Date;
}

export function businessClientMagicLinkEmail(params: BusinessClientMagicLinkParams) {
  const { businessClientName, organizationName, magicLink, expiresAt } = params;

  const expiryDate = new Date(expiresAt).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    subject: `🔐 קישור גישה לפורטל חשבוניות - ${organizationName}`,
    html: `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>קישור גישה לפורטל חשבוניות</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                      🔐 קישור גישה מאובטח
                    </h1>
                    <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px;">
                      פורטל חשבוניות ${organizationName}
                    </p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 22px; font-weight: bold;">
                      שלום ${businessClientName} 👋
                    </h2>
                    
                    <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      הנה קישור הגישה המאובטח שלך לפורטל החשבוניות. דרך הפורטל תוכל:
                    </p>

                    <ul style="margin: 0 0 30px 0; padding: 0 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.8;">
                      <li>לצפות בכל החשבוניות שלך</li>
                      <li>להוריד חשבוניות בפורמט PDF</li>
                      <li>לשלם חשבוניות ממתינות</li>
                      <li>לעקוב אחר היסטוריית התשלומים</li>
                    </ul>

                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                      <tr>
                        <td align="center">
                          <a href="${magicLink}" style="display: inline-block; padding: 16px 40px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
                            🔓 כניסה לפורטל החשבוניות
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Security Info -->
                    <div style="background-color: #fef3c7; border: 2px solid #fbbf24; border-radius: 12px; padding: 20px; margin: 0 0 30px 0;">
                      <p style="margin: 0 0 10px 0; color: #92400e; font-size: 14px; font-weight: bold;">
                        ⏰ תוקף הקישור
                      </p>
                      <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">
                        הקישור תקף עד: <strong>${expiryDate}</strong><br>
                        לאחר תאריך זה, תצטרך לבקש קישור חדש ממנהל המערכת.
                      </p>
                    </div>

                    <!-- Alternative Link -->
                    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 15px; margin: 0 0 20px 0;">
                      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px; font-weight: bold;">
                        הכפתור לא עובד? העתק את הקישור הבא:
                      </p>
                      <p style="margin: 0; word-break: break-all;">
                        <a href="${magicLink}" style="color: #2563eb; font-size: 12px; text-decoration: underline;">
                          ${magicLink}
                        </a>
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px; border-top: 1px solid #e5e7eb;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <p style="margin: 0 0 15px 0; color: #6b7280; font-size: 14px;">
                            📧 שאלות או בעיות? צור קשר איתנו:
                          </p>
                          <p style="margin: 0 0 15px 0;">
                            <a href="mailto:billing@misrad-ai.com" style="color: #2563eb; text-decoration: none; font-weight: bold; font-size: 15px;">
                              billing@misrad-ai.com
                            </a>
                          </p>
                          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                            מייל זה נשלח ממערכת Misrad-AI<br>
                            הקישור מאובטח ומוצפן לשימושך האישי בלבד
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `
שלום ${businessClientName},

הנה קישור הגישה המאובטח שלך לפורטל החשבוניות של ${organizationName}.

כניסה לפורטל: ${magicLink}

הקישור תקף עד: ${expiryDate}

דרך הפורטל תוכל:
• לצפות בכל החשבוניות שלך
• להוריד חשבוניות בפורמט PDF
• לשלם חשבוניות ממתינות
• לעקוב אחר היסטוריית התשלומים

שאלות? צור קשר: billing@misrad-ai.com

בברכה,
צוות Misrad-AI
    `.trim(),
  };
}
