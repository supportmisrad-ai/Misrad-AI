import { NextResponse } from 'next/server';

import { getAuthenticatedUser } from '@/lib/auth';
import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { createClient } from '@/lib/supabase';
import { AIService } from '@/lib/services/ai/AIService';
import { contractorResolveTokenForApi } from '@/app/actions/operations';

export const runtime = 'nodejs';

function asString(v: any): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function toImageDataUrl(params: { imageBase64: string; mimeType?: string | null }): string {
  const raw = String(params.imageBase64 || '').trim();
  if (!raw) return '';
  if (raw.startsWith('data:')) return raw;
  const mt = String(params.mimeType || 'image/jpeg').trim() || 'image/jpeg';
  return `data:${mt};base64,${raw}`;
}

async function POSTHandler(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      token?: string;
      orgId?: string;
      imageBase64?: string;
      mimeType?: string;
    };

    const token = body.token ? String(body.token) : null;

    let organizationId: string | null = null;
    let userId: string | null = null;

    if (token) {
      const tokenRes = await contractorResolveTokenForApi({ token });
      if (!tokenRes.success || !tokenRes.organizationId) {
        return NextResponse.json({ error: tokenRes.error || 'Forbidden' }, { status: 403 });
      }
      organizationId = String(tokenRes.organizationId);
      userId = `contractor:${String(tokenRes.tokenHash || '').slice(0, 24) || 'unknown'}`;
    } else {
      await getAuthenticatedUser();
      const clerkUserId = await getCurrentUserId();
      if (!clerkUserId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const orgIdFromHeader = req.headers.get('x-org-id') || req.headers.get('x-orgid');
      const orgIdFromBody = body.orgId ? String(body.orgId) : null;
      const requestedOrg = orgIdFromHeader || orgIdFromBody;

      if (requestedOrg) {
        const workspace = await requireWorkspaceAccessByOrgSlugApi(String(requestedOrg));
        organizationId = String(workspace.id);
      } else {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('social_users')
          .select('organization_id')
          .eq('clerk_user_id', clerkUserId)
          .maybeSingle();

        if (error) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        organizationId = (data as any)?.organization_id ? String((data as any).organization_id) : null;
        if (!organizationId) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await requireWorkspaceAccessByOrgSlugApi(organizationId);
      }

      userId = clerkUserId;
    }

    const imageDataUrl = toImageDataUrl({ imageBase64: asString(body.imageBase64), mimeType: body.mimeType || null });
    if (!imageDataUrl) {
      return NextResponse.json({ error: 'חסרה תמונה (imageBase64)' }, { status: 400 });
    }

    const ai = AIService.getInstance();

    const prompt = "זהה את החלק בתמונה. החזר את שם החלק (name) והאם הוא נראה תקול (isFaulty: true/false).";
    const systemInstruction =
      "ענה תמיד בעברית. החזר JSON תקין בלבד ללא טקסט נוסף. \n" +
      "מבנה חובה: {\"name\": string, \"isFaulty\": boolean}. \n" +
      "אם לא בטוח, תן השערה סבירה ועדיין החזר את אותו מבנה.";

    const out = await ai.generateVisionJson<{ name?: string; isFaulty?: boolean }>({
      featureKey: 'ai.vision.identify',
      organizationId: organizationId || undefined,
      userId: userId || undefined,
      bypassAuth: Boolean(token),
      prompt,
      imageDataUrl,
      systemInstruction,
      meta: {
        source: token ? 'contractor_portal' : 'internal',
      },
    });

    const name = out?.result?.name ? String(out.result.name).trim() : '';
    const isFaulty = Boolean(out?.result?.isFaulty);

    if (!name) {
      return NextResponse.json({ error: 'תשובת AI ריקה' }, { status: 502 });
    }

    return NextResponse.json({ success: true, name, isFaulty });
  } catch (e: any) {
    console.error('[ai.vision.identify] failed', e);
    return NextResponse.json({ error: e?.message || 'שגיאה כללית' }, { status: 500 });
  }
}

export const POST = shabbatGuard(POSTHandler);
