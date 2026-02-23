import { apiError, apiSuccess } from '@/lib/server/api-response';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getAuthenticatedUser, hasPermission } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { APIError, getWorkspaceContextOrThrow } from '@/lib/server/api-workspace';
import { logAuditEvent } from '@/lib/audit';
import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { asObject, getErrorMessage } from '@/lib/shared/unknown';

const IS_PROD = process.env.NODE_ENV === 'production';

function toJsonObject(value: unknown): Prisma.InputJsonObject {
  const obj = asObject(value) ?? {};
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
      select: { ai_sales_context: true },
    });

    await logAuditEvent('data.read', 'organization_settings.ai_sales_context', {
      details: {
        orgSlug,
        organizationId: workspace.id,
      },
    });

    const dataObj = asObject(data);
    const aiSalesContext = asObject(dataObj?.ai_sales_context) ?? {};

    return apiSuccess({ aiSalesContext });
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
    return apiError(e, { status: 500, message: 'Failed to load ai_sales_context' });
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
    const aiSalesContextRaw = bodyObj.aiSalesContext;
    const aiSalesContext = toJsonObject(aiSalesContextRaw);

    if (aiSalesContextRaw === null || typeof aiSalesContextRaw !== 'object' || Array.isArray(aiSalesContextRaw)) {
      return apiError('aiSalesContext must be a JSON object', { status: 400 });
    }

    await prisma.organization_settings.upsert({
      where: { organization_id: String(workspace.id) },
      create: {
        organization_id: String(workspace.id),
        ai_sales_context: aiSalesContext,
        updated_at: new Date(),
      },
      update: {
        ai_sales_context: aiSalesContext,
        updated_at: new Date(),
      },
    });

    await logAuditEvent('data.write', 'organization_settings.ai_sales_context', {
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
    return apiError(e, { status: 500, message: 'Failed to save ai_sales_context' });
  }
}

export const GET = shabbatGuard(GETHandler);

export const PUT = shabbatGuard(PUTHandler);
