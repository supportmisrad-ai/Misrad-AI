import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { SPRING } from '../config';

/**
 * Premium mobile device mockup frame.
 * Renders children inside a realistic iPhone-style bezel with
 * notch, status bar, and home indicator.
 */
export const PhoneFrame: React.FC<{
  children: React.ReactNode;
  /** Scale of the phone (1 = fills ~60% of 1080px width) */
  scale?: number;
  /** Entrance delay in frames */
  delay?: number;
  /** Rotation on Y axis for 3D tilt */
  tiltY?: number;
  /** Shadow intensity */
  shadowIntensity?: number;
  style?: React.CSSProperties;
}> = ({
  children,
  scale = 1,
  delay = 0,
  tiltY = 0,
  shadowIntensity = 1,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: SPRING.hero,
    durationInFrames: 25,
  });

  const phoneWidth = 375;
  const phoneHeight = 812;
  const bezelRadius = 54;
  const notchWidth = 160;
  const notchHeight = 34;

  const translateY = interpolate(entrance, [0, 1], [120, 0]);
  const scaleVal = interpolate(entrance, [0, 1], [0.85, 1]) * scale;
  const opacity = interpolate(entrance, [0, 1], [0, 1]);

  return (
    <div
      style={{
        width: phoneWidth,
        height: phoneHeight,
        position: 'relative',
        transform: `translateY(${translateY}px) scale(${scaleVal}) perspective(1200px) rotateY(${tiltY}deg)`,
        opacity,
        transformOrigin: '50% 50%',
        ...style,
      }}
    >
      {/* Phone body */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: bezelRadius,
          background: '#1C1C1E',
          boxShadow: [
            `0 40px 80px rgba(0,0,0,${0.3 * shadowIntensity})`,
            `0 0 0 1px rgba(255,255,255,0.08)`,
            `inset 0 1px 0 rgba(255,255,255,0.05)`,
          ].join(', '),
          overflow: 'hidden',
        }}
      >
        {/* Screen area */}
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: 4,
            right: 4,
            bottom: 4,
            borderRadius: bezelRadius - 4,
            overflow: 'hidden',
            background: '#000',
          }}
        >
          {/* Screen content */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              overflow: 'hidden',
            }}
          >
            {children}
          </div>

          {/* Notch */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: notchWidth,
              height: notchHeight,
              background: '#000',
              borderRadius: `0 0 22px 22px`,
              zIndex: 50,
            }}
          >
            {/* Dynamic Island pill */}
            <div
              style={{
                position: 'absolute',
                bottom: 6,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 90,
                height: 24,
                borderRadius: 12,
                background: '#1C1C1E',
              }}
            />
          </div>

          {/* Status bar time */}
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 28,
              fontSize: 15,
              fontWeight: 700,
              color: '#fff',
              fontFamily: '-apple-system, system-ui, sans-serif',
              zIndex: 51,
            }}
          >
            9:41
          </div>

          {/* Status bar icons (battery, signal) */}
          <div
            style={{
              position: 'absolute',
              top: 14,
              right: 28,
              display: 'flex',
              gap: 6,
              alignItems: 'center',
              zIndex: 51,
            }}
          >
            {/* Signal bars */}
            <div style={{ display: 'flex', gap: 1.5, alignItems: 'flex-end' }}>
              {[6, 8, 10, 12].map((h, i) => (
                <div
                  key={i}
                  style={{
                    width: 3,
                    height: h,
                    borderRadius: 1,
                    background: '#fff',
                  }}
                />
              ))}
            </div>
            {/* WiFi */}
            <svg width="14" height="11" viewBox="0 0 14 11" fill="white">
              <path d="M7 10.5a1.2 1.2 0 110-2.4 1.2 1.2 0 010 2.4zM3.5 7.2a5 5 0 017 0l-.9.9a3.7 3.7 0 00-5.2 0L3.5 7.2zM1 4.7a8.3 8.3 0 0112 0l-.9.9a7 7 0 00-10.2 0L1 4.7z" />
            </svg>
            {/* Battery */}
            <div
              style={{
                width: 24,
                height: 11,
                borderRadius: 3,
                border: '1.2px solid rgba(255,255,255,0.5)',
                padding: 1.5,
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: '70%',
                  height: '100%',
                  borderRadius: 1.5,
                  background: '#fff',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  right: -4,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 2,
                  height: 5,
                  borderRadius: '0 1px 1px 0',
                  background: 'rgba(255,255,255,0.3)',
                }}
              />
            </div>
          </div>

          {/* Home indicator */}
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 134,
              height: 5,
              borderRadius: 3,
              background: 'rgba(255,255,255,0.3)',
              zIndex: 51,
            }}
          />
        </div>
      </div>
    </div>
  );
};
