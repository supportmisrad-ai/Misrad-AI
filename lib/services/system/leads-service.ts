import 'server-only';

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type { SystemLead, SystemLeadActivity } from '@prisma/client';
import { AIService } from '@/lib/services/ai/AIService';
import { asObjectLoose as asObject } from '@/lib/shared/unknown';
import { logger } from '@/lib/server/logger';

// ── Types ────────────────────────────────────────────────────────────────

export type SystemLeadActivityDTO = {
  id: string;
  lead_id: string;
  type: string;
  content: string;
  timestamp: string;
  metadata?: unknown;
  direction: string | null;
};

export type SystemLeadDTO = {
  id: string;
  organization_id: string;
  name: string;
  company: string | null;
  phone: string;
  email: string | null;
  installation_address: string | null;
  source: string;
  status: string;
  value: number;
  last_contact: string;
  created_at: string;
  is_hot: boolean;
  score: number;
  assigned_agent_id: string | null;
  product_interest?: string | null;
  ai_tags?: string[];
  closure_probability?: number | null;
  closure_rationale?: string | null;
  recommended_action?: string | null;
  next_action_date?: string | null;
  next_action_date_suggestion?: string | null;
  next_action_note?: string | null;
  next_action_date_rationale?: string | null;
  activities?: SystemLeadActivityDTO[];
};

export type SystemLeadRow = SystemLead & { activities?: SystemLeadActivity[] };

// ── DTO Mappers ──────────────────────────────────────────────────────────

export function toLeadDto(row: SystemLeadRow): SystemLeadDTO {
  const rowObj = asObject(row) ?? {};

  const closureProbabilityRaw = rowObj.closureProbability ?? rowObj.closure_probability;
  const closureRationaleRaw = rowObj.closureRationale ?? rowObj.closure_rationale;
  const recommendedActionRaw = rowObj.recommendedAction ?? rowObj.recommended_action;

  return {
    id: row.id,
    organization_id: row.organizationId,
    name: row.name,
    company: row.company ?? null,
    phone: row.phone,
    email: row.email ?? null,
    installation_address: row.installationAddress ? String(row.installationAddress) : null,
    source: row.source,
    status: row.status,
    value: Number(row.value ?? 0),
    last_contact: new Date(row.lastContact).toISOString(),
    created_at: new Date(row.createdAt ?? row.lastContact).toISOString(),
    is_hot: Boolean(row.isHot),
    score: Number(row.score ?? 0),
    assigned_agent_id: row.assignedAgentId ?? null,
    product_interest: row.productInterest ?? null,
    ai_tags: Array.isArray(row.aiTags) ? row.aiTags.map((t) => String(t)).filter(Boolean) : [],
    closure_probability: closureProbabilityRaw != null ? Number(closureProbabilityRaw) : null,
    closure_rationale: closureRationaleRaw != null ? String(closureRationaleRaw) : null,
    recommended_action: recommendedActionRaw != null ? String(recommendedActionRaw) : null,
    next_action_date: rowObj.nextActionDate != null ? String(rowObj.nextActionDate) : null,
    next_action_date_suggestion: rowObj.nextActionDateSuggestion != null ? String(rowObj.nextActionDateSuggestion) : null,
    next_action_note: rowObj.nextActionNote != null ? String(rowObj.nextActionNote) : null,
    next_action_date_rationale: rowObj.nextActionDateRationale != null ? String(rowObj.nextActionDateRationale) : null,
    activities: row.activities ? row.activities.map(toActivityDto) : undefined,
  };
}

export function toActivityDto(row: SystemLeadActivity): SystemLeadActivityDTO {
  return {
    id: String(row.id),
    lead_id: String(row.leadId),
    type: String(row.type),
    content: String(row.content || ''),
    timestamp: new Date(row.timestamp ?? row.createdAt ?? new Date()).toISOString(),
    direction: row.direction ? String(row.direction) : null,
    metadata: row.metadata ?? null,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────

export function normalizeAddress(input: string): string {
  return String(input || '')
    .trim()
    .replace(/\s+/g, ' ');
}

export async function loadLeadDtoWithActivities(params: {
  organizationId: string;
  leadId: string;
  takeActivities?: number;
}): Promise<SystemLeadDTO | null> {
  const leadId = String(params.leadId || '').trim();
  if (!leadId) return null;
  const row = await prisma.systemLead.findFirst({
    where: { id: leadId, organizationId: params.organizationId },
    include: {
      activities: {
        orderBy: { timestamp: 'desc' },
        take: Math.max(1, Math.min(200, Math.floor(params.takeActivities ?? 50))),
      },
    },
  });
  return row ? toLeadDto(row) : null;
}

// ── AI Scoring ───────────────────────────────────────────────────────────

export type AiScoreResult = {
  score: number;
  isHot: boolean;
  tags: string[];
  closureProbability: number;
  closureRationale: string;
  recommendedAction: string;
};

export async function computeLeadAiScore(params: {
  organizationId: string;
  leadId: string;
  leadRow: {
    name: string;
    company: string | null;
    status: string;
    source: string;
    value: number | null;
  };
  recentActivities: Array<{
    type: string;
    content: string | null;
    timestamp: Date | null;
    direction: string | null;
  }>;
}): Promise<AiScoreResult> {
  const { leadRow, recentActivities, organizationId, leadId } = params;

  const history = recentActivities
    .slice(0, 20)
    .map((a) => {
      const when = a.timestamp ? new Date(a.timestamp).toISOString() : '';
      const dir = a.direction ? `(${String(a.direction)})` : '';
      return `${when} ${String(a.type || '')}${dir}: ${String(a.content || '')}`;
    })
    .join('\n');

  const ai = AIService.getInstance();

  const prompt = `חשב ציון ליד (AI Score) וחיזוי סגירה עבור ליד מכירות.

נתוני ליד:
שם: ${String(leadRow.name || '')}
חברה: ${String(leadRow.company || '')}
סטטוס: ${String(leadRow.status || '')}
מקור: ${String(leadRow.source || '')}
שווי: ₪${Number(leadRow.value ?? 0)}

היסטוריית אינטראקציות אחרונה:
${history || 'אין אינטראקציות עדיין'}

החזר JSON בלבד בפורמט:
{
  "score": number,
  "isHot": boolean,
  "tags": string[],
  "closureProbability": number,
  "closureRationale": string,
  "recommendedAction": string
}

כללים:
- score: ציון כללי 0-100
- isHot: האם ליד חם (סיכוי גבוה לסגירה)
- tags: עד 6 תגיות קצרות בעברית
- closureProbability: אחוז סיכוי לסגירה 0-100 (מבוסס על כוונה, אינטראקציות, שלב במשפך)
- closureRationale: הסבר קצר (1-2 משפטים) למה הסיכוי כזה
- recommendedAction: פעולה ממוקדת אחת שכדאי לעשות עכשיו (למשל: "שלח הצעת מחיר עד יום רביעי")
- אם אין כמעט אינטראקציות: score נמוך, closureProbability נמוך, ציין שחסר מידע`;

  const out = await ai.generateJson<AiScoreResult>({
    featureKey: 'system.leads.score',
    organizationId,
    prompt,
    responseSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        score: { type: 'number' },
        isHot: { type: 'boolean' },
        tags: { type: 'array', items: { type: 'string' } },
        closureProbability: { type: 'number' },
        closureRationale: { type: 'string' },
        recommendedAction: { type: 'string' },
      },
      required: ['score', 'isHot', 'tags', 'closureProbability', 'closureRationale', 'recommendedAction'],
    },
    meta: {
      module: 'system',
      kind: 'lead_score',
      leadId,
    },
  });

  const nextScore = Math.max(0, Math.min(100, Math.round(Number(out?.result?.score ?? 0))));
  const nextIsHot = Boolean(out?.result?.isHot);
  const nextTags = Array.isArray(out?.result?.tags)
    ? out.result.tags.map((t) => String(t || '').trim()).filter(Boolean).slice(0, 12)
    : [];
  const nextClosureProbability = Math.max(0, Math.min(100, Math.round(Number(out?.result?.closureProbability ?? 0))));
  const nextClosureRationale = String(out?.result?.closureRationale || '').trim().slice(0, 500);
  const nextRecommendedAction = String(out?.result?.recommendedAction || '').trim().slice(0, 300);

  return {
    score: nextScore,
    isHot: nextIsHot,
    tags: nextTags,
    closureProbability: nextClosureProbability,
    closureRationale: nextClosureRationale,
    recommendedAction: nextRecommendedAction,
  };
}

export async function persistAiScore(params: {
  organizationId: string;
  leadId: string;
  result: AiScoreResult;
}): Promise<number> {
  const updated = await prisma.systemLead.updateMany({
    where: { id: params.leadId, organizationId: params.organizationId },
    data: {
      score: params.result.score,
      isHot: params.result.isHot,
      aiTags: params.result.tags,
      closureProbability: params.result.closureProbability,
      closureRationale: params.result.closureRationale || null,
      recommendedAction: params.result.recommendedAction || null,
    } as unknown as Prisma.SystemLeadUncheckedUpdateManyInput,
  });
  return updated.count;
}
