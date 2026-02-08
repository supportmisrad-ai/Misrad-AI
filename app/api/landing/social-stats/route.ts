import { NextResponse } from 'next/server';
import { getSocialStats } from '@/lib/services/social-stats-service';

export const dynamic = 'force-dynamic';
export const revalidate = 300; // Cache for 5 minutes

const IS_PROD = process.env.NODE_ENV === 'production';

export async function GET() {
  try {
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
