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
    if (!authCheck.success) {
      logger.warn('ai-actions', 'generatePostVariationsAction: auth failed', { clientName });
      return [];
    }

    // Validate DNA structure
    logger.info('ai-actions', 'generatePostVariationsAction: DNA received', {
      hasDna: !!dna,
      hasVoice: !!dna?.voice,
      hasVocabulary: !!dna?.vocabulary,
      voiceKeys: dna?.voice ? Object.keys(dna.voice) : [],
      vocabKeys: dna?.vocabulary ? Object.keys(dna.vocabulary) : [],
      lovedCount: dna?.vocabulary?.loved?.length || 0,
      forbiddenCount: dna?.vocabulary?.forbidden?.length || 0,
      formalValue: dna?.voice?.formal,
      funnyValue: dna?.voice?.funny,
      lengthValue: dna?.voice?.length,
    });

    // Default DNA values if missing
    const safeDna: ClientDNA = {
      brandSummary: dna?.brandSummary || 'עסק ישראלי מקצועי.',
      voice: {
        formal: dna?.voice?.formal ?? 50,
        funny: dna?.voice?.funny ?? 50,
        length: dna?.voice?.length ?? 50,
      },
      vocabulary: {
        loved: dna?.vocabulary?.loved || [],
        forbidden: dna?.vocabulary?.forbidden || [],
      },
      colors: dna?.colors || { primary: '#3B82F6', secondary: '#10B981' },
    };

    const formalText = safeDna.voice.formal > 70 ? "רשמי מאוד, שפה נקייה ומכובדת" : safeDna.voice.formal < 30 ? "חברי, בגובה העיניים, סלנג עדין" : "מאוזן";
    const funnyText = safeDna.voice.funny > 70 ? "הומוריסטי, שנון, משתמש באימוג'ים מצחיקים" : safeDna.voice.funny < 30 ? "רציני, ענייני, מקצועי" : "חיובי";
    const lengthText = safeDna.voice.length > 70 ? "מפורט, עם הרבה ערך מוסף" : safeDna.voice.length < 30 ? "קצר וקולע, פאנצ'י" : "בינוני";

    const prompt = `
      אתה מנהל סושיאל מדיה ישראלי בכיר.
      ייצר 3 גרסאות לפוסט עבור המותג: ${clientName}.
      
      תיאור המותג וזהותו (BRAND IDENTITY):
      ${safeDna.brandSummary}

      דגשים לסגנון הכתיבה (DNA של המותג):
      - רמת רשמיות: ${formalText} (${safeDna.voice.formal}%)
      - רמת הומור: ${funnyText} (${safeDna.voice.funny}%)
      - אורך הפוסט: ${lengthText} (${safeDna.voice.length}%)
      
      מילים אהובות לשימוש: ${safeDna.vocabulary.loved.join(', ')}
      מילים אסורות: ${safeDna.vocabulary.forbidden.join(', ')}

      הנושא המבוקש לפוסט: ${brief}.
      
      גרסה 1: מכירתית (Sales) - ממוקדת הנעה לפעולה ברורה.
      גרסה 2: מעורבות (Social) - ממוקדת שאילת שאלות, יצירת שיח ותיוגים.
      גרסה 3: ערך (Value) - ממוקדת מתן ידע, טיפ מקצועי או השראה.

      לכל וריאציה, הוסף המלצות hashtags מותאמות ורלוונטיות לנושא הספציפי של הפוסט ולתעשייה של ${clientName}:
      - Facebook: 3-4 hashtags רלוונטיים לנושא
      - Instagram: 8-12 hashtags - שילוב של hashtags פופולריים, ספציפיים לנישה, ובעברית
      - LinkedIn: 4-6 hashtags מקצועיים רלוונטיים
      - General: 5-8 hashtags כלליים שמתאימים לכל הפלטפורמות

      חשוב מאוד: ה-hashtags חייבים להיות רלוונטיים לנושא הספציפי של הפוסט ולתעשייה של ${clientName}.
      אל תשתמש ב-hashtags גנריים מדי. השתמש ב-hashtags שאנשים באמת מחפשים.
      
      החזר את התוצאה במבנה JSON array של אובייקטים עם השדות:
      {
        "id": string,
        "type": string,
        "content": string,
        "imageSuggestion": string,
        "suggestedHashtags": {
          "facebook": [string],
          "instagram": [string],
          "linkedin": [string],
          "general": [string]
        }
      }
      
      הקפד על עברית טבעית, זורמת ומותאמת לקהל הישראלי.
      Hashtags יכולים להיות בעברית או אנגלית לפי הנושא והפלטפורמה.
      הקפד שהתוכן (content) ישמר עם ירידות שורה (\n) במקומות הנכונים לקריאות טובה.
    `;

    logger.info('ai-actions', 'generatePostVariationsAction: calling AI service', { 
      clientName, 
      briefLength: brief?.length,
      useSearch,
    });

    const ai = AIService.getInstance();
    const out = await ai.generateText({
      featureKey: 'social.post_variations',
      prompt,
      meta: { clientName, useSearch },
    });
    
    const text = out.text || '';
    logger.info('ai-actions', 'generatePostVariationsAction: AI response received', {
      textLength: text?.length,
      hasText: !!text,
      preview: text?.substring(0, 200),
    });
    
    // Parse JSON response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const parsed: unknown = JSON.parse(jsonMatch[0]);
        const list: unknown[] = Array.isArray(parsed) ? parsed : [];
        logger.info('ai-actions', 'generatePostVariationsAction: parsed variations', {
          count: list?.length,
        });
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
      } catch (parseError) {
        logger.error('ai-actions', 'generatePostVariationsAction: JSON parse error', {
          error: String(parseError),
          jsonPreview: jsonMatch[0]?.substring(0, 500),
        });
        return [];
      }
    }
    
    logger.warn('ai-actions', 'generatePostVariationsAction: no JSON array found in response', {
      textPreview: text?.substring(0, 500),
    });
    return [];
  } catch (error) {
    logger.error('ai-actions', 'generatePostVariationsAction: Error generating post variations:', error);
    return [];
  }
}

export async function generateAIImageAction(
  prompt: string,
  size?: '1024x1024' | '1792x1024' | '1024x1792'
): Promise<string> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      logger.warn('ai-actions', 'generateAIImageAction: User not authenticated');
      throw new Error('נדרשת התחברות');
    }

    const ai = AIService.getInstance();
    
    logger.info('ai-actions', 'Generating AI image', { 
      promptLength: prompt.length, 
      size: size || '1024x1024',
      preview: prompt.substring(0, 100) 
    });
    
    const result = await ai.generateImage({
      featureKey: 'social.image_generation',
      prompt: String(prompt || 'creative social media post image'),
      size: size || '1024x1024',
      meta: { source: 'social_post_variation', imageSize: size },
    });

    logger.info('ai-actions', 'AI image generated successfully', {
      imageDataUrlLength: result.imageDataUrl.length,
      chargedCents: result.chargedCents,
      size: size || '1024x1024',
    });

    return result.imageDataUrl;
  } catch (error) {
    logger.error('ai-actions', 'Error generating AI image:', error);
    // Return empty string but log the actual error
    // The UI will handle this gracefully
    return '';
  }
}

export async function getTrendingOpportunitiesAction(): Promise<AIOpportunity[]> {
  const authCheck = await requireAuth();
  if (!authCheck.success) return [];

  // Trending opportunities require external data sources (Google Trends, social listening)
  // which are not yet integrated. Returns empty until external API integration.
  return [];
}

export async function getBusinessAuditAction(clientId: string): Promise<string> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) return '';
    if (!clientId) return '';

    const ai = AIService.getInstance();
    const prompt = `בצע ביקורת עסקית קצרה (3-5 משפטים) ללקוח מספר ${clientId}. התמקד בנקודות חוזק, סיכונים ותחומים לשיפור. אם אין לך מידע ספציפי — ציין זאת בכנות ותן המלצות כלליות.`;

    const out = await ai.generateText({
      featureKey: 'social.business_audit',
      prompt,
    });

    return out.text || 'לא ניתן לבצע ביקורת כרגע. נסה שוב מאוחר יותר.';
  } catch (error) {
    logger.error('ai-actions', 'Error getting business audit:', error);
    return 'שגיאה בביצוע ביקורת';
  }
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

// SECURITY NOTE: This action receives aggregated financial data from the client.
// Only aggregated totals are sent to the AI prompt — never individual salaries.
// The caller (UI) must ensure only managers with view_financials permission invoke this.
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
    // Compute aggregated staff cost — only the total is sent to AI, never individual salaries
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
      סה"כ עלויות שכר (מצטבר): ${totalStaffCost.toLocaleString()} ₪
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

