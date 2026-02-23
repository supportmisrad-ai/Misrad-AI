import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from 'remotion';
import { BRAND, HEEBO, RUBIK, SPRING, MODULE_COLORS } from '../shared/config';
import { L2_TIMING, WARM } from './shared/launch-config';
import {
  F, CARD_W, gradientText, warmSceneBg, sceneBg, fillCenter, fillTop, fillSpread,
  glassCard, rowCard,
  MisradLogo, LogoWatermark, BloomOrb, GrainOverlay,
  CheckIcon, LockClosedIcon, ShieldCheckIcon, CalendarIcon, CandleSVG, DangerDot,
} from './shared/launch-design';

const T = L2_TIMING;

// ═══════════════════════════════════════════════════════════
// SCENE 1 — HOOK: נרות שבת + "ואתה?" [0:00–0:06] 180f
// Warm, intimate, candles fill the screen with bloom
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const candleSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 24 });
  const textSpring = spring({ frame: Math.max(0, frame - 50), fps, config: SPRING.hero, durationInFrames: 22 });
  const subSpring = spring({ frame: Math.max(0, frame - 80), fps, config: SPRING.ui, durationInFrames: 18 });
  const flicker = Math.sin(frame * 0.15) * 1.5;

  return (
    <AbsoluteFill style={{ ...warmSceneBg('rgba(255,200,100,0.15)', '55%'), ...fillCenter }}>
      {/* Massive warm bloom behind candles */}
      <BloomOrb color="#FFD060" size={900} x="50%" y="50%" intensity={0.18} />
      <BloomOrb color={WARM.amber} size={600} x="35%" y="60%" intensity={0.1} />
      <BloomOrb color={WARM.amber} size={500} x="65%" y="55%" intensity={0.08} />

      {/* Logo at top */}
      <div style={{
        position: 'absolute', top: 80,
        opacity: candleSpring * 0.6,
      }}>
        <MisradLogo size={64} textSize={32} opacity={0.5} />
      </div>

      {/* Title — big gold text */}
      <div style={{
        ...gradientText(F.hero, 'gold'),
        opacity: textSpring,
        transform: `translateY(${interpolate(textSpring, [0, 1], [30, 0])}px)`,
        marginBottom: 24, maxWidth: CARD_W,
      }}>
        ואתה? יוצא לשבת{'\n'}בראש שקט.
      </div>

      {/* Subtitle */}
      <div style={{
        fontFamily: HEEBO, fontSize: F.subtitle, fontWeight: 700,
        color: 'rgba(255,255,255,0.65)', direction: 'rtl', textAlign: 'center',
        opacity: subSpring,
        transform: `translateY(${interpolate(subSpring, [0, 1], [20, 0])}px)`,
        maxWidth: CARD_W, marginBottom: 80,
      }}>
        המערכת שומרת. אתה נח.
      </div>

      {/* Two large candles */}
      <div style={{
        display: 'flex', gap: 80, alignItems: 'flex-end',
        opacity: candleSpring,
        transform: `translateY(${interpolate(candleSpring, [0, 1], [60, 0])}px)`,
      }}>
        <CandleSVG size={140} flicker={flicker} id="cl" />
        <CandleSVG size={140} flicker={-flicker * 0.8} id="cr" />
      </div>

      <GrainOverlay opacity={0.035} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 2 — PAIN: "מה קורה בלי מערכת" [0:06–0:15] 270f
// Pain points that fill the screen
// ═══════════════════════════════════════════════════════════
const PainScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 22 });

  const pains = [
    { text: 'חשבוניות שלא נשלחו', color: '#EF4444', delay: 25 },
    { text: 'לידים שנשכחו', color: '#FB923C', delay: 50 },
    { text: 'שעות על אקסלים במקום עם המשפחה', color: '#60A5FA', delay: 75 },
    { text: 'לקוחות שלא קיבלו מענה', color: WARM.amber, delay: 100 },
    { text: 'יום שישי — ועוד לא סגרת את השבוע', color: '#EF4444', delay: 125 },
  ];

  return (
    <AbsoluteFill style={{ ...sceneBg('rgba(239,68,68,0.08)', '30%'), ...fillSpread }}>
      <BloomOrb color="#EF4444" size={500} x="50%" y="25%" intensity={0.1} />

      {/* Title */}
      <div style={{
        ...gradientText(F.title, 'warm'),
        opacity: titleSpring,
        transform: `translateY(${interpolate(titleSpring, [0, 1], [25, 0])}px)`,
      }}>
        בלי מערכת? ככה זה נראה:
      </div>

      {/* Pain cards — fill screen */}
      <div style={{ width: CARD_W, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {pains.map((p, i) => {
          const ps = spring({ frame: Math.max(0, frame - p.delay), fps, config: SPRING.ui, durationInFrames: 18 });
          return (
            <div key={i} style={{
              ...rowCard(p.color),
              opacity: ps,
              transform: `translateX(${interpolate(ps, [0, 1], [60, 0])}px)`,
              justifyContent: 'flex-end',
            }}>
              <DangerDot size={24} color={p.color} />
              <span style={{
                fontFamily: HEEBO, fontSize: F.body, fontWeight: 800, color: BRAND.white,
                marginRight: 18,
              }}>
                {p.text}
              </span>
            </div>
          );
        })}
      </div>

      {/* Bottom message */}
      {frame >= 180 && (
        <div style={{
          ...gradientText(F.subtitle, 'gold'),
          opacity: spring({ frame: Math.max(0, frame - 180), fps, config: SPRING.ui, durationInFrames: 18 }),
          maxWidth: CARD_W,
        }}>
          זה לא חייב להיות ככה.
        </div>
      )}

      <LogoWatermark />
      <GrainOverlay />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 3 — ANSWER: "מה המערכת עושה ביום שישי" [0:15–0:30] 450f
// Frosted glass vault concept — system locks automatically
// ═══════════════════════════════════════════════════════════
const AnswerScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 22 });

  const actions = [
    { text: 'שולחת חשבוניות + תזכורות תשלום', delay: 40 },
    { text: 'סוגרת משימות פתוחות', delay: 70 },
    { text: 'שולחת SMS ברכה ללקוחות', delay: 100 },
    { text: 'מכינה דו"ח שבועי', delay: 130 },
  ];

  const lockSpring = spring({ frame: Math.max(0, frame - 250), fps, config: SPRING.punch, durationInFrames: 20 });
  const lockText = spring({ frame: Math.max(0, frame - 280), fps, config: SPRING.ui, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ ...warmSceneBg('rgba(197,165,114,0.1)', '35%'), ...fillSpread }}>
      <BloomOrb color={WARM.amber} size={500} x="50%" y="30%" intensity={0.1} />

      {/* Title with shield */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, direction: 'rtl' }}>
        <ShieldCheckIcon size={64} color={WARM.amber} />
        <div style={{
          ...gradientText(F.title - 4, 'gold'),
          opacity: titleSpring,
        }}>
          מה המערכת עושה{'\n'}ביום שישי?
        </div>
      </div>

      {/* Action items */}
      <div style={{ width: CARD_W, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {actions.map((a, i) => {
          const as2 = spring({ frame: Math.max(0, frame - a.delay), fps, config: SPRING.ui, durationInFrames: 18 });
          return (
            <div key={i} style={{
              ...rowCard(WARM.amber),
              opacity: as2,
              transform: `translateX(${interpolate(as2, [0, 1], [50, 0])}px)`,
            }}>
              <span style={{ fontFamily: HEEBO, fontSize: F.body, fontWeight: 800, color: BRAND.white }}>{a.text}</span>
              <CheckIcon size={44} color={WARM.amber} />
            </div>
          );
        })}
      </div>

      {/* Lock — frosted vault concept */}
      {frame >= 250 && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
          opacity: lockSpring,
          transform: `scale(${interpolate(lockSpring, [0, 1], [0.8, 1])})`,
        }}>
          <div style={{
            width: CARD_W, borderRadius: 28,
            background: 'rgba(197,165,114,0.08)',
            border: `2px solid ${WARM.amber}40`,
            backdropFilter: 'blur(30px)',
            padding: '32px 44px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20,
            direction: 'rtl',
          }}>
            <LockClosedIcon size={64} color={WARM.amber} />
            <div>
              <div style={{
                fontFamily: HEEBO, fontSize: F.body, fontWeight: 800, color: WARM.amber,
              }}>
                נועלת את המערכת — לא נוגעים!
              </div>
              <div style={{
                fontFamily: HEEBO, fontSize: F.label, fontWeight: 600, color: 'rgba(255,255,255,0.5)',
                opacity: lockText, marginTop: 8,
              }}>
                שבת שלום. הכל מוכן.
              </div>
            </div>
          </div>
        </div>
      )}

      <LogoWatermark />
      <GrainOverlay />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 4 — CALENDAR: "לוח עברי מובנה" [0:30–0:42] 360f
// Hebrew calendar events filling the screen
// ═══════════════════════════════════════════════════════════
const CalendarScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 22 });

  const events = [
    { date: 'ערב ר"ה', action: 'גבייה אוטומטית + סגירת חודש', color: WARM.amber, delay: 30 },
    { date: 'ערב יוה"כ', action: 'SMS ברכה ללקוחות + שחרור משימות', color: '#22C55E', delay: 60 },
    { date: 'ערב סוכות', action: 'סגירת שבוע + תזכורת לצוות', color: BRAND.indigoLight, delay: 90 },
    { date: 'ערב פסח', action: 'דו"ח חודשי + מצב חופשה', color: MODULE_COLORS.operations.accent, delay: 120 },
    { date: 'כל שישי', action: 'נעילה אוטומטית + ברכת שבת', color: WARM.gold, delay: 150 },
  ];

  return (
    <AbsoluteFill style={{ ...warmSceneBg('rgba(197,165,114,0.08)', '20%'), ...fillSpread }}>
      <BloomOrb color={WARM.amber} size={400} x="50%" y="15%" intensity={0.08} />

      {/* Title with calendar icon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, direction: 'rtl' }}>
        <CalendarIcon size={72} color={WARM.amber} />
        <div style={{
          ...gradientText(F.title, 'gold'),
          opacity: titleSpring,
          textAlign: 'right',
        }}>
          לוח עברי מובנה
        </div>
      </div>

      {/* Calendar event cards */}
      <div style={{ width: CARD_W, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {events.map((ev, i) => {
          const es = spring({ frame: Math.max(0, frame - ev.delay), fps, config: SPRING.ui, durationInFrames: 18 });
          return (
            <div key={i} style={{
              ...rowCard(ev.color),
              opacity: es,
              transform: `translateX(${interpolate(es, [0, 1], [50, 0])}px)`,
              gap: 16,
            }}>
              <span style={{ fontFamily: HEEBO, fontSize: F.body - 4, fontWeight: 600, color: 'rgba(255,255,255,0.7)', flex: 1 }}>
                {ev.action}
              </span>
              <FlowArrowSmall />
              <div style={{
                padding: '10px 22px', borderRadius: 16,
                background: `${ev.color}18`, border: `1px solid ${ev.color}40`,
                fontFamily: HEEBO, fontSize: F.label, fontWeight: 800, color: ev.color,
                whiteSpace: 'nowrap',
              }}>
                {ev.date}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom */}
      {frame >= 250 && (
        <div style={{
          ...gradientText(F.subtitle, 'gold'),
          opacity: spring({ frame: Math.max(0, frame - 250), fps, config: SPRING.ui, durationInFrames: 18 }),
          maxWidth: CARD_W,
        }}>
          לא צריך לזכור. המערכת יודעת.
        </div>
      )}

      <LogoWatermark />
      <GrainOverlay />
    </AbsoluteFill>
  );
};

// Small helper arrow for calendar
const FlowArrowSmall: React.FC = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" style={{ transform: 'scaleX(-1)', flexShrink: 0 }}>
    <path d="M5 12h14M12 5l7 7-7 7" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ═══════════════════════════════════════════════════════════
// SCENE 5 — WHAT'S INSIDE: "מה כלול" [0:42–0:55] 390f
// Module capabilities
// ═══════════════════════════════════════════════════════════
const WhatsInsideScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 22 });

  const modules = [
    { name: 'ניהול לידים + AI', color: MODULE_COLORS.system.accent, delay: 30 },
    { name: 'חשבוניות + גבייה', color: MODULE_COLORS.finance.accent, delay: 55 },
    { name: 'CRM לקוחות', color: MODULE_COLORS.client.accent, delay: 80 },
    { name: 'ניהול צוות + משימות', color: MODULE_COLORS.nexus.accent, delay: 105 },
    { name: 'שיווק + תוכן AI', color: MODULE_COLORS.social.accent, delay: 130 },
    { name: 'תפעול + לוחות', color: MODULE_COLORS.operations.accent, delay: 155 },
  ];

  const bottomSpring = spring({ frame: Math.max(0, frame - 280), fps, config: SPRING.hero, durationInFrames: 22 });

  return (
    <AbsoluteFill style={{ ...sceneBg('rgba(99,102,241,0.07)', '40%'), ...fillSpread }}>
      <BloomOrb color={BRAND.indigo} size={500} x="50%" y="30%" intensity={0.09} />
      <BloomOrb color={WARM.amber} size={300} x="70%" y="70%" intensity={0.05} />

      {/* Title */}
      <div style={{
        ...gradientText(F.title, 'brand'),
        opacity: titleSpring,
        transform: `translateY(${interpolate(titleSpring, [0, 1], [25, 0])}px)`,
      }}>
        מה כלול בפנים?
      </div>

      {/* Module cards */}
      <div style={{ width: CARD_W, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {modules.map((m, i) => {
          const ms = spring({ frame: Math.max(0, frame - m.delay), fps, config: SPRING.ui, durationInFrames: 18 });
          return (
            <div key={i} style={{
              ...rowCard(m.color),
              opacity: ms,
              transform: `translateX(${interpolate(ms, [0, 1], [60, 0])}px)`,
            }}>
              <span style={{ fontFamily: HEEBO, fontSize: F.body, fontWeight: 800, color: BRAND.white }}>{m.name}</span>
              <CheckIcon size={44} color={m.color} />
            </div>
          );
        })}
      </div>

      {/* Bottom message */}
      {frame >= 280 && (
        <div style={{
          ...gradientText(F.subtitle, 'gold'),
          opacity: bottomSpring,
          transform: `scale(${interpolate(bottomSpring, [0, 1], [0.92, 1])})`,
          maxWidth: CARD_W,
        }}>
          6 מודולים. מערכת אחת. שומרת שבת.
        </div>
      )}

      <LogoWatermark />
      <GrainOverlay />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 6 — CTA [0:55–1:15] 600f
// Full logo + warm CTA
// ═══════════════════════════════════════════════════════════
const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const brandSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 24 });
  const flicker = Math.sin(frame * 0.12) * 1.2;

  const tags = [
    'מערכת ניהול עסק שלמה.',
    'שומרת שבת וחג — אוטומטית.',
    'לוח עברי מובנה.',
    'AI שמבין עברית.',
  ];

  const buttonSpring = spring({ frame: Math.max(0, frame - 280), fps, config: SPRING.punch, durationInFrames: 18 });
  const buttonPulse = frame >= 280 ? Math.sin((frame - 280) * 0.06) * 0.015 + 1 : 1;
  const fadeOut = interpolate(frame, [570, 600], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ ...warmSceneBg('rgba(255,200,100,0.08)', '40%'), ...fillCenter, opacity: fadeOut }}>
      <BloomOrb color={WARM.amber} size={700} x="50%" y="35%" intensity={0.14} />
      <BloomOrb color={BRAND.primary} size={400} x="35%" y="65%" intensity={0.06} />

      {/* Logo — big */}
      <div style={{
        opacity: brandSpring,
        transform: `scale(${interpolate(brandSpring, [0, 1], [0.75, 1])})`,
        marginBottom: 50,
      }}>
        <MisradLogo size={130} textSize={64} />
      </div>

      {/* Tag lines */}
      <div style={{ textAlign: 'center', direction: 'rtl', marginBottom: 50, maxWidth: CARD_W }}>
        {tags.map((tag, i) => {
          const ts = spring({ frame: Math.max(0, frame - 40 - i * 12), fps, config: SPRING.ui, durationInFrames: 16 });
          return (
            <div key={i} style={{
              fontFamily: HEEBO, fontSize: F.subtitle, fontWeight: 700,
              color: 'rgba(255,255,255,0.7)',
              marginBottom: 14,
              opacity: ts,
              transform: `translateY(${interpolate(ts, [0, 1], [20, 0])}px)`,
            }}>
              {tag}
            </div>
          );
        })}
      </div>

      {/* Candles — smaller accent */}
      <div style={{
        display: 'flex', gap: 60, marginBottom: 50,
        opacity: brandSpring * 0.7,
      }}>
        <CandleSVG size={70} flicker={flicker} id="ctl" />
        <CandleSVG size={70} flicker={-flicker * 0.8} id="ctr" />
      </div>

      {/* CTA Button */}
      {frame >= 280 && (
        <div style={{
          padding: '28px 90px', borderRadius: 60,
          background: `linear-gradient(135deg, ${WARM.amber} 0%, ${WARM.gold} 100%)`,
          boxShadow: `0 20px 60px ${WARM.amber}40`,
          opacity: buttonSpring,
          transform: `scale(${interpolate(buttonSpring, [0, 1], [0.8, 1]) * buttonPulse})`,
          marginBottom: 32,
        }}>
          <span style={{ fontFamily: RUBIK, fontSize: F.body + 4, fontWeight: 800, color: '#1A1520' }}>
            להתחיל — חינם
          </span>
        </div>
      )}

      {/* URL */}
      {frame >= 310 && (
        <div style={{
          fontFamily: RUBIK, fontSize: F.label, fontWeight: 700,
          color: 'rgba(255,255,255,0.5)', letterSpacing: 3,
          opacity: spring({ frame: Math.max(0, frame - 310), fps, config: SPRING.ui, durationInFrames: 16 }),
        }}>
          misrad-ai.com
        </div>
      )}

      <GrainOverlay opacity={0.035} />
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
