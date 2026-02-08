import 'server-only';

import prisma from '@/lib/prisma';

import { asObject } from '@/lib/shared/unknown';
export type SystemEmailSettings = {
  supportEmail: string | null;
  migrationEmail: string | null;
};

export async function getSystemEmailSettingsUnsafe(): Promise<SystemEmailSettings> {
  const supportEmailFallback = (process.env.MISRAD_SUPPORT_EMAIL || 'support@misrad-ai.com,itsikdahan1@gmail.com').trim();
  const migrationEmailFallback = (process.env.MISRAD_MIGRATION_EMAIL || '').trim();

  try {
    const row = await prisma.social_system_settings.findUnique({
      where: { key: 'system_email_settings' },
    });

    const rawValue: unknown = row?.value;
    let parsedValue: unknown = null;
    if (rawValue && typeof rawValue === 'string') {
      parsedValue = JSON.parse(rawValue) as unknown;
    } else if (rawValue && typeof rawValue === 'object') {
      parsedValue = rawValue;
    }

    const parsedObj = asObject(parsedValue);

    const supportEmailRaw = (parsedObj?.supportEmail ?? supportEmailFallback);
    const migrationEmailRaw = (parsedObj?.migrationEmail ?? migrationEmailFallback);

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
