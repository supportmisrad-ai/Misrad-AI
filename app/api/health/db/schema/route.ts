import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import prisma from '@/lib/prisma';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { getErrorMessage } from '@/lib/shared/unknown';

const IS_PROD = process.env.NODE_ENV === 'production';

function getErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  const rec = error as Record<string, unknown>;
  const code = rec.code ?? (rec.meta && typeof rec.meta === 'object' ? (rec.meta as Record<string, unknown>).code : undefined);
  return typeof code === 'string' ? code : '';
}

async function GETHandler(request: NextRequest) {
  try {
    await requireSuperAdmin();

    let workspaceId = '';
    try {
      const ws = await getWorkspaceOrThrow(request);
      workspaceId = String(ws.workspaceId || '').trim();
    } catch (e: unknown) {
      if (e instanceof APIError) {
        const safeMsg =
          e.status === 400
            ? 'Bad request'
            : e.status === 401
              ? 'Unauthorized'
              : e.status === 404
                ? 'Not found'
                : e.status === 500
                  ? 'Internal server error'
                  : 'Forbidden';
        return NextResponse.json(
          { ok: false, error: IS_PROD ? safeMsg : e.message || safeMsg },
          { status: e.status }
        );
      }
      return NextResponse.json({ ok: false, error: 'Missing x-org-id header' }, { status: 400 });
    }

    const checks: Record<string, { ok: boolean; error?: string }> = {};

    const runCheck = async (name: string, fn: () => PromiseLike<unknown>) => {
      try {
        await fn();
        checks[name] = { ok: true };
      } catch (e: unknown) {
        const code = getErrorCode(e);
        const msg = getErrorMessage(e) || 'Unknown error';
        if (code === 'P2022') {
          checks[name] = {
            ok: false,
            error: IS_PROD ? `[SchemaMismatch] ${name}: missing column` : `[SchemaMismatch] ${name}: missing column (${msg})`,
          };
          return;
        }
        if (code === 'P2021') {
          checks[name] = {
            ok: false,
            error: IS_PROD ? `[SchemaMismatch] ${name}: missing table` : `[SchemaMismatch] ${name}: missing table (${msg})`,
          };
          return;
        }
        checks[name] = { ok: false, error: IS_PROD ? 'Internal server error' : msg };
      }
    };

    await runCheck('nexus_users.organization_id', () =>
      prisma.nexusUser.findFirst({ where: { organizationId: workspaceId }, select: { id: true, organizationId: true } })
    );

    await runCheck('nexus_team_events.organization_id', () =>
      prisma.nexus_team_events.findFirst({ where: { organizationId: workspaceId }, select: { id: true, organizationId: true } })
    );

    await runCheck('nexus_leave_requests.organization_id', () =>
      prisma.nexus_leave_requests.findFirst({ where: { organizationId: workspaceId }, select: { id: true, organizationId: true } })
    );

    await runCheck('nexus_employee_invitation_links.organization_id', () =>
      prisma.nexus_employee_invitation_links.findFirst({ where: { organizationId: workspaceId }, select: { id: true, organizationId: true } })
    );

    await runCheck('misrad_notifications.is_read', () =>
      prisma.misradNotification.findFirst({
        where: { organization_id: workspaceId },
        select: { id: true, organization_id: true, recipient_id: true, isRead: true },
      })
    );

    const hasFailures = Object.values(checks).some((c) => !c.ok);
    if (hasFailures) {
      return NextResponse.json(
        {
          ok: false,
          error: '[SchemaMismatch] Database schema check failed',
          checks,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, checks, timestamp: new Date().toISOString() });
  } catch (e: unknown) {
    const msg = getErrorMessage(e) || 'Internal server error';
    const status = msg.toLowerCase().includes('unauthorized') ? 401 : msg.toLowerCase().includes('forbidden') ? 403 : 500;
    const safeMsg = status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'Internal server error';
    return NextResponse.json({ ok: false, error: IS_PROD ? safeMsg : msg }, { status });
  }
}

export const GET = shabbatGuard(GETHandler);
