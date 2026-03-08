import { GoogleGenAI } from '@google/genai';

const PROOFREAD_PROMPT = `אתה עורך לשוני מקצועי לעברית.
קיבלת תמלול של הקלטת שיחה. התמלול מכיל שגיאות כתיב רבות שנגרמו על ידי מנוע תמלול אוטומטי.

**המשימה שלך:**
1. תקן אך ורק שגיאות כתיב בעברית (למשל: "אתא" → "אתה", "שלומכ" → "שלומך", "אנחנו הולכימ" → "אנחנו הולכים")
2. תקן ניקוד חסר של אותיות סופיות (ם, ן, ך, ף, ץ)
3. תקן מילים שנשמעות דומה אבל נכתבות אחרת (למשל: "הימים" במקום "היימים")

**אסור לך:**
- לשנות מילים או ביטויים (אל תחליף מילה במילה אחרת)
- להוסיף או למחוק מילים
- לשנות סדר מילים
- לשנות פיסוק
- לשנות timestamps כמו [00:00] או תגיות דוברים כמו "דובר 1:"
- להוסיף הערות או הסברים
- לשנות שפה (אם יש מילים באנגלית, השאר אותן)

החזר רק את הטקסט המתוקן, ללא שום תוספת.

התמלול:
`;

/**
 * Proofread a Hebrew transcript using Gemini Flash.
 * Fixes only spelling errors — no word changes, no additions, no deletions.
 * Returns original text if proofreading fails (best-effort).
 */
export async function proofreadHebrewTranscript(transcript: string): Promise<string> {
  if (!transcript || transcript.length < 20) return transcript;

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';
  if (!apiKey) {
    console.warn('[proofreadHebrewTranscript] No Gemini API key found, skipping proofreading');
    return transcript;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: PROOFREAD_PROMPT + transcript }] }],
      config: {
        temperature: 0.1,
        maxOutputTokens: Math.min(transcript.length * 2, 16000),
      },
    });

    const corrected = (response.text || '').trim();

    // Sanity check: if the corrected text is too different in length, something went wrong
    const lengthRatio = corrected.length / transcript.length;
    if (!corrected || lengthRatio < 0.7 || lengthRatio > 1.3) {
      console.warn('[proofreadHebrewTranscript] Corrected text length too different, using original', {
        originalLength: transcript.length,
        correctedLength: corrected.length,
        ratio: lengthRatio,
      });
      return transcript;
    }

    console.log('[proofreadHebrewTranscript] Proofreading completed', {
      originalLength: transcript.length,
      correctedLength: corrected.length,
      changed: corrected !== transcript,
    });

    return corrected;
  } catch (err) {
    console.error('[proofreadHebrewTranscript] Proofreading failed, using original transcript', {
      error: err instanceof Error ? err.message : String(err),
    });
    return transcript;
  }
}
