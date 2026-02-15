import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

export const dynamic = 'force-dynamic';

const IS_PROD = process.env.NODE_ENV === 'production';

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

    return await withTenantIsolationContext(
      { source: 'api_integrations_zoom_disconnect', organizationId: profile.organizationId, reason: 'zoom_disconnect' },
      async () => {
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
      }
    );
  } catch (error) {
    if (IS_PROD) console.error('[Zoom Disconnect] Error');
    else console.error('[Zoom Disconnect] Error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Zoom' },
      { status: 500 }
    );
  }
}
