import type { AIModuleId } from './useAIModuleChat';

export type SemanticStarter = { id: string; text: string };

export function getSemanticStarters(moduleId: AIModuleId): SemanticStarter[] {
  switch (moduleId) {
    case 'system':
      return [
        { id: 'system_hot_lead', text: 'מי הליד הכי חם כרגע ולמה?' },
        { id: 'system_last_3_inquiries', text: 'סכם לי את 3 הפניות האחרונות' },
        { id: 'system_top_objection', text: 'איזו התנגדות חוזרת הכי הרבה בשיחות המכירה?' },
      ];
    case 'client':
      return [
        { id: 'client_last_commitment', text: 'על מה התחייבתי בפגישה האחרונה עם לקוח X?' },
        { id: 'client_weekly_sentiment', text: 'מה הסטטוס הרגשי (Sentiment) של הלקוחות השבוע?' },
        { id: 'client_last_meeting_summary', text: 'שלוף לי סיכום של פגישת העבודה האחרונה' },
      ];
    case 'finance':
      return [
        { id: 'finance_forecast', text: 'מהי תחזית ההכנסה שלי לחודש הקרוב על בסיס הלידים?' },
        { id: 'finance_overdue_invoices', text: 'אילו חשבוניות בפיגור ומה הסיבה?' },
        { id: 'finance_ads_roi', text: 'כמה הוצאנו על פרסום לעומת הכנסות החודש?' },
      ];
    case 'social':
      return [
        { id: 'social_sentiment_recent', text: 'מהו הטון הכללי (Sentiment) של התגובות לפוסטים האחרונים?' },
        { id: 'social_top_engaged', text: 'מי הם 3 העוקבים הכי מעורבים (Engaged) שלי החודש?' },
        { id: 'social_next_topic', text: 'על בסיס התכנים שפרסמתי, על איזה נושא כדאי לי לכתוב את הפוסט הבא?' },
      ];
    case 'nexus':
    case 'global':
    default:
      return [];
  }
}
