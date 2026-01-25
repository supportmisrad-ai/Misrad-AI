import 'server-only';

import { createClient } from '@/lib/supabase';

export type SystemEmailSettings = {
  supportEmail: string | null;
  migrationEmail: string | null;
};

export async function getSystemEmailSettingsUnsafe(): Promise<SystemEmailSettings> {
  const supportEmailFallback = (process.env.MISRAD_SUPPORT_EMAIL || 'support@social-os.com').trim();
  const migrationEmailFallback = (process.env.MISRAD_MIGRATION_EMAIL || '').trim();

  try {
    const supabase = createClient();
    const { data: row } = await supabase
      .from('social_system_settings')
      .select('*')
      .eq('key', 'system_email_settings')
      .maybeSingle();

    const rawValue = (row as any)?.value;
    let parsedValue: any = null;
    if (rawValue && typeof rawValue === 'string') {
      parsedValue = JSON.parse(rawValue);
    } else if (rawValue && typeof rawValue === 'object') {
      parsedValue = rawValue;
    }

    const supportEmailRaw = (parsedValue?.supportEmail ?? supportEmailFallback);
    const migrationEmailRaw = (parsedValue?.migrationEmail ?? migrationEmailFallback);

    const supportEmail = String(supportEmailRaw ?? '').trim() || null;
    const migrationEmail = String(migrationEmailRaw ?? '').trim() || null;

    return { supportEmail, migrationEmail };
  } catch {
    return {
      supportEmail: supportEmailFallback || null,
      migrationEmail: migrationEmailFallback || null,
    };
  }
}
