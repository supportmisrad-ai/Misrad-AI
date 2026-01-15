/**
 * Dynamic Metadata Helper
 * 
 * Provides metadata and icons for different systems (Nexus, System, Scale)
 */

import type { Metadata } from 'next';

export type SystemType = 'misrad' | 'nexus' | 'system' | 'social' | 'client' | 'finance' | 'scale' | 'default';

interface SystemMetadata {
  title: string;
  description: string;
  icon: string;
  appleIcon: string;
  manifest: string;
  themeColor: string;
}

const systemConfigs: Record<SystemType, SystemMetadata> = {
  misrad: {
    title: 'Misrad OS - מערכת צמיחה',
    description: 'מערכת הפעלה אחת לניהול העסק שלך',
    icon: '/icons/misrad-icon.svg',
    appleIcon: '/icons/misrad-icon.svg',
    manifest: '/manifest.json',
    themeColor: '#0F172A',
  },
  client: {
    title: 'פורטל הצלחת לקוח',
    description: 'מערכת לניהול הצלחת לקוח',
    icon: '/icons/misrad-icon.svg',
    appleIcon: '/icons/misrad-icon.svg',
    manifest: '/manifest.json',
    themeColor: '#D97706',
  },
  finance: {
    title: 'שומר הרווחים',
    description: 'חשבוניות תשלומים דוחות',
    icon: '/icons/finance-icon.svg',
    appleIcon: '/icons/finance-icon.svg',
    manifest: '/manifest.json',
    themeColor: '#059669',
  },
  social: {
    title: 'שיווק שמייצר סמכות',
    description: 'מערכת שיווק וקמפיינים',
    icon: '/icons/social-icon.svg',
    appleIcon: '/icons/social-icon.svg',
    manifest: '/manifest.json',
    themeColor: '#3B82F6',
  },
  nexus: {
    title: 'מרכז הבקרה',
    description: 'מערכת ניהול צוותים ומשימות מתקדמת',
    icon: '/icons/nexus-icon.svg',
    appleIcon: '/icons/nexus-icon.svg',
    manifest: '/manifests/nexus-manifest.json',
    themeColor: '#3730A3',
  },
  system: {
    title: 'מכונת המכירות',
    description: 'מערכת ניהול לידים ומכירות',
    icon: '/icons/system-icon.svg',
    appleIcon: '/icons/system-icon.svg',
    manifest: '/manifests/system-manifest.json',
    themeColor: '#A21D3C',
  },
  scale: {
    title: 'Scale CRM',
    description: 'פלטפורמת CRM מתקדמת לעסקים',
    icon: '/icons/scale-icon.svg',
    appleIcon: '/icons/scale-icon.svg',
    manifest: '/manifests/scale-manifest.json',
    themeColor: '#059669',
  },
  default: {
    title: 'Misrad OS - מערכת צמיחה',
    description: 'מערכת הפעלה אחת לניהול העסק שלך',
    icon: '/icons/misrad-icon.svg',
    appleIcon: '/icons/misrad-icon.svg',
    manifest: '/manifest.json',
    themeColor: '#0F172A',
  },
};

export const OS_METADATA = {
  nexus: {
    title: systemConfigs.nexus.title,
    icon: systemConfigs.nexus.icon,
  },
  system: {
    title: systemConfigs.system.title,
    icon: systemConfigs.system.icon,
  },
  social: {
    title: systemConfigs.social.title,
    icon: systemConfigs.social.icon,
  },
  finance: {
    title: 'שומר הרווחים',
    icon: '/icons/finance-icon.svg',
  },
  client: {
    title: 'פורטל הצלחת לקוח',
    icon: systemConfigs.misrad.icon,
  },
} as const;

export function getSystemMetadata(system: SystemType = 'misrad'): Metadata {
  const config = systemConfigs[system];
  
  return {
    title: config.title,
    description: config.description,
    manifest: config.manifest,
    icons: {
      icon: [
        { url: config.icon, type: 'image/svg+xml' },
      ],
      apple: config.appleIcon,
      shortcut: config.icon,
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: config.title,
    },
    other: {
      'mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'default',
    },
  };
}

export function getThemeColor(system: SystemType = 'misrad'): string {
  return systemConfigs[system].themeColor;
}

