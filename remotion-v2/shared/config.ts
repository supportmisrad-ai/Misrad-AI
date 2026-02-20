/**
 * MISRAD AI — Remotion V2 (60-second videos)
 * Shared configuration: fonts, colors, springs, timings, frame constants.
 * Re-exports from v1 shared config + v2-specific additions.
 */

// Re-export everything from v1 shared config
export {
  HEEBO,
  RUBIK,
  BRAND,
  MODULE_COLORS,
  EASING,
  SPRING,
  SOCIAL_WIDTH,
  SOCIAL_HEIGHT,
  TV_WIDTH,
  TV_HEIGHT,
  GLASS_STYLE,
  GLASS_LIGHT_STYLE,
} from '../../remotion/shared/config';
export type { ModuleKey } from '../../remotion/shared/config';

// ─── V2 Frame Constants (60 seconds) ────────────────────
export const FPS = 30;
export const V2_DURATION = 60 * FPS; // 1800 frames = 60 seconds

// ─── V2 Scene Timing Template (60s breakdown) ───────────
// Hook:       0-3s    (0-90f)    — Emotional grab
// Problem:    3-10s   (90-300f)  — Pain point showcase
// Solution:   10-20s  (300-600f) — AI entrance + before/after
// Showcase:   20-35s  (600-1050f)— Feature deep-dive
// Results:    35-45s  (1050-1350f)— Stats + social proof
// Tagline:    45-50s  (1350-1500f)— Brand moment
// CTA:        50-60s  (1500-1800f)— Call to action
export const V2_TIMING = {
  HOOK:      { from: 0,    dur: 90 },
  PROBLEM:   { from: 90,   dur: 210 },
  SOLUTION:  { from: 300,  dur: 300 },
  SHOWCASE:  { from: 600,  dur: 450 },
  RESULTS:   { from: 1050, dur: 300 },
  TAGLINE:   { from: 1350, dur: 150 },
  CTA:       { from: 1500, dur: 300 },
} as const;

// ─── Transition helpers ─────────────────────────────────
// Cross-fade duration in frames between scenes
export const SCENE_CROSSFADE = 15;

// ─── Hebrew Package Names (source of truth) ─────────────
export const PACKAGE_NAMES_HE = {
  solo: 'סולו',
  closer: 'חבילת מכירות',
  authority: 'חבילת שיווק ומיתוג',
  operator: 'חבילת תפעול ושטח',
  empire: 'הכל כלול',
  mentor: 'כל החבילות',
} as const;

// ─── Module English Names (consistent) ──────────────────
export const MODULE_NAMES = {
  system: 'System',
  nexus: 'Nexus',
  social: 'Social',
  finance: 'Finance',
  client: 'Client',
  operations: 'Operations',
} as const;
