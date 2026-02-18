import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { S, SM, HEEBO_S, PAIN_CARDS } from '../../config_impact_social';

const CARD_ENTER_START = 20;
const CARD_STAGGER     = 28;
const CARD_H           = 130;
const CARD_GAP         = 14;
const STACK_TOP        = 300;

export const PainStackScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Weight: the stack "sinks" as cards pile up
  const stackSink = interpolate(
    frame,
    [0, PAIN_CARDS.length * CARD_STAGGER + 40],
    [0, 80],
    { extrapolateRight: 'clamp', easing: (t) => t * t }
  );

  // Shake at the end — too heavy
  const shakeStart = PAIN_CARDS.length * CARD_STAGGER + 30;
  const shakeX = frame > shakeStart
    ? Math.sin((frame - shakeStart) * 0.45) *
      interpolate(frame, [shakeStart, shakeStart + 30], [0, 10], { extrapolateRight: 'clamp' }) *
      interpolate(frame, [shakeStart + 30, shakeStart + 60], [1, 0], { extrapolateRight: 'clamp' })
    : 0;

  // "כך נראה הבוס הממוצע" label — removed per design

  // Red warning flash at end — softened to avoid harsh flicker
  const warningFlash = interpolate(
    frame,
    [shakeStart, shakeStart + 30, shakeStart + 60],
    [0, 0.06, 0],
    { extrapolateRight: 'clamp' }
  );

  // Bottom verdict text — appears right as shake starts, fully visible quickly
  const verdictOpacity = interpolate(
    frame,
    [shakeStart, shakeStart + 18],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  const verdictY = interpolate(
    frame,
    [shakeStart, shakeStart + 18],
    [24, 0],
    { extrapolateRight: 'clamp' }
  );

  // Scene fade in — slow enough to avoid contrast flash
  const sceneIn = interpolate(frame, [0, 40], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: S.bg, opacity: sceneIn, overflow: 'hidden' }}>

      {/* Red warning flash overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at center, ${S.primary}60 0%, transparent 70%)`,
        opacity: warningFlash,
        pointerEvents: 'none',
        zIndex: 50,
      }} />

      {/* Ambient glow — grows with stack */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: 900, height: 900,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${S.primaryAlpha} 0%, transparent 60%)`,
        opacity: interpolate(frame, [0, PAIN_CARDS.length * CARD_STAGGER], [0, 1], { extrapolateRight: 'clamp' }),
        transform: 'translate(-50%, -50%)',
        filter: 'blur(80px)',
        pointerEvents: 'none',
      }} />

      {/* Stack container — sinks + shakes */}
      <div style={{
        position: 'absolute',
        top: STACK_TOP + stackSink,
        left: 120, right: 120,
        transform: `translateX(${shakeX}px)`,
      }}>
        {PAIN_CARDS.map((card, i) => {
          const enterFrame = CARD_ENTER_START + i * CARD_STAGGER;
          const localFrame = frame - enterFrame;

          const enterSpring = spring({
            frame: localFrame,
            fps,
            config: { damping: 11, stiffness: 160, mass: 0.9 },
          });

          // Each card drops from above
          const cardY   = interpolate(enterSpring, [0, 1], [-180, 0]);
          const cardOp  = interpolate(localFrame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
          const cardRot = interpolate(enterSpring, [0, 1], [-6 + i * 0.8, 0]);

          // Compression: cards below get slightly squished
          const compressionScale = 1 - i * 0.012;

          if (localFrame < 0) return null;

          const stackedY = i * (CARD_H + CARD_GAP);

          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: stackedY,
                left: 0, right: 0,
                height: CARD_H,
                transform: `translateY(${cardY}px) rotate(${cardRot}deg) scaleY(${compressionScale})`,
                opacity: cardOp,
                background: `linear-gradient(135deg, ${S.surface} 0%, ${S.bg} 100%)`,
                border: `1.5px solid ${card.color}35`,
                borderRadius: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                padding: '0 28px',
                boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${card.color}20`,
                overflow: 'hidden',
              }}
            >
              {/* Left accent bar */}
              <div style={{
                position: 'absolute',
                left: 0, top: 0, bottom: 0,
                width: 4,
                background: card.color,
                borderRadius: '20px 0 0 20px',
              }} />

              {/* App icon */}
              <div style={{
                width: 56, height: 56,
                borderRadius: 14,
                background: `${card.color}18`,
                border: `1px solid ${card.color}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                flexShrink: 0,
                marginLeft: 8,
              }}>
                {card.emoji}
              </div>

              {/* Text */}
              <div style={{ flex: 1, direction: 'rtl' }}>
                <p style={{
                  fontFamily: HEEBO_S,
                  fontSize: 13,
                  fontWeight: 600,
                  color: card.color,
                  margin: 0,
                  marginBottom: 5,
                  letterSpacing: 0.5,
                  opacity: 0.85,
                }}>
                  {card.app}
                </p>
                <p style={{
                  fontFamily: HEEBO_S,
                  fontSize: 22,
                  fontWeight: 700,
                  color: S.white,
                  margin: 0,
                  lineHeight: 1.3,
                }}>
                  {card.msg}
                </p>
              </div>

              {/* Notification dot */}
              <div style={{
                width: 12, height: 12,
                borderRadius: '50%',
                background: card.color,
                boxShadow: `0 0 10px ${card.color}`,
                flexShrink: 0,
                animation: 'none',
              }} />
            </div>
          );
        })}
      </div>

      {/* Verdict text */}
      <div style={{
        position: 'absolute',
        bottom: 220,
        left: 120, right: 120,
        textAlign: 'center',
        direction: 'rtl',
        opacity: verdictOpacity,
        transform: `translateY(${verdictY}px)`,
        zIndex: 20,
      }}>
        <p style={{
          fontFamily: HEEBO_S,
          fontSize: 52,
          fontWeight: 900,
          color: S.white,
          margin: 0,
          letterSpacing: -1.5,
          lineHeight: 1.2,
        }}>
          טובע.{' '}
          <span style={{
            background: S.nexus,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            בכאוס.
          </span>
        </p>
      </div>

    </AbsoluteFill>
  );
};
