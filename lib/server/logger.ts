import 'server-only';

import * as Sentry from '@sentry/nextjs';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const IS_PROD = process.env.NODE_ENV === 'production';

function formatMessage(source: string, message: string): string {
  return `[${source}] ${message}`;
}

function toExtras(value: unknown): Record<string, unknown> | undefined {
  if (value == null) return undefined;
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  return { value };
}

function captureToSentry(
  level: LogLevel,
  source: string,
  message: string,
  extras?: unknown,
) {
  const normalized = toExtras(extras);
  try {
    Sentry.withScope((scope) => {
      scope.setTag('source', source);
      if (normalized) {
        for (const [key, value] of Object.entries(normalized)) {
          scope.setExtra(key, value);
        }
      }
      if (level === 'error') {
        Sentry.captureException(
          new Error(formatMessage(source, message)),
        );
      } else {
        Sentry.captureMessage(
          formatMessage(source, message),
          level === 'warn' ? 'warning' : 'info',
        );
      }
    });
  } catch {
    // Sentry failure should never break the app
  }
}

export const logger = {
  debug(source: string, message: string, ...rest: unknown[]) {
    if (!IS_PROD) {
      console.debug(formatMessage(source, message), ...rest);
    }
  },

  info(source: string, message: string, extras?: unknown) {
    if (!IS_PROD) {
      console.info(formatMessage(source, message), extras ?? '');
    }
    captureToSentry('info', source, message, extras);
  },

  warn(source: string, message: string, extras?: unknown) {
    if (!IS_PROD) {
      console.warn(formatMessage(source, message), extras ?? '');
    }
    captureToSentry('warn', source, message, extras);
  },

  error(source: string, message: string, error?: unknown, extras?: unknown) {
    if (!IS_PROD) {
      console.error(formatMessage(source, message), error, extras ?? '');
    }
    const errorExtras: Record<string, unknown> = { ...(toExtras(extras) ?? {}) };
    if (error instanceof Error) {
      errorExtras.errorMessage = error.message;
      errorExtras.stack = error.stack;
    } else if (error != null) {
      errorExtras.errorValue = String(error);
    }
    captureToSentry('error', source, message, errorExtras);
  },
};
