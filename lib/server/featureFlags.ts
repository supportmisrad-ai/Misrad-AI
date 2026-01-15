import 'server-only';

import { createClient } from '@/lib/supabase';

export type SystemFeatureFlags = {
  maintenanceMode: boolean;
  aiEnabled: boolean;
  bannerMessage: string | null;
  fullOfficeRequiresFinance: boolean;
  enable_payment_manual: boolean;
  enable_payment_credit_card: boolean;
};

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
    };
  } catch {
    return {
      maintenanceMode: false,
      aiEnabled: true,
      bannerMessage: null,
      fullOfficeRequiresFinance: false,
      enable_payment_manual: true,
      enable_payment_credit_card: false,
    };
  }
}
