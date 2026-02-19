import { loadFont as loadHeebo } from '@remotion/google-fonts/Heebo';
import { loadFont as loadRubik } from '@remotion/google-fonts/Rubik';

// ─── Fonts ───────────────────────────────────────────────
export const { fontFamily: HEEBO } = loadHeebo('normal', {
  weights: ['600', '700', '900'],
  subsets: ['hebrew', 'latin'],
});
export const { fontFamily: RUBIK } = loadRubik('normal', {
  weights: ['700', '800'],
  subsets: ['hebrew', 'latin'],
});

// ─── Brand Colors ────────────────────────────────────────
export const BRAND = {
  primary: '#A21D3C',
  primaryGlow: '#881337',
  primaryDark: '#4C0519',
  primaryAlpha: 'rgba(162, 29, 60, 0.4)',

  indigo: '#3730A3',
  indigoLight: '#6366F1',
  indigoAlpha: 'rgba(55, 48, 163, 0.35)',

  gradient: 'linear-gradient(135deg, #A21D3C 0%, #3730A3 100%)',

  white: '#FAFAFA',
  muted: '#6B7280',

  bgDark: '#09090B',
  surfaceDark: '#18181B',
  surfaceDark2: '#27272A',

  bgLight: '#F8FAFC',
  surfaceLight: '#F1F5F9',
  surfaceGlass: 'rgba(255, 255, 255, 0.65)',
} as const;

// ─── Module Colors ───────────────────────────────────────
export const MODULE_COLORS = {
  nexus:      { accent: '#3730A3', gradient: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)' },
  system:     { accent: '#A21D3C', gradient: 'linear-gradient(135deg, #A21D3C 0%, #881337 100%)' },
  social:     { accent: '#7C3AED', gradient: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)' },
  finance:    { accent: '#059669', gradient: 'linear-gradient(135deg, #059669 0%, #0D9488 100%)' },
  client:     { accent: '#C5A572', gradient: 'linear-gradient(135deg, #EAD7A1 0%, #B45309 100%)' },
  operations: { accent: '#0EA5E9', gradient: 'linear-gradient(135deg, #0EA5E9 0%, #06B6D4 100%)' },
} as const;

export type ModuleKey = keyof typeof MODULE_COLORS;

// ─── Custom Easing (No generic ease-in/ease-out!) ────────
// Aggressive start → silk landing
export const EASING = {
  // "Boom then glide" — primary movement curve
  punch: [0.16, 1, 0.3, 1] as [number, number, number, number],
  // Snappy UI interactions
  snap: [0.22, 0.68, 0, 1] as [number, number, number, number],
  // Dramatic entrance
  dramatic: [0.05, 0.7, 0.1, 1] as [number, number, number, number],
  // Smooth camera
  camera: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
} as const;

// ─── Spring Configs ──────────────────────────────────────
export const SPRING = {
  hero:     { damping: 14, stiffness: 180, mass: 0.8 },
  punch:    { damping: 8,  stiffness: 280, mass: 0.6 },
  smooth:   { damping: 25, stiffness: 50,  mass: 1.2 },
  camera:   { damping: 30, stiffness: 40,  mass: 1.8 },
  ui:       { damping: 18, stiffness: 120, mass: 1.0 },
} as const;

// ─── Frame Constants ─────────────────────────────────────
export const FPS = 30;
export const SOCIAL_WIDTH = 1080;
export const SOCIAL_HEIGHT = 1920;
export const TV_WIDTH = 1920;
export const TV_HEIGHT = 1080;

// ─── Shared style helpers ────────────────────────────────
export const GLASS_STYLE = {
  background: 'rgba(255, 255, 255, 0.08)',
  backdropFilter: 'blur(40px)',
  WebkitBackdropFilter: 'blur(40px)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: 24,
} as const;

export const GLASS_LIGHT_STYLE = {
  background: 'rgba(255, 255, 255, 0.72)',
  backdropFilter: 'blur(40px)',
  WebkitBackdropFilter: 'blur(40px)',
  border: '1px solid rgba(0, 0, 0, 0.06)',
  borderRadius: 24,
  boxShadow: '0 20px 60px rgba(0,0,0,0.06)',
} as const;
