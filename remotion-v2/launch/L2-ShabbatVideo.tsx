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
import { L2_TIMING, WARM } from './shared/launch-config';
import {
  F, CARD_W, ACCENT, gradientText, warmSceneBg, sceneBg, safeFill, safeTop,
  glassCard, rowCard,
  MisradLogo, LogoWatermark, BloomOrb, GrainOverlay,
  CheckIcon, LockClosedIcon, ShieldCheckIcon, CalendarIcon, CandleSVG, DangerDot,
} from './shared/launch-design';

const T = L2_TIMING;

// ═══════════════════════════════════════════════════════════
// SCENE 1 — HOOK: נרות + "ואתה?" [0:00–0:06]
// Warm, candles centered, gold text. Fast in.
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const candleSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 20 });
  const textSpring = spring({ frame: Math.max(0, frame - 30), fps, config: SPRING.hero, durationInFrames: 18 });
  const subSpring = spring({ frame: Math.max(0, frame - 55), fps, config: SPRING.ui, durationInFrames: 14 });
  const flicker = Math.sin(frame * 0.15) * 1.5;

  return (
    <AbsoluteFill style={{ ...warmSceneBg('rgba(255,200,100,0.12)', '50%'), ...safeFill }}>
      <BloomOrb color={ACCENT.gold} size={800} x="50%" y="48%" intensity={0.16} />

      {/* Logo small at top */}
      <div style={{ opacity: candleSpring * 0.5 }}>
        <MisradLogo size={56} textSize={28} opacity={0.5} />
      </div>

      {/* Two candles — centered between logo and title */}
      <div style={{
        display: 'flex', gap: 80, alignItems: 'flex-end',
        opacity: candleSpring,
        transform: `translateY(${interpolate(candleSpring, [0, 1], [40, 0])}px)`,
        marginTop: -8,
      }}>
        <CandleSVG size={110} flicker={flicker} id="cl" />
        <CandleSVG size={110} flicker={-flicker * 0.8} id="cr" />
      </div>

      {/* Gold title */}
      <div style={{
        ...gradientText(F.hero, 'gold'),
        opacity: textSpring,
        transform: `translateY(${interpolate(textSpring, [0, 1], [20, 0])}px)`,
        maxWidth: CARD_W,
      }}>
        שבת שלום.{'\n'}הכל מוכן.
      </div>

      {/* Subtitle */}
      <div style={{
        fontFamily: HEEBO, fontSize: F.subtitle, fontWeight: 700,
        color: 'rgba(255,255,255,0.6)', direction: 'rtl', textAlign: 'center',
        opacity: subSpring, maxWidth: CARD_W,
      }}>
        המערכת שומרת. אתה נח.
      </div>

      <GrainOverlay opacity={0.035} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 2 — PAIN [0:06–0:15]
// 3 pain items. Gold accent. Centered.
// ═══════════════════════════════════════════════════════════
const PainScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 });

  const pains = [
    { text: 'חשבוניות שלא נשלחו', delay: 20 },
    { text: 'לידים שנשכחו', delay: 40 },
    { text: 'שעות על אקסלים במקום עם המשפחה', delay: 60 },
  ];

  const bottomSpring = spring({ frame: Math.max(0, frame - 150), fps, config: SPRING.ui, durationInFrames: 16 });

  return (
    <AbsoluteFill style={{ ...sceneBg(ACCENT.goldDim, '35%'), ...safeFill }}>
      <BloomOrb color={ACCENT.gold} size={400} x="50%" y="30%" intensity={0.08} />

      <div style={{
        ...gradientText(F.title, 'warm'),
        opacity: titleSpring,
      }}>
        בלי מערכת? ככה זה נראה:
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: CARD_W }}>
        {pains.map((p, i) => {
          const ps = spring({ frame: Math.max(0, frame - p.delay), fps, config: SPRING.punch, durationInFrames: 14 });
          return (
            <div key={i} style={{
              ...rowCard(),
              opacity: ps,
              transform: `translateX(${interpolate(ps, [0, 1], [40, 0])}px)`,
              justifyContent: 'flex-start',
              gap: 16,
            }}>
              <DangerDot size={20} color={ACCENT.gold} />
              <span style={{ fontFamily: HEEBO, fontSize: F.body, fontWeight: 800, color: BRAND.white }}>
                {p.text}
              </span>
            </div>
          );
        })}
      </div>

      {frame >= 150 && (
        <div style={{
          ...gradientText(F.subtitle, 'gold'),
          opacity: bottomSpring, maxWidth: CARD_W,
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
// SCENE 3 — ANSWER [0:15–0:30]
// What the system does on Friday. 3 actions + lock.
// ═══════════════════════════════════════════════════════════
const AnswerScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 });

  const actions = [
    { text: 'שולחת חשבוניות + תזכורות', delay: 25 },
    { text: 'סוגרת משימות פתוחות', delay: 50 },
    { text: 'שולחת סיכום שבועי ללקוחות', delay: 75 },
  ];

  const lockSpring = spring({ frame: Math.max(0, frame - 200), fps, config: SPRING.punch, durationInFrames: 16 });

  return (
    <AbsoluteFill style={{ ...warmSceneBg('rgba(99,102,241,0.08)', '35%'), ...safeFill }}>
      <BloomOrb color={ACCENT.gold} size={500} x="50%" y="30%" intensity={0.1} />

      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, direction: 'rtl' }}>
        <ShieldCheckIcon size={56} color={ACCENT.gold} />
        <div style={{
          ...gradientText(F.title - 4, 'gold'),
          opacity: titleSpring, textAlign: 'right',
        }}>
          מה המערכת עושה{'\n'}ביום שישי?
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: CARD_W }}>
        {actions.map((a, i) => {
          const as2 = spring({ frame: Math.max(0, frame - a.delay), fps, config: SPRING.punch, durationInFrames: 14 });
          return (
            <div key={i} style={{
              ...rowCard(),
              opacity: as2,
              transform: `translateX(${interpolate(as2, [0, 1], [40, 0])}px)`,
            }}>
              <span style={{ fontFamily: HEEBO, fontSize: F.body, fontWeight: 800, color: BRAND.white }}>{a.text}</span>
              <CheckIcon size={44} color={ACCENT.gold} />
            </div>
          );
        })}
      </div>

      {/* Lock card */}
      {frame >= 200 && (
        <div style={{
          width: CARD_W, borderRadius: 28,
          background: ACCENT.goldDim,
          border: `2px solid ${ACCENT.gold}40`,
          padding: '32px 44px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20,
          direction: 'rtl',
          opacity: lockSpring,
          transform: `scale(${interpolate(lockSpring, [0, 1], [0.9, 1])})`,
        }}>
          <LockClosedIcon size={56} color={ACCENT.gold} />
          <div>
            <div style={{ fontFamily: HEEBO, fontSize: F.body, fontWeight: 800, color: ACCENT.gold }}>
              נועלת — לא נוגעים!
            </div>
            <div style={{ fontFamily: HEEBO, fontSize: F.label, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>
              שבת שלום. הכל מוכן.
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
// SCENE 4 — CALENDAR [0:30–0:42]
// Hebrew calendar. 3 events. Gold.
// ═══════════════════════════════════════════════════════════
const CalendarScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 });

  const events = [
    { date: 'ערב ר"ה', action: 'גבייה + סגירת חודש', delay: 25 },
    { date: 'ערב יוה"כ', action: 'ברכה + שחרור משימות', delay: 55 },
    { date: 'כל שישי', action: 'נעילה + ברכת שבת', delay: 85 },
  ];

  const bottomSpring = spring({ frame: Math.max(0, frame - 200), fps, config: SPRING.ui, durationInFrames: 16 });

  return (
    <AbsoluteFill style={{ ...warmSceneBg(ACCENT.goldDim, '25%'), ...safeFill }}>
      <BloomOrb color={ACCENT.gold} size={400} x="50%" y="20%" intensity={0.08} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, direction: 'rtl' }}>
        <CalendarIcon size={64} color={ACCENT.gold} />
        <div style={{
          ...gradientText(F.title, 'gold'),
          opacity: titleSpring, textAlign: 'right',
        }}>
          לוח עברי מובנה
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: CARD_W }}>
        {events.map((ev, i) => {
          const es = spring({ frame: Math.max(0, frame - ev.delay), fps, config: SPRING.punch, durationInFrames: 14 });
          return (
            <div key={i} style={{
              ...rowCard(),
              opacity: es,
              transform: `translateX(${interpolate(es, [0, 1], [40, 0])}px)`,
              gap: 14,
            }}>
              <span style={{ fontFamily: HEEBO, fontSize: F.body - 4, fontWeight: 600, color: 'rgba(255,255,255,0.7)', flex: 1 }}>
                {ev.action}
              </span>
              <div style={{
                padding: '8px 20px', borderRadius: 14,
                background: ACCENT.goldDim, border: `1px solid ${ACCENT.gold}35`,
                fontFamily: HEEBO, fontSize: F.label, fontWeight: 800, color: ACCENT.gold,
                whiteSpace: 'nowrap',
              }}>
                {ev.date}
              </div>
            </div>
          );
        })}
      </div>

      {frame >= 200 && (
        <div style={{
          ...gradientText(F.subtitle, 'gold'),
          opacity: bottomSpring, maxWidth: CARD_W,
        }}>
          לא צריך לזכור. המערכת יודעת.
        </div>
      )}

      <LogoWatermark />
      <GrainOverlay />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 5 — WHAT'S INSIDE [0:42–0:55]
// 3 key modules. Gold.
// ═══════════════════════════════════════════════════════════
const WhatsInsideScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 });

  const modules = [
    { name: 'CRM + לידים + AI', delay: 20 },
    { name: 'חשבוניות + גבייה', delay: 45 },
    { name: 'צוות + משימות + תפעול', delay: 70 },
  ];

  const bottomSpring = spring({ frame: Math.max(0, frame - 200), fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ ...sceneBg(ACCENT.goldDim, '38%'), ...safeFill }}>
      <BloomOrb color={ACCENT.gold} size={500} x="50%" y="35%" intensity={0.1} />

      <div style={{
        ...gradientText(F.title, 'gold'),
        opacity: titleSpring,
      }}>
        מה כלול בפנים?
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: CARD_W }}>
        {modules.map((m, i) => {
          const ms = spring({ frame: Math.max(0, frame - m.delay), fps, config: SPRING.punch, durationInFrames: 14 });
          return (
            <div key={i} style={{
              ...rowCard(),
              opacity: ms,
              transform: `translateX(${interpolate(ms, [0, 1], [40, 0])}px)`,
            }}>
              <span style={{ fontFamily: HEEBO, fontSize: F.body, fontWeight: 800, color: BRAND.white }}>{m.name}</span>
              <CheckIcon size={44} color={ACCENT.gold} />
            </div>
          );
        })}
      </div>

      {frame >= 200 && (
        <div style={{
          ...gradientText(F.subtitle, 'gold'),
          opacity: bottomSpring, maxWidth: CARD_W,
        }}>
          הכל כלול. מערכת אחת. שומרת שבת.
        </div>
      )}

      <LogoWatermark />
      <GrainOverlay />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 6 — CTA [0:55–1:15]
// Logo + candles + button. Warm gold.
// ═══════════════════════════════════════════════════════════
const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const brandSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 20 });
  const flicker = Math.sin(frame * 0.12) * 1.2;

  const tags = [
    'מערכת שלמה. שומרת שבת.',
    'AI שמבין עברית.',
  ];

  const buttonSpring = spring({ frame: Math.max(0, frame - 200), fps, config: SPRING.punch, durationInFrames: 16 });
  const buttonPulse = frame >= 200 ? Math.sin((frame - 200) * 0.06) * 0.015 + 1 : 1;
  const fadeOut = interpolate(frame, [570, 600], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ ...warmSceneBg('rgba(255,200,100,0.06)', '40%'), ...safeFill, opacity: fadeOut }}>
      <BloomOrb color={ACCENT.gold} size={700} x="50%" y="38%" intensity={0.14} />

      <div style={{
        opacity: brandSpring,
        transform: `scale(${interpolate(brandSpring, [0, 1], [0.75, 1])})`,
      }}>
        <MisradLogo size={130} textSize={64} />
      </div>

      <div style={{ textAlign: 'center', direction: 'rtl', maxWidth: CARD_W }}>
        {tags.map((tag, i) => {
          const ts = spring({ frame: Math.max(0, frame - 30 - i * 10), fps, config: SPRING.ui, durationInFrames: 14 });
          return (
            <div key={i} style={{
              fontFamily: HEEBO, fontSize: F.subtitle, fontWeight: 700,
              color: 'rgba(255,255,255,0.75)', marginBottom: 14, opacity: ts,
            }}>
              {tag}
            </div>
          );
        })}
      </div>

      {/* Small candles accent */}
      <div style={{ display: 'flex', gap: 50, opacity: brandSpring * 0.6 }}>
        <CandleSVG size={60} flicker={flicker} id="ctl" />
        <CandleSVG size={60} flicker={-flicker * 0.8} id="ctr" />
      </div>

      {frame >= 200 && (
        <div style={{
          padding: '28px 90px', borderRadius: 60,
          background: `linear-gradient(135deg, ${ACCENT.gold} 0%, ${ACCENT.goldLight} 100%)`,
          boxShadow: `0 20px 60px ${ACCENT.gold}40`,
          opacity: buttonSpring,
          transform: `scale(${interpolate(buttonSpring, [0, 1], [0.8, 1]) * buttonPulse})`,
        }}>
          <span style={{ fontFamily: RUBIK, fontSize: F.body + 4, fontWeight: 800, color: '#1A1520' }}>
            להתחיל — חינם
          </span>
        </div>
      )}

      {frame >= 230 && (
        <div style={{
          fontFamily: RUBIK, fontSize: F.label, fontWeight: 700,
          color: 'rgba(255,255,255,0.5)', letterSpacing: 3,
          opacity: spring({ frame: Math.max(0, frame - 230), fps, config: SPRING.ui, durationInFrames: 14 }),
        }}>
          <span dir="ltr">misrad-ai.com</span>
        </div>
      )}

      <GrainOverlay opacity={0.035} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPOSITION
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
