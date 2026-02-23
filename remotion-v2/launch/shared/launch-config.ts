/**
 * MISRAD AI — Launch Videos Configuration
 * 3 launch videos, 75 seconds each @ 30fps = 2250 frames.
 */

export const LAUNCH_FPS = 30;
export const LAUNCH_DURATION = 75 * LAUNCH_FPS; // 2250 frames

// ─── L1 "הבלגן" Hero Video Timing ──────────────────────
export const L1_TIMING = {
  HOOK:           { from: 0,    dur: 150 },  // 0:00–0:05
  PROBLEM:        { from: 150,  dur: 300 },  // 0:05–0:15
  SOLUTION:       { from: 450,  dur: 450 },  // 0:15–0:30
  DIFFERENTIATOR: { from: 900,  dur: 450 },  // 0:30–0:45
  PROOF:          { from: 1350, dur: 300 },  // 0:45–0:55
  CTA:            { from: 1650, dur: 600 },  // 0:55–1:15
} as const;

// ─── L2 "שומר שבת" Shabbat Video Timing ────────────────
export const L2_TIMING = {
  HOOK:           { from: 0,    dur: 180 },  // 0:00–0:06
  PAIN:           { from: 180,  dur: 270 },  // 0:06–0:15
  ANSWER:         { from: 450,  dur: 450 },  // 0:15–0:30
  CALENDAR:       { from: 900,  dur: 360 },  // 0:30–0:42
  WHATS_INSIDE:   { from: 1260, dur: 390 },  // 0:42–0:55
  CTA:            { from: 1650, dur: 600 },  // 0:55–1:15
} as const;

// ─── L3 "מליד לחשבונית" Workflow Video Timing ──────────
export const L3_TIMING = {
  HOOK:           { from: 0,    dur: 150 },  // 0:00–0:05
  CALL:           { from: 150,  dur: 300 },  // 0:05–0:15
  QUOTE:          { from: 450,  dur: 300 },  // 0:15–0:25
  CLIENT:         { from: 750,  dur: 300 },  // 0:25–0:35
  INVOICE:        { from: 1050, dur: 300 },  // 0:35–0:45
  PROOF:          { from: 1350, dur: 300 },  // 0:45–0:55
  CTA:            { from: 1650, dur: 600 },  // 0:55–1:15
} as const;

// ─── Warm color palette for launch videos ───────────────
export const WARM = {
  amber:      '#C5A572',
  amberLight: '#EAD7A1',
  amberDark:  '#8B6B3A',
  gold:       '#D4A04A',
  goldGlow:   'rgba(212, 160, 74, 0.3)',
  cream:      '#F5F0E8',
  warmDark:   '#0A0A0F',
  warmSurface:'#1A1520',
  candleGlow: 'rgba(255, 200, 100, 0.4)',
} as const;
