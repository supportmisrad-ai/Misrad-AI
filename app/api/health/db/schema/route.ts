import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireSuperAdmin } from '@/lib/auth';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

async function GETHandler(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const supabase = createClient();

    let workspaceId = '';
    try {
      const ws = await getWorkspaceOrThrow(request);
      workspaceId = String(ws.workspaceId || '').trim();
    } catch (e: any) {
      if (e instanceof APIError) {
        return NextResponse.json({ ok: false, error: e.message || 'Missing x-org-id header' }, { status: e.status });
      }
      return NextResponse.json({ ok: false, error: 'Missing x-org-id header' }, { status: 400 });
    }

    const checks: Record<string, { ok: boolean; error?: string }> = {};

    const runCheck = async (name: string, fn: () => PromiseLike<any>) => {
      try {
        const res = await fn();
        const error = (res as any)?.error;
        if (error) {
          const code = String((error as any)?.code || '');
          const message = String((error as any)?.message || '');

          if (code === '42703') {
            checks[name] = { ok: false, error: `[SchemaMismatch] ${name}: missing column (${message})` };
            return;
          }

          if (code === '42P01' || message.includes('does not exist')) {
            checks[name] = { ok: false, error: `[SchemaMismatch] ${name}: missing table (${message})` };
            return;
          }

          checks[name] = { ok: false, error: `${code ? `${code} ` : ''}${message}`.trim() || 'Unknown error' };
          return;
        }

        checks[name] = { ok: true };
      } catch (e: any) {
        const msg = String(e?.message || e || 'Unknown error');
        checks[name] = { ok: false, error: msg };
      }
    };

    await runCheck('nexus_users.organization_id', () =>
      supabase.from('nexus_users').select('id, organization_id').limit(1)
    );

    await runCheck('nexus_team_events.organization_id', () =>
      supabase.from('nexus_team_events').select('id, organization_id').limit(1)
    );

    await runCheck('nexus_leave_requests.organization_id', () =>
      supabase.from('nexus_leave_requests').select('id, organization_id').limit(1)
    );

    await runCheck('nexus_employee_invitation_links.organization_id', () =>
      supabase.from('nexus_employee_invitation_links').select('id, organization_id').limit(1)
    );

    await runCheck('misrad_notifications.is_read', () =>
      supabase.from('misrad_notifications').select('id, organization_id, recipient_id, is_read').eq('organization_id', workspaceId).limit(1)
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
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Forbidden' }, { status: 403 });
  }
}

export const GET = shabbatGuard(GETHandler);
