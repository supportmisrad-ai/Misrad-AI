/**
 * Dynamic Metadata Helper
 * 
 * Provides metadata and icons for different systems (Nexus, System, Scale)
 */

import type { Metadata } from 'next';

export type SystemType =
  | 'misrad'
  | 'nexus'
  | 'system'
  | 'social'
  | 'client'
  | 'finance'
  | 'operations'
  | 'admin'
  | 'scale'
  | 'default';

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
    title: 'MISRAD AI',
    description: 'מערכת הפעלה אחת לניהול העסק שלך',
    icon: '/icons/misrad-icon.svg',
    appleIcon: '/icons/misrad-icon-192.png',
    manifest: '/manifest.json',
    themeColor: '#0F172A',
  },
  client: {
    title: 'מעקב לקוחות ומתאמנים',
    description: 'מערכת למעקב לקוחות ומתאמנים',
    icon: '/icons/client-icon.svg',
    appleIcon: '/icons/client-icon-192.png',
    manifest: '/manifest.json',
    themeColor: '#0F172A',
  },
  finance: {
    title: 'שליטה פיננסית מלאה',
    description: 'חשבוניות תשלומים דוחות',
    icon: '/icons/finance-icon.svg',
    appleIcon: '/icons/finance-icon-192.png',
    manifest: '/manifest.json',
    themeColor: '#059669',
  },
  operations: {
    title: 'תפעול',
    description: 'ניהול פרויקטים ותפעול שטח',
    icon: '/icons/operations-icon.svg',
    appleIcon: '/icons/operations-icon-192.png',
    manifest: '/manifest.json',
    themeColor: '#0EA5E9',
  },
  admin: {
    title: 'MISRAD AI - Admin',
    description: 'פאנל אדמין',
    icon: '/icons/admin-icon.svg',
    appleIcon: '/icons/admin-icon-192.png',
    manifest: '/manifest.json',
    themeColor: '#0F172A',
  },
  social: {
    title: 'שיווק, תוכן וקמפיינים',
    description: 'מערכת שיווק וקמפיינים',
    icon: '/icons/social-icon.svg',
    appleIcon: '/icons/social-icon-192.png',
    manifest: '/manifest.json',
    themeColor: '#7C3AED',
  },
  nexus: {
    title: 'ניהול, משימות וצוות',
    description: 'מערכת ניהול צוותים ומשימות מתקדמת',
    icon: '/icons/nexus-icon.svg',
    appleIcon: '/icons/nexus-icon-192.png',
    manifest: '/manifests/nexus-manifest.json',
    themeColor: '#3730A3',
  },
  system: {
    title: 'מרכז המכירות והלידים',
    description: 'מערכת ניהול לידים ומכירות',
    icon: '/icons/system-icon.svg',
    appleIcon: '/icons/system-icon-192.png',
    manifest: '/manifests/system-manifest.json',
    themeColor: '#A21D3C',
  },
  scale: {
    title: 'MISRAD AI',
    description: 'פלטפורמת MISRAD AI לעסקים',
    icon: '/icons/scale-icon.svg',
    appleIcon: '/icons/scale-icon-192.png',
    manifest: '/manifests/scale-manifest.json',
    themeColor: '#059669',
  },
  default: {
    title: 'MISRAD AI',
    description: 'מערכת הפעלה אחת לניהול העסק שלך',
    icon: '/icons/misrad-icon.svg',
    appleIcon: '/icons/misrad-icon-192.png',
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
    title: systemConfigs.finance.title,
    icon: systemConfigs.finance.icon,
  },
  client: {
    title: systemConfigs.client.title,
    icon: systemConfigs.client.icon,
  },
  operations: {
    title: systemConfigs.operations.title,
    icon: systemConfigs.operations.icon,
  },
} as const;

export function getSystemIconUrl(system: SystemType = 'misrad'): string {
  const config = systemConfigs[system];
  return `${config.icon}?v=${system}`;
}

export function getSystemAppleIconUrl(system: SystemType = 'misrad'): string {
  const config = systemConfigs[system];
  return `${config.appleIcon}?v=${system}`;
}

export function getSystemMetadata(system: SystemType = 'misrad'): Metadata {
  const config = systemConfigs[system];
  const iconUrl = getSystemIconUrl(system);
  const appleIconUrl = getSystemAppleIconUrl(system);
  
  return {
    title: config.title,
    description: config.description,
    manifest: config.manifest,
    icons: {
      icon: iconUrl,
      apple: appleIconUrl,
      shortcut: iconUrl,
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: config.title,
    },
    other: {
      'mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'default',
      'theme-color': config.themeColor,
    },
  };
}

export function getThemeColor(system: SystemType = 'misrad'): string {
  return systemConfigs[system].themeColor;
}

