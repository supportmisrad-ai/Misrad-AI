import { 
  Megaphone, 
  Target, 
  CreditCard, 
  BrainCircuit, 
  GraduationCap 
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export type OSModule = 'social' | 'system' | 'finance' | 'nexus' | 'client';

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

export const OS_MODULES: OSModuleInfo[] = [
  {
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
  {
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
  {
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
  {
    id: 'nexus',
    name: 'Nexus',
    nameHebrew: 'מרכז הבקרה',
    icon: BrainCircuit,
    color: 'text-indigo-600',
    gradient: 'from-indigo-500 to-purple-600',
    description: 'משימות יומן צוות',
    purchased: true, // Currently exists
    route: '/w/[orgSlug]/nexus'
  },
  {
    id: 'client',
    name: 'Client',
    nameHebrew: 'פורטל הצלחת לקוח',
    icon: GraduationCap,
    color: 'text-amber-600',
    gradient: 'from-amber-500 to-orange-600',
    description: 'לקוחות תמלול תובנות',
    purchased: true, // Ready for use
    route: '/w/[orgSlug]/client'
  }
];

export const getOSModule = (id: OSModule): OSModuleInfo | undefined => {
  return OS_MODULES.find(m => m.id === id);
};

export const getPurchasedModules = (): OSModuleInfo[] => {
  return OS_MODULES.filter(m => m.purchased);
};

