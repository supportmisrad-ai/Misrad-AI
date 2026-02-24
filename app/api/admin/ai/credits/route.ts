import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requireSuperAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getOrgKeyOrThrow, getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { asObject, getErrorMessage } from '@/lib/shared/unknown';
export const runtime = 'nodejs';

const IS_PROD = process.env.NODE_ENV === 'production';


async function GETHandler(req: Request) {
  try {
    await requireSuperAdmin();

    const orgKey = getOrgKeyOrThrow(req);
    const { workspaceId } = await getWorkspaceByOrgKeyOrThrow(orgKey);
    const organizationId = String(workspaceId);

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [org, usedAgg] = await withTenantIsolationContext(
      {
        source: 'api_admin_ai_credits',
        reason: 'GET',
        mode: 'global_admin',
        isSuperAdmin: true,
      },
      async () =>
        await prisma.$transaction([
          prisma.organization.findUnique({
            where: { id: String(organizationId) },
            select: { ai_credits_balance_cents: true },
          }),
          prisma.ai_usage_logs.aggregate({
            where: {
              organization_id: String(organizationId),
              status: 'success',
              created_at: { gte: periodStart },
            },
            _sum: { charged_cents: true },
          }),
        ])
    );

    const balance = org?.ai_credits_balance_cents ?? BigInt(0);
    const balanceBig = typeof balance === 'bigint' ? balance : BigInt(Number(balance) || 0);
    const used = usedAgg?._sum?.charged_cents ?? 0;
    const usedBig = BigInt(Number(used) || 0);

    return apiSuccess({
      organizationId,
      status: {
        organization_id: organizationId,
        period_start: periodStart.toISOString(),
        balance_cents: String(balanceBig),
        used_this_month_cents: String(usedBig),
      },
    });
  } catch (e: unknown) {
    const msg = getErrorMessage(e);
    const status = msg.toLowerCase().includes('forbidden') ? 403 : msg.toLowerCase().includes('unauthorized') ? 401 : 500;
    const safeMsg = status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'Internal server error';
    return apiError(IS_PROD ? safeMsg : msg || safeMsg, { status });
  }
}

async function POSTHandler(req: Request) {
  try {
    await requireSuperAdmin();

    const orgKey = getOrgKeyOrThrow(req);
    const { workspaceId } = await getWorkspaceByOrgKeyOrThrow(orgKey);
    const organizationId = String(workspaceId);

    const body: unknown = await req.json().catch(() => ({}));
    const bodyObj = asObject(body) ?? {};
    const deltaCents = Math.floor(Number(bodyObj.deltaCents));

    if (bodyObj.organizationId != null) {
      return apiError('organizationId must be provided via x-org-id header', { status: 400 });
    }
    if (!Number.isFinite(deltaCents) || deltaCents === 0) {
      return apiError('deltaCents must be a non-zero number', { status: 400 });
    }

    const org = await withTenantIsolationContext(
      {
        source: 'api_admin_ai_credits',
        reason: 'POST',
        mode: 'global_admin',
        isSuperAdmin: true,
      },
      async () => {
        const existing = await prisma.organization.findUnique({
          where: { id: String(organizationId) },
          select: { ai_credits_balance_cents: true },
        });

        const current = (() => {
          const v = existing?.ai_credits_balance_cents;
          if (v == null) return BigInt(0);
          return typeof v === 'bigint' ? v : BigInt(Number(v) || 0);
        })();

        const next = current + BigInt(deltaCents);
        const zero = BigInt(0);
        const clamped = next < zero ? zero : next;

        await prisma.organization.update({
          where: { id: String(organizationId) },
          data: { ai_credits_balance_cents: clamped },
        });

        return { balance_cents: clamped };
      }
    );

    return apiSuccess({ organizationId, deltaCents, balance_cents: String(org.balance_cents) });
  } catch (e: unknown) {
    const msg = getErrorMessage(e);
    const status = msg.toLowerCase().includes('forbidden') ? 403 : msg.toLowerCase().includes('unauthorized') ? 401 : 500;
    const safeMsg = status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'Internal server error';
    return apiError(IS_PROD ? safeMsg : msg || safeMsg, { status });
  }
}

export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
