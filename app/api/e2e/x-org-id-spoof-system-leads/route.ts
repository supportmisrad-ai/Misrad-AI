import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { blockE2eInProduction } from '@/lib/api-e2e-guard';

import prisma from '@/lib/prisma';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';
import { requireOrganizationId } from '@/lib/tenant-isolation';
import { getOrgKeyOrThrow, getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';
import { asObject, getErrorMessage } from '@/lib/server/workspace-access/utils';

export const dynamic = 'force-dynamic';

const IS_PROD = process.env.NODE_ENV === 'production';

export async function GET(req: Request) {
  const blocked = blockE2eInProduction();
  if (blocked) return blocked;

  try {
    const expected = process.env.E2E_API_KEY;
    const provided = req.headers.get('x-e2e-key');

    if (!expected || !provided || provided !== expected) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'NoAuthSession' }, { status: 401 });
    }

    const orgKey = getOrgKeyOrThrow(req);
    const { workspaceId } = await getWorkspaceByOrgKeyOrThrow(String(orgKey));
    const organizationId = requireOrganizationId('e2e_x_org_id_spoof_system_leads', workspaceId);

    const leads = await withTenantIsolationContext(
      {
        suppressReporting: true,
        source: 'e2e_x_org_id_spoof_system_leads',
      },
      async () =>
        prisma.systemLead.findMany({
          where: { organizationId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, organizationId: true, name: true },
        })
    );

    return NextResponse.json({ ok: true, organizationId, leads }, { status: 200 });
  } catch (e: unknown) {
    const obj = asObject(e) ?? {};
    const status = typeof obj.status === 'number' ? obj.status : 500;
    const safeMsg = 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        blocked: true,
        error: IS_PROD ? safeMsg : getErrorMessage(e) || safeMsg,
      },
      { status }
    );
  }
}
