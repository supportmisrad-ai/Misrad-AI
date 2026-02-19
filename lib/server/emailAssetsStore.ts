import 'server-only';

import prisma, { accelerateCache } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { asObject, getErrorMessage } from '@/lib/shared/unknown';
import { ALLOW_SCHEMA_FALLBACKS, reportSchemaFallback } from '@/lib/server/schema-fallbacks';

const SETTINGS_KEY = 'email_assets';

export type EmailAssetsMap = Record<string, string>;

function isMissingRelationError(error: unknown): boolean {
  const obj = asObject(error);
  const message = String(obj?.message || '').toLowerCase();
  const code = String(obj?.code || '').toLowerCase();
  return (
    code === '42p01' ||
    message.includes('does not exist') ||
    message.includes('relation') ||
    message.includes('table')
  );
}

/**
 * Read email asset overrides from DB (no auth — server-only).
 * Returns a flat Record<string, string> where keys match the getEmailAssets() keys
 * and values are URL strings set by the admin.
 */
export async function getEmailAssetsFromDB(): Promise<EmailAssetsMap> {
  try {
    const row = await prisma.coreSystemSettings
      .findUnique({
        where: { key: SETTINGS_KEY },
        select: { value: true },
        ...accelerateCache({ ttl: 120, swr: 300 }),
      })
      .catch((e: unknown) => {
        if (isMissingRelationError(e)) {
          if (!ALLOW_SCHEMA_FALLBACKS) {
            throw new Error(
              `[SchemaMismatch] coreSystemSettings email_assets lookup failed (${getErrorMessage(e) || 'missing relation'})`
            );
          }
          reportSchemaFallback({
            source: 'lib/server/emailAssetsStore.getEmailAssetsFromDB',
            reason: 'coreSystemSettings missing table/column (fallback to empty)',
            error: e,
            extras: { key: SETTINGS_KEY },
          });
          return null;
        }
        throw e;
      });

    if (!row?.value) return {};

    const raw = row.value;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const obj = asObject(parsed);
    if (!obj) return {};

    const result: EmailAssetsMap = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string' && v.trim()) {
        result[k] = v.trim();
      }
    }
    return result;
  } catch (error: unknown) {
    if (isMissingRelationError(error) && ALLOW_SCHEMA_FALLBACKS) {
      reportSchemaFallback({
        source: 'lib/server/emailAssetsStore.getEmailAssetsFromDB',
        reason: 'coreSystemSettings email_assets lookup failed (fallback to empty)',
        error,
      });
      return {};
    }
    console.error('[EmailAssets] Error reading from DB:', getErrorMessage(error));
    return {};
  }
}

/**
 * Write email asset overrides to DB (no auth — server-only, call from guarded action).
 * Only non-empty string values are persisted. Empty strings remove that override.
 */
export async function setEmailAssetsInDB(assets: EmailAssetsMap): Promise<EmailAssetsMap> {
  const cleaned: EmailAssetsMap = {};
  for (const [k, v] of Object.entries(assets)) {
    const trimmed = typeof v === 'string' ? v.trim() : '';
    if (trimmed) {
      cleaned[k] = trimmed;
    }
  }

  const now = new Date();
  const jsonValue = JSON.parse(JSON.stringify(cleaned)) as Prisma.InputJsonObject;

  try {
    await prisma.coreSystemSettings.upsert({
      where: { key: SETTINGS_KEY },
      create: {
        key: SETTINGS_KEY,
        value: jsonValue,
        updated_at: now,
        created_at: now,
      },
      update: {
        value: jsonValue,
        updated_at: now,
      },
    });
  } catch (error: unknown) {
    if (isMissingRelationError(error) && !ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(
        `[SchemaMismatch] coreSystemSettings email_assets upsert failed (${getErrorMessage(error) || 'missing relation'})`
      );
    }
    if (isMissingRelationError(error) && ALLOW_SCHEMA_FALLBACKS) {
      reportSchemaFallback({
        source: 'lib/server/emailAssetsStore.setEmailAssetsInDB',
        reason: 'coreSystemSettings upsert failed (table missing)',
        error,
      });
      return cleaned;
    }
    throw error instanceof Error
      ? error
      : new Error(getErrorMessage(error) || 'Failed to save email assets');
  }

  return cleaned;
}
