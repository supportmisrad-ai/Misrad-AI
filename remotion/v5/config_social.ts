import { loadFont as loadHeebo } from '@remotion/google-fonts/Heebo';
import { loadFont as loadRubik } from '@remotion/google-fonts/Rubik';

export const { fontFamily: HEEBO } = loadHeebo();
export const { fontFamily: RUBIK } = loadRubik();

export const V5_SOCIAL = {
  bg: '#09090B',
  bgDeep: '#09090B',
  primary: '#A21D3C',
  primaryGlow: '#881337',
  primaryAlpha: 'rgba(162, 29, 60, 0.4)',
  indigo: '#3730A3',
  indigoLight: '#6366F1',
  indigoAlpha: 'rgba(55, 48, 163, 0.35)',
  white: '#FAFAFA',
  muted: '#6B7280',
  surface: '#18181B',
  surfaceLight: '#27272A',
} as const;

export const MOTION_SOCIAL = {
  hero: { damping: 12, stiffness: 100, mass: 0.8 },
  smooth: { damping: 25, stiffness: 50, mass: 1.2 },
  snappy: { damping: 10, stiffness: 200, mass: 1 },
  cinematic: { damping: 30, stiffness: 40, mass: 1.8 },
} as const;

export const FPS_SOCIAL = 30;
export const TOTAL_FRAMES_SOCIAL = 900;

export const SCENES_SOCIAL = {
  opening: { start: 0, duration: 150 },
  modules: { start: 150, duration: 450 },
  reveal: { start: 600, duration: 150 },
  cta: { start: 750, duration: 150 },
} as const;

export const MODULES_DATA_SOCIAL = [
  {
    name: 'מרכז המכירות',
    desc: 'AI חוזה סגירות ב-75% דיוק',
    color: '#A21D3C',
    icon: '⚡',
    bars: [75, 82, 45],
    clay: 'clay/data-pulse.webm',
  },
  {
    name: 'שיווק חכם',
    desc: 'Hashtags + שעות מיטביות',
    color: '#9333EA',
    icon: '📡',
    bars: [60, 90, 70],
    clay: 'clay/social-wave.webm',
  },
  {
    name: 'ניהול צוות',
    desc: 'משימות אוטומטיות',
    color: '#3B82F6',
    icon: '🔗',
    bars: [80, 65, 95],
    clay: 'clay/team-puzzle.webm',
  },
  {
    name: 'Client OS',
    desc: 'מעקב לקוחות חכם',
    color: '#06B6D4',
    icon: '🎯',
    bars: [55, 78, 62],
    clay: 'clay/client-orbit.webm',
  },
  {
    name: 'Finance AI',
    desc: 'חשבוניות + תחזיות',
    color: '#10B981',
    icon: '💎',
    bars: [90, 45, 75],
    clay: 'clay/coins-flow.webm',
  },
  {
    name: 'תפעול שטח',
    desc: 'פרויקטים + לוחות',
    color: '#F59E0B',
    icon: '🏗',
    bars: [70, 80, 55],
    clay: 'clay/gears-turn.webm',
  },
] as const;

export const SUBTITLE_TRACK_SOCIAL: ReadonlyArray<{
  from: number;
  to: number;
  text: string;
}> = [
  { from: 0, to: 72, text: 'המשחק השתנה.' },
  { from: 78, to: 148, text: 'AI שמנהל במקומך' },
  { from: 155, to: 260, text: 'נתונים שמדברים' },
  { from: 268, to: 375, text: 'דאשבורד שרואה הכל' },
  { from: 383, to: 480, text: 'ביצועי צוות בזמן אמת' },
  { from: 488, to: 595, text: 'AI עובד 24/7' },
  { from: 608, to: 742, text: 'הדור הבא כבר כאן' },
  { from: 755, to: 892, text: 'misrad.ai' },
];
