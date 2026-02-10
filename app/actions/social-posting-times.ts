'use server';

import type { SocialPlatform } from '@/types/social';

export interface PostingTimeRecommendation {
  day: string;
  dayHebrew: string;
  hour: number;
  hourDisplay: string;
  platform: SocialPlatform;
  reason: string;
  score: number; // 1-100
}

export interface PostingTimesResult {
  bestTimes: PostingTimeRecommendation[];
  avoidTimes: { day: string; hour: number; reason: string }[];
  dataSource: 'industry_best_practices' | 'based_on_your_data';
  generalTip: string;
}

/**
 * מחזיר המלצות לשעות פרסום מיטביות לפי פלטפורמה
 * 
 * שלב 1: Best practices (אין נתוני engagement)
 * שלב 2 (עתידי): ניתוח נתוני engagement של הארגון
 */
export async function suggestBestPostingTimes(params: {
  platforms: SocialPlatform[];
  isReligious?: boolean;
}): Promise<PostingTimesResult> {
  const { platforms, isReligious = false } = params;

  const bestTimes: PostingTimeRecommendation[] = [];
  const avoidTimes: { day: string; hour: number; reason: string }[] = [];

  // Industry best practices per platform
  for (const platform of platforms) {
    if (platform === 'facebook') {
      bestTimes.push(
        {
          day: 'wednesday',
          dayHebrew: 'רביעי',
          hour: 11,
          hourDisplay: '11:00',
          platform: 'facebook',
          reason: 'שעת הפסקה - אנשים גוללים בפייסבוק',
          score: 85,
        },
        {
          day: 'thursday',
          dayHebrew: 'חמישי',
          hour: 13,
          hourDisplay: '13:00',
          platform: 'facebook',
          reason: 'אחרי הצהריים - engagement גבוה',
          score: 82,
        },
        {
          day: 'sunday',
          dayHebrew: 'ראשון',
          hour: 19,
          hourDisplay: '19:00',
          platform: 'facebook',
          reason: 'אחרי העבודה - זמן משפחה מול מסכים',
          score: 80,
        }
      );
    }

    if (platform === 'instagram') {
      bestTimes.push(
        {
          day: 'tuesday',
          dayHebrew: 'שלישי',
          hour: 12,
          hourDisplay: '12:00',
          platform: 'instagram',
          reason: 'שעת צהריים - reach גבוה',
          score: 88,
        },
        {
          day: 'wednesday',
          dayHebrew: 'רביעי',
          hour: 18,
          hourDisplay: '18:00',
          platform: 'instagram',
          reason: 'סוף יום עבודה - אנשים פעילים',
          score: 85,
        },
        {
          day: 'sunday',
          dayHebrew: 'ראשון',
          hour: 20,
          hourDisplay: '20:00',
          platform: 'instagram',
          reason: 'ערב - זמן פנאי, גלילה באינסטגרם',
          score: 83,
        }
      );
    }

    if (platform === 'linkedin') {
      bestTimes.push(
        {
          day: 'tuesday',
          dayHebrew: 'שלישי',
          hour: 8,
          hourDisplay: '08:00',
          platform: 'linkedin',
          reason: 'תחילת יום עבודה - אנשי מקצוע פעילים',
          score: 90,
        },
        {
          day: 'wednesday',
          dayHebrew: 'רביעי',
          hour: 12,
          hourDisplay: '12:00',
          platform: 'linkedin',
          reason: 'הפסקת צהריים - בדיקת עדכונים מקצועיים',
          score: 87,
        },
        {
          day: 'thursday',
          dayHebrew: 'חמישי',
          hour: 10,
          hourDisplay: '10:00',
          platform: 'linkedin',
          reason: 'אמצע שבוע - engagement מקצועי גבוה',
          score: 85,
        }
      );
    }

    if (platform === 'tiktok') {
      bestTimes.push(
        {
          day: 'monday',
          dayHebrew: 'שני',
          hour: 18,
          hourDisplay: '18:00',
          platform: 'tiktok',
          reason: 'אחרי בית ספר/עבודה - צעירים פעילים',
          score: 86,
        },
        {
          day: 'friday',
          dayHebrew: 'שישי',
          hour: 11,
          hourDisplay: '11:00',
          platform: 'tiktok',
          reason: 'בוקר שישי - אנשים מרוגעים ופנויים',
          score: 84,
        }
      );
    }
  }

  // Avoid times
  if (isReligious) {
    avoidTimes.push(
      { day: 'friday', hour: 14, reason: 'כניסת שבת - קהל דתי לא זמין' },
      { day: 'saturday', hour: 10, reason: 'שבת - קהל דתי לא זמין' }
    );
  }

  avoidTimes.push(
    { day: 'monday', hour: 7, reason: 'תחילת שבוע - אנשים עסוקים' },
    { day: 'friday', hour: 16, reason: 'סוף שבוע - אנשים עוזבים למנוחה' }
  );

  // Sort by score (highest first)
  bestTimes.sort((a, b) => b.score - a.score);

  const generalTip = isReligious
    ? 'הגנת שבת פעילה - המערכת תמנע פרסום בשבת אוטומטית'
    : 'שעות אלו מבוססות על מחקרי engagement גלובליים וישראליים';

  return {
    bestTimes,
    avoidTimes,
    dataSource: 'industry_best_practices',
    generalTip,
  };
}
