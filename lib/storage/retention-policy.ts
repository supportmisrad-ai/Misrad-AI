/**
 * Storage Retention Policy - מדיניות שמירת קבצים
 * 
 * מגדיר את משך השמירה המקסימלי לכל סוג קובץ וכל bucket.
 * מדיניות זו מוצגת בדפי שיווק, ממשק ניהול, ותנאי שימוש.
 */

export interface RetentionRule {
  /** משך שמירה בימים */
  retentionDays: number;
  /** הסבר למדיניות (לממשק משתמש) */
  description: string;
  /** האם לשלוח התראה לפני מחיקה */
  notifyBeforeDelete: boolean;
  /** כמה ימים לפני מחיקה לשלוח התראה */
  notifyDaysBefore?: number;
  /** האם החוק חובה או אופציונלי (ניתן להארכה בתשלום) */
  mandatory: boolean;
}

export const STORAGE_RETENTION_POLICY: Record<string, RetentionRule> = {
  // מדיה שיווקית - Social Module
  media: {
    retentionDays: 365, // שנה
    description: 'תמונות וסרטונים לרשתות חברתיות נשמרים למשך שנה. אחרי שנה, קבצים שלא בשימוש פעיל יימחקו אוטומטית.',
    notifyBeforeDelete: true,
    notifyDaysBefore: 30,
    mandatory: false, // ניתן להארכה בחבילות גבוהות
  },

  // הקלטות שיחות - System Module
  'call-recordings': {
    retentionDays: 730, // שנתיים
    description: 'הקלטות שיחות נשמרות למשך שנתיים לצורכי ביקורת ושירות לקוחות. לאחר שנתיים, ההקלטות יימחקו אוטומטית לפי תקנות פרטיות.',
    notifyBeforeDelete: true,
    notifyDaysBefore: 60,
    mandatory: true, // חובה משפטית - לא ניתן להארכה
  },

  // הקלטות פגישות - Client OS Module
  'meeting-recordings': {
    retentionDays: 365, // שנה
    description: 'הקלטות פגישות עם לקוחות נשמרות למשך שנה. ניתן להוריד ולגבות באופן ידני לפני המחיקה.',
    notifyBeforeDelete: true,
    notifyDaysBefore: 30,
    mandatory: false,
  },

  // קבצי תפעול - Operations Module
  'operations-files': {
    retentionDays: 1095, // 3 שנים
    description: 'מסמכי תפעול, תמונות עבודה, וקבצים מקצועיים נשמרים ל-3 שנים לצורכי תיעוד ארכיון.',
    notifyBeforeDelete: true,
    notifyDaysBefore: 60,
    mandatory: false,
  },

  // קבצים מצורפים כלליים - All Modules
  attachments: {
    retentionDays: 730, // שנתיים
    description: 'קבצים מצורפים למשימות, לקוחות, ותכתובות נשמרים למשך שנתיים.',
    notifyBeforeDelete: true,
    notifyDaysBefore: 30,
    mandatory: false,
  },

  // נכסים ציבוריים - דף נחיתה ושיווק
  'public-assets': {
    retentionDays: -1, // אינסוף - לא נמחק
    description: 'תמונות ווידאו בדף הנחיתה נשמרים ללא הגבלת זמן.',
    notifyBeforeDelete: false,
    mandatory: true,
  },
};

/**
 * קבלת מדיניות שמירה לפי bucket
 */
export function getRetentionPolicy(bucket: string): RetentionRule | null {
  return STORAGE_RETENTION_POLICY[bucket] || null;
}

/**
 * בדיקה אם קובץ צריך להימחק לפי תאריך העלאה
 */
export function shouldDeleteFile(uploadedAt: Date, bucket: string): boolean {
  const policy = getRetentionPolicy(bucket);
  if (!policy || policy.retentionDays === -1) return false;

  const now = new Date();
  const diffMs = now.getTime() - uploadedAt.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays > policy.retentionDays;
}

/**
 * בדיקה אם צריך לשלוח התראה למשתמש על מחיקה מתקרבת
 */
export function shouldNotifyBeforeDelete(uploadedAt: Date, bucket: string): boolean {
  const policy = getRetentionPolicy(bucket);
  if (!policy || !policy.notifyBeforeDelete || policy.retentionDays === -1) return false;

  const now = new Date();
  const diffMs = now.getTime() - uploadedAt.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  const warningThreshold = policy.retentionDays - (policy.notifyDaysBefore ?? 30);
  return diffDays >= warningThreshold && diffDays < policy.retentionDays;
}

/**
 * קבלת תיאור מדיניות שמירה לממשקי משתמש
 */
export function getRetentionPolicyDescription(bucket: string): string {
  const policy = getRetentionPolicy(bucket);
  if (!policy) return 'אין מדיניות שמירה מוגדרת';
  
  if (policy.retentionDays === -1) {
    return 'נשמר ללא הגבלת זמן';
  }

  const years = Math.floor(policy.retentionDays / 365);
  const months = Math.floor((policy.retentionDays % 365) / 30);
  
  let duration = '';
  if (years > 0) duration += `${years} ${years === 1 ? 'שנה' : 'שנים'}`;
  if (months > 0) duration += (years > 0 ? ' ו-' : '') + `${months} ${months === 1 ? 'חודש' : 'חודשים'}`;
  
  return `נשמר למשך ${duration}`;
}

/**
 * קבלת טבלת מדיניות שמירה מלאה (לדף Pricing/Terms)
 */
export function getAllRetentionPolicies(): Array<{
  bucket: string;
  label: string;
  rule: RetentionRule;
}> {
  return [
    { bucket: 'media', label: 'תוכן שיווקי (תמונות, סרטונים)', rule: STORAGE_RETENTION_POLICY.media },
    { bucket: 'call-recordings', label: 'הקלטות שיחות טלפון', rule: STORAGE_RETENTION_POLICY['call-recordings'] },
    { bucket: 'meeting-recordings', label: 'הקלטות פגישות', rule: STORAGE_RETENTION_POLICY['meeting-recordings'] },
    { bucket: 'operations-files', label: 'קבצי תפעול ותיעוד', rule: STORAGE_RETENTION_POLICY['operations-files'] },
    { bucket: 'attachments', label: 'קבצים מצורפים כלליים', rule: STORAGE_RETENTION_POLICY.attachments },
    { bucket: 'public-assets', label: 'נכסי דף נחיתה', rule: STORAGE_RETENTION_POLICY['public-assets'] },
  ];
}
