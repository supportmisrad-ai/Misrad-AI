/**
 * MISRAD AI — Audio Configuration for V2 Videos
 * Maps each video to its background music, SFX triggers, and voiceover segments.
 * Audio files should be placed in public/audio/.
 */

import { V2_TIMING } from '../shared/config';

const T = V2_TIMING;

// ─── Background Music ──────────────────────────────────────
export const MUSIC = {
  promo: { src: 'audio/music/promo-bg.mp3', volume: 0.12, fadeIn: 30, fadeOut: 45 },
  tutorial: { src: 'audio/music/tutorial-bg.mp3', volume: 0.08, fadeIn: 60, fadeOut: 60 },
  bonus: { src: 'audio/music/bonus-bg.mp3', volume: 0.14, fadeIn: 30, fadeOut: 60 },
} as const;

// ─── Standard SFX Triggers (shared across all 60s videos) ──
export const STANDARD_SFX = [
  { src: 'audio/sfx/whoosh.mp3', frame: T.HOOK.from, volume: 0.4 },
  { src: 'audio/sfx/swoosh-up.mp3', frame: T.PROBLEM.from, volume: 0.3 },
  { src: 'audio/sfx/success.mp3', frame: T.SOLUTION.from, volume: 0.35 },
  { src: 'audio/sfx/pop.mp3', frame: T.SHOWCASE.from, volume: 0.25 },
  { src: 'audio/sfx/swoosh-up.mp3', frame: T.RESULTS.from, volume: 0.3 },
  { src: 'audio/sfx/success.mp3', frame: T.TAGLINE.from, volume: 0.3 },
  { src: 'audio/sfx/notification.mp3', frame: T.CTA.from, volume: 0.4 },
] as const;

// ─── Voiceover Segment Builder ─────────────────────────────
type VoiceoverSegment = {
  src: string;
  from: number;
  durationInFrames: number;
  volume?: number;
};

function moduleVO(moduleKey: string): VoiceoverSegment[] {
  const base = `audio/voiceover/modules/${moduleKey}`;
  return [
    { src: `${base}-hook.mp3`, from: T.HOOK.from, durationInFrames: T.HOOK.dur },
    { src: `${base}-problem.mp3`, from: T.PROBLEM.from, durationInFrames: T.PROBLEM.dur },
    { src: `${base}-solution.mp3`, from: T.SOLUTION.from, durationInFrames: T.SOLUTION.dur },
    { src: `${base}-showcase.mp3`, from: T.SHOWCASE.from, durationInFrames: T.SHOWCASE.dur },
    { src: `${base}-results.mp3`, from: T.RESULTS.from, durationInFrames: T.RESULTS.dur },
    { src: `${base}-tagline.mp3`, from: T.TAGLINE.from, durationInFrames: T.TAGLINE.dur },
    { src: `${base}-cta.mp3`, from: T.CTA.from, durationInFrames: T.CTA.dur },
  ];
}

function packageVO(packageKey: string): VoiceoverSegment[] {
  const base = `audio/voiceover/packages/${packageKey}`;
  return [
    { src: `${base}-hook.mp3`, from: T.HOOK.from, durationInFrames: T.HOOK.dur },
    { src: `${base}-problem.mp3`, from: T.PROBLEM.from, durationInFrames: T.PROBLEM.dur },
    { src: `${base}-solution.mp3`, from: T.SOLUTION.from, durationInFrames: T.SOLUTION.dur },
    { src: `${base}-showcase.mp3`, from: T.SHOWCASE.from, durationInFrames: T.SHOWCASE.dur },
    { src: `${base}-results.mp3`, from: T.RESULTS.from, durationInFrames: T.RESULTS.dur },
    { src: `${base}-tagline.mp3`, from: T.TAGLINE.from, durationInFrames: T.TAGLINE.dur },
    { src: `${base}-cta.mp3`, from: T.CTA.from, durationInFrames: T.CTA.dur },
  ];
}

function uiDemoVO(demoKey: string): VoiceoverSegment[] {
  const base = `audio/voiceover/ui-demos/${demoKey}`;
  return [
    { src: `${base}-hook.mp3`, from: T.HOOK.from, durationInFrames: T.HOOK.dur },
    { src: `${base}-problem.mp3`, from: T.PROBLEM.from, durationInFrames: T.PROBLEM.dur },
    { src: `${base}-solution.mp3`, from: T.SOLUTION.from, durationInFrames: T.SOLUTION.dur },
    { src: `${base}-showcase.mp3`, from: T.SHOWCASE.from, durationInFrames: T.SHOWCASE.dur },
    { src: `${base}-results.mp3`, from: T.RESULTS.from, durationInFrames: T.RESULTS.dur },
    { src: `${base}-tagline.mp3`, from: T.TAGLINE.from, durationInFrames: T.TAGLINE.dur },
    { src: `${base}-cta.mp3`, from: T.CTA.from, durationInFrames: T.CTA.dur },
  ];
}

// ─── Full Audio Maps Per Video ─────────────────────────────
export const VIDEO_AUDIO = {
  // Modules
  system: { music: MUSIC.promo, sfx: STANDARD_SFX, voiceover: moduleVO('system') },
  nexus: { music: MUSIC.promo, sfx: STANDARD_SFX, voiceover: moduleVO('nexus') },
  social: { music: MUSIC.promo, sfx: STANDARD_SFX, voiceover: moduleVO('social') },
  finance: { music: MUSIC.promo, sfx: STANDARD_SFX, voiceover: moduleVO('finance') },
  client: { music: MUSIC.promo, sfx: STANDARD_SFX, voiceover: moduleVO('client') },
  operations: { music: MUSIC.promo, sfx: STANDARD_SFX, voiceover: moduleVO('operations') },
  // Packages
  solo: { music: MUSIC.promo, sfx: STANDARD_SFX, voiceover: packageVO('solo') },
  closer: { music: MUSIC.promo, sfx: STANDARD_SFX, voiceover: packageVO('closer') },
  authority: { music: MUSIC.promo, sfx: STANDARD_SFX, voiceover: packageVO('authority') },
  operator: { music: MUSIC.promo, sfx: STANDARD_SFX, voiceover: packageVO('operator') },
  empire: { music: MUSIC.promo, sfx: STANDARD_SFX, voiceover: packageVO('empire') },
  mentor: { music: MUSIC.promo, sfx: STANDARD_SFX, voiceover: packageVO('mentor') },
  // UI Demos
  navigation: { music: MUSIC.promo, sfx: STANDARD_SFX, voiceover: uiDemoVO('nav') },
  registration: { music: MUSIC.promo, sfx: STANDARD_SFX, voiceover: uiDemoVO('reg') },
  aiAction: { music: MUSIC.promo, sfx: STANDARD_SFX, voiceover: uiDemoVO('ai') },
} as const;
