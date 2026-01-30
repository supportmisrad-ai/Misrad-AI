import { Client, SocialPost, AIOpportunity, Idea, Conversation, Invoice, SocialTask, AgencyServiceConfig, TeamMember } from '@/types/social';

export const DEFAULT_PLATFORM_CONFIGS: AgencyServiceConfig[] = [
  { id: 'facebook', label: 'Facebook', isEnabled: true, basePrice: 850, category: 'platform', isRecurring: true },
  { id: 'instagram', label: 'Instagram', isEnabled: true, basePrice: 950, category: 'platform', isRecurring: true },
  { id: 'tiktok', label: 'TikTok', isEnabled: true, basePrice: 1200, category: 'platform', isRecurring: true },
  { id: 'linkedin', label: 'LinkedIn', isEnabled: true, basePrice: 1100, category: 'platform', isRecurring: true },
  { id: 'twitter', label: 'Twitter / X', isEnabled: false, basePrice: 600, category: 'platform', isRecurring: true },
  { id: 'google', label: 'Google Business', isEnabled: true, basePrice: 500, category: 'platform', isRecurring: true },
  { id: 'youtube', label: 'YouTube', isEnabled: false, basePrice: 1500, category: 'platform', isRecurring: true },
  { id: 'threads', label: 'Threads', isEnabled: false, basePrice: 400, category: 'platform', isRecurring: true },
];

export const MARKETPLACE_ADDONS: AgencyServiceConfig[] = [
  { id: 'extra_tiktok', label: 'סרטון טיקטוק נוסף', isEnabled: true, basePrice: 350, category: 'content', description: 'סרטון ערוך ומקצועי נוסף ללו"ז החודשי.', isRecurring: false },
  { id: 'photo_day', label: 'יום צילום בשטח', isEnabled: true, basePrice: 1800, category: 'content', description: 'צלם מקצועי מגיע אליכם ל-4 שעות של צילומי תוכן.', isRecurring: false },
  { id: 'reels_boost', label: 'בוסט לרילס (קידום)', isEnabled: true, basePrice: 500, category: 'strategy', description: 'ניהול תקציב פרסום ממוקד להגדלת החשיפה של סרטון נבחר.', isRecurring: false },
  { id: 'ai_strategy', label: 'אסטרטגיית תוכן AI מורחבת', isEnabled: true, basePrice: 450, category: 'strategy', description: 'ניתוח מעמיק של קהל היעד ויצירת תוכנית חודשית מבוססת דאטה.', isRecurring: true },
  { id: 'linkedin_outreach', label: 'ניהול לינקדאין אקטיבי', isEnabled: true, basePrice: 1500, category: 'platform', description: 'יצירת קשרים והודעות אישיות בקהל היעד בלינקדאין.', isRecurring: true },
];

// Mock data removed for production deployment
// All data should come from Supabase database

