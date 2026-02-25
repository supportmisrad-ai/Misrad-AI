import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';

/**
 * Protected diagnostic endpoint — returns non-secret Clerk configuration info.
 * Requires Super Admin authentication.
 */
export async function GET() {
  try { await requireSuperAdmin(); } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
  const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '';
  const signUpUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '';
  const nodeEnv = process.env.NODE_ENV || '';

  return NextResponse.json({
    keyType: publishableKey.startsWith('pk_live_')
      ? 'PRODUCTION'
      : publishableKey.startsWith('pk_test_')
        ? 'DEVELOPMENT'
        : 'UNKNOWN',
    keyPrefix: publishableKey.slice(0, 12) + '…',
    signInUrl: signInUrl || '(not set)',
    signUpUrl: signUpUrl || '(not set)',
    nodeEnv,
  });
}
