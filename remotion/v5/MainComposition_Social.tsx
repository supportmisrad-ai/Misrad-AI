import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from 'remotion';
import { V5_SOCIAL, MOTION_SOCIAL, HEEBO, SCENES_SOCIAL, MODULES_DATA_SOCIAL, SUBTITLE_TRACK_SOCIAL } from './config_social';

const MODULE_DURATION = 75;

export const MainComposition_Social: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const currentSubtitle = SUBTITLE_TRACK_SOCIAL.find((s) => frame >= s.from && frame < s.to);

  return (
    <AbsoluteFill style={{ backgroundColor: V5_SOCIAL.bgDeep }}>
      <Sequence from={SCENES_SOCIAL.opening.start} durationInFrames={SCENES_SOCIAL.opening.duration}>
        <OpeningSceneSocial />
      </Sequence>

      <Sequence from={SCENES_SOCIAL.modules.start} durationInFrames={SCENES_SOCIAL.modules.duration}>
        <ModulesSceneSocial />
      </Sequence>

      <Sequence from={SCENES_SOCIAL.reveal.start} durationInFrames={SCENES_SOCIAL.reveal.duration}>
        <RevealSceneSocial />
      </Sequence>

      <Sequence from={SCENES_SOCIAL.cta.start} durationInFrames={SCENES_SOCIAL.cta.duration}>
        <CTASceneSocial />
      </Sequence>

      {currentSubtitle && (
        <div
          style={{
            position: 'absolute',
            bottom: 100,
            left: 40,
            right: 40,
            display: 'flex',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              padding: '18px 42px',
              borderRadius: 16,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(20px)',
              border: `1px solid ${V5_SOCIAL.gold}30`,
            }}
          >
            <p
              style={{
                fontFamily: HEEBO,
                fontSize: 42,
                fontWeight: 700,
                color: V5_SOCIAL.white,
                margin: 0,
                direction: 'rtl',
                textAlign: 'center',
                textShadow: '0 2px 12px rgba(0,0,0,0.7)',
              }}
            >
              {currentSubtitle.text}
            </p>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

const OpeningSceneSocial: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSpring = spring({
    frame: frame - 20,
    fps,
    config: MOTION_SOCIAL.hero,
  });

  const textOpacity = interpolate(frame, [10, 40], [0, 1], { extrapolateRight: 'clamp' });
  const textBlur = interpolate(frame, [10, 40], [12, 0], { extrapolateRight: 'clamp' });

  const subTextOpacity = interpolate(frame, [75, 105], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          top: '35%',
          left: '50%',
          width: 700,
          height: 700,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${V5_SOCIAL.gold}15 0%, transparent 60%)`,
          transform: 'translate(-50%, -50%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: '28%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${logoSpring})`,
        }}
      >
        <Img
          src={staticFile('icons/misrad-icon.svg')}
          style={{
            width: 140,
            height: 140,
            filter: `drop-shadow(0 0 30px ${V5_SOCIAL.gold})`,
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: 40,
          right: 40,
          transform: 'translateY(-50%)',
          opacity: textOpacity,
          filter: `blur(${textBlur}px)`,
          textAlign: 'center',
          direction: 'rtl',
        }}
      >
        <h1
          style={{
            fontFamily: HEEBO,
            fontSize: 72,
            fontWeight: 900,
            color: V5_SOCIAL.white,
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          המשחק השתנה.
        </h1>
      </div>

      <div
        style={{
          position: 'absolute',
          top: '68%',
          left: 40,
          right: 40,
          textAlign: 'center',
          opacity: subTextOpacity,
          direction: 'rtl',
        }}
      >
        <h2
          style={{
            fontFamily: HEEBO,
            fontSize: 44,
            fontWeight: 700,
            background: `linear-gradient(135deg, ${V5_SOCIAL.gold} 0%, ${V5_SOCIAL.goldLight} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
          }}
        >
          AI שמנהל במקומך
        </h2>
      </div>
    </AbsoluteFill>
  );
};

const ModulesSceneSocial: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const activeIndex = Math.min(Math.floor(frame / MODULE_DURATION), MODULES_DATA_SOCIAL.length - 1);
  const mod = MODULES_DATA_SOCIAL[activeIndex];
  const localFrame = frame - activeIndex * MODULE_DURATION;

  const cardOpacity = interpolate(localFrame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const cardBlur = interpolate(localFrame, [0, 20], [10, 0], { extrapolateRight: 'clamp' });

  const iconSpring = spring({
    frame: Math.max(0, localFrame - 5),
    fps,
    config: MOTION_SOCIAL.snappy,
  });

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          top: 60,
          left: 40,
          right: 40,
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontFamily: HEEBO,
            fontSize: 38,
            fontWeight: 700,
            background: `linear-gradient(135deg, ${V5_SOCIAL.gold} 0%, ${V5_SOCIAL.goldLight} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
          }}
        >
          6 מודולים · מערכת אחת
        </h2>
      </div>

      <div
        style={{
          position: 'absolute',
          top: '22%',
          left: 40,
          right: 40,
          bottom: '18%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          opacity: cardOpacity,
          filter: `blur(${cardBlur}px)`,
        }}
      >
        <div
          style={{
            background: `linear-gradient(145deg, ${V5_SOCIAL.surface} 0%, ${mod.color}08 100%)`,
            borderRadius: 32,
            border: `2px solid ${mod.color}40`,
            padding: '50px 40px',
            boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 40px ${mod.color}20`,
          }}
        >
          <div
            style={{
              fontSize: 90,
              textAlign: 'center',
              marginBottom: 20,
              filter: `drop-shadow(0 0 20px ${mod.color})`,
              transform: `scale(${iconSpring})`,
            }}
          >
            {mod.icon}
          </div>

          <h3
            style={{
              fontFamily: HEEBO,
              fontSize: 56,
              fontWeight: 900,
              color: V5_SOCIAL.white,
              margin: 0,
              marginBottom: 14,
              textAlign: 'center',
              direction: 'rtl',
            }}
          >
            {mod.name}
          </h3>

          <p
            style={{
              fontFamily: HEEBO,
              fontSize: 32,
              fontWeight: 600,
              color: mod.color,
              margin: 0,
              textAlign: 'center',
              direction: 'rtl',
            }}
          >
            {mod.desc}
          </p>

          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {mod.bars.map((barTarget, j) => {
              const barSpring = spring({
                frame: Math.max(0, localFrame - 10 - j * 5),
                fps,
                config: MOTION_SOCIAL.snappy,
              });
              return (
                <div
                  key={j}
                  style={{
                    height: 26,
                    width: `${barTarget * barSpring}%`,
                    maxWidth: '90%',
                    background: `linear-gradient(270deg, ${mod.color} 0%, ${mod.color}60 100%)`,
                    borderRadius: 8,
                    boxShadow: `0 0 18px ${mod.color}30`,
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 50,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 8,
        }}
      >
        {MODULES_DATA_SOCIAL.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === activeIndex ? 24 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i === activeIndex ? V5_SOCIAL.gold : `${V5_SOCIAL.muted}50`,
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const RevealSceneSocial: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const gridSpring = spring({
    frame: frame - 5,
    fps,
    config: MOTION_SOCIAL.cinematic,
  });

  const textOpacity = interpolate(frame, [60, 90], [0, 1], { extrapolateRight: 'clamp' });
  const textBlur = interpolate(frame, [60, 90], [10, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          top: '15%',
          left: '50%',
          transform: `translate(-50%, 0) scale(${gridSpring})`,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 140px)',
          gridTemplateRows: 'repeat(3, 140px)',
          gap: 18,
        }}
      >
        {MODULES_DATA_SOCIAL.map((mod, i) => {
          const iconSpring = spring({
            frame: Math.max(0, frame - 5 - i * 4),
            fps,
            config: MOTION_SOCIAL.snappy,
          });
          return (
            <div
              key={i}
              style={{
                width: 140,
                height: 140,
                borderRadius: 24,
                background: `linear-gradient(145deg, ${mod.color}20 0%, ${V5_SOCIAL.surface} 100%)`,
                border: `1.5px solid ${mod.color}50`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transform: `scale(${iconSpring})`,
                boxShadow: `0 8px 28px rgba(0,0,0,0.5)`,
              }}
            >
              <div style={{ fontSize: 44 }}>{mod.icon}</div>
              <p
                style={{
                  fontFamily: HEEBO,
                  fontSize: 15,
                  fontWeight: 700,
                  color: mod.color,
                  margin: 0,
                  textAlign: 'center',
                  direction: 'rtl',
                  padding: '0 8px',
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
          top: '72%',
          left: 40,
          right: 40,
          textAlign: 'center',
          opacity: textOpacity,
          filter: `blur(${textBlur}px)`,
          direction: 'rtl',
        }}
      >
        <h2
          style={{
            fontFamily: HEEBO,
            fontSize: 48,
            fontWeight: 900,
            color: V5_SOCIAL.white,
            margin: 0,
            marginBottom: 12,
          }}
        >
          הדור הבא של ניהול עסקי
        </h2>
        <p
          style={{
            fontFamily: HEEBO,
            fontSize: 34,
            fontWeight: 600,
            background: `linear-gradient(135deg, ${V5_SOCIAL.gold} 0%, ${V5_SOCIAL.goldLight} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
          }}
        >
          כבר כאן.
        </p>
      </div>
    </AbsoluteFill>
  );
};

const CTASceneSocial: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSpring = spring({
    frame: frame - 5,
    fps,
    config: MOTION_SOCIAL.hero,
  });

  const textOpacity = interpolate(frame, [25, 50], [0, 1], { extrapolateRight: 'clamp' });
  const urlSpring = spring({
    frame: frame - 60,
    fps,
    config: MOTION_SOCIAL.snappy,
  });

  const glowPulse = Math.abs(Math.sin(frame * 0.08));

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${V5_SOCIAL.gold}18 0%, transparent 55%)`,
          transform: 'translate(-50%, -50%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: '22%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${logoSpring})`,
        }}
      >
        <Img
          src={staticFile('icons/misrad-icon.svg')}
          style={{
            width: 120,
            height: 120,
            filter: `drop-shadow(0 0 ${30 + glowPulse * 20}px ${V5_SOCIAL.gold})`,
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          top: '42%',
          left: 40,
          right: 40,
          textAlign: 'center',
          opacity: textOpacity,
        }}
      >
        <h1
          style={{
            fontFamily: HEEBO,
            fontSize: 72,
            fontWeight: 900,
            color: V5_SOCIAL.white,
            margin: 0,
            textShadow: `0 0 40px ${V5_SOCIAL.gold}50`,
          }}
        >
          MISRAD AI
        </h1>
      </div>

      <div
        style={{
          position: 'absolute',
          top: '58%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${urlSpring})`,
        }}
      >
        <div
          style={{
            padding: '22px 60px',
            background: `linear-gradient(135deg, ${V5_SOCIAL.gold} 0%, ${V5_SOCIAL.goldDark} 100%)`,
            borderRadius: 20,
            boxShadow: `0 16px 48px rgba(212, 175, 55, 0.35), 0 0 ${50 + glowPulse * 25}px ${V5_SOCIAL.goldGlow}`,
          }}
        >
          <p
            style={{
              fontFamily: HEEBO,
              fontSize: 42,
              fontWeight: 900,
              color: V5_SOCIAL.bgDeep,
              margin: 0,
            }}
          >
            misrad.ai
          </p>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: '75%',
          left: 40,
          right: 40,
          textAlign: 'center',
          opacity: interpolate(frame, [80, 105], [0, 1], { extrapolateRight: 'clamp' }),
          direction: 'rtl',
        }}
      >
        <p
          style={{
            fontFamily: HEEBO,
            fontSize: 32,
            fontWeight: 700,
            background: `linear-gradient(135deg, ${V5_SOCIAL.gold} 0%, ${V5_SOCIAL.goldLight} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
            marginBottom: 10,
          }}
        >
          14 יום חינם
        </p>
        <p
          style={{
            fontFamily: HEEBO,
            fontSize: 22,
            fontWeight: 500,
            color: V5_SOCIAL.muted,
            margin: 0,
          }}
        >
          ללא כרטיס אשראי
        </p>
      </div>
    </AbsoluteFill>
  );
};
