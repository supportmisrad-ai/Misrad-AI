import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from 'remotion';
import { BRAND, HEEBO, RUBIK, SPRING, MODULE_COLORS } from '../shared/config';
import { NoiseLayer, TextReveal, GlassCard, CTAEndcard, VirtualCamera } from '../shared/components';
import { Character } from './shared/Character';
import { L1_TIMING, WARM } from './shared/launch-config';

const T = L1_TIMING;

// ─── Helpers ────────────────────────────────────────────

/** Brushed metal gradient text */
const brushedMetal = (fontSize: number, color: 'warm' | 'gold' | 'brand' = 'warm'): React.CSSProperties => {
  const gradients = {
    warm: 'linear-gradient(160deg, #F0EDE8 0%, #D8D0C4 30%, #E8E0D4 50%, #C8BFB2 75%, #DDD5C8 100%)',
    gold: 'linear-gradient(160deg, #EAD7A1 0%, #C5A572 30%, #D4B882 50%, #A88B4A 75%, #C5A572 100%)',
    brand: `linear-gradient(160deg, #E8A0B0 0%, #A21D3C 40%, #6366F1 70%, #3730A3 100%)`,
  };
  return {
    fontFamily: RUBIK,
    fontSize,
    fontWeight: 800,
    background: gradients[color],
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: -2,
    textShadow: '0 2px 20px rgba(0,0,0,0.4)',
  };
};

/** Slot machine roll animation */
const useSlotRoll = (frame: number, fps: number, target: string, startFrame: number, rollDur = 20) => {
  const f = Math.max(0, frame - startFrame);
  const progress = spring({ frame: f, fps, config: { damping: 12, stiffness: 200, mass: 0.8 }, durationInFrames: rollDur });
  const locked = progress > 0.95;
  const display = locked ? target : target.replace(/[0-9]/g, () => String(Math.floor(Math.random() * 10)));
  const motionBlur = interpolate(progress, [0, 0.8, 1], [6, 2, 0]);
  return { display, progress, motionBlur, locked };
};

/** Disintegration particles */
const useDisintegration = (frame: number, startFrame: number, duration: number, count: number) => {
  const f = Math.max(0, frame - startFrame);
  const progress = Math.min(f / duration, 1);
  return useMemo(() =>
    Array.from({ length: count }, (_, i) => {
      const seed = i * 137.5;
      const angle = (seed % 360) * (Math.PI / 180);
      const dist = progress * (40 + (seed % 60));
      const x = Math.cos(angle) * dist;
      const y = Math.sin(angle) * dist - progress * 20;
      const opacity = Math.max(0, 1 - progress * (1.2 + (seed % 0.5)));
      const size = 3 + (seed % 4);
      return { x, y, opacity, size };
    }), [progress, count]);
};

// ═══════════════════════════════════════════════════════════
// SCENE 1: HOOK — "הבלגן שלך" [0:00–0:05] frames 0–150
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const notifications = ['וואטסאפ (47)', 'אקסל', 'גוגל שיטס', 'CRM ישן', 'חשבונית ידנית'];

  // Phone entrance
  const phoneSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 15 });
  const phoneScale = interpolate(phoneSpring, [0, 1], [0.8, 1]);

  // Notifications stagger
  const notifStagger = 6;

  // Explosion at frame 45
  const explodeProgress = frame >= 45
    ? spring({ frame: frame - 45, fps, config: { damping: 10, stiffness: 100, mass: 0.6 }, durationInFrames: 20 })
    : 0;

  // Text reveal at frame 50
  const textSpring = spring({ frame: Math.max(0, frame - 50), fps, config: SPRING.ui, durationInFrames: 18 });

  // Camera dolly at frame 90+
  const dollyZoom = interpolate(frame, [90, 150], [1, 1.15], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // "מכיר את הסיפור?" at frame 100
  const storySpring = spring({ frame: Math.max(0, frame - 100), fps, config: SPRING.hero, durationInFrames: 18 });
  const storyBlur = interpolate(storySpring, [0, 1], [10, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: WARM.warmDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      {/* Ambient red pulse */}
      <div style={{
        position: 'absolute', width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(162,29,60,0.06) 0%, transparent 65%)',
        transform: `scale(${1 + Math.sin(frame * 0.03) * 0.1})`,
      }} />

      <VirtualCamera zoom={dollyZoom}>
        {/* Phone with notifications */}
        {frame < 90 && (
          <div style={{
            position: 'absolute', top: '25%', left: '50%',
            transform: `translate(-50%, -50%) scale(${phoneScale})`,
          }}>
            {/* Phone body */}
            <div style={{
              width: 200, height: 380, borderRadius: 28, background: '#18181B',
              border: '2px solid rgba(255,255,255,0.1)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ padding: 12, paddingTop: 40 }}>
                {notifications.map((notif, i) => {
                  const notifAppear = spring({
                    frame: Math.max(0, frame - i * notifStagger),
                    fps, config: SPRING.punch, durationInFrames: 12,
                  });

                  // Explosion offset
                  const angle = (i * 72 + 30) * (Math.PI / 180);
                  const explosionX = explodeProgress * Math.cos(angle) * 200;
                  const explosionY = explodeProgress * Math.sin(angle) * 200;
                  const explosionOpacity = interpolate(explodeProgress, [0, 0.8, 1], [1, 0.5, 0]);

                  return (
                    <div key={i} style={{
                      marginBottom: 8, padding: '8px 12px', borderRadius: 12,
                      background: 'rgba(239,68,68,0.12)',
                      border: '1px solid rgba(239,68,68,0.25)',
                      fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: '#EF4444',
                      direction: 'rtl',
                      opacity: notifAppear * explosionOpacity,
                      transform: `translateY(${interpolate(notifAppear, [0, 1], [15, 0])}px) translate(${explosionX}px, ${explosionY}px)`,
                    }}>
                      {notif}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Character — hands on head (frustrated) initially, then direct look */}
        <Character
          pose={frame < 90 ? 'frustrated' : 'standing'}
          expression={frame < 90 ? 'frustrated' : 'neutral'}
          shirtColor="white"
          delay={5}
          scale={1.8}
          style={{ position: 'absolute', bottom: '8%', right: '15%' }}
        />
      </VirtualCamera>

      {/* "47 הודעות..." text */}
      {frame >= 50 && frame < 100 && (
        <div style={{
          position: 'absolute', bottom: '18%', width: '80%', textAlign: 'center',
        }}>
          <TextReveal
            text="47 הודעות. 5 אפליקציות. אף אחת לא מדברת עם השנייה."
            delay={0} fontSize={28} fontWeight={700} color={BRAND.white}
            mode="words" stagger={2}
            style={{ justifyContent: 'center' }}
          />
        </div>
      )}

      {/* "מכיר את הסיפור?" — enormous */}
      {frame >= 100 && (
        <div style={{
          position: 'absolute', top: '35%', width: '100%', textAlign: 'center',
          ...brushedMetal(72, 'warm'),
          opacity: storySpring,
          filter: `blur(${storyBlur}px)`,
          transform: `scale(${interpolate(storySpring, [0, 1], [1.1, 1])})`,
        }}>
          מכיר את הסיפור?
        </div>
      )}

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 2: PROBLEM — "הכאב" [0:05–0:15] frames 0–300
// ═══════════════════════════════════════════════════════════
const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pains = [
    { text: 'ליד שנשרף כי שכחת לחזור', color: '#EF4444' },
    { text: 'חשבונית שנתקעה כי האקסל קרס', color: '#F59E0B' },
    { text: 'יום שישי — עוד לא סגרת את השבוע', color: '#C5A572' },
  ];

  // Cards stagger
  const cardStagger = 25;

  // Disintegration at frame 180
  const disintegrateActive = frame >= 180;
  const particles = useDisintegration(frame, 180, 30, 50);

  // Black moment: frames 210–225
  const blackOpacity = frame >= 210 && frame < 225 ? 1 : 0;

  // Light dot: frame 225+
  const lightSpring = spring({ frame: Math.max(0, frame - 225), fps, config: SPRING.smooth, durationInFrames: 25 });
  const lightSize = interpolate(lightSpring, [0, 1], [0, 200]);

  // "מה אם הכל היה במקום אחד?"
  const questionSpring = spring({ frame: Math.max(0, frame - 250), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: WARM.warmDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      {/* Pain cards */}
      {pains.map((pain, i) => {
        const appear = spring({
          frame: Math.max(0, frame - i * cardStagger),
          fps, config: SPRING.ui, durationInFrames: 20,
        });
        const fadeOut = disintegrateActive ? interpolate(frame, [180, 210], [1, 0], { extrapolateRight: 'clamp' }) : 1;

        return (
          <div key={i} style={{
            position: 'absolute',
            top: `${22 + i * 18}%`,
            left: '50%',
            transform: `translateX(-50%) translateY(${interpolate(appear, [0, 1], [30, 0])}px)`,
            opacity: appear * fadeOut,
          }}>
            <GlassCard width={420} delay={i * cardStagger} glowColor={pain.color}>
              <div style={{
                padding: '18px 24px', direction: 'rtl',
                fontFamily: HEEBO, fontSize: 20, fontWeight: 700, color: BRAND.white,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: pain.color, boxShadow: `0 0 12px ${pain.color}60`,
                }} />
                {pain.text}
              </div>
            </GlassCard>
          </div>
        );
      })}

      {/* Disintegration particles */}
      {disintegrateActive && frame < 225 && particles.map((p, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: `calc(40% + ${p.y}px)`, left: `calc(50% + ${p.x}px)`,
          width: p.size, height: p.size, borderRadius: 2,
          background: i % 3 === 0 ? '#EF4444' : 'rgba(255,255,255,0.3)',
          opacity: p.opacity,
          pointerEvents: 'none',
        }} />
      ))}

      {/* Black moment */}
      {blackOpacity > 0 && (
        <AbsoluteFill style={{ backgroundColor: '#000', opacity: blackOpacity }} />
      )}

      {/* Light dot */}
      {frame >= 225 && (
        <div style={{
          position: 'absolute',
          width: lightSize, height: lightSize, borderRadius: '50%',
          background: `radial-gradient(circle, ${WARM.candleGlow} 0%, rgba(255,200,100,0.1) 50%, transparent 70%)`,
        }} />
      )}

      {/* "מה אם הכל היה במקום אחד?" */}
      {frame >= 250 && (
        <div style={{
          position: 'absolute', textAlign: 'center',
          ...brushedMetal(44, 'warm'),
          opacity: questionSpring,
          transform: `scale(${interpolate(questionSpring, [0, 1], [0.9, 1])})`,
        }}>
          מה אם הכל — הכל — היה במקום אחד?
        </div>
      )}

      {/* Character */}
      <Character
        pose="standing"
        expression="neutral"
        shirtColor="white"
        delay={0}
        scale={1.6}
        opacity={frame < 180 ? 1 : interpolate(frame, [180, 200], [1, 0], { extrapolateRight: 'clamp' })}
        style={{ position: 'absolute', bottom: '5%', left: '10%' }}
      />

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 3: SOLUTION — "הפתרון" [0:15–0:30] frames 0–450
// ═══════════════════════════════════════════════════════════
const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo crystallize from light: 0–90
  const logoSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 25 });
  const logoBlur = interpolate(logoSpring, [0, 1], [15, 0]);

  // Feature rows: frames 90–210
  const features = [
    'ליד נכנס → AI מדרג אותו',
    'חשבונית → נשלחת בלחיצה',
    'צוות → רואים מי עושה מה',
    'תוכן → AI כותב בעברית',
  ];

  // Journey morph path: frames 210–330
  const journeySteps = [
    { label: 'ליד', color: MODULE_COLORS.system.accent },
    { label: 'AI מדרג', color: MODULE_COLORS.system.accent },
    { label: 'שיחה', color: MODULE_COLORS.system.accent },
    { label: 'הצעה', color: MODULE_COLORS.finance.accent },
    { label: 'חתימה', color: MODULE_COLORS.client.accent },
    { label: 'חשבונית', color: MODULE_COLORS.finance.accent },
  ];

  const journeyProgress = interpolate(frame, [210, 330], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // "AI שמבין עברית" frame 350+
  const hebrewSpring = spring({ frame: Math.max(0, frame - 350), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: WARM.warmDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      {/* Logo */}
      {frame < 120 && (
        <div style={{
          position: 'absolute',
          fontFamily: RUBIK, fontSize: 80, fontWeight: 800,
          color: BRAND.white,
          opacity: logoSpring,
          filter: `blur(${logoBlur}px)`,
          textShadow: `0 0 40px ${BRAND.primary}40`,
          letterSpacing: 2,
        }}>
          MISRAD AI
        </div>
      )}

      {/* Sub-text under logo */}
      {frame >= 30 && frame < 120 && (
        <div style={{
          position: 'absolute', top: '58%',
          ...brushedMetal(32, 'warm'),
          opacity: spring({ frame: Math.max(0, frame - 30), fps, config: SPRING.ui, durationInFrames: 18 }),
        }}>
          מקום אחד. לכל העסק.
        </div>
      )}

      {/* Feature rows */}
      {frame >= 90 && frame < 260 && (
        <div style={{ position: 'absolute', top: '20%', width: '80%', direction: 'rtl' }}>
          {features.map((feat, i) => {
            const rowSpring = spring({
              frame: Math.max(0, frame - 90 - i * 10),
              fps, config: SPRING.ui, durationInFrames: 15,
            });
            const rowY = interpolate(rowSpring, [0, 1], [20, 0]);

            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                marginBottom: 16, padding: '14px 20px', borderRadius: 16,
                background: 'rgba(24,24,27,0.65)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
                opacity: rowSpring,
                transform: `translateX(${interpolate(rowSpring, [0, 1], [40, 0])}px) translateY(${rowY}px)`,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: `linear-gradient(135deg, ${MODULE_COLORS.system.accent}, ${MODULE_COLORS.finance.accent})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: HEEBO, fontSize: 14, fontWeight: 800, color: '#fff',
                }}>
                  ✓
                </div>
                <span style={{ fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: BRAND.white }}>
                  {feat}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Journey path — continuous morph visualization */}
      {frame >= 210 && frame < 400 && (
        <div style={{ position: 'absolute', top: '30%', width: '85%', display: 'flex', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, direction: 'rtl' }}>
            {journeySteps.map((step, i) => {
              const stepProgress = interpolate(journeyProgress, [i / journeySteps.length, (i + 1) / journeySteps.length], [0, 1], {
                extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
              });

              return (
                <React.Fragment key={i}>
                  <div style={{
                    padding: '10px 14px', borderRadius: 14,
                    background: `${step.color}${stepProgress > 0.5 ? '30' : '10'}`,
                    border: `1px solid ${step.color}${stepProgress > 0.5 ? '50' : '20'}`,
                    fontFamily: HEEBO, fontSize: 14, fontWeight: 700,
                    color: stepProgress > 0.5 ? BRAND.white : BRAND.muted,
                    opacity: Math.max(0.3, stepProgress),
                    transform: `scale(${interpolate(stepProgress, [0, 1], [0.85, 1])})`,
                    boxShadow: stepProgress > 0.8 ? `0 0 20px ${step.color}30` : 'none',
                    whiteSpace: 'nowrap',
                  }}>
                    {step.label}
                  </div>
                  {i < journeySteps.length - 1 && (
                    <div style={{
                      width: 20, height: 2,
                      background: `linear-gradient(90deg, ${step.color}40, ${journeySteps[i + 1].color}40)`,
                      opacity: stepProgress,
                    }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* "והכל — עם AI שמבין עברית" */}
      {frame >= 350 && (
        <div style={{
          position: 'absolute', bottom: '25%', textAlign: 'center',
        }}>
          <div style={{
            ...brushedMetal(40, 'gold'),
            opacity: hebrewSpring,
            transform: `scale(${interpolate(hebrewSpring, [0, 1], [0.9, 1])})`,
          }}>
            והכל — עם AI שמבין עברית.
          </div>
          <div style={{
            fontFamily: HEEBO, fontSize: 20, fontWeight: 600, color: BRAND.muted,
            marginTop: 8, direction: 'rtl',
            opacity: spring({ frame: Math.max(0, frame - 370), fps, config: SPRING.ui, durationInFrames: 15 }),
          }}>
            לא תרגום. שפת אם.
          </div>
        </div>
      )}

      {/* Character */}
      <Character
        pose={frame < 210 ? 'standing' : 'pointing'}
        expression="confident"
        shirtColor="white"
        delay={20}
        scale={1.6}
        style={{ position: 'absolute', bottom: '5%', right: '8%' }}
      />

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 4: DIFFERENTIATOR — "שומר שבת + לוח עברי" [0:30–0:45]
// ═══════════════════════════════════════════════════════════
const DifferentiatorScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Clock: 0–150
  const clockSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 20 });
  const clockHourAngle = interpolate(frame, [0, 50, 100, 150], [0, 5, 10, 15]); // subtle advance

  // Shabbat mode button press: frame 60
  const buttonPressed = frame >= 60;
  const lockSpring = spring({ frame: Math.max(0, frame - 80), fps, config: SPRING.ui, durationInFrames: 20 });

  // UI transition to warm dark: frames 60–90
  const warmTransition = interpolate(frame, [60, 90], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Calendar: frames 150–300
  const calendarSpring = spring({ frame: Math.max(0, frame - 150), fps, config: SPRING.smooth, durationInFrames: 25 });

  const hebrewDates = [
    { date: 'ערב ר"ה', action: 'גבייה 3 ימים לפני' },
    { date: 'ערב יוה"כ', action: 'SMS ברכה ללקוחות' },
    { date: 'ערב סוכות', action: 'סגירת שבוע מוקדם' },
  ];

  // "אין עוד מערכת כזו" — frame 350+
  const uniqueSpring = spring({ frame: Math.max(0, frame - 350), fps, config: SPRING.hero, durationInFrames: 22 });

  return (
    <AbsoluteFill style={{
      backgroundColor: interpolate(warmTransition, [0, 1], [0, 1]) > 0.5
        ? WARM.warmSurface : WARM.warmDark,
      justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
      transition: 'background-color 1s ease',
    }}>
      {/* Warm ambient glow */}
      <div style={{
        position: 'absolute', width: 500, height: 500, borderRadius: '50%',
        background: `radial-gradient(circle, ${WARM.goldGlow} 0%, transparent 60%)`,
        opacity: 0.3 + warmTransition * 0.4,
      }} />

      {/* Shabbat Mode UI */}
      {frame < 150 && (
        <div style={{ position: 'absolute', top: '20%', textAlign: 'center' }}>
          {/* Clock */}
          <div style={{
            width: 200, height: 200, borderRadius: '50%',
            border: `3px solid ${WARM.amber}40`,
            position: 'relative', margin: '0 auto',
            opacity: clockSpring,
            transform: `scale(${interpolate(clockSpring, [0, 1], [0.8, 1])})`,
          }}>
            {/* Hour hand */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%', width: 4, height: 50,
              background: WARM.amber, borderRadius: 2, transformOrigin: 'bottom center',
              transform: `translate(-50%, -100%) rotate(${-30 + clockHourAngle}deg)`,
            }} />
            {/* Minute hand */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%', width: 2, height: 70,
              background: BRAND.white, borderRadius: 2, transformOrigin: 'bottom center',
              transform: `translate(-50%, -100%) rotate(${-90 + clockHourAngle * 3}deg)`,
            }} />
            {/* Center dot */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%', width: 8, height: 8,
              borderRadius: '50%', background: WARM.amber,
              transform: 'translate(-50%, -50%)',
            }} />
          </div>

          {/* "יום שישי" */}
          <div style={{
            fontFamily: HEEBO, fontSize: 28, fontWeight: 700, color: WARM.amber,
            marginTop: 16, direction: 'rtl',
          }}>
            יום שישי
          </div>

          {/* Shabbat mode button */}
          <div style={{
            marginTop: 24, padding: '14px 36px', borderRadius: 20,
            background: buttonPressed
              ? `linear-gradient(135deg, ${WARM.amber}, ${WARM.amberDark})`
              : 'rgba(255,255,255,0.08)',
            border: `1px solid ${WARM.amber}40`,
            fontFamily: HEEBO, fontSize: 18, fontWeight: 800, color: '#fff',
            transform: buttonPressed ? 'scale(0.97)' : 'scale(1)',
            boxShadow: buttonPressed ? `0 0 30px ${WARM.goldGlow}` : 'none',
            transition: 'all 0.2s',
          }}>
            מצב שבת
          </div>

          {/* Lock overlay */}
          {lockSpring > 0 && (
            <div style={{
              position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
              width: 220, height: 320, borderRadius: 20,
              background: 'rgba(26,21,32,0.85)',
              backdropFilter: 'blur(20px)',
              border: `2px solid ${WARM.amber}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: lockSpring,
            }}>
              <div style={{ fontFamily: HEEBO, fontSize: 36, color: WARM.amber }}>
                🔒
              </div>
            </div>
          )}
        </div>
      )}

      {/* Text: "המערכת יוצאת לשבת" */}
      {frame >= 100 && frame < 150 && (
        <div style={{ position: 'absolute', bottom: '20%' }}>
          <TextReveal
            text="המערכת יוצאת לשבת. לבד."
            delay={0} fontSize={36} fontWeight={900} color={WARM.amber}
            mode="words" stagger={3}
            style={{ justifyContent: 'center' }}
          />
        </div>
      )}

      {/* Hebrew Calendar */}
      {frame >= 150 && frame < 350 && (
        <div style={{
          position: 'absolute', top: '15%', width: '85%',
          opacity: calendarSpring,
          transform: `translateY(${interpolate(calendarSpring, [0, 1], [30, 0])}px)`,
        }}>
          {hebrewDates.map((item, i) => {
            const dateSpring = spring({
              frame: Math.max(0, frame - 150 - i * 12),
              fps, config: SPRING.ui, durationInFrames: 18,
            });

            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                marginBottom: 16, padding: '16px 20px', borderRadius: 18,
                background: 'rgba(24,24,27,0.65)',
                backdropFilter: 'blur(20px)',
                border: `1px solid ${WARM.amber}25`,
                direction: 'rtl',
                opacity: dateSpring,
                transform: `translateX(${interpolate(dateSpring, [0, 1], [30, 0])}px)`,
              }}>
                <div style={{
                  padding: '6px 14px', borderRadius: 10,
                  background: `${WARM.amber}20`, border: `1px solid ${WARM.amber}40`,
                  fontFamily: HEEBO, fontSize: 16, fontWeight: 800, color: WARM.amber,
                  whiteSpace: 'nowrap',
                }}>
                  {item.date}
                </div>
                <span style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 600, color: BRAND.white }}>
                  {item.action}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* "אין עוד מערכת כזו." */}
      {frame >= 350 && (
        <div style={{
          ...brushedMetal(56, 'gold'),
          opacity: uniqueSpring,
          transform: `scale(${interpolate(uniqueSpring, [0, 1], [0.85, 1])})`,
          textAlign: 'center',
        }}>
          אין עוד מערכת כזו.
          <div style={{
            ...brushedMetal(24, 'warm'),
            marginTop: 8,
            opacity: spring({ frame: Math.max(0, frame - 370), fps, config: SPRING.ui, durationInFrames: 15 }),
          }}>
            בשום מקום.
          </div>
        </div>
      )}

      {/* Character */}
      <Character
        pose="confident"
        expression="confident"
        shirtColor="white"
        delay={10}
        scale={1.5}
        style={{ position: 'absolute', bottom: '5%', right: '10%' }}
      />

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 5: PROOF — "מספרים" [0:45–0:55] frames 0–300
// ═══════════════════════════════════════════════════════════
const ProofScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const facts = [
    { value: '₪149', label: 'מתחילים', color: MODULE_COLORS.finance.accent },
    { value: '5 דק\'', label: 'מההרשמה לעבודה', color: BRAND.primary },
    { value: '7 ימים', label: 'ניסיון חינם', color: WARM.amber },
  ];

  // Feature list: frame 120+
  const capabilities = [
    'מכירות חכמות + AI',
    'חשבוניות + מעקב תשלומים',
    'ניהול לקוחות + פורטל',
    'שיווק + תוכן AI בעברית',
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: WARM.warmDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      {/* Facts cards */}
      {frame < 150 && (
        <div style={{ display: 'flex', gap: 20, direction: 'rtl' }}>
          {facts.map((fact, i) => {
            const roll = useSlotRoll(frame, fps, fact.value, i * 15, 20);
            const cardSpring = spring({ frame: Math.max(0, frame - i * 15), fps, config: SPRING.ui, durationInFrames: 18 });

            return (
              <div key={i} style={{
                textAlign: 'center', opacity: cardSpring,
                transform: `translateY(${interpolate(cardSpring, [0, 1], [25, 0])}px)`,
              }}>
                <GlassCard width={180} delay={i * 15} glowColor={fact.color}>
                  <div style={{ padding: '20px 16px', textAlign: 'center' }}>
                    <div style={{
                      fontFamily: RUBIK, fontSize: 36, fontWeight: 800, color: BRAND.white,
                      filter: `blur(${roll.motionBlur}px)`,
                      textShadow: `0 0 20px ${fact.color}40`,
                    }}>
                      {roll.display}
                    </div>
                    <div style={{
                      fontFamily: HEEBO, fontSize: 14, fontWeight: 600, color: BRAND.muted,
                      marginTop: 6, direction: 'rtl',
                    }}>
                      {fact.label}
                    </div>
                  </div>
                </GlassCard>
              </div>
            );
          })}
        </div>
      )}

      {/* Capabilities list */}
      {frame >= 120 && (
        <div style={{ position: 'absolute', top: '22%', width: '82%', direction: 'rtl' }}>
          {capabilities.map((cap, i) => {
            const rowSpring = spring({
              frame: Math.max(0, frame - 120 - i * 10),
              fps, config: SPRING.ui, durationInFrames: 15,
            });

            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                marginBottom: 14, padding: '12px 18px', borderRadius: 14,
                background: 'rgba(24,24,27,0.6)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                opacity: rowSpring,
                transform: `translateX(${interpolate(rowSpring, [0, 1], [30, 0])}px)`,
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 7,
                  background: BRAND.gradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: HEEBO, fontSize: 12, fontWeight: 800, color: '#fff',
                }}>
                  ✓
                </div>
                <span style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 700, color: BRAND.white }}>
                  {cap}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Character */}
      <Character
        pose="confident"
        expression="smile"
        shirtColor="white"
        delay={5}
        scale={1.5}
        style={{ position: 'absolute', bottom: '5%', right: '8%' }}
      />

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 6: CTA [0:55–1:15] frames 0–600
// ═══════════════════════════════════════════════════════════
const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Brand reveal: 0–150
  const brandSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 22 });

  // Tag lines: stagger from frame 30
  const tags = [
    'מערכת הפעלה לעסק.',
    'בעברית.',
    'עם AI.',
    'ושומרת שבת.',
  ];

  // Badges: from frame 150
  const badges = [
    { emoji: '🕎', text: 'שומרת שבת וחג' },
    { emoji: '📅', text: 'לוח עברי מובנה' },
    { emoji: '🔐', text: '7 ימי ניסיון חינם' },
  ];

  // CTA button: frame 300
  const buttonSpring = spring({ frame: Math.max(0, frame - 300), fps, config: SPRING.punch, durationInFrames: 18 });
  const buttonPulse = Math.sin((frame - 300) * 0.06) * 0.03 + 1;

  // Fade out: last 30 frames
  const fadeOut = interpolate(frame, [570, 600], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{
      backgroundColor: WARM.warmDark,
      justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
      opacity: fadeOut,
    }}>
      {/* Accent glow */}
      <div style={{
        position: 'absolute', width: 500, height: 500, borderRadius: '50%',
        background: `radial-gradient(circle, ${BRAND.primary}12 0%, transparent 65%)`,
        transform: `scale(${1 + Math.sin(frame * 0.03) * 0.08})`,
      }} />

      {/* "MISRAD AI" */}
      <div style={{
        fontFamily: RUBIK, fontSize: 72, fontWeight: 800, color: BRAND.white,
        letterSpacing: 2,
        opacity: brandSpring,
        transform: `scale(${interpolate(brandSpring, [0, 1], [0.8, 1])})`,
        textShadow: `0 0 40px ${BRAND.primary}30`,
        marginBottom: 16,
      }}>
        MISRAD AI
      </div>

      {/* Tag lines */}
      <div style={{ textAlign: 'center', direction: 'rtl', marginBottom: 32 }}>
        {tags.map((tag, i) => {
          const tagSpring = spring({
            frame: Math.max(0, frame - 30 - i * 8),
            fps, config: SPRING.ui, durationInFrames: 15,
          });
          return (
            <div key={i} style={{
              fontFamily: HEEBO, fontSize: 24, fontWeight: 700, color: BRAND.muted,
              marginBottom: 4,
              opacity: tagSpring,
              transform: `translateY(${interpolate(tagSpring, [0, 1], [15, 0])}px)`,
            }}>
              {tag}
            </div>
          );
        })}
      </div>

      {/* Badges */}
      {frame >= 150 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
          {badges.map((badge, i) => {
            const bSpring = spring({
              frame: Math.max(0, frame - 150 - i * 10),
              fps, config: SPRING.ui, durationInFrames: 16,
            });
            return (
              <div key={i} style={{
                padding: '8px 18px', borderRadius: 20,
                background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${WARM.amber}25`,
                fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: BRAND.muted,
                display: 'flex', alignItems: 'center', gap: 6,
                opacity: bSpring,
                transform: `translateY(${interpolate(bSpring, [0, 1], [10, 0])}px)`,
              }}>
                <span>{badge.emoji}</span>
                <span style={{ direction: 'rtl' }}>{badge.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* CTA Button */}
      {frame >= 300 && (
        <div style={{
          padding: '18px 56px', borderRadius: 50,
          background: BRAND.gradient,
          boxShadow: `0 12px 40px ${BRAND.primary}30`,
          opacity: buttonSpring,
          transform: `scale(${interpolate(buttonSpring, [0, 1], [0.8, 1]) * buttonPulse})`,
          marginBottom: 16,
        }}>
          <span style={{ fontFamily: RUBIK, fontSize: 28, fontWeight: 800, color: '#fff' }}>
            להתחיל — חינם
          </span>
        </div>
      )}

      {/* URL */}
      {frame >= 320 && (
        <div style={{
          fontFamily: RUBIK, fontSize: 24, fontWeight: 700, color: BRAND.muted,
          opacity: spring({ frame: Math.max(0, frame - 320), fps, config: SPRING.ui, durationInFrames: 15 }),
        }}>
          misrad-ai.com
        </div>
      )}

      {/* Character walking into light */}
      {frame >= 400 && (
        <Character
          pose="walking"
          expression="confident"
          shirtColor="white"
          delay={400}
          scale={1.2}
          opacity={interpolate(frame, [400, 500, 570, 600], [0, 1, 1, 0], { extrapolateRight: 'clamp' })}
          style={{
            position: 'absolute', bottom: '10%',
            left: `${interpolate(frame, [400, 600], [30, 50], { extrapolateRight: 'clamp' })}%`,
          }}
        />
      )}

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPOSITION — L1 Launch Hero Video (75s)
// ═══════════════════════════════════════════════════════════
export const L1HeroVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={T.HOOK.from} durationInFrames={T.HOOK.dur}><HookScene /></Sequence>
      <Sequence from={T.PROBLEM.from} durationInFrames={T.PROBLEM.dur}><ProblemScene /></Sequence>
      <Sequence from={T.SOLUTION.from} durationInFrames={T.SOLUTION.dur}><SolutionScene /></Sequence>
      <Sequence from={T.DIFFERENTIATOR.from} durationInFrames={T.DIFFERENTIATOR.dur}><DifferentiatorScene /></Sequence>
      <Sequence from={T.PROOF.from} durationInFrames={T.PROOF.dur}><ProofScene /></Sequence>
      <Sequence from={T.CTA.from} durationInFrames={T.CTA.dur}><CTAScene /></Sequence>
    </AbsoluteFill>
  );
};
