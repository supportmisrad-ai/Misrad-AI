/**
 * MISRAD AI — Tutorial Video Configuration
 * Long-form tutorial videos (30s–5min) with precise timing, UI mockups, and annotations.
 */

export const TUTORIAL_FPS = 30;

// Duration helpers
export const seconds = (s: number) => Math.round(s * TUTORIAL_FPS);
export const minutes = (m: number) => Math.round(m * 60 * TUTORIAL_FPS);

// ─── Standard Tutorial Timing Template (variable length) ──
// Each tutorial defines its own segments via TutorialSegment[]
export type TutorialSegment = {
  id: string;
  label: string;
  /** Hebrew voiceover text for this segment */
  voiceover: string;
  /** Start frame */
  from: number;
  /** Duration in frames */
  dur: number;
  /** Which screen/action to show */
  screen: string;
  /** Optional highlight areas */
  highlights?: HighlightArea[];
  /** Optional callout texts */
  callouts?: CalloutConfig[];
};

export type HighlightArea = {
  /** Percentage-based position and size */
  x: number;
  y: number;
  width: number;
  height: number;
  /** When to show (frames relative to segment start) */
  showAt: number;
  /** Duration in frames */
  duration: number;
  /** Style */
  style: 'circle' | 'rectangle' | 'arrow' | 'pulse';
  color?: string;
};

export type CalloutConfig = {
  text: string;
  x: number;
  y: number;
  showAt: number;
  duration: number;
  fontSize?: number;
  color?: string;
  bgColor?: string;
};

// ─── Tutorial Intro/Outro Timing ──────────────────────────
export const TUTORIAL_INTRO_FRAMES = seconds(3);   // 3s intro
export const TUTORIAL_OUTRO_FRAMES = seconds(4);   // 4s outro

// ─── Aspect Ratios ────────────────────────────────────────
export const DESKTOP_WIDTH = 1920;
export const DESKTOP_HEIGHT = 1080;
export const MOBILE_WIDTH = 1080;
export const MOBILE_HEIGHT = 1920;

// ─── UI Mockup Colors (matching actual app theme) ─────────
export const APP_THEME = {
  // Light mode (default for tutorials)
  bg: '#FAFBFC',
  sidebar: '#FFFFFF',
  sidebarBorder: '#E2E8F0',
  sidebarText: '#1E293B',
  sidebarMuted: '#94A3B8',
  sidebarActive: '#EFF6FF',
  sidebarActiveText: '#3B82F6',
  header: '#FFFFFF',
  headerBorder: '#E2E8F0',
  card: '#FFFFFF',
  cardBorder: '#E2E8F0',
  cardShadow: '0 1px 3px rgba(0,0,0,0.06)',
  text: '#1E293B',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  primary: '#3B82F6',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  input: '#F8FAFC',
  inputBorder: '#E2E8F0',
  inputFocus: '#3B82F6',
  button: '#1E293B',
  buttonText: '#FFFFFF',
  badge: '#EFF6FF',
  badgeText: '#3B82F6',
} as const;

// Module accent colors for tutorial headers
export const MODULE_TUTORIAL_COLORS = {
  system: { accent: '#A21D3C', bg: '#FFF1F2', label: 'System — מכירות' },
  nexus: { accent: '#3730A3', bg: '#EEF2FF', label: 'Nexus — ניהול צוות' },
  social: { accent: '#7C3AED', bg: '#F5F3FF', label: 'Social — שיווק' },
  finance: { accent: '#059669', bg: '#ECFDF5', label: 'Finance — כספים' },
  client: { accent: '#C5A572', bg: '#FFFBEB', label: 'Client — לקוחות' },
  operations: { accent: '#0EA5E9', bg: '#F0F9FF', label: 'Operations — תפעול' },
} as const;
