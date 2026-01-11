
'use client';

import type { PostVariation, AIOpportunity, Message, ClientDNA, Client, TeamMember } from '@/types/social';

// Note: Always create a new GoogleGenAI instance right before making an API call 
// to ensure it uses the most up-to-date API key.

export const generatePostVariations = async (
  brief: string,
  clientName: string,
  dna: ClientDNA,
  useSearch: boolean = false
): Promise<PostVariation[]> => {
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

  try {
    const res = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: prompt,
        rawData: { brief, clientName, useSearch },
      }),
    });

    if (!res.ok) return [];
    const data = (await res.json().catch(() => ({}))) as any;
    const result = data?.result;
    if (!result?.actionableSteps) return [];

    // Fallback: convert actionable steps into variations
    return (result.actionableSteps as string[]).slice(0, 3).map((content, i) => ({
      id: `var-${Date.now()}-${i}`,
      type: ['sales', 'social', 'value'][i] as any,
      content,
      imageSuggestion: '',
    }));
  } catch {
    return [];
  }
};

export const getTrendingOpportunities = async (
  clientName: string
): Promise<AIOpportunity[]> => {
  return [];
};

export const getBusinessAudit = async (client: Client): Promise<string> => {
  const m = client.businessMetrics;
  const hours = Math.max(1, (m?.timeSpentMinutes || 0) / 60);
  const fee = client.monthlyFee || 0;
  const hourlyRate = fee / hours;

  return `סיכום מהיר (אופליין): ${client.companyName} משלם ₪${fee}. שכר שעתי אפקטיבי ~₪${Math.round(hourlyRate)}. מומלץ לבדוק תהליכי עבודה ורמת זמינות מול הלקוח.`;
};

export const getGlobalAgencyAudit = async (clients: Client[], team: TeamMember[]): Promise<string> => {
  const totalRevenue = clients.reduce((sum, c) => sum + (c.monthlyFee || 0), 0);
  const totalStaffCost = team.reduce((sum, m) => sum + (m.monthlySalary || (m.hourlyRate || 0) * 160), 0);
  const netProfit = totalRevenue - totalStaffCost;

  return `סיכום אופליין: הכנסות ₪${totalRevenue.toLocaleString()} | עלות צוות ₪${totalStaffCost.toLocaleString()} | רווח מוערך ₪${netProfit.toLocaleString()}.`;
};

export const draftAIResponse = async (
  incomingMessage: string,
  clientName: string,
  brandVoice: string,
  history: Message[]
): Promise<string> => {
  void history;
  return `היי! קיבלתי את ההודעה בנושא "${incomingMessage}". חוזרים אליך בהקדם.\n\n— ${clientName}`;
};

export const getMorningBriefing = async (clients: string[]): Promise<string> => {
  return `בוקר טוב! היום פוקוס: תיעוד מהשטח + ערך קצר. לקוחות: ${clients.slice(0, 5).join(', ')}${clients.length > 5 ? '…' : ''}`;
};

export const generateAIImage = async (prompt: string): Promise<string | null> => {
  void prompt;
  return null;
};

