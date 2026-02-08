import 'server-only';

import { Type } from '@google/genai';
import { AIService } from '@/lib/services/ai/AIService';
import { asObject } from '@/lib/shared/unknown';

export async function analyzeMeetingTranscript(transcript: string): Promise<unknown> {
  try {
    const systemPrompt = `
      You are the Nexus Meeting Analyzer, specialized in B2B Account Management.

      CONTEXT:
      - "Speaker 0" is the AGENCY (Us/Manager).
      - "Speaker 1" (and others) is the CLIENT.

      YOUR MISSION:
      Analyze the transcript and separate responsibilities strictly based on who is speaking.
      Deeply analyze subtext, hidden intents, and cultural nuances.

      EXTRACT THE FOLLOWING IN HEBREW:
      1. AGENCY TASKS (Ops): Actionable items for Speaker 0.
      2. CLIENT TASKS: Actionable items for Speaker 1 (Blockers).
      3. LIABILITY SHIELD: Dangerous promises made by Speaker 0 (Vague deadlines, free work).
      4. OBJECTIONS: Negative feedback or resistance points from Speaker 1.
      5. COMPLIMENTS: Positive feedback or praise from Speaker 1.
      6. DECISIONS: Clear conclusions or agreements reached during the call.
      7. SENTIMENT: Score 0-100 based on Client's tone.
      8. INTENTS: Hidden motivations or what they imply but don't say.
      9. STORIES: Any anecdotes, metaphors or stories told.
      10. SLANG: Specific jargon or slang words used.
      11. RATING: Rate professionalism, warmth, and clarity (0-100).
      12. COMMITMENTS: Extract strict commitments (who promised what, and by when). If missing, set "לא צוין".
      13. RELATIONSHIP_WARMTH: Give warmth score 1-10 + one short reason.

      Output must be valid JSON.
    `;

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
    const out = await ai.generateJson<unknown>({
      featureKey: 'client_os.meetings.analyze',
      prompt: transcript,
      systemInstruction: systemPrompt,
      responseSchema,
    });

    const dataObj = asObject(out.result) ?? {};

    if (Array.isArray(dataObj?.agencyTasks)) {
      dataObj.agencyTasks = (dataObj.agencyTasks as unknown[]).map((t: unknown, i: number) => ({
        ...(asObject(t) ?? {}),
        id: `at-${Date.now()}-${i}`,
        status: 'PENDING',
      }));
    }
    if (Array.isArray(dataObj?.clientTasks)) {
      dataObj.clientTasks = (dataObj.clientTasks as unknown[]).map((t: unknown, i: number) => ({
        ...(asObject(t) ?? {}),
        id: `ct-${Date.now()}-${i}`,
        status: 'PENDING',
      }));
    }

    return dataObj;
  } catch {
    return {
      summary: 'לא הצלחנו לנתח את השיחה כרגע.',
      sentimentScore: 0,
      frictionKeywords: [],
      objections: [],
      compliments: [],
      decisions: [],
      agencyTasks: [],
      clientTasks: [],
      liabilityRisks: [],
    };
  }
}
