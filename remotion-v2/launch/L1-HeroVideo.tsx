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
import { L1_TIMING, WARM } from './shared/launch-config';
import {
  F, CARD_W, gradientText, sceneBg, fillCenter, fillTop, fillSpread,
  glassCard, statCard, rowCard,
  MisradLogo, LogoWatermark, BloomOrb, GrainOverlay,
  CheckIcon, ShieldCheckIcon, DangerDot, FlowArrow, PhoneAlertIcon,
} from './shared/launch-design';

const T = L1_TIMING;

// ═══════════════════════════════════════════════════════════
// SCENE 1 — HOOK: "הבלגן שבחוץ" [0:00–0:05] 150 frames
// Logo reveal + problem teaser. 70% visual 30% text.
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 24 });
  const titleSpring = spring({ frame: Math.max(0, frame - 40), fps, config: SPRING.hero, durationInFrames: 22 });
  const subSpring = spring({ frame: Math.max(0, frame - 70), fps, config: SPRING.ui, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ ...sceneBg('rgba(162,29,60,0.12)', '30%'), ...fillCenter }}>
      <BloomOrb color={BRAND.primary} size={700} x="50%" y="35%" intensity={0.15} />
      <BloomOrb color={BRAND.indigo} size={400} x="25%" y="70%" intensity={0.06} />

      {/* Logo — large, centered */}
      <div style={{
        opacity: logoSpring,
        transform: `scale(${interpolate(logoSpring, [0, 1], [0.7, 1])})`,
        marginBottom: 60,
      }}>
        <MisradLogo size={120} textSize={56} />
      </div>

      {/* Hook title */}
      <div style={{
        ...gradientText(F.hero, 'warm'),
        opacity: titleSpring,
        transform: `translateY(${interpolate(titleSpring, [0, 1], [30, 0])}px)`,
        marginBottom: 28,
      }}>
        הבלגן שבחוץ
      </div>

      {/* Subtitle */}
      <div style={{
        fontFamily: HEEBO, fontSize: F.subtitle, fontWeight: 700,
        color: 'rgba(255,255,255,0.75)', direction: 'rtl', textAlign: 'center',
        opacity: subSpring,
        transform: `translateY(${interpolate(subSpring, [0, 1], [20, 0])}px)`,
        maxWidth: CARD_W, lineHeight: 1.4,
      }}>
        כל בעל עסק מכיר את זה.
      </div>

      <LogoWatermark />
      <GrainOverlay />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 2 — PROBLEM: "הטלפון עולה על גדותיו" [0:05–0:15] 300f
// Phone mockup with chaotic notifications — fills 80% of screen
// ═══════════════════════════════════════════════════════════
const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 22 });

  const notifications = [
    { text: 'וואטסאפ — 47 הודעות חדשות', bg: 'rgba(37,211,102,0.2)', border: 'rgba(37,211,102,0.4)', color: '#25D366', delay: 15 },
    { text: 'אקסל — הקובץ לא נשמר', bg: 'rgba(239,68,68,0.2)', border: 'rgba(239,68,68,0.4)', color: '#EF4444', delay: 30 },
    { text: 'גוגל שיטס — גרסה לא מעודכנת', bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.35)', color: '#FBBF24', delay: 45 },
    { text: 'CRM ישן — 12 לידים ממתינים', bg: 'rgba(96,165,250,0.15)', border: 'rgba(96,165,250,0.35)', color: '#60A5FA', delay: 60 },
    { text: 'חשבונית ידנית — חסרה חתימה', bg: 'rgba(251,146,60,0.15)', border: 'rgba(251,146,60,0.35)', color: '#FB923C', delay: 75 },
  ];

  // Pain items that appear after notifications
  const pains = [
    { text: 'ליד שנשרף כי שכחת לחזור', color: '#EF4444', delay: 150 },
    { text: 'חשבונית שנתקעה כי האקסל קרס', color: '#FB923C', delay: 175 },
    { text: 'יום שישי — עוד לא סגרת את השבוע', color: WARM.amber, delay: 200 },
  ];

  return (
    <AbsoluteFill style={{ ...sceneBg('rgba(239,68,68,0.1)', '25%', '50%'), ...fillSpread }}>
      <BloomOrb color="#EF4444" size={600} x="50%" y="20%" intensity={0.12} />

      {/* Phone mockup — BIG, fills width */}
      <div style={{
        width: CARD_W, borderRadius: 40,
        background: 'rgba(255,255,255,0.04)',
        border: '2px solid rgba(255,255,255,0.08)',
        padding: '36px 28px',
        opacity: phoneSpring,
        transform: `translateY(${interpolate(phoneSpring, [0, 1], [40, 0])}px)`,
      }}>
        {/* Phone header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 24, padding: '0 12px',
        }}>
          <span style={{ fontFamily: RUBIK, fontSize: F.label, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>13:45</span>
          <span style={{ fontFamily: HEEBO, fontSize: F.label, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>התראות 47</span>
        </div>

        {/* Notifications */}
        {notifications.map((n, i) => {
          const ns = spring({ frame: Math.max(0, frame - n.delay), fps, config: SPRING.punch, durationInFrames: 16 });
          return (
            <div key={i} style={{
              width: '100%', padding: '22px 28px', borderRadius: 20, marginBottom: 14,
              background: n.bg, border: `1.5px solid ${n.border}`,
              fontFamily: HEEBO, fontSize: F.label, fontWeight: 700, color: n.color,
              direction: 'rtl', display: 'flex', alignItems: 'center', gap: 14,
              opacity: ns, transform: `translateX(${interpolate(ns, [0, 1], [-40, 0])}px)`,
            }}>
              <DangerDot size={18} color={n.color} />
              {n.text}
            </div>
          );
        })}
      </div>

      {/* Pain items below phone */}
      <div style={{ width: CARD_W, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {pains.map((p, i) => {
          const ps = spring({ frame: Math.max(0, frame - p.delay), fps, config: SPRING.ui, durationInFrames: 18 });
          return (
            <div key={i} style={{
              ...rowCard(p.color),
              opacity: ps, transform: `translateX(${interpolate(ps, [0, 1], [50, 0])}px)`,
              justifyContent: 'flex-end',
            }}>
              <DangerDot size={20} color={p.color} />
              <span style={{ fontFamily: HEEBO, fontSize: F.body, fontWeight: 800, color: BRAND.white, marginRight: 16 }}>
                {p.text}
              </span>
            </div>
          );
        })}
      </div>

      <LogoWatermark />
      <GrainOverlay />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 3 — SOLUTION: "מערכת אחת שעושה הכל" [0:15–0:30] 450f
// Features + Pipeline — fills screen top to bottom
// ═══════════════════════════════════════════════════════════
const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 22 });

  const features = [
    { text: 'ליד נכנס — AI מדרג אותו', color: MODULE_COLORS.system.accent, delay: 40 },
    { text: 'חשבונית — נשלחת בלחיצה בוואטסאפ', color: MODULE_COLORS.finance.accent, delay: 65 },
    { text: 'צוות — רואים מי עושה מה', color: MODULE_COLORS.nexus.accent, delay: 90 },
    { text: 'תוכן — AI כותב בעברית אמיתית', color: MODULE_COLORS.social.accent, delay: 115 },
    { text: 'לקוחות — CRM שלם בלי אקסל', color: MODULE_COLORS.client.accent, delay: 140 },
    { text: 'תפעול — משימות, לוחות, מעקב', color: MODULE_COLORS.operations.accent, delay: 165 },
  ];

  // Pipeline steps — appear after features
  const steps = ['ליד', 'AI מדרג', 'שיחה', 'הצעה', 'חתימה', 'חשבונית'];
  const pipeSpring = spring({ frame: Math.max(0, frame - 250), fps, config: SPRING.hero, durationInFrames: 22 });

  // Bottom text
  const bottomSpring = spring({ frame: Math.max(0, frame - 350), fps, config: SPRING.ui, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ ...sceneBg('rgba(99,102,241,0.08)', '40%'), ...fillTop }}>
      <BloomOrb color={BRAND.indigo} size={600} x="50%" y="30%" intensity={0.1} />
      <BloomOrb color={BRAND.primary} size={350} x="70%" y="70%" intensity={0.06} />

      {/* Title */}
      <div style={{
        ...gradientText(F.title, 'brand'),
        opacity: titleSpring,
        transform: `translateY(${interpolate(titleSpring, [0, 1], [25, 0])}px)`,
        marginBottom: 48,
      }}>
        מערכת אחת. שעושה הכל.
      </div>

      {/* Feature rows — fill width */}
      <div style={{ width: CARD_W, display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 60 }}>
        {features.map((feat, i) => {
          const fs = spring({ frame: Math.max(0, frame - feat.delay), fps, config: SPRING.ui, durationInFrames: 16 });
          return (
            <div key={i} style={{
              ...rowCard(feat.color),
              opacity: fs,
              transform: `translateX(${interpolate(fs, [0, 1], [60, 0])}px)`,
            }}>
              <span style={{ fontFamily: HEEBO, fontSize: F.body - 2, fontWeight: 800, color: BRAND.white }}>{feat.text}</span>
              <CheckIcon size={40} color={feat.color} />
            </div>
          );
        })}
      </div>

      {/* Pipeline */}
      {frame >= 250 && (
        <div style={{
          width: CARD_W, display: 'flex', justifyContent: 'center',
          flexWrap: 'wrap', gap: 12, direction: 'rtl' as const,
          opacity: pipeSpring,
          transform: `translateY(${interpolate(pipeSpring, [0, 1], [20, 0])}px)`,
          marginBottom: 48,
        }}>
          {steps.map((step, i) => {
            const stepP = interpolate(pipeSpring, [0, 1], [0, 1]);
            const lit = stepP > 0.5;
            return (
              <React.Fragment key={i}>
                <div style={{
                  padding: '16px 28px', borderRadius: 20,
                  background: lit ? `${BRAND.primary}20` : 'rgba(255,255,255,0.05)',
                  border: `2px solid ${lit ? BRAND.primary + '50' : 'rgba(255,255,255,0.1)'}`,
                  fontFamily: HEEBO, fontSize: F.label, fontWeight: 700,
                  color: lit ? BRAND.white : 'rgba(255,255,255,0.5)',
                }}>
                  {step}
                </div>
                {i < steps.length - 1 && <FlowArrow size={28} color={lit ? `${BRAND.primary}60` : 'rgba(255,255,255,0.15)'} />}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Bottom text */}
      {frame >= 350 && (
        <div style={{
          ...gradientText(F.subtitle, 'gold'),
          opacity: bottomSpring,
          transform: `scale(${interpolate(bottomSpring, [0, 1], [0.92, 1])})`,
        }}>
          והכל — עם AI שמבין עברית.{'\n'}לא תרגום. שפת אם.
        </div>
      )}

      <LogoWatermark />
      <GrainOverlay />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 4 — DIFFERENTIATOR: "למה דווקא אנחנו" [0:30–0:45] 450f
// Big stat cards + unique selling points
// ═══════════════════════════════════════════════════════════
const DifferentiatorScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 22 });

  const stats = [
    { value: '₪149', label: 'מתחילים', color: WARM.amber },
    { value: '5 דק׳', label: 'מהרשמה לעבודה', color: BRAND.indigoLight },
    { value: 'חינם', label: '7 ימי ניסיון', color: '#22C55E' },
  ];

  const differentiators = [
    { text: 'שומרת שבת וחג — אוטומטית', icon: <ShieldCheckIcon size={44} color={WARM.amber} />, delay: 200 },
    { text: 'לוח עברי מובנה — לא תרגום', icon: <ShieldCheckIcon size={44} color={WARM.amber} />, delay: 230 },
    { text: 'AI שכותב עברית אמיתית', icon: <ShieldCheckIcon size={44} color={BRAND.indigoLight} />, delay: 260 },
    { text: 'מליד לחשבונית — בלי אקסל', icon: <ShieldCheckIcon size={44} color={BRAND.indigoLight} />, delay: 290 },
  ];

  return (
    <AbsoluteFill style={{ ...sceneBg('rgba(197,165,114,0.08)', '35%'), ...fillSpread }}>
      <BloomOrb color={WARM.amber} size={500} x="50%" y="25%" intensity={0.1} />
      <BloomOrb color={BRAND.indigo} size={350} x="30%" y="75%" intensity={0.06} />

      {/* Title */}
      <div style={{
        ...gradientText(F.title, 'gold'),
        opacity: titleSpring,
        transform: `translateY(${interpolate(titleSpring, [0, 1], [25, 0])}px)`,
      }}>
        למה דווקא MISRAD AI?
      </div>

      {/* Stat cards — 3 across, BIG */}
      <div style={{ display: 'flex', gap: 20, width: CARD_W }}>
        {stats.map((s, i) => {
          const ss = spring({ frame: Math.max(0, frame - 30 - i * 15), fps, config: SPRING.punch, durationInFrames: 18 });
          return (
            <div key={i} style={{
              ...statCard(s.color),
              opacity: ss,
              transform: `translateY(${interpolate(ss, [0, 1], [40, 0])}px)`,
            }}>
              <div style={{ fontFamily: RUBIK, fontSize: F.hero - 10, fontWeight: 800, color: BRAND.white, marginBottom: 12 }}>
                {s.value}
              </div>
              <div style={{ fontFamily: HEEBO, fontSize: F.label, fontWeight: 700, color: `rgba(255,255,255,0.6)` }}>
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Differentiator rows */}
      <div style={{ width: CARD_W, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {differentiators.map((d, i) => {
          const ds = spring({ frame: Math.max(0, frame - d.delay), fps, config: SPRING.ui, durationInFrames: 16 });
          return (
            <div key={i} style={{
              ...rowCard(WARM.amber),
              opacity: ds,
              transform: `translateX(${interpolate(ds, [0, 1], [50, 0])}px)`,
            }}>
              <span style={{ fontFamily: HEEBO, fontSize: F.body - 2, fontWeight: 800, color: BRAND.white }}>{d.text}</span>
              {d.icon}
            </div>
          );
        })}
      </div>

      <LogoWatermark />
      <GrainOverlay />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 5 — PROOF: "מספרים שמדברים" [0:45–0:55] 300f
// Social proof + stats
// ═══════════════════════════════════════════════════════════
const ProofScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 22 });

  const proofItems = [
    { text: '6 מודולים — מערכת שלמה', color: BRAND.primary, delay: 30 },
    { text: 'לוח עברי + שבת מובנה', color: WARM.amber, delay: 55 },
    { text: 'AI שמבין עברית — שפת אם', color: BRAND.indigoLight, delay: 80 },
    { text: 'מליד לחשבונית — אפס נייר', color: MODULE_COLORS.finance.accent, delay: 105 },
    { text: 'הקמה ב-5 דקות — לא שבועות', color: MODULE_COLORS.operations.accent, delay: 130 },
  ];

  const summarySpring = spring({ frame: Math.max(0, frame - 200), fps, config: SPRING.hero, durationInFrames: 22 });

  return (
    <AbsoluteFill style={{ ...sceneBg('rgba(99,102,241,0.08)', '45%'), ...fillSpread }}>
      <BloomOrb color={BRAND.primary} size={500} x="50%" y="30%" intensity={0.1} />

      {/* Title */}
      <div style={{
        ...gradientText(F.title, 'brand'),
        opacity: titleSpring,
        transform: `translateY(${interpolate(titleSpring, [0, 1], [25, 0])}px)`,
      }}>
        הכל כבר בפנים.
      </div>

      {/* Proof items */}
      <div style={{ width: CARD_W, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {proofItems.map((p, i) => {
          const ps = spring({ frame: Math.max(0, frame - p.delay), fps, config: SPRING.ui, durationInFrames: 18 });
          return (
            <div key={i} style={{
              ...rowCard(p.color),
              opacity: ps,
              transform: `translateX(${interpolate(ps, [0, 1], [60, 0])}px)`,
            }}>
              <span style={{ fontFamily: HEEBO, fontSize: F.body, fontWeight: 800, color: BRAND.white }}>{p.text}</span>
              <CheckIcon size={44} color={p.color} />
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {frame >= 200 && (
        <div style={{
          ...gradientText(F.subtitle + 4, 'gold'),
          opacity: summarySpring,
          transform: `scale(${interpolate(summarySpring, [0, 1], [0.92, 1])})`,
          maxWidth: CARD_W,
        }}>
          לא צריך 5 כלים. צריך כלי אחד שעובד.
        </div>
      )}

      <LogoWatermark />
      <GrainOverlay />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 6 — CTA: "להתחיל עכשיו" [0:55–1:15] 600f
// Full logo + brand moment + CTA button
// ═══════════════════════════════════════════════════════════
const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const brandSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 24 });

  const tags = [
    'מערכת ניהול עסק שלמה.',
    'AI שמבין עברית.',
    'שומרת שבת וחג.',
    'מליד לחשבונית — אוטומטית.',
  ];

  const buttonSpring = spring({ frame: Math.max(0, frame - 250), fps, config: SPRING.punch, durationInFrames: 18 });
  const buttonPulse = frame >= 250 ? Math.sin((frame - 250) * 0.06) * 0.015 + 1 : 1;
  const fadeOut = interpolate(frame, [570, 600], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ ...sceneBg(`${BRAND.primary}0C`, '40%'), ...fillCenter, opacity: fadeOut }}>
      <BloomOrb color={BRAND.primary} size={800} x="50%" y="40%" intensity={0.14} />
      <BloomOrb color={BRAND.indigo} size={500} x="40%" y="60%" intensity={0.08} />
      <BloomOrb color={WARM.amber} size={300} x="65%" y="25%" intensity={0.05} />

      {/* Logo — huge */}
      <div style={{
        opacity: brandSpring,
        transform: `scale(${interpolate(brandSpring, [0, 1], [0.75, 1])})`,
        marginBottom: 60,
      }}>
        <MisradLogo size={140} textSize={72} />
      </div>

      {/* Tag lines */}
      <div style={{ textAlign: 'center', direction: 'rtl', marginBottom: 60, maxWidth: CARD_W }}>
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

      {/* CTA Button */}
      {frame >= 250 && (
        <div style={{
          padding: '28px 90px', borderRadius: 60,
          background: BRAND.gradient,
          boxShadow: `0 20px 60px ${BRAND.primary}40`,
          opacity: buttonSpring,
          transform: `scale(${interpolate(buttonSpring, [0, 1], [0.8, 1]) * buttonPulse})`,
          marginBottom: 32,
        }}>
          <span style={{ fontFamily: RUBIK, fontSize: F.body + 4, fontWeight: 800, color: '#fff' }}>
            להתחיל — חינם
          </span>
        </div>
      )}

      {/* URL */}
      {frame >= 280 && (
        <div style={{
          fontFamily: RUBIK, fontSize: F.label, fontWeight: 700,
          color: 'rgba(255,255,255,0.5)', letterSpacing: 3,
          opacity: spring({ frame: Math.max(0, frame - 280), fps, config: SPRING.ui, durationInFrames: 16 }),
        }}>
          misrad-ai.com
        </div>
      )}

      <GrainOverlay />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPOSITION — L1 Hero Video (75s)
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
