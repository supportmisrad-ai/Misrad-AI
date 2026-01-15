import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { AIService } from '@/lib/services/ai/AIService';
import { logAuditEvent } from '@/lib/audit';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const runtime = 'nodejs';

async function POSTHandler(req: Request, { params }: { params: Promise<{ orgSlug: string }> }) {
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

    const form = await req.formData();
    const file = form.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    const mimeType = String(file.type || 'application/octet-stream');
    const fileName = String(file.name || 'recording');

    await logAuditEvent('ai.query', 'system.calls.transcription', {
      details: {
        orgSlug,
        organizationId: workspace.id,
        fileName,
        mimeType,
      },
    });

    const audioBuffer = await file.arrayBuffer();

    const ai = AIService.getInstance();
    const out = await ai.transcribe({
      featureKey: 'system.calls.transcription',
      organizationId: workspace.id,
      userId: clerkUserId,
      audioBuffer,
      mimeType,
      meta: {
        module: 'system',
        source: 'call-analyzer',
        fileName,
        mimeType,
      },
    });

    return NextResponse.json({
      transcriptText: out.text || '',
      provider: out.provider,
      model: out.model,
      chargedCents: out.chargedCents,
    });
  } catch (e: any) {
    const status = typeof e?.status === 'number' ? e.status : e?.name === 'UpgradeRequiredError' ? 402 : 500;
    return NextResponse.json({ error: e?.message ?? 'Failed to transcribe' }, { status });
  }
}

export const POST = shabbatGuard(POSTHandler);
