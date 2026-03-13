import { NextRequest, NextResponse } from 'next/server';
import { recordEmailOpen } from '@/lib/emails/email-analytics';

/**
 * Email Open Tracking API
 * GET /api/email/track?tid=...
 *
 * Returns a 1x1 transparent GIF and records the email open
 */
export async function GET(request: NextRequest) {
    const url = request.nextUrl;
    const trackingId = url.searchParams.get('tid');

    if (!trackingId) {
        return new NextResponse('Missing tracking ID', { status: 400 });
    }

    // Record the open
    await recordEmailOpen(trackingId, {
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
    });

    // Return 1x1 transparent GIF
    const transparentGif = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
    );

    return new NextResponse(transparentGif, {
        status: 200,
        headers: {
            'Content-Type': 'image/gif',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
        },
    });
}

export const dynamic = 'force-dynamic';
