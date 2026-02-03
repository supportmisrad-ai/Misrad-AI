import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthenticatedUser } from '@/lib/auth';
import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { getCurrentUserId } from '@/lib/server/authHelper';
import prisma from '@/lib/prisma';
import { AIService } from '@/lib/services/ai/AIService';
import { contractorResolveTokenForApi } from '@/app/actions/operations';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { enforceAiAbuseGuard, withAiLoadIsolation } from '@/lib/server/aiAbuseGuard';
import type { Prisma } from '@prisma/client';

export const runtime = 'nodejs';

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  const obj = asObject(error);
  const msg = obj?.message;
  return typeof msg === 'string' ? msg : '';
}

function toInputJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value
      .map((v) => toInputJsonValue(v))
      .filter((v): v is Prisma.InputJsonValue => v !== undefined);
  }
  const obj = asObject(value);
  if (!obj) return undefined;
  return toInputJsonObject(obj);
}

function toInputJsonObject(value: unknown): Prisma.InputJsonObject {
  const obj = asObject(value) ?? {};
  const out: Record<string, Prisma.InputJsonValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    const next = toInputJsonValue(v);
    if (next !== undefined) out[k] = next;
  }
  return out as Prisma.InputJsonObject;
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function toImageDataUrl(params: { imageBase64: string; mimeType?: string | null }): string {
  const raw = String(params.imageBase64 || '').trim();
  if (!raw) return '';
  if (raw.startsWith('data:')) return raw;
  const mt = String(params.mimeType || 'image/jpeg').trim() || 'image/jpeg';
  return `data:${mt};base64,${raw}`;
}

function asNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function POSTHandler(req: Request) {
  try {
    const body: unknown = await req.json().catch(() => ({}));
    const bodyObj = asObject(body) ?? {};

    const tokenRaw = bodyObj.token;
    const token = tokenRaw ? String(tokenRaw) : null;

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

    const imageDataUrl = toImageDataUrl({ imageBase64: asString(bodyObj.imageBase64), mimeType: bodyObj.mimeType ? String(bodyObj.mimeType) : null });
    if (!imageDataUrl) {
      return apiError('חסרה תמונה (imageBase64)', { status: 400 });
    }

    // Paywall: AI Vision usage in trial (internal only)
    // Rule: In trial, allow up to 5 scans. Block the 6th.
    let shouldTrackUsage = false;
    let currentUsage = 0;
    if (!token && organizationId) {
      try {
        const orgRow = await prisma.social_organizations.findUnique({
          where: { id: String(organizationId) },
          select: { subscription_status: true },
        });

        const orgObj = asObject(orgRow as unknown) ?? {};
        const subStatus = orgObj.subscription_status ? String(orgObj.subscription_status) : 'trial';
        const isTrial = subStatus === 'trial';

        if (isTrial) {
          const settingsRow = await prisma.organization_settings.findUnique({
            where: { organization_id: String(organizationId) },
            select: { ai_dna: true },
          });

          const settingsObj = asObject(settingsRow as unknown) ?? {};
          const aiDna = settingsObj.ai_dna;
          const aiDnaObj = asObject(aiDna) ?? {};
          currentUsage = asNumber(aiDnaObj.ai_vision_usage);
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
        const nextUsage = currentUsage + 1;
        const settingsRow = await prisma.organization_settings.findUnique({
          where: { organization_id: String(organizationId) },
          select: { ai_dna: true },
        });

        const settingsObj = asObject(settingsRow as unknown) ?? {};
        const aiDna = settingsObj.ai_dna;
        const aiDnaJson = toInputJsonObject(aiDna);

        await prisma.organization_settings.upsert({
          where: { organization_id: String(organizationId) },
          create: {
            organization_id: String(organizationId),
            ai_dna: {
              ...aiDnaJson,
              ai_vision_usage: nextUsage,
            },
            updated_at: new Date(),
            created_at: new Date(),
          },
          update: {
            ai_dna: {
              ...aiDnaJson,
              ai_vision_usage: nextUsage,
            },
            updated_at: new Date(),
          },
        });
      } catch {
        // ignore
      }
    }

    return apiSuccess({ name, isFaulty }, { headers: abuse.headers });
  } catch (e: unknown) {
    console.error('[ai.vision.identify] failed', e);
    return apiError(e, { status: 500, message: getErrorMessage(e) || 'שגיאה כללית' });
  }
}

export const POST = shabbatGuard(POSTHandler);
