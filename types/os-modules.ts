import { 
  Megaphone, 
  Target, 
  CreditCard, 
  BrainCircuit, 
  GraduationCap,
  Wrench
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

import type { OSModuleKey } from '../lib/os/modules/types';

export type OSModule = OSModuleKey;

export interface OSModuleInfo {
  id: OSModule;
  name: string;
  nameHebrew: string;
  icon: LucideIcon;
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
    nameHebrew: 'שיווק שמייצר סמכות',
    icon: Megaphone,
    color: 'text-blue-600',
    gradient: 'from-blue-500 to-cyan-600',
    description: 'שיווק קמפיינים תוכן',
    purchased: true, // Ready for integration
    route: '/w/[orgSlug]/social'
  },
  system: {
    id: 'system',
    name: 'System',
    nameHebrew: 'מכונת המכירות',
    icon: Target,
    color: 'text-rose-600',
    gradient: 'from-rose-500 to-pink-600',
    description: 'לידים מכירות טלפוניה',
    purchased: true, // Currently exists
    route: '/w/[orgSlug]/system'
  },
  finance: {
    id: 'finance',
    name: 'Finance',
    nameHebrew: 'שומר הרווחים',
    icon: CreditCard,
    color: 'text-emerald-600',
    gradient: 'from-emerald-500 to-teal-600',
    description: 'חשבוניות תשלומים דוחות',
    purchased: false, // Ready for use
    route: '/w/[orgSlug]/finance'
  },
  nexus: {
    id: 'nexus',
    name: 'Nexus',
    nameHebrew: 'מרכז הבקרה',
    icon: BrainCircuit,
    color: 'text-indigo-600',
    gradient: 'from-indigo-500 to-purple-600',
    description: 'משימות ואירועים צוות',
    purchased: true, // Currently exists
    route: '/w/[orgSlug]/nexus'
  },
  client: {
    id: 'client',
    name: 'Client',
    nameHebrew: 'פורטל הצלחת לקוח',
    icon: GraduationCap,
    color: 'text-amber-600',
    gradient: 'from-amber-500 to-orange-600',
    description: 'לקוחות תמלול תובנות',
    purchased: true, // Ready for use
    route: '/w/[orgSlug]/client'
  },
  operations: {
    id: 'operations',
    name: 'Operations',
    nameHebrew: 'תפעול ושטח',
    icon: Wrench,
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

