import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { V5, MOTION, HEEBO, MODULES_DATA } from '../config';
import { ClayVideoSlot } from '../components/ClayVideoSlot';

export const ProtocolRevealScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pulseRadius = interpolate(frame, [30, 80], [0, 2200], {
    extrapolateRight: 'clamp',
  });
  const pulseOpacity = interpolate(frame, [30, 50, 80], [0, 0.6, 0], {
    extrapolateRight: 'clamp',
  });

  const gridSpring = spring({
    frame: frame - 10,
    fps,
    config: MOTION.cinematic,
  });

  const textBlur = interpolate(frame, [55, 85], [12, 0], {
    extrapolateRight: 'clamp',
  });
  const textOpacity = interpolate(frame, [55, 80], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const textY = interpolate(frame, [55, 85], [25, 0], {
    extrapolateRight: 'clamp',
  });

  const breathe = 1 + Math.sin(frame * 0.05) * 0.008;

  return (
    <AbsoluteFill style={{ backgroundColor: V5.bgDeep }}>
      <div
        style={{
          position: 'absolute',
          top: '45%',
          left: '50%',
          width: 1000,
          height: 1000,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${V5.primary}14 0%, ${V5.indigo}08 60%)`,  
          transform: `translate(-50%, -50%) scale(${breathe})`,
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: '45%',
          left: '50%',
          width: pulseRadius,
          height: pulseRadius,
          borderRadius: '50%',
          border: `3px solid ${V5.primary}`,
          transform: 'translate(-50%, -50%)',
          opacity: pulseOpacity,
          boxShadow: `0 0 60px ${V5.primaryAlpha}, inset 0 0 60px ${V5.indigoAlpha}`,  
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: '18%',
          left: '50%',
          transform: `translate(-50%, 0) scale(${gridSpring})`,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 140px)',
          gridTemplateRows: 'repeat(2, 140px)',
          gap: 20,
        }}
      >
        {MODULES_DATA.map((mod, i) => {
          const delay = i * 4;
          const iconSpring = spring({
            frame: Math.max(0, frame - delay - 8),
            fps,
            config: MOTION.snappy,
          });

          return (
            <div
              key={i}
              style={{
                width: 140,
                height: 140,
                borderRadius: 28,
                background: `linear-gradient(145deg, ${mod.color}18 0%, ${V5.surface} 100%)`,
                border: `1.5px solid ${mod.color}40`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transform: `scale(${iconSpring})`,
                boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${mod.color}15`,
              }}
            >
              <div style={{ fontSize: 44 }}>{mod.icon}</div>
              <p
                style={{
                  fontFamily: HEEBO,
                  fontSize: 16,
                  fontWeight: 700,
                  color: mod.color,
                  margin: 0,
                  textAlign: 'center',
                  direction: 'rtl',
                }}
              >
                {mod.name}
              </p>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: 'absolute',
          top: '68%',
          left: '50%',
          transform: `translate(-50%, 0) translateY(${textY}px)`,
          opacity: textOpacity,
          filter: `blur(${textBlur}px)`,
          textAlign: 'center',
          direction: 'rtl',
          width: '80%',
        }}
      >
        <h2
          style={{
            fontFamily: HEEBO,
            fontSize: 62,
            fontWeight: 900,
            color: V5.white,
            margin: 0,
            marginBottom: 16,
            lineHeight: 1.2,
          }}
        >
          הדור הבא של ניהול עסקי
        </h2>
        <p
          style={{
            fontFamily: HEEBO,
            fontSize: 38,
            fontWeight: 600,
            background: `linear-gradient(135deg, ${V5.primary} 0%, ${V5.indigo} 100%)`,  
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
          }}
        >
          כבר כאן.
        </p>
      </div>

      {Array.from({ length: 20 }).map((_, i) => {
        const angle = (i / 20) * Math.PI * 2;
        const baseRadius = 350;
        const convergeProgress = interpolate(frame, [0, 40], [1, 0], {
          extrapolateRight: 'clamp',
        });
        const currentRadius = baseRadius * convergeProgress + 60;
        const x = 960 + Math.cos(angle + frame * 0.008) * currentRadius;
        const y = 480 + Math.sin(angle + frame * 0.008) * currentRadius * 0.7;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: 4,
              height: 4,
              borderRadius: '50%',
              backgroundColor: i % 2 === 0 ? V5.primary : V5.indigo,
              opacity: 0.4 + Math.sin(frame * 0.04 + i) * 0.25,
              boxShadow: `0 0 8px ${V5.primaryAlpha}`,  
            }}
          />
        );
      })}

      <ClayVideoSlot
        src="clay/brain-gears.webm"
        startFrame={5}
        durationFrames={120}
        maxOpacity={0.08}
        scale={1.2}
        width={500}
        height={400}
        position={{ top: '45%', left: '50%' }}
      />
    </AbsoluteFill>
  );
};
