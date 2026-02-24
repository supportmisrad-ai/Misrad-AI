/**
 * API Route: Send Message
 * POST /api/messaging/send
 * 
 * Sends a real message via WhatsApp, SMS, or Email.
 * Requires authentication and manage_system permission.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { sendMessage, type MessagingChannel } from '@/lib/services/messaging';
import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

const VALID_CHANNELS: MessagingChannel[] = ['whatsapp', 'sms', 'email'];

async function POSTHandler(request: NextRequest) {
    try {
        // 1. Authenticate
        await getAuthenticatedUser();
        await requirePermission('manage_system');

        const { workspace } = await getWorkspaceOrThrow(request);
        const tenantId = String(workspace.id);

        // 2. Parse body
        const body: unknown = await request.json().catch(() => ({}));
        const bodyObj = (body && typeof body === 'object' && !Array.isArray(body))
            ? body as Record<string, unknown>
            : {};

        const channel = typeof bodyObj.channel === 'string' ? bodyObj.channel as MessagingChannel : '';
        const to = typeof bodyObj.to === 'string' ? bodyObj.to.trim() : '';
        const message = typeof bodyObj.message === 'string' ? bodyObj.message.trim() : '';
        const subject = typeof bodyObj.subject === 'string' ? bodyObj.subject.trim() : undefined;

        // 3. Validate
        if (!channel || !VALID_CHANNELS.includes(channel)) {
            return NextResponse.json(
                { error: `ערוץ לא תקין. ערוצים נתמכים: ${VALID_CHANNELS.join(', ')}` },
                { status: 400 }
            );
        }

        if (!to) {
            return NextResponse.json(
                { error: 'חסר נמען (to)' },
                { status: 400 }
            );
        }

        if (!message) {
            return NextResponse.json(
                { error: 'חסר תוכן הודעה (message)' },
                { status: 400 }
            );
        }

        // 4. Send
        const result = await sendMessage({
            channel,
            to,
            body: message,
            subject,
            tenantId,
        });

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'שגיאה בשליחת הודעה' },
                { status: 422 }
            );
        }

        return NextResponse.json({
            success: true,
            messageId: result.messageId,
            channel: result.channel,
        });

    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error sending message');
        else console.error('[API] Error sending message:', error);

        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json(
            { error: message },
            { status: message.includes('Forbidden') ? 403 : 500 }
        );
    }
}

export const POST = shabbatGuard(POSTHandler);
