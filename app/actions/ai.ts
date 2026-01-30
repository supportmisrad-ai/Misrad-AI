'use server';

import { Type } from '@google/genai';
import { AIService } from '@/lib/services/ai/AIService';

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export async function analyzeMeetingTranscriptAction(transcript: string) {
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

export async function generateClientInsightAction(clientName: string, healthScore: number, sentimentTrend: string[]) {
  try {
    const prompt = `
      Act as a senior B2B Account Manager AI.
      Analyze the client "${clientName}".
      Health Score: ${healthScore}/100.
      Recent Sentiment Trend: ${sentimentTrend.join(', ')}.

      Provide a strategic insight in Hebrew (max 30 words) focusing on relationship depth and hidden risks.
      Also provide one specific recommended action (max 5 words).

      Return JSON: {insight, action}
    `;

    const ai = AIService.getInstance();
    const out = await ai.generateJson<{ insight: string; action: string }>({
      featureKey: 'nexus.client_insight',
      prompt,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          insight: { type: Type.STRING },
          action: { type: Type.STRING },
        },
      },
    });

    return out.result;
  } catch {
    return { insight: 'הלקוח דורש תשומת לב מוגברת סביב נושאי תקציב.', action: 'קבע שיחת בירור' };
  }
}

export async function generateDailyBriefingAction(riskyClientsCount: number, opportunitiesCount: number, meetingsCount: number) {
  try {
    const prompt = `Generate a "Morning Protocol" briefing for an Account Manager in Hebrew. Data: ${riskyClientsCount} risky, ${opportunitiesCount} opportunities, ${meetingsCount} meetings. Professional, concise style. JSON: {greeting, focusPoints: string[], quote}`;

    const ai = AIService.getInstance();
    const out = await ai.generateJson<{ greeting: string; focusPoints: string[]; quote: string }>({
      featureKey: 'nexus.daily_briefing',
      prompt,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          greeting: { type: Type.STRING },
          focusPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          quote: { type: Type.STRING },
        },
      },
    });

    return out.result;
  } catch {
    return { greeting: 'בוקר טוב. הנה הלו"ז שלך.', focusPoints: ['בדוק את נובקורפ', 'הכנה לפגישת אית\'ר'], quote: 'הצלחה היא התמדה.' };
  }
}

export async function generateSuccessRecommendationAction(clientName: string, healthScore: number) {
  try {
    const prompt = `As a high-end agency consultant, provide a tip in Hebrew for the business owner on how to use transparency to retain client "${clientName}". Health Score is ${healthScore}/100. Tip should be motivating and professional (max 15 words). JSON: {tip, expectedBenefit}`;

    const ai = AIService.getInstance();
    const out = await ai.generateJson<{ tip?: string; expectedBenefit?: string }>({
      featureKey: 'nexus.success_recommendation',
      prompt,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tip: { type: Type.STRING },
          expectedBenefit: { type: Type.STRING },
        },
      },
    });

    const parsed = out.result || {};
    return {
      tip: parsed.tip || 'שקיפות מלאה במדדי הצלחה מחזקת את האמון בטווח הארוך.',
      expectedBenefit: parsed.expectedBenefit || 'שיפור בשימור לקוח (Retention)',
    };
  } catch {
    return {
      tip: 'שקיפות מלאה במדדי הצלחה מחזקת את האמון בטווח הארוך.',
      expectedBenefit: 'שיפור בשימור לקוח (Retention)',
    };
  }
}

export async function generateSmartReplyAction(emailBody: string, senderName: string, tone: string = 'professional') {
  const prompt = `Reply to this email in Hebrew. From: ${senderName || 'הלקוח'}. Body: ${emailBody}. Tone: ${tone}. Brief and helpful.`;
  const ai = AIService.getInstance();
  const out = await ai.generateText({
    featureKey: 'nexus.smart_reply',
    prompt,
  });
  return out.text || '';
}
