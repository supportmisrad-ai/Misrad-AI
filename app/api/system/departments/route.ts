import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const FLAG_KEY_DEPARTMENTS = '__departments_v1';
const FLAG_KEY_DEPARTMENT_HISTORY = '__department_history_v1';

type DepartmentHistory = {
  id: string;
  timestamp: number;
  action: 'added' | 'removed' | 'renamed';
  department: string;
  oldValue?: string;
  newValue?: string;
  changedBy: string;
};

function asObject(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== 'object') return null;
  if (Array.isArray(input)) return null;
  return input as Record<string, unknown>;
}

function readAiDnaObject(input: unknown): Record<string, unknown> {
  return asObject(input) ?? {};
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  const obj = asObject(error);
  const msg = obj?.message;
  return typeof msg === 'string' ? msg : '';
}

async function GETHandler(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await getAuthenticatedUser();

    const { workspace } = await getWorkspaceOrThrow(request);

    const data = await prisma.organization_settings.findUnique({
      where: { organization_id: String(workspace.id) },
      select: { ai_dna: true },
    });

    const aiDna = readAiDnaObject(data?.ai_dna);

    const departments = Array.isArray(aiDna?.[FLAG_KEY_DEPARTMENTS]) ? aiDna[FLAG_KEY_DEPARTMENTS] : [];
    const history = Array.isArray(aiDna?.[FLAG_KEY_DEPARTMENT_HISTORY]) ? aiDna[FLAG_KEY_DEPARTMENT_HISTORY] : [];

    return NextResponse.json(
      {
        organizationId: workspace.id,
        departments,
        history,
      },
      { status: 200 }
    );
  } catch (e: unknown) {
    if (e instanceof APIError) {
      return NextResponse.json({ error: e.message || 'Forbidden' }, { status: e.status });
    }
    return NextResponse.json({ error: getErrorMessage(e) || 'Internal server error' }, { status: 500 });
  }
}

async function PATCHHandler(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await requirePermission('manage_team');

    await getAuthenticatedUser();

    const { workspace } = await getWorkspaceOrThrow(request);

    const body = (await request.json().catch(() => null)) as
      | { departments?: string[]; history?: DepartmentHistory[] }
      | null;

    const departments = Array.isArray(body?.departments) ? body?.departments : undefined;
    const history = Array.isArray(body?.history) ? body?.history : undefined;

    const existing = await prisma.organization_settings.findUnique({
      where: { organization_id: String(workspace.id) },
      select: { ai_dna: true },
    });

    const currentAiDna = readAiDnaObject(existing?.ai_dna);
    const nextAiDna: Record<string, unknown> = { ...currentAiDna };

    if (departments !== undefined) nextAiDna[FLAG_KEY_DEPARTMENTS] = departments;
    if (history !== undefined) nextAiDna[FLAG_KEY_DEPARTMENT_HISTORY] = history.slice(0, 200);

    await prisma.organization_settings.upsert({
      where: { organization_id: String(workspace.id) },
      create: {
        organization_id: String(workspace.id),
        ai_dna: nextAiDna as any,
        updated_at: new Date(),
      },
      update: {
        ai_dna: nextAiDna as any,
        updated_at: new Date(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        organizationId: workspace.id,
        departments: Array.isArray(nextAiDna?.[FLAG_KEY_DEPARTMENTS]) ? nextAiDna[FLAG_KEY_DEPARTMENTS] : [],
        history: Array.isArray(nextAiDna?.[FLAG_KEY_DEPARTMENT_HISTORY]) ? nextAiDna[FLAG_KEY_DEPARTMENT_HISTORY] : [],
      },
      { status: 200 }
    );
  } catch (e: unknown) {
    const msg = getErrorMessage(e) || 'Forbidden';
    if (e instanceof APIError) {
      return NextResponse.json({ error: e.message || 'Forbidden' }, { status: e.status });
    }
    const status = msg.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export const GET = shabbatGuard(GETHandler);
export const PATCH = shabbatGuard(PATCHHandler);
