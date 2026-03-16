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

  const scale = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: SPRING.ui,
  });

  const scaleValue = interpolate(scale, [0, 1], [0.95, 1]);
  const translateY = interpolate(scale, [0, 1], [40, 0]);
  const opacity = interpolate(scale, [0, 1], [0, 1]);

  const isDark = variant === 'dark';

  const bg = isDark
    ? 'rgba(15, 23, 42, 0.75)' // Slate 900 base for better contrast
    : 'rgba(255, 255, 255, 0.85)';

  const borderColor = isDark
    ? 'rgba(255, 255, 255, 0.12)'
    : 'rgba(0, 0, 0, 0.04)';

  const shadowColor = isDark
    ? 'rgba(0, 0, 0, 0.6)'
    : 'rgba(0, 0, 0, 0.1)';

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        borderRadius: 32, // Smoother corners
        background: bg,
        backdropFilter: 'blur(60px)', // Deeper blur for premium feel
        WebkitBackdropFilter: 'blur(60px)',
        border: `1.5px solid ${borderColor}`, // Slightly thicker border for definition
        boxShadow: [
          `0 25px 50px -12px ${shadowColor}`,
          glowColor ? `0 0 30px ${glowColor}25` : '',
        ]
          .filter(Boolean)
          .join(', '),
        transform: `translateY(${translateY}px) scale(${scaleValue})`, // Fix scale logic
        opacity,
        overflow: 'hidden',
        padding: '40px', // Global default padding for consistency
        ...style,
      }}
    >
      {/* Real Optical Bloom / Specular Highlight */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '-10%',
          width: '50%',
          height: '50%',
          background: isDark
            ? 'radial-gradient(circle at center, rgba(255,255,255,0.08) 0%, transparent 70%)'
            : 'radial-gradient(circle at center, rgba(255,255,255,0.8) 0%, transparent 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
        {children}
      </div>
    </div>
  );
};
