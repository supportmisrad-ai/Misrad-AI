import { NextRequest, NextResponse } from 'next/server';
import { createMeeting } from '@/lib/services/meeting-service';
import { auth } from '@clerk/nextjs/server';
import { getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { asObject, getErrorMessage } from '@/lib/server/workspace-access/utils';
import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { workspaceTenantGuard } from '@/lib/api-workspace-tenant-guard';

export const dynamic = 'force-dynamic';

const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * Create a meeting with automatic platform selection (Zoom or Meet)
 */
async function POSTHandler(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { workspaceId: organizationId } = await getWorkspaceOrThrow(request);

    const bodyJson: unknown = await request.json().catch(() => ({}));
    const bodyObj = asObject(bodyJson) ?? {};
    const title = String(bodyObj.title || '').trim();
    const startTimeRaw = bodyObj.startTime;
    const duration = Number(bodyObj.duration);
    const description = bodyObj.description == null ? undefined : String(bodyObj.description);
    const preferredPlatformCandidate = bodyObj.preferredPlatform == null ? undefined : String(bodyObj.preferredPlatform);
    const preferredPlatform =
      preferredPlatformCandidate === 'zoom' || preferredPlatformCandidate === 'meet' || preferredPlatformCandidate === 'none'
        ? preferredPlatformCandidate
        : undefined;

    const startDate =
      startTimeRaw instanceof Date
        ? startTimeRaw
        : typeof startTimeRaw === 'string' || typeof startTimeRaw === 'number'
          ? new Date(startTimeRaw)
          : null;

    // Validate required fields
    if (!title || !startDate || !Number.isFinite(duration) || duration <= 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create meeting
    const meeting = await createMeeting({
      userId: clerkUserId,
      organizationId,
      title,
      startTime: startDate,
      duration,
      description,
      preferredPlatform,
    });

    return NextResponse.json(meeting);
  } catch (error: unknown) {
    if (IS_PROD) console.error('[Meeting Create] Error');
    else console.error('[Meeting Create] Error:', error);
    const safeMsg = 'Failed to create meeting';
    return NextResponse.json(
      { error: IS_PROD ? safeMsg : getErrorMessage(error) || safeMsg },
      { status: 500 }
    );
  }
}

export const POST = shabbatGuard(workspaceTenantGuard(POSTHandler, { source: 'api_meetings_create', reason: 'POST' }));
