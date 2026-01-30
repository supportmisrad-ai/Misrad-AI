import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
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

function readAiDnaObject(input: any): Record<string, any> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return input as Record<string, any>;
}

async function GETHandler(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
  } catch (e: any) {
    if (e instanceof APIError) {
      return NextResponse.json({ error: e.message || 'Forbidden' }, { status: e.status });
    }
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 });
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

    const supabase = createClient();
    const { data: existing, error: existingError } = await supabase
      .from('organization_settings')
      .select('ai_dna')
      .eq('organization_id', workspace.id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    const currentAiDna = readAiDnaObject((existing as any)?.ai_dna);
    const nextAiDna: any = { ...currentAiDna };

    if (departments !== undefined) nextAiDna[FLAG_KEY_DEPARTMENTS] = departments;
    if (history !== undefined) nextAiDna[FLAG_KEY_DEPARTMENT_HISTORY] = history.slice(0, 200);

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

    return NextResponse.json(
      {
        success: true,
        organizationId: workspace.id,
        departments: Array.isArray(nextAiDna?.[FLAG_KEY_DEPARTMENTS]) ? nextAiDna[FLAG_KEY_DEPARTMENTS] : [],
        history: Array.isArray(nextAiDna?.[FLAG_KEY_DEPARTMENT_HISTORY]) ? nextAiDna[FLAG_KEY_DEPARTMENT_HISTORY] : [],
      },
      { status: 200 }
    );
  } catch (e: any) {
    const msg = e?.message || 'Forbidden';
    if (e instanceof APIError) {
      return NextResponse.json({ error: e.message || 'Forbidden' }, { status: e.status });
    }
    const status = msg.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export const GET = shabbatGuard(GETHandler);
export const PATCH = shabbatGuard(PATCHHandler);
