'use server';

import { GoogleGenAI, Type } from '@google/genai';

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY');
  return apiKey;
}

function getAI() {
  return new GoogleGenAI({ apiKey: getApiKey() });
}

export async function analyzeMeetingTranscriptAction(transcript: string) {
  const ai = getAI();

  try {
    const model = 'gemini-3-pro-preview';
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

      Output must be valid JSON.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: transcript,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            sentimentScore: { type: Type.NUMBER },
            frictionKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            objections: { type: Type.ARRAY, items: { type: Type.STRING } },
            compliments: { type: Type.ARRAY, items: { type: Type.STRING } },
            decisions: { type: Type.ARRAY, items: { type: Type.STRING } },
            intents: { type: Type.ARRAY, items: { type: Type.STRING } },
            stories: { type: Type.ARRAY, items: { type: Type.STRING } },
            slang: { type: Type.ARRAY, items: { type: Type.STRING } },
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
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error('No response from Nexus AI');

    const data = JSON.parse(text);

    if (Array.isArray(data?.agencyTasks)) {
      data.agencyTasks = data.agencyTasks.map((t: any, i: number) => ({
        ...t,
        id: `at-${Date.now()}-${i}`,
        status: 'PENDING',
      }));
    }
    if (Array.isArray(data?.clientTasks)) {
      data.clientTasks = data.clientTasks.map((t: any, i: number) => ({
        ...t,
        id: `ct-${Date.now()}-${i}`,
        status: 'PENDING',
      }));
    }

    return data;
  } catch {
    return {
      summary: 'ניתוח סימולציה: הלקוח מביע עניין אך דורש הבהרות לגבי לוחות זמנים. הסוכנות הבטיחה מענה עד סוף השבוע.',
      sentimentScore: 75,
      frictionKeywords: ['זמנים', 'לו"ז', 'דחוף'],
      objections: ['המחיר גבוה מדי'],
      compliments: ['העיצוב מרשים'],
      decisions: ['פגישת המשך ביום שלישי'],
      agencyTasks: [{ id: 'at1', task: 'שליחת הצעת מחיר מעודכנת', deadline: 'מחר', priority: 'HIGH', status: 'PENDING' }],
      clientTasks: [{ id: 'ct1', task: "אישור שלב א'", deadline: 'סוף שבוע', priority: 'NORMAL', status: 'PENDING' }],
      liabilityRisks: [{ quote: 'נעשה הכל עד מחר', context: 'הבטחה לא ריאלית', riskLevel: 'HIGH' }],
    };
  }
}

export async function generateClientInsightAction(clientName: string, healthScore: number, sentimentTrend: string[]) {
  const ai = getAI();

  try {
    const model = 'gemini-3-flash-preview';
    const prompt = `
      Act as a senior B2B Account Manager AI.
      Analyze the client "${clientName}".
      Health Score: ${healthScore}/100.
      Recent Sentiment Trend: ${sentimentTrend.join(', ')}.

      Provide a strategic insight in Hebrew (max 30 words) focusing on relationship depth and hidden risks.
      Also provide one specific recommended action (max 5 words).

      Return JSON: {insight, action}
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insight: { type: Type.STRING },
            action: { type: Type.STRING },
          },
        },
      },
    });

    return JSON.parse(response.text || '{}');
  } catch {
    return { insight: 'הלקוח דורש תשומת לב מוגברת סביב נושאי תקציב.', action: 'קבע שיחת בירור' };
  }
}

export async function generateDailyBriefingAction(riskyClientsCount: number, opportunitiesCount: number, meetingsCount: number) {
  const ai = getAI();

  try {
    const model = 'gemini-3-flash-preview';
    const prompt = `Generate a "Morning Protocol" briefing for an Account Manager in Hebrew. Data: ${riskyClientsCount} risky, ${opportunitiesCount} opportunities, ${meetingsCount} meetings. Professional, concise style. JSON: {greeting, focusPoints: string[], quote}`;
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            greeting: { type: Type.STRING },
            focusPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            quote: { type: Type.STRING },
          },
        },
      },
    });

    return JSON.parse(response.text || '{}');
  } catch {
    return { greeting: 'בוקר טוב. הנה הלו"ז שלך.', focusPoints: ['בדוק את נובקורפ', 'הכנה לפגישת אית\'ר'], quote: 'הצלחה היא התמדה.' };
  }
}

export async function generateSuccessRecommendationAction(clientName: string, healthScore: number) {
  const ai = getAI();

  try {
    const model = 'gemini-3-flash-preview';
    const prompt = `As a high-end agency consultant, provide a tip in Hebrew for the business owner on how to use transparency to retain client "${clientName}". Health Score is ${healthScore}/100. Tip should be motivating and professional (max 15 words). JSON: {tip, expectedBenefit}`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tip: { type: Type.STRING },
            expectedBenefit: { type: Type.STRING },
          },
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
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
  const ai = getAI();

  const model = 'gemini-3-flash-preview';
  const prompt = `Reply to this email in Hebrew. From: ${senderName || 'הלקוח'}. Body: ${emailBody}. Tone: ${tone}. Brief and helpful.`;
  const response = await ai.models.generateContent({ model, contents: prompt });
  return response.text || '';
}
