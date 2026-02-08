import 'server-only';

import prisma from '@/lib/prisma';
import { OSModuleKey } from '@/lib/os/modules/types';
import { asObject } from '@/lib/shared/unknown';

export type SystemFeatureFlags = {
  maintenanceMode: boolean;
  aiEnabled: boolean;
  bannerMessage: string | null;
  fullOfficeRequiresFinance: boolean;
  enable_payment_manual: boolean;
  enable_payment_credit_card: boolean;
  launch_scope_modules: Record<OSModuleKey, boolean>;
};

const DEFAULT_LAUNCH_SCOPE_MODULES: Record<OSModuleKey, boolean> = {
  nexus: true,
  system: true,
  social: true,
  finance: true,
  client: true,
  operations: true,
};

function safeParseObject(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value);
    return asObject(parsed);
  } catch {
    return null;
  }
}

function normalizeLaunchScopeModules(input: unknown): Record<OSModuleKey, boolean> {
  const obj = asObject(input);
  if (!obj) return { ...DEFAULT_LAUNCH_SCOPE_MODULES };
  return {
    nexus: Boolean(obj.nexus ?? DEFAULT_LAUNCH_SCOPE_MODULES.nexus),
    system: Boolean(obj.system ?? DEFAULT_LAUNCH_SCOPE_MODULES.system),
    social: Boolean(obj.social ?? DEFAULT_LAUNCH_SCOPE_MODULES.social),
    finance: Boolean(obj.finance ?? DEFAULT_LAUNCH_SCOPE_MODULES.finance),
    client: Boolean(obj.client ?? DEFAULT_LAUNCH_SCOPE_MODULES.client),
    operations: Boolean(obj.operations ?? DEFAULT_LAUNCH_SCOPE_MODULES.operations),
  };
}

export async function getSystemFeatureFlags(): Promise<SystemFeatureFlags> {
  try {
    const row = await prisma.social_system_settings.findUnique({
      where: { key: 'feature_flags' },
    });

    if (!row) {
      return {
        maintenanceMode: false,
        aiEnabled: true,
        bannerMessage: null,
        fullOfficeRequiresFinance: false,
        enable_payment_manual: true,
        enable_payment_credit_card: false,
        launch_scope_modules: { ...DEFAULT_LAUNCH_SCOPE_MODULES },
      };
    }

    const rawValue = row.value;
    const parsedValue =
      typeof rawValue === 'string'
        ? safeParseObject(rawValue)
        : rawValue && typeof rawValue === 'object'
          ? asObject(rawValue)
          : null;

    return {
      maintenanceMode: Boolean(parsedValue?.maintenanceMode ?? row.maintenance_mode ?? false),
      aiEnabled: Boolean(parsedValue?.aiEnabled ?? (row.ai_enabled !== false)),
      bannerMessage: String(parsedValue?.bannerMessage ?? row.banner_message ?? '') || null,
      fullOfficeRequiresFinance: Boolean(parsedValue?.fullOfficeRequiresFinance ?? false),
      enable_payment_manual: Boolean(parsedValue?.enable_payment_manual ?? parsedValue?.enablePaymentManual ?? true),
      enable_payment_credit_card: Boolean(parsedValue?.enable_payment_credit_card ?? parsedValue?.enablePaymentCreditCard ?? false),
      launch_scope_modules: normalizeLaunchScopeModules(parsedValue?.launch_scope_modules),
    };
  } catch {
    return {
      maintenanceMode: false,
      aiEnabled: true,
      bannerMessage: null,
      fullOfficeRequiresFinance: false,
      enable_payment_manual: true,
      enable_payment_credit_card: false,
      launch_scope_modules: { ...DEFAULT_LAUNCH_SCOPE_MODULES },
    };
  }
}
