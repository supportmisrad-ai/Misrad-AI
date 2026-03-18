/**
 * AI Marketing Strategy Generator - Israel Market Optimized
 * יוצר אסטרטגיית שיווק מותאמת אישית לכל לקוח - מותאם לשוק הישראלי
 */

// TODO: TEMPORARY COST-SAVING MEASURE - Using Google AI Studio (free) instead of OpenAI (paid)
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

export interface ClientProfile {
  name: string;
  industry: string;
  targetAudience: string;
  goals: string[];
  competitors?: string[];
  budget?: string;
  currentChallenges?: string[];
  uniqueValue?: string;
  brandVoice?: string;
  // Israel-specific fields
  businessSize?: 'solo' | 'small' | 'medium' | 'large';
  targetLocations?: string[]; // e.g., ['תל אביב', 'ירושלים', 'חיפה']
  contentLanguages?: ('hebrew' | 'english' | 'arabic' | 'russian')[];
  religiousConsiderations?: boolean; // שבת, חגים
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
      timing?: string;
      hebrewDate?: string;
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
  specialCampaigns?: {
    name: string;
    timing: string;
    idea: string;
  }[];
}

/**
 * יוצר אסטרטגיית שיווק מלאה מותאמת ללקוח - ישראל מותאם
 */
export async function generateMarketingStrategy(
  clientProfile: ClientProfile
): Promise<MarketingStrategy> {
  const hebrewCalendarNote = clientProfile.religiousConsiderations !== false 
    ? `חשוב: המערכת מושבתת אוטומטית בשבת וחגים יהודיים (יש לתזמן תוכן בהתאם).`
    : '';

  const locationContext = clientProfile.targetLocations?.length 
    ? `אזורי פעילות עיקריים בישראל: ${clientProfile.targetLocations.join(', ')}`
    : '';

  const prompt = `
אתה מומחה אסטרטגיית שיווק דיגיטלי לשוק הישראלי עם 15 שנות ניסיון. 
צור אסטרטגיה מלאה ללקוח הבא - מותאם ספציפית לשוק הישראלי:

---
פרטי הלקוח:
שם העסק: ${clientProfile.name}
תחום: ${clientProfile.industry}
גודל עסק: ${clientProfile.businessSize}
קהל יעד: ${clientProfile.targetAudience}
מטרות עסקיות: ${clientProfile.goals.join(', ')}
${clientProfile.uniqueValue ? `ערך ייחודי: ${clientProfile.uniqueValue}` : ''}
${clientProfile.brandVoice ? `טון דיבור: ${clientProfile.brandVoice}` : ''}
${clientProfile.competitors?.length ? `מתחרים ישראלים עיקריים: ${clientProfile.competitors.join(', ')}` : ''}
${clientProfile.budget ? `תקציב שיווק חודשי: ${clientProfile.budget}` : ''}
${clientProfile.currentChallenges?.length ? `אתגרים נוכחיים: ${clientProfile.currentChallenges.join(', ')}` : ''}
${locationContext}

---
הנחיות ספציפיות לשוק הישראלי:

1. **פלטפורמות:** WhatsApp הוא קריטי בישראל (לקוחות מצפים לתקשורת שם), Instagram ו-Facebook עדיין מובילים, LinkedIn בולט ב-B2B
2. **לוח זמנים:** יום רביעי 11:00 הוא זמן פרסום מיטבי בישראל. התחשב בלוח השנה העברי (חגים, שבתות, צומות)
3. **תוכן:** עברית צריכה להיות טבעית, לא תרגום. שימוש במילים "יחד", "משפחה", "קהילה" מחזק engagement
4. **Hashtags:** חובב שילוב של עברית ואנגלית (#יום_הולדת #birthday) מכיוון ששני הקהלים קיימים
5. **תרבות:** ישראלים אוהבים ישירות, הומור, ותוכן "מבושל מקומית" (לא גנרי)
${hebrewCalendarNote}

---
יצר אסטרטגיית שיווק מפורטת הכוללת:

1. **סקירה כללית** (2-3 פסקאות) - הסבר איך האסטרטגיה מתאימה לשוק הישראלי
2. **4 עמודי תוכן ראשיים (Content Pillars)** - כל אחד עם כותרת בעברית, תיאור, ו-5 נושאים ספציפיים מותאמים לישראל
3. **תוכנית תוכן חודשית (4 שבועות)** - כל שבוע עם 3-4 פוסטים מוצעים לפלטפורמות שונות, כולל התחשבות בחגים עבריים ושבתות
4. **Hashtags מומלצים** (10 primary בעברית + 10 secondary בשילוב עברית/אנגלית)
5. **זמני פרסום מיטביים לכל פלטפורמה** - ספציפית לישראל (לדוג': רביעי 11:00 לפייסבוק)
6. **5 יתרונות תחרותיים** - מנקודת מבט ישראלית
7. **6 KPIs למדידה** - מותאמים לשוק הישראלי (לדוג': "שיעור פתיחה ב-WhatsApp")
8. **רעיונות לקמפיינים מיוחדים** - כמו "מבצע לפסח", "Back to School", "ימי הולדת לעסק"

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
          "contentType": "תמונה/וידאו/טקסט/סטורי",
          "timing": "יום X בשעה Y",
          "hebrewDate": "כ"ה בשבט" // אם רלוונטי
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
  ],
  "specialCampaigns": [
    {
      "name": "...",
      "timing": "...",
      "idea": "..."
    }
  ]
}

**חשוב:** החזר רק את ה-JSON, ללא טקסט נוסף. האסטרטגיה חייבת להרגיש ישראלית-אותנטית, לא תרגום מערבית.
`;

  try {
    const { text } = await generateText({
      model: google('gemini-2.5-flash'), // TODO: TEMPORARY - Using free Google AI instead of paid OpenAI
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
 * מייצר תוכנית תוכן שבועית פשוטה - מותאם לשוק הישראלי
 */
export async function generateWeeklyContentPlan(
  clientProfile: ClientProfile,
  weekNumber: number
): Promise<{ day: string; platform: string; topic: string; contentType: string; timing: string; hebrewDateContext?: string }[]> {
  const locationContext = clientProfile.targetLocations?.length 
    ? `מיקוד גיאוגרפי: ${clientProfile.targetLocations.join(', ')}`
    : '';
  
  const prompt = `
צור תוכנית תוכן לשבוע ${weekNumber} עבור:
עסק: ${clientProfile.name}
תחום: ${clientProfile.industry}
קהל יעד: ${clientProfile.targetAudience}
גודל עסק: ${clientProfile.businessSize}
${locationContext}
${clientProfile.brandVoice ? `טון דיבור: ${clientProfile.brandVoice}` : ''}

הנחיות לשוק הישראלי:
1. **WhatsApp** - חשוב במיוחד בישראל ללידים ומכירות (2 פוסטים בשבוע)
2. **Instagram** - הפלטפורמה המובילה ל-B2C בישראל (2 פוסטים)
3. **Facebook** - עדיין חזק בישראל, במיוחד לגילאי 35+ (1-2 פוסטים)
4. **LinkedIn** - רק אם B2B (1 פוסט)
5. **תזמון:** רביעי 11:00 הוא הזמן הטוב ביותר בישראל
6. **שבת:** ללא פוסטים בשבת (מערכת מושבתת אוטומטית)
7. **עברית:** תוכן בעברית טבעית, לא תרגום

צור 7 פוסטים (אחד ליום) עם התפלגות:
- 2 פוסטים ל-WhatsApp (מודעות/סטטוס)
- 2 פוסטים לאינסטגרם (Feed/Stories)
- 2 פוסטים לפייסבוק
- 1 פוסט ל-LinkedIn (אם B2B) או נוסף לפייסבוק/אינסטגרם

כל פוסט צריך:
- יום (ראשון-שבת)
- פלטפורמה
- נושא ספציפי בעברית
- סוג תוכן (תמונה/וידאו/טקסט/סטורי/רילס)
- תזמון מיטבי (לדוג': "רביעי 11:00")
- הקשר עברי אם רלוונטי (חג, מועד, וכו')

החזר JSON בפורמט:
[
  {
    "day": "ראשון",
    "platform": "instagram",
    "topic": "...",
    "contentType": "רילס",
    "timing": "20:00",
    "hebrewDateContext": "ערב פתיחת השבוע"
  }
]
`;

  try {
    const { text } = await generateText({
      model: google('gemini-2.5-flash'), // TODO: TEMPORARY - Using free Google AI instead of paid OpenAI
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
      model: google('gemini-2.5-flash'), // TODO: TEMPORARY - Using free Google AI instead of paid OpenAI
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
