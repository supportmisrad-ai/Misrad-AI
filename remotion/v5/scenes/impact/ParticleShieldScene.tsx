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
import { IMPACT, IMPACT_MOTION, HEEBO_IMPACT } from '../../config_impact';

export const ParticleShieldScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Pull-back: starts zoomed in (scale 3), pulls to 1
  const pullBack = interpolate(frame, [0, 150], [3.2, 1.0], {
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  // Overall scene fade in
  const sceneOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Blur clears as we pull back
  const sceneBlur = interpolate(frame, [0, 90], [14, 0], {
    extrapolateRight: 'clamp',
  });

  // Logo spring reveal — starts at frame 60
  const logoSpring = spring({
    frame: frame - 60,
    fps,
    config: IMPACT_MOTION.cinematic,
  });
  const logoOpacity = interpolate(frame, [60, 120], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const logoGlow = 20 + Math.abs(Math.sin(frame * 0.05)) * 30;

  // Ambient radial pulse
  const ambientScale = 1 + Math.sin(frame * 0.04) * 0.06;
  const ambientOpacity = interpolate(frame, [0, 60], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Particles — 28 particles orbiting and converging toward center
  const particlePhase = frame * 0.018;
  const convergence = interpolate(frame, [0, 150], [1.0, 0.0], {
    extrapolateRight: 'clamp',
  });

  // Scan line sweeping across
  const scanX = interpolate(frame, [10, 130], [-100, 110], {
    extrapolateRight: 'clamp',
  });
  const scanOpacity = interpolate(frame, [10, 30, 110, 130], [0, 0.6, 0.6, 0], {
    extrapolateRight: 'clamp',
  });

  // Shield fragment lines — 6 lines converging to form shield outline
  const fragmentProgress = interpolate(frame, [30, 120], [0, 1], {
    extrapolateRight: 'clamp',
    easing: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: IMPACT.bgDeep,
        opacity: sceneOpacity,
        overflow: 'hidden',
      }}
    >
      {/* Deep ambient glow — crimson + indigo */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 1200,
          height: 1200,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${IMPACT.primary}22 0%, ${IMPACT.indigo}14 45%, transparent 70%)`,
          transform: `translate(-50%, -50%) scale(${ambientScale})`,
          opacity: ambientOpacity,
          filter: 'blur(40px)',
        }}
      />

      {/* Secondary indigo orb — offset */}
      <div
        style={{
          position: 'absolute',
          top: '35%',
          left: '60%',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${IMPACT.indigo}18 0%, transparent 65%)`,
          transform: `translate(-50%, -50%) scale(${ambientScale * 0.9})`,
          opacity: ambientOpacity * 0.7,
          filter: 'blur(60px)',
        }}
      />

      {/* Scan line — horizontal sweep */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: `${scanX}%`,
          width: '8%',
          height: '100%',
          background: `linear-gradient(90deg, transparent 0%, ${IMPACT.primary}30 50%, transparent 100%)`,
          opacity: scanOpacity,
          pointerEvents: 'none',
        }}
      />

      {/* Shield fragment lines — converging outline */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i / 6) * Math.PI * 2;
        const startRadius = 350 + i * 30;
        const endRadius = 160;
        const radius = startRadius + (endRadius - startRadius) * fragmentProgress;
        const x = 960 + Math.cos(angle) * radius;
        const y = 540 + Math.sin(angle) * radius * 0.85;
        const lineLen = 40 + fragmentProgress * 60;
        const lineOpacity = interpolate(frame, [20, 50], [0, 0.5], {
          extrapolateRight: 'clamp',
        });
        return (
          <div
            key={`frag-${i}`}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: lineLen,
              height: 2,
              background: i % 2 === 0
                ? `linear-gradient(90deg, ${IMPACT.primary}, transparent)`
                : `linear-gradient(90deg, ${IMPACT.indigo}, transparent)`,
              transform: `rotate(${angle * (180 / Math.PI)}deg)`,
              transformOrigin: '0 50%',
              opacity: lineOpacity,
              borderRadius: 2,
            }}
          />
        );
      })}

      {/* Particles — 28 orbiting particles */}
      {Array.from({ length: 28 }).map((_, i) => {
        const baseAngle = (i / 28) * Math.PI * 2 + particlePhase;
        const baseRadius = 320 + Math.sin(frame * 0.02 + i * 0.9) * 80;
        const convergedRadius = baseRadius * (0.3 + convergence * 0.7);
        const x = 960 + Math.cos(baseAngle) * convergedRadius;
        const y = 540 + Math.sin(baseAngle) * convergedRadius * 0.7;
        const size = 2 + Math.sin(frame * 0.06 + i * 1.3) * 1.5;
        const particleOpacity =
          interpolate(frame, [5, 30], [0, 1], { extrapolateRight: 'clamp' }) *
          (0.25 + Math.abs(Math.sin(frame * 0.04 + i * 0.8)) * 0.45);
        const isRed = i % 3 === 0;
        const isIndigo = i % 3 === 1;
        const color = isRed ? IMPACT.primary : isIndigo ? IMPACT.indigoLight : IMPACT.white;

        return (
          <div
            key={`p-${i}`}
            style={{
              position: 'absolute',
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: '50%',
              backgroundColor: color,
              opacity: particleOpacity,
              boxShadow: isRed ? `0 0 8px ${IMPACT.primary}` : 'none',
              filter: size > 3 ? 'blur(0.5px)' : 'none',
            }}
          />
        );
      })}

      {/* Main logo — shield — pulls back and reveals */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${pullBack * logoSpring})`,
          opacity: logoOpacity,
          filter: `blur(${sceneBlur}px)`,
        }}
      >
        {/* Glow ring behind logo */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${IMPACT.primary}35 0%, transparent 70%)`,
            transform: 'translate(-50%, -50%)',
            filter: `blur(20px)`,
          }}
        />
        <Img
          src={staticFile('icons/misrad-icon.svg')}
          style={{
            width: 160,
            height: 160,
            filter: `drop-shadow(0 0 ${logoGlow}px ${IMPACT.primary}) drop-shadow(0 0 ${logoGlow * 0.5}px ${IMPACT.indigo})`,
            position: 'relative',
            zIndex: 1,
          }}
        />
      </div>

      {/* Shield fragment ring — thin circle that forms around logo */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 240,
          height: 240,
          borderRadius: '50%',
          border: `1.5px solid ${IMPACT.primary}`,
          transform: `translate(-50%, -50%) scale(${1 + (1 - fragmentProgress) * 0.8})`,
          opacity: fragmentProgress * 0.4,
          boxShadow: `0 0 20px ${IMPACT.primaryAlpha}`,
        }}
      />

      {/* Outer ring */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 340,
          height: 340,
          borderRadius: '50%',
          border: `1px solid ${IMPACT.indigo}30`,
          transform: `translate(-50%, -50%) rotate(${frame * 0.3}deg)`,
          opacity: interpolate(frame, [40, 80], [0, 0.3], { extrapolateRight: 'clamp' }),
        }}
      />

      {/* MISRAD AI text — fades in last */}
      <div
        style={{
          position: 'absolute',
          top: '65%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: interpolate(frame, [100, 140], [0, 1], { extrapolateRight: 'clamp' }),
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontFamily: HEEBO_IMPACT,
            fontSize: 22,
            fontWeight: 600,
            color: IMPACT.muted,
            margin: 0,
            letterSpacing: 6,
            textTransform: 'uppercase',
          }}
        >
          MISRAD AI
        </p>
      </div>
    </AbsoluteFill>
  );
};
