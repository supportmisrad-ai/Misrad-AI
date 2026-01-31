import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthenticatedUser } from '@/lib/auth';
import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { createClient } from '@/lib/supabase';
import { AIService } from '@/lib/services/ai/AIService';
import { contractorResolveTokenForApi } from '@/app/actions/operations';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { enforceAiAbuseGuard, withAiLoadIsolation } from '@/lib/server/aiAbuseGuard';

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

function asNumber(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
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
        return apiError(tokenRes.error || 'Forbidden', { status: 403 });
      }
      organizationId = String(tokenRes.organizationId);
      userId = `contractor:${String(tokenRes.tokenHash || '').slice(0, 24) || 'unknown'}`;
    } else {
      await getAuthenticatedUser();
      const clerkUserId = await getCurrentUserId();
      if (!clerkUserId) {
        return apiError('Unauthorized', { status: 401 });
      }

      const { workspaceId } = await getWorkspaceOrThrow(req);
      organizationId = String(workspaceId);

      userId = clerkUserId;
    }

    const abuse = await enforceAiAbuseGuard({
      req,
      namespace: token ? 'ai.vision.identify.contractor' : 'ai.vision.identify',
      organizationId,
      userId,
      limits: token
        ? {
            ipMin: { limit: 20, windowMs: 60_000, label: 'ip-min' },
            userMin: { limit: 12, windowMs: 60_000, label: 'user-min' },
            org10m: { limit: 60, windowMs: 10 * 60_000, label: 'org-10m' },
          }
        : undefined,
    });
    if (!abuse.ok) {
      return apiError('Rate limit exceeded', { status: 429, headers: abuse.headers });
    }

    const imageDataUrl = toImageDataUrl({ imageBase64: asString(body.imageBase64), mimeType: body.mimeType || null });
    if (!imageDataUrl) {
      return apiError('חסרה תמונה (imageBase64)', { status: 400 });
    }

    // Paywall: AI Vision usage in trial (internal only)
    // Rule: In trial, allow up to 5 scans. Block the 6th.
    let shouldTrackUsage = false;
    let currentUsage = 0;
    if (!token && organizationId) {
      try {
        const supabase = createClient();

        const { data: orgRow } = await supabase
          .from('organizations')
          .select('subscription_status')
          .eq('id', String(organizationId))
          .maybeSingle();

        const subStatus = (orgRow as any)?.subscription_status ? String((orgRow as any).subscription_status) : 'trial';
        const isTrial = subStatus === 'trial';

        if (isTrial) {
          const { data: settingsRow } = await supabase
            .from('organization_settings')
            .select('ai_dna')
            .eq('organization_id', String(organizationId))
            .maybeSingle();

          const aiDna = (settingsRow as any)?.ai_dna || {};
          currentUsage = asNumber((aiDna as any)?.ai_vision_usage);
          shouldTrackUsage = true;

          if (currentUsage >= 5) {
            return apiError('הגעת למכסת סריקות ה-AI בחבילת הניסיון. שדרג לחבילת תפעול כדי להמשיך.', { status: 402 });
          }
        }
      } catch {
        // best-effort: do not block if paywall lookup fails
      }
    }

    const ai = AIService.getInstance();

    const prompt = "זהה את החלק בתמונה. החזר את שם החלק (name) והאם הוא נראה תקול (isFaulty: true/false).";
    const systemInstruction =
      "ענה תמיד בעברית. החזר JSON תקין בלבד ללא טקסט נוסף. \n" +
      "מבנה חובה: {\"name\": string, \"isFaulty\": boolean}. \n" +
      "אם לא בטוח, תן השערה סבירה ועדיין החזר את אותו מבנה.";

    const out = await withAiLoadIsolation({
      namespace: 'ai.vision',
      organizationId: organizationId,
      task: async () => {
        return await ai.generateVisionJson<{ name?: string; isFaulty?: boolean }>({
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
      },
    });

    const name = out?.result?.name ? String(out.result.name).trim() : '';
    const isFaulty = Boolean(out?.result?.isFaulty);

    if (!name) {
      return apiError('תשובת AI ריקה', { status: 502 });
    }

    // Best-effort usage tracking (internal only)
    if (shouldTrackUsage && organizationId) {
      try {
        const supabase = createClient();
        const nextUsage = currentUsage + 1;

        const { data: settingsRow } = await supabase
          .from('organization_settings')
          .select('ai_dna')
          .eq('organization_id', String(organizationId))
          .maybeSingle();

        const aiDna = (settingsRow as any)?.ai_dna || {};

        await supabase
          .from('organization_settings')
          .upsert(
            {
              organization_id: String(organizationId),
              ai_dna: {
                ...(aiDna as any),
                ai_vision_usage: nextUsage,
              },
              updated_at: new Date().toISOString(),
            } as any,
            { onConflict: 'organization_id' }
          );
      } catch {
        // ignore
      }
    }

    return apiSuccess({ name, isFaulty }, { headers: abuse.headers });
  } catch (e: any) {
    console.error('[ai.vision.identify] failed', e);
    return apiError(e, { status: 500, message: e?.message || 'שגיאה כללית' });
  }
}

export const POST = shabbatGuard(POSTHandler);
