import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requireSuperAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getOrgKeyOrThrow, getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { asObject, getErrorMessage as getUnknownErrorMessage } from '@/lib/shared/unknown';
import { AIService } from '@/lib/services/ai/AIService';
export const runtime = 'nodejs';

type UnknownRecord = Record<string, unknown>;
type FeatureSettingsFindManyArgs = NonNullable<Parameters<typeof prisma.ai_feature_settings.findMany>[0]>;
type FeatureSettingsWhere = FeatureSettingsFindManyArgs['where'];
type FeatureSettingsFindFirstArgs = NonNullable<Parameters<typeof prisma.ai_feature_settings.findFirst>[0]>;
type FeatureSettingsFindFirstWhere = FeatureSettingsFindFirstArgs['where'];
type FeatureSettingsCreateArgs = NonNullable<Parameters<typeof prisma.ai_feature_settings.create>[0]>;
type FeatureSettingsCreateData = FeatureSettingsCreateArgs['data'];
type FeatureSettingsUpdateArgs = NonNullable<Parameters<typeof prisma.ai_feature_settings.update>[0]>;
type FeatureSettingsUpdateData = FeatureSettingsUpdateArgs['data'];
type FeatureSettingsDeleteManyArgs = NonNullable<Parameters<typeof prisma.ai_feature_settings.deleteMany>[0]>;
type FeatureSettingsDeleteManyWhere = FeatureSettingsDeleteManyArgs['where'];


function getErrorStatusFromMessage(msg: string): number {
  const lower = String(msg || '').toLowerCase();
  if (lower.includes('forbidden')) return 403;
  if (lower.includes('unauthorized')) return 401;
  return 500;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

type FeatureSettingsRow = {
  id: string;
  organization_id: string | null;
  feature_key: string;
  enabled: boolean;
  primary_provider: string;
  primary_model: string;
  fallback_provider: string | null;
  fallback_model: string | null;
  base_prompt?: string | null;
  reserve_cost_cents: number;
  timeout_ms: number;
  created_at: string;
  updated_at: string;
};

function toIso(value: unknown): string {
  try {
    if (value instanceof Date) return value.toISOString();
    const d = new Date(String(value || ''));
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function toRow(r: {
  id: string;
  organization_id: string | null;
  feature_key: string;
  enabled: boolean;
  primary_provider: string;
  primary_model: string;
  fallback_provider: string | null;
  fallback_model: string | null;
  base_prompt: string | null;
  reserve_cost_cents: number | null;
  timeout_ms: number | null;
  created_at: Date | null;
  updated_at: Date | null;
}): FeatureSettingsRow {
  return {
    id: String(r.id || ''),
    organization_id: r.organization_id ? String(r.organization_id) : null,
    feature_key: String(r.feature_key || ''),
    enabled: Boolean(r.enabled),
    primary_provider: String(r.primary_provider || ''),
    primary_model: String(r.primary_model || ''),
    fallback_provider: r.fallback_provider ? String(r.fallback_provider) : null,
    fallback_model: r.fallback_model ? String(r.fallback_model) : null,
    base_prompt: r.base_prompt != null ? String(r.base_prompt) : null,
    reserve_cost_cents: Number(r.reserve_cost_cents ?? 0) || 0,
    timeout_ms: Number(r.timeout_ms ?? 0) || 0,
    created_at: toIso(r.created_at),
    updated_at: toIso(r.updated_at),
  };
}

async function GETHandler(req: Request) {
  try {
    await requireSuperAdmin();

    const orgKey = getOrgKeyOrThrow(req);
    const { workspaceId } = await getWorkspaceByOrgKeyOrThrow(orgKey);
    const organizationId = String(workspaceId);

    const url = new URL(req.url);
    const featureKeyQuery = (url.searchParams.get('q') || '').trim();
    const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit') || 200)));

    const where: FeatureSettingsWhere = {};
    where.organization_id = String(organizationId);
    if (featureKeyQuery) {
      where.feature_key = { contains: String(featureKeyQuery), mode: 'insensitive' };
    }

    const rows = await prisma.ai_feature_settings.findMany({
      where,
      orderBy: { feature_key: 'asc' },
      take: limit,
    });

    return apiSuccess({ rows: (rows || []).map(toRow) });
  } catch (e: unknown) {
    const msg = getUnknownErrorMessage(e);
    const status = getErrorStatusFromMessage(msg);
    return apiError(e, { status });
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

    const featureKey = asString(bodyObj.feature_key).trim();
    if (!featureKey) return apiError('feature_key is required', { status: 400 });

    if (bodyObj.organization_id != null) {
      return apiError('organization_id must be provided via x-org-id header', { status: 400 });
    }

    const patch: FeatureSettingsUpdateData = {
      organization_id: String(organizationId),
      feature_key: featureKey,
      enabled: bodyObj.enabled !== undefined ? Boolean(bodyObj.enabled) : true,
      primary_provider: asString(bodyObj.primary_provider) || 'google',
      primary_model: asString(bodyObj.primary_model) || 'gemini-2.0-pro',
      fallback_provider: bodyObj.fallback_provider ? asString(bodyObj.fallback_provider) : null,
      fallback_model: bodyObj.fallback_model ? asString(bodyObj.fallback_model) : null,
      base_prompt:
        bodyObj.base_prompt !== undefined
          ? bodyObj.base_prompt === null
            ? null
            : String(bodyObj.base_prompt)
          : null,
      reserve_cost_cents: Number.isFinite(Number(bodyObj.reserve_cost_cents))
        ? Math.max(0, Math.floor(Number(bodyObj.reserve_cost_cents)))
        : 25,
      timeout_ms: Number.isFinite(Number(bodyObj.timeout_ms)) ? Math.max(1000, Math.floor(Number(bodyObj.timeout_ms))) : 30000,
      updated_at: new Date(),
    };

    const where: FeatureSettingsFindFirstWhere = {
      feature_key: featureKey,
      organization_id: String(organizationId),
    };

    const existing = await prisma.ai_feature_settings.findFirst({
      where,
      select: { id: true },
    });

    const row = existing?.id
      ? await prisma.ai_feature_settings.update({
          where: { id: String(existing.id) },
          data: patch,
        })
      : await prisma.ai_feature_settings.create({
          data: { ...(patch as FeatureSettingsCreateData), created_at: new Date() },
        });

    AIService.clearCache('features');
    return apiSuccess({ row: toRow(row) });
  } catch (e: unknown) {
    const msg = getUnknownErrorMessage(e);
    const status = getErrorStatusFromMessage(msg);
    return apiError(e, { status });
  }
}

async function DELETEHandler(req: Request) {
  try {
    await requireSuperAdmin();

    const orgKey = getOrgKeyOrThrow(req);
    const { workspaceId } = await getWorkspaceByOrgKeyOrThrow(orgKey);
    const organizationId = String(workspaceId);

    const url = new URL(req.url);
    const featureKey = (url.searchParams.get('featureKey') || '').trim();
    const scope = (url.searchParams.get('scope') || '').trim().toLowerCase();

    if (!featureKey) return apiError('featureKey is required', { status: 400 });

    const where: FeatureSettingsDeleteManyWhere = { feature_key: featureKey };

    where.organization_id = scope === 'global' ? null : String(organizationId);

    await prisma.ai_feature_settings.deleteMany({ where });

    AIService.clearCache('features');
    return apiSuccess({ ok: true });
  } catch (e: unknown) {
    const msg = getUnknownErrorMessage(e);
    const status = getErrorStatusFromMessage(msg);
    return apiError(e, { status });
  }
}

export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);

export const DELETE = shabbatGuard(DELETEHandler);
