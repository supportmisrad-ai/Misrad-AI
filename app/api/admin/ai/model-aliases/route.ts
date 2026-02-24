import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requireSuperAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getOrgKeyOrThrow, getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';
import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { asObject } from '@/lib/shared/unknown';
import { AIService } from '@/lib/services/ai/AIService';

export const runtime = 'nodejs';

type ModelAliasRow = {
  id: string;
  provider: string;
  model: string;
  organization_id: string | null;
  display_name: string;
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
  provider: string;
  model: string;
  organization_id: string | null;
  display_name: string;
  created_at: Date | null;
  updated_at: Date | null;
}): ModelAliasRow {
  return {
    id: String(r.id || ''),
    provider: String(r.provider || ''),
    model: String(r.model || ''),
    organization_id: r.organization_id ? String(r.organization_id) : null,
    display_name: String(r.display_name || ''),
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
    const scope = (url.searchParams.get('scope') || 'org').trim().toLowerCase();

    const where = scope === 'global' 
      ? { organization_id: null }
      : { organization_id: String(organizationId) };

    const rows = await prisma.ai_model_aliases.findMany({
      where,
      orderBy: [{ provider: 'asc' }, { model: 'asc' }],
    });

    return apiSuccess({ rows: (rows || []).map(toRow) });
  } catch (e: unknown) {
    return apiError(e, { status: 500 });
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

    const provider = String(bodyObj.provider || '').trim();
    if (!provider) return apiError('provider is required', { status: 400 });

    const model = String(bodyObj.model || '').trim();
    if (!model) return apiError('model is required', { status: 400 });

    const displayName = String(bodyObj.display_name || '').trim();
    if (!displayName) return apiError('display_name is required', { status: 400 });

    const scope = String(bodyObj.scope || 'org').trim().toLowerCase();
    const targetOrgId = scope === 'global' ? null : String(organizationId);

    const existing = await prisma.ai_model_aliases.findFirst({
      where: {
        provider,
        model,
        organization_id: targetOrgId,
      },
      select: { id: true },
    });

    const row = existing?.id
      ? await prisma.ai_model_aliases.update({
          where: { id: String(existing.id) },
          data: {
            display_name: displayName,
            updated_at: new Date(),
          },
        })
      : await prisma.ai_model_aliases.create({
          data: {
            provider,
            model,
            organization_id: targetOrgId,
            display_name: displayName,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });

    AIService.clearCache('models');
    return apiSuccess({ row: toRow(row) });
  } catch (e: unknown) {
    return apiError(e, { status: 500 });
  }
}

async function DELETEHandler(req: Request) {
  try {
    await requireSuperAdmin();

    const url = new URL(req.url);
    const id = (url.searchParams.get('id') || '').trim();
    if (!id) return apiError('id is required', { status: 400 });

    await prisma.ai_model_aliases.delete({ where: { id } });

    AIService.clearCache('models');
    return apiSuccess({ ok: true });
  } catch (e: unknown) {
    return apiError(e, { status: 500 });
  }
}

export const GET = shabbatGuard(GETHandler);
export const POST = shabbatGuard(POSTHandler);
export const DELETE = shabbatGuard(DELETEHandler);
