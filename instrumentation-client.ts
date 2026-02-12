import * as Sentry from '@sentry/nextjs';

function isNextNavigationEvent(event: Sentry.Event): boolean {
  const values = event.exception?.values;
  if (!Array.isArray(values) || values.length === 0) return false;

  return values.some((v) => {
    const t = typeof v.type === 'string' ? v.type : '';
    const val = typeof v.value === 'string' ? v.value : '';
    return t === 'NEXT_REDIRECT' || t === 'NEXT_NOT_FOUND' || val === 'NEXT_REDIRECT' || val === 'NEXT_NOT_FOUND';
  });
}

export function register() {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
    tracesSampleRate: 0,
    integrations: [],
    beforeSend(event) {
      if (isNextNavigationEvent(event)) return null;
      return event;
    },
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
