import 'server-only';

import * as Sentry from '@sentry/nextjs';

import { asObject, getUnknownErrorMessage } from '@/lib/shared/unknown';

function isE2eTestingEnv(): boolean {
  return String(process.env.IS_E2E_TESTING || '').trim().toLowerCase() === 'true';
}

export const ALLOW_SCHEMA_FALLBACKS = isE2eTestingEnv();

export function isSchemaMismatchError(error: unknown): boolean {
  const obj = asObject(error) ?? {};
  const code = String(obj.code ?? '').toUpperCase();
  const message = String(getUnknownErrorMessage(error) || '').toLowerCase();
  return (
    code === 'P2021' ||
    code === 'P2022' ||
    code === '42P01' ||
    code === '42703' ||
    message.includes('does not exist') ||
    message.includes('relation') ||
    message.includes('column') ||
    message.includes('could not find the table') ||
    message.includes('schema cache')
  );
}

export function reportSchemaFallback(params: {
  source: string;
  reason: string;
  error: unknown;
  extras?: Record<string, unknown>;
}) {
  const isE2e = isE2eTestingEnv();
  const message = `[SchemaFallback] ${params.source}: ${params.reason}`;

  const obj = asObject(params.error) ?? {};
  const code = typeof obj.code === 'string' ? String(obj.code) : '';
  const errorMessage = String(getUnknownErrorMessage(params.error) || '');

  const payload = {
    code,
    errorMessage,
    ...(params.extras ?? {}),
  };

  if (!isE2e) {
    console.error(message, payload);
    throw new Error('[Safety] Schema fallback is not allowed outside E2E.');
  }

  console.warn(message, payload);

  try {
    Sentry.withScope((scope) => {
      scope.setTag('schema_fallback', 'true');
      scope.setTag('source', params.source);
      scope.setExtra('reason', params.reason);
      scope.setExtra('payload', payload);
      Sentry.captureMessage(message, 'warning');
    });
  } catch {
    // ignore
  }
}
