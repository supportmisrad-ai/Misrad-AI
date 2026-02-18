import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { S, HEEBO_S, SOCIAL_SUBTITLES } from '../config_impact_social';

export const SubtitleLayer_Social: React.FC = () => {
  const frame = useCurrentFrame();

  const current = SOCIAL_SUBTITLES.find((s) => frame >= s.from && frame < s.to);
  if (!current) return null;

  const localFrame = frame - current.from;
  const duration   = current.to - current.from;

  const fadeIn  = interpolate(localFrame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(localFrame, [duration - 8, duration], [1, 0], { extrapolateRight: 'clamp' });
  const slideY  = interpolate(localFrame, [0, 8], [-10, 0], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute',
        top: 148,
        left: 80,
        right: 80,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 300,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          padding: '10px 32px',
          borderRadius: 8,
          background: 'rgba(0,0,0,0.82)',
          border: `1px solid rgba(255,255,255,0.12)`,
          opacity: fadeIn * fadeOut,
          transform: `translateY(${slideY}px)`,
          maxWidth: 860,
        }}
      >
        <p
          style={{
            fontFamily: HEEBO_S,
            fontSize: 28,
            fontWeight: 600,
            color: '#F5E642',
            margin: 0,
            direction: 'rtl',
            textAlign: 'center',
            letterSpacing: 0,
            lineHeight: 1.35,
            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          }}
        >
          {current.text}
        </p>
      </div>
    </div>
  );
};
