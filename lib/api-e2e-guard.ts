import { NextResponse } from 'next/server';

const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * Defense-in-depth guard for /api/e2e/* routes.
 * Returns a 404 response in production, or null if the route is allowed.
 * Every e2e route handler should call this at the very top.
 */
export function blockE2eInProduction(): NextResponse | null {
  if (IS_PROD) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return null;
}
