import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { SPRING, BRAND } from '../config';

/**
 * Premium glassmorphism card with directional lighting, soft shadows,
 * and spring entrance animation.
 */
export const GlassCard: React.FC<{
  children: React.ReactNode;
  width?: number | string;
  height?: number | string;
  /** Delay entrance by N frames */
  delay?: number;
  /** 'dark' = frosted dark glass, 'light' = frosted white glass */
  variant?: 'dark' | 'light';
  /** Extra border glow color */
  glowColor?: string;
  style?: React.CSSProperties;
}> = ({
  children,
  width = 'auto',
  height = 'auto',
  delay = 0,
  variant = 'dark',
  glowColor,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: SPRING.ui,
    durationInFrames: 20,
  });

  const scaleY = interpolate(entrance, [0, 1], [0.92, 1]);
  const translateY = interpolate(entrance, [0, 1], [30, 0]);
  const opacity = interpolate(entrance, [0, 1], [0, 1]);

  const isDark = variant === 'dark';

  const bg = isDark
    ? 'rgba(24, 24, 27, 0.65)'
    : 'rgba(255, 255, 255, 0.72)';

  const borderColor = isDark
    ? 'rgba(255, 255, 255, 0.08)'
    : 'rgba(0, 0, 0, 0.06)';

  const shadowColor = isDark
    ? 'rgba(0, 0, 0, 0.4)'
    : 'rgba(0, 0, 0, 0.06)';

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        borderRadius: 28,
        background: bg,
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        border: `1px solid ${borderColor}`,
        boxShadow: [
          `0 20px 60px ${shadowColor}`,
          glowColor ? `0 0 40px ${glowColor}30` : '',
        ]
          .filter(Boolean)
          .join(', '),
        transform: `translateY(${translateY}px) scaleY(${scaleY})`,
        opacity,
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Directional light — top-left specular highlight */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '50%',
          background: isDark
            ? 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)'
            : 'linear-gradient(180deg, rgba(255,255,255,0.6) 0%, transparent 100%)',
          borderRadius: '28px 28px 0 0',
          pointerEvents: 'none',
        }}
      />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
        {children}
      </div>
    </div>
  );
};
