import type { OSModuleKey } from '../lib/os/modules/types';

export type OSModule = OSModuleKey;

export interface OSModuleInfo {
  id: OSModule;
  name: string;
  nameHebrew: string;
  iconName: string;
  color: string;
  gradient: string;
  description: string;
  purchased: boolean;
  route: string;
}

const OS_MODULES_BY_ID: Record<OSModule, OSModuleInfo> = {
  social: {
    id: 'social',
    name: 'Social',
    nameHebrew: 'שיווק, תוכן וקמפיינים',
    iconName: 'Megaphone',
    color: 'text-purple-600',
    gradient: 'from-indigo-600 via-purple-600 to-pink-600',
    description: 'שיווק קמפיינים תוכן',
    purchased: true, // Ready for integration
    route: '/w/[orgSlug]/social'
  },
  system: {
    id: 'system',
    name: 'System',
    nameHebrew: 'מרכז המכירות והלידים',
    iconName: 'Target',
    color: 'text-rose-600',
    gradient: 'from-rose-500 to-pink-600',
    description: 'לידים מכירות טלפוניה',
    purchased: true, // Currently exists
    route: '/w/[orgSlug]/system'
  },
  finance: {
    id: 'finance',
    name: 'Finance',
    nameHebrew: 'שליטה פיננסית מלאה',
    iconName: 'Banknote',
    color: 'text-emerald-600',
    gradient: 'from-emerald-500 to-teal-600',
    description: 'חשבוניות תשלומים דוחות',
    purchased: false, // Ready for use
    route: '/w/[orgSlug]/finance'
  },
  nexus: {
    id: 'nexus',
    name: 'Nexus',
    nameHebrew: 'ניהול, משימות וצוות',
    iconName: 'BrainCircuit',
    color: 'text-indigo-600',
    gradient: 'from-indigo-500 to-purple-600',
    description: 'משימות ואירועים צוות',
    purchased: true, // Currently exists
    route: '/w/[orgSlug]/nexus'
  },
  client: {
    id: 'client',
    name: 'Client',
    nameHebrew: 'מעקב לקוחות ומתאמנים',
    iconName: 'GraduationCap',
    color: 'text-[#C5A572]',
    gradient: 'from-[#0F172A] to-[#334155]',
    description: 'לקוחות תמלול תובנות',
    purchased: true, // Ready for use
    route: '/w/[orgSlug]/client'
  },
  operations: {
    id: 'operations',
    name: 'Operations',
    nameHebrew: 'תפעול, מלאי ושטח',
    iconName: 'Wrench',
    color: 'text-sky-600',
    gradient: 'from-sky-500 to-cyan-600',
    description: 'פרויקטים פקודות עבודה מלאי',
    purchased: true,
    route: '/w/[orgSlug]/operations'
  }
};

export const OS_MODULES: OSModuleInfo[] = Object.values(OS_MODULES_BY_ID);

export const getOSModule = (id: OSModule): OSModuleInfo | undefined => {
  return OS_MODULES_BY_ID[id];
};

export const getPurchasedModules = (): OSModuleInfo[] => {
  return OS_MODULES.filter(m => m.purchased);
};

