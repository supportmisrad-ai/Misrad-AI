import React from 'react';

// ═══════════════════════════════════════════════════════════
// Professional SVG Icon System — replaces all emojis
// Each icon is a clean geometric SVG with glow + depth
// ═══════════════════════════════════════════════════════════

interface IconProps {
  size?: number;
  color?: string;
  glowColor?: string;
  style?: React.CSSProperties;
}

const IconWrap: React.FC<IconProps & { children: React.ReactNode }> = ({
  size = 24, color = '#fff', glowColor, style, children,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      filter: glowColor ? `drop-shadow(0 0 6px ${glowColor})` : undefined,
      flexShrink: 0,
      ...style,
    }}
  >
    {children}
  </svg>
);

// ── System / CRM ──
export const IconTarget: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></IconWrap>
);

export const IconUsers: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></IconWrap>
);

export const IconPhone: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></IconWrap>
);

export const IconMail: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></IconWrap>
);

export const IconBrain: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" /><line x1="9" y1="22" x2="15" y2="22" /><line x1="10" y1="2" x2="10" y2="5" /><line x1="14" y1="2" x2="14" y2="5" /></IconWrap>
);

export const IconZap: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></IconWrap>
);

export const IconChart: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" /></IconWrap>
);

export const IconDollar: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></IconWrap>
);

export const IconShield: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></IconWrap>
);

export const IconLock: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></IconWrap>
);

export const IconGlobe: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></IconWrap>
);

export const IconCalendar: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></IconWrap>
);

export const IconClock: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></IconWrap>
);

export const IconStar: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></IconWrap>
);

export const IconHeart: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></IconWrap>
);

export const IconTrendingUp: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></IconWrap>
);

export const IconTrendingDown: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" /></IconWrap>
);

export const IconSend: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></IconWrap>
);

export const IconMessageCircle: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></IconWrap>
);

export const IconSettings: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></IconWrap>
);

export const IconRefresh: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></IconWrap>
);

export const IconPackage: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><line x1="16.5" y1="9.4" x2="7.5" y2="4.21" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></IconWrap>
);

export const IconMap: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></IconWrap>
);

export const IconClipboard: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></IconWrap>
);

export const IconKey: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></IconWrap>
);

export const IconFingerprint: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><path d="M12 10a2 2 0 0 0-2 2c0 1.02.1 2.017.292 3" /><path d="M14 12.236a7 7 0 0 1-10.468 4.753" /><path d="M17.414 8.586A6.97 6.97 0 0 0 12 6a6.97 6.97 0 0 0-5 2.1" /><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74" /><path d="M12 18a10 10 0 0 0 3-7.5" /></IconWrap>
);

export const IconPalette: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><circle cx="13.5" cy="6.5" r="0.5" fill={p.color || '#fff'} /><circle cx="17.5" cy="10.5" r="0.5" fill={p.color || '#fff'} /><circle cx="8.5" cy="7.5" r="0.5" fill={p.color || '#fff'} /><circle cx="6.5" cy="12.5" r="0.5" fill={p.color || '#fff'} /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" /></IconWrap>
);

export const IconLink: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></IconWrap>
);

export const IconLayers: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></IconWrap>
);

export const IconAward: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></IconWrap>
);

export const IconRocket: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></IconWrap>
);

export const IconEye: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></IconWrap>
);

export const IconCrystalBall: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><circle cx="12" cy="11" r="8" /><path d="M7 21h10" /><path d="M9 21v-2" /><path d="M15 21v-2" /><path d="M8 7l4 4 4-4" /></IconWrap>
);

export const IconBell: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></IconWrap>
);

export const IconBellOff: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><path d="M13.73 21a2 2 0 0 1-3.46 0" /><path d="M18.63 13A17.89 17.89 0 0 1 18 8" /><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" /><path d="M18 8a6 6 0 0 0-9.33-5" /><line x1="1" y1="1" x2="23" y2="23" /></IconWrap>
);

export const IconSunrise: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><path d="M17 18a5 5 0 0 0-10 0" /><line x1="12" y1="9" x2="12" y2="2" /><line x1="4.22" y1="10.22" x2="5.64" y2="11.64" /><line x1="1" y1="18" x2="3" y2="18" /><line x1="21" y1="18" x2="23" y2="18" /><line x1="18.36" y1="11.64" x2="19.78" y2="10.22" /><line x1="23" y1="22" x2="1" y2="22" /><polyline points="16 5 12 9 8 5" /></IconWrap>
);

export const IconMoon: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></IconWrap>
);

export const IconSun: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></IconWrap>
);

export const IconHandshake: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z" /></IconWrap>
);

export const IconPieChart: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></IconWrap>
);

export const IconDatabase: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></IconWrap>
);

export const IconActivity: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></IconWrap>
);

export const IconBookOpen: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></IconWrap>
);

export const IconGraduationCap: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 6 3 6 3s3 0 6-3v-5" /></IconWrap>
);

export const IconPause: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></IconWrap>
);

export const IconPlay: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><polygon points="5 3 19 12 5 21 5 3" /></IconWrap>
);

export const IconInbox: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></IconWrap>
);

export const IconCheck: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><polyline points="20 6 9 17 4 12" /></IconWrap>
);

export const IconX: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></IconWrap>
);

export const IconBuilding: React.FC<IconProps> = (p) => (
  <IconWrap {...p}><rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><line x1="9" y1="6" x2="9.01" y2="6" /><line x1="15" y1="6" x2="15.01" y2="6" /><line x1="9" y1="10" x2="9.01" y2="10" /><line x1="15" y1="10" x2="15.01" y2="10" /><line x1="9" y1="14" x2="9.01" y2="14" /><line x1="15" y1="14" x2="15.01" y2="14" /><line x1="9" y1="18" x2="15" y2="18" /></IconWrap>
);

export const IconShabbat: React.FC<IconProps> = (p) => (
  <IconWrap {...p}>
    <path d="M12 2v2" />
    <path d="M12 4c-.5 0-1 .5-1 1v1h2V5c0-.5-.5-1-1-1z" fill={p.color || '#fff'} fillOpacity={0.3} />
    <ellipse cx="12" cy="3" rx="1.5" ry="2" fill={p.color || '#fff'} fillOpacity={0.15} />
    <rect x="6" y="8" width="12" height="3" rx="1.5" fill={p.color || '#fff'} fillOpacity={0.15} />
    <path d="M7 11v8a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-8" />
    <line x1="10" y1="14" x2="14" y2="14" />
  </IconWrap>
);

// ── Dimensional Icon Container ──
// Renders an icon inside a glowing, dimensional container
export const DimIcon: React.FC<{
  icon: React.FC<IconProps>;
  color: string;
  size?: number;
  iconSize?: number;
}> = ({ icon: Icon, color, size = 48, iconSize = 24 }) => (
  <div style={{
    width: size,
    height: size,
    borderRadius: size * 0.3,
    background: `linear-gradient(135deg, ${color}18 0%, ${color}08 100%)`,
    border: `1.5px solid ${color}30`,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    boxShadow: `0 4px 16px ${color}15, inset 0 1px 0 ${color}10`,
  }}>
    <Icon size={iconSize} color={color} glowColor={`${color}40`} />
  </div>
);

// ── Mapping: emoji string → icon component ──
export const ICON_MAP: Record<string, React.FC<IconProps>> = {
  '🎯': IconTarget,
  '👥': IconUsers,
  '📱': IconPhone,
  '📧': IconMail,
  '✉️': IconMail,
  '🧠': IconBrain,
  '⚡': IconZap,
  '📊': IconChart,
  '📈': IconTrendingUp,
  '📉': IconTrendingDown,
  '💰': IconDollar,
  '💸': IconDollar,
  '🛡️': IconShield,
  '🔒': IconLock,
  '🔐': IconLock,
  '🌐': IconGlobe,
  '📅': IconCalendar,
  '⏰': IconClock,
  '⭐': IconStar,
  '❤️': IconHeart,
  '💚': IconHeart,
  '✍️': IconSend,
  '💬': IconMessageCircle,
  '⚙️': IconSettings,
  '🔄': IconRefresh,
  '📦': IconPackage,
  '🗺️': IconMap,
  '📋': IconClipboard,
  '🔑': IconKey,
  '👆': IconFingerprint,
  '🎨': IconPalette,
  '🔗': IconLink,
  '📚': IconBookOpen,
  '🎓': IconGraduationCap,
  '🧑‍💼': IconUsers,
  '🏫': IconBuilding,
  '🚀': IconRocket,
  '👁️': IconEye,
  '🔮': IconCrystalBall,
  '🔔': IconBell,
  '🔕': IconBellOff,
  '🌅': IconSunrise,
  '🌙': IconMoon,
  '☀️': IconSun,
  '🤝': IconHandshake,
  '🤖': IconSettings,
  '💡': IconZap,
  '🏢': IconBuilding,
  '🕎': IconShabbat,
  '🕯️': IconShabbat,
  '⏸️': IconPause,
  '📥': IconInbox,
  '🎉': IconCheck,
  '✨': IconStar,
  '📞': IconPhone,
  '🎯': IconTarget,
  '📱': IconPhone,
};
