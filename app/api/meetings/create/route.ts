import { NextRequest, NextResponse } from 'next/server';
import { createMeeting } from '@/lib/services/meeting-service';
import { auth } from '@clerk/nextjs/server';
import { getWorkspaceOrThrow } from '@/lib/server/api-workspace';

export const dynamic = 'force-dynamic';

/**
 * Create a meeting with automatic platform selection (Zoom or Meet)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { workspaceId: organizationId } = await getWorkspaceOrThrow(request);

    const body = await request.json();
    const { title, startTime, duration, description, preferredPlatform } = body;

    // Validate required fields
    if (!title || !startTime || !duration) {
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
      startTime: new Date(startTime),
      duration,
      description,
      preferredPlatform: preferredPlatform || undefined,
    });

    return NextResponse.json(meeting);
  } catch (error: any) {
    console.error('[Meeting Create] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create meeting' },
      { status: 500 }
    );
  }
}
