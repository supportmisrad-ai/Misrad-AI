/**
 * Admin Bot Conversations API — GET /api/admin/bot/conversations
 * Returns conversation history for a specific lead.
 *
 * @guard SUPERADMIN
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getErrorMessage } from '@/lib/shared/unknown';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function GET(req: NextRequest) {
  try {
    const leadId = req.nextUrl.searchParams.get('leadId');
    if (!leadId) {
      return json({ error: 'Missing leadId' }, 400);
    }

    const conversations = await prisma.botConversation.findMany({
      where: { lead_id: leadId },
      orderBy: { created_at: 'asc' },
      take: 100,
    });

    return json({ conversations });
  } catch (err: unknown) {
    console.error('[admin-bot-conversations]', getErrorMessage(err));
    return json({ error: 'Internal error' }, 500);
  }
}
