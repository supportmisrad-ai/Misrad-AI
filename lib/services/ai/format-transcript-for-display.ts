import { GoogleGenAI } from '@google/genai';

const FORMAT_PROMPT = `אתה עורך תמלולים מקצועי.
קיבלת תמלול גולמי של שיחה עם timestamps בפורמט [MM:SS] ותגיות דוברים.

**המשימה שלך:**
1. הסר את כל ה-timestamps ([MM:SS])
2. הסר את תגיות הדוברים (Speaker 0, Speaker 1, דובר 0, דובר 1)
3. ארגן את הטקסט לפסקאות קריאות
4. הוסף פיסוק מלא: נקודות, פסיקים, סימני שאלה, סימני קריאה
5. הוסף ירידות שורה הגיוניות בין נושאים
6. הוסף אימוג'ים רלוונטיים במקומות מתאימים (2-4 אימוג'ים בסך הכל, לא יותר)
7. שמור על כל תוכן השיחה - אל תמחק או תשנה מילים

**אסור לך:**
- לשנות מילים או משפטים
- להוסיף תוכן שלא היה בשיחה
- למחוק חלקים מהשיחה
- להוסיף כותרות או מבנה שלא נדרש

החזר רק את התמלול המעוצב, ללא שום הסברים או הקדמות.

התמלול הגולמי:
`;

/**
 * Format a raw transcript with timestamps into a clean, readable format with punctuation and emojis.
 * Used for "clean" display mode in Client-OS.
 */
export async function formatTranscriptForDisplay(rawTranscript: string): Promise<string> {
  if (!rawTranscript || rawTranscript.length < 20) return rawTranscript;

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';
  if (!apiKey) {
    console.warn('[formatTranscriptForDisplay] No Gemini API key found, returning raw transcript');
    return rawTranscript;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: FORMAT_PROMPT + rawTranscript }] }],
      config: {
        temperature: 0.3,
        maxOutputTokens: Math.min(rawTranscript.length * 2, 16000),
      },
    });

    const formatted = (response.text || '').trim();

    // Sanity check: formatted text shouldn't be too different in length
    const lengthRatio = formatted.length / rawTranscript.length;
    if (!formatted || lengthRatio < 0.5 || lengthRatio > 2.0) {
      console.warn('[formatTranscriptForDisplay] Formatted text length too different, using raw', {
        originalLength: rawTranscript.length,
        formattedLength: formatted.length,
        ratio: lengthRatio,
      });
      return rawTranscript;
    }

    console.log('[formatTranscriptForDisplay] Formatting completed', {
      originalLength: rawTranscript.length,
      formattedLength: formatted.length,
      changed: formatted !== rawTranscript,
    });

    return formatted;
  } catch (err) {
    console.error('[formatTranscriptForDisplay] Formatting failed, using raw transcript', {
      error: err instanceof Error ? err.message : String(err),
    });
    return rawTranscript;
  }
}
