/**
 * Professional Email Templates for Misrad AI
 * Modern, responsive, and visually appealing email designs
 */

export interface EmailTemplateParams {
  greeting?: string;
  content?: string;
  ctaText?: string;
  ctaUrl?: string;
}

const BRAND_COLORS = {
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  secondary: '#8b5cf6',
  dark: '#0f172a',
  darkLight: '#1e293b',
  slate: '#334155',
  gray: '#64748b',
  lightGray: '#94a3b8',
  background: '#f8fafc',
  white: '#ffffff',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
};

const SOCIAL_LINKS = {
  instagram: 'https://instagram.com/misrad.ai',
  tiktok: 'https://tiktok.com/@misrad.ai',
  linkedin: 'https://linkedin.com/company/misrad-ai',
  youtube: 'https://youtube.com/@misrad-ai',
};

/**
 * SVG Icons for emails
 */
const EmailIcons = {
  CircleCheck: `
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="22" fill="#10b981" opacity="0.1"/>
      <circle cx="24" cy="24" r="18" fill="#10b981"/>
      <path d="M16 24L21 29L32 18" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
  
  mailOpen: `
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="20" width="48" height="32" rx="4" fill="#6366f1" opacity="0.1"/>
      <path d="M8 24L32 40L56 24" stroke="#6366f1" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="8" y="20" width="48" height="32" rx="4" stroke="#6366f1" stroke-width="2"/>
    </svg>
  `,
  
  userPlus: `
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="28" cy="22" r="10" fill="#8b5cf6" opacity="0.2"/>
      <circle cx="28" cy="22" r="10" stroke="#8b5cf6" stroke-width="2"/>
      <path d="M14 48C14 40 20 34 28 34C36 34 42 40 42 48" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round"/>
      <path d="M48 24V32M52 28H44" stroke="#10b981" stroke-width="2.5" stroke-linecap="round"/>
    </svg>
  `,
  
  support: `
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="24" fill="#6366f1" opacity="0.1"/>
      <circle cx="32" cy="32" r="20" stroke="#6366f1" stroke-width="2"/>
      <path d="M24 28C24 24 27 20 32 20C37 20 40 24 40 28C40 30 39 32 37 33L35 35V38" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="35" cy="44" r="2" fill="#6366f1"/>
    </svg>
  `,
  
  rocket: `
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M40 10L50 30L70 40L50 50L40 70L30 50L10 40L30 30L40 10Z" fill="#f59e0b" opacity="0.2"/>
      <path d="M40 10L50 30L70 40L50 50L40 70L30 50L10 40L30 30L40 10Z" stroke="#f59e0b" stroke-width="2"/>
      <circle cx="40" cy="40" r="8" fill="#f59e0b"/>
      <path d="M40 20V32M60 40H48M40 48V60M20 40H32" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `,
  
  celebration: `
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="4" fill="#6366f1"/>
      <circle cx="60" cy="20" r="4" fill="#8b5cf6"/>
      <circle cx="20" cy="60" r="4" fill="#10b981"/>
      <circle cx="60" cy="60" r="4" fill="#f59e0b"/>
      <path d="M30 25L35 35L45 30" stroke="#6366f1" stroke-width="2" stroke-linecap="round"/>
      <path d="M50 45L45 55L55 60" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round"/>
      <circle cx="40" cy="40" r="12" fill="#6366f1" opacity="0.2"/>
      <circle cx="40" cy="40" r="8" fill="#6366f1"/>
    </svg>
  `,
};

/**
 * Email Header Component
 */
function generateEmailHeader(options: {
  title?: string;
  subtitle?: string;
  gradient?: string;
  icon?: string;
}): string {
  const gradient = options.gradient || `linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.secondary} 100%)`;
  const title = options.title || 'Misrad AI';
  const subtitle = options.subtitle || 'מערכת ניהול עסקית חכמה';
  
  return `
    <tr>
      <td style="background: ${gradient}; padding: 48px 40px; text-align: center; position: relative; overflow: hidden;">
        ${options.icon ? `
          <div style="margin: 0 auto 20px auto; display: inline-block;">
            ${options.icon}
          </div>
        ` : ''}
        <div style="color: #ffffff; font-size: 32px; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 8px; text-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          ${title}
        </div>
        <div style="color: rgba(255, 255, 255, 0.95); font-size: 15px; font-weight: 600; letter-spacing: 0.3px;">
          ${subtitle}
        </div>
      </td>
    </tr>
  `;
}

/**
 * Email Footer Component with Social Links
 */
function generateEmailFooter(options?: {
  showSocialLinks?: boolean;
  additionalInfo?: string;
}): string {
  const currentYear = new Date().getFullYear();
  const showSocial = options?.showSocialLinks !== false;
  
  return `
    <tr>
      <td style="background-color: ${BRAND_COLORS.background}; padding: 40px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
        ${showSocial ? `
          <div style="margin-bottom: 24px;">
            <div style="color: ${BRAND_COLORS.gray}; font-size: 13px; font-weight: 700; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px;">
              הרשתות החברתיות שלנו
            </div>
            <table role="presentation" style="margin: 0 auto;">
              <tr>
                <td style="padding: 0 8px;">
                  <a href="${SOCIAL_LINKS.instagram}" style="display: inline-block; width: 40px; height: 40px; background-color: #ffffff; border-radius: 50%; text-decoration: none; border: 2px solid #e2e8f0; line-height: 36px; text-align: center;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;"><rect x="2" y="2" width="20" height="20" rx="5" stroke="#e4405f" stroke-width="2"/><circle cx="12" cy="12" r="4" stroke="#e4405f" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.2" fill="#e4405f"/></svg>
                  </a>
                </td>
                <td style="padding: 0 8px;">
                  <a href="${SOCIAL_LINKS.tiktok}" style="display: inline-block; width: 40px; height: 40px; background-color: #ffffff; border-radius: 50%; text-decoration: none; border: 2px solid #e2e8f0; line-height: 36px; text-align: center;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#000000" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.73a8.18 8.18 0 0 0 4.78 1.52V6.79a4.85 4.85 0 0 1-1.01-.1z"/></svg>
                  </a>
                </td>
                <td style="padding: 0 8px;">
                  <a href="${SOCIAL_LINKS.linkedin}" style="display: inline-block; width: 40px; height: 40px; background-color: #ffffff; border-radius: 50%; text-decoration: none; border: 2px solid #e2e8f0; line-height: 36px; text-align: center;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#0a66c2" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2" fill="#0a66c2"/></svg>
                  </a>
                </td>
                <td style="padding: 0 8px;">
                  <a href="${SOCIAL_LINKS.youtube}" style="display: inline-block; width: 40px; height: 40px; background-color: #ffffff; border-radius: 50%; text-decoration: none; border: 2px solid #e2e8f0; line-height: 36px; text-align: center;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#FF0000" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75,15.02 15.5,12 9.75,8.98 9.75,15.02" fill="white"/></svg>
                  </a>
                </td>
              </tr>
            </table>
          </div>
        ` : ''}
        
        <div style="margin-bottom: 16px;">
          <div style="color: ${BRAND_COLORS.gray}; font-size: 15px; font-weight: 700; margin-bottom: 4px;">
            Misrad AI
          </div>
          <div style="color: ${BRAND_COLORS.lightGray}; font-size: 13px; line-height: 1.6;">
            מערכת ניהול עסקית חכמה
          </div>
        </div>
        
        ${options?.additionalInfo ? `
          <div style="color: ${BRAND_COLORS.lightGray}; font-size: 12px; line-height: 1.6; margin-bottom: 16px;">
            ${options.additionalInfo}
          </div>
        ` : ''}
        
        <div style="color: ${BRAND_COLORS.lightGray}; font-size: 11px; margin-bottom: 12px;">
          <a href="mailto:support@misrad-ai.com" style="color: ${BRAND_COLORS.primary}; text-decoration: none; font-weight: 600;">support@misrad-ai.com</a>
          <span style="margin: 0 8px; color: #cbd5e1;">•</span>
          <a href="https://wa.me/972512239522" style="color: ${BRAND_COLORS.primary}; text-decoration: none; font-weight: 600;">WhatsApp לשירות לקוחות</a>
        </div>
        
        <div style="color: ${BRAND_COLORS.lightGray}; font-size: 11px; line-height: 1.5;">
          © ${currentYear} Misrad AI. כל הזכויות שמורות.
          <br>
          <a href="https://misrad-ai.com/privacy" style="color: ${BRAND_COLORS.gray}; text-decoration: none;">מדיניות פרטיות</a>
          <span style="margin: 0 6px;">•</span>
          <a href="https://misrad-ai.com/terms" style="color: ${BRAND_COLORS.gray}; text-decoration: none;">תנאי שימוש</a>
        </div>
      </td>
    </tr>
  `;
}

/**
 * CTA Button Component
 */
function generateCTAButton(options: {
  text: string;
  url: string;
  color?: string;
  gradient?: string;
}): string {
  const gradient = options.gradient || `linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.secondary} 100%)`;
  
  return `
    <table role="presentation" style="width: 100%; margin: 32px 0;">
      <tr>
        <td align="center" style="padding: 0;">
          <a href="${options.url}" style="display: inline-block; background: ${gradient}; color: #ffffff; text-decoration: none; padding: 18px 40px; border-radius: 14px; font-weight: 800; font-size: 17px; box-shadow: 0 10px 24px rgba(99, 102, 241, 0.35); transition: all 0.3s; letter-spacing: 0.3px;">
            ${options.text}
          </a>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Info Box Component
 */
function generateInfoBox(options: {
  title?: string;
  content: string;
  backgroundColor?: string;
  borderColor?: string;
  icon?: string;
}): string {
  const bgColor = options.backgroundColor || BRAND_COLORS.background;
  const borderColor = options.borderColor || '#e2e8f0';
  
  return `
    <div style="margin: 28px 0; background: ${bgColor}; border: 2px solid ${borderColor}; border-radius: 16px; padding: 24px; position: relative;">
      ${options.icon ? `
        <div style="margin-bottom: 16px; text-align: center;">
          ${options.icon}
        </div>
      ` : ''}
      ${options.title ? `
        <div style="font-size: 13px; font-weight: 800; color: ${BRAND_COLORS.gray}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">
          ${options.title}
        </div>
      ` : ''}
      <div style="font-size: 15px; font-weight: 600; color: ${BRAND_COLORS.slate}; line-height: 1.7; white-space: pre-line;">
        ${options.content}
      </div>
    </div>
  `;
}

/**
 * Base Email Template Wrapper
 */
export function generateBaseEmailTemplate(options: {
  headerTitle?: string;
  headerSubtitle?: string;
  headerGradient?: string;
  headerIcon?: string;
  bodyContent: string;
  showSocialLinks?: boolean;
  footerAdditionalInfo?: string;
}): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${options.headerTitle || 'Misrad AI'}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f0f4f8; direction: rtl; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f0f4f8;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 24px; box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12); overflow: hidden;">
          ${generateEmailHeader({
            title: options.headerTitle,
            subtitle: options.headerSubtitle,
            gradient: options.headerGradient,
            icon: options.headerIcon,
          })}
          
          <tr>
            <td style="padding: 44px 40px;">
              ${options.bodyContent}
            </td>
          </tr>
          
          ${generateEmailFooter({
            showSocialLinks: options.showSocialLinks,
            additionalInfo: options.footerAdditionalInfo,
          })}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export const EmailTemplateComponents = {
  generateEmailHeader,
  generateEmailFooter,
  generateCTAButton,
  generateInfoBox,
  Icons: EmailIcons,
  Colors: BRAND_COLORS,
};
