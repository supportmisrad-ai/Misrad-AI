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
import { NoiseLayer, TextReveal } from '../shared/components';
import { L1_TIMING, WARM } from './shared/launch-config';
import {
  F, CARD_W, PAD, gradientText, sceneBg, fillCenter, glassCard, statCard,
  CheckIcon, LockClosedIcon, ShieldCheckIcon, CalendarIcon, FlowArrow, DangerDot, AnalogClock,
} from './shared/launch-design';

const T = L1_TIMING;

// ─── Helpers ────────────────────────────────────────────

const useDisintegration = (frame: number, startFrame: number, duration: number, count: number) => {
  const f = Math.max(0, frame - startFrame);
  const progress = Math.min(f / duration, 1);
  return useMemo(() =>
    Array.from({ length: count }, (_, i) => {
      const seed = i * 137.5;
      const angle = (seed % 360) * (Math.PI / 180);
      const dist = progress * (80 + (seed % 120));
      const x = Math.cos(angle) * dist;
      const y = Math.sin(angle) * dist - progress * 40;
      const opacity = Math.max(0, 1 - progress * (1.1 + (seed % 0.4)));
      const size = 5 + (seed % 8);
      return { x, y, opacity, size };
    }), [progress, count]);
};

// ═══════════════════════════════════════════════════════════
// SCENE 1: HOOK — "הבלגן שלך" [0:00–0:05] frames 0–150
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const notifications = [
    { text: 'וואטסאפ — 47 הודעות חדשות', color: '#EF4444' },
    { text: 'אקסל — הקובץ לא נשמר', color: '#F59E0B' },
    { text: 'גוגל שיטס — גרסה לא מעודכנת', color: '#10B981' },
    { text: 'CRM ישן — 12 לידים ממתינים', color: '#3B82F6' },
    { text: 'חשבונית ידנית — חסרה חתימה', color: '#F97316' },
  ];

  const phoneSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 });
  const phoneScale = interpolate(phoneSpring, [0, 1], [0.85, 1]);

  const explodeProgress = frame >= 70
    ? spring({ frame: frame - 70, fps, config: { damping: 10, stiffness: 100, mass: 0.6 }, durationInFrames: 25 })
    : 0;

  const storySpring = spring({ frame: Math.max(0, frame - 100), fps, config: SPRING.hero, durationInFrames: 20 });
  const storyBlur = interpolate(storySpring, [0, 1], [12, 0]);

  return (
    <AbsoluteFill style={{ ...sceneBg('rgba(162,29,60,0.08)', '40%'), ...fillCenter }}>
      {/* Ambient red pulse */}
      <div style={{
        position: 'absolute', width: 800, height: 800, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(239,68,68,0.06) 0%, transparent 65%)',
        transform: `scale(${1 + Math.sin(frame * 0.04) * 0.12})`,
      }} />

      {/* Phone with notifications — large 480×860 */}
      {frame < 95 && (
        <div style={{
          position: 'absolute', top: '8%', left: '50%',
          transform: `translateX(-50%) scale(${phoneScale})`,
        }}>
          <div style={{
            width: 480, height: 860, borderRadius: 48, background: '#18181B',
            border: '3px solid rgba(255,255,255,0.12)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 120px rgba(239,68,68,0.08)',
            position: 'relative', overflow: 'hidden', padding: '60px 28px 28px',
          }}>
            {/* Status bar */}
            <div style={{
              position: 'absolute', top: 16, left: 28, right: 28,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontFamily: HEEBO, fontSize: 18, color: 'rgba(255,255,255,0.4)' }}>47 התראות</span>
              <span style={{ fontFamily: HEEBO, fontSize: 18, color: 'rgba(255,255,255,0.3)' }}>13:45</span>
            </div>

            {notifications.map((notif, i) => {
              const appear = spring({
                frame: Math.max(0, frame - 5 - i * 7),
                fps, config: SPRING.punch, durationInFrames: 14,
              });
              const angle = (i * 72 + 30) * (Math.PI / 180);
              const ex = explodeProgress * Math.cos(angle) * 350;
              const ey = explodeProgress * Math.sin(angle) * 350;
              const eo = interpolate(explodeProgress, [0, 0.7, 1], [1, 0.3, 0]);

              return (
                <div key={i} style={{
                  marginBottom: 14, padding: '18px 24px', borderRadius: 18,
                  background: `${notif.color}15`,
                  borderRight: `4px solid ${notif.color}`,
                  border: `1px solid ${notif.color}30`,
                  borderRightWidth: 4,
                  fontFamily: HEEBO, fontSize: F.small, fontWeight: 700, color: notif.color,
                  direction: 'rtl', textAlign: 'right',
                  opacity: appear * eo,
                  transform: `translateY(${interpolate(appear, [0, 1], [20, 0])}px) translate(${ex}px, ${ey}px)`,
                }}>
                  <DangerDot size={10} color={notif.color} />
                  <span style={{ marginRight: 12 }}>{notif.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* "47 הודעות..." — large text */}
      {frame >= 50 && frame < 100 && (
        <div style={{ position: 'absolute', bottom: '12%', width: CARD_W, textAlign: 'center' }}>
          <TextReveal
            text="47 הודעות. 5 אפליקציות. אף אחת לא מדברת עם השנייה."
            delay={0} fontSize={F.body} fontWeight={700} color={BRAND.white}
            mode="words" stagger={2}
            style={{ justifyContent: 'center' }}
          />
        </div>
      )}

      {/* "מכיר את הסיפור?" — hero text */}
      {frame >= 100 && (
        <div style={{
          position: 'absolute', top: '38%', width: '100%', textAlign: 'center',
          ...gradientText(F.hero, 'warm'),
          opacity: storySpring,
          filter: `blur(${storyBlur}px)`,
          transform: `scale(${interpolate(storySpring, [0, 1], [1.08, 1])})`,
        }}>
          מכיר את הסיפור?
        </div>
      )}

      <NoiseLayer opacity={0.015} />
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
    { text: 'יום שישי — עוד לא סגרת את השבוע', color: WARM.amber },
  ];

  const cardStagger = 25;
  const disintegrateActive = frame >= 180;
  const particles = useDisintegration(frame, 180, 35, 60);

  const blackOpacity = frame >= 215 && frame < 235 ? 1 : 0;
  const lightSpring = spring({ frame: Math.max(0, frame - 235), fps, config: SPRING.smooth, durationInFrames: 25 });
  const lightSize = interpolate(lightSpring, [0, 1], [0, 400]);
  const questionSpring = spring({ frame: Math.max(0, frame - 255), fps, config: SPRING.hero, durationInFrames: 22 });

  return (
    <AbsoluteFill style={{ ...sceneBg('rgba(239,68,68,0.05)', '45%'), ...fillCenter }}>
      {/* Pain cards — full width */}
      {pains.map((pain, i) => {
        const appear = spring({
          frame: Math.max(0, frame - i * cardStagger),
          fps, config: SPRING.ui, durationInFrames: 20,
        });
        const fadeOut = disintegrateActive
          ? interpolate(frame, [180, 215], [1, 0], { extrapolateRight: 'clamp' })
          : 1;

        return (
          <div key={i} style={{
            position: 'absolute',
            top: `${18 + i * 16}%`,
            left: '50%',
            transform: `translateX(-50%) translateX(${interpolate(appear, [0, 1], [60, 0])}px)`,
            opacity: appear * fadeOut,
          }}>
            <div style={{
              ...glassCard(pain.color),
              display: 'flex', alignItems: 'center', gap: 20,
            }}>
              <DangerDot size={16} color={pain.color} />
              <span style={{
                fontFamily: HEEBO, fontSize: F.body, fontWeight: 700, color: BRAND.white,
              }}>
                {pain.text}
              </span>
            </div>
          </div>
        );
      })}

      {/* Disintegration particles — larger */}
      {disintegrateActive && frame < 235 && particles.map((p, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: `calc(40% + ${p.y}px)`, left: `calc(50% + ${p.x}px)`,
          width: p.size, height: p.size, borderRadius: 3,
          background: i % 3 === 0 ? '#EF4444' : 'rgba(255,255,255,0.25)',
          opacity: p.opacity, pointerEvents: 'none',
        }} />
      ))}

      {/* Black moment */}
      {blackOpacity > 0 && (
        <AbsoluteFill style={{ backgroundColor: '#050508', opacity: blackOpacity }} />
      )}

      {/* Golden light dot */}
      {frame >= 235 && (
        <div style={{
          position: 'absolute',
          width: lightSize, height: lightSize, borderRadius: '50%',
          background: `radial-gradient(circle, ${WARM.candleGlow} 0%, rgba(255,200,100,0.08) 50%, transparent 70%)`,
        }} />
      )}

      {/* "מה אם הכל היה במקום אחד?" — hero */}
      {frame >= 255 && (
        <div style={{
          position: 'absolute', textAlign: 'center', width: '90%',
          ...gradientText(F.title, 'gold'),
          opacity: questionSpring,
          transform: `scale(${interpolate(questionSpring, [0, 1], [0.92, 1])})`,
        }}>
          מה אם הכל — הכל — היה במקום אחד?
        </div>
      )}

      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 3: SOLUTION — "הפתרון" [0:15–0:30] frames 0–450
// ═══════════════════════════════════════════════════════════
const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 25 });
  const logoBlur = interpolate(logoSpring, [0, 1], [15, 0]);

  const features = [
    { text: 'ליד נכנס → AI מדרג אותו', color: MODULE_COLORS.system.accent },
    { text: 'חשבונית → נשלחת בלחיצה בוואטסאפ', color: MODULE_COLORS.finance.accent },
    { text: 'צוות → רואים מי עושה מה', color: MODULE_COLORS.operations?.accent || '#10B981' },
    { text: 'תוכן → AI כותב בעברית אמיתית', color: MODULE_COLORS.social.accent },
  ];

  const journeySteps = [
    { label: 'ליד', color: MODULE_COLORS.system.accent },
    { label: 'AI מדרג', color: MODULE_COLORS.system.accent },
    { label: 'שיחה', color: MODULE_COLORS.system.accent },
    { label: 'הצעה', color: MODULE_COLORS.finance.accent },
    { label: 'חתימה', color: MODULE_COLORS.client.accent },
    { label: 'חשבונית', color: MODULE_COLORS.finance.accent },
  ];

  const journeyProgress = interpolate(frame, [210, 340], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const hebrewSpring = spring({ frame: Math.max(0, frame - 360), fps, config: SPRING.hero, durationInFrames: 22 });

  return (
    <AbsoluteFill style={{ ...sceneBg('rgba(99,102,241,0.06)', '35%'), ...fillCenter }}>
      {/* Logo crystallize */}
      {frame < 130 && (
        <div style={{ position: 'absolute', textAlign: 'center', opacity: logoSpring, filter: `blur(${logoBlur}px)` }}>
          <div style={{
            fontFamily: RUBIK, fontSize: 96, fontWeight: 800, color: BRAND.white,
            textShadow: `0 0 60px ${BRAND.primary}35`, letterSpacing: 4,
          }}>
            MISRAD AI
          </div>
          {frame >= 25 && (
            <div style={{
              ...gradientText(F.subtitle, 'warm'), marginTop: 12,
              opacity: spring({ frame: Math.max(0, frame - 25), fps, config: SPRING.ui, durationInFrames: 18 }),
            }}>
              מקום אחד. לכל העסק.
            </div>
          )}
        </div>
      )}

      {/* Feature rows — full width */}
      {frame >= 90 && frame < 260 && (
        <div style={{ position: 'absolute', top: '15%', width: CARD_W, direction: 'rtl' as const }}>
          {features.map((feat, i) => {
            const rs = spring({ frame: Math.max(0, frame - 90 - i * 12), fps, config: SPRING.ui, durationInFrames: 16 });
            return (
              <div key={i} style={{
                ...glassCard(feat.color), marginBottom: 18,
                display: 'flex', alignItems: 'center', gap: 18,
                opacity: rs, transform: `translateX(${interpolate(rs, [0, 1], [50, 0])}px)`,
              }}>
                <CheckIcon size={36} color={feat.color} />
                <span style={{ fontFamily: HEEBO, fontSize: F.body, fontWeight: 700, color: BRAND.white }}>{feat.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Journey pipeline — large steps */}
      {frame >= 210 && frame < 400 && (
        <div style={{
          position: 'absolute', top: '18%', width: CARD_W,
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, direction: 'rtl' as const,
        }}>
          {journeySteps.map((step, i) => {
            const sp = interpolate(journeyProgress, [i / journeySteps.length, (i + 0.8) / journeySteps.length], [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const lit = sp > 0.5;
            return (
              <React.Fragment key={i}>
                <div style={{
                  padding: '16px 28px', borderRadius: 20,
                  background: lit ? `${step.color}25` : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${lit ? step.color + '50' : 'rgba(255,255,255,0.08)'}`,
                  fontFamily: HEEBO, fontSize: F.label, fontWeight: 700,
                  color: lit ? BRAND.white : 'rgba(255,255,255,0.3)',
                  boxShadow: lit ? `0 0 30px ${step.color}20` : 'none',
                  transform: `scale(${interpolate(sp, [0, 1], [0.9, 1])})`,
                  opacity: Math.max(0.4, sp),
                }}>
                  {step.label}
                </div>
                {i < journeySteps.length - 1 && <FlowArrow size={24} color={lit ? `${step.color}60` : 'rgba(255,255,255,0.15)'} />}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* "והכל — עם AI שמבין עברית" */}
      {frame >= 360 && (
        <div style={{ position: 'absolute', textAlign: 'center', width: '90%' }}>
          <div style={{
            ...gradientText(F.title, 'gold'), opacity: hebrewSpring,
            transform: `scale(${interpolate(hebrewSpring, [0, 1], [0.92, 1])})`,
          }}>
            והכל — עם AI שמבין עברית.
          </div>
          <div style={{
            fontFamily: HEEBO, fontSize: F.body, fontWeight: 600, color: 'rgba(255,255,255,0.5)',
            marginTop: 16, direction: 'rtl',
            opacity: spring({ frame: Math.max(0, frame - 380), fps, config: SPRING.ui, durationInFrames: 16 }),
          }}>
            לא תרגום. שפת אם.
          </div>
        </div>
      )}

      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 4: DIFFERENTIATOR — "שומר שבת + לוח עברי" [0:30–0:45]
// ═══════════════════════════════════════════════════════════
const DifferentiatorScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const clockSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 22 });
  const hourAngle = interpolate(frame, [0, 120], [135, 150]);
  const minuteAngle = interpolate(frame, [0, 120], [180, 330]);

  const lockSpring = spring({ frame: Math.max(0, frame - 80), fps, config: SPRING.ui, durationInFrames: 22 });
  const warmGlow = interpolate(frame, [60, 100], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const hebrewDates = [
    { date: 'ערב ר"ה', action: 'גבייה אוטומטית 3 ימים לפני' },
    { date: 'ערב יוה"כ', action: 'SMS ברכה ללקוחות' },
    { date: 'ערב סוכות', action: 'סגירת שבוע מוקדם' },
  ];

  const calendarSpring = spring({ frame: Math.max(0, frame - 155), fps, config: SPRING.smooth, durationInFrames: 25 });
  const uniqueSpring = spring({ frame: Math.max(0, frame - 360), fps, config: SPRING.hero, durationInFrames: 22 });

  return (
    <AbsoluteFill style={{ ...sceneBg(`rgba(197,165,114,${0.04 + warmGlow * 0.06})`, '40%'), ...fillCenter }}>
      {/* Warm glow */}
      <div style={{
        position: 'absolute', width: 700, height: 700, borderRadius: '50%',
        background: `radial-gradient(circle, ${WARM.goldGlow} 0%, transparent 60%)`,
        opacity: 0.15 + warmGlow * 0.25,
      }} />

      {/* Clock + Shabbat mode */}
      {frame < 155 && (
        <div style={{
          position: 'absolute', top: '8%', textAlign: 'center',
          opacity: clockSpring, transform: `scale(${interpolate(clockSpring, [0, 1], [0.85, 1])})`,
        }}>
          <AnalogClock size={360} hourAngle={hourAngle} minuteAngle={minuteAngle} color={WARM.amber} />
          <div style={{ fontFamily: HEEBO, fontSize: F.subtitle, fontWeight: 800, color: WARM.amber, marginTop: 20, direction: 'rtl' as const }}>
            יום שישי
          </div>
          <div style={{
            marginTop: 28, padding: '18px 48px', borderRadius: 24, display: 'inline-block',
            background: frame >= 65 ? `linear-gradient(135deg, ${WARM.amber}, ${WARM.amberDark})` : 'rgba(255,255,255,0.08)',
            border: `2px solid ${WARM.amber}50`,
            fontFamily: HEEBO, fontSize: F.label, fontWeight: 800, color: '#fff',
            transform: frame >= 65 ? 'scale(0.96)' : 'scale(1)',
            boxShadow: frame >= 65 ? `0 0 50px ${WARM.goldGlow}` : 'none',
          }}>
            מצב שבת
          </div>
        </div>
      )}

      {/* Lock icon + text */}
      {lockSpring > 0 && frame < 155 && (
        <div style={{
          position: 'absolute', bottom: '15%', textAlign: 'center',
          opacity: lockSpring, transform: `scale(${interpolate(lockSpring, [0, 1], [0.85, 1])})`,
        }}>
          <LockClosedIcon size={80} color={WARM.amber} />
          <div style={{ fontFamily: HEEBO, fontSize: F.subtitle, fontWeight: 800, color: WARM.amber, marginTop: 16, direction: 'rtl' as const }}>
            המערכת יוצאת לשבת. לבד.
          </div>
        </div>
      )}

      {/* Hebrew calendar cards */}
      {frame >= 155 && frame < 360 && (
        <div style={{
          position: 'absolute', top: '12%', width: CARD_W,
          opacity: calendarSpring, transform: `translateY(${interpolate(calendarSpring, [0, 1], [30, 0])}px)`,
        }}>
          <div style={{
            fontFamily: HEEBO, fontSize: F.subtitle, fontWeight: 800, color: WARM.amber,
            direction: 'rtl', textAlign: 'right', marginBottom: 24,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <CalendarIcon size={40} color={WARM.amber} />
            לוח עברי מובנה
          </div>
          {hebrewDates.map((item, i) => {
            const ds = spring({ frame: Math.max(0, frame - 155 - i * 14), fps, config: SPRING.ui, durationInFrames: 18 });
            return (
              <div key={i} style={{
                ...glassCard(WARM.amber), marginBottom: 18,
                display: 'flex', alignItems: 'center', gap: 20,
                opacity: ds, transform: `translateX(${interpolate(ds, [0, 1], [40, 0])}px)`,
              }}>
                <div style={{
                  padding: '10px 22px', borderRadius: 14,
                  background: `${WARM.amber}18`, border: `1px solid ${WARM.amber}40`,
                  fontFamily: HEEBO, fontSize: F.label, fontWeight: 800, color: WARM.amber, whiteSpace: 'nowrap',
                }}>
                  {item.date}
                </div>
                <span style={{ fontFamily: HEEBO, fontSize: F.body, fontWeight: 600, color: BRAND.white }}>{item.action}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* "אין עוד מערכת כזו." */}
      {frame >= 360 && (
        <div style={{ position: 'absolute', textAlign: 'center', width: '90%' }}>
          <div style={{
            ...gradientText(F.title + 8, 'gold'), opacity: uniqueSpring,
            transform: `scale(${interpolate(uniqueSpring, [0, 1], [0.88, 1])})`,
          }}>
            אין עוד מערכת כזו.
          </div>
          <div style={{
            fontFamily: HEEBO, fontSize: F.body, fontWeight: 600, color: 'rgba(255,255,255,0.45)',
            marginTop: 16, direction: 'rtl',
            opacity: spring({ frame: Math.max(0, frame - 380), fps, config: SPRING.ui, durationInFrames: 16 }),
          }}>
            בשום מקום.
          </div>
        </div>
      )}

      <NoiseLayer opacity={0.015} />
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

  const capabilities = [
    { text: 'מכירות חכמות + AI', color: MODULE_COLORS.system.accent },
    { text: 'חשבוניות + מעקב תשלומים', color: MODULE_COLORS.finance.accent },
    { text: 'ניהול לקוחות + פורטל', color: MODULE_COLORS.client.accent },
    { text: 'שיווק + תוכן AI בעברית', color: MODULE_COLORS.social.accent },
  ];

  return (
    <AbsoluteFill style={{ ...sceneBg('rgba(99,102,241,0.05)', '40%'), ...fillCenter }}>
      {/* Stat cards */}
      {frame < 160 && (
        <div style={{ position: 'absolute', top: '15%', display: 'flex', gap: 24, direction: 'rtl' as const, width: CARD_W }}>
          {facts.map((fact, i) => {
            const cs = spring({ frame: Math.max(0, frame - i * 12), fps, config: SPRING.ui, durationInFrames: 18 });
            return (
              <div key={i} style={{
                ...statCard(fact.color), opacity: cs,
                transform: `translateY(${interpolate(cs, [0, 1], [30, 0])}px)`,
              }}>
                <div style={{
                  fontFamily: RUBIK, fontSize: F.title, fontWeight: 800, color: BRAND.white,
                  textShadow: `0 0 30px ${fact.color}30`,
                }}>
                  {fact.value}
                </div>
                <div style={{
                  fontFamily: HEEBO, fontSize: F.label, fontWeight: 600, color: 'rgba(255,255,255,0.5)',
                  marginTop: 10, direction: 'rtl',
                }}>
                  {fact.label}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Capabilities */}
      {frame >= 120 && (
        <div style={{ position: 'absolute', top: frame < 160 ? '55%' : '18%', width: CARD_W, direction: 'rtl' as const }}>
          {capabilities.map((cap, i) => {
            const rs = spring({ frame: Math.max(0, frame - 120 - i * 10), fps, config: SPRING.ui, durationInFrames: 16 });
            return (
              <div key={i} style={{
                ...glassCard(cap.color), marginBottom: 16,
                display: 'flex', alignItems: 'center', gap: 18,
                opacity: rs, transform: `translateX(${interpolate(rs, [0, 1], [40, 0])}px)`,
              }}>
                <CheckIcon size={36} color={cap.color} />
                <span style={{ fontFamily: HEEBO, fontSize: F.body, fontWeight: 700, color: BRAND.white }}>{cap.text}</span>
              </div>
            );
          })}
        </div>
      )}

      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 6: CTA [0:55–1:15] frames 0–600
// ═══════════════════════════════════════════════════════════
const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const brandSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 22 });
  const tags = ['מערכת הפעלה לעסק.', 'בעברית.', 'עם AI.', 'ושומרת שבת.'];

  const badges = [
    { icon: <ShieldCheckIcon size={36} color={WARM.amber} />, text: 'שומרת שבת וחג' },
    { icon: <CalendarIcon size={36} color={WARM.amber} />, text: 'לוח עברי מובנה' },
    { icon: <LockClosedIcon size={36} color={WARM.amber} />, text: '7 ימי ניסיון חינם' },
  ];

  const buttonSpring = spring({ frame: Math.max(0, frame - 300), fps, config: SPRING.punch, durationInFrames: 18 });
  const buttonPulse = frame >= 300 ? Math.sin((frame - 300) * 0.06) * 0.02 + 1 : 1;
  const fadeOut = interpolate(frame, [570, 600], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ ...sceneBg(`${BRAND.primary}08`, '35%'), ...fillCenter, opacity: fadeOut }}>
      {/* Brand glow */}
      <div style={{
        position: 'absolute', width: 700, height: 700, borderRadius: '50%',
        background: `radial-gradient(circle, ${BRAND.primary}10 0%, transparent 65%)`,
        transform: `scale(${1 + Math.sin(frame * 0.03) * 0.08})`,
      }} />

      {/* "MISRAD AI" */}
      <div style={{
        fontFamily: RUBIK, fontSize: 96, fontWeight: 800, color: BRAND.white,
        letterSpacing: 4, opacity: brandSpring,
        transform: `scale(${interpolate(brandSpring, [0, 1], [0.85, 1])})`,
        textShadow: `0 0 60px ${BRAND.primary}30`, marginBottom: 24,
      }}>
        MISRAD AI
      </div>

      {/* Tag lines */}
      <div style={{ textAlign: 'center', direction: 'rtl', marginBottom: 40 }}>
        {tags.map((tag, i) => {
          const ts = spring({ frame: Math.max(0, frame - 30 - i * 8), fps, config: SPRING.ui, durationInFrames: 16 });
          return (
            <div key={i} style={{
              fontFamily: HEEBO, fontSize: F.subtitle, fontWeight: 700, color: 'rgba(255,255,255,0.6)',
              marginBottom: 8, opacity: ts, transform: `translateY(${interpolate(ts, [0, 1], [18, 0])}px)`,
            }}>
              {tag}
            </div>
          );
        })}
      </div>

      {/* Badges with SVG icons */}
      {frame >= 150 && (
        <div style={{ display: 'flex', gap: 20, marginBottom: 48, direction: 'rtl' as const }}>
          {badges.map((badge, i) => {
            const bs = spring({ frame: Math.max(0, frame - 150 - i * 12), fps, config: SPRING.ui, durationInFrames: 16 });
            return (
              <div key={i} style={{
                padding: '14px 28px', borderRadius: 22,
                background: 'rgba(255,255,255,0.05)', border: `1px solid ${WARM.amber}25`,
                fontFamily: HEEBO, fontSize: F.label, fontWeight: 700, color: 'rgba(255,255,255,0.7)',
                display: 'flex', alignItems: 'center', gap: 12,
                opacity: bs, transform: `translateY(${interpolate(bs, [0, 1], [12, 0])}px)`,
              }}>
                {badge.icon}
                <span style={{ direction: 'rtl' }}>{badge.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* CTA Button */}
      {frame >= 300 && (
        <div style={{
          padding: '22px 72px', borderRadius: 60, background: BRAND.gradient,
          boxShadow: `0 16px 50px ${BRAND.primary}30`,
          opacity: buttonSpring,
          transform: `scale(${interpolate(buttonSpring, [0, 1], [0.8, 1]) * buttonPulse})`,
          marginBottom: 24,
        }}>
          <span style={{ fontFamily: RUBIK, fontSize: F.body, fontWeight: 800, color: '#fff' }}>להתחיל — חינם</span>
        </div>
      )}

      {/* URL */}
      {frame >= 330 && (
        <div style={{
          fontFamily: RUBIK, fontSize: F.label, fontWeight: 700, color: 'rgba(255,255,255,0.4)',
          opacity: spring({ frame: Math.max(0, frame - 330), fps, config: SPRING.ui, durationInFrames: 16 }),
          letterSpacing: 2,
        }}>
          misrad-ai.com
        </div>
      )}

      <NoiseLayer opacity={0.015} />
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
