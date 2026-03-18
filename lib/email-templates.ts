/**
 * MISRAD AI — Pro Minimalist Email System
 * RTL Hebrew · Clean · Direct · Intelligent
 */

import { getBaseUrl } from '@/lib/utils';

export interface EmailTemplateParams {
  greeting?: string;
  content?: string;
  ctaText?: string;
  ctaUrl?: string;
}

const BRAND_COLORS = {
  primary: '#0f172a', // Darker, more professional (Slate 900)
  primaryHover: '#1e293b',
  secondary: '#334155',
  accent: '#6366f1', // Indigo 500 for small highlights
  dark: '#0f172a',
  darkLight: '#1e293b',
  slate: '#334155',
  gray: '#64748b',
  lightGray: '#94a3b8',
  muted: '#cbd5e1',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  background: '#ffffff', // Clean white background
  pageBackground: '#f8fafc', // Light slate for page
  white: '#ffffff',
  success: '#059669', // Emerald 600
  successBg: '#ecfdf5',
  successBorder: '#a7f3d0',
  warning: '#d97706', // Amber 600
  warningBg: '#fffbeb',
  warningBorder: '#fde68a',
  danger: '#dc2626', // Red 600
  dangerBg: '#fef2f2',
  dangerBorder: '#fecaca',
  infoBg: '#f8fafc',
  infoBorder: '#e2e8f0',
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
    // Using the admin icon which is usually cleaner/darker or the main icon
    return `${getBaseUrl()}/icons/icon-128.png`;
  } catch {
    return 'https://misrad-ai.com/icons/icon-128.png';
  }
}

/**
 * Minimalist Icons (No shadows, clean colors)
 */
const EmailIcons = {
  CircleCheck: `<div style="width:48px;height:48px;border-radius:12px;background:${BRAND_COLORS.successBg};color:${BRAND_COLORS.success};margin:0 auto;line-height:48px;text-align:center;font-size:24px;border:1px solid ${BRAND_COLORS.successBorder};">✓</div>`,
  mailOpen: `<div style="width:48px;height:48px;border-radius:12px;background:#e0e7ff;color:${BRAND_COLORS.accent};margin:0 auto;line-height:48px;text-align:center;font-size:24px;border:1px solid #c7d2fe;">📩</div>`,
  userPlus: `<div style="width:48px;height:48px;border-radius:12px;background:#f3e8ff;color:#7e22ce;margin:0 auto;line-height:48px;text-align:center;font-size:24px;border:1px solid #d8b4fe;">👋</div>`,
  support: `<div style="width:48px;height:48px;border-radius:12px;background:${BRAND_COLORS.infoBg};color:${BRAND_COLORS.dark};margin:0 auto;line-height:48px;text-align:center;font-size:24px;border:1px solid ${BRAND_COLORS.border};">🛟</div>`,
  rocket: `<div style="width:48px;height:48px;border-radius:12px;background:#e0e7ff;color:${BRAND_COLORS.accent};margin:0 auto;line-height:48px;text-align:center;font-size:24px;border:1px solid #c7d2fe;">🚀</div>`,
  celebration: `<div style="width:48px;height:48px;border-radius:12px;background:${BRAND_COLORS.warningBg};color:${BRAND_COLORS.warning};margin:0 auto;line-height:48px;text-align:center;font-size:24px;border:1px solid ${BRAND_COLORS.warningBorder};">🎉</div>`,
  clock: `<div style="width:48px;height:48px;border-radius:12px;background:${BRAND_COLORS.dangerBg};color:${BRAND_COLORS.danger};margin:0 auto;line-height:48px;text-align:center;font-size:24px;border:1px solid ${BRAND_COLORS.dangerBorder};">⏰</div>`,
  heart: `<div style="width:48px;height:48px;border-radius:12px;background:#fce7f3;color:#db2777;margin:0 auto;line-height:48px;text-align:center;font-size:24px;border:1px solid #fbcfe8;">💜</div>`,
  key: `<div style="width:48px;height:48px;border-radius:12px;background:${BRAND_COLORS.warningBg};color:${BRAND_COLORS.warning};margin:0 auto;line-height:48px;text-align:center;font-size:24px;border:1px solid ${BRAND_COLORS.warningBorder};">🔑</div>`,
  shield: `<div style="width:48px;height:48px;border-radius:12px;background:${BRAND_COLORS.successBg};color:${BRAND_COLORS.success};margin:0 auto;line-height:48px;text-align:center;font-size:24px;border:1px solid ${BRAND_COLORS.successBorder};">🛡️</div>`,
};

/**
 * Email Header — Clean, Minimal, No Gradient
 */
function generateEmailHeader(options: {
  title?: string;
  subtitle?: string;
  gradient?: string; // Kept for type compatibility but ignored or used as accent
  icon?: string;
}): string {
  const title = options.title || 'MISRAD AI';
  const subtitle = options.subtitle || 'מערכת ניהול חכמה';
  const logoUrl = getLogoUrl();

  return `
    <tr>
      <td style="padding: 48px 40px 24px; text-align: center; border-bottom: 1px solid ${BRAND_COLORS.borderLight};">
        <img src="${logoUrl}" alt="MISRAD AI" width="48" height="48" style="display:block;margin:0 auto 20px;border-radius:10px;" />
        ${options.icon ? `<div style="margin: 0 auto 20px; display: inline-block;">${options.icon}</div>` : ''}
        <div style="color: ${BRAND_COLORS.dark}; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 8px;">
          ${title}
        </div>
        <div style="color: ${BRAND_COLORS.gray}; font-size: 15px; font-weight: 500;">
          ${subtitle}
        </div>
      </td>
    </tr>
  `;
}

/**
 * Email Footer — Minimal, Gray
 */
function generateEmailFooter(options?: {
  showSocialLinks?: boolean;
  additionalInfo?: string;
  unsubscribeUrl?: string;
}): string {
  const currentYear = new Date().getFullYear();
  const unsubscribeLink = options?.unsubscribeUrl || `${getBaseUrl()}/api/email/unsubscribe`;

  return `
    <tr>
      <td style="background: ${BRAND_COLORS.pageBackground}; padding: 32px 40px; text-align: center; border-top: 1px solid ${BRAND_COLORS.border};">
        
        ${options?.additionalInfo ? `
          <div style="color:${BRAND_COLORS.gray};font-size:13px;line-height:1.6;margin-bottom:20px;">
            ${options.additionalInfo}
          </div>
        ` : ''}

        <div style="margin-bottom: 16px;">
          <a href="${BRAND_LINKS.support}" style="color:${BRAND_COLORS.slate};text-decoration:none;font-size:13px;font-weight:600;">support@misrad-ai.com</a>
          <span style="color:${BRAND_COLORS.muted};margin:0 8px;">·</span>
          <a href="${BRAND_LINKS.whatsapp}" style="color:${BRAND_COLORS.slate};text-decoration:none;font-size:13px;font-weight:600;">WhatsApp</a>
        </div>
        
        <div style="margin-bottom: 16px;">
          <a href="${unsubscribeLink}" style="color:${BRAND_COLORS.lightGray};text-decoration:underline;font-size:12px;">הסרה / עדכון העדפות</a>
        </div>
        
        <div style="color:${BRAND_COLORS.lightGray};font-size:12px;">
          © ${currentYear} MISRAD AI
        </div>
      </td>
    </tr>
  `;
}

/**
 * CTA Button — Solid, No Shadow, Direct
 */
function generateCTAButton(options: {
  text: string;
  url: string;
  color?: string;
  gradient?: string; // Ignored for flat design
}): string {
  const bgColor = options.color || BRAND_COLORS.dark; // Default to dark slate for pro look

  return `
    <table role="presentation" style="width:100%;margin:32px 0;" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${options.url}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="10%" fillcolor="${bgColor}" stroke="f">
            <v:textbox inset="0,0,0,0"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${options.text}</center></v:textbox>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-->
          <a href="${options.url}" style="display:inline-block;background:${bgColor};color:#ffffff;text-decoration:none;padding:14px 48px;border-radius:8px;font-weight:600;font-size:16px;letter-spacing:0.2px;mso-hide:all;">
            ${options.text}
          </a>
          <!--<![endif]-->
        </td>
      </tr>
    </table>
  `;
}

/**
 * Secondary CTA — Outline
 */
function generateSecondaryCTA(options: {
  text: string;
  url: string;
}): string {
  return `
    <table role="presentation" style="width:100%;margin:16px 0;" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <a href="${options.url}" style="display:inline-block;background:transparent;color:${BRAND_COLORS.dark};text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:15px;border:1px solid ${BRAND_COLORS.border};">
            ${options.text}
          </a>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Info Box — Clean, bordered
 */
function generateInfoBox(options: {
  title?: string;
  content: string;
  backgroundColor?: string;
  borderColor?: string;
  icon?: string;
}): string {
  const bgColor = options.backgroundColor || BRAND_COLORS.infoBg;
  const borderColor = options.borderColor || BRAND_COLORS.border;

  return `
    <div style="margin:24px 0;background:${bgColor};border:1px solid ${borderColor};border-radius:8px;padding:20px;">
      ${options.icon ? `<div style="margin-bottom:12px;text-align:center;">${options.icon}</div>` : ''}
      ${options.title ? `
        <div style="font-size:12px;font-weight:700;color:${BRAND_COLORS.gray};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
          ${options.title}
        </div>
      ` : ''}
      <div style="font-size:15px;font-weight:400;color:${BRAND_COLORS.slate};line-height:1.6;white-space:pre-line;">
        ${options.content}
      </div>
    </div>
  `;
}

/**
 * Badge / Pill — Subtle
 */
function generateBadge(options: {
  text: string;
  color?: string;
  bgColor?: string;
}): string {
  const color = options.color || BRAND_COLORS.dark;
  const bgColor = options.bgColor || BRAND_COLORS.borderLight;
  return `<span style="display:inline-block;background:${bgColor};color:${color};padding:4px 10px;border-radius:6px;font-size:13px;font-weight:600;border:1px solid rgba(0,0,0,0.05);">${options.text}</span>`;
}

/**
 * Numbered Steps — Minimal
 */
function generateSteps(steps: Array<{ title: string; desc?: string }>): string {
  return `
    <table role="presentation" style="width:100%;margin:28px 0;border-collapse:collapse;" cellpadding="0" cellspacing="0">
      ${steps.map((step, i) => `
        <tr>
          <td style="width:32px;vertical-align:top;padding-bottom:${i < steps.length - 1 ? '20' : '0'}px;">
            <div style="width:24px;height:24px;border-radius:50%;background:${BRAND_COLORS.dark};color:#fff;font-size:13px;font-weight:700;text-align:center;line-height:24px;">
              ${i + 1}
            </div>
          </td>
          <td style="vertical-align:top;padding-bottom:${i < steps.length - 1 ? '20' : '0'}px;padding-right:16px;">
            <div style="font-size:15px;font-weight:700;color:${BRAND_COLORS.dark};line-height:24px;">${step.title}</div>
            ${step.desc ? `<div style="font-size:14px;color:${BRAND_COLORS.gray};line-height:1.5;margin-top:4px;">${step.desc}</div>` : ''}
          </td>
        </tr>
      `).join('')}
    </table>
  `;
}

/**
 * Stat Card — Minimal
 */
function generateStatCard(options: {
  value?: string;
  label?: string;
  color?: string;
  items?: Array<{ label: string; value: string; color?: string }>;
}): string {
  if (options.items && options.items.length > 0) {
    const cells = options.items.map((item) => {
      const c = item.color || BRAND_COLORS.dark;
      return `
        <td style="text-align:center;padding:16px 12px;background:${BRAND_COLORS.pageBackground};border-radius:8px;border:1px solid ${BRAND_COLORS.border};">
          <div style="font-size:20px;font-weight:800;color:${c};">${item.value}</div>
          <div style="font-size:12px;font-weight:500;color:${BRAND_COLORS.gray};margin-top:4px;">${item.label}</div>
        </td>
      `;
    }).join('<td style="width:8px;"></td>');
    return `
      <table role="presentation" style="width:100%;margin:24px 0;" cellpadding="0" cellspacing="0">
        <tr>${cells}</tr>
      </table>
    `;
  }
  const color = options.color || BRAND_COLORS.dark;
  return `
    <div style="display:inline-block;text-align:center;padding:16px 24px;background:${BRAND_COLORS.pageBackground};border-radius:8px;border:1px solid ${BRAND_COLORS.border};margin:4px;">
      <div style="font-size:24px;font-weight:800;color:${color};">${options.value || ''}</div>
      <div style="font-size:12px;font-weight:500;color:${BRAND_COLORS.gray};margin-top:4px;">${options.label || ''}</div>
    </div>
  `;
}

/**
 * Horizontal Divider
 */
function generateDivider(): string {
  return `<div style="height:1px;background:${BRAND_COLORS.border};margin:32px 0;"></div>`;
}

/**
 * Callout Box — Clean
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
    <div style="margin:24px 0;padding:20px;background:${options.bgColor || BRAND_COLORS.warningBg};border-radius:8px;border:1px solid ${options.borderColor || BRAND_COLORS.warningBorder};">
      <div style="font-size:14px;font-weight:700;color:${options.titleColor || '#92400e'};margin-bottom:6px;display:flex;align-items:center;">
        <span style="margin-left:8px;">${options.emoji}</span> ${options.title}
      </div>
      <div style="font-size:14px;color:${options.textColor || '#92400e'};line-height:1.6;">
        ${options.text}
      </div>
    </div>
  `;
}

/**
 * Base Email Template Wrapper — Professional, No Shadow Container
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
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:${BRAND_COLORS.pageBackground};color:${BRAND_COLORS.dark};direction:rtl;-webkit-font-smoothing:antialiased;">
    <table role="presentation" style="width:100%;border-collapse:collapse;background-color:${BRAND_COLORS.pageBackground};" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" style="max-width:600px;width:100%;background-color:#ffffff;border:1px solid ${BRAND_COLORS.border};border-radius:12px;overflow:hidden;" cellpadding="0" cellspacing="0">
          ${generateEmailHeader({
            title: options.headerTitle,
            subtitle: options.headerSubtitle,
            gradient: options.headerGradient,
            icon: options.headerIcon,
          })}

          <tr>
            <td style="padding:40px 40px;">
              ${options.bodyContent}
            </td>
          </tr>

          ${generateEmailFooter({
            showSocialLinks: options.showSocialLinks,
            additionalInfo: options.footerAdditionalInfo,
          })}
        </table>
        
        <div style="max-width:600px;margin:24px auto 0;text-align:center;">
           <div style="font-size:11px;color:${BRAND_COLORS.lightGray};">
             MISRAD AI - מערכת ניהול חכמה
           </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Hero Image — Clean border
 */
function generateHeroImage(options: {
  src: string;
  alt: string;
  href?: string;
  borderRadius?: string;
  caption?: string;
}): string {
  const radius = options.borderRadius || '8px';
  const img = `<img src="${options.src}" alt="${options.alt}" style="display:block;width:100%;max-width:520px;margin:0 auto;border-radius:${radius};border:1px solid ${BRAND_COLORS.border};" />`;
  const wrapped = options.href ? `<a href="${options.href}" style="text-decoration:none;">${img}</a>` : img;

  return `
    <div style="margin:28px 0;text-align:center;">
      ${wrapped}
      ${options.caption ? `<div style="font-size:12px;color:${BRAND_COLORS.gray};margin-top:12px;">${options.caption}</div>` : ''}
    </div>
  `;
}

/**
 * Screenshot Mockup
 */
function generateScreenshot(options: {
  src: string;
  alt: string;
  title?: string;
  href?: string;
}): string {
  const img = `<img src="${options.src}" alt="${options.alt}" style="display:block;width:100%;border-radius:0 0 8px 8px;" />`;
  const wrapped = options.href ? `<a href="${options.href}" style="text-decoration:none;">${img}</a>` : img;

  return `
    <div style="margin:24px 0;border-radius:8px;border:1px solid ${BRAND_COLORS.border};overflow:hidden;background:${BRAND_COLORS.white};">
      <div style="background:${BRAND_COLORS.pageBackground};padding:10px 16px;display:flex;align-items:center;gap:6px;border-bottom:1px solid ${BRAND_COLORS.border};">
        <span style="width:10px;height:10px;border-radius:50%;background:#e2e8f0;display:inline-block;"></span>
        <span style="width:10px;height:10px;border-radius:50%;background:#e2e8f0;display:inline-block;"></span>
        <span style="width:10px;height:10px;border-radius:50%;background:#e2e8f0;display:inline-block;"></span>
        ${options.title ? `<span style="color:${BRAND_COLORS.gray};font-size:11px;margin-right:auto;font-weight:600;">${options.title}</span>` : ''}
      </div>
      ${wrapped}
    </div>
  `;
}

/**
 * Video Thumbnail
 */
function generateVideoThumbnail(options: {
  thumbnailSrc: string;
  videoUrl: string;
  alt?: string;
  caption?: string;
}): string {
  return `
    <div style="margin:28px 0;text-align:center;">
      <a href="${options.videoUrl}" style="text-decoration:none;display:inline-block;position:relative;">
        <img src="${options.thumbnailSrc}" alt="${options.alt || 'צפייה בסרטון'}" style="display:block;width:100%;max-width:520px;border-radius:8px;border:1px solid ${BRAND_COLORS.border};" />
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:56px;height:56px;border-radius:50%;background:${BRAND_COLORS.dark};text-align:center;line-height:56px;">
          <span style="display:inline-block;width:0;height:0;border-style:solid;border-width:10px 0 10px 18px;border-color:transparent transparent transparent #ffffff;margin-right:-2px;margin-top:2px;"></span>
        </div>
      </a>
      ${options.caption ? `<div style="font-size:12px;color:${BRAND_COLORS.gray};margin-top:12px;">${options.caption}</div>` : ''}
    </div>
  `;
}

/**
 * Founder Card — Personal, Clean
 */
function generateFounderCard(options: {
  photoUrl: string;
  name: string;
  title: string;
  message: string;
  signatureText?: string;
}): string {
  return `
    <div style="margin:32px 0;padding:24px;background:${BRAND_COLORS.pageBackground};border-radius:12px;border:1px solid ${BRAND_COLORS.border};">
      <div style="display:flex;align-items:start;gap:16px;">
         <img src="${options.photoUrl}" alt="${options.name}" width="56" height="56" style="border-radius:50%;border:1px solid ${BRAND_COLORS.border};display:block;flex-shrink:0;" />
         <div>
            <div style="font-size:15px;color:${BRAND_COLORS.slate};line-height:1.7;margin-bottom:12px;">
              ${options.message}
            </div>
            <div>
               <div style="font-size:14px;font-weight:700;color:${BRAND_COLORS.dark};">${options.name}</div>
               <div style="font-size:12px;color:${BRAND_COLORS.gray};">${options.title}</div>
            </div>
         </div>
      </div>
    </div>
  `;
}

/**
 * Testimonial Quote
 */
function generateTestimonial(options: {
  quote: string;
  authorName: string;
  authorTitle?: string;
  authorPhotoUrl?: string;
}): string {
  return `
    <div style="margin:24px 0;padding:24px;background:${BRAND_COLORS.infoBg};border-radius:8px;border-right:3px solid ${BRAND_COLORS.dark};">
      <div style="font-size:16px;color:${BRAND_COLORS.slate};line-height:1.7;font-style:italic;margin-bottom:16px;">
        "${options.quote}"
      </div>
      <div style="font-size:13px;font-weight:700;color:${BRAND_COLORS.dark};">${options.authorName}</div>
      ${options.authorTitle ? `<div style="font-size:12px;color:${BRAND_COLORS.gray};">${options.authorTitle}</div>` : ''}
    </div>
  `;
}

/**
 * Feature Banner — Clean, bordered, no heavy gradient
 */
function generateFeatureBanner(options: {
  emoji: string;
  title: string;
  subtitle?: string;
  gradient?: string; // Ignored for flat design
}): string {
  return `
    <div style="margin:24px 0;padding:24px;background:${BRAND_COLORS.infoBg};border:1px solid ${BRAND_COLORS.border};border-radius:12px;text-align:center;">
      <div style="font-size:32px;margin-bottom:12px;">${options.emoji}</div>
      <div style="font-size:18px;font-weight:700;color:${BRAND_COLORS.dark};margin-bottom:4px;">${options.title}</div>
      ${options.subtitle ? `<div style="font-size:14px;color:${BRAND_COLORS.gray};font-weight:400;">${options.subtitle}</div>` : ''}
    </div>
  `;
}

/**
 * Image Row
 */
function generateImageRow(options: {
  images: Array<{ src: string; alt: string; caption?: string; href?: string }>;
}): string {
  const width = options.images.length <= 2 ? '48%' : '31%';
  const cells = options.images.map((img) => {
    const imgTag = `<img src="${img.src}" alt="${img.alt}" style="display:block;width:100%;border-radius:8px;border:1px solid ${BRAND_COLORS.border};" />`;
    const wrapped = img.href ? `<a href="${img.href}" style="text-decoration:none;">${imgTag}</a>` : imgTag;
    return `
      <td style="width:${width};vertical-align:top;padding:0 4px;">
        ${wrapped}
        ${img.caption ? `<div style="font-size:11px;color:${BRAND_COLORS.gray};text-align:center;margin-top:6px;font-weight:500;">${img.caption}</div>` : ''}
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
