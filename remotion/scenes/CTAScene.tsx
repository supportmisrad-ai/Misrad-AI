import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from 'remotion';
import { MISRAD_COLORS, SPRING_CONFIGS } from '../config';

export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSpring = spring({
    frame: frame - 20,
    fps,
    config: SPRING_CONFIGS.hero,
  });

  const glowIntensity = Math.abs(Math.sin(frame * 0.08));
  const pulseScale = 1 + Math.sin(frame * 0.1) * 0.03;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 40%, ${MISRAD_COLORS.primary}15 0%, ${MISRAD_COLORS.onyx900} 60%)`,
        direction: 'rtl',
      }}
    >
      {/* Animated background particles */}
      {[...Array(20)].map((_, i) => {
        const angle = (i / 20) * Math.PI * 2;
        const radius = 300 + Math.sin(frame * 0.02 + i) * 100;
        const x = 960 + Math.cos(angle + frame * 0.01) * radius;
        const y = 400 + Math.sin(angle + frame * 0.01) * radius;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: i % 2 === 0 ? MISRAD_COLORS.primary : MISRAD_COLORS.indigo,
              opacity: 0.3 + glowIntensity * 0.3,
              filter: 'blur(2px)',
            }}
          />
        );
      })}

      {/* Logo */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${logoSpring})`,
        }}
      >
        <Img
          src={staticFile('icons/misrad-icon.svg')}
          style={{
            width: 140,
            height: 140,
            filter: `drop-shadow(0 0 ${50 + glowIntensity * 30}px ${MISRAD_COLORS.primary})`,
          }}
        />
      </div>

      {/* Main CTA */}
      <div
        style={{
          position: 'absolute',
          top: '35%',
          right: '10%',
          left: '10%',
          textAlign: 'center',
          opacity: interpolate(frame, [40, 70], [0, 1]),
        }}
      >
        <h1
          style={{
            fontFamily: 'Heebo, sans-serif',
            fontSize: 90,
            fontWeight: 900,
            color: '#fff',
            margin: 0,
            marginBottom: 30,
            textShadow: `0 0 40px ${MISRAD_COLORS.primary}`,
          }}
        >
          תתחילו עכשיו
        </h1>
        <h2
          style={{
            fontFamily: 'Heebo, sans-serif',
            fontSize: 56,
            fontWeight: 700,
            background: `linear-gradient(135deg, ${MISRAD_COLORS.primary} 0%, ${MISRAD_COLORS.indigo} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
          }}
        >
          14 יום ניסיון חינם
        </h2>
      </div>

      {/* Benefits */}
      <div
        style={{
          position: 'absolute',
          top: '58%',
          right: '10%',
          left: '10%',
          display: 'flex',
          justifyContent: 'center',
          gap: 80,
          opacity: interpolate(frame, [100, 130], [0, 1]),
        }}
      >
        {[
          { icon: '✓', text: 'ללא כרטיס אשראי' },
          { icon: '✓', text: 'התקנה מיידית' },
          { icon: '✓', text: 'תמיכה בעברית' },
        ].map((item, i) => {
          const itemSpring = spring({
            frame: frame - 100 - i * 10,
            fps,
            config: SPRING_CONFIGS.ui,
          });

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 15,
                transform: `translateY(${(1 - itemSpring) * 30}px)`,
              }}
            >
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${MISRAD_COLORS.primary} 0%, ${MISRAD_COLORS.indigo} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                  fontWeight: 900,
                  color: '#fff',
                  boxShadow: `0 0 30px ${MISRAD_COLORS.primary}40`,
                }}
              >
                {item.icon}
              </div>
              <p
                style={{
                  fontFamily: 'Heebo, sans-serif',
                  fontSize: 32,
                  fontWeight: 600,
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

      {/* Call-to-action button */}
      <div
        style={{
          position: 'absolute',
          bottom: '18%',
          left: '50%',
          transform: `translate(-50%, 0) scale(${pulseScale})`,
          opacity: interpolate(frame, [180, 210], [0, 1]),
        }}
      >
        <div
          style={{
            padding: '30px 100px',
            background: `linear-gradient(135deg, ${MISRAD_COLORS.primary} 0%, ${MISRAD_COLORS.indigo} 100%)`,
            borderRadius: 24,
            boxShadow: `0 20px 60px ${MISRAD_COLORS.primary}60, 0 0 ${80 + glowIntensity * 40}px ${MISRAD_COLORS.primary}`,
            border: `3px solid rgba(255, 255, 255, 0.3)`,
          }}
        >
          <p
            style={{
              fontFamily: 'Heebo, sans-serif',
              fontSize: 52,
              fontWeight: 900,
              color: '#fff',
              margin: 0,
              textShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
          >
            misrad.ai
          </p>
        </div>
      </div>

      {/* Bottom tagline */}
      <div
        style={{
          position: 'absolute',
          bottom: '8%',
          right: '10%',
          left: '10%',
          textAlign: 'center',
          opacity: interpolate(frame, [270, 300], [0, 1]),
        }}
      >
        <p
          style={{
            fontFamily: 'Heebo, sans-serif',
            fontSize: 38,
            fontWeight: 700,
            color: MISRAD_COLORS.surface100,
            margin: 0,
          }}
        >
          תפסיקו לעבוד קשה. תתחילו לעבוד חכם.
        </p>
      </div>

      {/* Floating MISRAD AI text */}
      <div
        style={{
          position: 'absolute',
          bottom: '3%',
          left: '50%',
          transform: 'translate(-50%, 0)',
          opacity: 0.6,
        }}
      >
        <p
          style={{
            fontFamily: 'Heebo, sans-serif',
            fontSize: 24,
            fontWeight: 600,
            color: MISRAD_COLORS.surface100,
            margin: 0,
          }}
        >
          MISRAD AI • מערכת AI לניהול ארגונים
        </p>
      </div>
    </AbsoluteFill>
  );
};
