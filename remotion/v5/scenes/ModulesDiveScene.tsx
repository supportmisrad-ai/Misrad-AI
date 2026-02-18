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

const MODULE_DURATION = 75;
const ENTER_FRAMES = 18;
const EXIT_FRAMES = 12;

export const ModulesDiveScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const activeIndex = Math.min(
    Math.floor(frame / MODULE_DURATION),
    MODULES_DATA.length - 1
  );

  return (
    <AbsoluteFill style={{ backgroundColor: V5.bg }}>
      {/* Gradient orb — follows active module color */}
      {MODULES_DATA.map((mod, i) => {
        const moduleStart = i * MODULE_DURATION;
        const localFrame = frame - moduleStart;
        const isActive = i === activeIndex;
        if (!isActive) return null;
        const orbOpacity = interpolate(localFrame, [0, ENTER_FRAMES], [0, 0.18], { extrapolateRight: 'clamp' });
        return (
          <div
            key={`orb-${i}`}
            style={{
              position: 'absolute',
              top: '30%',
              left: '60%',
              width: 700,
              height: 700,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${mod.color} 0%, transparent 65%)`,
              transform: 'translate(-50%, -50%)',
              opacity: orbOpacity,
              filter: 'blur(80px)',
              pointerEvents: 'none',
            }}
          />
        );
      })}

      {MODULES_DATA.map((mod, i) => {
        const moduleStart = i * MODULE_DURATION;
        const localFrame = frame - moduleStart;
        const isActive = i === activeIndex;
        const isPast = i < activeIndex;

        if (!isActive && !isPast) return null;

        // ENTER: card punches in from bottom-right with overshoot
        const enterSpring = spring({
          frame: localFrame,
          fps,
          config: { damping: 14, stiffness: 180, mass: 0.7 },
        });
        const enterX = interpolate(enterSpring, [0, 1], [120, 0]);
        const enterY = interpolate(enterSpring, [0, 1], [60, 0]);
        const enterScale = interpolate(enterSpring, [0, 1], [0.82, 1]);

        // EXIT: card slams out to the left with motion blur
        const exitProgress = isPast
          ? interpolate(
              localFrame,
              [MODULE_DURATION - EXIT_FRAMES, MODULE_DURATION],
              [0, 1],
              { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }
            )
          : 0;
        const exitX = interpolate(exitProgress, [0, 1], [0, -180]);
        const exitScale = interpolate(exitProgress, [0, 1], [1, 0.88]);
        const exitOpacity = interpolate(exitProgress, [0, 0.6, 1], [1, 1, 0]);
        const exitBlur = interpolate(exitProgress, [0, 1], [0, 12]);

        const isEntering = isActive;
        const translateX = isEntering ? enterX : exitX;
        const translateY = isEntering ? enterY : 0;
        const scale = isEntering ? enterScale : exitScale;
        const opacity = isEntering ? 1 : exitOpacity;
        const motionBlur = isEntering ? 0 : exitBlur;

        // Icon: scale punch on enter
        const iconPunch = spring({
          frame: Math.max(0, localFrame - 8),
          fps,
          config: { damping: 8, stiffness: 280, mass: 0.5 },
        });

        // Bars: staggered snap-in
        const NEXUS_GRADIENT = `linear-gradient(135deg, ${V5.primary} 0%, ${V5.indigo} 100%)`;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: '8%',
              left: '6%',
              right: '6%',
              bottom: '8%',
              transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
              opacity,
              filter: `blur(${motionBlur}px)`,
              display: 'flex',
              alignItems: 'center',
              gap: 60,
            }}
          >
            {/* Left: data panel */}
            <div
              style={{
                flex: '0 0 520px',
                height: '100%',
                background: `linear-gradient(180deg, ${V5.bgDeep} 0%, ${mod.color}0A 100%)`,
                borderRadius: 28,
                border: `1.5px solid ${mod.color}30`,
                padding: '44px 40px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 28,
                boxShadow: `0 0 60px ${mod.color}15`,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Accent line top */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: NEXUS_GRADIENT,
                  opacity: 0.8,
                }}
              />

              <p
                style={{
                  fontFamily: HEEBO,
                  fontSize: 13,
                  fontWeight: 600,
                  color: mod.color,
                  margin: 0,
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  opacity: 0.8,
                }}
              >
                {`0${i + 1} / 06`}
              </p>

              {mod.bars.map((barTarget, j) => {
                const barSpring = spring({
                  frame: Math.max(0, localFrame - 6 - j * 5),
                  fps,
                  config: { damping: 11, stiffness: 220, mass: 0.8 },
                });
                const barWidth = barTarget * barSpring;
                const labelOpacity = interpolate(
                  localFrame,
                  [8 + j * 5, 20 + j * 5],
                  [0, 1],
                  { extrapolateRight: 'clamp' }
                );
                return (
                  <div key={j} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div
                      style={{
                        height: 32,
                        width: `${barWidth}%`,
                        maxWidth: '92%',
                        background: j === 0
                          ? NEXUS_GRADIENT
                          : `linear-gradient(270deg, ${mod.color} 0%, ${mod.color}55 100%)`,
                        borderRadius: 6,
                        boxShadow: j === 0
                          ? `0 0 24px ${V5.primary}50`
                          : `0 0 14px ${mod.color}20`,
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Shimmer */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: `${(localFrame * 3) % 120 - 20}%`,
                          width: '20%',
                          height: '100%',
                          background: 'rgba(255,255,255,0.15)',
                          transform: 'skewX(-20deg)',
                        }}
                      />
                    </div>
                    <p
                      style={{
                        fontFamily: HEEBO,
                        fontSize: 18,
                        fontWeight: 500,
                        color: V5.muted,
                        margin: 0,
                        opacity: labelOpacity,
                      }}
                    >
                      {barTarget}%
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Right: module info */}
            <div
              style={{
                flex: 1,
                direction: 'rtl',
                textAlign: 'right',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 24,
              }}
            >
              <div
                style={{
                  fontSize: 88,
                  lineHeight: 1,
                  filter: `drop-shadow(0 0 28px ${mod.color})`,
                  transform: `scale(${iconPunch}) rotate(${interpolate(iconPunch, [0, 1], [-8, 0])}deg)`,
                  transformOrigin: 'right center',
                  display: 'inline-block',
                  alignSelf: 'flex-end',
                }}
              >
                {mod.icon}
              </div>

              <h3
                style={{
                  fontFamily: HEEBO,
                  fontSize: 76,
                  fontWeight: 900,
                  color: V5.white,
                  margin: 0,
                  lineHeight: 1.05,
                  textShadow: `0 0 60px ${mod.color}30`,
                }}
              >
                {mod.name}
              </h3>

              <p
                style={{
                  fontFamily: HEEBO,
                  fontSize: 36,
                  fontWeight: 500,
                  background: NEXUS_GRADIENT,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  margin: 0,
                }}
              >
                {mod.desc}
              </p>

              {/* Divider */}
              <div
                style={{
                  height: 2,
                  background: NEXUS_GRADIENT,
                  borderRadius: 2,
                  opacity: 0.4,
                  width: interpolate(
                    localFrame,
                    [ENTER_FRAMES, ENTER_FRAMES + 20],
                    [0, 100],
                    { extrapolateRight: 'clamp' }
                  ) + '%',
                }}
              />
            </div>

            <ClayVideoSlot
              src={mod.clay}
              startFrame={8}
              durationFrames={50}
              maxOpacity={0.09}
              scale={0.5}
              width={280}
              height={200}
              position={{ top: '18%', left: '92%' }}
            />
          </div>
        );
      })}

      {/* Progress dots */}
      <div
        style={{
          position: 'absolute',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 10,
          alignItems: 'center',
        }}
      >
        {MODULES_DATA.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === activeIndex ? 32 : 8,
              height: 8,
              borderRadius: 4,
              background: i === activeIndex
                ? `linear-gradient(90deg, ${V5.primary} 0%, ${V5.indigo} 100%)`
                : `${V5.muted}50`,
              boxShadow: i === activeIndex ? `0 0 12px ${V5.primaryAlpha}` : 'none',
              transition: 'width 0.2s ease',
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
