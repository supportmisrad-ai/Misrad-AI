import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from 'remotion';
import { BRAND, HEEBO, RUBIK, SPRING } from '../../shared/config';
import { NoiseLayer } from '../../shared/components';
import {
  APP_THEME,
  MODULE_TUTORIAL_COLORS,
  TUTORIAL_FPS,
  type HighlightArea,
  type CalloutConfig,
} from './tutorial-config';

// ═══════════════════════════════════════════════════════════
// TutorialIntro — 3-second branded intro for each tutorial
// ═══════════════════════════════════════════════════════════
export const TutorialIntro: React.FC<{
  moduleKey: keyof typeof MODULE_TUTORIAL_COLORS;
  title: string;
  subtitle?: string;
  stepNumber?: number;
}> = ({ moduleKey, title, subtitle, stepNumber }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mod = MODULE_TUTORIAL_COLORS[moduleKey];

  const logoSpring = spring({ frame, fps, config: { damping: 14, stiffness: 120, mass: 0.8 }, durationInFrames: 18 });
  const titleSpring = spring({ frame: Math.max(0, frame - 12), fps, config: SPRING.hero, durationInFrames: 20 });
  const subtitleSpring = spring({ frame: Math.max(0, frame - 24), fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ backgroundColor: mod.bg, justifyContent: 'center', alignItems: 'center' }}>
      {/* Accent gradient orb */}
      <div style={{
        position: 'absolute', width: 400, height: 400, borderRadius: '50%',
        background: `radial-gradient(circle, ${mod.accent}10 0%, transparent 60%)`,
      }} />

      {/* Module badge */}
      <div style={{
        padding: '8px 20px', borderRadius: 16, background: `${mod.accent}10`,
        border: `1px solid ${mod.accent}20`, marginBottom: 16,
        opacity: logoSpring, transform: `translateY(${interpolate(logoSpring, [0, 1], [10, 0])}px)`,
      }}>
        <span style={{ fontFamily: RUBIK, fontSize: 14, fontWeight: 800, color: mod.accent, letterSpacing: '0.5px' }}>
          {mod.label} {stepNumber ? `· הדרכה ${stepNumber}` : ''}
        </span>
      </div>

      {/* Title */}
      <div style={{
        fontFamily: HEEBO, fontSize: 36, fontWeight: 900, color: '#1E293B',
        direction: 'rtl', textAlign: 'center', maxWidth: 700, lineHeight: 1.4,
        opacity: titleSpring, transform: `translateY(${interpolate(titleSpring, [0, 1], [15, 0])}px)`,
      }}>
        {title}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div style={{
          fontFamily: HEEBO, fontSize: 18, fontWeight: 700, color: '#64748B',
          direction: 'rtl', marginTop: 12,
          opacity: subtitleSpring,
        }}>
          {subtitle}
        </div>
      )}
      <NoiseLayer opacity={0.01} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// TutorialOutro — Ending card with next step suggestion
// ═══════════════════════════════════════════════════════════
export const TutorialOutro: React.FC<{
  moduleKey: keyof typeof MODULE_TUTORIAL_COLORS;
  nextTitle?: string;
}> = ({ moduleKey, nextTitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mod = MODULE_TUTORIAL_COLORS[moduleKey];
  const s = spring({ frame, fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: mod.bg, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{
        textAlign: 'center', opacity: s, transform: `scale(${interpolate(s, [0, 1], [0.95, 1])})`,
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <div style={{ fontFamily: HEEBO, fontSize: 32, fontWeight: 900, color: '#1E293B', direction: 'rtl' }}>
          זהו! סיימנו.
        </div>
        <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 700, color: '#64748B', direction: 'rtl', marginTop: 8 }}>
          עכשיו תורך. לך תנסה.
        </div>
        {nextTitle && (
          <div style={{
            marginTop: 28, padding: '14px 24px', borderRadius: 18,
            background: `${mod.accent}08`, border: `1px solid ${mod.accent}15`,
            opacity: spring({ frame: Math.max(0, frame - 30), fps, config: SPRING.ui, durationInFrames: 16 }),
          }}>
            <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: '#94A3B8', direction: 'rtl' }}>הדרכה הבאה:</div>
            <div style={{ fontFamily: HEEBO, fontSize: 17, fontWeight: 800, color: mod.accent, direction: 'rtl', marginTop: 4 }}>{nextTitle}</div>
          </div>
        )}
      </div>
      <NoiseLayer opacity={0.01} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// HighlightOverlay — Animated circle/rectangle highlight
// ═══════════════════════════════════════════════════════════
export const HighlightOverlay: React.FC<{
  highlights: HighlightArea[];
  color?: string;
}> = ({ highlights, color = '#3B82F6' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 50 }}>
      {highlights.map((h, i) => {
        const isVisible = frame >= h.showAt && frame < h.showAt + h.duration;
        if (!isVisible) return null;

        const localFrame = frame - h.showAt;
        const enterSpring = spring({ frame: localFrame, fps, config: { damping: 14, stiffness: 150, mass: 0.7 }, durationInFrames: 14 });
        const pulse = 1 + Math.sin(localFrame * 0.12) * 0.03;
        const c = h.color || color;

        if (h.style === 'circle') {
          const cx = h.x + h.width / 2;
          const cy = h.y + h.height / 2;
          const r = Math.max(h.width, h.height) / 2;
          return (
            <div key={i} style={{
              position: 'absolute', left: `${cx - r}%`, top: `${cy - r}%`,
              width: `${r * 2}%`, height: `${r * 2}%`, borderRadius: '50%',
              border: `3px solid ${c}`, boxShadow: `0 0 20px ${c}30, inset 0 0 20px ${c}08`,
              opacity: enterSpring, transform: `scale(${pulse * interpolate(enterSpring, [0, 1], [1.3, 1])})`,
            }} />
          );
        }

        if (h.style === 'pulse') {
          const cx = h.x + h.width / 2;
          const cy = h.y + h.height / 2;
          const pulseSize = interpolate(localFrame % 30, [0, 30], [0, 40]);
          return (
            <React.Fragment key={i}>
              <div style={{
                position: 'absolute', left: `${cx}%`, top: `${cy}%`,
                width: 16, height: 16, borderRadius: '50%', background: c,
                transform: 'translate(-50%, -50%)', opacity: enterSpring,
                boxShadow: `0 0 12px ${c}60`,
              }} />
              <div style={{
                position: 'absolute', left: `${cx}%`, top: `${cy}%`,
                width: 16 + pulseSize, height: 16 + pulseSize, borderRadius: '50%',
                border: `2px solid ${c}`, transform: 'translate(-50%, -50%)',
                opacity: enterSpring * interpolate(localFrame % 30, [0, 30], [0.6, 0]),
              }} />
            </React.Fragment>
          );
        }

        // Default: rectangle
        return (
          <div key={i} style={{
            position: 'absolute', left: `${h.x}%`, top: `${h.y}%`,
            width: `${h.width}%`, height: `${h.height}%`,
            border: `3px solid ${c}`, borderRadius: 12,
            boxShadow: `0 0 20px ${c}25, inset 0 0 20px ${c}05`,
            opacity: enterSpring, transform: `scale(${pulse * interpolate(enterSpring, [0, 1], [1.05, 1])})`,
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// CalloutBubble — Floating annotation text
// ═══════════════════════════════════════════════════════════
export const CalloutLayer: React.FC<{
  callouts: CalloutConfig[];
}> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 60 }}>
      {callouts.map((c, i) => {
        const isVisible = frame >= c.showAt && frame < c.showAt + c.duration;
        if (!isVisible) return null;

        const localFrame = frame - c.showAt;
        const enterSpring = spring({ frame: localFrame, fps, config: { damping: 16, stiffness: 140, mass: 0.7 }, durationInFrames: 14 });

        return (
          <div key={i} style={{
            position: 'absolute', left: `${c.x}%`, top: `${c.y}%`,
            transform: `translateY(${interpolate(enterSpring, [0, 1], [12, 0])}px)`,
            opacity: enterSpring,
          }}>
            <div style={{
              padding: '10px 18px', borderRadius: 14,
              background: c.bgColor || '#1E293B', color: c.color || '#FFFFFF',
              fontFamily: HEEBO, fontSize: c.fontSize || 15, fontWeight: 800,
              direction: 'rtl', whiteSpace: 'nowrap',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            }}>
              {c.text}
            </div>
            {/* Arrow pointer */}
            <div style={{
              width: 0, height: 0, margin: '0 auto',
              borderLeft: '8px solid transparent', borderRight: '8px solid transparent',
              borderTop: `8px solid ${c.bgColor || '#1E293B'}`,
            }} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// CursorPointer — Animated cursor that moves and clicks
// ═══════════════════════════════════════════════════════════
export const CursorPointer: React.FC<{
  moves: Array<{
    fromX: number; fromY: number;
    toX: number; toY: number;
    startFrame: number;
    moveFrames: number;
    clickAtEnd?: boolean;
  }>;
}> = ({ moves }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Find the active move
  let curX = 50;
  let curY = 50;
  let isClicking = false;
  let visible = false;

  for (const move of moves) {
    if (frame >= move.startFrame) {
      visible = true;
      const moveProgress = Math.min(1, Math.max(0, (frame - move.startFrame) / move.moveFrames));
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - moveProgress, 3);
      curX = move.fromX + (move.toX - move.fromX) * eased;
      curY = move.fromY + (move.toY - move.fromY) * eased;

      if (move.clickAtEnd && moveProgress >= 1) {
        const clickFrame = frame - (move.startFrame + move.moveFrames);
        isClicking = clickFrame >= 0 && clickFrame < 8;
      }
    }
  }

  if (!visible) return null;

  const clickScale = isClicking ? 0.85 : 1;

  return (
    <div style={{
      position: 'absolute', left: `${curX}%`, top: `${curY}%`,
      transform: `translate(-4px, -2px) scale(${clickScale})`,
      zIndex: 100, pointerEvents: 'none', transition: 'transform 0.05s',
    }}>
      {/* Cursor SVG */}
      <svg width="24" height="28" viewBox="0 0 24 28" fill="none">
        <path d="M2 2L2 22L8 16L14 24L18 22L12 14L20 14L2 2Z" fill="#1E293B" stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      {/* Click ripple */}
      {isClicking && (
        <div style={{
          position: 'absolute', top: 0, left: 4, width: 20, height: 20,
          borderRadius: '50%', border: '2px solid #3B82F6',
          opacity: 0.6, transform: 'scale(1.5)',
        }} />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// ZoomFocus — Zoom into a specific area of the screen
// ═══════════════════════════════════════════════════════════
export const ZoomFocus: React.FC<{
  children: React.ReactNode;
  zoomSteps: Array<{
    startFrame: number;
    duration: number;
    /** Center of zoom in percentage */
    centerX: number;
    centerY: number;
    /** Zoom level (1 = normal, 2 = 200%) */
    scale: number;
  }>;
}> = ({ children, zoomSteps }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  let scale = 1;
  let translateX = 0;
  let translateY = 0;

  for (const step of zoomSteps) {
    if (frame >= step.startFrame && frame < step.startFrame + step.duration) {
      const localFrame = frame - step.startFrame;
      const enterDur = 15;
      const exitStart = step.duration - 15;

      let progress: number;
      if (localFrame < enterDur) {
        progress = spring({ frame: localFrame, fps, config: { damping: 16, stiffness: 120, mass: 0.8 }, durationInFrames: enterDur });
      } else if (localFrame >= exitStart) {
        progress = spring({ frame: step.duration - localFrame, fps, config: { damping: 16, stiffness: 120, mass: 0.8 }, durationInFrames: 15 });
      } else {
        progress = 1;
      }

      scale = 1 + (step.scale - 1) * progress;
      translateX = -(step.centerX - 50) * (scale - 1) * 2;
      translateY = -(step.centerY - 50) * (scale - 1) * 2;
    }
  }

  return (
    <AbsoluteFill style={{
      transform: `scale(${scale}) translate(${translateX}%, ${translateY}%)`,
      transformOrigin: 'center center',
    }}>
      {children}
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// AppSidebar — Reusable sidebar mockup matching real app
// ═══════════════════════════════════════════════════════════
export const AppSidebar: React.FC<{
  moduleKey: keyof typeof MODULE_TUTORIAL_COLORS;
  activeItem?: string;
  items: Array<{ icon: string; label: string; id: string }>;
  collapsed?: boolean;
}> = ({ moduleKey, activeItem, items, collapsed = false }) => {
  const mod = MODULE_TUTORIAL_COLORS[moduleKey];
  const sidebarWidth = collapsed ? 64 : 240;

  return (
    <div style={{
      width: sidebarWidth, height: '100%', background: APP_THEME.sidebar,
      borderLeft: `1px solid ${APP_THEME.sidebarBorder}`,
      display: 'flex', flexDirection: 'column', padding: '16px 0',
      direction: 'rtl', flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: '8px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 12, background: BRAND.gradient,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          fontSize: 18,
        }}>🏢</div>
        {!collapsed && (
          <span style={{ fontFamily: RUBIK, fontSize: 16, fontWeight: 800, color: APP_THEME.sidebarText }}>MISRAD AI</span>
        )}
      </div>

      {/* Nav items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 8px' }}>
        {items.map((item) => {
          const isActive = item.id === activeItem;
          return (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: collapsed ? '10px' : '10px 14px', borderRadius: 12,
              background: isActive ? `${mod.accent}08` : 'transparent',
              border: isActive ? `1px solid ${mod.accent}15` : '1px solid transparent',
              justifyContent: collapsed ? 'center' : 'flex-start',
            }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {!collapsed && (
                <span style={{
                  fontFamily: HEEBO, fontSize: 14, fontWeight: isActive ? 800 : 600,
                  color: isActive ? mod.accent : APP_THEME.sidebarMuted,
                }}>{item.label}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// AppHeader — Top header bar matching real app
// ═══════════════════════════════════════════════════════════
export const AppHeader: React.FC<{
  title: string;
  moduleKey: keyof typeof MODULE_TUTORIAL_COLORS;
  breadcrumb?: string[];
  actionLabel?: string;
}> = ({ title, moduleKey, breadcrumb, actionLabel }) => {
  const mod = MODULE_TUTORIAL_COLORS[moduleKey];

  return (
    <div style={{
      height: 64, background: APP_THEME.header, borderBottom: `1px solid ${APP_THEME.headerBorder}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', direction: 'rtl', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {breadcrumb && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {breadcrumb.map((crumb, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span style={{ fontFamily: HEEBO, fontSize: 13, color: APP_THEME.textLight }}>/</span>}
                <span style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: i === breadcrumb.length - 1 ? APP_THEME.text : APP_THEME.textLight }}>{crumb}</span>
              </React.Fragment>
            ))}
          </div>
        )}
        <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 900, color: APP_THEME.text }}>{title}</div>
      </div>

      {actionLabel && (
        <div style={{
          padding: '8px 18px', borderRadius: 12, background: mod.accent,
          fontFamily: HEEBO, fontSize: 14, fontWeight: 800, color: '#fff',
        }}>
          + {actionLabel}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// AppLayout — Full app layout wrapper (sidebar + header + content)
// ═══════════════════════════════════════════════════════════
export const AppLayout: React.FC<{
  moduleKey: keyof typeof MODULE_TUTORIAL_COLORS;
  sidebarItems: Array<{ icon: string; label: string; id: string }>;
  activeItem?: string;
  headerTitle: string;
  breadcrumb?: string[];
  actionLabel?: string;
  children: React.ReactNode;
  sidebarCollapsed?: boolean;
}> = ({ moduleKey, sidebarItems, activeItem, headerTitle, breadcrumb, actionLabel, children, sidebarCollapsed }) => (
  <AbsoluteFill style={{ background: APP_THEME.bg, flexDirection: 'row-reverse' }}>
    <AppSidebar moduleKey={moduleKey} items={sidebarItems} activeItem={activeItem} collapsed={sidebarCollapsed} />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppHeader title={headerTitle} moduleKey={moduleKey} breadcrumb={breadcrumb} actionLabel={actionLabel} />
      <div style={{ flex: 1, padding: 24, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  </AbsoluteFill>
);

// ═══════════════════════════════════════════════════════════
// DataTable — Reusable table mockup
// ═══════════════════════════════════════════════════════════
export const DataTable: React.FC<{
  columns: Array<{ label: string; width?: string }>;
  rows: Array<Array<React.ReactNode>>;
  highlightRow?: number;
  animateRows?: boolean;
}> = ({ columns, rows, highlightRow, animateRows = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div style={{ width: '100%', borderRadius: 16, overflow: 'hidden', border: `1px solid ${APP_THEME.cardBorder}`, background: APP_THEME.card }}>
      {/* Header */}
      <div style={{
        display: 'flex', padding: '12px 20px', background: '#F8FAFC',
        borderBottom: `1px solid ${APP_THEME.cardBorder}`, direction: 'rtl',
      }}>
        {columns.map((col, i) => (
          <div key={i} style={{
            flex: col.width || '1', fontFamily: HEEBO, fontSize: 12, fontWeight: 800,
            color: APP_THEME.textLight, textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>{col.label}</div>
        ))}
      </div>
      {/* Rows */}
      {rows.map((row, ri) => {
        const rowSpring = animateRows ? spring({ frame: Math.max(0, frame - ri * 3), fps, config: SPRING.ui, durationInFrames: 12 }) : 1;
        const isHighlighted = ri === highlightRow;
        return (
          <div key={ri} style={{
            display: 'flex', padding: '14px 20px', direction: 'rtl',
            borderBottom: ri < rows.length - 1 ? `1px solid ${APP_THEME.cardBorder}` : 'none',
            background: isHighlighted ? '#EFF6FF' : 'transparent',
            opacity: rowSpring, transform: `translateX(${interpolate(rowSpring, [0, 1], [15, 0])}px)`,
          }}>
            {row.map((cell, ci) => (
              <div key={ci} style={{
                flex: columns[ci]?.width || '1', fontFamily: HEEBO, fontSize: 14, fontWeight: 600,
                color: APP_THEME.text, display: 'flex', alignItems: 'center',
              }}>{cell}</div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// FormMockup — Animated form field filling
// ═══════════════════════════════════════════════════════════
export const FormField: React.FC<{
  label: string;
  value: string;
  typeDelay?: number;
  typingSpeed?: number;
  isFocused?: boolean;
}> = ({ label, value, typeDelay = 0, typingSpeed = 3, isFocused = false }) => {
  const frame = useCurrentFrame();
  const typingFrame = Math.max(0, frame - typeDelay);
  const charsToShow = Math.min(value.length, Math.floor(typingFrame / typingSpeed));
  const displayValue = value.substring(0, charsToShow);
  const showCursor = isFocused && typingFrame > 0 && charsToShow < value.length;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 800, color: APP_THEME.textLight, marginBottom: 6, direction: 'rtl', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div style={{
        padding: '12px 16px', borderRadius: 12,
        background: APP_THEME.input,
        border: `1.5px solid ${isFocused ? APP_THEME.inputFocus : APP_THEME.inputBorder}`,
        boxShadow: isFocused ? `0 0 0 3px ${APP_THEME.inputFocus}15` : 'none',
        fontFamily: HEEBO, fontSize: 15, fontWeight: 600, color: APP_THEME.text,
        direction: 'rtl', minHeight: 44, display: 'flex', alignItems: 'center',
      }}>
        {displayValue}
        {showCursor && <span style={{ borderRight: '2px solid #3B82F6', height: 18, marginRight: 2, animation: 'blink 0.8s infinite' }} />}
        {!displayValue && !showCursor && (
          <span style={{ color: APP_THEME.textLight }}>...</span>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// StatusBadge — Colored badge for statuses
// ═══════════════════════════════════════════════════════════
export const StatusBadge: React.FC<{
  text: string;
  color: string;
}> = ({ text, color }) => (
  <span style={{
    padding: '4px 12px', borderRadius: 8, background: `${color}10`,
    border: `1px solid ${color}20`, fontFamily: HEEBO, fontSize: 12,
    fontWeight: 800, color, whiteSpace: 'nowrap',
  }}>
    {text}
  </span>
);

// ═══════════════════════════════════════════════════════════
// VoiceoverSubtitle — Bottom subtitle bar for narration text
// ═══════════════════════════════════════════════════════════
export const VoiceoverSubtitle: React.FC<{
  segments: Array<{ text: string; from: number; dur: number }>;
}> = ({ segments }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const active = segments.find((s) => frame >= s.from && frame < s.from + s.dur);
  if (!active) return null;

  const localFrame = frame - active.from;
  const enterSpring = spring({ frame: localFrame, fps, config: { damping: 18, stiffness: 150, mass: 0.6 }, durationInFrames: 10 });

  return (
    <div style={{
      position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)',
      zIndex: 70, opacity: enterSpring,
    }}>
      <div style={{
        padding: '12px 28px', borderRadius: 16,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)',
        fontFamily: HEEBO, fontSize: 18, fontWeight: 700, color: '#FFFFFF',
        direction: 'rtl', maxWidth: 700, textAlign: 'center', lineHeight: 1.5,
      }}>
        {active.text}
      </div>
    </div>
  );
};
