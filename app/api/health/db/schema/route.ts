import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import prisma from '@/lib/prisma';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { getErrorMessage } from '@/lib/shared/unknown';

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
        return NextResponse.json({ ok: false, error: e.message || 'Missing x-org-id header' }, { status: e.status });
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
        const msg = getErrorMessage(e);
        if (code === 'P2022') {
          checks[name] = { ok: false, error: `[SchemaMismatch] ${name}: missing column (${msg})` };
          return;
        }
        if (code === 'P2021') {
          checks[name] = { ok: false, error: `[SchemaMismatch] ${name}: missing table (${msg})` };
          return;
        }
        checks[name] = { ok: false, error: msg };
      }
    };

    await runCheck('nexus_users.organization_id', () =>
      prisma.nexusUser.findFirst({ select: { id: true, organizationId: true } })
    );

    await runCheck('nexus_team_events.organization_id', () =>
      prisma.nexus_team_events.findFirst({ select: { id: true, organizationId: true } })
    );

    await runCheck('nexus_leave_requests.organization_id', () =>
      prisma.nexus_leave_requests.findFirst({ select: { id: true, organizationId: true } })
    );

    await runCheck('nexus_employee_invitation_links.organization_id', () =>
      prisma.nexus_employee_invitation_links.findFirst({ select: { id: true, organizationId: true } })
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
    return NextResponse.json({ ok: false, error: getErrorMessage(e) || 'Forbidden' }, { status: 403 });
  }
}

export const GET = shabbatGuard(GETHandler);
