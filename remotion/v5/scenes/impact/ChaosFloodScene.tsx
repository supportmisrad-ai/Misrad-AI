import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { IMPACT, IMPACT_MOTION, HEEBO_IMPACT, NOTIFICATION_ITEMS } from '../../config_impact';

const CARD_HEIGHT = 88;
const CARD_WIDTH = 480;
const STAGGER = 18;
const FALL_DURATION = 90;

interface NotificationCardProps {
  icon: string;
  label: string;
  color: string;
  text: string;
  index: number;
  frame: number;
  totalFrames: number;
  xOffset: number;
}

const NotificationCard: React.FC<NotificationCardProps> = ({
  icon, label, color, text, index, frame, totalFrames, xOffset,
}) => {
  const delay = index * STAGGER;
  const localFrame = frame - delay;

  if (localFrame < 0) return null;

  const progress = localFrame / (FALL_DURATION + 20);
  const y = interpolate(localFrame, [0, FALL_DURATION + 20], [-120, 1200], {
    extrapolateRight: 'clamp',
  });
  const opacity = interpolate(
    localFrame,
    [0, 15, FALL_DURATION - 10, FALL_DURATION + 20],
    [0, 1, 1, 0],
    { extrapolateRight: 'clamp' }
  );
  const tilt = Math.sin(localFrame * 0.08 + index * 1.2) * 3;

  return (
    <div
      style={{
        position: 'absolute',
        left: `50%`,
        top: y,
        width: CARD_WIDTH,
        transform: `translateX(calc(-50% + ${xOffset}px)) rotate(${tilt}deg)`,
        opacity,
        background: 'rgba(24, 24, 27, 0.92)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${color}40`,
        borderRadius: 16,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${color}20`,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: `${color}20`,
          border: `1px solid ${color}50`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, direction: 'rtl', overflow: 'hidden' }}>
        <p
          style={{
            fontFamily: HEEBO_IMPACT,
            fontSize: 13,
            fontWeight: 600,
            color,
            margin: 0,
            marginBottom: 3,
            letterSpacing: 0.5,
            opacity: 0.8,
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontFamily: HEEBO_IMPACT,
            fontSize: 18,
            fontWeight: 600,
            color: IMPACT.white,
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {text}
        </p>
      </div>
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: color,
          flexShrink: 0,
          boxShadow: `0 0 8px ${color}`,
        }}
      />
    </div>
  );
};

export const ChaosFloodScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene fade in
  const sceneIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  // "Drowning figure" — abstract clay placeholder (left side)
  const figureOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
  const figureWobble = Math.sin(frame * 0.07) * 4;
  const figureScale = 1 - interpolate(frame, [0, 280], [0, 0.08], { extrapolateRight: 'clamp' });

  // Chaos text lines — staggered
  const line1Spring = spring({ frame: frame - 50, fps, config: IMPACT_MOTION.snappy });
  const line1Opacity = interpolate(frame, [50, 80], [0, 1], { extrapolateRight: 'clamp' });

  const line2Spring = spring({ frame: frame - 170, fps, config: IMPACT_MOTION.snappy });
  const line2Opacity = interpolate(frame, [170, 200], [0, 1], { extrapolateRight: 'clamp' });

  // Black hole convergence at end (frame 270-300)
  const blackHoleProgress = interpolate(frame, [265, 300], [0, 1], {
    extrapolateRight: 'clamp',
    easing: (t) => t * t * t,
  });
  const blackHoleScale = interpolate(blackHoleProgress, [0, 1], [0, 1.5]);
  const blackHoleOpacity = interpolate(blackHoleProgress, [0, 0.5, 1], [0, 0.8, 0]);

  // Cards converge to center at end
  const cardsConverge = interpolate(frame, [270, 300], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // White flash at very end
  const whiteFlash = interpolate(frame, [292, 296, 300], [0, 1, 0], {
    extrapolateRight: 'clamp',
  });

  // Ambient red glow — grows with chaos
  const chaosGlow = interpolate(frame, [0, 200], [0, 0.25], { extrapolateRight: 'clamp' });

  // X offsets for two columns of cards
  const xOffsets = [-260, 260, -260, 260, -260, 260, -260, 260, -260, 260, -260, 260];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: IMPACT.bgDeep,
        opacity: sceneIn,
        overflow: 'hidden',
      }}
    >
      {/* Ambient chaos glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 1400,
          height: 1400,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${IMPACT.primary}${Math.round(chaosGlow * 255).toString(16).padStart(2, '0')} 0%, transparent 60%)`,
          transform: 'translate(-50%, -50%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      {/* Clay figure placeholder — left side */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) translateX(${figureWobble}px) scale(${figureScale})`,
          opacity: figureOpacity * (1 - blackHoleProgress),
          zIndex: 1,
        }}
      >
        {/* Abstract clay humanoid — built from divs */}
        {/* Head */}
        <div
          style={{
            width: 90,
            height: 90,
            borderRadius: '50%',
            background: `radial-gradient(circle at 35% 35%, #4a4a4a, #1a1a1a)`,
            margin: '0 auto',
            boxShadow: `0 4px 20px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.1)`,
            position: 'relative',
          }}
        />
        {/* Body */}
        <div
          style={{
            width: 110,
            height: 140,
            borderRadius: '30px 30px 20px 20px',
            background: `linear-gradient(180deg, #3a3a3a 0%, #1e1e1e 100%)`,
            margin: '8px auto 0',
            boxShadow: `0 8px 24px rgba(0,0,0,0.5), inset 0 1px 3px rgba(255,255,255,0.08)`,
          }}
        />
        {/* Arms reaching up — animated */}
        <div
          style={{
            position: 'absolute',
            top: 80,
            left: -50,
            width: 50,
            height: 20,
            borderRadius: 10,
            background: '#3a3a3a',
            transform: `rotate(${-40 + Math.sin(frame * 0.12) * 15}deg)`,
            transformOrigin: 'right center',
            boxShadow: `0 2px 8px rgba(0,0,0,0.4)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 80,
            right: -50,
            width: 50,
            height: 20,
            borderRadius: 10,
            background: '#3a3a3a',
            transform: `rotate(${40 + Math.sin(frame * 0.12 + 1) * 15}deg)`,
            transformOrigin: 'left center',
            boxShadow: `0 2px 8px rgba(0,0,0,0.4)`,
          }}
        />
        {/* OPAL placeholder label */}
        <p
          style={{
            fontFamily: 'monospace',
            fontSize: 11,
            color: `${IMPACT.primary}60`,
            textAlign: 'center',
            marginTop: 12,
            letterSpacing: 1,
          }}
        >
          OPAL · chaos-figure.webm
        </p>
      </div>

      {/* Notification cards — falling in two columns */}
      {NOTIFICATION_ITEMS.map((item, i) => (
        <NotificationCard
          key={i}
          icon={item.icon}
          label={item.label}
          color={item.color}
          text={item.text}
          index={i}
          frame={frame}
          totalFrames={300}
          xOffset={xOffsets[i] * (1 - cardsConverge)}
        />
      ))}

      {/* Black hole vortex at end */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: `radial-gradient(circle, #000 0%, ${IMPACT.primary}40 40%, transparent 70%)`,
          transform: `translate(-50%, -50%) scale(${blackHoleScale})`,
          opacity: blackHoleOpacity,
          filter: 'blur(8px)',
          zIndex: 10,
        }}
      />

      {/* Text — line 1 */}
      <div
        style={{
          position: 'absolute',
          bottom: 180,
          left: 0,
          right: 0,
          textAlign: 'center',
          direction: 'rtl',
          opacity: line1Opacity * (1 - interpolate(frame, [155, 175], [0, 1], { extrapolateRight: 'clamp' })),
          transform: `translateY(${interpolate(line1Spring, [0, 1], [20, 0])}px)`,
          zIndex: 20,
        }}
      >
        <h2
          style={{
            fontFamily: HEEBO_IMPACT,
            fontSize: 58,
            fontWeight: 900,
            color: IMPACT.white,
            margin: 0,
            letterSpacing: -1,
          }}
        >
          5 כלים. 3 אפליקציות.{' '}
          <span
            style={{
              background: IMPACT.nexusGradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            אפס שליטה.
          </span>
        </h2>
      </div>

      {/* Text — line 2 */}
      <div
        style={{
          position: 'absolute',
          bottom: 180,
          left: 0,
          right: 0,
          textAlign: 'center',
          direction: 'rtl',
          opacity: line2Opacity,
          transform: `translateY(${interpolate(line2Spring, [0, 1], [20, 0])}px)`,
          zIndex: 20,
        }}
      >
        <h2
          style={{
            fontFamily: HEEBO_IMPACT,
            fontSize: 72,
            fontWeight: 900,
            color: IMPACT.white,
            margin: 0,
            letterSpacing: -2,
            textShadow: `0 0 60px ${IMPACT.primaryAlpha}`,
          }}
        >
          הצוות שלך{' '}
          <span
            style={{
              color: IMPACT.primary,
              textShadow: `0 0 40px ${IMPACT.primary}`,
            }}
          >
            טובע.
          </span>
        </h2>
      </div>

      {/* White flash overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: '#FFFFFF',
          opacity: whiteFlash,
          pointerEvents: 'none',
          zIndex: 50,
        }}
      />
    </AbsoluteFill>
  );
};
