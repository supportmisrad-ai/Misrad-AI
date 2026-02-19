/**
 * MISRAD AI — Premium Email Template System
 * RTL Hebrew · Brand Colors · Modern Design
 */

import { getBaseUrl } from '@/lib/utils';

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
  accent: '#ec4899',
  dark: '#0f172a',
  darkLight: '#1e293b',
  slate: '#334155',
  gray: '#64748b',
  lightGray: '#94a3b8',
  muted: '#cbd5e1',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  background: '#f8fafc',
  white: '#ffffff',
  success: '#10b981',
  successDark: '#059669',
  successBg: '#ecfdf5',
  successBorder: '#a7f3d0',
  warning: '#f59e0b',
  warningDark: '#d97706',
  warningBg: '#fff7ed',
  warningBorder: '#fed7aa',
  danger: '#ef4444',
  dangerDark: '#dc2626',
  dangerBg: '#fef2f2',
  dangerBorder: '#fecaca',
  infoBg: '#eff6ff',
  infoBorder: '#bfdbfe',
};

const BRAND_LINKS = {
  site: 'https://misrad-ai.com',
  privacy: 'https://misrad-ai.com/privacy',
  terms: 'https://misrad-ai.com/terms',
  support: 'mailto:support@misrad-ai.com',
  whatsapp: 'https://wa.me/972512239522',
  instagram: 'https://instagram.com/misrad.ai',
  tiktok: 'https://tiktok.com/@misrad.ai',
  linkedin: 'https://linkedin.com/company/misrad-ai',
  youtube: 'https://youtube.com/@misrad-ai',
};

function getLogoUrl(): string {
  try {
    return `${getBaseUrl()}/icons/misrad-icon-192.png`;
  } catch {
    return 'https://misrad-ai.com/icons/misrad-icon-192.png';
  }
}

/**
 * Emoji-based decorative icons (universally supported in all email clients)
 */
const EmailIcons = {
  CircleCheck: `<div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,${BRAND_COLORS.success},${BRAND_COLORS.successDark});margin:0 auto;line-height:56px;text-align:center;font-size:28px;box-shadow:0 8px 20px rgba(16,185,129,0.3);">✓</div>`,
  mailOpen: `<div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,${BRAND_COLORS.primary},${BRAND_COLORS.secondary});margin:0 auto;line-height:56px;text-align:center;font-size:28px;box-shadow:0 8px 20px rgba(99,102,241,0.3);">📩</div>`,
  userPlus: `<div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,${BRAND_COLORS.secondary},${BRAND_COLORS.primary});margin:0 auto;line-height:56px;text-align:center;font-size:28px;box-shadow:0 8px 20px rgba(139,92,246,0.3);">👋</div>`,
  support: `<div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,${BRAND_COLORS.dark},${BRAND_COLORS.darkLight});margin:0 auto;line-height:56px;text-align:center;font-size:28px;box-shadow:0 8px 20px rgba(15,23,42,0.3);">🛟</div>`,
  rocket: `<div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,${BRAND_COLORS.primary},${BRAND_COLORS.secondary});margin:0 auto;line-height:56px;text-align:center;font-size:28px;box-shadow:0 8px 20px rgba(99,102,241,0.3);">🚀</div>`,
  celebration: `<div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,${BRAND_COLORS.warning},${BRAND_COLORS.warningDark});margin:0 auto;line-height:56px;text-align:center;font-size:28px;box-shadow:0 8px 20px rgba(245,158,11,0.3);">🎉</div>`,
  clock: `<div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,${BRAND_COLORS.danger},${BRAND_COLORS.dangerDark});margin:0 auto;line-height:56px;text-align:center;font-size:28px;box-shadow:0 8px 20px rgba(239,68,68,0.3);">⏰</div>`,
  heart: `<div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,${BRAND_COLORS.accent},#db2777);margin:0 auto;line-height:56px;text-align:center;font-size:28px;box-shadow:0 8px 20px rgba(236,72,153,0.3);">💜</div>`,
  key: `<div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,${BRAND_COLORS.warning},${BRAND_COLORS.warningDark});margin:0 auto;line-height:56px;text-align:center;font-size:28px;box-shadow:0 8px 20px rgba(245,158,11,0.3);">🔑</div>`,
  shield: `<div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,${BRAND_COLORS.success},${BRAND_COLORS.successDark});margin:0 auto;line-height:56px;text-align:center;font-size:28px;box-shadow:0 8px 20px rgba(16,185,129,0.3);">🛡️</div>`,
};

/**
 * Email Header — logo + title + subtitle on gradient background
 */
function generateEmailHeader(options: {
  title?: string;
  subtitle?: string;
  gradient?: string;
  icon?: string;
}): string {
  const gradient = options.gradient || `linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.secondary} 100%)`;
  const title = options.title || 'MISRAD AI';
  const subtitle = options.subtitle || 'מערכת AI לניהול הארגון';
  const logoUrl = getLogoUrl();

  return `
    <tr>
      <td style="background: ${gradient}; padding: 40px 40px 36px; text-align: center;">
        <img src="${logoUrl}" alt="MISRAD AI" width="52" height="52" style="display:block;margin:0 auto 16px;border-radius:14px;border:2px solid rgba(255,255,255,0.25);" />
        ${options.icon ? `<div style="margin: 0 auto 16px; display: inline-block;">${options.icon}</div>` : ''}
        <div style="color: #ffffff; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 6px;">
          ${title}
        </div>
        <div style="color: rgba(255,255,255,0.85); font-size: 14px; font-weight: 600;">
          ${subtitle}
        </div>
      </td>
    </tr>
  `;
}

/**
 * Email Footer — minimal, clean, professional
 */
function generateEmailFooter(options?: {
  showSocialLinks?: boolean;
  additionalInfo?: string;
}): string {
  const currentYear = new Date().getFullYear();
  const showSocial = options?.showSocialLinks === true;

  return `
    <tr>
      <td style="background: ${BRAND_COLORS.dark}; padding: 32px 40px; text-align: center;">
        ${showSocial ? `
          <table role="presentation" style="margin: 0 auto 20px;" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 0 6px;"><a href="${BRAND_LINKS.instagram}" style="color:rgba(255,255,255,0.7);text-decoration:none;font-size:13px;font-weight:600;">Instagram</a></td>
              <td style="color:rgba(255,255,255,0.3);padding:0 4px;">·</td>
              <td style="padding: 0 6px;"><a href="${BRAND_LINKS.tiktok}" style="color:rgba(255,255,255,0.7);text-decoration:none;font-size:13px;font-weight:600;">TikTok</a></td>
              <td style="color:rgba(255,255,255,0.3);padding:0 4px;">·</td>
              <td style="padding: 0 6px;"><a href="${BRAND_LINKS.linkedin}" style="color:rgba(255,255,255,0.7);text-decoration:none;font-size:13px;font-weight:600;">LinkedIn</a></td>
              <td style="color:rgba(255,255,255,0.3);padding:0 4px;">·</td>
              <td style="padding: 0 6px;"><a href="${BRAND_LINKS.youtube}" style="color:rgba(255,255,255,0.7);text-decoration:none;font-size:13px;font-weight:600;">YouTube</a></td>
            </tr>
          </table>
        ` : ''}

        ${options?.additionalInfo ? `
          <div style="color:rgba(255,255,255,0.5);font-size:12px;line-height:1.6;margin-bottom:16px;">
            ${options.additionalInfo}
          </div>
        ` : ''}

        <div style="margin-bottom: 12px;">
          <a href="${BRAND_LINKS.support}" style="color:rgba(255,255,255,0.7);text-decoration:none;font-size:12px;font-weight:600;">support@misrad-ai.com</a>
          <span style="color:rgba(255,255,255,0.25);margin:0 8px;">·</span>
          <a href="${BRAND_LINKS.whatsapp}" style="color:rgba(255,255,255,0.7);text-decoration:none;font-size:12px;font-weight:600;">WhatsApp</a>
        </div>
        <div style="color:rgba(255,255,255,0.35);font-size:11px;line-height:1.6;">
          © ${currentYear} MISRAD AI · כל הזכויות שמורות
          <br />
          <a href="${BRAND_LINKS.privacy}" style="color:rgba(255,255,255,0.45);text-decoration:none;">פרטיות</a>
          <span style="margin:0 4px;">·</span>
          <a href="${BRAND_LINKS.terms}" style="color:rgba(255,255,255,0.45);text-decoration:none;">תנאים</a>
        </div>
      </td>
    </tr>
  `;
}

/**
 * CTA Button — prominent, with shadow
 */
function generateCTAButton(options: {
  text: string;
  url: string;
  color?: string;
  gradient?: string;
}): string {
  const gradient = options.gradient || `linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.secondary} 100%)`;

  return `
    <table role="presentation" style="width:100%;margin:28px 0;" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${options.url}" style="height:54px;v-text-anchor:middle;width:280px;" arcsize="26%" fillcolor="${BRAND_COLORS.primary}" stroke="f">
            <v:textbox inset="0,0,0,0"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:17px;font-weight:bold;">${options.text}</center></v:textbox>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-->
          <a href="${options.url}" style="display:inline-block;background:${gradient};color:#ffffff;text-decoration:none;padding:16px 44px;border-radius:14px;font-weight:800;font-size:16px;box-shadow:0 8px 24px rgba(99,102,241,0.35);letter-spacing:0.3px;mso-hide:all;">
            ${options.text}
          </a>
          <!--<![endif]-->
        </td>
      </tr>
    </table>
  `;
}

/**
 * Secondary CTA — lighter style
 */
function generateSecondaryCTA(options: {
  text: string;
  url: string;
}): string {
  return `
    <table role="presentation" style="width:100%;margin:16px 0;" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <a href="${options.url}" style="display:inline-block;background:${BRAND_COLORS.white};color:${BRAND_COLORS.primary};text-decoration:none;padding:14px 36px;border-radius:12px;font-weight:700;font-size:15px;border:2px solid ${BRAND_COLORS.border};">
            ${options.text}
          </a>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Info Box — for highlighted content blocks
 */
function generateInfoBox(options: {
  title?: string;
  content: string;
  backgroundColor?: string;
  borderColor?: string;
  icon?: string;
}): string {
  const bgColor = options.backgroundColor || BRAND_COLORS.background;
  const borderColor = options.borderColor || BRAND_COLORS.border;

  return `
    <div style="margin:24px 0;background:${bgColor};border:2px solid ${borderColor};border-radius:14px;padding:22px 24px;">
      ${options.icon ? `<div style="margin-bottom:14px;text-align:center;">${options.icon}</div>` : ''}
      ${options.title ? `
        <div style="font-size:12px;font-weight:800;color:${BRAND_COLORS.gray};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
          ${options.title}
        </div>
      ` : ''}
      <div style="font-size:15px;font-weight:500;color:${BRAND_COLORS.slate};line-height:1.7;white-space:pre-line;">
        ${options.content}
      </div>
    </div>
  `;
}

/**
 * Badge / Pill — for status indicators
 */
function generateBadge(options: {
  text: string;
  color?: string;
  bgColor?: string;
}): string {
  const color = options.color || BRAND_COLORS.primary;
  const bgColor = options.bgColor || BRAND_COLORS.infoBg;
  return `<span style="display:inline-block;background:${bgColor};color:${color};padding:4px 14px;border-radius:20px;font-size:13px;font-weight:700;">${options.text}</span>`;
}

/**
 * Numbered Steps — for onboarding sequences
 */
function generateSteps(steps: Array<{ title: string; desc?: string }>): string {
  return `
    <div style="margin:24px 0;">
      ${steps.map((step, i) => `
        <div style="display:flex;margin-bottom:${i < steps.length - 1 ? '16' : '0'}px;">
          <div style="min-width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,${BRAND_COLORS.primary},${BRAND_COLORS.secondary});color:#fff;font-size:14px;font-weight:900;text-align:center;line-height:32px;margin-left:14px;">
            ${i + 1}
          </div>
          <div style="flex:1;">
            <div style="font-size:15px;font-weight:700;color:${BRAND_COLORS.dark};line-height:32px;">${step.title}</div>
            ${step.desc ? `<div style="font-size:13px;color:${BRAND_COLORS.gray};line-height:1.5;margin-top:2px;">${step.desc}</div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Stat Card — for numbers/metrics
 */
function generateStatCard(options: {
  value: string;
  label: string;
  color?: string;
}): string {
  const color = options.color || BRAND_COLORS.primary;
  return `
    <div style="display:inline-block;text-align:center;padding:16px 24px;background:${BRAND_COLORS.background};border-radius:12px;border:1px solid ${BRAND_COLORS.border};margin:4px;">
      <div style="font-size:28px;font-weight:900;color:${color};letter-spacing:-1px;">${options.value}</div>
      <div style="font-size:12px;font-weight:600;color:${BRAND_COLORS.gray};margin-top:4px;">${options.label}</div>
    </div>
  `;
}

/**
 * Horizontal Divider
 */
function generateDivider(): string {
  return `<div style="height:1px;background:${BRAND_COLORS.border};margin:28px 0;"></div>`;
}

/**
 * Callout Box — for warnings, tips, etc.
 */
function generateCallout(options: {
  emoji: string;
  title: string;
  text: string;
  bgColor?: string;
  borderColor?: string;
  titleColor?: string;
  textColor?: string;
}): string {
  return `
    <div style="margin:24px 0;padding:20px 24px;background:${options.bgColor || BRAND_COLORS.warningBg};border-radius:14px;border:2px solid ${options.borderColor || BRAND_COLORS.warningBorder};">
      <div style="font-size:15px;font-weight:800;color:${options.titleColor || '#78350f'};margin-bottom:6px;">
        ${options.emoji} ${options.title}
      </div>
      <div style="font-size:14px;color:${options.textColor || '#92400e'};line-height:1.7;">
        ${options.text}
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
  <title>${options.headerTitle || 'MISRAD AI'}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#eef2f7;direction:rtl;-webkit-font-smoothing:antialiased;">
  <table role="presentation" style="width:100%;border-collapse:collapse;background-color:#eef2f7;" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:20px;box-shadow:0 4px 24px rgba(15,23,42,0.08);overflow:hidden;" cellpadding="0" cellspacing="0">
          ${generateEmailHeader({
            title: options.headerTitle,
            subtitle: options.headerSubtitle,
            gradient: options.headerGradient,
            icon: options.headerIcon,
          })}

          <tr>
            <td style="padding:40px 36px;">
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
  generateSecondaryCTA,
  generateInfoBox,
  generateBadge,
  generateSteps,
  generateStatCard,
  generateDivider,
  generateCallout,
  Icons: EmailIcons,
  Colors: BRAND_COLORS,
  Links: BRAND_LINKS,
};
