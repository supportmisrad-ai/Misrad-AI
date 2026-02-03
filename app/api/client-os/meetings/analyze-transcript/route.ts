import { apiError, apiSuccessCompat } from '@/lib/server/api-response';
import { getAuthenticatedUser } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { APIError, getOrgKeyOrThrow, getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';
import { AIService } from '@/lib/services/ai/AIService';
import { enforceAiAbuseGuard, withAiLoadIsolation } from '@/lib/server/aiAbuseGuard';
import { Type } from '@google/genai';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const runtime = 'nodejs';

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizeTaskList(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => asObject(v) || null)
    .filter(Boolean) as Array<Record<string, unknown>>;
}

async function POSTHandler(req: Request) {
  try {
    await getAuthenticatedUser();

    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return apiError('Unauthorized', { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as { orgId?: string; transcript?: string };

    let orgIdInput = String(body.orgId || '').trim();
    if (!orgIdInput) {
      try {
        orgIdInput = getOrgKeyOrThrow(req);
      } catch {
        orgIdInput = '';
      }
    }

    const transcript = String(body.transcript || '').trim();

    if (!orgIdInput) return apiError('orgId is required', { status: 400 });
    if (!transcript) return apiError('transcript is required', { status: 400 });

    const { workspace } = await getWorkspaceByOrgKeyOrThrow(orgIdInput);

    const abuse = await enforceAiAbuseGuard({
      req,
      namespace: 'ai.client_os.meetings.analyze_transcript',
      organizationId: workspace.id,
      userId: clerkUserId,
      limits: {
        ipMin: { limit: 12, windowMs: 60_000, label: 'ip-min' },
        userMin: { limit: 8, windowMs: 60_000, label: 'user-min' },
      },
    });
    if (!abuse.ok) {
      return apiError('Rate limit exceeded', { status: 429, headers: abuse.headers });
    }

    const systemPrompt =
      "You are the Nexus Meeting Analyzer, specialized in B2B Account Management.\n" +
      "CONTEXT:\n" +
      "- Speaker 0 is the AGENCY (Us/Manager).\n" +
      "- Speaker 1 (and others) is the CLIENT.\n\n" +
      "YOUR MISSION:\n" +
      "Analyze the transcript and separate responsibilities strictly based on who is speaking.\n" +
      "Deeply analyze subtext, hidden intents, and cultural nuances.\n\n" +
      "EXTRACT THE FOLLOWING IN HEBREW:\n" +
      "1. AGENCY TASKS (Ops): Actionable items for Speaker 0.\n" +
      "2. CLIENT TASKS: Actionable items for Speaker 1 (Blockers).\n" +
      "3. LIABILITY SHIELD: Dangerous promises made by Speaker 0 (Vague deadlines, free work).\n" +
      "4. OBJECTIONS: Negative feedback or resistance points from Speaker 1.\n" +
      "5. COMPLIMENTS: Positive feedback or praise from Speaker 1.\n" +
      "6. DECISIONS: Clear conclusions or agreements reached during the call.\n" +
      "7. SENTIMENT: Score 0-100 based on Client's tone.\n" +
      "8. INTENTS: Hidden motivations or what they imply but don't say.\n" +
      "9. STORIES: Any anecdotes, metaphors or stories told.\n" +
      "10. SLANG: Specific jargon or slang words used.\n" +
      "11. RATING: Rate professionalism, warmth, and clarity (0-100).\n" +
      "12. COMMITMENTS: Extract strict commitments (who promised what, and by when). If missing, set \"לא צוין\".\n" +
      "13. RELATIONSHIP_WARMTH: Give warmth score 1-10 + one short reason.\n\n" +
      'Output must be valid JSON.';

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING },
        sentimentScore: { type: Type.NUMBER },
        relationshipWarmth: { type: Type.NUMBER },
        relationshipNote: { type: Type.STRING },
        frictionKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
        objections: { type: Type.ARRAY, items: { type: Type.STRING } },
        compliments: { type: Type.ARRAY, items: { type: Type.STRING } },
        decisions: { type: Type.ARRAY, items: { type: Type.STRING } },
        intents: { type: Type.ARRAY, items: { type: Type.STRING } },
        stories: { type: Type.ARRAY, items: { type: Type.STRING } },
        slang: { type: Type.ARRAY, items: { type: Type.STRING } },
        commitments: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              who: { type: Type.STRING },
              what: { type: Type.STRING },
              due: { type: Type.STRING },
            },
          },
        },
        rating: {
          type: Type.OBJECT,
          properties: {
            professionalism: { type: Type.NUMBER },
            warmth: { type: Type.NUMBER },
            clarity: { type: Type.NUMBER },
          },
        },
        agencyTasks: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              task: { type: Type.STRING },
              deadline: { type: Type.STRING },
              priority: { type: Type.STRING, enum: ['HIGH', 'NORMAL', 'LOW'] },
            },
          },
        },
        clientTasks: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              task: { type: Type.STRING },
              deadline: { type: Type.STRING },
              priority: { type: Type.STRING, enum: ['HIGH', 'NORMAL', 'LOW'] },
            },
          },
        },
        liabilityRisks: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              quote: { type: Type.STRING },
              context: { type: Type.STRING },
              riskLevel: { type: Type.STRING, enum: ['HIGH', 'MEDIUM', 'LOW'] },
            },
          },
        },
      },
    };

    const ai = AIService.getInstance();

    const aiOut = await withAiLoadIsolation({
      namespace: 'ai.generate_json',
      organizationId: workspace.id,
      task: async () => {
        return await ai.generateJson<unknown>({
          featureKey: 'client_os.meetings.analyze_transcript',
          organizationId: workspace.id,
          userId: clerkUserId,
          prompt: transcript,
          systemInstruction: systemPrompt,
          responseSchema,
        });
      },
    });

    const dataObj = asObject(aiOut.result) ?? {};

    // Normalize to UI expected shape (id/status fields for tasks)
    const agencyTasks = normalizeTaskList(dataObj.agencyTasks).map((t, i) => ({
      ...t,
      id: String((t as any).id || `at-${Date.now()}-${i}`),
      status: String((t as any).status || 'PENDING'),
    }));

    const clientTasks = normalizeTaskList(dataObj.clientTasks).map((t, i) => ({
      ...t,
      id: String((t as any).id || `ct-${Date.now()}-${i}`),
      status: String((t as any).status || 'PENDING'),
    }));

    const analysis = {
      ...dataObj,
      agencyTasks,
      clientTasks,
      liabilityRisks: Array.isArray(dataObj.liabilityRisks) ? dataObj.liabilityRisks : [],
      frictionKeywords: Array.isArray(dataObj.frictionKeywords) ? dataObj.frictionKeywords : [],
      objections: Array.isArray(dataObj.objections) ? dataObj.objections : [],
      compliments: Array.isArray(dataObj.compliments) ? dataObj.compliments : [],
      decisions: Array.isArray(dataObj.decisions) ? dataObj.decisions : [],
    };

    return apiSuccessCompat({ analysis }, { headers: abuse.headers });
  } catch (e: any) {
    if (e instanceof APIError) {
      return apiError(e.message || 'Forbidden', { status: e.status });
    }
    return apiError(e, { status: 500, message: 'Failed to analyze transcript' });
  }
}

export const POST = shabbatGuard(POSTHandler);
