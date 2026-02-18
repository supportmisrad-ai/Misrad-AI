import { loadFont as loadHeebo } from '@remotion/google-fonts/Heebo';
import { loadFont as loadRubik } from '@remotion/google-fonts/Rubik';

export const { fontFamily: HEEBO_S } = loadHeebo('normal', {
  weights: ['600', '700', '900'],
  subsets: ['hebrew', 'latin'],
});
export const { fontFamily: RUBIK_S } = loadRubik('normal', {
  weights: ['700', '800'],
  subsets: ['hebrew', 'latin'],
});

export const S = {
  bg:               '#09090B',
  primary:          '#A21D3C',
  primaryGlow:      '#881337',
  primaryAlpha:     'rgba(162, 29, 60, 0.45)',
  primaryAlphaLow:  'rgba(162, 29, 60, 0.12)',
  indigo:           '#3730A3',
  indigoLight:      '#6366F1',
  indigoAlpha:      'rgba(55, 48, 163, 0.4)',
  indigoAlphaLow:   'rgba(55, 48, 163, 0.12)',
  white:            '#F8FAFC',
  offWhite:         '#E2E8F0',
  muted:            '#64748B',
  mutedLight:       '#94A3B8',
  surface:          '#18181B',
  surfaceBright:    '#27272A',
  green:            '#10B981',
  greenAlpha:       'rgba(16, 185, 129, 0.2)',
  amber:            '#F59E0B',
  nexus:            'linear-gradient(135deg, #A21D3C 0%, #3730A3 100%)',
  nexusH:           'linear-gradient(90deg, #A21D3C 0%, #3730A3 100%)',
  W:                1080,
  H:                1920,
  CX:               540,
  CY:               960,
} as const;

export const SM = {
  hero:     { damping: 12, stiffness: 100, mass: 0.8 },
  smooth:   { damping: 25, stiffness: 50,  mass: 1.2 },
  snappy:   { damping: 10, stiffness: 200, mass: 1   },
  bounce:   { damping: 8,  stiffness: 280, mass: 0.5 },
  elastic:  { damping: 14, stiffness: 180, mass: 0.7 },
  cinematic:{ damping: 30, stiffness: 40,  mass: 1.8 },
} as const;

export const SS = {
  glitch:    { start: 0,   duration: 150 },
  pain:      { start: 150, duration: 270 },
  brain:     { start: 420, duration: 300 },
  cta:       { start: 720, duration: 180 },
} as const;

export const PAIN_CARDS = [
  { emoji: '📊', app: 'Excel',     msg: '47 גיליונות. אף אחד לא מעודכן.',  color: '#1D6F42' },
  { emoji: '💬', app: 'WhatsApp',  msg: 'לקוח VIP מחכה 3 ימים.',           color: '#25D366' },
  { emoji: '📧', app: 'Gmail',     msg: '312 מיילים שלא נקראו.',            color: '#EA4335' },
  { emoji: '📅', app: 'Calendar',  msg: 'פגישה כפולה. שוב.',               color: '#4285F4' },
  { emoji: '🗂️', app: 'Drive',    msg: 'הקובץ? אף אחד לא יודע איפה.',     color: '#FBBC04' },
  { emoji: '💸', app: 'חשבוניות',  msg: 'חשבונית שלא נשלחה. חודש שלם.',   color: '#FF6B35' },
] as const;

export const AI_INSIGHTS = [
  { icon: '🧠', label: 'חיזוי עזיבה',   value: '78%',    desc: 'לקוח X עומד לעזוב',        color: '#A21D3C' },
  { icon: '⚡', label: 'סגירה צפויה',   value: '₪24K',   desc: 'עסקה B תיסגר תוך 4 ימים', color: '#3730A3' },
  { icon: '📈', label: 'צמיחה חודשית',  value: '+23%',   desc: 'הכנסות עלו אוטומטית',      color: '#10B981' },
] as const;

// Subtitles = full voiceover text, synced to exact cue times (global frames @ 30fps)
// CARD_STAGGER=28: card i enters at local (20 + i*28) → global (170 + i*28)
// shakeStart = 6*28+30 = 198 local → global 348 = 11.60s
// verdict appears at global 348 = 11.60s
export const SOCIAL_SUBTITLES: ReadonlyArray<{ from: number; to: number; text: string }> = [
  // Scene 1 (global 0–150)
  { from:  99, to: 150, text: 'מה אם... הניהול פשוט נעלם?' },      // 3.3s voiceover
  // Scene 2 (global 150–420)  — cards: Excel=170, WhatsApp=198, Gmail=226, Calendar=254, Drive=282, Finance=310
  { from: 170, to: 226, text: 'Excel. WhatsApp.' },                // cards 0+1
  { from: 226, to: 282, text: 'Gmail. Calendar.' },                // cards 2+3
  { from: 282, to: 348, text: 'Drive. Finance.' },                 // cards 4+5 → shake
  { from: 348, to: 399, text: 'טובע. בכאוס.' },                    // verdict (11.6s)
  { from: 399, to: 420, text: 'יש פתרון אחד.' },                   // 13.3s
  // Scene 3 (global 420–720)
  { from: 426, to: 483, text: 'MISRAD AI.' },                      // 14.2s
  { from: 483, to: 516, text: 'ה-AI שלנו רואה מה שאתה מפספס.' },  // 16.1s
  { from: 516, to: 546, text: 'לקוח עומד לעזוב? הוא יודע.' },     // 17.2s
  { from: 546, to: 591, text: 'עסקה שתיסגר תוך 4 ימים? הוא יודע.' }, // 18.2s
  { from: 591, to: 675, text: 'הכנסות עולות אוטומטית? הוא עשה את זה.' }, // 19.7s
  { from: 675, to: 789, text: 'מנתח. חוזה. פועל. במקומך.' },       // 22.5s
  // Scene 4 (global 720–900)
  { from: 789, to: 813, text: 'תנהל פחות.' },                      // 26.3s
  { from: 813, to: 840, text: 'תשלוט יותר.' },                     // 27.1s
  { from: 840, to: 858, text: 'misrad-ai.com' },                   // 28.0s
  { from: 858, to: 900, text: 'הצטרף עכשיו — 7 ימים חינם.' },      // 28.6s
];
