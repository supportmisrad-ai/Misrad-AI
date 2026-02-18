import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { MISRAD_COLORS, SPRING_CONFIGS } from '../config';

export const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const problems = [
    { text: 'לידים נופלים בין הכיסאות', icon: '📉', delay: 0 },
    { text: 'תקציב השיווק נשרף לריק', icon: '💸', delay: 40 },
    { text: 'הצוות לא מסונכרן', icon: '🤯', delay: 80 },
    { text: 'דיווחים לא עודכנים', icon: '📊', delay: 120 },
    { text: 'אתם עובדים 16 שעות ביום', icon: '⏰', delay: 160 },
  ];

  const titleScale = spring({
    frame,
    fps,
    config: SPRING_CONFIGS.hero,
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${MISRAD_COLORS.onyx900} 0%, ${MISRAD_COLORS.onyx800} 100%)`,
        direction: 'rtl',
      }}
    >
      {/* Background chaos effect */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.05,
          background: `repeating-linear-gradient(
            90deg,
            ${MISRAD_COLORS.primary} 0px,
            transparent 2px,
            transparent 8px
          )`,
          transform: `translateX(${Math.sin(frame * 0.05) * 20}px)`,
        }}
      />

      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: '12%',
          right: '10%',
          transform: `scale(${titleScale})`,
        }}
      >
        <h2
          style={{
            fontFamily: 'Heebo, sans-serif',
            fontSize: 80,
            fontWeight: 900,
            color: MISRAD_COLORS.primary,
            margin: 0,
            textAlign: 'right',
          }}
        >
          הבעיה האמיתית?
        </h2>
      </div>

      {/* Problems list */}
      <div
        style={{
          position: 'absolute',
          top: '28%',
          right: '10%',
          left: '10%',
          display: 'flex',
          flexDirection: 'column',
          gap: 30,
        }}
      >
        {problems.map((problem, index) => {
          const itemSpring = spring({
            frame: frame - problem.delay,
            fps,
            config: SPRING_CONFIGS.ui,
          });

          const itemOpacity = interpolate(
            frame,
            [problem.delay, problem.delay + 20],
            [0, 1],
            { extrapolateRight: 'clamp' }
          );

          return (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 30,
                transform: `translateX(${(1 - itemSpring) * -200}px)`,
                opacity: itemOpacity,
                padding: 30,
                background: `linear-gradient(145deg, rgba(162, 29, 60, 0.1) 0%, rgba(55, 48, 163, 0.05) 100%)`,
                backdropFilter: 'blur(20px)',
                borderRadius: 24,
                border: `2px solid rgba(162, 29, 60, 0.2)`,
                direction: 'rtl',
              }}
            >
              <div
                style={{
                  fontSize: 60,
                  filter: `grayscale(${1 - itemSpring})`,
                }}
              >
                {problem.icon}
              </div>
              <p
                style={{
                  fontFamily: 'Heebo, sans-serif',
                  fontSize: 44,
                  fontWeight: 700,
                  color: '#fff',
                  margin: 0,
                  textAlign: 'right',
                }}
              >
                {problem.text}
              </p>
            </div>
          );
        })}
      </div>

      {/* Bottom emphasis */}
      <div
        style={{
          position: 'absolute',
          bottom: '8%',
          right: '10%',
          left: '10%',
          textAlign: 'center',
          opacity: interpolate(frame, [200, 230], [0, 1]),
        }}
      >
        <p
          style={{
            fontFamily: 'Heebo, sans-serif',
            fontSize: 48,
            fontWeight: 900,
            background: `linear-gradient(135deg, ${MISRAD_COLORS.primary} 0%, ${MISRAD_COLORS.indigo} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
          }}
        >
          אתם לא צריכים עוד עובד. אתם צריכים מערכת.
        </p>
      </div>
    </AbsoluteFill>
  );
};
