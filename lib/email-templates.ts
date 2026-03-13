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
    <table role="presentation" style="width:100%;margin:24px 0;border-collapse:collapse;" cellpadding="0" cellspacing="0">
      ${steps.map((step, i) => `
        <tr>
          <td style="width:36px;vertical-align:top;padding-bottom:${i < steps.length - 1 ? '16' : '0'}px;">
            <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,${BRAND_COLORS.primary},${BRAND_COLORS.secondary});color:#fff;font-size:14px;font-weight:900;text-align:center;line-height:32px;">
              ${i + 1}
            </div>
          </td>
          <td style="vertical-align:top;padding-bottom:${i < steps.length - 1 ? '16' : '0'}px;padding-right:14px;">
            <div style="font-size:15px;font-weight:700;color:${BRAND_COLORS.dark};line-height:32px;">${step.title}</div>
            ${step.desc ? `<div style="font-size:13px;color:${BRAND_COLORS.gray};line-height:1.5;margin-top:2px;">${step.desc}</div>` : ''}
          </td>
        </tr>
      `).join('')}
    </table>
  `;
}

/**
 * Stat Card — for numbers/metrics (single or multi-item)
 */
function generateStatCard(options: {
  value?: string;
  label?: string;
  color?: string;
  items?: Array<{ label: string; value: string; color?: string }>;
}): string {
  if (options.items && options.items.length > 0) {
    const cells = options.items.map((item) => {
      const c = item.color || BRAND_COLORS.primary;
      return `
        <td style="text-align:center;padding:16px 12px;background:${BRAND_COLORS.background};border-radius:12px;border:1px solid ${BRAND_COLORS.border};">
          <div style="font-size:24px;font-weight:900;color:${c};letter-spacing:-1px;">${item.value}</div>
          <div style="font-size:11px;font-weight:600;color:${BRAND_COLORS.gray};margin-top:4px;">${item.label}</div>
        </td>
      `;
    }).join('<td style="width:8px;"></td>');
    return `
      <table role="presentation" style="width:100%;margin:24px 0;" cellpadding="0" cellspacing="0">
        <tr>${cells}</tr>
      </table>
    `;
  }
  const color = options.color || BRAND_COLORS.primary;
  return `
    <div style="display:inline-block;text-align:center;padding:16px 24px;background:${BRAND_COLORS.background};border-radius:12px;border:1px solid ${BRAND_COLORS.border};margin:4px;">
      <div style="font-size:28px;font-weight:900;color:${color};letter-spacing:-1px;">${options.value || ''}</div>
      <div style="font-size:12px;font-weight:600;color:${BRAND_COLORS.gray};margin-top:4px;">${options.label || ''}</div>
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
      <td align="center" style="padding:20px 4px;">
        <table role="presentation" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:20px;box-shadow:0 4px 24px rgba(15,23,42,0.08);overflow:hidden;" cellpadding="0" cellspacing="0">
          ${generateEmailHeader({
            title: options.headerTitle,
            subtitle: options.headerSubtitle,
            gradient: options.headerGradient,
            icon: options.headerIcon,
          })}

          <tr>
            <td style="padding:32px 24px;">
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

/**
 * Hero Image — full-width visual at top of email body
 */
function generateHeroImage(options: {
  src: string;
  alt: string;
  href?: string;
  borderRadius?: string;
  caption?: string;
}): string {
  const radius = options.borderRadius || '14px';
  const img = `<img src="${options.src}" alt="${options.alt}" style="display:block;width:100%;max-width:540px;margin:0 auto;border-radius:${radius};border:2px solid ${BRAND_COLORS.border};" />`;
  const wrapped = options.href ? `<a href="${options.href}" style="text-decoration:none;">${img}</a>` : img;

  return `
    <div style="margin:24px 0;text-align:center;">
      ${wrapped}
      ${options.caption ? `<div style="font-size:12px;color:${BRAND_COLORS.lightGray};margin-top:8px;">${options.caption}</div>` : ''}
    </div>
  `;
}

/**
 * Screenshot Mockup — image inside a browser-like frame
 */
function generateScreenshot(options: {
  src: string;
  alt: string;
  title?: string;
  href?: string;
}): string {
  const img = `<img src="${options.src}" alt="${options.alt}" style="display:block;width:100%;border-radius:0 0 10px 10px;" />`;
  const wrapped = options.href ? `<a href="${options.href}" style="text-decoration:none;">${img}</a>` : img;

  return `
    <div style="margin:24px 0;border-radius:12px;border:2px solid ${BRAND_COLORS.border};overflow:hidden;box-shadow:0 4px 16px rgba(15,23,42,0.08);">
      <div style="background:${BRAND_COLORS.dark};padding:10px 16px;display:flex;align-items:center;gap:6px;">
        <span style="width:10px;height:10px;border-radius:50%;background:#ef4444;display:inline-block;"></span>
        <span style="width:10px;height:10px;border-radius:50%;background:#f59e0b;display:inline-block;"></span>
        <span style="width:10px;height:10px;border-radius:50%;background:#10b981;display:inline-block;"></span>
        ${options.title ? `<span style="color:rgba(255,255,255,0.6);font-size:11px;margin-right:auto;font-weight:600;">${options.title}</span>` : ''}
      </div>
      ${wrapped}
    </div>
  `;
}

/**
 * Video Thumbnail — clickable image with play button overlay
 */
function generateVideoThumbnail(options: {
  thumbnailSrc: string;
  videoUrl: string;
  alt?: string;
  caption?: string;
}): string {
  return `
    <div style="margin:24px 0;text-align:center;">
      <a href="${options.videoUrl}" style="text-decoration:none;display:inline-block;position:relative;">
        <img src="${options.thumbnailSrc}" alt="${options.alt || 'צפייה בסרטון'}" style="display:block;width:100%;max-width:540px;border-radius:14px;border:2px solid ${BRAND_COLORS.border};" />
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:64px;height:64px;border-radius:50%;background:rgba(99,102,241,0.9);box-shadow:0 8px 24px rgba(99,102,241,0.4);text-align:center;line-height:64px;">
          <span style="display:inline-block;width:0;height:0;border-style:solid;border-width:12px 0 12px 22px;border-color:transparent transparent transparent #ffffff;margin-right:-4px;margin-top:2px;"></span>
        </div>
      </a>
      ${options.caption ? `<div style="font-size:12px;color:${BRAND_COLORS.lightGray};margin-top:8px;">${options.caption}</div>` : ''}
    </div>
  `;
}

/**
 * Founder Card — personal message with photo and signature (inspired by Mishloha)
 */
function generateFounderCard(options: {
  photoUrl: string;
  name: string;
  title: string;
  message: string;
  signatureText?: string;
}): string {
  return `
    <div style="margin:28px 0;padding:28px;background:linear-gradient(135deg,#faf5ff 0%,#f0f9ff 100%);border-radius:18px;border:2px solid ${BRAND_COLORS.border};">
      <div style="text-align:center;margin-bottom:20px;">
        <img src="${options.photoUrl}" alt="${options.name}" width="80" height="80" style="border-radius:50%;border:3px solid ${BRAND_COLORS.primary};box-shadow:0 4px 12px rgba(99,102,241,0.2);" />
      </div>
      <div style="font-size:15px;color:${BRAND_COLORS.slate};line-height:1.8;text-align:center;margin-bottom:16px;">
        ${options.message}
      </div>
      <div style="text-align:center;margin-top:16px;">
        ${options.signatureText ? `<div style="font-family:'Segoe Script','Dancing Script',cursive;font-size:22px;color:${BRAND_COLORS.primary};margin-bottom:4px;">${options.signatureText}</div>` : ''}
        <div style="font-size:14px;font-weight:800;color:${BRAND_COLORS.dark};">${options.name}</div>
        <div style="font-size:12px;color:${BRAND_COLORS.gray};">${options.title}</div>
      </div>
    </div>
  `;
}

/**
 * Testimonial Quote — customer quote with optional avatar
 */
function generateTestimonial(options: {
  quote: string;
  authorName: string;
  authorTitle?: string;
  authorPhotoUrl?: string;
}): string {
  return `
    <div style="margin:24px 0;padding:24px 28px;background:${BRAND_COLORS.background};border-radius:16px;border-right:4px solid ${BRAND_COLORS.primary};">
      <div style="font-size:24px;color:${BRAND_COLORS.primary};margin-bottom:8px;line-height:1;">"</div>
      <div style="font-size:15px;color:${BRAND_COLORS.slate};line-height:1.7;font-style:italic;margin-bottom:16px;">
        ${options.quote}
      </div>
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          ${options.authorPhotoUrl ? `<td style="width:40px;vertical-align:middle;padding-left:10px;"><img src="${options.authorPhotoUrl}" alt="${options.authorName}" width="36" height="36" style="border-radius:50%;border:2px solid ${BRAND_COLORS.border};display:block;" /></td>` : ''}
          <td style="vertical-align:middle;">
            <div style="font-size:13px;font-weight:800;color:${BRAND_COLORS.dark};">${options.authorName}</div>
            ${options.authorTitle ? `<div style="font-size:11px;color:${BRAND_COLORS.gray};">${options.authorTitle}</div>` : ''}
          </td>
        </tr>
      </table>
    </div>
  `;
}

/**
 * Feature Banner — eye-catching gradient banner with icon + text
 */
function generateFeatureBanner(options: {
  emoji: string;
  title: string;
  subtitle?: string;
  gradient?: string;
}): string {
  const gradient = options.gradient || `linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.secondary} 100%)`;
  return `
    <div style="margin:24px 0;padding:28px;background:${gradient};border-radius:16px;text-align:center;box-shadow:0 8px 24px rgba(99,102,241,0.2);">
      <div style="font-size:36px;margin-bottom:12px;">${options.emoji}</div>
      <div style="font-size:20px;font-weight:900;color:#ffffff;margin-bottom:4px;">${options.title}</div>
      ${options.subtitle ? `<div style="font-size:14px;color:rgba(255,255,255,0.8);font-weight:500;">${options.subtitle}</div>` : ''}
    </div>
  `;
}

/**
 * Image Row — 2-3 images side by side (for showcasing features)
 */
function generateImageRow(options: {
  images: Array<{ src: string; alt: string; caption?: string; href?: string }>;
}): string {
  const width = options.images.length <= 2 ? '48%' : '31%';
  const cells = options.images.map((img) => {
    const imgTag = `<img src="${img.src}" alt="${img.alt}" style="display:block;width:100%;border-radius:10px;border:1px solid ${BRAND_COLORS.border};" />`;
    const wrapped = img.href ? `<a href="${img.href}" style="text-decoration:none;">${imgTag}</a>` : imgTag;
    return `
      <td style="width:${width};vertical-align:top;padding:0 4px;">
        ${wrapped}
        ${img.caption ? `<div style="font-size:11px;color:${BRAND_COLORS.gray};text-align:center;margin-top:6px;font-weight:600;">${img.caption}</div>` : ''}
      </td>
    `;
  }).join('');

  return `
    <table role="presentation" style="width:100%;margin:24px 0;" cellpadding="0" cellspacing="0">
      <tr>${cells}</tr>
    </table>
  `;
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
  generateHeroImage,
  generateScreenshot,
  generateVideoThumbnail,
  generateFounderCard,
  generateTestimonial,
  generateFeatureBanner,
  generateImageRow,
  Icons: EmailIcons,
  Colors: BRAND_COLORS,
  Links: BRAND_LINKS,
};
