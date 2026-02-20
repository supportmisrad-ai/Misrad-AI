import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { SPRING, BRAND } from '../config';

/**
 * Desktop/laptop screen mockup frame for TV (16:9) compositions.
 * Clean, modern look without macOS-style window circles.
 */
export const DesktopFrame: React.FC<{
  children: React.ReactNode;
  scale?: number;
  delay?: number;
  shadowIntensity?: number;
}> = ({ children, scale = 1, delay = 0, shadowIntensity = 0.8 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entranceSpring = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: SPRING.hero,
    durationInFrames: 22,
  });

  const y = interpolate(entranceSpring, [0, 1], [60, 0]);
  const opacity = interpolate(entranceSpring, [0, 1], [0, 1]);

  const SCREEN_W = 960;
  const SCREEN_H = 540;
  const BEZEL = 12;
  const TOOLBAR_H = 36;

  return (
    <div
      style={{
        transform: `scale(${scale}) translateY(${y}px)`,
        opacity,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Monitor body */}
      <div
        style={{
          width: SCREEN_W + BEZEL * 2,
          borderRadius: 16,
          background: '#1A1A1E',
          padding: BEZEL,
          boxShadow: `0 30px 80px rgba(0,0,0,${shadowIntensity * 0.5}), 0 0 0 1px rgba(255,255,255,0.06)`,
          position: 'relative',
        }}
      >
        {/* Toolbar */}
        <div
          style={{
            width: '100%',
            height: TOOLBAR_H,
            background: '#111114',
            borderRadius: '8px 8px 0 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 16px',
            position: 'relative',
          }}
        >
          {/* URL bar */}
          <div
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              padding: '4px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ fontSize: 10, opacity: 0.4 }}>🔒</span>
            <span
              style={{
                fontFamily: 'system-ui, sans-serif',
                fontSize: 11,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.45)',
                letterSpacing: 0.3,
              }}
            >
              misrad-ai.com
            </span>
          </div>
        </div>

        {/* Screen content */}
        <div
          style={{
            width: SCREEN_W,
            height: SCREEN_H,
            borderRadius: '0 0 4px 4px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {children}
        </div>
      </div>

      {/* Stand neck */}
      <div
        style={{
          width: 80,
          height: 40,
          background: 'linear-gradient(180deg, #1A1A1E 0%, #27272A 100%)',
          borderRadius: '0 0 4px 4px',
        }}
      />

      {/* Stand base */}
      <div
        style={{
          width: 200,
          height: 10,
          background: '#27272A',
          borderRadius: '0 0 10px 10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      />
    </div>
  );
};
