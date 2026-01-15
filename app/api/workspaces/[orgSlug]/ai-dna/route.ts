import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { getAuthenticatedUser, hasPermission } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { logAuditEvent } from '@/lib/audit';
import { AIService } from '@/lib/services/ai/AIService';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function GETHandler(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  try {
    await getAuthenticatedUser();

    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgSlug } = await params;
    if (!orgSlug) {
      return NextResponse.json({ error: 'orgSlug is required' }, { status: 400 });
    }

    const workspace = await requireWorkspaceAccessByOrgSlugApi(orgSlug);
    const supabase = createClient();

    const { data, error } = await supabase
      .from('organization_settings')
      .select('ai_dna')
      .eq('organization_id', workspace.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAuditEvent('data.read', 'organization_settings.ai_dna', {
      details: {
        orgSlug,
        organizationId: workspace.id,
      },
    });

    return NextResponse.json({ aiDna: (data as any)?.ai_dna ?? {} });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed to load ai_dna' }, { status: 500 });
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canManage = await hasPermission('manage_system');
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { orgSlug } = await params;
    if (!orgSlug) {
      return NextResponse.json({ error: 'orgSlug is required' }, { status: 400 });
    }

    const workspace = await requireWorkspaceAccessByOrgSlugApi(orgSlug);

    const body = (await req.json().catch(() => ({}))) as { aiDna?: any };
    const aiDna = body?.aiDna ?? {};

    if (aiDna === null || typeof aiDna !== 'object' || Array.isArray(aiDna)) {
      return NextResponse.json({ error: 'aiDna must be a JSON object' }, { status: 400 });
    }

    const supabase = createClient();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('organization_settings')
      .upsert(
        {
          organization_id: workspace.id,
          ai_dna: aiDna,
          updated_at: now,
        } as any,
        { onConflict: 'organization_id' }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

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
    } catch (e: any) {
      console.warn('[ai-dna] pgvector ingest skipped/failed (non-fatal)', {
        message: String(e?.message || e),
      });
    }

    await logAuditEvent('data.write', 'organization_settings.ai_dna', {
      details: {
        orgSlug,
        organizationId: workspace.id,
        updatedBy: clerkUserId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed to save ai_dna' }, { status: 500 });
  }
}

export const GET = shabbatGuard(GETHandler);

export const PUT = shabbatGuard(PUTHandler);
