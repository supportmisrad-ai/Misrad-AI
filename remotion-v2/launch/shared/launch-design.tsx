/**
 * MISRAD AI — Launch Videos Design System v2
 * Cinematic visual system for L1/L2/L3 launch videos.
 * Calibrated for 1080×1920 (Social 9:16) — TV quality.
 *
 * Rules:
 * - NO flat black backgrounds — everything has grain, bloom, texture
 * - Elements fill 80-90% of screen — no dead space
 * - "Optical Bloom" replaces all "glow" — refracted light halos
 * - Logo appears in every video (hook + CTA minimum)
 * - Camera: 2-5° Dutch tilt for cinematic feel
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { RUBIK, HEEBO, BRAND } from '../../shared/config';
import { WARM } from './launch-config';

// ═══════════════════════════════════════════════════════════
// TYPOGRAPHY — Dramatic scale for 1080×1920
// ═══════════════════════════════════════════════════════════
export const F = {
  mega: 110,
  hero: 96,
  title: 72,
  subtitle: 52,
  body: 40,
  label: 32,
  small: 24,
} as const;

// ═══════════════════════════════════════════════════════════
// LAYOUT — Fill the screen
// ═══════════════════════════════════════════════════════════
export const CARD_W = 960;
export const PAD = 50;
export const FULL_W = 1080;
export const FULL_H = 1920;

// TikTok Safe Zone
export const SAFE = {
  top: 150,
  bottom: 280,
  left: 50,
  right: 50,
} as const;

// Unified accent — brand indigo
export const ACCENT = {
  gold: '#6366F1',
  goldLight: '#818CF8',
  goldDim: 'rgba(99,102,241,0.15)',
} as const;

// ═══════════════════════════════════════════════════════════
// LOGO — Shield M mark (from misrad-icon.svg)
// ═══════════════════════════════════════════════════════════
export const MisradLogo: React.FC<{
  size?: number;
  withText?: boolean;
  textSize?: number;
  opacity?: number;
}> = ({ size = 80, withText = true, textSize = 44, opacity = 1 }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, opacity,
  }}>
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <path fill="#0F172A" d="M32 2l22 10v18c0 15.6-9.2 29.6-22 32C19.2 59.6 10 45.6 10 30V12L32 2z" />
      <path fill="#FFFFFF" d="M19 21.5h6.2l6.8 12.1 6.8-12.1H45v21h-5.8V32.2l-6.1 10.3h-2.2l-6.1-10.3v10.3H19v-21z" />
    </svg>
    {withText && (
      <div style={{
        fontFamily: RUBIK, fontSize: textSize, fontWeight: 800, letterSpacing: 3,
        color: BRAND.white, textAlign: 'center',
      }}>
        MISRAD AI
      </div>
    )}
  </div>
);

// Compact watermark logo for bottom of scenes
export const LogoWatermark: React.FC<{ opacity?: number }> = ({ opacity = 0.35 }) => (
  <div style={{
    position: 'absolute', bottom: SAFE.bottom + 10, left: '50%', transform: 'translateX(-50%)',
    display: 'flex', alignItems: 'center', gap: 12, opacity,
  }}>
    <svg width={28} height={28} viewBox="0 0 64 64" fill="none">
      <path fill="#0F172A" d="M32 2l22 10v18c0 15.6-9.2 29.6-22 32C19.2 59.6 10 45.6 10 30V12L32 2z" />
      <path fill="#FFFFFF" d="M19 21.5h6.2l6.8 12.1 6.8-12.1H45v21h-5.8V32.2l-6.1 10.3h-2.2l-6.1-10.3v10.3H19v-21z" />
    </svg>
    <span style={{ fontFamily: RUBIK, fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 2 }}>
      MISRAD AI
    </span>
  </div>
);

// ═══════════════════════════════════════════════════════════
// GRADIENT TEXT — Rich metallic/brand text
// ═══════════════════════════════════════════════════════════
export const gradientText = (
  fontSize: number,
  variant: 'warm' | 'gold' | 'brand' | 'white' = 'warm',
): React.CSSProperties => {
  const bgs: Record<string, string> = {
    warm: 'linear-gradient(170deg, #FFFFFF 0%, #E8E2D8 50%, #F0EDE8 100%)',
    gold: 'linear-gradient(170deg, #C7D2FE 0%, #6366F1 40%, #818CF8 80%, #A5B4FC 100%)',
    brand: 'linear-gradient(170deg, #FFFFFF 0%, #6366F1 50%, #818CF8 100%)',
    white: 'linear-gradient(170deg, #FFFFFF 0%, #E0E0E0 50%, #FFFFFF 100%)',
  };
  return {
    fontFamily: RUBIK,
    fontSize,
    fontWeight: 800,
    background: bgs[variant],
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    lineHeight: 1.15,
    direction: 'rtl',
    textAlign: 'center',
  };
};

// ═══════════════════════════════════════════════════════════
// RICH SCENE BACKGROUNDS — No flat black. Ever.
// Multiple gradient layers + warm surface tones
// ═══════════════════════════════════════════════════════════
export const sceneBg = (
  bloomColor = 'rgba(162,29,60,0.08)',
  bloomY = '35%',
  bloomX = '50%',
): React.CSSProperties => ({
  background: [
    `radial-gradient(ellipse 120% 60% at ${bloomX} ${bloomY}, ${bloomColor}, transparent)`,
    `radial-gradient(ellipse 80% 40% at 20% 80%, rgba(55,48,163,0.04), transparent)`,
    `radial-gradient(ellipse 60% 30% at 80% 20%, rgba(197,165,114,0.03), transparent)`,
    'linear-gradient(180deg, #12101C 0%, #0E0C16 40%, #0A0910 70%, #080810 100%)',
  ].join(', '),
});

// Warm scene bg (for Shabbat/emotional scenes)
export const warmSceneBg = (
  bloomColor = 'rgba(99,102,241,0.1)',
  bloomY = '40%',
): React.CSSProperties => ({
  background: [
    `radial-gradient(ellipse 100% 50% at 50% ${bloomY}, ${bloomColor}, transparent)`,
    `radial-gradient(ellipse 80% 40% at 30% 70%, rgba(99,102,241,0.05), transparent)`,
    `radial-gradient(ellipse 60% 30% at 70% 30%, rgba(162,29,60,0.03), transparent)`,
    'linear-gradient(180deg, #14120A 0%, #100E08 40%, #0C0A06 70%, #080804 100%)',
  ].join(', '),
});

// ═══════════════════════════════════════════════════════════
// OPTICAL BLOOM — Soft refracted light orbs (NOT "glow")
// ═══════════════════════════════════════════════════════════
export const BloomOrb: React.FC<{
  color?: string;
  size?: number;
  x?: string;
  y?: string;
  pulse?: boolean;
  intensity?: number;
}> = ({ color = BRAND.primary, size = 500, x = '50%', y = '40%', pulse = true, intensity = 0.12 }) => {
  const frame = useCurrentFrame();
  const scale = pulse ? 1 + Math.sin(frame * 0.04) * 0.06 : 1;
  return (
    <div style={{
      position: 'absolute',
      left: x, top: y,
      width: size, height: size,
      borderRadius: '50%',
      background: `radial-gradient(circle, ${color}${Math.round(intensity * 255).toString(16).padStart(2, '0')} 0%, transparent 65%)`,
      transform: `translate(-50%, -50%) scale(${scale})`,
      filter: 'blur(30px)',
      pointerEvents: 'none',
    }} />
  );
};

// ═══════════════════════════════════════════════════════════
// GRAIN TEXTURE LAYER — Film grain for cinematic feel
// ═══════════════════════════════════════════════════════════
export const GrainOverlay: React.FC<{ opacity?: number }> = ({ opacity = 0.04 }) => {
  const frame = useCurrentFrame();
  const seed = frame % 60;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0"><filter id="lg${seed}"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="4" seed="${seed}" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></svg>`;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 9999, mixBlendMode: 'overlay', opacity }}>
      <div style={{ position: 'absolute', width: 0, height: 0 }} dangerouslySetInnerHTML={{ __html: svg }} />
      <div style={{ width: '100%', height: '100%', filter: `url(#lg${seed})` }} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// LAYOUT HELPERS — Fill screen, no dead space
// ═══════════════════════════════════════════════════════════
// Safe-zone aware centered layout — content in the middle, respects TikTok safe zones
export const safeFill: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  direction: 'rtl' as const,
  paddingTop: SAFE.top,
  paddingBottom: SAFE.bottom,
  paddingLeft: SAFE.left,
  paddingRight: SAFE.right,
  gap: 28,
};

// Top-aligned within safe zone
export const safeTop: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
  overflow: 'hidden',
  direction: 'rtl' as const,
  paddingTop: SAFE.top + 20,
  paddingBottom: SAFE.bottom,
  paddingLeft: SAFE.left,
  paddingRight: SAFE.right,
  gap: 24,
};

// ═══════════════════════════════════════════════════════════
// GLASS CARD — Deeper, more visible
// ═══════════════════════════════════════════════════════════
export const glassCard = (accent?: string): React.CSSProperties => ({
  width: CARD_W,
  borderRadius: 28,
  background: 'rgba(255,255,255,0.07)',
  backdropFilter: 'blur(30px)',
  border: `1.5px solid ${accent ? accent + '40' : 'rgba(255,255,255,0.12)'}`,
  boxShadow: `0 12px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)${accent ? `, 0 0 80px ${accent}08` : ''}`,
  padding: '32px 44px',
  direction: 'rtl' as const,
});

// ═══════════════════════════════════════════════════════════
// STAT CARD — Bigger, more prominent
// ═══════════════════════════════════════════════════════════
export const statCard = (accent: string): React.CSSProperties => ({
  flex: 1,
  borderRadius: 28,
  background: 'rgba(255,255,255,0.06)',
  backdropFilter: 'blur(24px)',
  border: `1.5px solid ${accent}35`,
  boxShadow: `0 16px 48px rgba(0,0,0,0.3), 0 0 80px ${accent}0A`,
  padding: '40px 24px',
  textAlign: 'center',
  direction: 'rtl' as const,
});

// ═══════════════════════════════════════════════════════════
// ROW CARD — Full-width card for list items
// ═══════════════════════════════════════════════════════════
// Row card — ALWAYS gold accent for consistency
export const rowCard = (): React.CSSProperties => ({
  width: CARD_W,
  borderRadius: 24,
  background: 'rgba(99,102,241,0.06)',
  border: '1.5px solid rgba(99,102,241,0.2)',
  padding: '28px 40px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  direction: 'rtl' as const,
});

// ═══════════════════════════════════════════════════════════
// SVG ICONS — Bigger defaults, cinematic
// ═══════════════════════════════════════════════════════════

export const CheckIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 48,
  color = '#22C55E',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill={`${color}25`} stroke={color} strokeWidth="1.5" />
    <path d="M7 12.5l3.5 3.5 6.5-7" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const LockClosedIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 80,
  color = '#6366F1',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="4" y="10" width="16" height="12" rx="3" fill={`${color}20`} stroke={color} strokeWidth="1.5" />
    <path d="M8 10V7a4 4 0 018 0v3" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="16" r="2" fill={color} />
    <line x1="12" y1="16" x2="12" y2="19" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const LockOpenIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 80,
  color = '#22C55E',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="4" y="10" width="16" height="12" rx="3" fill={`${color}20`} stroke={color} strokeWidth="1.5" />
    <path d="M16 7a4 4 0 00-8 0v3" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="16" r="2" fill={color} />
  </svg>
);

export const ShieldCheckIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 56,
  color = '#6366F1',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M12 2L4 6v5c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z"
      fill={`${color}15`} stroke={color} strokeWidth="1.5"
    />
    <path d="M9 12l2 2 4-4" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CalendarIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 56,
  color = '#6366F1',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="18" height="18" rx="3" fill={`${color}12`} stroke={color} strokeWidth="1.5" />
    <line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth="1.5" />
    <line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <rect x="7" y="13" width="3" height="3" rx="0.5" fill={color} opacity="0.5" />
    <rect x="14" y="13" width="3" height="3" rx="0.5" fill={color} opacity="0.5" />
  </svg>
);

export const FlowArrow: React.FC<{ size?: number; color?: string }> = ({
  size = 36,
  color = 'rgba(255,255,255,0.35)',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ transform: 'scaleX(-1)' }}>
    <path d="M5 12h14M12 5l7 7-7 7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const DangerDot: React.FC<{ size?: number; color?: string }> = ({
  size = 22,
  color = '#EF4444',
}) => (
  <svg width={size} height={size} viewBox="0 0 14 14">
    <circle cx="7" cy="7" r="6" fill={color} />
    <circle cx="7" cy="7" r="3" fill="#fff" opacity="0.4" />
  </svg>
);

// ═══════════════════════════════════════════════════════════
// PHONE ALERT ICON — For notification scenes
// ═══════════════════════════════════════════════════════════
export const PhoneAlertIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 120,
  color = '#EF4444',
}) => (
  <svg width={size} height={size * 1.6} viewBox="0 0 60 96" fill="none">
    <rect x="8" y="4" width="44" height="88" rx="10" fill="rgba(255,255,255,0.04)" stroke={color} strokeWidth="1.5" opacity="0.6" />
    <rect x="22" y="8" width="16" height="4" rx="2" fill={color} opacity="0.3" />
    <circle cx="30" cy="80" r="4" fill={color} opacity="0.3" />
  </svg>
);

// ═══════════════════════════════════════════════════════════
// ANALOG CLOCK SVG — Bigger, more refined
// ═══════════════════════════════════════════════════════════
export const AnalogClock: React.FC<{
  size?: number;
  hourAngle: number;
  minuteAngle: number;
  color?: string;
}> = ({ size = 420, hourAngle, minuteAngle, color = '#6366F1' }) => {
  const cx = 100, cy = 100;
  return (
    <svg viewBox="0 0 200 200" width={size} height={size}>
      <circle cx={cx} cy={cy} r="96" fill="none" stroke={color} strokeWidth="2" opacity="0.3" />
      <circle cx={cx} cy={cy} r="92" fill="rgba(10,10,18,0.7)" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 - 90) * (Math.PI / 180);
        const isMajor = i % 3 === 0;
        const inner = isMajor ? 74 : 78;
        const outer = 86;
        return (
          <line
            key={i}
            x1={cx + Math.cos(a) * inner} y1={cy + Math.sin(a) * inner}
            x2={cx + Math.cos(a) * outer} y2={cy + Math.sin(a) * outer}
            stroke={color} strokeWidth={isMajor ? 3 : 1.5} opacity={isMajor ? 0.7 : 0.4}
            strokeLinecap="round"
          />
        );
      })}
      <line
        x1={cx} y1={cy}
        x2={cx + Math.cos((hourAngle - 90) * Math.PI / 180) * 45}
        y2={cy + Math.sin((hourAngle - 90) * Math.PI / 180) * 45}
        stroke={color} strokeWidth="5" strokeLinecap="round"
      />
      <line
        x1={cx} y1={cy}
        x2={cx + Math.cos((minuteAngle - 90) * Math.PI / 180) * 65}
        y2={cy + Math.sin((minuteAngle - 90) * Math.PI / 180) * 65}
        stroke="#F0EDE8" strokeWidth="2.5" strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r="5" fill={color} />
      <circle cx={cx} cy={cy} r="2.5" fill="#F0EDE8" />
    </svg>
  );
};

// ═══════════════════════════════════════════════════════════
// CANDLE SVG — Much bigger, with rich bloom halo
// ═══════════════════════════════════════════════════════════
export const CandleSVG: React.FC<{ size?: number; flicker?: number; id?: string }> = ({
  size = 160,
  flicker = 0,
  id = 'c0',
}) => (
  <svg width={size} height={size * 2.2} viewBox="0 0 60 132" fill="none">
    {/* Large bloom halo */}
    <circle cx="30" cy="22" r="40" fill="rgba(255,200,100,0.15)" />
    <circle cx="30" cy="22" r="25" fill="rgba(255,220,130,0.12)" />
    {/* Holder */}
    <rect x="18" y="95" width="24" height="10" rx="3" fill="#C8B898" />
    <rect x="14" y="103" width="32" height="8" rx="4" fill="#B8A888" />
    <rect x="10" y="109" width="40" height="6" rx="3" fill="#A89878" />
    {/* Body */}
    <rect x="22" y="42" width="16" height="56" rx="3" fill="#F5F0E5" />
    <rect x="22" y="42" width="16" height="56" rx="3" fill={`url(#cg${id})`} opacity="0.4" />
    {/* Wick */}
    <line x1="30" y1="42" x2="30" y2="30" stroke="#5A4A2A" strokeWidth="2" />
    {/* Flame outer */}
    <ellipse cx="30" cy="20" rx={8 + flicker * 0.6} ry="16" fill="#FFD060" opacity="0.9" />
    {/* Flame inner */}
    <ellipse cx="30" cy="22" rx="4.5" ry="10" fill="#FFF8E0" opacity="0.95" />
    {/* Flame tip */}
    <ellipse cx="30" cy="12" rx="2" ry="5" fill="#FFFFFF" opacity="0.7" />
    <defs>
      <linearGradient id={`cg${id}`} x1="22" y1="42" x2="38" y2="98">
        <stop offset="0%" stopColor="#E8DCC8" />
        <stop offset="100%" stopColor="#D4C4A8" />
      </linearGradient>
    </defs>
  </svg>
);
