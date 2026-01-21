import { OSModuleDefinition, OSModuleKey } from './types';

export const modulesRegistry: Record<OSModuleKey, OSModuleDefinition> = {
  nexus: {
    key: 'nexus',
    label: 'Nexus',
    labelHe: 'מרכז הבקרה',
    theme: { accent: '#3730A3', background: '#F8FAFC' },
  },
  system: {
    key: 'system',
    label: 'System',
    labelHe: 'מכונת המכירות',
    theme: { accent: '#E11D48', background: '#FFFFFF' },
  },
  social: {
    key: 'social',
    label: 'Social',
    labelHe: 'שיווק שמייצר סמכות',
    theme: { accent: '#2563EB', background: '#F8FAFC' },
  },
  finance: {
    key: 'finance',
    label: 'Finance',
    labelHe: 'שומר הרווחים',
    theme: { accent: '#059669', background: '#FFFFFF' },
  },
  client: {
    key: 'client',
    label: 'Client',
    labelHe: 'פורטל הצלחת לקוח',
    theme: { accent: '#D97706', background: '#FFFBEB' },
  },
  operations: {
    key: 'operations',
    label: 'Operations',
    labelHe: 'תפעול ושטח',
    theme: { accent: '#0EA5E9', background: '#F8FAFC' },
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
