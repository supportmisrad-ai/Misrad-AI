import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

import { asObject } from '@/lib/shared/unknown';
const AI_DNA_KEY_AUTOMATIONS = '__automations_v1';

function readAiDnaObject(input: unknown): Record<string, unknown> {
  return asObject(input) ?? {};
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

    const aiDna = readAiDnaObject(row?.ai_dna);
    const automations = Array.isArray(aiDna?.[AI_DNA_KEY_AUTOMATIONS]) ? aiDna[AI_DNA_KEY_AUTOMATIONS] : [];

    return apiSuccess({ organizationId: workspace.id, automations }, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : '';
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

    const bodyJson: unknown = await request.json().catch(() => null);
    const bodyObj = asObject(bodyJson);
    const nextAutomationsRaw = bodyObj?.automations;
    const nextAutomations = Array.isArray(nextAutomationsRaw) ? nextAutomationsRaw : [];

    const existing = await prisma.organization_settings.findUnique({
      where: { organization_id: String(workspace.id) },
      select: { ai_dna: true },
    });

    const currentAiDna = readAiDnaObject(existing?.ai_dna);
    const nextAiDna = {
      ...currentAiDna,
      [AI_DNA_KEY_AUTOMATIONS]: nextAutomations,
    };

    await prisma.organization_settings.upsert({
      where: { organization_id: String(workspace.id) },
      create: {
        organization_id: String(workspace.id),
        ai_dna: nextAiDna as Prisma.InputJsonValue,
      },
      update: {
        ai_dna: nextAiDna as Prisma.InputJsonValue,
        updated_at: new Date(),
      },
    });

    return apiSuccess({ organizationId: workspace.id, automations: nextAutomations }, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : '';
    if (e instanceof APIError) {
      return apiError(e, { status: e.status, message: e.message || 'Forbidden' });
    }
    const status = msg.includes('Forbidden') ? 403 : 500;
    return apiError(e, { status });
  }
}

export const GET = shabbatGuard(GETHandler);
export const PATCH = shabbatGuard(PATCHHandler);
