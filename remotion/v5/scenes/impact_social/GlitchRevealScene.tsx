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

export const GlitchRevealScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Glitch slices: 8 horizontal strips that offset randomly then snap ──
  const glitchActive = frame < 60;
  const glitchIntensity = interpolate(frame, [0, 40, 55, 60], [0, 1, 0.3, 0], {
    extrapolateRight: 'clamp',
  });

  const sliceOffsets = Array.from({ length: 8 }, (_, i) => {
    const seed = (i * 137 + Math.floor(frame / 2) * 7) % 100;
    return glitchActive ? (seed - 50) * glitchIntensity * 0.5 : 0;
  });

  // ── Logo assembly spring ──
  const logoSpring = spring({ frame: frame - 45, fps, config: SM.cinematic });
  const logoScale  = interpolate(logoSpring, [0, 1], [2.4, 1.0]);
  const logoOpacity = interpolate(frame, [30, 65], [0, 1], { extrapolateRight: 'clamp' });
  const logoGlow   = 25 + Math.abs(Math.sin(frame * 0.018)) * 30;

  // ── Chromatic aberration on logo (RGB split) ──
  const aberration = glitchIntensity * 8;

  // ── Tagline reveal ──
  const tagSpring  = spring({ frame: frame - 75, fps, config: SM.snappy });
  const tagOpacity = interpolate(frame, [75, 100], [0, 1], { extrapolateRight: 'clamp' });
  const tagY       = interpolate(tagSpring, [0, 1], [40, 0]);

  // ── Background grid ──
  const gridOpacity = interpolate(frame, [0, 40], [0, 0.06], { extrapolateRight: 'clamp' });

  // ── Pulse ring ──
  const ring1Scale = interpolate(frame, [50, 150], [0.6, 2.2], { extrapolateRight: 'clamp' });
  const ring1Opacity = interpolate(frame, [50, 80, 150], [0.5, 0.3, 0], { extrapolateRight: 'clamp' });
  const ring2Scale = interpolate(frame, [70, 150], [0.6, 2.0], { extrapolateRight: 'clamp' });
  const ring2Opacity = interpolate(frame, [70, 95, 150], [0.4, 0.2, 0], { extrapolateRight: 'clamp' });

  // ── Ambient orb ──
  const orbPulse = 1 + Math.sin(frame * 0.015) * 0.04;

  const sceneIn = interpolate(frame, [0, 40], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: S.bg, overflow: 'hidden', opacity: sceneIn }}>

      {/* Grid background */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(${S.primary}15 1px, transparent 1px),
          linear-gradient(90deg, ${S.primary}15 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        opacity: gridOpacity,
      }} />

      {/* Deep ambient orb */}
      <div style={{
        position: 'absolute',
        top: '38%', left: '50%',
        width: 700, height: 700,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${S.primary}28 0%, ${S.indigo}18 45%, transparent 70%)`,
        transform: `translate(-50%, -50%) scale(${orbPulse})`,
        filter: 'blur(60px)',
      }} />

      {/* Glitch slices — 8 strips of the logo area */}
      {glitchActive && Array.from({ length: 8 }, (_, i) => (
        <div
          key={`slice-${i}`}
          style={{
            position: 'absolute',
            left: 0, right: 0,
            top: `${28 + i * 5.5}%`,
            height: '5.5%',
            overflow: 'hidden',
            transform: `translateX(${sliceOffsets[i]}px)`,
            mixBlendMode: 'screen',
            opacity: 0.35,
          }}
        />
      ))}

      {/* Pulse rings */}
      <div style={{
        position: 'absolute',
        top: '38%', left: '50%',
        width: 200, height: 200,
        borderRadius: '50%',
        border: `2px solid ${S.primary}`,
        transform: `translate(-50%, -50%) scale(${ring1Scale})`,
        opacity: ring1Opacity,
      }} />
      <div style={{
        position: 'absolute',
        top: '38%', left: '50%',
        width: 200, height: 200,
        borderRadius: '50%',
        border: `1px solid ${S.indigo}`,
        transform: `translate(-50%, -50%) scale(${ring2Scale})`,
        opacity: ring2Opacity,
      }} />

      {/* Chromatic aberration layers */}
      {aberration > 0.5 && (
        <>
          <div style={{
            position: 'absolute',
            top: '38%', left: '50%',
            transform: `translate(calc(-50% + ${aberration}px), -50%) scale(${logoScale})`,
            opacity: logoOpacity * 0.4,
            mixBlendMode: 'screen',
          }}>
            <Img src={staticFile('icons/misrad-icon.svg')}
              style={{ width: 140, height: 140, filter: 'hue-rotate(200deg) saturate(3)' }} />
          </div>
          <div style={{
            position: 'absolute',
            top: '38%', left: '50%',
            transform: `translate(calc(-50% - ${aberration}px), -50%) scale(${logoScale})`,
            opacity: logoOpacity * 0.4,
            mixBlendMode: 'screen',
          }}>
            <Img src={staticFile('icons/misrad-icon.svg')}
              style={{ width: 140, height: 140, filter: 'hue-rotate(0deg) saturate(3)' }} />
          </div>
        </>
      )}

      {/* Main logo */}
      <div style={{
        position: 'absolute',
        top: '38%', left: '50%',
        transform: `translate(-50%, -50%) scale(${logoScale})`,
        opacity: logoOpacity,
      }}>
        <Img
          src={staticFile('icons/misrad-icon.svg')}
          style={{
            width: 140, height: 140,
            filter: `drop-shadow(0 0 ${logoGlow}px ${S.primary}) drop-shadow(0 0 ${logoGlow * 0.6}px ${S.indigo})`,
          }}
        />
      </div>

      {/* MISRAD AI wordmark */}
      <div style={{
        position: 'absolute',
        top: '54%', left: '50%',
        transform: `translate(-50%, -50%) translateY(${tagY}px)`,
        opacity: tagOpacity,
        textAlign: 'center',
        whiteSpace: 'nowrap',
      }}>
        <p style={{
          fontFamily: RUBIK_S,
          fontSize: 72,
          fontWeight: 800,
          background: S.nexus,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: 0,
          letterSpacing: 2,
        }}>
          MISRAD AI
        </p>
      </div>

      {/* Bottom accent line */}
      <div style={{
        position: 'absolute',
        bottom: 200,
        left: '50%',
        transform: 'translateX(-50%)',
        width: interpolate(frame, [110, 148], [0, 400], { extrapolateRight: 'clamp' }),
        height: 2,
        background: S.nexus,
        borderRadius: 2,
        opacity: interpolate(frame, [110, 130], [0, 0.6], { extrapolateRight: 'clamp' }),
      }} />

    </AbsoluteFill>
  );
};
