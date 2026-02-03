import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requireSuperAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const runtime = 'nodejs';

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  const obj = asObject(error);
  const msg = obj?.message;
  return typeof msg === 'string' ? msg : String(error ?? '');
}

type AdjustCreditsBody = {
  organizationId: string;
  deltaCents: number;
};

async function GETHandler(req: Request) {
  try {
    await requireSuperAdmin();

    const url = new URL(req.url);
    const organizationId = String(url.searchParams.get('organizationId') || '').trim();
    if (!organizationId) return apiError('organizationId is required', { status: 400 });

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [settings, usedAgg] = await Promise.all([
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
    ]);

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
    return apiError(e, { status });
  }
}

async function POSTHandler(req: Request) {
  try {
    await requireSuperAdmin();

    const body: unknown = await req.json().catch(() => ({}));
    const bodyObj = asObject(body) ?? {};
    const organizationId = String(bodyObj.organizationId ?? '').trim();
    const deltaCents = Math.floor(Number(bodyObj.deltaCents));

    if (!organizationId) return apiError('organizationId is required', { status: 400 });
    if (!Number.isFinite(deltaCents) || deltaCents === 0) {
      return apiError('deltaCents must be a non-zero number', { status: 400 });
    }

    const out = await prisma.$transaction(async (tx) => {
      const existing = await tx.organization_settings.findUnique({
        where: { organization_id: String(organizationId) },
        select: { ai_quota_cents: true },
      });

      const current = existing?.ai_quota_cents == null ? BigInt(0) : (typeof existing.ai_quota_cents === 'bigint'
        ? existing.ai_quota_cents
        : BigInt(Number(existing.ai_quota_cents)));

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
          ai_quota_cents: clamped,
          updated_at: new Date(),
        },
      });

      return { nextQuotaCents: clamped };
    });

    return apiSuccess({ organizationId, deltaCents, nextQuotaCents: String(out.nextQuotaCents) });
  } catch (e: unknown) {
    const msg = getErrorMessage(e);
    const status = msg.toLowerCase().includes('forbidden') ? 403 : msg.toLowerCase().includes('unauthorized') ? 401 : 500;
    return apiError(e, { status });
  }
}

export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
