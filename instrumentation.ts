import * as Sentry from '@sentry/nextjs';

function isNextNavigationNoise(value: unknown): boolean {
  if (!value) return false;

  const asString = typeof value === 'string' ? value : '';
  if (asString === 'NEXT_REDIRECT' || asString === 'NEXT_NOT_FOUND') return true;

  const obj = typeof value === 'object' ? (value as Record<string, unknown>) : null;
  const name = obj && typeof obj.name === 'string' ? obj.name : '';
  const message = obj && typeof obj.message === 'string' ? obj.message : '';
  if (name === 'NEXT_REDIRECT' || name === 'NEXT_NOT_FOUND') return true;
  if (message === 'NEXT_REDIRECT' || message === 'NEXT_NOT_FOUND') return true;

  return false;
}

function isNextNavigationEvent(event: Sentry.Event, hint?: Sentry.EventHint): boolean {
  if (isNextNavigationNoise(hint?.originalException)) return true;

  const values = event.exception?.values;
  if (!Array.isArray(values) || values.length === 0) return false;

  return values.some((v) => {
    const t = typeof v.type === 'string' ? v.type : '';
    const val = typeof v.value === 'string' ? v.value : '';
    return t === 'NEXT_REDIRECT' || t === 'NEXT_NOT_FOUND' || val === 'NEXT_REDIRECT' || val === 'NEXT_NOT_FOUND';
  });
}

export function register() {
  const allowSchemaFallbacks = String(process.env.MISRAD_ALLOW_SCHEMA_FALLBACKS || '')
    .trim()
    .toLowerCase() === 'true';
  const isE2e = String(process.env.IS_E2E_TESTING || '').trim().toLowerCase() === 'true';
  const isProd = process.env.NODE_ENV === 'production';

  if (allowSchemaFallbacks) {
    const message =
      '[Safety] MISRAD_ALLOW_SCHEMA_FALLBACKS is enabled. This can hide schema mismatches by returning empty/default values.';
    if (isProd || !isE2e) {
      console.error(message);
      throw new Error('[Safety] MISRAD_ALLOW_SCHEMA_FALLBACKS cannot be enabled. Use IS_E2E_TESTING only.');
    }
    process.env.MISRAD_ALLOW_SCHEMA_FALLBACKS = 'false';
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0,
    integrations: [],
    beforeSend(event, hint) {
      if (isNextNavigationEvent(event, hint)) return null;
      return event;
    },
  });
}

function isAbortNoise(err: unknown): boolean {
  const obj = err && typeof err === 'object' ? (err as Record<string, unknown>) : {};
  const message = typeof obj.message === 'string' ? obj.message.toLowerCase() : '';
  const name = typeof obj.name === 'string' ? obj.name : '';
  const code = typeof obj.code === 'string' ? obj.code : null;

  const cause = obj.cause && typeof obj.cause === 'object' ? (obj.cause as Record<string, unknown>) : {};
  const causeCode = typeof cause.code === 'string' ? cause.code : null;

  if (message === 'aborted') return true;
  if (name === 'AbortError') return true;
  if (code === 'ECONNRESET' || causeCode === 'ECONNRESET') return true;
  if (code === 'ERR_STREAM_PREMATURE_CLOSE' || causeCode === 'ERR_STREAM_PREMATURE_CLOSE') return true;
  return false;
}

function isWebpackDevRuntimeNoise(err: unknown): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  const obj = err && typeof err === 'object' ? (err as Record<string, unknown>) : {};
  const message = typeof obj.message === 'string' ? obj.message : '';
  const stack = typeof obj.stack === 'string' ? obj.stack : '';
  const normalizedMessage = message.toLowerCase();
  return (
    normalizedMessage.includes("cannot read properties of undefined") &&
    normalizedMessage.includes("reading 'call'") &&
    stack.includes('webpack-runtime')
  );
}

export const onRequestError: typeof Sentry.captureRequestError = (error, request, context) => {
  if (isNextNavigationNoise(error)) return;
  if (isAbortNoise(error)) return;
  if (isWebpackDevRuntimeNoise(error)) return;
  return Sentry.captureRequestError(error, request, context);
};
