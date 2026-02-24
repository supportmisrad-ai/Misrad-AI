import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requireSuperAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getOrgKeyOrThrow, getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';
import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { asObject, getErrorMessage as getUnknownErrorMessage } from '@/lib/shared/unknown';
import { encrypt } from '@/lib/encryption';
import { AIService } from '@/lib/services/ai/AIService';

export const runtime = 'nodejs';

type ProviderKeyRow = {
  id: string;
  provider: string;
  organization_id: string | null;
  api_key_masked: string;
  enabled: boolean;
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

function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '***';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

function toRow(r: {
  id: string;
  provider: string;
  organization_id: string | null;
  api_key: string;
  enabled: boolean;
  created_at: Date | null;
  updated_at: Date | null;
}): ProviderKeyRow {
  return {
    id: String(r.id || ''),
    provider: String(r.provider || ''),
    organization_id: r.organization_id ? String(r.organization_id) : null,
    api_key_masked: maskApiKey(String(r.api_key || '')),
    enabled: Boolean(r.enabled),
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

    const rows = await prisma.ai_provider_keys.findMany({
      where,
      orderBy: { provider: 'asc' },
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

    const apiKey = String(bodyObj.api_key || '').trim();
    const isKeepSentinel = apiKey === '__KEEP__';
    if (!apiKey && !isKeepSentinel) return apiError('api_key is required', { status: 400 });

    const scope = String(bodyObj.scope || 'org').trim().toLowerCase();
    const targetOrgId = scope === 'global' ? null : String(organizationId);

    const existing = await prisma.ai_provider_keys.findFirst({
      where: {
        provider,
        organization_id: targetOrgId,
      },
      select: { id: true },
    });

    if (isKeepSentinel && !existing?.id) {
      return apiError('Cannot toggle a key that does not exist yet', { status: 400 });
    }

    let row;
    if (existing?.id && isKeepSentinel) {
      row = await prisma.ai_provider_keys.update({
        where: { id: String(existing.id) },
        data: {
          enabled: bodyObj.enabled !== undefined ? Boolean(bodyObj.enabled) : true,
          updated_at: new Date(),
        },
      });
    } else if (existing?.id) {
      const encryptedKey = await encrypt(apiKey);
      row = await prisma.ai_provider_keys.update({
        where: { id: String(existing.id) },
        data: {
          api_key: encryptedKey,
          enabled: bodyObj.enabled !== undefined ? Boolean(bodyObj.enabled) : true,
          updated_at: new Date(),
        },
      });
    } else {
      const encryptedKey = await encrypt(apiKey);
      row = await prisma.ai_provider_keys.create({
        data: {
          provider,
          organization_id: targetOrgId,
          api_key: encryptedKey,
          enabled: bodyObj.enabled !== undefined ? Boolean(bodyObj.enabled) : true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    }

    AIService.clearCache('keys');
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

    await prisma.ai_provider_keys.delete({ where: { id } });

    AIService.clearCache('keys');
    return apiSuccess({ ok: true });
  } catch (e: unknown) {
    return apiError(e, { status: 500 });
  }
}

export const GET = shabbatGuard(GETHandler);
export const POST = shabbatGuard(POSTHandler);
export const DELETE = shabbatGuard(DELETEHandler);
