import { apiError, apiSuccess } from '@/lib/server/api-response';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getAuthenticatedUser, hasPermission } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { APIError, getWorkspaceContextOrThrow } from '@/lib/server/api-workspace';
import { logAuditEvent } from '@/lib/audit';
import { AIService } from '@/lib/services/ai/AIService';

import { shabbatGuard } from '@/lib/api-shabbat-guard';


import { asObject, getErrorMessage } from '@/lib/shared/unknown';

const IS_PROD = process.env.NODE_ENV === 'production';

function toJsonObject(value: unknown): Prisma.InputJsonObject {
  const obj = asObject(value) ?? {};
  // Ensure the stored value is JSON-serializable (drops undefined / functions)
  const normalized: unknown = JSON.parse(JSON.stringify(obj));
  return (asObject(normalized) ?? {}) as Prisma.InputJsonObject;
}

async function GETHandler(
  _req: Request,
  { params }: { params: { orgSlug: string } }
) {
  try {
    await getAuthenticatedUser();

    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return apiError('Unauthorized', { status: 401 });
    }

    const resolvedParams = await Promise.resolve(params);
    const { orgSlug } = resolvedParams;
    if (!orgSlug) {
      return apiError('orgSlug is required', { status: 400 });
    }

    const { workspace } = await getWorkspaceContextOrThrow(_req, { params: resolvedParams });

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
      const safeMsg =
        e.status === 400
          ? 'Bad request'
          : e.status === 401
            ? 'Unauthorized'
            : e.status === 404
              ? 'Not found'
              : e.status === 500
                ? 'Internal server error'
                : 'Forbidden';
      return apiError(e, { status: e.status, message: IS_PROD ? safeMsg : e.message || safeMsg });
    }
    return apiError(e, { status: 500, message: 'Failed to load ai_dna' });
  }
}

async function PUTHandler(
  req: Request,
  { params }: { params: { orgSlug: string } }
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

    const resolvedParams = await Promise.resolve(params);
    const { orgSlug } = resolvedParams;
    if (!orgSlug) {
      return apiError('orgSlug is required', { status: 400 });
    }

    const { workspace } = await getWorkspaceContextOrThrow(req, { params: resolvedParams });

    const body: unknown = await req.json().catch(() => ({}));
    const bodyObj = asObject(body) ?? {};
    const aiDnaRaw = bodyObj.aiDna;
    const aiDna = toJsonObject(aiDnaRaw);

    if (aiDnaRaw === null || typeof aiDnaRaw !== 'object' || Array.isArray(aiDnaRaw)) {
      return apiError('aiDna must be a JSON object', { status: 400 });
    }

    await prisma.organization_settings.upsert({
      where: { organization_id: String(workspace.id) },
      create: {
        organization_id: String(workspace.id),
        ai_dna: aiDna,
        updated_at: new Date(),
      },
      update: {
        organization_id: String(workspace.id),
        ai_dna: aiDna,
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
      if (IS_PROD) {
        console.warn('[ai-dna] pgvector ingest skipped/failed (non-fatal)');
      } else {
        console.warn('[ai-dna] pgvector ingest skipped/failed (non-fatal)', {
          message: getErrorMessage(e) || String(e),
        });
      }
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
      const safeMsg =
        e.status === 400
          ? 'Bad request'
          : e.status === 401
            ? 'Unauthorized'
            : e.status === 404
              ? 'Not found'
              : e.status === 500
                ? 'Internal server error'
                : 'Forbidden';
      return apiError(e, { status: e.status, message: IS_PROD ? safeMsg : e.message || safeMsg });
    }
    return apiError(e, { status: 500, message: 'Failed to save ai_dna' });
  }
}

export const GET = shabbatGuard(GETHandler);

export const PUT = shabbatGuard(PUTHandler);
