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

    const [settings, usedAgg] = await withTenantIsolationContext(
      {
        source: 'api_admin_ai_credits',
        reason: 'GET',
        mode: 'global_admin',
        isSuperAdmin: true,
      },
      async () =>
        await prisma.$transaction([
          prisma.organization_settings.findUnique({
            where: { organization_id: String(organizationId) },
            select: { ai_quota_cents: true },
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

    const quota = settings?.ai_quota_cents ?? null;
    const used = usedAgg?._sum?.charged_cents ?? 0;
    const usedBig = BigInt(Number(used) || 0);
    const remaining = quota === null ? null : (() => {
      try {
        const q = typeof quota === 'bigint' ? quota : BigInt(Number(quota));
        const diff = q - usedBig;
        const zero = BigInt(0);
        return diff > zero ? diff : zero;
      } catch {
        return BigInt(0);
      }
    })();
    return apiSuccess({
      organizationId,
      status: {
        organization_id: organizationId,
        period_start: periodStart.toISOString(),
        quota_cents: quota === null ? null : String(quota),
        used_cents: String(usedBig),
        remaining_cents: remaining === null ? null : String(remaining),
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

    const out = await withTenantIsolationContext(
      {
        source: 'api_admin_ai_credits',
        reason: 'POST',
        mode: 'global_admin',
        isSuperAdmin: true,
      },
      async () =>
        await prisma.$transaction(async (tx) => {
          const existing = await tx.organization_settings.findUnique({
            where: { organization_id: String(organizationId) },
            select: { ai_quota_cents: true },
          });

          const current =
            existing?.ai_quota_cents == null
              ? BigInt(0)
              : typeof existing.ai_quota_cents === 'bigint'
                ? existing.ai_quota_cents
                : BigInt(Number(existing.ai_quota_cents));

          const next = current + BigInt(deltaCents);
          const zero = BigInt(0);
          const clamped = next < zero ? zero : next;

          await tx.organization_settings.upsert({
            where: { organization_id: String(organizationId) },
            create: {
              organization_id: String(organizationId),
              ai_dna: {},
              ai_quota_cents: clamped,
              updated_at: new Date(),
            },
            update: {
              organization_id: String(organizationId),
              ai_quota_cents: clamped,
              updated_at: new Date(),
            },
          });

          return { nextQuotaCents: clamped };
        })
    );

    return apiSuccess({ organizationId, deltaCents, nextQuotaCents: String(out.nextQuotaCents) });
  } catch (e: unknown) {
    const msg = getErrorMessage(e);
    const status = msg.toLowerCase().includes('forbidden') ? 403 : msg.toLowerCase().includes('unauthorized') ? 401 : 500;
    const safeMsg = status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'Internal server error';
    return apiError(IS_PROD ? safeMsg : msg || safeMsg, { status });
  }
}

export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
