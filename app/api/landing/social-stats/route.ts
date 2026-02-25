import { NextRequest, NextResponse } from 'next/server';
import { getSocialStats } from '@/lib/services/social-stats-service';
import { getClientIpFromRequest, rateLimit, buildRateLimitHeaders } from '@/lib/server/rateLimit';

export const dynamic = 'force-dynamic';
export const revalidate = 300; // Cache for 5 minutes

const IS_PROD = process.env.NODE_ENV === 'production';

export async function GET(req: NextRequest) {
  try {
    // Rate limit — public endpoint, prevent abuse
    const ip = getClientIpFromRequest(req);
    const rl = await rateLimit({
      namespace: 'landing.social_stats',
      key: ip,
      limit: 20,
      windowMs: 60_000,
      mode: 'degraded',
      degradedLimit: 5,
    });
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: buildRateLimitHeaders({
            limit: 20,
            remaining: 0,
            resetAt: rl.resetAt,
            retryAfterSeconds: rl.retryAfterSeconds,
          }),
        },
      );
    }

    const stats = await getSocialStats();
    return NextResponse.json({ ok: true, stats });
  } catch (error: unknown) {
    if (IS_PROD) console.error('[API /landing/social-stats] Error');
    else console.error('[API /landing/social-stats] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
