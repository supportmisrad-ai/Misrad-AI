import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { blockE2eInProduction } from '@/lib/api-e2e-guard';
import { timingSafeCompare } from '@/lib/server/timing-safe';

export const dynamic = 'force-dynamic';

function extractCookieValue(cookieHeader: string, name: string): string | null {
  const prefix = `${name}=`;
  const parts = String(cookieHeader || '').split(/;\s*/);
  for (const p of parts) {
    if (p.startsWith(prefix)) return p.slice(prefix.length);
  }
  return null;
}

function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const parts = String(jwt || '').split('.');
    if (parts.length < 2) return null;
    const payloadRaw = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payloadJson = Buffer.from(payloadRaw, 'base64').toString('utf-8');
    const payload = JSON.parse(payloadJson || '{}');
    return payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const blocked = blockE2eInProduction();
  if (blocked) return blocked;

  const expected = process.env.E2E_API_KEY;
  const provided = req.headers.get('x-e2e-key');

  if (!expected || !provided || !timingSafeCompare(provided, expected)) {
    return NextResponse.json({ ok: false, error: 'InvalidE2EKey' }, { status: 403 });
  }

  const { userId } = await auth();
  if (!userId) {
    const isE2E =
      String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true' ||
      String(process.env.IS_E2E_TESTING || '').toLowerCase() === '1';

    if (isE2E) {
      const cookieHeader = req.headers.get('cookie') || '';
      const hasSessionCookie = cookieHeader.includes('__session=');
      const hasRefreshCookie = /__refresh_\w+=/.test(cookieHeader);

      const sessionJwt = extractCookieValue(cookieHeader, '__session') || '';
      const payload = sessionJwt ? decodeJwtPayload(sessionJwt) : null;
      const nowSec = Math.floor(Date.now() / 1000);
      const expRaw = payload?.exp;
      const iatRaw = payload?.iat;
      const exp = typeof expRaw === 'number' ? expRaw : Number(expRaw);
      const iat = typeof iatRaw === 'number' ? iatRaw : Number(iatRaw);

      return NextResponse.json(
        {
          ok: false,
          error: 'NoAuthSession',
          debug: {
            cookieHeaderLength: cookieHeader.length,
            hasSessionCookie,
            hasRefreshCookie,
            nowSec,
            exp: Number.isFinite(exp) ? exp : null,
            iat: Number.isFinite(iat) ? iat : null,
            secondsLeft: Number.isFinite(exp) ? exp - nowSec : null,
            iss: payload?.iss ?? null,
            azp: payload?.azp ?? null,
          },
        },
        { status: 401 }
      );
    }

    return NextResponse.json({ ok: false, error: 'NoAuthSession' }, { status: 401 });
  }

  const clerk = await currentUser();
  const emails = Array.isArray(clerk?.emailAddresses)
    ? clerk.emailAddresses
        .map((e) => (e ? String(e.emailAddress || '') : ''))
        .map((e) => e.trim())
        .filter(Boolean)
    : [];

  return NextResponse.json({
    ok: true,
    clerkUserId: userId,
    email: clerk?.primaryEmailAddress?.emailAddress ?? null,
    emails,
  });
}
