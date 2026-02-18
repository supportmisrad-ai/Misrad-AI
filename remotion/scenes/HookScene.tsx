import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { MISRAD_COLORS, SPRING_CONFIGS } from '../config';

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const glitchOpacity = interpolate(
    frame,
    [0, 5, 10, 15, 20, 25],
    [1, 0, 1, 0, 1, 0],
    { extrapolateRight: 'clamp' }
  );

  const textScale = spring({
    frame: frame - 10,
    fps,
    config: SPRING_CONFIGS.hero,
  });

  const shockWave = interpolate(
    frame,
    [20, 40],
    [0, 2000],
    { extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at center, ${MISRAD_COLORS.onyx700} 0%, ${MISRAD_COLORS.onyx900} 100%)`,
        direction: 'rtl',
      }}
    >
      {/* Shock wave effect */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: shockWave,
          height: shockWave,
          borderRadius: '50%',
          border: `4px solid ${MISRAD_COLORS.primary}`,
          opacity: interpolate(frame, [20, 50], [0.8, 0], { extrapolateRight: 'clamp' }),
        }}
      />

      {/* Glitch bars */}
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: `${i * 20}%`,
            left: 0,
            right: 0,
            height: '15%',
            backgroundColor: MISRAD_COLORS.primary,
            opacity: glitchOpacity * 0.1,
            transform: `translateX(${Math.sin(frame * 0.1 + i) * 50}px)`,
          }}
        />
      ))}

      {/* Main text */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          right: '10%',
          transform: `translate(0, -50%) scale(${textScale})`,
          textAlign: 'right',
          opacity: interpolate(frame, [10, 30], [0, 1]),
        }}
      >
        <h1
          style={{
            fontFamily: 'Heebo, sans-serif',
            fontSize: 120,
            fontWeight: 900,
            color: '#fff',
            margin: 0,
            textShadow: `0 0 40px ${MISRAD_COLORS.primary}`,
            lineHeight: 1.2,
          }}
        >
          תפסיקו לרוץ
        </h1>
        <h1
          style={{
            fontFamily: 'Heebo, sans-serif',
            fontSize: 120,
            fontWeight: 900,
            background: `linear-gradient(135deg, ${MISRAD_COLORS.primary} 0%, ${MISRAD_COLORS.indigo} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
            textShadow: 'none',
            lineHeight: 1.2,
          }}
        >
          אחרי העסק
        </h1>
      </div>

      {/* Subtitle */}
      <div
        style={{
          position: 'absolute',
          bottom: '20%',
          right: '10%',
          textAlign: 'right',
          opacity: interpolate(frame, [50, 70], [0, 1]),
        }}
      >
        <p
          style={{
            fontFamily: 'Heebo, sans-serif',
            fontSize: 42,
            fontWeight: 500,
            color: MISRAD_COLORS.surface100,
            margin: 0,
          }}
        >
          תנו ל-AI לעבוד במקומכם
        </p>
      </div>
    </AbsoluteFill>
  );
};
