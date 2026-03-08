import 'server-only';

import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { asObjectLoose as asObject } from '@/lib/shared/unknown';
import { AIService } from '@/lib/services/ai/AIService';
import { analyzeMeetingTranscript } from '@/lib/services/ai/analyze-meeting-transcript';

function toPrismaJsonValue(value: unknown): Prisma.InputJsonValue | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((v) => toPrismaJsonValue(v));
  }

  const obj = asObject(value);
  if (obj) {
    const out: Record<string, Prisma.InputJsonValue | null> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = toPrismaJsonValue(v);
    }
    return out;
  }

  return String(value);
}

function toPrismaJsonObject(value: unknown): Prisma.InputJsonObject {
  const v = toPrismaJsonValue(value);
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Prisma.InputJsonObject) : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((v) => String(v)) : [];
}

function asString(value: unknown, fallback = ''): string {
  return value == null ? fallback : String(value);
}

function asNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

 function toUtcDateOnly(d: Date): Date {
   return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
 }

 function parseDateLikeToUtcDateOnly(value: unknown): Date | null {
   const raw = String(value ?? '').trim();
   if (!raw) return null;

   if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
     const d = new Date(`${raw}T00:00:00.000Z`);
     return Number.isNaN(d.getTime()) ? null : d;
   }

   const dotMatch = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
   if (dotMatch) {
     const day = Number(dotMatch[1]);
     const month = Number(dotMatch[2]);
     const year = Number(dotMatch[3]);
     if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null;
     const d = new Date(Date.UTC(year, month - 1, day));
     return Number.isNaN(d.getTime()) ? null : d;
   }

   const d = new Date(raw);
   if (Number.isNaN(d.getTime())) return null;
   return toUtcDateOnly(d);
 }

export async function analyzeAndStoreMeeting(params: {
  orgId: string;
  clientId: string;
  title: string;
  location: 'ZOOM' | 'FRONTAL' | 'PHONE';
  transcript: string;
  recordingUrl?: string | null;
  attendees?: string[];
}): Promise<{ meetingId: string; analysis: unknown }> {
  const { orgId, clientId, title, location, transcript, attendees, recordingUrl } = params;
  if (!orgId) throw new Error('orgId is required');
  if (!clientId) throw new Error('clientId is required');
  if (!title) throw new Error('title is required');
  if (!transcript?.trim()) throw new Error('transcript is required');

  const now = new Date();
  const meetingDateLabel = now.toLocaleDateString('he-IL');
  const meetingDateAt = toUtcDateOnly(now);

  async function createMeetingWithData(data: Record<string, unknown>): Promise<{ id: string }> {
    return await prisma.misradMeeting.create({
      data: data as unknown as Prisma.MisradMeetingUncheckedCreateInput,
      select: { id: true },
    });
  }

  let meeting: { id: string };
  try {
    meeting = await createMeetingWithData({
      organization_id: orgId,
      client_id: clientId,
      date: meetingDateLabel,
      dateAt: meetingDateAt,
      meetingAt: now,
      title,
      location,
      attendees: attendees ?? [],
      transcript,
      summary: null,
      recordingUrl: recordingUrl ?? null,
      manualNotes: null,
    });
  } catch {
    meeting = await createMeetingWithData({
      organization_id: orgId,
      client_id: clientId,
      date: meetingDateLabel,
      title,
      location,
      attendees: attendees ?? [],
      transcript,
      summary: null,
      recordingUrl: recordingUrl ?? null,
      manualNotes: null,
    });
  }

  let analysis: unknown;
  let retryCount = 0;
  const maxRetries = 4; // הגדלה מ-2 ל-4 - ניתוח זה קריטי

  while (retryCount <= maxRetries) {
    try {
      console.log(`[analyzeAndStoreMeeting] Starting analysis attempt ${retryCount + 1}/${maxRetries + 1}`, {
        transcriptLength: transcript.length,
        clientId,
        orgId,
        meetingId: meeting.id,
      });
      
      analysis = await analyzeMeetingTranscript(transcript);
      
      console.log('[analyzeAndStoreMeeting] Analysis succeeded', {
        attempt: retryCount + 1,
        meetingId: meeting.id,
      });
      break;
    } catch (err) {
      retryCount++;
      const errorDetails = {
        error: err instanceof Error ? err.message : String(err),
        errorType: err instanceof Error ? err.constructor.name : typeof err,
        stack: err instanceof Error ? err.stack : undefined,
        attempt: retryCount,
        maxRetries,
        meetingId: meeting.id,
        transcriptLength: transcript.length,
      };

      if (retryCount > maxRetries) {
        console.error('[analyzeAndStoreMeeting] ❌ AI analysis FAILED after all retries', errorDetails);
        throw new Error(`AI analysis failed after ${maxRetries + 1} attempts: ${errorDetails.error}`);
      }
      
      const delayMs = 2000 * retryCount; // 2s, 4s, 6s, 8s
      console.warn(`[analyzeAndStoreMeeting] ⚠️ Retry ${retryCount}/${maxRetries} after ${delayMs}ms delay`, errorDetails);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  const analysisObj = asObject(analysis) ?? {};

  const warmthRaw = analysisObj.relationshipWarmth;
  const warmthNum = typeof warmthRaw === 'number' ? warmthRaw : Number(warmthRaw);
  const warmth = Number.isFinite(warmthNum) ? warmthNum : null;

  const ratingObj = asObject(analysisObj.rating) ?? {};
  const commitments = Array.isArray(analysisObj.commitments) ? analysisObj.commitments : [];

  const ratingWithRelationship: Prisma.InputJsonValue = toPrismaJsonObject({
    ...ratingObj,
    relationshipWarmth: warmth,
    relationshipNote: analysisObj.relationshipNote ?? null,
    commitments,
  });

  const summary = asString(analysisObj.summary);
  const sentimentScore = Math.round(asNumber(analysisObj.sentimentScore, 0));
  const frictionKeywords = asStringArray(analysisObj.frictionKeywords);
  const objections = asStringArray(analysisObj.objections);
  const compliments = asStringArray(analysisObj.compliments);
  const decisions = asStringArray(analysisObj.decisions);
  const intents = asStringArray(analysisObj.intents);
  const stories = asStringArray(analysisObj.stories);
  const slang = asStringArray(analysisObj.slang);

  const analysisRow = await prisma.misradMeetingAnalysisResult.create({
    data: {
      organization_id: orgId,
      client_id: clientId,
      meeting_id: meeting.id,
      summary,
      sentimentScore,
      frictionKeywords,
      objections,
      compliments,
      decisions,
      intents,
      stories,
      slang,
      rating: ratingWithRelationship,
    },
    select: { id: true },
  });

  try {
    const ai = AIService.getInstance();
    await ai.ingestText({
      featureKey: 'client_os.meetings.memory_ingest',
      organizationId: orgId,
      moduleId: 'client',
      docKey: `client:meeting:${meeting.id}`,
      text: `פגישת לקוח\nכותרת: ${title}\nמיקום: ${location}\n\nתמלול:\n${transcript}\n\nסיכום ותובנות:\n${JSON.stringify(
        {
          summary,
          sentimentScore,
          relationshipWarmth: warmth,
          relationshipNote: analysisObj.relationshipNote ?? null,
          decisions,
          objections,
          compliments,
          commitments,
        },
        null,
        2
      )}`,
      isPublicInOrg: true,
      metadata: {
        source_type: 'misrad_meetings',
        source_id: meeting.id,
        client_id: clientId,
        analysis_id: analysisRow.id,
        title,
        location,
        recording_url: recordingUrl ?? null,
      },
    });
  } catch (e) {
    console.warn('[analyzeAndStoreMeeting] memory ingest skipped', e);
  }

  function normalizeTaskPriority(value: unknown): 'HIGH' | 'NORMAL' | 'LOW' {
    const v = String(value || '').toUpperCase();
    if (v === 'HIGH') return 'HIGH';
    if (v === 'LOW') return 'LOW';
    return 'NORMAL';
  }

  function normalizeTaskStatus(value: unknown): 'PENDING' | 'COMPLETED' {
    const v = String(value || '').toUpperCase();
    return v === 'COMPLETED' ? 'COMPLETED' : 'PENDING';
  }

  function normalizeRiskLevel(value: unknown): 'HIGH' | 'MEDIUM' | 'LOW' {
    const v = String(value || '').toUpperCase();
    if (v === 'HIGH') return 'HIGH';
    if (v === 'LOW') return 'LOW';
    return 'MEDIUM';
  }

  const agencyTasksRaw = Array.isArray(analysisObj.agencyTasks) ? analysisObj.agencyTasks : [];
  const clientTasksRaw = Array.isArray(analysisObj.clientTasks) ? analysisObj.clientTasks : [];
  const risksRaw = Array.isArray(analysisObj.liabilityRisks) ? analysisObj.liabilityRisks : [];

  const agencyTasks = agencyTasksRaw.map((t) => {
    const obj = asObject(t) ?? {};
    const deadlineRaw = asString(obj.deadline);
    return {
      organization_id: orgId,
      client_id: clientId,
      analysis_id: analysisRow.id,
      bucket: 'agency',
      task: asString(obj.task),
      deadline: deadlineRaw,
      deadlineAt: parseDateLikeToUtcDateOnly(deadlineRaw),
      priority: normalizeTaskPriority(obj.priority),
      status: normalizeTaskStatus(obj.status),
    };
  });

  const clientTasks = clientTasksRaw.map((t) => {
    const obj = asObject(t) ?? {};
    const deadlineRaw = asString(obj.deadline);
    return {
      organization_id: orgId,
      client_id: clientId,
      analysis_id: analysisRow.id,
      bucket: 'client',
      task: asString(obj.task),
      deadline: deadlineRaw,
      deadlineAt: parseDateLikeToUtcDateOnly(deadlineRaw),
      priority: normalizeTaskPriority(obj.priority),
      status: normalizeTaskStatus(obj.status),
    };
  });

  const risks = risksRaw.map((r) => {
    const obj = asObject(r) ?? {};
    return {
      organization_id: orgId,
      client_id: clientId,
      analysis_id: analysisRow.id,
      quote: asString(obj.quote),
      context: asString(obj.context),
      riskLevel: normalizeRiskLevel(obj.riskLevel),
    };
  });

  if (agencyTasks.length + clientTasks.length > 0) {
    const data = [...agencyTasks, ...clientTasks];
    try {
      await prisma.misradAiTask.createMany({
        data: data as unknown as Prisma.MisradAiTaskCreateManyInput[],
      });
    } catch {
      await prisma.misradAiTask.createMany({
        data: data.map(({ deadlineAt: _deadlineAt, ...rest }) => rest) as unknown as Prisma.MisradAiTaskCreateManyInput[],
      });
    }
  }

  if (risks.length > 0) {
    await prisma.misradAiLiabilityRisk.createMany({
      data: risks,
    });
  }

  return { meetingId: meeting.id, analysis };
}
