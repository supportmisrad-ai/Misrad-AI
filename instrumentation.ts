import * as Sentry from '@sentry/nextjs';

export function register() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0,
    integrations: [],
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
  if (isAbortNoise(error)) return;
  if (isWebpackDevRuntimeNoise(error)) return;
  return Sentry.captureRequestError(error, request, context);
};
