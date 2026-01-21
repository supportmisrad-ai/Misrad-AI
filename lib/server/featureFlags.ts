import 'server-only';

import { createClient } from '@/lib/supabase';
import { OSModuleKey } from '@/lib/os/modules/types';

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

function normalizeLaunchScopeModules(input: any): Record<OSModuleKey, boolean> {
  if (!input || typeof input !== 'object') return { ...DEFAULT_LAUNCH_SCOPE_MODULES };
  return {
    nexus: Boolean((input as any).nexus ?? DEFAULT_LAUNCH_SCOPE_MODULES.nexus),
    system: Boolean((input as any).system ?? DEFAULT_LAUNCH_SCOPE_MODULES.system),
    social: Boolean((input as any).social ?? DEFAULT_LAUNCH_SCOPE_MODULES.social),
    finance: Boolean((input as any).finance ?? DEFAULT_LAUNCH_SCOPE_MODULES.finance),
    client: Boolean((input as any).client ?? DEFAULT_LAUNCH_SCOPE_MODULES.client),
    operations: Boolean((input as any).operations ?? DEFAULT_LAUNCH_SCOPE_MODULES.operations),
  };
}

export async function getSystemFeatureFlags(): Promise<SystemFeatureFlags> {
  try {
    const supabase = createClient();

    const { data: row, error } = await supabase
      .from('social_system_settings')
      .select('*')
      .eq('key', 'feature_flags')
      .maybeSingle();

    if (error) {
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

    const rawValue = (row as any)?.value;
    let parsedValue: any = null;
    if (rawValue && typeof rawValue === 'string') {
      parsedValue = JSON.parse(rawValue);
    } else if (rawValue && typeof rawValue === 'object') {
      parsedValue = rawValue;
    }

    return {
      maintenanceMode: Boolean(parsedValue?.maintenanceMode ?? (row as any)?.maintenance_mode ?? false),
      aiEnabled: Boolean(parsedValue?.aiEnabled ?? ((row as any)?.ai_enabled !== false)),
      bannerMessage: (parsedValue?.bannerMessage ?? (row as any)?.banner_message ?? null) as any,
      fullOfficeRequiresFinance: Boolean(parsedValue?.fullOfficeRequiresFinance ?? false),
      enable_payment_manual: Boolean(parsedValue?.enable_payment_manual ?? parsedValue?.enablePaymentManual ?? true),
      enable_payment_credit_card: Boolean(parsedValue?.enable_payment_credit_card ?? parsedValue?.enablePaymentCreditCard ?? false),
      launch_scope_modules: { ...DEFAULT_LAUNCH_SCOPE_MODULES },
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
