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
import { IMPACT, IMPACT_MOTION, HEEBO_IMPACT, RUBIK_IMPACT } from '../../config_impact';

export const ShieldCTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene fade in
  const sceneIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  // Logo spring — bounces in
  const logoSpring = spring({ frame: frame - 8, fps, config: IMPACT_MOTION.bounce });
  const logoScale = interpolate(logoSpring, [0, 1], [0.2, 1.0]);

  // Logo glow pulse
  const glowPulse = 30 + Math.abs(Math.sin(frame * 0.07)) * 35;
  const glowPulse2 = 15 + Math.abs(Math.sin(frame * 0.05 + 1)) * 20;

  // Breathing scale on logo
  const breathe = 1 + Math.sin(frame * 0.06) * 0.025;

  // Tagline — word by word stagger
  const word1Spring = spring({ frame: frame - 40, fps, config: IMPACT_MOTION.snappy });
  const word2Spring = spring({ frame: frame - 52, fps, config: IMPACT_MOTION.snappy });
  const word3Spring = spring({ frame: frame - 64, fps, config: IMPACT_MOTION.snappy });
  const word4Spring = spring({ frame: frame - 76, fps, config: IMPACT_MOTION.snappy });

  // URL badge
  const urlSpring = spring({ frame: frame - 55, fps, config: IMPACT_MOTION.elastic });
  const urlScale = interpolate(urlSpring, [0, 1], [0.5, 1.0]);
  const urlBlur = interpolate(frame, [55, 80], [8, 0], { extrapolateRight: 'clamp' });

  // CTA button
  const ctaOpacity = interpolate(frame, [80, 105], [0, 1], { extrapolateRight: 'clamp' });
  const ctaY = interpolate(frame, [80, 105], [20, 0], { extrapolateRight: 'clamp' });

  // Fine print
  const finePrintOpacity = interpolate(frame, [105, 130], [0, 1], { extrapolateRight: 'clamp' });

  // Fade to black at end
  const fadeOut = interpolate(frame, [130, 150], [0, 1], { extrapolateRight: 'clamp' });

  // Orbiting particles
  const particlePhase = frame * 0.02;
  const ambientPulse = 1 + Math.sin(frame * 0.05) * 0.06;

  const NEXUS_GRADIENT = `linear-gradient(135deg, ${IMPACT.primary} 0%, ${IMPACT.indigo} 100%)`;

  const taglineWords = ['תנהל', 'פחות.', 'תשלוט', 'יותר.'];
  const wordSprings = [word1Spring, word2Spring, word3Spring, word4Spring];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: IMPACT.bgDeep,
        opacity: sceneIn,
        overflow: 'hidden',
      }}
    >
      {/* Deep ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: '38%',
          left: '50%',
          width: 900,
          height: 900,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${IMPACT.primary}20 0%, ${IMPACT.indigo}12 50%, transparent 70%)`,
          transform: `translate(-50%, -50%) scale(${ambientPulse})`,
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }}
      />

      {/* Orbiting particles */}
      {Array.from({ length: 20 }).map((_, i) => {
        const angle = (i / 20) * Math.PI * 2 + particlePhase;
        const radius = 220 + Math.sin(frame * 0.025 + i * 0.9) * 60;
        const x = 960 + Math.cos(angle) * radius;
        const y = 360 + Math.sin(angle) * radius * 0.55;
        const size = 3 + Math.sin(frame * 0.06 + i) * 1.5;
        const opacity = 0.15 + Math.abs(Math.sin(frame * 0.04 + i * 1.1)) * 0.25;
        const color = i % 3 === 0 ? IMPACT.primary : i % 3 === 1 ? IMPACT.indigoLight : IMPACT.white;

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
              opacity,
              filter: i % 3 === 0 ? `blur(0.5px)` : 'none',
            }}
          />
        );
      })}

      {/* Outer ring */}
      <div
        style={{
          position: 'absolute',
          top: '37%',
          left: '50%',
          width: 360,
          height: 360,
          borderRadius: '50%',
          border: `1px solid ${IMPACT.primary}25`,
          transform: `translate(-50%, -50%) rotate(${frame * 0.25}deg)`,
          opacity: interpolate(frame, [20, 50], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '37%',
          left: '50%',
          width: 460,
          height: 460,
          borderRadius: '50%',
          border: `1px solid ${IMPACT.indigo}18`,
          transform: `translate(-50%, -50%) rotate(${-frame * 0.15}deg)`,
          opacity: interpolate(frame, [30, 60], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      />

      {/* Shield logo */}
      <div
        style={{
          position: 'absolute',
          top: '37%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${logoScale * breathe})`,
        }}
      >
        {/* Glow layers */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 280,
            height: 280,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${IMPACT.primary}30 0%, transparent 70%)`,
            transform: 'translate(-50%, -50%)',
            filter: `blur(25px)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${IMPACT.indigo}25 0%, transparent 70%)`,
            transform: 'translate(-50%, -50%)',
            filter: `blur(15px)`,
          }}
        />
        <Img
          src={staticFile('icons/misrad-icon.svg')}
          style={{
            width: 150,
            height: 150,
            filter: `drop-shadow(0 0 ${glowPulse}px ${IMPACT.primary}) drop-shadow(0 0 ${glowPulse2}px ${IMPACT.indigo})`,
            position: 'relative',
            zIndex: 1,
          }}
        />
      </div>

      {/* Tagline — word by word */}
      <div
        style={{
          position: 'absolute',
          top: '58%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          gap: 20,
          direction: 'rtl',
          alignItems: 'baseline',
        }}
      >
        {taglineWords.map((word, i) => {
          const wordSpring = wordSprings[i];
          const isHighlight = word === 'יותר.' || word === 'פחות.';
          return (
            <span
              key={word}
              style={{
                fontFamily: HEEBO_IMPACT,
                fontSize: 80,
                fontWeight: 900,
                letterSpacing: -2,
                transform: `translateY(${interpolate(wordSpring, [0, 1], [30, 0])}px)`,
                opacity: wordSpring,
                display: 'inline-block',
                background: isHighlight ? NEXUS_GRADIENT : undefined,
                WebkitBackgroundClip: isHighlight ? 'text' : undefined,
                WebkitTextFillColor: isHighlight ? 'transparent' : IMPACT.white,
                color: isHighlight ? undefined : IMPACT.white,
                textShadow: isHighlight ? undefined : `0 0 40px rgba(255,255,255,0.1)`,
              }}
            >
              {word}
            </span>
          );
        })}
      </div>

      {/* URL badge */}
      <div
        style={{
          position: 'absolute',
          top: '72%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${urlScale})`,
          filter: `blur(${urlBlur}px)`,
        }}
      >
        <div
          style={{
            padding: '18px 64px',
            background: NEXUS_GRADIENT,
            borderRadius: 16,
            boxShadow: `0 16px 48px ${IMPACT.primaryAlpha}, 0 0 ${40 + glowPulse * 0.5}px ${IMPACT.indigoAlpha}`,
            border: `2px solid rgba(255,255,255,0.18)`,
            transform: `scale(${breathe})`,
          }}
        >
          <p
            style={{
              fontFamily: RUBIK_IMPACT,
              fontSize: 44,
              fontWeight: 800,
              color: IMPACT.white,
              margin: 0,
              letterSpacing: 1,
            }}
          >
            misrad.ai
          </p>
        </div>
      </div>

      {/* CTA line */}
      <div
        style={{
          position: 'absolute',
          top: '84%',
          left: '50%',
          transform: `translate(-50%, -50%) translateY(${ctaY}px)`,
          opacity: ctaOpacity,
          textAlign: 'center',
          direction: 'rtl',
        }}
      >
        <p
          style={{
            fontFamily: HEEBO_IMPACT,
            fontSize: 32,
            fontWeight: 700,
            background: NEXUS_GRADIENT,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
            marginBottom: 10,
          }}
        >
          הצטרף עכשיו — 14 יום חינם
        </p>
      </div>

      {/* Fine print */}
      <div
        style={{
          position: 'absolute',
          top: '91%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: finePrintOpacity,
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontFamily: HEEBO_IMPACT,
            fontSize: 18,
            fontWeight: 500,
            color: IMPACT.muted,
            margin: 0,
          }}
        >
          ללא כרטיס אשראי · התקנה מיידית · תמיכה בעברית
        </p>
      </div>

      {/* Fade to black */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: '#000',
          opacity: fadeOut,
          pointerEvents: 'none',
          zIndex: 100,
        }}
      />
    </AbsoluteFill>
  );
};
