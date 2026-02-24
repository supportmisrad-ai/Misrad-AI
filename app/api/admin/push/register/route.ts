import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { getErrorMessage } from '@/lib/shared/unknown';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/push/register
 * Register an FCM push token for admin notifications.
 * Only super admins can register tokens.
 */
export async function POST(req: NextRequest) {
  try {
    const clerk = await currentUser();
    if (!clerk?.id) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = clerk.publicMetadata?.isSuperAdmin === true;
    if (!isSuperAdmin) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json() as Record<string, unknown>;
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const platform = typeof body.platform === 'string' ? body.platform.trim() : 'android';

    if (!token) {
      return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 400 });
    }

    // Store token in system_settings.system_flags JSON field (global row where tenant_id is null)
    type PushTokenEntry = { token: string; platform: string; clerkUserId: string; registeredAt: string };
    let existingTokens: PushTokenEntry[] = [];

    try {
      // Find the global system_settings row (tenant_id = null)
      const settings = await prisma.system_settings.findFirst({
        where: { tenant_id: null },
        select: { id: true, system_flags: true },
      });

      if (settings?.system_flags && typeof settings.system_flags === 'object') {
        const flags = settings.system_flags as Record<string, unknown>;
        const stored = flags.admin_push_tokens;
        if (Array.isArray(stored)) {
          existingTokens = stored as PushTokenEntry[];
        }
      }

      // Remove old entries for this clerk user, then add new one
      existingTokens = existingTokens.filter((t) => t.clerkUserId !== clerk.id);
      existingTokens.push({
        token,
        platform,
        clerkUserId: clerk.id,
        registeredAt: new Date().toISOString(),
      });

      if (settings) {
        const currentFlags = (settings.system_flags && typeof settings.system_flags === 'object')
          ? settings.system_flags as Record<string, unknown>
          : {};
        await prisma.system_settings.update({
          where: { id: settings.id },
          data: {
            system_flags: { ...currentFlags, admin_push_tokens: existingTokens },
          },
        });
      } else {
        await prisma.system_settings.create({
          data: {
            system_flags: { admin_push_tokens: existingTokens },
          },
        });
      }
    } catch (storeErr) {
      console.warn('[AdminPush] Could not persist push token:', getErrorMessage(storeErr));
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error('[AdminPush] Registration error:', getErrorMessage(err));
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}
