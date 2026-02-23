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
import { L1_TIMING, WARM } from './shared/launch-config';
import {
  F, CARD_W, ACCENT, gradientText, sceneBg, safeFill, safeTop,
  glassCard, statCard, rowCard,
  MisradLogo, LogoWatermark, BloomOrb, GrainOverlay,
  CheckIcon, ShieldCheckIcon, DangerDot, FlowArrow,
} from './shared/launch-design';

const T = L1_TIMING;

// ═══════════════════════════════════════════════════════════
// SCENE 1 — HOOK [0:00–0:05]
// Logo + one punchy line. Clean, fast.
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 20 });
  const titleSpring = spring({ frame: Math.max(0, frame - 25), fps, config: SPRING.hero, durationInFrames: 18 });
  const subSpring = spring({ frame: Math.max(0, frame - 45), fps, config: SPRING.ui, durationInFrames: 16 });

  return (
    <AbsoluteFill style={{ ...sceneBg(ACCENT.goldDim, '40%'), ...safeFill }}>
      <BloomOrb color={ACCENT.gold} size={600} x="50%" y="40%" intensity={0.12} />

      <div style={{
        opacity: logoSpring,
        transform: `scale(${interpolate(logoSpring, [0, 1], [0.7, 1])})`,
      }}>
        <MisradLogo size={120} textSize={56} />
      </div>

      <div style={{
        ...gradientText(F.hero, 'gold'),
        opacity: titleSpring,
        transform: `translateY(${interpolate(titleSpring, [0, 1], [20, 0])}px)`,
        maxWidth: CARD_W,
      }}>
        הבלגן שבחוץ
      </div>

      <div style={{
        fontFamily: HEEBO, fontSize: F.subtitle, fontWeight: 700,
        color: 'rgba(255,255,255,0.7)', direction: 'rtl', textAlign: 'center',
        opacity: subSpring,
        maxWidth: CARD_W,
      }}>
        כל בעל עסק מכיר את זה.
      </div>

      <LogoWatermark />
      <GrainOverlay />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 2 — PROBLEM [0:05–0:15]
// 3 pain items ONLY. Centered. Gold accent unified.
// ═══════════════════════════════════════════════════════════
const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 });

  const pains = [
    { text: 'ליד שנשרף כי שכחת לחזור', delay: 20 },
    { text: 'חשבונית שנתקעה כי האקסל קרס', delay: 40 },
    { text: 'יום שישי — ועוד לא סגרת את השבוע', delay: 60 },
  ];

  return (
    <AbsoluteFill style={{ ...sceneBg('rgba(99,102,241,0.06)', '35%'), ...safeFill }}>
      <BloomOrb color={ACCENT.gold} size={500} x="50%" y="35%" intensity={0.1} />

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

      <LogoWatermark />
      <GrainOverlay />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 3 — SOLUTION [0:15–0:30]
// 3 key features + pipeline. Gold accent only.
// ═══════════════════════════════════════════════════════════
const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 });

  const features = [
    { text: 'ליד נכנס — AI מדרג ומתעדף', delay: 20 },
    { text: 'חשבונית נשלחת בוואטסאפ — בלחיצה', delay: 45 },
    { text: 'CRM + צוות + תוכן — הכל במקום אחד', delay: 70 },
  ];

  const steps = ['ליד', 'AI', 'הצעה', 'חתימה', 'חשבונית'];
  const pipeSpring = spring({ frame: Math.max(0, frame - 180), fps, config: SPRING.hero, durationInFrames: 18 });

  const bottomSpring = spring({ frame: Math.max(0, frame - 300), fps, config: SPRING.ui, durationInFrames: 16 });

  return (
    <AbsoluteFill style={{ ...sceneBg(ACCENT.goldDim, '38%'), ...safeFill }}>
      <BloomOrb color={ACCENT.gold} size={500} x="50%" y="35%" intensity={0.1} />

      <div style={{
        ...gradientText(F.title, 'gold'),
        opacity: titleSpring,
        maxWidth: CARD_W,
      }}>
        מערכת אחת. שעושה הכל.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: CARD_W }}>
        {features.map((feat, i) => {
          const fs = spring({ frame: Math.max(0, frame - feat.delay), fps, config: SPRING.punch, durationInFrames: 14 });
          return (
            <div key={i} style={{
              ...rowCard(),
              opacity: fs,
              transform: `translateX(${interpolate(fs, [0, 1], [40, 0])}px)`,
            }}>
              <span style={{ fontFamily: HEEBO, fontSize: F.body - 2, fontWeight: 800, color: BRAND.white }}>{feat.text}</span>
              <CheckIcon size={40} color={ACCENT.gold} />
            </div>
          );
        })}
      </div>

      {/* Pipeline */}
      {frame >= 180 && (
        <div style={{
          width: CARD_W, display: 'flex', justifyContent: 'center',
          gap: 10, direction: 'rtl' as const,
          opacity: pipeSpring,
        }}>
          {steps.map((step, i) => (
            <React.Fragment key={i}>
              <div style={{
                padding: '14px 26px', borderRadius: 18,
                background: ACCENT.goldDim,
                border: `1.5px solid ${ACCENT.gold}35`,
                fontFamily: HEEBO, fontSize: F.label, fontWeight: 700,
                color: BRAND.white,
              }}>
                {step}
              </div>
              {i < steps.length - 1 && <FlowArrow size={24} color={`${ACCENT.gold}50`} />}
            </React.Fragment>
          ))}
        </div>
      )}

      {frame >= 300 && (
        <div style={{
          ...gradientText(F.subtitle, 'gold'),
          opacity: bottomSpring,
          maxWidth: CARD_W,
        }}>
          AI שמבין עברית. לא תרגום. שפת אם.
        </div>
      )}

      <LogoWatermark />
      <GrainOverlay />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 4 — DIFFERENTIATOR [0:30–0:45]
// 3 stats + 2 differentiators. Gold.
// ═══════════════════════════════════════════════════════════
const DifferentiatorScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 });

  const stats = [
    { value: '₪149', label: 'מתחילים' },
    { value: '5 דק׳', label: 'הקמה' },
    { value: 'חינם', label: '7 ימי ניסיון' },
  ];

  const diffs = [
    { text: 'שומרת שבת וחג — אוטומטית', delay: 150 },
    { text: 'לוח עברי מובנה — לא תרגום', delay: 180 },
  ];

  return (
    <AbsoluteFill style={{ ...sceneBg(ACCENT.goldDim, '35%'), ...safeFill }}>
      <BloomOrb color={ACCENT.gold} size={500} x="50%" y="30%" intensity={0.1} />

      <div style={{
        ...gradientText(F.title, 'gold'),
        opacity: titleSpring,
      }}>
        {'למה MISRAD AI?'}
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 18, width: CARD_W }}>
        {stats.map((s, i) => {
          const ss = spring({ frame: Math.max(0, frame - 20 - i * 10), fps, config: SPRING.punch, durationInFrames: 14 });
          return (
            <div key={i} style={{
              ...statCard(ACCENT.gold),
              opacity: ss,
              transform: `translateY(${interpolate(ss, [0, 1], [30, 0])}px)`,
            }}>
              <div style={{ fontFamily: RUBIK, fontSize: F.title, fontWeight: 800, color: ACCENT.gold, marginBottom: 8 }}>
                {s.value}
              </div>
              <div style={{ fontFamily: HEEBO, fontSize: F.label, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Differentiators */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: CARD_W }}>
        {diffs.map((d, i) => {
          const ds = spring({ frame: Math.max(0, frame - d.delay), fps, config: SPRING.punch, durationInFrames: 14 });
          return (
            <div key={i} style={{
              ...rowCard(),
              opacity: ds,
              transform: `translateX(${interpolate(ds, [0, 1], [40, 0])}px)`,
            }}>
              <span style={{ fontFamily: HEEBO, fontSize: F.body - 2, fontWeight: 800, color: BRAND.white }}>{d.text}</span>
              <ShieldCheckIcon size={44} color={ACCENT.gold} />
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
// SCENE 5 — PROOF [0:45–0:55]
// 3 proof items + summary. Clean.
// ═══════════════════════════════════════════════════════════
const ProofScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 });

  const items = [
    { text: 'הכל כלול — מערכת שלמה', delay: 20 },
    { text: 'AI שמבין עברית — שפת אם', delay: 45 },
    { text: 'מליד לחשבונית — אפס נייר', delay: 70 },
  ];

  const summarySpring = spring({ frame: Math.max(0, frame - 170), fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ ...sceneBg(ACCENT.goldDim, '40%'), ...safeFill }}>
      <BloomOrb color={ACCENT.gold} size={500} x="50%" y="35%" intensity={0.1} />

      <div style={{
        ...gradientText(F.title, 'warm'),
        opacity: titleSpring,
      }}>
        הכל כבר בפנים.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: CARD_W }}>
        {items.map((p, i) => {
          const ps = spring({ frame: Math.max(0, frame - p.delay), fps, config: SPRING.punch, durationInFrames: 14 });
          return (
            <div key={i} style={{
              ...rowCard(),
              opacity: ps,
              transform: `translateX(${interpolate(ps, [0, 1], [40, 0])}px)`,
            }}>
              <span style={{ fontFamily: HEEBO, fontSize: F.body, fontWeight: 800, color: BRAND.white }}>{p.text}</span>
              <CheckIcon size={44} color={ACCENT.gold} />
            </div>
          );
        })}
      </div>

      {frame >= 170 && (
        <div style={{
          ...gradientText(F.subtitle, 'gold'),
          opacity: summarySpring,
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
// SCENE 6 — CTA [0:55–1:15]
// Logo big + 2 taglines + button. Clean gold.
// ═══════════════════════════════════════════════════════════
const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const brandSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 20 });

  const tags = [
    'מערכת ניהול עסק שלמה.',
    'AI שמבין עברית. שומרת שבת.',
  ];

  const buttonSpring = spring({ frame: Math.max(0, frame - 180), fps, config: SPRING.punch, durationInFrames: 16 });
  const buttonPulse = frame >= 180 ? Math.sin((frame - 180) * 0.06) * 0.015 + 1 : 1;
  const fadeOut = interpolate(frame, [570, 600], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ ...sceneBg(ACCENT.goldDim, '40%'), ...safeFill, opacity: fadeOut }}>
      <BloomOrb color={ACCENT.gold} size={700} x="50%" y="40%" intensity={0.14} />

      <div style={{
        opacity: brandSpring,
        transform: `scale(${interpolate(brandSpring, [0, 1], [0.75, 1])})`,
      }}>
        <MisradLogo size={140} textSize={72} />
      </div>

      <div style={{ textAlign: 'center', direction: 'rtl', maxWidth: CARD_W }}>
        {tags.map((tag, i) => {
          const ts = spring({ frame: Math.max(0, frame - 30 - i * 10), fps, config: SPRING.ui, durationInFrames: 14 });
          return (
            <div key={i} style={{
              fontFamily: HEEBO, fontSize: F.subtitle, fontWeight: 700,
              color: 'rgba(255,255,255,0.75)',
              marginBottom: 14,
              opacity: ts,
            }}>
              {tag}
            </div>
          );
        })}
      </div>

      {frame >= 180 && (
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

      {frame >= 210 && (
        <div style={{
          fontFamily: RUBIK, fontSize: F.label, fontWeight: 700,
          color: 'rgba(255,255,255,0.5)', letterSpacing: 3,
          opacity: spring({ frame: Math.max(0, frame - 210), fps, config: SPRING.ui, durationInFrames: 14 }),
        }}>
          <span dir="ltr">misrad-ai.com</span>
        </div>
      )}

      <GrainOverlay />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPOSITION
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
