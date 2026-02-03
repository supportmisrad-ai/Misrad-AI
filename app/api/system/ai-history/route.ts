import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import type { Prisma } from '@prisma/client';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const FLAG_KEY_AI_HISTORY_BY_USER = '__ai_history_by_user_v1';

type AnalysisReport = {
  id: string;
  date: string;
  query: string;
  mode: 'manager' | 'employee';
  summary: string;
  score: number;
  actionableSteps: unknown[];
  suggestedLinks: unknown[];
  employees?: unknown;
  revenueInsight?: unknown;
  personalTasksAnalysis?: unknown;
};

type UnknownRecord = Record<string, unknown>;

function asObject(input: unknown): UnknownRecord | null {
  if (!input || typeof input !== 'object') return null;
  if (Array.isArray(input)) return null;
  return input as UnknownRecord;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  const obj = asObject(error);
  const msg = obj?.message;
  return typeof msg === 'string' ? msg : '';
}

function readAiDnaObject(input: unknown): UnknownRecord {
  return asObject(input) ?? {};
}

async function GETHandler(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ organizationId: null, history: [] }, { status: 200 });

    await requirePermission('view_intelligence');

    await getAuthenticatedUser();

    const { workspace } = await getWorkspaceOrThrow(request);

    const data = await prisma.organization_settings.findUnique({
      where: { organization_id: String(workspace.id) },
      select: { ai_dna: true },
    });

    const aiDna = readAiDnaObject(data?.ai_dna);
    const byUser = asObject(aiDna[FLAG_KEY_AI_HISTORY_BY_USER]) ?? {};

    const history = Array.isArray(byUser[userId]) ? (byUser[userId] as unknown[]) : [];

    return NextResponse.json({ organizationId: workspace.id, history }, { status: 200 });
  } catch {
    return NextResponse.json({ organizationId: null, history: [] }, { status: 200 });
  }
}

async function PATCHHandler(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, organizationId: null, history: [] }, { status: 200 });

    await requirePermission('view_intelligence');

    await getAuthenticatedUser();

    const { workspace } = await getWorkspaceOrThrow(request);

    const body = (await request.json().catch(() => null)) as { history?: AnalysisReport[] } | null;
    const nextHistory = Array.isArray(body?.history) ? body?.history : [];

    const existing = await prisma.organization_settings.findUnique({
      where: { organization_id: String(workspace.id) },
      select: { ai_dna: true },
    });

    const currentAiDna = readAiDnaObject(existing?.ai_dna);
    const currentByUser = asObject(currentAiDna[FLAG_KEY_AI_HISTORY_BY_USER]) ?? {};

    const nextByUser = {
      ...currentByUser,
      [userId]: nextHistory.slice(0, 200),
    };

    const nextAiDna = {
      ...currentAiDna,
      [FLAG_KEY_AI_HISTORY_BY_USER]: nextByUser,
    };

    await prisma.organization_settings.upsert({
      where: { organization_id: String(workspace.id) },
      create: {
        organization_id: String(workspace.id),
        ai_dna: nextAiDna as Prisma.InputJsonValue,
        updated_at: new Date(),
      },
      update: {
        ai_dna: nextAiDna as Prisma.InputJsonValue,
        updated_at: new Date(),
      },
    });

    const nextByUserObj = asObject((nextAiDna as UnknownRecord)[FLAG_KEY_AI_HISTORY_BY_USER]) ?? {};
    const history = Array.isArray(nextByUserObj[userId]) ? (nextByUserObj[userId] as unknown[]) : [];

    return NextResponse.json({ success: true, organizationId: workspace.id, history }, { status: 200 });
  } catch {
    return NextResponse.json({ success: false, organizationId: null, history: [] }, { status: 200 });
  }
}

export const GET = shabbatGuard(GETHandler);
export const PATCH = shabbatGuard(PATCHHandler);
