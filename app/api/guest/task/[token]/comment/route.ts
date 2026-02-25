import { NextRequest, NextResponse } from 'next/server';

import {
  findNexusTaskByShareToken,
  findNexusTaskByIdPublic,
  updateNexusTaskRowsById,
} from '@/lib/services/nexus-tasks-service';

// ── Rate limiter (in-memory, per IP) ─────────────────────────────────
const RL_MAP = new Map<string, { count: number; resetAt: number }>();
const RL_MAX = 10; // max 10 comments per window per IP
const RL_WINDOW_MS = 60_000; // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = RL_MAP.get(ip);
  if (!entry || now > entry.resetAt) {
    RL_MAP.set(ip, { count: 1, resetAt: now + RL_WINDOW_MS });
    if (RL_MAP.size > 5000) {
      for (const [k, v] of RL_MAP) { if (now > v.resetAt) RL_MAP.delete(k); }
    }
    return false;
  }
  entry.count++;
  return entry.count > RL_MAX;
}

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || '127.0.0.1';
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const ip = getClientIp(req);
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { token } = await params;
    if (!token || token.length < 8) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.text !== 'string' || !body.text.trim()) {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
    }

    const text = String(body.text).trim().slice(0, 2000);
    const guestName = typeof body.guestName === 'string' ? body.guestName.trim().slice(0, 100) : 'אורח';

    // Find task
    let row = await findNexusTaskByShareToken(token);
    if (!row) {
      row = await findNexusTaskByIdPublic(token);
    }
    if (!row || row.isPrivate) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Build new message
    const existingMessages = Array.isArray(row.messages) ? row.messages : [];
    const newMessage = {
      id: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      senderId: 'guest',
      senderName: guestName,
      createdAt: new Date().toISOString(),
      type: 'guest',
    };

    const updatedMessages = [...existingMessages, newMessage];

    await updateNexusTaskRowsById({
      organizationId: row.organizationId,
      taskId: row.id,
      data: { messages: updatedMessages },
    });

    return NextResponse.json({
      ok: true,
      message: {
        id: newMessage.id,
        text: newMessage.text,
        senderId: 'guest',
        createdAt: newMessage.createdAt,
        type: 'guest',
      },
    });
  } catch (error: unknown) {
    console.error('[GuestCommentAPI] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
