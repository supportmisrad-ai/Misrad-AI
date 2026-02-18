import { loadFont as loadHeebo } from '@remotion/google-fonts/Heebo';
import { loadFont as loadRubik } from '@remotion/google-fonts/Rubik';

export const { fontFamily: HEEBO } = loadHeebo('normal', {
  weights: ['600', '700', '900'],
  subsets: ['hebrew', 'latin'],
});
export const { fontFamily: RUBIK } = loadRubik('normal', {
  weights: ['700', '800'],
  subsets: ['hebrew', 'latin'],
});

export const V5 = {
  bg: '#09090B',
  bgDeep: '#09090B',
  primary: '#A21D3C',
  primaryGlow: '#881337',
  primaryDark: '#4C0519',
  primaryAlpha: 'rgba(162, 29, 60, 0.4)',
  indigo: '#3730A3',
  indigoLight: '#6366F1',
  indigoAlpha: 'rgba(55, 48, 163, 0.35)',
  white: '#FAFAFA',
  muted: '#6B7280',
  surface: '#18181B',
  surfaceLight: '#27272A',
} as const;

export const MOTION = {
  hero: { damping: 12, stiffness: 100, mass: 0.8 },
  smooth: { damping: 25, stiffness: 50, mass: 1.2 },
  snappy: { damping: 10, stiffness: 200, mass: 1 },
  cinematic: { damping: 30, stiffness: 40, mass: 1.8 },
} as const;

export const FPS = 30;
export const TOTAL_FRAMES = 900;

export const SCENES = {
  opening: { start: 0, duration: 150 },
  modules: { start: 150, duration: 450 },
  reveal: { start: 600, duration: 150 },
  cta: { start: 750, duration: 150 },
} as const;

export const MODULES_DATA = [
  {
    name: 'מרכז המכירות',
    desc: 'AI חוזה סגירות ב-75% דיוק',
    color: '#D4AF37',
    icon: '⚡',
    bars: [75, 82, 45, 93, 58],
    clay: 'clay/data-pulse.webm',
  },
  {
    name: 'שיווק חכם',
    desc: 'Hashtags + שעות פרסום מיטביות',
    color: '#9333EA',
    icon: '📡',
    bars: [60, 90, 70, 50, 85],
    clay: 'clay/social-wave.webm',
  },
  {
    name: 'ניהול צוות',
    desc: 'משימות אוטומטיות + סנכרון',
    color: '#3B82F6',
    icon: '🔗',
    bars: [80, 65, 95, 40, 70],
    clay: 'clay/team-puzzle.webm',
  },
  {
    name: 'Client OS',
    desc: 'מעקב לקוחות חכם + תזכורות',
    color: '#06B6D4',
    icon: '🎯',
    bars: [55, 78, 62, 88, 72],
    clay: 'clay/client-orbit.webm',
  },
  {
    name: 'Finance AI',
    desc: 'חשבוניות + תזרים + תחזיות',
    color: '#10B981',
    icon: '💎',
    bars: [90, 45, 75, 60, 85],
    clay: 'clay/coins-flow.webm',
  },
  {
    name: 'תפעול שטח',
    desc: 'פרויקטים + לוחות זמנים',
    color: '#F59E0B',
    icon: '🏗',
    bars: [70, 80, 55, 90, 65],
    clay: 'clay/gears-turn.webm',
  },
] as const;

export const SUBTITLE_TRACK: ReadonlyArray<{
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

export const CLAY_SLOTS = {
  handSwitch: 'clay/hand-switch.webm',
  dataPulse: 'clay/data-pulse.webm',
  teamPuzzle: 'clay/team-puzzle.webm',
  brainGears: 'clay/brain-gears.webm',
  coinsFlow: 'clay/coins-flow.webm',
  rocketLaunch: 'clay/rocket-launch.webm',
} as const;
