import { NextResponse } from 'next/server';
import { getConnectedPlatforms } from '@/lib/services/meeting-service';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * Get integration status for current user
 * Returns which platforms (Zoom, Meet) are connected
 */
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's organization
    const profile = await prisma.profile.findFirst({
      where: { clerkUserId: userId },
      select: { organizationId: true },
    });

    if (!profile?.organizationId) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const platforms = await getConnectedPlatforms(userId, profile.organizationId);

    return NextResponse.json({
      zoom: platforms.zoom,
      meet: platforms.meet,
      googleCalendar: platforms.meet, // Meet requires Calendar
    });
  } catch (error) {
    if (IS_PROD) console.error('[Integration Status] Error');
    else console.error('[Integration Status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get integration status' },
      { status: 500 }
    );
  }
}
