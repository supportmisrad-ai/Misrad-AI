import { loadFont as loadHeebo } from '@remotion/google-fonts/Heebo';
import { loadFont as loadRubik } from '@remotion/google-fonts/Rubik';

export const { fontFamily: HEEBO } = loadHeebo();
export const { fontFamily: RUBIK } = loadRubik();

export const V5_LIGHT = {
  bg: '#F8FAFC',
  bgDeep: '#F1F5F9',
  primary: '#A21D3C',
  primaryGlow: '#881337',
  primaryAlpha: 'rgba(162, 29, 60, 0.25)',
  indigo: '#3730A3',
  indigoLight: '#6366F1',
  indigoAlpha: 'rgba(55, 48, 163, 0.2)',
  dark: '#09090B',
  darkMuted: '#52525B',
  surface: '#FFFFFF',
  surfaceLight: '#F1F5F9',
} as const;

export const MOTION_LIGHT = {
  hero: { damping: 12, stiffness: 100, mass: 0.8 },
  smooth: { damping: 25, stiffness: 50, mass: 1.2 },
  snappy: { damping: 10, stiffness: 200, mass: 1 },
  cinematic: { damping: 30, stiffness: 40, mass: 1.8 },
} as const;

export const FPS_LIGHT = 30;
export const TOTAL_FRAMES_LIGHT = 900;

export const SCENES_LIGHT = {
  opening: { start: 0, duration: 150 },
  modules: { start: 150, duration: 450 },
  reveal: { start: 600, duration: 150 },
  cta: { start: 750, duration: 150 },
} as const;

export const MODULES_DATA_LIGHT = [
  {
    name: 'מרכז המכירות',
    desc: 'AI חוזה סגירות ב-75% דיוק',
    color: '#A21D3C',
    icon: '⚡',
    bars: [75, 82, 45, 93, 58],
    clay: 'clay/data-pulse.webm',
  },
  {
    name: 'שיווק חכם',
    desc: 'Hashtags + שעות פרסום מיטביות',
    color: '#7C3AED',
    icon: '📡',
    bars: [60, 90, 70, 50, 85],
    clay: 'clay/social-wave.webm',
  },
  {
    name: 'ניהול צוות',
    desc: 'משימות אוטומטיות + סנכרון',
    color: '#2563EB',
    icon: '🔗',
    bars: [80, 65, 95, 40, 70],
    clay: 'clay/team-puzzle.webm',
  },
  {
    name: 'Client OS',
    desc: 'מעקב לקוחות חכם + תזכורות',
    color: '#0891B2',
    icon: '🎯',
    bars: [55, 78, 62, 88, 72],
    clay: 'clay/client-orbit.webm',
  },
  {
    name: 'Finance AI',
    desc: 'חשבוניות + תזרים + תחזיות',
    color: '#059669',
    icon: '💎',
    bars: [90, 45, 75, 60, 85],
    clay: 'clay/coins-flow.webm',
  },
  {
    name: 'תפעול שטח',
    desc: 'פרויקטים + לוחות זמנים',
    color: '#D97706',
    icon: '🏗',
    bars: [70, 80, 55, 90, 65],
    clay: 'clay/gears-turn.webm',
  },
] as const;

export const SUBTITLE_TRACK_LIGHT: ReadonlyArray<{
  from: number;
  to: number;
  text: string;
}> = [
  { from: 0, to: 72, text: 'המשחק השתנה.' },
  { from: 78, to: 148, text: 'AI שמנהל במקומך' },
  { from: 155, to: 260, text: 'כשהנתונים מדברים — אתה רק מקשיב' },
  { from: 268, to: 375, text: 'דאשבורד שרואה את מה שאתה מפספס' },
  { from: 383, to: 480, text: 'ביצועי הצוות. בזמן אמת.' },
  { from: 488, to: 595, text: 'כל מודול. כל תהליך. AI שעובד במקומך.' },
  { from: 608, to: 742, text: 'הדור הבא של ניהול עסקי כבר כאן.' },
  { from: 755, to: 892, text: 'misrad.ai — התחל עכשיו' },
];
