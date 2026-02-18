import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { IMPACT, IMPACT_MOTION, HEEBO_IMPACT, RUBIK_IMPACT } from '../../config_impact';

export const DashboardRevealScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene reveal — scale + blur clear
  const revealSpring = spring({ frame: frame - 5, fps, config: IMPACT_MOTION.cinematic });
  const revealScale = interpolate(revealSpring, [0, 1], [0.88, 1.0]);
  const revealBlur = interpolate(frame, [0, 40], [14, 0], { extrapolateRight: 'clamp' });
  const sceneOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: 'clamp' });

  // Revenue counter: 0 → 47,200
  const revenueProgress = interpolate(frame, [100, 260], [0, 47200], {
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 4),
  });
  const revenueValue = Math.floor(revenueProgress);
  const revenueColor = interpolate(frame, [100, 260], [0, 1], { extrapolateRight: 'clamp' });

  // AI Insight bubble — slides in from right
  const insightSpring = spring({ frame: frame - 80, fps, config: IMPACT_MOTION.elastic });
  const insightX = interpolate(insightSpring, [0, 1], [280, 0]);
  const insightOpacity = interpolate(frame, [80, 110], [0, 1], { extrapolateRight: 'clamp' });

  // AI Insight glow pulse
  const insightGlow = 20 + Math.abs(Math.sin(frame * 0.08)) * 25;

  // Task auto-complete — frame 190
  const taskCheckSpring = spring({ frame: frame - 190, fps, config: IMPACT_MOTION.bounce });
  const taskCheckScale = interpolate(taskCheckSpring, [0, 1], [0, 1.0]);
  const strikeWidth = interpolate(frame, [195, 215], [0, 100], { extrapolateRight: 'clamp' });
  const taskOpacity = interpolate(frame, [185, 200], [0, 1], { extrapolateRight: 'clamp' });

  // Stats cards — staggered reveal
  const card1Spring = spring({ frame: frame - 15, fps, config: IMPACT_MOTION.snappy });
  const card2Spring = spring({ frame: frame - 30, fps, config: IMPACT_MOTION.snappy });
  const card3Spring = spring({ frame: frame - 45, fps, config: IMPACT_MOTION.snappy });

  // Headline text
  const headline1Opacity = interpolate(frame, [20, 50], [0, 1], { extrapolateRight: 'clamp' });
  const headline1Y = interpolate(frame, [20, 50], [16, 0], { extrapolateRight: 'clamp' });
  const headline2Opacity = interpolate(frame, [120, 150], [0, 1], { extrapolateRight: 'clamp' });
  const headline2Y = interpolate(frame, [120, 150], [16, 0], { extrapolateRight: 'clamp' });
  const headline3Opacity = interpolate(frame, [230, 260], [0, 1], { extrapolateRight: 'clamp' });
  const headline3Y = interpolate(frame, [230, 260], [16, 0], { extrapolateRight: 'clamp' });

  // Ambient glow
  const ambientPulse = 1 + Math.sin(frame * 0.04) * 0.05;

  const NEXUS_GRADIENT = `linear-gradient(135deg, ${IMPACT.primary} 0%, ${IMPACT.indigo} 100%)`;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: IMPACT.bgDeep,
        opacity: sceneOpacity,
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          width: 900,
          height: 900,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${IMPACT.indigo}18 0%, ${IMPACT.primary}10 50%, transparent 70%)`,
          transform: `translate(-50%, -50%) scale(${ambientPulse})`,
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />

      {/* Main dashboard container */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 1600,
          transform: `translate(-50%, -50%) scale(${revealScale})`,
          filter: `blur(${revealBlur}px)`,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {/* Top label */}
        <div
          style={{
            opacity: headline1Opacity,
            transform: `translateY(${headline1Y}px)`,
            direction: 'rtl',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: IMPACT.green,
              boxShadow: `0 0 12px ${IMPACT.green}`,
            }}
          />
          <p
            style={{
              fontFamily: HEEBO_IMPACT,
              fontSize: 18,
              fontWeight: 600,
              color: IMPACT.muted,
              margin: 0,
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            MISRAD AI — בזמן אמת
          </p>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 20 }}>
          {/* Revenue card */}
          <div
            style={{
              flex: 1,
              background: `linear-gradient(135deg, ${IMPACT.surface} 0%, ${IMPACT.bgDeep} 100%)`,
              border: `1.5px solid ${IMPACT.primary}30`,
              borderRadius: 20,
              padding: '28px 32px',
              transform: `translateY(${interpolate(card1Spring, [0, 1], [30, 0])}px)`,
              opacity: card1Spring,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: NEXUS_GRADIENT,
              }}
            />
            <p
              style={{
                fontFamily: HEEBO_IMPACT,
                fontSize: 14,
                fontWeight: 600,
                color: IMPACT.muted,
                margin: 0,
                marginBottom: 12,
                letterSpacing: 1,
                direction: 'rtl',
              }}
            >
              הכנסות החודש
            </p>
            <p
              style={{
                fontFamily: RUBIK_IMPACT,
                fontSize: 52,
                fontWeight: 800,
                color: revenueColor > 0.5 ? IMPACT.green : IMPACT.white,
                margin: 0,
                letterSpacing: -1,
                transition: 'color 0.3s',
              }}
            >
              ₪{revenueValue.toLocaleString('he-IL')}
            </p>
            <p
              style={{
                fontFamily: HEEBO_IMPACT,
                fontSize: 14,
                color: IMPACT.green,
                margin: 0,
                marginTop: 8,
                direction: 'rtl',
              }}
            >
              ↑ 23% מהחודש שעבר
            </p>
          </div>

          {/* Active clients card */}
          <div
            style={{
              flex: 1,
              background: `linear-gradient(135deg, ${IMPACT.surface} 0%, ${IMPACT.bgDeep} 100%)`,
              border: `1.5px solid ${IMPACT.indigo}30`,
              borderRadius: 20,
              padding: '28px 32px',
              transform: `translateY(${interpolate(card2Spring, [0, 1], [30, 0])}px)`,
              opacity: card2Spring,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: `linear-gradient(90deg, ${IMPACT.indigo}, ${IMPACT.indigoLight})`,
              }}
            />
            <p
              style={{
                fontFamily: HEEBO_IMPACT,
                fontSize: 14,
                fontWeight: 600,
                color: IMPACT.muted,
                margin: 0,
                marginBottom: 12,
                letterSpacing: 1,
                direction: 'rtl',
              }}
            >
              לקוחות פעילים
            </p>
            <p
              style={{
                fontFamily: RUBIK_IMPACT,
                fontSize: 52,
                fontWeight: 800,
                color: IMPACT.white,
                margin: 0,
                letterSpacing: -1,
              }}
            >
              {Math.floor(interpolate(frame, [20, 120], [0, 142], { extrapolateRight: 'clamp' }))}
            </p>
            <p
              style={{
                fontFamily: HEEBO_IMPACT,
                fontSize: 14,
                color: IMPACT.indigoLight,
                margin: 0,
                marginTop: 8,
                direction: 'rtl',
              }}
            >
              12 חדשים השבוע
            </p>
          </div>

          {/* Tasks card */}
          <div
            style={{
              flex: 1,
              background: `linear-gradient(135deg, ${IMPACT.surface} 0%, ${IMPACT.bgDeep} 100%)`,
              border: `1.5px solid ${IMPACT.green}25`,
              borderRadius: 20,
              padding: '28px 32px',
              transform: `translateY(${interpolate(card3Spring, [0, 1], [30, 0])}px)`,
              opacity: card3Spring,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: `linear-gradient(90deg, ${IMPACT.green}, #34D399)`,
              }}
            />
            <p
              style={{
                fontFamily: HEEBO_IMPACT,
                fontSize: 14,
                fontWeight: 600,
                color: IMPACT.muted,
                margin: 0,
                marginBottom: 12,
                letterSpacing: 1,
                direction: 'rtl',
              }}
            >
              משימות היום
            </p>
            <p
              style={{
                fontFamily: RUBIK_IMPACT,
                fontSize: 52,
                fontWeight: 800,
                color: IMPACT.white,
                margin: 0,
                letterSpacing: -1,
              }}
            >
              {Math.floor(interpolate(frame, [30, 130], [0, 18], { extrapolateRight: 'clamp' }))}
            </p>
            <p
              style={{
                fontFamily: HEEBO_IMPACT,
                fontSize: 14,
                color: IMPACT.green,
                margin: 0,
                marginTop: 8,
                direction: 'rtl',
              }}
            >
              ↑ 6 הושלמו אוטומטית
            </p>
          </div>
        </div>

        {/* AI Insight bubble */}
        <div
          style={{
            transform: `translateX(${insightX}px)`,
            opacity: insightOpacity,
            background: NEXUS_GRADIENT,
            borderRadius: 20,
            padding: '24px 32px',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            direction: 'rtl',
            boxShadow: `0 0 ${insightGlow}px ${IMPACT.primaryAlpha}, 0 0 ${insightGlow * 0.5}px ${IMPACT.indigoAlpha}`,
            border: `1px solid rgba(255,255,255,0.15)`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Shimmer */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: `${(frame * 2) % 140 - 20}%`,
              width: '25%',
              height: '100%',
              background: 'rgba(255,255,255,0.08)',
              transform: 'skewX(-20deg)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              flexShrink: 0,
            }}
          >
            🧠
          </div>
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontFamily: HEEBO_IMPACT,
                fontSize: 13,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.7)',
                margin: 0,
                marginBottom: 6,
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              AI INSIGHT
            </p>
            <p
              style={{
                fontFamily: HEEBO_IMPACT,
                fontSize: 26,
                fontWeight: 700,
                color: IMPACT.white,
                margin: 0,
              }}
            >
              לקוח X עומד לעזוב — סיכוי{' '}
              <span style={{ fontWeight: 900 }}>78%</span>
            </p>
          </div>
          <div
            style={{
              padding: '10px 24px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.3)',
              flexShrink: 0,
            }}
          >
            <p
              style={{
                fontFamily: HEEBO_IMPACT,
                fontSize: 16,
                fontWeight: 700,
                color: IMPACT.white,
                margin: 0,
              }}
            >
              פעל עכשיו
            </p>
          </div>
        </div>

        {/* Task row with auto-complete */}
        <div
          style={{
            background: `${IMPACT.surface}CC`,
            border: `1px solid ${IMPACT.surfaceLight}`,
            borderRadius: 16,
            padding: '20px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            direction: 'rtl',
            opacity: taskOpacity,
          }}
        >
          {/* Checkbox */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: IMPACT.green,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `scale(${taskCheckScale})`,
              boxShadow: `0 0 16px ${IMPACT.green}60`,
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 8L6.5 11.5L13 5"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <p
              style={{
                fontFamily: HEEBO_IMPACT,
                fontSize: 20,
                fontWeight: 600,
                color: IMPACT.mutedLight,
                margin: 0,
              }}
            >
              שלח הצעת מחיר ללקוח Cohen Ltd
            </p>
            {/* Strike-through line */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                right: 0,
                height: 2,
                width: `${strikeWidth}%`,
                background: IMPACT.muted,
                borderRadius: 1,
                transform: 'translateY(-50%)',
              }}
            />
          </div>
          <div
            style={{
              padding: '6px 16px',
              background: `${IMPACT.green}20`,
              border: `1px solid ${IMPACT.green}40`,
              borderRadius: 8,
              flexShrink: 0,
            }}
          >
            <p
              style={{
                fontFamily: HEEBO_IMPACT,
                fontSize: 13,
                fontWeight: 600,
                color: IMPACT.green,
                margin: 0,
              }}
            >
              הושלם אוטומטית ✓
            </p>
          </div>
        </div>

        {/* Bottom headline */}
        <div
          style={{
            opacity: headline2Opacity,
            transform: `translateY(${headline2Y}px)`,
            direction: 'rtl',
            textAlign: 'center',
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
            }}
          >
            ה-AI שלך רואה מה שאתה מפספס.
          </p>
        </div>

        {/* Final line */}
        <div
          style={{
            opacity: headline3Opacity,
            transform: `translateY(${headline3Y}px)`,
            direction: 'rtl',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontFamily: HEEBO_IMPACT,
              fontSize: 24,
              fontWeight: 600,
              color: IMPACT.muted,
              margin: 0,
            }}
          >
            כל הצוות. כל הנתונים. מקום אחד.
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};
