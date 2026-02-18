import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from 'remotion';
import { MISRAD_COLORS, SPRING_CONFIGS } from '../config';

export const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({
    frame: frame - 20,
    fps,
    config: SPRING_CONFIGS.hero,
  });

  const textOpacity = interpolate(frame, [40, 70], [0, 1]);
  const glowIntensity = Math.abs(Math.sin(frame * 0.05));

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at center, ${MISRAD_COLORS.onyx800} 0%, ${MISRAD_COLORS.onyx900} 100%)`,
        direction: 'rtl',
      }}
    >
      {/* Animated gradient orbs */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '15%',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${MISRAD_COLORS.primary} 0%, transparent 70%)`,
          opacity: 0.2,
          filter: 'blur(100px)',
          transform: `translate(${Math.sin(frame * 0.02) * 50}px, ${Math.cos(frame * 0.03) * 50}px)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '20%',
          right: '15%',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${MISRAD_COLORS.indigo} 0%, transparent 70%)`,
          opacity: 0.15,
          filter: 'blur(120px)',
          transform: `translate(${Math.cos(frame * 0.025) * 60}px, ${Math.sin(frame * 0.02) * 60}px)`,
        }}
      />

      {/* Logo */}
      <div
        style={{
          position: 'absolute',
          top: '25%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${logoScale})`,
          display: 'flex',
          alignItems: 'center',
          gap: 30,
        }}
      >
        <Img
          src={staticFile('icons/misrad-icon.svg')}
          style={{
            width: 160,
            height: 160,
            filter: `drop-shadow(0 0 ${40 + glowIntensity * 20}px ${MISRAD_COLORS.primary})`,
          }}
        />
        <h1
          style={{
            fontFamily: 'Heebo, sans-serif',
            fontSize: 100,
            fontWeight: 900,
            color: '#fff',
            margin: 0,
            textShadow: `0 0 40px ${MISRAD_COLORS.primary}`,
          }}
        >
          MISRAD AI
        </h1>
      </div>

      {/* Main message */}
      <div
        style={{
          position: 'absolute',
          top: '48%',
          right: '10%',
          left: '10%',
          textAlign: 'center',
          opacity: textOpacity,
        }}
      >
        <h2
          style={{
            fontFamily: 'Heebo, sans-serif',
            fontSize: 70,
            fontWeight: 900,
            background: `linear-gradient(135deg, ${MISRAD_COLORS.primary} 0%, ${MISRAD_COLORS.indigo} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
            marginBottom: 40,
          }}
        >
          לא CRM עם AI
        </h2>
        <h2
          style={{
            fontFamily: 'Heebo, sans-serif',
            fontSize: 76,
            fontWeight: 900,
            color: '#fff',
            margin: 0,
            marginBottom: 50,
          }}
        >
          מערכת AI שמנהלת את הארגון
        </h2>
      </div>

      {/* Key points */}
      <div
        style={{
          position: 'absolute',
          bottom: '15%',
          right: '10%',
          left: '10%',
          display: 'flex',
          justifyContent: 'space-around',
          opacity: interpolate(frame, [120, 150], [0, 1]),
        }}
      >
        {[
          { icon: '🎯', text: 'מנתחת' },
          { icon: '🔮', text: 'מנבאת' },
          { icon: '💡', text: 'ממליצה' },
        ].map((item, i) => {
          const itemSpring = spring({
            frame: frame - 120 - i * 10,
            fps,
            config: SPRING_CONFIGS.ui,
          });

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 15,
                transform: `translateY(${(1 - itemSpring) * 50}px)`,
              }}
            >
              <div style={{ fontSize: 80 }}>{item.icon}</div>
              <p
                style={{
                  fontFamily: 'Heebo, sans-serif',
                  fontSize: 44,
                  fontWeight: 700,
                  color: MISRAD_COLORS.surface100,
                  margin: 0,
                }}
              >
                {item.text}
              </p>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
