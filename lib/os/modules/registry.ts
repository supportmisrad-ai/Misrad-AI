import { OSModuleDefinition, OSModuleKey } from './types';

export const modulesRegistry: Record<OSModuleKey, OSModuleDefinition> = {
  nexus: {
    key: 'nexus',
    label: 'Nexus',
    labelHe: 'ניהול, משימות וצוות',
    theme: { accent: '#3730A3', background: '#F8FAFC' },
    iconName: 'BrainCircuit',
  },
  system: {
    key: 'system',
    label: 'System',
    labelHe: 'מרכז המכירות והלידים',
    theme: { accent: '#3730A3', background: '#FFFFFF' },
    iconName: 'Target',
  },
  social: {
    key: 'social',
    label: 'Social',
    labelHe: 'שיווק, תוכן וקמפיינים',
    theme: { accent: '#7C3AED', background: '#F8FAFC' },
    iconName: 'Megaphone',
  },
  finance: {
    key: 'finance',
    label: 'Finance',
    labelHe: 'שליטה פיננסית מלאה',
    theme: { accent: '#059669', background: '#FFFFFF' },
    iconName: 'Banknote',
  },
  client: {
    key: 'client',
    label: 'Client',
    labelHe: 'מעקב לקוחות ומתאמנים',
    theme: { accent: '#C5A572', background: '#F5F5F7' },
    iconName: 'GraduationCap',
  },
  operations: {
    key: 'operations',
    label: 'Operations',
    labelHe: 'תפעול, מלאי ושטח',
    theme: { accent: '#0EA5E9', background: '#F8FAFC' },
    iconName: 'Wrench',
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
  return `/w/${encodeURIComponent(orgSlug)}/${module}`;
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
