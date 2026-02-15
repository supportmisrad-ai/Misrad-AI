'use server';


import { logger } from '@/lib/server/logger';
import { PostVariation, AIOpportunity, ClientDNA } from "@/types/social";
import { AIService } from "@/lib/services/ai/AIService";

import { requireAuth } from '@/lib/errorHandler';


import { asObject } from '@/lib/shared/unknown';
function getStringProp(obj: Record<string, unknown> | null, key: string): string {
  const v = obj?.[key];
  return typeof v === 'string' ? v : '';
}

function getNumberProp(obj: Record<string, unknown> | null, key: string): number {
  const v = obj?.[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

export async function generatePostVariationsAction(
  brief: string,
  clientName: string,
  dna: ClientDNA,
  useSearch: boolean = false
): Promise<PostVariation[]> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) return [];

    const formalText = dna.voice.formal > 70 ? "רשמי מאוד, שפה נקייה ומכובדת" : dna.voice.formal < 30 ? "חברי, בגובה העיניים, סלנג עדין" : "מאוזן";
    const funnyText = dna.voice.funny > 70 ? "הומוריסטי, שנון, משתמש באימוג'ים מצחיקים" : dna.voice.funny < 30 ? "רציני, ענייני, מקצועי" : "חיובי";
    const lengthText = dna.voice.length > 70 ? "מפורט, עם הרבה ערך מוסף" : dna.voice.length < 30 ? "קצר וקולע, פאנצ'י" : "בינוני";

    const prompt = `
      אתה מנהל סושיאל מדיה ישראלי בכיר.
      ייצר 3 גרסאות לפוסט עבור המותג: ${clientName}.
      
      תיאור המותג וזהותו (BRAND IDENTITY):
      ${dna.brandSummary || "עסק ישראלי מקצועי."}

      דגשים לסגנון הכתיבה (DNA של המותג):
      - רמת רשמיות: ${formalText} (${dna.voice.formal}%)
      - רמת הומור: ${funnyText} (${dna.voice.funny}%)
      - אורך הפוסט: ${lengthText} (${dna.voice.length}%)
      
      מילים אהובות לשימוש: ${dna.vocabulary.loved.join(', ')}
      מילים אסורות: ${dna.vocabulary.forbidden.join(', ')}

      הנושא המבוקש לפוסט: ${brief}.
      
      גרסה 1: מכירתית (Sales) - ממוקדת הנעה לפעולה ברורה.
      גרסה 2: מעורבות (Social) - ממוקדת שאילת שאלות, יצירת שיח ותיוגים.
      גרסה 3: ערך (Value) - ממוקדת מתן ידע, טיפ מקצועי או השראה.

      לכל וריאציה, הוסף המלצות hashtags מותאמות לפלטפורמות:
      - Facebook: 1-2 hashtags (פחות מקובל)
      - Instagram: 5-10 hashtags רלוונטיים
      - LinkedIn: 3-5 hashtags מקצועיים
      
      החזר את התוצאה במבנה JSON array של אובייקטים עם השדות:
      {
        "id": string,
        "type": string,
        "content": string,
        "imageSuggestion": string,
        "suggestedHashtags": {
          "facebook": [string],
          "instagram": [string],
          "linkedin": [string]
        }
      }
      
      הקפד על עברית טבעית, זורמת ומותאמת לקהל הישראלי.
      Hashtags יכולים להיות בעברית או אנגלית לפי הנושא והפלטפורמה.
    `;

    const ai = AIService.getInstance();
    const out = await ai.generateText({
      featureKey: 'social.post_variations',
      prompt,
      meta: { clientName, useSearch },
    });
    const text = out.text || '';
    
    // Parse JSON response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed: unknown = JSON.parse(jsonMatch[0]);
      const list: unknown[] = Array.isArray(parsed) ? parsed : [];
      const fallbackTypes = ['sales', 'social', 'value'];
      return list.map((p, i): PostVariation => {
        const obj = asObject(p);
        const id = getStringProp(obj, 'id') || `var-${Date.now()}-${i}`;
        const type = getStringProp(obj, 'type') || fallbackTypes[i] || '';
        const content = getStringProp(obj, 'content') || '';
        const imageSuggestion = getStringProp(obj, 'imageSuggestion') || '';
        
        // Parse suggestedHashtags
        const hashtagsObj = asObject(obj?.suggestedHashtags);
        const suggestedHashtags = hashtagsObj ? {
          facebook: Array.isArray(hashtagsObj.facebook) ? hashtagsObj.facebook.map(String).filter(Boolean) : undefined,
          instagram: Array.isArray(hashtagsObj.instagram) ? hashtagsObj.instagram.map(String).filter(Boolean) : undefined,
          linkedin: Array.isArray(hashtagsObj.linkedin) ? hashtagsObj.linkedin.map(String).filter(Boolean) : undefined,
          general: Array.isArray(hashtagsObj.general) ? hashtagsObj.general.map(String).filter(Boolean) : undefined,
        } : undefined;
        
        return { id, type, content, imageSuggestion, suggestedHashtags };
      });
    }
    
    return [];
  } catch (error) {
    logger.error('ai-actions', 'Error generating post variations:', error);
    return [];
  }
}

export async function generateAIImageAction(prompt: string): Promise<string> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) return '';

    // This is a placeholder - actual image generation would use Gemini's image generation API
    return `https://picsum.photos/seed/${encodeURIComponent(prompt)}/800/600`;
  } catch (error) {
    logger.error('ai-actions', 'Error generating image:', error);
    return '';
  }
}

export async function getTrendingOpportunitiesAction(): Promise<AIOpportunity[]> {
  const authCheck = await requireAuth();
  if (!authCheck.success) return [];

  // Returns empty array - to be implemented with real AI analysis
  return [];
}

export async function getBusinessAuditAction(clientId: string): Promise<string> {
  const authCheck = await requireAuth();
  if (!authCheck.success) return '';

  // Returns empty object - to be implemented with real AI analysis
  return '';
}

export async function draftAIResponseAction(message: string, context: string): Promise<string> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) return '';

    const prompt = `כתוב תגובה מקצועית וחמה בעברית להודעה הבאה: "${message}". הקשר: ${context}`;

    const ai = AIService.getInstance();
    const out = await ai.generateText({
      featureKey: 'social.draft_reply',
      prompt,
    });
    return out.text || '';
  } catch (error) {
    logger.error('ai-actions', 'Error drafting response:', error);
    return '';
  }
}

export async function getGlobalAgencyAuditAction(clients: unknown[], team: unknown[]): Promise<string> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) return 'נדרשת התחברות';

    const totalRevenue = clients.reduce<number>((sum, c) => {
      const obj = asObject(c);
      return sum + getNumberProp(obj, 'monthlyFee');
    }, 0);
    const totalMinutes = clients.reduce<number>((sum, c) => {
      const obj = asObject(c);
      const metrics = asObject(obj?.businessMetrics);
      return sum + getNumberProp(metrics, 'timeSpentMinutes');
    }, 0);
    const totalStaffCost = team.reduce<number>((sum, m) => {
      const obj = asObject(m);
      const monthlySalary = getNumberProp(obj, 'monthlySalary');
      const hourlyRate = getNumberProp(obj, 'hourlyRate');
      return sum + (monthlySalary || hourlyRate * 160);
    }, 0);
    const netProfit = totalRevenue - totalStaffCost;
    
    const prompt = `
      אתה יועץ עסקי בכיר לניהול סוכנויות דיגיטל.
      נתח את המצב הפיננסי והתפעולי של הסוכנות הבאה:
      
      סה"כ הכנסות חודשיות: ${totalRevenue.toLocaleString()} ₪
      סה"כ עלויות שכר: ${totalStaffCost.toLocaleString()} ₪
      רווח נקי: ${netProfit.toLocaleString()} ₪
      סה"כ שעות עבודה: ${Math.round(totalMinutes / 60)} שעות
      מספר לקוחות: ${clients.length}
      מספר עובדים: ${team.length}
      
      תן ניתוח מפורט בעברית עם:
      1. נקודות חוזק
      2. נקודות לשיפור
      3. המלצות קונקרטיות
      4. תחזית לרווחיות
    `;

    const ai = AIService.getInstance();
    const out = await ai.generateText({
      featureKey: 'nexus.global_agency_audit',
      prompt,
    });

    return out.text || 'לא ניתן לקבל ניתוח כרגע';
  } catch (error) {
    logger.error('ai-actions', 'Error getting agency audit:', error);
    return 'שגיאה בניתוח - נסה שוב מאוחר יותר';
  }
}

