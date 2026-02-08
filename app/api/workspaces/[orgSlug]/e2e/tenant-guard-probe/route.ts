import { NextResponse } from 'next/server';

import prisma from '@/lib/prisma';
import { enterTenantIsolationContext } from '@/lib/prisma-tenant-guard';
import { resolveOrganizationForWorkspaceAccessApi } from '@/lib/server/workspace-access/org-resolve';
import { decodeMaybeRepeatedly, decodeOnce, getErrorMessage, getErrorStatus, isUuidLike } from '@/lib/server/workspace-access/utils';

function isAuthorizedE2e(req: Request): boolean {
  const expected = String(process.env.E2E_API_KEY || '').trim();
  const provided = String(req.headers.get('x-e2e-key') || '').trim();
  return Boolean(expected && provided && provided === expected);
}

async function GETHandler(
  _req: Request,
  ctx?: {
    params?: { orgSlug?: string };
  }
) {
  try {
    if (String(process.env.IS_E2E_TESTING || '').toLowerCase() !== 'true') {
      return NextResponse.json({ ok: false, blocked: false, error: 'Forbidden' }, { status: 403 });
    }

    if (!isAuthorizedE2e(_req)) {
      return NextResponse.json({ ok: false, blocked: false, error: 'Unauthorized' }, { status: 401 });
    }

    const rawOrgKey =
      String(_req.headers.get('x-org-id') || '').trim() ||
      String(ctx?.params?.orgSlug || '').trim();
    if (!rawOrgKey) {
      return NextResponse.json({ ok: false, blocked: false, error: 'Missing workspace context' }, { status: 400 });
    }

    const decodedOrgSlug = decodeMaybeRepeatedly(rawOrgKey);
    const decodedOnceOrgSlug = decodeOnce(rawOrgKey);

    let org: { id: string };
    try {
      org = await resolveOrganizationForWorkspaceAccessApi({
        orgSlug: rawOrgKey,
        decodedOrgSlug,
        decodedOnceOrgSlug,
      });
    } catch (e: unknown) {
      if (isUuidLike(decodedOrgSlug)) {
        org = { id: decodedOrgSlug };
      } else {
        const status = getErrorStatus(e) ?? 404;
        return NextResponse.json(
          {
            ok: false,
            blocked: false,
            error: getErrorMessage(e) || 'Organization not found',
          },
          { status }
        );
      }
    }

    enterTenantIsolationContext({
      source: 'api_workspaces_e2e_tenant_guard_probe',
      reason: 'GET',
      organizationId: String(org.id),
      suppressReporting: true,
    });

    try {
      await prisma.systemLead.findMany({});
      return NextResponse.json(
        {
          ok: false,
          blocked: false,
          error: 'Expected Prisma tenant guard to block unscoped query inside workspace flow, but it did not.',
        },
        { status: 200 }
      );
    } catch (e: unknown) {
      const msg = getErrorMessage(e) || 'Unknown error';
      const isTenantGuard = msg.includes('Tenant Guard Violation!');
      return NextResponse.json(
        {
          ok: isTenantGuard,
          blocked: isTenantGuard,
          error: msg,
        },
        { status: 500 }
      );
    }
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        blocked: false,
        error: getErrorMessage(e) || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const GET = GETHandler;
