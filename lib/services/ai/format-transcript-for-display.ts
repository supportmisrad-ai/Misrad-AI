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
 * Deterministic fallback: strip timestamps and speaker labels using regex.
 * Always produces a clean transcript even without AI.
 */
function stripTimestampsAndSpeakers(text: string): string {
  let cleaned = text;
  // Remove [MM:SS] or [H:MM:SS] timestamps
  cleaned = cleaned.replace(/\[\d{1,2}:\d{2}(:\d{2})?\]\s*/g, '');
  // Remove speaker labels like "Speaker 0:", "דובר 1:", "Speaker 0 :", etc.
  cleaned = cleaned.replace(/(?:Speaker|דובר)\s*\d+\s*:\s*/gi, '');
  // Collapse multiple blank lines into one
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  // Trim each line
  cleaned = cleaned.split('\n').map(l => l.trim()).filter(Boolean).join('\n');
  return cleaned.trim();
}

/**
 * Format a raw transcript with timestamps into a clean, readable format with punctuation and emojis.
 * Used for "clean" display mode in Client-OS.
 * If AI formatting fails, falls back to deterministic regex stripping.
 */
export async function formatTranscriptForDisplay(rawTranscript: string): Promise<string> {
  if (!rawTranscript || rawTranscript.length < 20) return rawTranscript;

  // Match AIService.getProviderKey env resolution for google provider
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.API_KEY || '';
  if (!apiKey) {
    console.warn('[formatTranscriptForDisplay] No Gemini API key found, using regex fallback');
    return stripTimestampsAndSpeakers(rawTranscript);
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
    if (!formatted || lengthRatio < 0.3 || lengthRatio > 2.5) {
      console.warn('[formatTranscriptForDisplay] Formatted text length too different, using regex fallback', {
        originalLength: rawTranscript.length,
        formattedLength: formatted.length,
        ratio: lengthRatio,
      });
      return stripTimestampsAndSpeakers(rawTranscript);
    }

    // Extra safety: if formatted text still contains timestamps, strip them
    if (/\[\d{1,2}:\d{2}\]/.test(formatted)) {
      console.warn('[formatTranscriptForDisplay] AI output still contains timestamps, stripping them');
      return stripTimestampsAndSpeakers(formatted);
    }

    console.log('[formatTranscriptForDisplay] AI formatting completed', {
      originalLength: rawTranscript.length,
      formattedLength: formatted.length,
    });

    return formatted;
  } catch (err) {
    console.error('[formatTranscriptForDisplay] AI formatting failed, using regex fallback', {
      error: err instanceof Error ? err.message : String(err),
    });
    return stripTimestampsAndSpeakers(rawTranscript);
  }
}
