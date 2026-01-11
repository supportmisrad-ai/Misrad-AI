import { MeetingAnalysisResult, WorkflowBlueprint, FormTemplate } from '../types';

export const analyzeMeetingTranscript = async (_transcript: string): Promise<MeetingAnalysisResult> => {
  return {
    summary: 'ניתוח סימולציה: הלקוח מביע עניין אך דורש הבהרות לגבי לוחות זמנים.',
    sentimentScore: 75,
    frictionKeywords: ['זמנים', 'לו"ז', 'דחוף'],
    objections: ['המחיר גבוה מדי'],
    compliments: ['העיצוב מרשים'],
    decisions: ['פגישת המשך ביום שלישי'],
    agencyTasks: [{ id: 'at1', task: 'שליחת הצעת מחיר מעודכנת', deadline: 'מחר', priority: 'HIGH', status: 'PENDING' }],
    clientTasks: [{ id: 'ct1', task: 'אישור שלב א\'', deadline: 'סוף שבוע', priority: 'NORMAL', status: 'PENDING' }],
    liabilityRisks: [{ quote: 'נעשה הכל עד מחר', context: 'הבטחה לא ריאלית', riskLevel: 'HIGH' }],
  };
};

export const generateClientInsight = async (_clientName: string, _healthScore: number, _sentimentTrend: string[]) => {
  return { insight: 'הלקוח דורש תשומת לב מוגברת סביב נושאי תקציב.', action: 'קבע שיחת בירור' };
};

export const generateDailyBriefing = async (_riskyClientsCount: number, _opportunitiesCount: number, _meetingsCount: number) => {
  return { greeting: 'בוקר טוב. הנה הלו\"ז שלך.', focusPoints: ['בדוק את נובקורפ', 'הכנה לפגישת אית\'ר'], quote: 'הצלחה היא התמדה.' };
};

export const generateCycleKickoff = async (_cycleName: string, _clients: string[]) => {
  return { message: 'ברוכים הבאים למחזור החדש שלנו! אנחנו מתרגשים להתחיל את המסע המשותף.' };
};

export const generateTestimonial = async (_clientName: string, _bulletPoints: string) => {
  return { quote: 'עבודה מקצועית ביותר עם דגש על פרטים.', linkedinPost: 'שמחים על השותפות עם נקסוס!' };
};

export const generateProgressSummary = async (_goalTitle: string, _current: number, _target: number, _unit: string) => {
  return { summary: 'התקדמות יציבה לעבר היעד.', forecast: 'נעמוד ביעדים עד סוף הרבעון.' };
};

export const generateSuccessRecommendation = async (_clientName: string, _healthScore: number) => {
  return { tip: 'שקיפות מלאה במדדי הצלחה מחזקת את האמון בטווח הארוך.', expectedBenefit: 'שיפור בשימור לקוח (Retention)' };
};

export const generateEmailDraft = async (_clientName: string, _contactName: string, _intent: string, _tone: string, _healthContext: string) => {
  return { subject: 'עדכון לגבי הפרויקט', body: 'היי, רציתי לעדכן שהכל מתקדם כמתוכנן.' };
};

export const generateSmartReply = async (_emailBody: string, _senderName: string, _tone: string = 'professional'): Promise<string> => {
  return 'תודה על המייל, קיבלתי ומטפל.';
};

export const generateWorkflowBlueprint = async (_prompt: string): Promise<WorkflowBlueprint> => {
  return {
    id: `bp-${Date.now()}`,
    name: 'Blueprint לדוגמה',
    description: 'תהליך לדוגמה',
    totalDuration: '2 שבועות',
    tags: ['demo'],
    stages: [],
  };
};

export const generateFormTemplate = async (_prompt: string): Promise<FormTemplate> => {
  return {
    id: `form-${Date.now()}`,
    title: 'טופס לדוגמה',
    description: 'טופס לדוגמה',
    category: 'ONBOARDING',
    steps: [],
    isActive: true,
  };
};

export const generateVideoScript = async (_clientName: string, _recentSuccess: string) => {
  return { script: 'היי, אני רוצה להמליץ בחום על הצוות של Nexus. הם עזרו לנו להגיע לתוצאות מדהימות בזמן קצר.' };
};
