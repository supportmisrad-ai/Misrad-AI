'use server';

import { GoogleGenAI } from "@google/genai";
import { PostVariation, AIOpportunity, ClientDNA } from "@/types";

export async function generatePostVariationsAction(
  brief: string,
  clientName: string,
  dna: ClientDNA,
  useSearch: boolean = false
): Promise<PostVariation[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not found');
    return [];
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey });
    
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

      החזר את התוצאה במבנה JSON array של אובייקטים עם השדות: id, type, content, imageSuggestion.
      הקפד על עברית טבעית, זורמת ומותאמת לקהל הישראלי.
    `;

    const model = ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
    });

    const response = await model;
    const text = response.text || '';
    
    // Parse JSON response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.map((p: any, i: number) => ({
        id: p.id || `var-${Date.now()}-${i}`,
        type: p.type || ['sales', 'social', 'value'][i],
        content: p.content || '',
        imageSuggestion: p.imageSuggestion || ''
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error generating post variations:', error);
    return [];
  }
}

export async function generateAIImageAction(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not found');
    return '';
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey });
    // This is a placeholder - actual image generation would use Gemini's image generation API
    return `https://picsum.photos/seed/${encodeURIComponent(prompt)}/800/600`;
  } catch (error) {
    console.error('Error generating image:', error);
    return '';
  }
}

export async function getTrendingOpportunitiesAction(): Promise<AIOpportunity[]> {
  // Returns empty array - to be implemented with real AI analysis
  return [];
}

export async function getBusinessAuditAction(clientId: string): Promise<any> {
  // Returns empty object - to be implemented with real AI analysis
  return {};
}

export async function draftAIResponseAction(message: string, context: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return '';
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `כתוב תגובה מקצועית וחמה בעברית להודעה הבאה: "${message}". הקשר: ${context}`;
    const model = ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
    });
    const response = await model;
    return response.text || '';
  } catch (error) {
    console.error('Error drafting response:', error);
    return '';
  }
}

export async function getGlobalAgencyAuditAction(clients: any[], team: any[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not found');
    return 'לא ניתן לבצע ניתוח - מפתח API חסר';
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const totalRevenue = clients.reduce((sum, c) => sum + (c.monthlyFee || 0), 0);
    const totalMinutes = clients.reduce((sum, c) => sum + (c.businessMetrics?.timeSpentMinutes || 0), 0);
    const totalStaffCost = team.reduce((sum, m) => sum + (m.monthlySalary || (m.hourlyRate || 0) * 160), 0);
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
    
    const model = ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
    });
    
    const response = await model;
    return response.text || 'לא ניתן לקבל ניתוח כרגע';
  } catch (error) {
    console.error('Error getting agency audit:', error);
    return 'שגיאה בניתוח - נסה שוב מאוחר יותר';
  }
}

