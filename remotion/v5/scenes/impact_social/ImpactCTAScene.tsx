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
import { S, SM, HEEBO_S, RUBIK_S } from '../../config_impact_social';

export const ImpactCTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneIn = interpolate(frame, [0, 40], [0, 1], { extrapolateRight: 'clamp' });

  // ── Explosion: shards fly out from center at frame 0 ──
  const SHARD_COUNT = 16;
  const explosionProgress = interpolate(frame, [0, 50], [0, 1], {
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const explosionFade = interpolate(frame, [30, 70], [1, 0], { extrapolateRight: 'clamp' });

  // ── Logo reassembles from shards ──
  const logoSpring = spring({ frame: frame - 55, fps, config: SM.cinematic });
  const logoScale  = interpolate(logoSpring, [0, 1], [0.0, 1.0]);
  const logoOpacity = interpolate(frame, [55, 85], [0, 1], { extrapolateRight: 'clamp' });
  const logoGlow   = 35 + Math.abs(Math.sin(frame * 0.018)) * 25;
  const logoBreathe = 1 + Math.sin(frame * 0.015) * 0.02;

  // ── Tagline — word by word ──
  const words = ['תנהל', 'פחות.', 'תשלוט', 'יותר.'];
  const wordSprings = words.map((_, i) =>
    spring({ frame: frame - (70 + i * 12), fps, config: SM.snappy })
  );

  // ── URL badge ──
  const urlSpring  = spring({ frame: frame - 115, fps, config: SM.elastic });
  const urlScale   = interpolate(urlSpring, [0, 1], [0.4, 1.0]);
  const urlOpacity = interpolate(frame, [115, 140], [0, 1], { extrapolateRight: 'clamp' });

  // ── CTA button ──
  const ctaOpacity = interpolate(frame, [135, 155], [0, 1], { extrapolateRight: 'clamp' });
  const ctaY       = interpolate(frame, [135, 155], [24, 0], { extrapolateRight: 'clamp' });
  const ctaGlow    = 20 + Math.abs(Math.sin(frame * 0.018)) * 15;

  // ── Fade to black ──
  const fadeOut = interpolate(frame, [170, 180], [0, 1], { extrapolateRight: 'clamp' });

  // ── Orbiting ring ──
  const ringRot = frame * 0.25;
  const ringOpacity = interpolate(frame, [60, 90], [0, 0.35], { extrapolateRight: 'clamp' });

  // ── Background grid pulse ──
  const gridOpacity = interpolate(frame, [0, 40], [0, 0.05], { extrapolateRight: 'clamp' });

  const CX = 540;
  const CY = 600;

  return (
    <AbsoluteFill style={{ backgroundColor: S.bg, opacity: sceneIn, overflow: 'hidden' }}>

      {/* Grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(${S.indigo}15 1px, transparent 1px),
          linear-gradient(90deg, ${S.indigo}15 1px, transparent 1px)
        `,
        backgroundSize: '54px 54px',
        opacity: gridOpacity,
      }} />

      {/* Deep ambient */}
      <div style={{
        position: 'absolute',
        top: CY, left: CX,
        width: 800, height: 800,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${S.primary}25 0%, ${S.indigo}15 45%, transparent 70%)`,
        transform: `translate(-50%, -50%) scale(${logoBreathe})`,
        filter: 'blur(70px)',
      }} />

      {/* ── Explosion shards ── */}
      {Array.from({ length: SHARD_COUNT }, (_, i) => {
        const angle = (i / SHARD_COUNT) * Math.PI * 2;
        const dist  = 180 + (i % 3) * 60;
        const x = CX + Math.cos(angle) * dist * explosionProgress;
        const y = CY + Math.sin(angle) * dist * explosionProgress;
        const rot = angle * (180 / Math.PI) + explosionProgress * 180;
        const w = 8 + (i % 4) * 6;
        const h = 3 + (i % 3) * 2;
        const color = i % 2 === 0 ? S.primary : S.indigo;

        return (
          <div key={`shard-${i}`} style={{
            position: 'absolute',
            left: x, top: y,
            width: w, height: h,
            background: color,
            borderRadius: 2,
            transform: `translate(-50%, -50%) rotate(${rot}deg)`,
            opacity: explosionFade * (0.5 + (i % 3) * 0.2),
            boxShadow: `0 0 8px ${color}`,
          }} />
        );
      })}

      {/* Orbiting dashed ring */}
      <div style={{
        position: 'absolute',
        top: CY, left: CX,
        width: 260, height: 260,
        borderRadius: '50%',
        border: `2px dashed ${S.primary}`,
        transform: `translate(-50%, -50%) rotate(${ringRot}deg)`,
        opacity: ringOpacity,
      }} />
      <div style={{
        position: 'absolute',
        top: CY, left: CX,
        width: 340, height: 340,
        borderRadius: '50%',
        border: `1px solid ${S.indigo}50`,
        transform: `translate(-50%, -50%) rotate(${-ringRot * 0.6}deg)`,
        opacity: ringOpacity * 0.6,
      }} />

      {/* ── Logo ── */}
      <div style={{
        position: 'absolute',
        top: CY, left: CX,
        transform: `translate(-50%, -50%) scale(${logoScale * logoBreathe})`,
        opacity: logoOpacity,
      }}>
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          width: 300, height: 300,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${S.primary}30 0%, transparent 70%)`,
          transform: 'translate(-50%, -50%)',
          filter: 'blur(30px)',
        }} />
        <Img
          src={staticFile('icons/misrad-icon.svg')}
          style={{
            width: 160, height: 160,
            filter: `drop-shadow(0 0 ${logoGlow}px ${S.primary}) drop-shadow(0 0 ${logoGlow * 0.5}px ${S.indigo})`,
            position: 'relative', zIndex: 1,
          }}
        />
      </div>

      {/* ── Tagline words ── */}
      <div style={{
        position: 'absolute',
        top: CY + 160,
        left: 120, right: 120,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0,
        direction: 'rtl',
      }}>
        {/* Row 1: תנהל פחות */}
        <div style={{ display: 'flex', gap: 18, alignItems: 'baseline' }}>
          {[0, 1].map((i) => {
            const sp = wordSprings[i];
            const isHighlight = words[i] === 'פחות.';
            return (
              <span key={i} style={{
                fontFamily: HEEBO_S,
                fontSize: 88,
                fontWeight: 900,
                letterSpacing: -3,
                transform: `translateY(${interpolate(sp, [0, 1], [40, 0])}px)`,
                opacity: sp,
                display: 'inline-block',
                background: isHighlight ? S.nexus : undefined,
                WebkitBackgroundClip: isHighlight ? 'text' : undefined,
                WebkitTextFillColor: isHighlight ? 'transparent' : S.white,
                color: isHighlight ? undefined : S.white,
              }}>
                {words[i]}
              </span>
            );
          })}
        </div>
        {/* Row 2: תשלוט יותר */}
        <div style={{ display: 'flex', gap: 18, alignItems: 'baseline', marginTop: -10 }}>
          {[2, 3].map((i) => {
            const sp = wordSprings[i];
            const isHighlight = words[i] === 'יותר.';
            return (
              <span key={i} style={{
                fontFamily: HEEBO_S,
                fontSize: 88,
                fontWeight: 900,
                letterSpacing: -3,
                transform: `translateY(${interpolate(sp, [0, 1], [40, 0])}px)`,
                opacity: sp,
                display: 'inline-block',
                background: isHighlight ? S.nexus : undefined,
                WebkitBackgroundClip: isHighlight ? 'text' : undefined,
                WebkitTextFillColor: isHighlight ? 'transparent' : S.white,
                color: isHighlight ? undefined : S.white,
              }}>
                {words[i]}
              </span>
            );
          })}
        </div>
      </div>

      {/* ── URL badge ── */}
      <div style={{
        position: 'absolute',
        top: CY + 480,
        left: '50%',
        transform: `translateX(-50%) scale(${urlScale})`,
        opacity: urlOpacity,
      }}>
        <div style={{
          padding: '16px 64px',
          background: S.nexus,
          borderRadius: 20,
          boxShadow: `0 0 ${ctaGlow}px ${S.primaryAlpha}, 0 16px 48px ${S.primaryAlpha}`,
          border: '2px solid rgba(255,255,255,0.18)',
        }}>
          <p style={{
            fontFamily: RUBIK_S,
            fontSize: 50,
            fontWeight: 800,
            color: S.white,
            margin: 0,
            letterSpacing: 1,
            textAlign: 'center',
            whiteSpace: 'nowrap',
          }}>
            misrad-ai.com
          </p>
        </div>
      </div>

      {/* ── CTA line ── */}
      <div style={{
        position: 'absolute',
        top: CY + 600,
        left: 120, right: 120,
        textAlign: 'center',
        direction: 'rtl',
        opacity: ctaOpacity,
        transform: `translateY(${ctaY}px)`,
      }}>
        <p style={{
          fontFamily: HEEBO_S,
          fontSize: 34,
          fontWeight: 700,
          background: S.nexus,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: 0,
        }}>
          הצטרף עכשיו — 7 ימים חינם
        </p>
      </div>

      {/* Fade to black */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundColor: '#000',
        opacity: fadeOut,
        pointerEvents: 'none',
        zIndex: 100,
      }} />

    </AbsoluteFill>
  );
};
