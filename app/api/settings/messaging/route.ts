/**
 * API Route: Messaging Channel Settings
 * GET  /api/settings/messaging - Get messaging channel configuration
 * PUT  /api/settings/messaging - Save/update messaging channel configuration
 * 
 * BYOC model — each organization stores WhatsApp/SMS/Email credentials.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import {
    getChannelStatus,
    saveMessagingCredentials,
    type MessagingChannel,
} from '@/lib/services/messaging';
import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * GET /api/settings/messaging
 * Returns channel status (configured / active) without exposing secrets
 */
async function GETHandler(request: NextRequest) {
    try {
        await getAuthenticatedUser();
        await requirePermission('manage_system');

        const { workspace } = await getWorkspaceOrThrow(request);
        const tenantId = String(workspace.id);

        const status = await getChannelStatus(tenantId);

        return NextResponse.json({ tenantId, channels: status });
    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error fetching messaging settings');
        else console.error('[API] Error fetching messaging settings:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json(
            { error: message },
            { status: message.includes('Forbidden') ? 403 : 500 }
        );
    }
}

/**
 * PUT /api/settings/messaging
 * Save credentials for a specific messaging channel
 * Body: { channel: 'whatsapp'|'sms'|'email', credentials: { ... }, isActive: boolean }
 */
async function PUTHandler(request: NextRequest) {
    try {
        await getAuthenticatedUser();
        await requirePermission('manage_system');

        const { workspace } = await getWorkspaceOrThrow(request);
        const tenantId = String(workspace.id);

        const bodyJson: unknown = await request.json().catch(() => ({}));
        const body = (bodyJson && typeof bodyJson === 'object' && !Array.isArray(bodyJson))
            ? bodyJson as Record<string, unknown>
            : {};

        const channel = typeof body.channel === 'string' ? body.channel : '';
        const credentials = (body.credentials && typeof body.credentials === 'object' && !Array.isArray(body.credentials))
            ? body.credentials as Record<string, unknown>
            : null;
        const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;

        const validChannels: MessagingChannel[] = ['whatsapp', 'sms', 'email'];
        if (!validChannels.includes(channel as MessagingChannel)) {
            return NextResponse.json(
                { error: `ערוץ לא תקין. ערוצים נתמכים: ${validChannels.join(', ')}` },
                { status: 400 }
            );
        }

        if (!credentials) {
            return NextResponse.json(
                { error: 'חסרים פרטי התחברות (credentials)' },
                { status: 400 }
            );
        }

        // Merge isActive into credentials
        const credsWithActive = { ...credentials, isActive };

        const result = await saveMessagingCredentials(tenantId, channel as MessagingChannel, credsWithActive);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'שגיאה בשמירת ההגדרות' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `הגדרות ${channel} נשמרו בהצלחה`,
            channel,
        });
    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error saving messaging settings');
        else console.error('[API] Error saving messaging settings:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json(
            { error: message },
            { status: message.includes('Forbidden') ? 403 : 500 }
        );
    }
}

export const GET = shabbatGuard(GETHandler);
export const PUT = shabbatGuard(PUTHandler);
