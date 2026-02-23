import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from 'remotion';
import { BRAND, HEEBO, RUBIK, SPRING } from '../shared/config';
import { NoiseLayer, TextReveal } from '../shared/components';
import { L2_TIMING, WARM } from './shared/launch-config';
import {
  F, CARD_W, gradientText, sceneBg, fillCenter, glassCard, statCard,
  CheckIcon, LockClosedIcon, LockOpenIcon, ShieldCheckIcon, CalendarIcon,
  FlowArrow, DangerDot, AnalogClock, CandleSVG,
} from './shared/launch-design';

const T = L2_TIMING;

// ═══════════════════════════════════════════════════════════
// SCENE 1: HOOK — "יום שישי, השעה 3" [0:00–0:06] frames 0–180
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const clockSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 20 });
  const hourAngle = interpolate(frame, [0, 120], [90, 150]);
  const minuteAngle = interpolate(frame, [0, 120], [0, 180]);

  const textSpring = spring({ frame: Math.max(0, frame - 40), fps, config: SPRING.hero, durationInFrames: 20 });
  const questionSpring = spring({ frame: Math.max(0, frame - 100), fps, config: SPRING.hero, durationInFrames: 22 });

  return (
    <AbsoluteFill style={{ ...sceneBg(`${WARM.goldGlow}08`, '35%'), ...fillCenter }}>
      {/* Warm ambient glow */}
      <div style={{
        position: 'absolute', width: 800, height: 800, borderRadius: '50%',
        background: `radial-gradient(circle, ${WARM.goldGlow} 0%, transparent 60%)`,
        opacity: 0.12,
      }} />

      {/* Large clock */}
      <div style={{
        opacity: clockSpring,
        transform: `scale(${interpolate(clockSpring, [0, 1], [0.85, 1])})`,
      }}>
        <AnalogClock size={420} hourAngle={hourAngle} minuteAngle={minuteAngle} color={WARM.amber} />
      </div>

      {/* "יום שישי, השעה 3" */}
      {frame >= 40 && (
        <div style={{
          position: 'absolute', top: '62%', textAlign: 'center',
          ...gradientText(F.title, 'warm'),
          opacity: textSpring,
          transform: `translateY(${interpolate(textSpring, [0, 1], [20, 0])}px)`,
        }}>
          יום שישי, השעה 3
        </div>
      )}

      {/* "עוד לא סגרת את השבוע?" */}
      {frame >= 100 && (
        <div style={{
          position: 'absolute', top: '74%', textAlign: 'center',
          fontFamily: HEEBO, fontSize: F.subtitle, fontWeight: 700, color: 'rgba(255,255,255,0.6)',
          direction: 'rtl',
          opacity: questionSpring,
          transform: `translateY(${interpolate(questionSpring, [0, 1], [15, 0])}px)`,
        }}>
          עוד לא סגרת את השבוע?
        </div>
      )}

      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 2: PAIN — "הסיפור שחוזר" [0:06–0:15] frames 0–270
// ═══════════════════════════════════════════════════════════
const PainScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pains = [
    { text: 'חשבוניות שלא נשלחו', color: '#EF4444' },
    { text: 'לידים שנשכחו', color: '#F59E0B' },
    { text: 'שעות על אקסלים במקום עם המשפחה', color: WARM.amber },
    { text: 'לקוחות שלא קיבלו מענה', color: '#3B82F6' },
  ];

  const fadeToBlack = interpolate(frame, [210, 240], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const lightSpring = spring({ frame: Math.max(0, frame - 240), fps, config: SPRING.smooth, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ ...sceneBg('rgba(239,68,68,0.05)', '45%'), ...fillCenter }}>
      {/* Pain cards */}
      {frame < 210 && pains.map((pain, i) => {
        const appear = spring({
          frame: Math.max(0, frame - i * 18),
          fps, config: SPRING.ui, durationInFrames: 18,
        });
        return (
          <div key={i} style={{
            position: 'absolute', top: `${14 + i * 14}%`, left: '50%',
            transform: `translateX(-50%) translateX(${interpolate(appear, [0, 1], [50, 0])}px)`,
            opacity: appear,
          }}>
            <div style={{
              ...glassCard(pain.color),
              display: 'flex', alignItems: 'center', gap: 18,
            }}>
              <DangerDot size={16} color={pain.color} />
              <span style={{ fontFamily: HEEBO, fontSize: F.body, fontWeight: 700, color: BRAND.white }}>
                {pain.text}
              </span>
            </div>
          </div>
        );
      })}

      {/* Fade to dark */}
      {fadeToBlack > 0 && (
        <AbsoluteFill style={{ backgroundColor: '#050508', opacity: fadeToBlack }} />
      )}

      {/* Golden light emerges */}
      {frame >= 240 && (
        <div style={{
          position: 'absolute',
          width: interpolate(lightSpring, [0, 1], [0, 500]),
          height: interpolate(lightSpring, [0, 1], [0, 500]),
          borderRadius: '50%',
          background: `radial-gradient(circle, ${WARM.candleGlow} 0%, rgba(255,200,100,0.08) 50%, transparent 70%)`,
        }} />
      )}

      {/* "מה אם המערכת תדע לצאת לשבת — לבד?" */}
      {frame >= 245 && (
        <div style={{
          position: 'absolute', textAlign: 'center', width: '90%',
          ...gradientText(F.subtitle, 'gold'),
          opacity: spring({ frame: Math.max(0, frame - 245), fps, config: SPRING.hero, durationInFrames: 20 }),
        }}>
          מה אם המערכת תדע לצאת לשבת — לבד?
        </div>
      )}

      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 3: ANSWER — "התשובה" [0:15–0:30] frames 0–450
// ═══════════════════════════════════════════════════════════
const AnswerScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 25 });
  const logoBlur = interpolate(logoSpring, [0, 1], [15, 0]);

  const features = [
    { text: 'שולחת חשבוניות + תזכורות תשלום', icon: CheckIcon },
    { text: 'סוגרת משימות פתוחות', icon: CheckIcon },
    { text: 'שולחת SMS ברכה ללקוחות', icon: CheckIcon },
    { text: 'נועלת את המערכת — לא נוגעים!', icon: LockClosedIcon },
  ];

  const shabbatSpring = spring({ frame: Math.max(0, frame - 300), fps, config: SPRING.hero, durationInFrames: 22 });

  // Candle entrance at frame 340
  const candleSpring = spring({ frame: Math.max(0, frame - 340), fps, config: SPRING.smooth, durationInFrames: 25 });

  return (
    <AbsoluteFill style={{ ...sceneBg(`${WARM.goldGlow}08`, '35%'), ...fillCenter }}>
      {/* Logo */}
      {frame < 100 && (
        <div style={{
          position: 'absolute', textAlign: 'center',
          opacity: logoSpring, filter: `blur(${logoBlur}px)`,
        }}>
          <div style={{
            fontFamily: RUBIK, fontSize: 96, fontWeight: 800, color: BRAND.white,
            textShadow: `0 0 60px ${WARM.goldGlow}`, letterSpacing: 4,
          }}>
            MISRAD AI
          </div>
          {frame >= 25 && (
            <div style={{
              ...gradientText(F.subtitle, 'gold'), marginTop: 12,
              opacity: spring({ frame: Math.max(0, frame - 25), fps, config: SPRING.ui, durationInFrames: 18 }),
            }}>
              מצב שבת — אוטומטי לחלוטין
            </div>
          )}
        </div>
      )}

      {/* Feature list */}
      {frame >= 100 && frame < 300 && (
        <div style={{ position: 'absolute', top: '12%', width: CARD_W, direction: 'rtl' as const }}>
          <div style={{
            fontFamily: HEEBO, fontSize: F.subtitle, fontWeight: 800, color: WARM.amber,
            marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <ShieldCheckIcon size={44} color={WARM.amber} />
            מה המערכת עושה ביום שישי?
          </div>
          {features.map((feat, i) => {
            const rs = spring({ frame: Math.max(0, frame - 100 - i * 14), fps, config: SPRING.ui, durationInFrames: 18 });
            return (
              <div key={i} style={{
                ...glassCard(WARM.amber), marginBottom: 16,
                display: 'flex', alignItems: 'center', gap: 18,
                opacity: rs, transform: `translateX(${interpolate(rs, [0, 1], [50, 0])}px)`,
              }}>
                <feat.icon size={36} color={WARM.amber} />
                <span style={{ fontFamily: HEEBO, fontSize: F.body, fontWeight: 700, color: BRAND.white }}>
                  {feat.text}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* "ואתה? יוצא לשבת בראש שקט." */}
      {frame >= 300 && (
        <div style={{ position: 'absolute', textAlign: 'center', width: '90%' }}>
          <div style={{
            ...gradientText(F.title, 'gold'),
            opacity: shabbatSpring,
            transform: `scale(${interpolate(shabbatSpring, [0, 1], [0.92, 1])})`,
          }}>
            ואתה? יוצא לשבת בראש שקט.
          </div>
        </div>
      )}

      {/* Candle pair */}
      {frame >= 340 && (
        <div style={{
          position: 'absolute', bottom: '12%',
          display: 'flex', gap: 60, opacity: candleSpring,
          transform: `translateY(${interpolate(candleSpring, [0, 1], [30, 0])}px)`,
        }}>
          <CandleSVG size={100} flicker={Math.sin(frame * 0.12) * 0.5} />
          <CandleSVG size={100} flicker={Math.sin(frame * 0.12 + 2) * 0.5} />
        </div>
      )}

      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 4: CALENDAR — "לוח עברי" [0:30–0:42] frames 0–360
// ═══════════════════════════════════════════════════════════
const CalendarScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 22 });

  const hebrewEvents = [
    { date: 'ערב ר"ה', action: 'גבייה אוטומטית + סגירת חודש', color: WARM.amber },
    { date: 'ערב יוה"כ', action: 'SMS ברכה ללקוחות + שחרור משימות', color: '#F59E0B' },
    { date: 'ערב סוכות', action: 'סגירת שבוע + תזכורת לצוות', color: '#22C55E' },
    { date: 'ערב פסח', action: 'דו"ח חודשי + מצב חופשה', color: '#3B82F6' },
  ];

  const summarySpring = spring({ frame: Math.max(0, frame - 280), fps, config: SPRING.hero, durationInFrames: 22 });

  return (
    <AbsoluteFill style={{ ...sceneBg(`${WARM.goldGlow}06`, '40%'), ...fillCenter }}>
      {/* Title */}
      <div style={{
        position: 'absolute', top: '6%', width: CARD_W,
        display: 'flex', alignItems: 'center', gap: 18, direction: 'rtl' as const,
        opacity: titleSpring, transform: `translateY(${interpolate(titleSpring, [0, 1], [20, 0])}px)`,
      }}>
        <CalendarIcon size={56} color={WARM.amber} />
        <span style={{ fontFamily: HEEBO, fontSize: F.title, fontWeight: 800, color: WARM.amber }}>
          לוח עברי מובנה
        </span>
      </div>

      {/* Hebrew event cards */}
      {hebrewEvents.map((evt, i) => {
        const es = spring({ frame: Math.max(0, frame - 40 - i * 16), fps, config: SPRING.ui, durationInFrames: 18 });
        return (
          <div key={i} style={{
            position: 'absolute', top: `${18 + i * 14}%`, left: '50%',
            transform: `translateX(-50%) translateX(${interpolate(es, [0, 1], [40, 0])}px)`,
            opacity: es,
          }}>
            <div style={{
              ...glassCard(evt.color),
              display: 'flex', alignItems: 'center', gap: 20,
            }}>
              <div style={{
                padding: '10px 22px', borderRadius: 14, whiteSpace: 'nowrap',
                background: `${evt.color}18`, border: `1px solid ${evt.color}40`,
                fontFamily: HEEBO, fontSize: F.label, fontWeight: 800, color: evt.color,
              }}>
                {evt.date}
              </div>
              <FlowArrow size={24} color={`${evt.color}60`} />
              <span style={{ fontFamily: HEEBO, fontSize: F.body - 4, fontWeight: 600, color: BRAND.white }}>
                {evt.action}
              </span>
            </div>
          </div>
        );
      })}

      {/* "AI שיודע מתי ר"ה ומתי פסח" */}
      {frame >= 280 && (
        <div style={{
          position: 'absolute', bottom: '10%', textAlign: 'center', width: '90%',
          ...gradientText(F.subtitle, 'gold'),
          opacity: summarySpring,
          transform: `scale(${interpolate(summarySpring, [0, 1], [0.92, 1])})`,
        }}>
          AI שיודע מתי ר"ה ומתי פסח — ומכין הכל מראש.
        </div>
      )}

      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 5: WHAT'S INSIDE — "מה בפנים" [0:42–0:55] frames 0–390
// ═══════════════════════════════════════════════════════════
const WhatsInsideScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const modules = [
    { name: 'מכירות חכמות', desc: 'AI מדרג לידים, תזכורות מעקב', color: '#6366F1' },
    { name: 'חשבוניות + גבייה', desc: 'הפקה בלחיצה, מעקב תשלומים', color: '#22C55E' },
    { name: 'ניהול לקוחות', desc: 'פורטל לקוח, היסטוריה מלאה', color: '#3B82F6' },
    { name: 'שיווק + תוכן', desc: 'AI כותב בעברית, פוסטים ומיילים', color: '#F59E0B' },
    { name: 'תפעול + צוות', desc: 'משימות, לוח זמנים, דו"חות', color: '#10B981' },
  ];

  const stats = [
    { value: '₪149', label: 'מתחילים', color: '#22C55E' },
    { value: '5 דק\'', label: 'מההרשמה לעבודה', color: BRAND.primary },
    { value: 'חינם', label: '7 ימי ניסיון', color: WARM.amber },
  ];

  return (
    <AbsoluteFill style={{ ...sceneBg('rgba(99,102,241,0.05)', '38%'), ...fillCenter }}>
      {/* Module cards */}
      {frame < 240 && (
        <div style={{ position: 'absolute', top: '6%', width: CARD_W, direction: 'rtl' as const }}>
          <div style={{
            fontFamily: HEEBO, fontSize: F.subtitle, fontWeight: 800, color: BRAND.white,
            marginBottom: 20, direction: 'rtl',
            opacity: spring({ frame, fps, config: SPRING.ui, durationInFrames: 16 }),
          }}>
            הכל במקום אחד:
          </div>
          {modules.map((mod, i) => {
            const ms = spring({ frame: Math.max(0, frame - 20 - i * 10), fps, config: SPRING.ui, durationInFrames: 16 });
            return (
              <div key={i} style={{
                ...glassCard(mod.color), marginBottom: 14,
                display: 'flex', alignItems: 'center', gap: 18,
                opacity: ms, transform: `translateX(${interpolate(ms, [0, 1], [40, 0])}px)`,
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: `${mod.color}20`, border: `1px solid ${mod.color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CheckIcon size={28} color={mod.color} />
                </div>
                <div>
                  <div style={{ fontFamily: HEEBO, fontSize: F.label, fontWeight: 800, color: mod.color }}>
                    {mod.name}
                  </div>
                  <div style={{ fontFamily: HEEBO, fontSize: F.label - 4, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                    {mod.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats — from frame 240 */}
      {frame >= 240 && (
        <div style={{
          position: 'absolute', top: '20%', display: 'flex', gap: 24,
          direction: 'rtl' as const, width: CARD_W,
        }}>
          {stats.map((st, i) => {
            const ss = spring({ frame: Math.max(0, frame - 240 - i * 12), fps, config: SPRING.ui, durationInFrames: 18 });
            return (
              <div key={i} style={{
                ...statCard(st.color), opacity: ss,
                transform: `translateY(${interpolate(ss, [0, 1], [30, 0])}px)`,
              }}>
                <div style={{ fontFamily: RUBIK, fontSize: F.title, fontWeight: 800, color: BRAND.white, textShadow: `0 0 30px ${st.color}30` }}>
                  {st.value}
                </div>
                <div style={{ fontFamily: HEEBO, fontSize: F.label, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginTop: 10, direction: 'rtl' }}>
                  {st.label}
                </div>
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
  const tags = ['מערכת שיוצאת לשבת — לבד.', 'לוח עברי מובנה.', 'AI שמבין עברית.', 'הכל במקום אחד.'];

  const badges = [
    { icon: <ShieldCheckIcon size={36} color={WARM.amber} />, text: 'שומרת שבת וחג' },
    { icon: <CalendarIcon size={36} color={WARM.amber} />, text: 'לוח עברי מובנה' },
    { icon: <LockClosedIcon size={36} color={WARM.amber} />, text: '7 ימי ניסיון חינם' },
  ];

  const buttonSpring = spring({ frame: Math.max(0, frame - 280), fps, config: SPRING.punch, durationInFrames: 18 });
  const buttonPulse = frame >= 280 ? Math.sin((frame - 280) * 0.06) * 0.02 + 1 : 1;
  const fadeOut = interpolate(frame, [570, 600], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Candle flicker
  const candleSpring = spring({ frame: Math.max(0, frame - 350), fps, config: SPRING.smooth, durationInFrames: 25 });

  return (
    <AbsoluteFill style={{ ...sceneBg(`${WARM.goldGlow}06`, '35%'), ...fillCenter, opacity: fadeOut }}>
      {/* Warm glow */}
      <div style={{
        position: 'absolute', width: 700, height: 700, borderRadius: '50%',
        background: `radial-gradient(circle, ${WARM.goldGlow} 0%, transparent 65%)`,
        opacity: 0.12, transform: `scale(${1 + Math.sin(frame * 0.03) * 0.08})`,
      }} />

      {/* "MISRAD AI" */}
      <div style={{
        fontFamily: RUBIK, fontSize: 96, fontWeight: 800, color: BRAND.white,
        letterSpacing: 4, opacity: brandSpring,
        transform: `scale(${interpolate(brandSpring, [0, 1], [0.85, 1])})`,
        textShadow: `0 0 60px ${WARM.goldGlow}`, marginBottom: 24,
      }}>
        MISRAD AI
      </div>

      {/* Tag lines */}
      <div style={{ textAlign: 'center', direction: 'rtl', marginBottom: 36 }}>
        {tags.map((tag, i) => {
          const ts = spring({ frame: Math.max(0, frame - 25 - i * 8), fps, config: SPRING.ui, durationInFrames: 16 });
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

      {/* Badges */}
      {frame >= 140 && (
        <div style={{ display: 'flex', gap: 20, marginBottom: 44, direction: 'rtl' as const }}>
          {badges.map((badge, i) => {
            const bs = spring({ frame: Math.max(0, frame - 140 - i * 12), fps, config: SPRING.ui, durationInFrames: 16 });
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
      {frame >= 280 && (
        <div style={{
          padding: '22px 72px', borderRadius: 60,
          background: `linear-gradient(135deg, ${WARM.amber}, ${WARM.amberDark})`,
          boxShadow: `0 16px 50px ${WARM.goldGlow}`,
          opacity: buttonSpring,
          transform: `scale(${interpolate(buttonSpring, [0, 1], [0.8, 1]) * buttonPulse})`,
          marginBottom: 24,
        }}>
          <span style={{ fontFamily: RUBIK, fontSize: F.body, fontWeight: 800, color: '#fff' }}>להתחיל — חינם</span>
        </div>
      )}

      {/* URL */}
      {frame >= 310 && (
        <div style={{
          fontFamily: RUBIK, fontSize: F.label, fontWeight: 700, color: 'rgba(255,255,255,0.4)',
          opacity: spring({ frame: Math.max(0, frame - 310), fps, config: SPRING.ui, durationInFrames: 16 }),
          letterSpacing: 2,
        }}>
          misrad-ai.com
        </div>
      )}

      {/* Shabbat candles */}
      {frame >= 350 && (
        <div style={{
          position: 'absolute', bottom: '5%',
          display: 'flex', gap: 50, opacity: candleSpring,
          transform: `translateY(${interpolate(candleSpring, [0, 1], [20, 0])}px)`,
        }}>
          <CandleSVG size={80} flicker={Math.sin(frame * 0.12) * 0.5} />
          <CandleSVG size={80} flicker={Math.sin(frame * 0.12 + 2) * 0.5} />
        </div>
      )}

      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPOSITION — L2 Shabbat Video (75s)
// ═══════════════════════════════════════════════════════════
export const L2ShabbatVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={T.HOOK.from} durationInFrames={T.HOOK.dur}><HookScene /></Sequence>
      <Sequence from={T.PAIN.from} durationInFrames={T.PAIN.dur}><PainScene /></Sequence>
      <Sequence from={T.ANSWER.from} durationInFrames={T.ANSWER.dur}><AnswerScene /></Sequence>
      <Sequence from={T.CALENDAR.from} durationInFrames={T.CALENDAR.dur}><CalendarScene /></Sequence>
      <Sequence from={T.WHATS_INSIDE.from} durationInFrames={T.WHATS_INSIDE.dur}><WhatsInsideScene /></Sequence>
      <Sequence from={T.CTA.from} durationInFrames={T.CTA.dur}><CTAScene /></Sequence>
    </AbsoluteFill>
  );
};
