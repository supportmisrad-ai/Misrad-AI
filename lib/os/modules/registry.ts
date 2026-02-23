import { OSModuleDefinition, OSModuleKey } from './types';
import { encodeWorkspaceOrgSlug } from '@/lib/os/social-routing';

export const modulesRegistry: Record<OSModuleKey, OSModuleDefinition> = {
  nexus: {
    key: 'nexus',
    label: 'Nexus',
    labelHe: 'ניהול, משימות וצוות',
    theme: { accent: '#3730A3', background: '#F8FAFC', gradient: 'from-indigo-500 to-purple-600' },
    iconName: '/icons/nexus-icon.svg',
  },
  system: {
    key: 'system',
    label: 'System',
    labelHe: 'מכירות',
    theme: { accent: '#7C3AED', background: '#F8FAFC', gradient: 'from-violet-600 to-purple-700' },
    iconName: '/icons/system-icon.svg',
  },
  social: {
    key: 'social',
    label: 'Social',
    labelHe: 'שיווק',
    theme: { accent: '#7C3AED', background: '#F8FAFC', gradient: 'from-indigo-600 via-purple-600 to-pink-600' },
    iconName: '/icons/social-icon.svg',
  },
  finance: {
    key: 'finance',
    label: 'Finance',
    labelHe: 'כספים',
    theme: { accent: '#059669', background: '#F8FAFC', gradient: 'from-emerald-500 to-teal-600' },
    iconName: '/icons/finance-icon.svg',
  },
  client: {
    key: 'client',
    label: 'Client',
    labelHe: 'מעקב לקוחות ומתאמנים',
    theme: { accent: '#C5A572', background: '#F5F5F7', gradient: 'from-[#EAD7A1] via-[#C5A572] to-[#B45309]' },
    iconName: '/icons/client-icon.svg',
  },
  operations: {
    key: 'operations',
    label: 'Operations',
    labelHe: 'תפעול',
    theme: { accent: '#0EA5E9', background: '#F8FAFC', gradient: 'from-sky-500 to-cyan-600' },
    iconName: '/icons/operations-icon.svg',
  },
};

export const ALL_OS_MODULE_KEYS = Object.keys(modulesRegistry) as OSModuleKey[];

export function isOSModuleKey(value: unknown): value is OSModuleKey {
  return typeof value === 'string' && (ALL_OS_MODULE_KEYS as string[]).includes(value);
}

export const DEFAULT_OS_MODULE_PRIORITY: OSModuleKey[] = [
  'nexus',
  ...ALL_OS_MODULE_KEYS.filter((m) => m !== 'nexus'),
];

export function buildWorkspaceModulePath(orgSlug: string, module: OSModuleKey): string {
  return `/w/${encodeWorkspaceOrgSlug(orgSlug)}/${module}`;
}

export function getModuleDefinition(module: OSModuleKey): OSModuleDefinition {
  return modulesRegistry[module];
}

export function getModuleLabel(module: OSModuleKey): string {
  return getModuleDefinition(module)?.label ?? String(module);
}

export function getModuleLabelHe(module: OSModuleKey): string {
  return getModuleDefinition(module)?.labelHe ?? getModuleLabel(module);
}
