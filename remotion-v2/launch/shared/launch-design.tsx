/**
 * MISRAD AI — Launch Videos Design System
 * Shared visual constants, helpers, and SVG icons for L1/L2/L3.
 * All sizing is calibrated for 1080×1920 (Social 9:16).
 */
import React from 'react';
import { RUBIK, HEEBO } from '../../shared/config';
import { WARM } from './launch-config';

// ─── Typography Scale (1080×1920) ────────────────────────
export const F = {
  hero: 88,
  title: 64,
  subtitle: 44,
  body: 36,
  label: 28,
  small: 22,
} as const;

// ─── Layout ──────────────────────────────────────────────
export const CARD_W = 940;
export const PAD = 70;

// ─── Gradient Text ───────────────────────────────────────
export const gradientText = (
  fontSize: number,
  variant: 'warm' | 'gold' | 'brand' = 'warm',
): React.CSSProperties => {
  const bgs: Record<string, string> = {
    warm: 'linear-gradient(170deg, #FFFFFF 0%, #E8E2D8 50%, #F0EDE8 100%)',
    gold: 'linear-gradient(170deg, #F5E6B8 0%, #D4A04A 40%, #EAD7A1 80%, #C5A572 100%)',
    brand: 'linear-gradient(170deg, #F0A0B8 0%, #A21D3C 40%, #6366F1 70%, #4338CA 100%)',
  };
  return {
    fontFamily: RUBIK,
    fontSize,
    fontWeight: 800,
    background: bgs[variant],
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    lineHeight: 1.2,
    direction: 'rtl',
    textAlign: 'center',
  };
};

// ─── Scene Background with Radial Glow ──────────────────
export const sceneBg = (
  glowColor = 'rgba(162,29,60,0.06)',
  glowY = '35%',
): React.CSSProperties => ({
  background: [
    `radial-gradient(ellipse 90% 50% at 50% ${glowY}, ${glowColor}, transparent)`,
    'linear-gradient(180deg, #110F1A 0%, #0C0A12 60%, #08080E 100%)',
  ].join(', '),
});

// ─── Full-Screen Centered Container ─────────────────────
export const fillCenter: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
};

// ─── Glass Card Base Style ──────────────────────────────
export const glassCard = (accent?: string): React.CSSProperties => ({
  width: CARD_W,
  borderRadius: 24,
  background: 'rgba(255,255,255,0.06)',
  backdropFilter: 'blur(24px)',
  border: `1px solid ${accent ? accent + '30' : 'rgba(255,255,255,0.1)'}`,
  boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
  padding: '28px 40px',
  direction: 'rtl' as const,
});

// ─── Stat Card Style ────────────────────────────────────
export const statCard = (accent: string): React.CSSProperties => ({
  flex: 1,
  borderRadius: 24,
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(20px)',
  border: `1px solid ${accent}30`,
  boxShadow: `0 12px 40px rgba(0,0,0,0.25), 0 0 60px ${accent}08`,
  padding: '32px 20px',
  textAlign: 'center',
  direction: 'rtl' as const,
});

// ═══════════════════════════════════════════════════════════
// SVG ICONS — Professional, clean, no emojis
// ═══════════════════════════════════════════════════════════

export const CheckIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 40,
  color = '#22C55E',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill={`${color}25`} stroke={color} strokeWidth="1.5" />
    <path d="M7 12.5l3.5 3.5 6.5-7" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const LockClosedIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 72,
  color = WARM.amber,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="4" y="10" width="16" height="12" rx="3" fill={`${color}20`} stroke={color} strokeWidth="1.5" />
    <path d="M8 10V7a4 4 0 018 0v3" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="16" r="2" fill={color} />
    <line x1="12" y1="16" x2="12" y2="19" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const LockOpenIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 72,
  color = '#22C55E',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="4" y="10" width="16" height="12" rx="3" fill={`${color}20`} stroke={color} strokeWidth="1.5" />
    <path d="M16 7a4 4 0 00-8 0v3" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="16" r="2" fill={color} />
  </svg>
);

export const ShieldCheckIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 44,
  color = WARM.amber,
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
  size = 44,
  color = WARM.amber,
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
  size = 28,
  color = 'rgba(255,255,255,0.25)',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ transform: 'scaleX(-1)' }}>
    <path d="M5 12h14M12 5l7 7-7 7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const DangerDot: React.FC<{ size?: number; color?: string }> = ({
  size = 14,
  color = '#EF4444',
}) => (
  <svg width={size} height={size} viewBox="0 0 14 14">
    <circle cx="7" cy="7" r="6" fill={color} />
    <circle cx="7" cy="7" r="3" fill="#fff" opacity="0.3" />
  </svg>
);

// ─── Analog Clock SVG ───────────────────────────────────
export const AnalogClock: React.FC<{
  size?: number;
  hourAngle: number;
  minuteAngle: number;
  color?: string;
}> = ({ size = 360, hourAngle, minuteAngle, color = WARM.amber }) => {
  const cx = 100, cy = 100;
  return (
    <svg viewBox="0 0 200 200" width={size} height={size}>
      {/* Outer ring */}
      <circle cx={cx} cy={cy} r="96" fill="none" stroke={color} strokeWidth="2" opacity="0.3" />
      <circle cx={cx} cy={cy} r="92" fill="rgba(10,10,18,0.7)" />
      {/* Hour marks */}
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
      {/* Hour hand */}
      <line
        x1={cx} y1={cy}
        x2={cx + Math.cos((hourAngle - 90) * Math.PI / 180) * 45}
        y2={cy + Math.sin((hourAngle - 90) * Math.PI / 180) * 45}
        stroke={color} strokeWidth="5" strokeLinecap="round"
      />
      {/* Minute hand */}
      <line
        x1={cx} y1={cy}
        x2={cx + Math.cos((minuteAngle - 90) * Math.PI / 180) * 65}
        y2={cy + Math.sin((minuteAngle - 90) * Math.PI / 180) * 65}
        stroke="#F0EDE8" strokeWidth="2.5" strokeLinecap="round"
      />
      {/* Center cap */}
      <circle cx={cx} cy={cy} r="5" fill={color} />
      <circle cx={cx} cy={cy} r="2.5" fill="#F0EDE8" />
    </svg>
  );
};

// ─── Candle SVG ─────────────────────────────────────────
export const CandleSVG: React.FC<{ size?: number; flicker?: number }> = ({
  size = 80,
  flicker = 0,
}) => (
  <svg width={size} height={size * 2} viewBox="0 0 60 120" fill="none">
    {/* Holder */}
    <rect x="20" y="90" width="20" height="8" rx="2" fill="#B8A88A" />
    <rect x="16" y="96" width="28" height="6" rx="3" fill="#A89878" />
    {/* Body */}
    <rect x="24" y="45" width="12" height="48" rx="2" fill="#F0EBE0" />
    <rect x="24" y="45" width="12" height="48" rx="2" fill="url(#cg)" opacity="0.3" />
    {/* Wick */}
    <line x1="30" y1="45" x2="30" y2="34" stroke="#5A4A2A" strokeWidth="1.5" />
    {/* Flame */}
    <ellipse cx="30" cy="25" rx={6 + flicker * 0.4} ry="13" fill="#FFD060" opacity="0.85" />
    <ellipse cx="30" cy="27" rx="3.5" ry="8" fill="#FFF4D0" opacity="0.9" />
    {/* Glow */}
    <circle cx="30" cy="25" r="22" fill="rgba(255,200,100,0.12)" />
    <defs>
      <linearGradient id="cg" x1="24" y1="45" x2="36" y2="93">
        <stop offset="0%" stopColor="#D4C4A8" />
        <stop offset="100%" stopColor="#E8DCC8" />
      </linearGradient>
    </defs>
  </svg>
);
