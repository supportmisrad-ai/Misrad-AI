import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
  staticFile,
} from 'remotion';
import { V5, MOTION, HEEBO, RUBIK } from '../config';

export const CTAClosingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSpring = spring({
    frame: frame - 5,
    fps,
    config: MOTION.hero,
  });

  const glowPulse = Math.abs(Math.sin(frame * 0.07));
  const breatheScale = 1 + Math.sin(frame * 0.08) * 0.02;

  const titleOpacity = interpolate(frame, [20, 45], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const titleBlur = interpolate(frame, [20, 45], [10, 0], {
    extrapolateRight: 'clamp',
  });

  const urlSpring = spring({
    frame: frame - 55,
    fps,
    config: MOTION.snappy,
  });
  const urlBlur = interpolate(frame, [55, 78], [8, 0], {
    extrapolateRight: 'clamp',
  });

  const ctaOpacity = interpolate(frame, [75, 100], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const ctaY = interpolate(frame, [75, 100], [20, 0], {
    extrapolateRight: 'clamp',
  });

  const fadeToBlack = interpolate(frame, [130, 150], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: V5.bgDeep }}>
      <div
        style={{
          position: 'absolute',
          top: '35%',
          left: '50%',
          width: 800,
          height: 800,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${V5.primary}18 0%, ${V5.indigo}10 55%)`,  
          transform: `translate(-50%, -50%) scale(${breatheScale})`,
        }}
      />

      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        const radius = 250 + Math.sin(frame * 0.025 + i * 0.8) * 80;
        const x = 960 + Math.cos(angle + frame * 0.012) * radius;
        const y = 380 + Math.sin(angle + frame * 0.012) * radius * 0.6;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: 5,
              height: 5,
              borderRadius: '50%',
              backgroundColor: i % 3 === 0 ? V5.primary : i % 3 === 1 ? V5.indigoLight : V5.indigo,  
              opacity: 0.25 + glowPulse * 0.2,
              filter: 'blur(1px)',
            }}
          />
        );
      })}

      <div
        style={{
          position: 'absolute',
          top: '22%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${logoSpring})`,
        }}
      >
        <Img
          src={staticFile('icons/misrad-icon.svg')}
          style={{
            width: 130,
            height: 130,
            filter: `drop-shadow(0 0 ${35 + glowPulse * 25}px ${V5.primary})`,  
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          opacity: titleOpacity,
          filter: `blur(${titleBlur}px)`,
        }}
      >
        <h1
          style={{
            fontFamily: HEEBO,
            fontSize: 88,
            fontWeight: 900,
            color: V5.white,
            margin: 0,
            letterSpacing: -1,
            textShadow: `0 0 40px ${V5.primaryAlpha}`,  
          }}
        >
          MISRAD AI
        </h1>
      </div>

      <div
        style={{
          position: 'absolute',
          top: '56%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${urlSpring})`,
          filter: `blur(${urlBlur}px)`,
        }}
      >
        <div
          style={{
            padding: '20px 72px',
            background: `linear-gradient(135deg, ${V5.primary} 0%, ${V5.indigo} 100%)`,
            borderRadius: 18,
            boxShadow: `0 16px 48px ${V5.primaryAlpha}, 0 0 ${60 + glowPulse * 30}px ${V5.indigoAlpha}`,
            border: `2px solid rgba(255,255,255,0.2)`,  
            transform: `scale(${breatheScale})`,
          }}
        >
          <p
            style={{
              fontFamily: RUBIK,
              fontSize: 48,
              fontWeight: 800,
              color: V5.bgDeep,
              margin: 0,
              letterSpacing: 1,
            }}
          >
            misrad.ai
          </p>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: '72%',
          left: '50%',
          transform: `translate(-50%, 0) translateY(${ctaY}px)`,
          opacity: ctaOpacity,
          textAlign: 'center',
          direction: 'rtl',
        }}
      >
        <p
          style={{
            fontFamily: HEEBO,
            fontSize: 40,
            fontWeight: 700,
            background: `linear-gradient(135deg, ${V5.primary} 0%, ${V5.indigo} 100%)`,  
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
            marginBottom: 14,
          }}
        >
          התחל עכשיו — 14 יום חינם
        </p>
        <p
          style={{
            fontFamily: HEEBO,
            fontSize: 26,
            fontWeight: 500,
            color: V5.muted,
            margin: 0,
          }}
        >
          ללא כרטיס אשראי · התקנה מיידית · תמיכה בעברית
        </p>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 40,
          left: '50%',
          transform: 'translate(-50%, 0)',
          opacity: interpolate(frame, [100, 120], [0, 0.5], {
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <p
          style={{
            fontFamily: HEEBO,
            fontSize: 20,
            fontWeight: 500,
            color: V5.muted,
            margin: 0,
          }}
        >
          MISRAD AI · מערכת AI לניהול ארגונים
        </p>
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: '#000',
          opacity: fadeToBlack,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
