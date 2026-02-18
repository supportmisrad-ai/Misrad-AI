import { loadFont as loadHeebo } from '@remotion/google-fonts/Heebo';
import { loadFont as loadRubik } from '@remotion/google-fonts/Rubik';

export const { fontFamily: HEEBO_IMPACT } = loadHeebo('normal', {
  weights: ['600', '700', '900'],
  subsets: ['hebrew', 'latin'],
});
export const { fontFamily: RUBIK_IMPACT } = loadRubik('normal', {
  weights: ['700', '800'],
  subsets: ['hebrew', 'latin'],
});

export const IMPACT = {
  bg: '#09090B',
  bgDeep: '#09090B',
  primary: '#A21D3C',
  primaryGlow: '#881337',
  primaryDark: '#4C0519',
  primaryAlpha: 'rgba(162, 29, 60, 0.4)',
  primaryAlphaLight: 'rgba(162, 29, 60, 0.15)',
  indigo: '#3730A3',
  indigoLight: '#6366F1',
  indigoAlpha: 'rgba(55, 48, 163, 0.35)',
  white: '#F8FAFC',
  muted: '#6B7280',
  mutedLight: '#9CA3AF',
  surface: '#18181B',
  surfaceLight: '#27272A',
  green: '#10B981',
  nexusGradient: 'linear-gradient(135deg, #A21D3C 0%, #3730A3 100%)',
} as const;

export const IMPACT_MOTION = {
  hero: { damping: 12, stiffness: 100, mass: 0.8 },
  smooth: { damping: 25, stiffness: 50, mass: 1.2 },
  snappy: { damping: 10, stiffness: 200, mass: 1 },
  cinematic: { damping: 30, stiffness: 40, mass: 1.8 },
  bounce: { damping: 8, stiffness: 280, mass: 0.5 },
  elastic: { damping: 14, stiffness: 180, mass: 0.7 },
} as const;

export const IMPACT_FPS = 30;
export const IMPACT_TOTAL_FRAMES = 900;

export const IMPACT_SCENES = {
  shield:    { start: 0,   duration: 150 },
  chaos:     { start: 150, duration: 300 },
  dashboard: { start: 450, duration: 300 },
  cta:       { start: 750, duration: 150 },
} as const;

export const NOTIFICATION_ITEMS = [
  { icon: '📊', label: 'Excel', color: '#1D6F42', text: 'דוח חודשי מוכן' },
  { icon: '💬', label: 'WhatsApp', color: '#25D366', text: 'לקוח מחכה לתשובה' },
  { icon: '📧', label: 'Gmail', color: '#EA4335', text: '47 מיילים שלא נקראו' },
  { icon: '📅', label: 'Calendar', color: '#4285F4', text: 'פגישה בעוד 10 דקות' },
  { icon: '📊', label: 'Excel', color: '#1D6F42', text: 'עדכון תקציב נדרש' },
  { icon: '💬', label: 'WhatsApp', color: '#25D366', text: 'הצוות שואל שאלות' },
  { icon: '📧', label: 'Gmail', color: '#EA4335', text: 'הצעת מחיר דחופה' },
  { icon: '📅', label: 'Calendar', color: '#4285F4', text: 'שלושה ימי חופש בקשה' },
  { icon: '📊', label: 'Excel', color: '#1D6F42', text: 'שגיאה בנוסחה' },
  { icon: '💬', label: 'WhatsApp', color: '#25D366', text: 'לקוח VIP כועס' },
  { icon: '📧', label: 'Gmail', color: '#EA4335', text: 'חשבונית לאישור' },
  { icon: '📅', label: 'Calendar', color: '#4285F4', text: 'ישיבת צוות בוטלה' },
] as const;

export const IMPACT_SUBTITLE_TRACK: ReadonlyArray<{
  from: number;
  to: number;
  text: string;
}> = [
  { from: 155, to: 240, text: '5 כלים. 3 אפליקציות. אפס שליטה.' },
  { from: 260, to: 445, text: 'הצוות שלך טובע.' },
  { from: 470, to: 560, text: 'MISRAD AI — בזמן אמת' },
  { from: 570, to: 680, text: 'ה-AI שלך רואה מה שאתה מפספס.' },
  { from: 690, to: 748, text: 'כל הצוות. כל הנתונים. מקום אחד.' },
  { from: 840, to: 895, text: 'תנהל פחות. תשלוט יותר.' },
];
