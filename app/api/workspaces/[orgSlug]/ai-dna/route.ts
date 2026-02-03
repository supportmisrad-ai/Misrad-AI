import { apiError, apiSuccess } from '@/lib/server/api-response';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser, hasPermission } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { APIError, getWorkspaceContextOrThrow } from '@/lib/server/api-workspace';
import { logAuditEvent } from '@/lib/audit';
import { AIService } from '@/lib/services/ai/AIService';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  const obj = asObject(error);
  const msg = obj?.message;
  return typeof msg === 'string' ? msg : '';
}

async function GETHandler(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  try {
    await getAuthenticatedUser();

    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return apiError('Unauthorized', { status: 401 });
    }

    const { orgSlug } = await params;
    if (!orgSlug) {
      return apiError('orgSlug is required', { status: 400 });
    }

    const { workspace } = await getWorkspaceContextOrThrow(_req, { params });

    const data = await prisma.organization_settings.findUnique({
      where: { organization_id: String(workspace.id) },
      select: { ai_dna: true },
    });

    await logAuditEvent('data.read', 'organization_settings.ai_dna', {
      details: {
        orgSlug,
        organizationId: workspace.id,
      },
    });

    const dataObj = asObject(data);
    const aiDna = asObject(dataObj?.ai_dna) ?? {};

    return apiSuccess({ aiDna });
  } catch (e: unknown) {
    if (e instanceof APIError) {
      return apiError(e.message || 'Forbidden', { status: e.status });
    }
    return apiError(e, { status: 500, message: 'Failed to load ai_dna' });
  }
}

async function PUTHandler(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  try {
    await getAuthenticatedUser();

    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return apiError('Unauthorized', { status: 401 });
    }

    const canManage = await hasPermission('manage_system');
    if (!canManage) {
      return apiError('Forbidden', { status: 403 });
    }

    const { orgSlug } = await params;
    if (!orgSlug) {
      return apiError('orgSlug is required', { status: 400 });
    }

    const { workspace } = await getWorkspaceContextOrThrow(req, { params });

    const body: unknown = await req.json().catch(() => ({}));
    const bodyObj = asObject(body) ?? {};
    const aiDnaRaw = bodyObj.aiDna;
    const aiDna = asObject(aiDnaRaw) ?? {};

    if (aiDnaRaw === null || typeof aiDnaRaw !== 'object' || Array.isArray(aiDnaRaw)) {
      return apiError('aiDna must be a JSON object', { status: 400 });
    }

    await prisma.organization_settings.upsert({
      where: { organization_id: String(workspace.id) },
      create: {
        organization_id: String(workspace.id),
        ai_dna: aiDna as any,
        updated_at: new Date(),
      },
      update: {
        ai_dna: aiDna as any,
        updated_at: new Date(),
      },
    });

    try {
      const ai = AIService.getInstance();
      await ai.ingestText({
        featureKey: 'ai.memory.dna_ingest',
        organizationId: workspace.id,
        userId: clerkUserId,
        moduleId: 'global',
        docKey: `org:${workspace.id}:ai_dna`,
        text: JSON.stringify(aiDna || {}),
        isPublicInOrg: true,
        metadata: {
          source: 'organization_settings.ai_dna',
          kind: 'dna',
        },
      });
    } catch (e: unknown) {
      console.warn('[ai-dna] pgvector ingest skipped/failed (non-fatal)', {
        message: getErrorMessage(e) || String(e),
      });
    }

    await logAuditEvent('data.write', 'organization_settings.ai_dna', {
      details: {
        orgSlug,
        organizationId: workspace.id,
        updatedBy: clerkUserId,
      },
    });

    return apiSuccess({ ok: true });
  } catch (e: unknown) {
    if (e instanceof APIError) {
      return apiError(e.message || 'Forbidden', { status: e.status });
    }
    return apiError(e, { status: 500, message: 'Failed to save ai_dna' });
  }
}

export const GET = shabbatGuard(GETHandler);

export const PUT = shabbatGuard(PUTHandler);
