import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { IMPACT, HEEBO_IMPACT, IMPACT_SUBTITLE_TRACK } from '../config_impact';

export const SubtitleLayer_Impact: React.FC = () => {
  const frame = useCurrentFrame();

  const current = IMPACT_SUBTITLE_TRACK.find((s) => frame >= s.from && frame < s.to);
  if (!current) return null;

  const localFrame = frame - current.from;
  const duration = current.to - current.from;

  const fadeIn = interpolate(localFrame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(localFrame, [duration - 12, duration], [1, 0], { extrapolateRight: 'clamp' });
  const blurIn = interpolate(localFrame, [0, 15], [6, 0], { extrapolateRight: 'clamp' });
  const slideY = interpolate(localFrame, [0, 15], [16, 0], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 64,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 100,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          padding: '12px 48px',
          borderRadius: 12,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(24px)',
          border: `1px solid ${IMPACT.primary}28`,
          opacity: fadeIn * fadeOut,
          filter: `blur(${blurIn}px)`,
          transform: `translateY(${slideY}px)`,
        }}
      >
        <p
          style={{
            fontFamily: HEEBO_IMPACT,
            fontSize: 38,
            fontWeight: 600,
            color: IMPACT.white,
            margin: 0,
            direction: 'rtl',
            textAlign: 'center',
            letterSpacing: -0.5,
            textShadow: `0 2px 12px rgba(0,0,0,0.7)`,
          }}
        >
          {current.text}
        </p>
      </div>
    </div>
  );
};
