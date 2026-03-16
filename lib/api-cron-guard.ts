import { NextResponse } from 'next/server';

import { enterTenantIsolationContext } from '@/lib/prisma-tenant-guard';
import { timingSafeCompare } from '@/lib/server/timing-safe';

function isAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  // Check query parameter (for services that strip headers on redirect)
  const url = new URL(req.url);
  const querySecret = url.searchParams.get('secret');
  if (querySecret && timingSafeCompare(querySecret, cronSecret)) return true;

  const headerSecret = req.headers.get('x-cron-secret');
  if (headerSecret && timingSafeCompare(headerSecret, cronSecret)) return true;

  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '').trim();
    if (timingSafeCompare(token, cronSecret)) return true;
  }

  return false;
}

export function cronGuard<TArgs extends unknown[]>(handler: (...args: TArgs) => Promise<Response>) {
  return async (...args: TArgs): Promise<Response> => {
    const req = args[0] as unknown;
    if (!req || typeof req !== 'object' || !('headers' in (req as Record<string, unknown>))) {
      return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
    }

    if (!isAuthorized(req as Request)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    enterTenantIsolationContext({
      source: 'api_cron_guard',
      mode: 'global_admin',
      isSuperAdmin: true,
    });

    return handler(...args);
  };
}
