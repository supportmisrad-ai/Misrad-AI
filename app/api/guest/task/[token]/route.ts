import { NextRequest, NextResponse } from 'next/server';

import {
  findNexusTaskByShareToken,
  findNexusTaskByIdPublic,
} from '@/lib/services/nexus-tasks-service';
import { resolveStorageUrlMaybeServiceRole } from '@/lib/services/operations/storage';

interface GuestTaskMessage {
  id: string;
  text: string;
  senderId: string;
  createdAt: string;
  type?: 'user' | 'system' | 'guest';
}

function sanitizeMessagesForGuest(messages: unknown): GuestTaskMessage[] {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((m: unknown) => {
      if (!m || typeof m !== 'object') return false;
      const msg = m as Record<string, unknown>;
      // Show system messages, guest messages, and user messages (but anonymize sender)
      return typeof msg.text === 'string' && msg.text.length > 0;
    })
    .map((m: unknown) => {
      const msg = m as Record<string, unknown>;
      const type = String(msg.type ?? 'user');
      return {
        id: String(msg.id ?? ''),
        text: String(msg.text ?? ''),
        senderId: type === 'guest' ? 'guest' : 'team',
        createdAt: String(msg.createdAt ?? ''),
        type: type as 'user' | 'system' | 'guest',
      };
    });
}

function getStatusProgress(status: string): number {
  const s = status.toLowerCase();
  if (s === 'backlog') return 0;
  if (s === 'to do' || s === 'todo') return 10;
  if (s === 'in progress' || s === 'in_progress') return 50;
  if (s === 'waiting for review' || s === 'waiting') return 80;
  if (s === 'done') return 100;
  return 0;
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'Backlog': return 'בהמתנה';
    case 'To Do':
    case 'Todo': return 'לביצוע';
    case 'In Progress': return 'בתהליך';
    case 'Waiting for Review': return 'ממתין לאישור';
    case 'Done': return 'הושלם';
    case 'Canceled': return 'בוטל';
    default: return status;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    if (!token || token.length < 8) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    // Try shareToken first, then fall back to task ID (backward compat)
    let row = await findNexusTaskByShareToken(token);
    if (!row) {
      row = await findNexusTaskByIdPublic(token);
    }

    if (!row) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Never expose private tasks
    if (row.isPrivate) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const messages = sanitizeMessagesForGuest(row.messages);
    const progress = getStatusProgress(row.status);
    const statusLabel = getStatusLabel(row.status);

    return NextResponse.json({
      task: {
        title: row.title,
        description: row.description ?? '',
        status: row.status,
        statusLabel,
        progress,
        priority: row.priority ?? 'Low',
        createdAt: row.createdAt.toISOString(),
        dueDate: row.dueDate ? row.dueDate.toISOString().split('T')[0] : null,
        approvalStatus: row.approvalStatus ?? null,
        messages,
        tags: row.tags ?? [],
        department: row.department ?? null,
      },
      organization: {
        name: row.organization?.name ?? 'MISRAD AI',
        logo: row.organization?.logo ? await resolveStorageUrlMaybeServiceRole(row.organization.logo, 3600, { organizationId: row.organization.id }) : null,
      },
    });
  } catch (error: unknown) {
    console.error('[GuestTaskAPI] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
