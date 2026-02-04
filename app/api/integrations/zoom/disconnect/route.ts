import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

/**
 * Disconnect Zoom integration
 * Removes stored tokens from database
 */
export async function POST() {
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

    // Deactivate integration
    await prisma.scale_integrations.updateMany({
      where: {
        user_id: userId,
        tenant_id: profile.organizationId,
        service_type: 'zoom',
      },
      data: {
        is_active: false,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Zoom Disconnect] Error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Zoom' },
      { status: 500 }
    );
  }
}
