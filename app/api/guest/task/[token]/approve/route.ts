import { NextRequest, NextResponse } from 'next/server';

import {
  findNexusTaskByShareToken,
  findNexusTaskByIdPublic,
  updateNexusTaskRowsById,
} from '@/lib/services/nexus-tasks-service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    if (!token || token.length < 8) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    // Find task
    let row = await findNexusTaskByShareToken(token);
    if (!row) {
      row = await findNexusTaskByIdPublic(token);
    }
    if (!row || row.isPrivate) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Only allow approval when task is in "Waiting for Review" status
    if (row.status !== 'Waiting for Review') {
      return NextResponse.json(
        { error: 'Task is not awaiting approval', currentStatus: row.status },
        { status: 409 },
      );
    }

    // Add system message about approval
    const existingMessages = Array.isArray(row.messages) ? row.messages : [];
    const approvalMessage = {
      id: `system-approval-${Date.now()}`,
      text: '✅ המשימה אושרה על ידי הלקוח/אורח',
      senderId: 'system',
      createdAt: new Date().toISOString(),
      type: 'system',
    };

    await updateNexusTaskRowsById({
      organizationId: row.organizationId,
      taskId: row.id,
      data: {
        approvalStatus: 'approved',
        messages: [...existingMessages, approvalMessage],
      },
    });

    return NextResponse.json({ ok: true, approvalStatus: 'approved' });
  } catch (error: unknown) {
    console.error('[GuestApproveAPI] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
