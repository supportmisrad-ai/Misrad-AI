import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { S, SM, RUBIK_S, HEEBO_S } from '../../config_impact_social';

// 120 frames = 4 seconds @ 30fps
// Kinetic typography: מנתח | חוזה | פועל | במקומך

const WORDS = [
  { text: 'מנתח.',    startFrame: 8,  fontSize: 118, glowColor: '#6366F1', isGradient: false },
  { text: 'חוזה.',    startFrame: 35, fontSize: 118, glowColor: '#A21D3C', isGradient: false },
  { text: 'פועל.',    startFrame: 62, fontSize: 118, glowColor: '#10B981', isGradient: false },
  { text: 'במקומך.', startFrame: 89, fontSize: 130, glowColor: '#A21D3C', isGradient: true  },
] as const;

export const NarrationRevealScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background orb — pulses gently
  const orbPulse = 0.04 + Math.abs(Math.sin(frame * 0.05)) * 0.04;

  // Fade to black at the end
  const fadeOut = interpolate(frame, [108, 120], [0, 1], { extrapolateRight: 'clamp' });

  // Accent line progress
  const lineWidth = interpolate(frame, [0, 115], [0, 760], { extrapolateRight: 'clamp' });
  const lineOpacity = interpolate(frame, [0, 10, 108, 120], [0, 0.55, 0.55, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: S.bg, direction: 'rtl', overflow: 'hidden' }}>

      {/* Background radial glow */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 900, height: 900,
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(55,48,163,${orbPulse + 0.02}) 0%, rgba(162,29,60,${orbPulse}) 40%, transparent 70%)`,
        filter: 'blur(90px)',
        pointerEvents: 'none',
      }} />

      {/* Subtle grid pattern */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
        pointerEvents: 'none',
      }} />

      {/* Words Container */}
      <div style={{
        position: 'absolute',
        top: '50%', left: 0, right: 0,
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}>
        {WORDS.map((word, i) => {
          // Animation Logic
          const s = spring({ 
            frame: frame - word.startFrame, 
            fps, 
            config: { damping: 12, stiffness: 100, mass: 0.8 } // Softer spring than SM.bounce
          });
          
          const opacity = interpolate(frame, [word.startFrame, word.startFrame + 15], [0, 1], { extrapolateRight: 'clamp' });
          // More subtle scale: 1.15 -> 1.0 (instead of 1.45)
          const scale   = interpolate(s, [0, 1], [1.15, 1.0]); 
          const y       = interpolate(s, [0, 1], [30, 0]); // Slide up slightly

          // Glow intensity
          const glowSize = interpolate(
            frame,
            [word.startFrame, word.startFrame + 10, word.startFrame + 40],
            [0, 20, 5],
            { extrapolateRight: 'clamp' }
          );

          return (
            <div key={i} style={{
              opacity,
              transform: `scale(${scale}) translateY(${y}px)`,
              textAlign: 'center',
              position: 'relative', // Keeps everything contained
            }}>
              <p style={{
                fontFamily: RUBIK_S,
                fontSize: word.fontSize,
                fontWeight: 800,
                margin: 0,
                lineHeight: 1.1,
                letterSpacing: -1,
                // Apply gradient or color
                background: word.isGradient ? S.nexus : undefined,
                WebkitBackgroundClip: word.isGradient ? 'text' : undefined,
                WebkitTextFillColor: word.isGradient ? 'transparent' : undefined,
                color: word.isGradient ? undefined : S.white,
                // Smooth glow
                filter: `drop-shadow(0 0 ${glowSize}px ${word.glowColor})`,
              }}>
                {word.text}
              </p>
            </div>
          );
        })}
      </div>

      {/* Bottom accent line */}
      <div style={{
        position: 'absolute',
        bottom: 220,
        left: '50%',
        transform: 'translateX(-50%)',
        width: lineWidth,
        height: 3,
        background: S.nexus,
        borderRadius: 3,
        opacity: lineOpacity,
      }} />

      {/* Brand mark */}
      <div style={{
        position: 'absolute',
        bottom: 160,
        left: 0, right: 0,
        textAlign: 'center',
        opacity: interpolate(frame, [95, 110], [0, 0.55], { extrapolateRight: 'clamp' }),
      }}>
        <p style={{
          fontFamily: HEEBO_S,
          fontSize: 26,
          fontWeight: 600,
          color: S.mutedLight,
          margin: 0,
          letterSpacing: 4,
          textTransform: 'uppercase',
        }}>
          MISRAD AI
        </p>
      </div>

      {/* Fade to black overlay */}
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