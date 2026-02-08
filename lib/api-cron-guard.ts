import { NextResponse } from 'next/server';

import { enterTenantIsolationContext } from '@/lib/prisma-tenant-guard';

function isAuthorized(req: Request): boolean {
  const headerSecret = req.headers.get('x-cron-secret');
  if (headerSecret && headerSecret === process.env.CRON_SECRET) return true;

  const authHeader = req.headers.get('authorization');
  if (authHeader && process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;

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
