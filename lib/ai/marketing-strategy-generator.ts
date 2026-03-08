/**
 * AI Marketing Strategy Generator
 * יוצר אסטרטגיית שיווק מותאמת אישית לכל לקוח
 */

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export interface ClientProfile {
  name: string;
  industry: string;
  targetAudience: string;
  goals: string[];
  competitors?: string[];
  budget?: string;
  currentChallenges?: string[];
}

export interface MarketingStrategy {
  overview: string;
  contentPillars: {
    title: string;
    description: string;
    topics: string[];
  }[];
  monthlyCalendar: {
    week: number;
    posts: {
      platform: string;
      topic: string;
      contentType: string;
    }[];
  }[];
  hashtags: {
    primary: string[];
    secondary: string[];
  };
  bestPostingTimes: {
    platform: string;
    days: string[];
    hours: string[];
  }[];
  competitiveAdvantage: string[];
  kpis: {
    metric: string;
    target: string;
  }[];
}

/**
 * יוצר אסטרטגיית שיווק מלאה מותאמת ללקוח
 */
export async function generateMarketingStrategy(
  clientProfile: ClientProfile
): Promise<MarketingStrategy> {
  const prompt = `
אתה מומחה אסטרטגיית שיווק דיגיטלי. צור אסטרטגיה מלאה ללקוח הבא:

שם העסק: ${clientProfile.name}
תחום: ${clientProfile.industry}
קהל יעד: ${clientProfile.targetAudience}
מטרות: ${clientProfile.goals.join(', ')}
${clientProfile.competitors ? `מתחרים: ${clientProfile.competitors.join(', ')}` : ''}
${clientProfile.budget ? `תקציב: ${clientProfile.budget}` : ''}
${clientProfile.currentChallenges ? `אתגרים: ${clientProfile.currentChallenges.join(', ')}` : ''}

צור אסטרטגיית שיווק מפורטת הכוללת:

1. סקירה כללית (2-3 פסקאות)
2. 4 עמודי תוכן ראשיים (Content Pillars) - כל אחד עם כותרת, תיאור, ו-5 נושאים ספציפיים
3. תוכנית תוכן חודשית (4 שבועות) - כל שבוע עם 3-4 פוסטים מוצעים לפלטפורמות שונות
4. Hashtags מומלצים (10 primary + 10 secondary)
5. זמני פרסום מיטביים לכל פלטפורמה
6. 5 יתרונות תחרותיים
7. 6 KPIs למדידה

החזר את התשובה בפורמט JSON הבא:
{
  "overview": "...",
  "contentPillars": [
    {
      "title": "...",
      "description": "...",
      "topics": ["...", "...", ...]
    }
  ],
  "monthlyCalendar": [
    {
      "week": 1,
      "posts": [
        {
          "platform": "facebook",
          "topic": "...",
          "contentType": "תמונה/וידאו/טקסט"
        }
      ]
    }
  ],
  "hashtags": {
    "primary": ["...", ...],
    "secondary": ["...", ...]
  },
  "bestPostingTimes": [
    {
      "platform": "facebook",
      "days": ["ראשון", "שלישי", ...],
      "hours": ["09:00", "17:00", ...]
    }
  ],
  "competitiveAdvantage": ["...", ...],
  "kpis": [
    {
      "metric": "...",
      "target": "..."
    }
  ]
}

**חשוב:** החזר רק את ה-JSON, ללא טקסט נוסף.
`;

  try {
    const { text } = await generateText({
      model: openai('gpt-4-turbo'),
      prompt,
      temperature: 0.7,
    });

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from AI response');
    }

    const strategy: MarketingStrategy = JSON.parse(jsonMatch[0]);
    return strategy;
  } catch (error) {
    console.error('Error generating marketing strategy:', error);
    throw new Error('Failed to generate marketing strategy');
  }
}

/**
 * מייצר תוכנית תוכן שבועית פשוטה
 */
export async function generateWeeklyContentPlan(
  clientProfile: ClientProfile,
  weekNumber: number
): Promise<{ day: string; platform: string; topic: string; contentType: string }[]> {
  const prompt = `
צור תוכנית תוכן לשבוע ${weekNumber} עבור:
עסק: ${clientProfile.name}
תחום: ${clientProfile.industry}
קהל יעד: ${clientProfile.targetAudience}

צור 7 פוסטים (אחד ליום) עם התפלגות:
- 3 פוסטים לפייסבוק
- 2 פוסטים לאינסטגרם
- 2 פוסטים ללינקדאין

כל פוסט צריך:
- יום (ראשון-שבת)
- פלטפורמה
- נושא ספציפי
- סוג תוכן (תמונה/וידאו/טקסט/סטורי)

החזר JSON בפורמט:
[
  {
    "day": "ראשון",
    "platform": "facebook",
    "topic": "...",
    "contentType": "תמונה"
  }
]
`;

  try {
    const { text } = await generateText({
      model: openai('gpt-4-turbo'),
      prompt,
      temperature: 0.8,
    });

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error generating weekly plan:', error);
    throw new Error('Failed to generate weekly content plan');
  }
}

/**
 * מנתח קהל יעד ומחזיר insights
 */
export async function analyzeTargetAudience(
  industry: string,
  targetAudience: string
): Promise<{
  demographics: string[];
  painPoints: string[];
  interests: string[];
  contentPreferences: string[];
}> {
  const prompt = `
נתח את קהל היעד הבא:
תחום: ${industry}
קהל יעד: ${targetAudience}

החזר ניתוח מפורט בפורמט JSON:
{
  "demographics": ["גיל 25-45", "..."],
  "painPoints": ["בעיה 1", "בעיה 2", ...],
  "interests": ["עניין 1", "עניין 2", ...],
  "contentPreferences": ["סרטונים קצרים", "אינפוגרפיקות", ...]
}
`;

  try {
    const { text } = await generateText({
      model: openai('gpt-4-turbo'),
      prompt,
      temperature: 0.7,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error analyzing audience:', error);
    throw new Error('Failed to analyze target audience');
  }
}
