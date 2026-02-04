import { NextResponse } from 'next/server';
import { getSocialStats } from '@/lib/services/social-stats-service';

export const dynamic = 'force-dynamic';
export const revalidate = 300; // Cache for 5 minutes

export async function GET() {
  try {
    const stats = await getSocialStats();
    return NextResponse.json({ ok: true, stats });
  } catch (error) {
    console.error('[API /landing/social-stats] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
