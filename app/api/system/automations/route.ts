import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import prisma from '@/lib/prisma';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const AI_DNA_KEY_AUTOMATIONS = '__automations_v1';

function readAiDnaObject(input: any): Record<string, any> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return input as Record<string, any>;
}

async function GETHandler(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', { status: 401 });

    await getAuthenticatedUser();
    await requirePermission('manage_system');

    const { workspace } = await getWorkspaceOrThrow(request);

    const row = await prisma.organization_settings.findUnique({
      where: { organization_id: String(workspace.id) },
      select: { ai_dna: true },
    });

    const aiDna = readAiDnaObject((row as any)?.ai_dna);
    const automations = Array.isArray(aiDna?.[AI_DNA_KEY_AUTOMATIONS]) ? aiDna[AI_DNA_KEY_AUTOMATIONS] : [];

    return apiSuccess({ organizationId: workspace.id, automations }, { status: 200 });
  } catch (e: any) {
    const msg = e?.message || 'Internal server error';
    if (e instanceof APIError) {
      return apiError(e, { status: e.status, message: e.message || 'Forbidden' });
    }
    const status = msg.includes('Forbidden') ? 403 : 500;
    return apiError(e, { status });
  }
}

async function PATCHHandler(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', { status: 401 });

    await getAuthenticatedUser();
    await requirePermission('manage_system');

    const { workspace } = await getWorkspaceOrThrow(request);

    const body = (await request.json().catch(() => null)) as { automations?: any[] } | null;
    const nextAutomations = Array.isArray(body?.automations) ? body?.automations : [];

    const existing = await prisma.organization_settings.findUnique({
      where: { organization_id: String(workspace.id) },
      select: { ai_dna: true },
    });

    const currentAiDna = readAiDnaObject((existing as any)?.ai_dna);
    const nextAiDna = {
      ...currentAiDna,
      [AI_DNA_KEY_AUTOMATIONS]: nextAutomations,
    };

    await prisma.organization_settings.upsert({
      where: { organization_id: String(workspace.id) },
      create: {
        organization_id: String(workspace.id),
        ai_dna: nextAiDna as any,
      },
      update: {
        ai_dna: nextAiDna as any,
        updated_at: new Date(),
      },
    });

    return apiSuccess({ organizationId: workspace.id, automations: nextAutomations }, { status: 200 });
  } catch (e: any) {
    const msg = e?.message || 'Internal server error';
    if (e instanceof APIError) {
      return apiError(e, { status: e.status, message: e.message || 'Forbidden' });
    }
    const status = msg.includes('Forbidden') ? 403 : 500;
    return apiError(e, { status });
  }
}

export const GET = shabbatGuard(GETHandler);
export const PATCH = shabbatGuard(PATCHHandler);
