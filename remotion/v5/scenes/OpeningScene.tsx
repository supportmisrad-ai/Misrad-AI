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
import { ClayVideoSlot } from '../components/ClayVideoSlot';

export const OpeningScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lineWidth = interpolate(frame, [0, 30], [0, 100], {
    extrapolateRight: 'clamp',
  });
  const lineOpacity = interpolate(frame, [0, 8, 60, 80], [0, 1, 1, 0.3], {
    extrapolateRight: 'clamp',
  });

  const textBlur = interpolate(frame, [25, 55], [18, 0], {
    extrapolateRight: 'clamp',
  });
  const textOpacity = interpolate(frame, [25, 50], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const textY = interpolate(frame, [25, 55], [30, 0], {
    extrapolateRight: 'clamp',
  });

  const logoSpring = spring({
    frame: frame - 50,
    fps,
    config: MOTION.hero,
  });
  const logoGlow = Math.abs(Math.sin(frame * 0.06)) * 25 + 15;

  const versionSpring = spring({
    frame: frame - 78,
    fps,
    config: MOTION.snappy,
  });
  const versionBlur = interpolate(frame, [78, 100], [10, 0], {
    extrapolateRight: 'clamp',
  });

  const ambientPulse = interpolate(frame, [15, 60], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const particlePhase = frame * 0.015;

  return (
    <AbsoluteFill style={{ backgroundColor: V5.bgDeep }}>
      <div
        style={{
          position: 'absolute',
          top: '42%',
          left: '50%',
          width: 900,
          height: 900,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${V5.primary}18 0%, ${V5.indigo}10 65%)`,  
          transform: 'translate(-50%, -50%)',
          opacity: ambientPulse,
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          height: 2,
          width: `${lineWidth}%`,
          background: `linear-gradient(90deg, transparent 0%, ${V5.primary} 25%, ${V5.indigo} 75%, transparent 100%)`,
          transform: 'translate(-50%, -50%)',
          opacity: lineOpacity,
          boxShadow: `0 0 40px ${V5.primaryAlpha}, 0 0 80px ${V5.indigoAlpha}`,  
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: '36%',
          left: '50%',
          transform: `translate(-50%, -50%) translateY(${textY}px)`,
          opacity: textOpacity,
          filter: `blur(${textBlur}px)`,
          textAlign: 'center',
          direction: 'rtl',
        }}
      >
        <h1
          style={{
            fontFamily: HEEBO,
            fontSize: 100,
            fontWeight: 900,
            color: V5.white,
            margin: 0,
            letterSpacing: -2,
          }}
        >
          המשחק השתנה.
        </h1>
      </div>

      <div
        style={{
          position: 'absolute',
          top: '56%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${logoSpring})`,
        }}
      >
        <Img
          src={staticFile('icons/misrad-icon.svg')}
          style={{
            width: 110,
            height: 110,
            filter: `drop-shadow(0 0 ${logoGlow}px ${V5.primary})`,  
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          top: '72%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${versionSpring})`,
          filter: `blur(${versionBlur}px)`,
          textAlign: 'center',
          direction: 'rtl',
        }}
      >
        <h2
          style={{
            fontFamily: HEEBO,
            fontSize: 52,
            fontWeight: 700,
            background: `linear-gradient(135deg, ${V5.primary} 0%, ${V5.indigo} 100%)`,  
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
          }}
        >
          AI שמנהל במקומך
        </h2>
      </div>

      {Array.from({ length: 14 }).map((_, i) => {
        const angle = (i / 14) * Math.PI * 2 + particlePhase;
        const radius = 280 + Math.sin(frame * 0.02 + i * 0.7) * 90;
        const x = 960 + Math.cos(angle) * radius;
        const y = 540 + Math.sin(angle) * radius * 0.55;
        const size = 2.5 + Math.sin(frame * 0.05 + i) * 1.5;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: '50%',
              backgroundColor: i % 2 === 0 ? V5.primary : V5.indigo,
              opacity:
                interpolate(frame, [10, 35], [0, 0.7], {
                  extrapolateRight: 'clamp',
                }) *
                (0.3 + Math.sin(frame * 0.03 + i * 1.1) * 0.35),
              boxShadow: `0 0 10px ${V5.primaryAlpha}`,  
            }}
          />
        );
      })}

      <ClayVideoSlot
        src="clay/hand-switch.webm"
        startFrame={15}
        durationFrames={110}
        maxOpacity={0.12}
        scale={0.7}
        position={{ top: '80%', left: '78%' }}
      />
    </AbsoluteFill>
  );
};
