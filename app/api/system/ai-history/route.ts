import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const FLAG_KEY_AI_HISTORY_BY_USER = '__ai_history_by_user_v1';

type AnalysisReport = {
  id: string;
  date: string;
  query: string;
  mode: 'manager' | 'employee';
  summary: string;
  score: number;
  actionableSteps: any[];
  suggestedLinks: any[];
  employees?: any;
  revenueInsight?: any;
  personalTasksAnalysis?: any;
};

function readAiDnaObject(input: any): Record<string, any> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return input as Record<string, any>;
}

async function GETHandler(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await requirePermission('view_intelligence');

    await getAuthenticatedUser();

    const { workspace } = await getWorkspaceOrThrow(request);
    const supabase = createClient();

    const { data, error } = await supabase
      .from('organization_settings')
      .select('ai_dna')
      .eq('organization_id', workspace.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const aiDna = readAiDnaObject((data as any)?.ai_dna);
    const byUser = aiDna?.[FLAG_KEY_AI_HISTORY_BY_USER] && typeof aiDna[FLAG_KEY_AI_HISTORY_BY_USER] === 'object'
      ? aiDna[FLAG_KEY_AI_HISTORY_BY_USER]
      : {};

    const history = Array.isArray((byUser as any)?.[userId]) ? (byUser as any)[userId] : [];

    return NextResponse.json({ organizationId: workspace.id, history }, { status: 200 });
  } catch (e: any) {
    const msg = e?.message || 'Internal server error';
    if (e instanceof APIError) {
      return NextResponse.json({ error: e.message || 'Forbidden' }, { status: e.status });
    }
    const status = msg.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

async function PATCHHandler(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await requirePermission('view_intelligence');

    await getAuthenticatedUser();

    const { workspace } = await getWorkspaceOrThrow(request);
    const supabase = createClient();

    const body = (await request.json().catch(() => null)) as { history?: AnalysisReport[] } | null;
    const nextHistory = Array.isArray(body?.history) ? body?.history : [];

    const { data: existing, error: existingError } = await supabase
      .from('organization_settings')
      .select('ai_dna')
      .eq('organization_id', workspace.id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    const currentAiDna = readAiDnaObject((existing as any)?.ai_dna);
    const currentByUser = currentAiDna?.[FLAG_KEY_AI_HISTORY_BY_USER] && typeof currentAiDna[FLAG_KEY_AI_HISTORY_BY_USER] === 'object'
      ? currentAiDna[FLAG_KEY_AI_HISTORY_BY_USER]
      : {};

    const nextByUser = {
      ...currentByUser,
      [userId]: nextHistory.slice(0, 200),
    };

    const nextAiDna = {
      ...currentAiDna,
      [FLAG_KEY_AI_HISTORY_BY_USER]: nextByUser,
    };

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('organization_settings')
      .upsert(
        {
          organization_id: workspace.id,
          ai_dna: nextAiDna,
          updated_at: now,
        } as any,
        { onConflict: 'organization_id' }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const history = Array.isArray((nextAiDna as any)?.[FLAG_KEY_AI_HISTORY_BY_USER]?.[userId])
      ? (nextAiDna as any)[FLAG_KEY_AI_HISTORY_BY_USER][userId]
      : [];

    return NextResponse.json({ success: true, organizationId: workspace.id, history }, { status: 200 });
  } catch (e: any) {
    const msg = e?.message || 'Internal server error';
    if (e instanceof APIError) {
      return NextResponse.json({ error: e.message || 'Forbidden' }, { status: e.status });
    }
    const status = msg.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export const GET = shabbatGuard(GETHandler);
export const PATCH = shabbatGuard(PATCHHandler);
