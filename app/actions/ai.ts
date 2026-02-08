'use server';

import { Type } from '@google/genai';
import { AIService } from '@/lib/services/ai/AIService';
import { analyzeMeetingTranscript } from '@/lib/services/ai/analyze-meeting-transcript';

export async function analyzeMeetingTranscriptAction(transcript: string) {
  return await analyzeMeetingTranscript(transcript);
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
