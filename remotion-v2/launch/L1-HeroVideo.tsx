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
import { L1_TIMING } from './shared/launch-config';
import {
  F, CARD_W, ACCENT, gradientText, sceneBg,
  glassCard, statCard, rowCard, SceneContainer,
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

  const logoSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 25 });
  const titleSpring = spring({ frame: Math.max(0, frame - 25), fps, config: SPRING.heavy, durationInFrames: 30 });
  const subSpring = spring({ frame: Math.max(0, frame - 55), fps, config: SPRING.smooth, durationInFrames: 25 });

  const floatY = Math.sin(frame * 0.05) * 8;

  return (
    <SceneContainer style={sceneBg(ACCENT.goldDim, '40%')} focusY="45%">
      <BloomOrb color={ACCENT.gold} size={800} x="50%" y="40%" intensity={0.15} />

      <div style={{
        opacity: logoSpring,
        transform: `scale(${interpolate(logoSpring, [0, 1], [0.6, 1])}) translateY(${floatY}px)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <MisradLogo size={140} textSize={64} />
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 40,
        width: '100%',
      }}>
        <div style={{
          ...gradientText(F.mega, 'gold'),
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [40, 0])}px) scale(${interpolate(titleSpring, [0, 1], [0.95, 1])})`,
          maxWidth: CARD_W,
          filter: `blur(${interpolate(titleSpring, [0, 1], [10, 0])}px)`,
        }}>
          הבלגן שבחוץ
        </div>

        <div style={{
          fontFamily: HEEBO, fontSize: F.subtitle, fontWeight: 900,
          color: 'rgba(255,255,255,0.85)', direction: 'rtl', textAlign: 'center',
          opacity: subSpring, maxWidth: CARD_W,
          transform: `translateY(${interpolate(subSpring, [0, 1], [20, 0])}px)`,
          letterSpacing: '0.05em',
        }}>
          כל בעל עסק מכיר את זה.
        </div>
      </div>

      <LogoWatermark opacity={0.2} />
    </SceneContainer>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 2 — PROBLEM [0:05–0:15]
// 3 pain items ONLY. Centered. Gold accent unified.
// ═══════════════════════════════════════════════════════════
const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: SPRING.heavy, durationInFrames: 25 });

  const pains = [
    { text: 'ליד שנשרף כי שכחת לחזור', delay: 20 },
    { text: 'חשבונית שנתקעה כי האקסל קרס', delay: 40 },
    { text: 'יום שישי — ועוד לא סגרת את השבוע', delay: 60 },
  ];

  return (
    <SceneContainer style={sceneBg('rgba(99,102,241,0.06)', '35%')} focusY="40%">
      <BloomOrb color={ACCENT.gold} size={600} x="50%" y="35%" intensity={0.12} />

      <div style={{
        ...gradientText(F.hero, 'warm'),
        opacity: titleSpring,
        transform: `translateY(${interpolate(titleSpring, [0, 1], [30, 0])}px)`,
        filter: `blur(${interpolate(titleSpring, [0, 1], [8, 0])}px)`,
      }}>
        בלי מערכת? ככה זה נראה:
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: CARD_W }}>
        {pains.map((p, i) => {
          const ps = spring({ frame: Math.max(0, frame - p.delay), fps, config: SPRING.punch, durationInFrames: 18 });
          return (
            <div key={i} style={{
              ...rowCard(),
              padding: '36px 48px',
              borderRadius: 32,
              background: 'rgba(15, 23, 42, 0.8)',
              border: `2px solid ${ACCENT.gold}40`,
              opacity: ps,
              transform: `translateX(${interpolate(ps, [0, 1], [60, 0])}px) scale(${interpolate(ps, [0, 1], [0.95, 1])})`,
              justifyContent: 'flex-start',
              gap: 24,
            }}>
              <DangerDot size={24} color={ACCENT.gold} />
              <span style={{ fontFamily: RUBIK, fontSize: F.body + 4, fontWeight: 900, color: BRAND.white }}>
                {p.text}
              </span>
            </div>
          );
        })}
      </div>

      <LogoWatermark opacity={0.3} />
    </SceneContainer>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 3 — SOLUTION [0:15–0:30]
// 3 key features + pipeline. Gold accent only.
// ═══════════════════════════════════════════════════════════
const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: SPRING.heavy, durationInFrames: 25 });

  const features = [
    { text: 'ליד נכנס — AI מדרג ומתעדף', delay: 20 },
    { text: 'חשבונית נשלחת — בלחיצת כפתור', delay: 45 },
    { text: 'CRM + צוות + תוכן — הכל במקום אחד', delay: 70 },
  ];

  const pipeSpring = spring({ frame: Math.max(0, frame - 180), fps, config: SPRING.heavy, durationInFrames: 25 });
  const bottomSpring = spring({ frame: Math.max(0, frame - 300), fps, config: SPRING.punch, durationInFrames: 20 });

  const steps = ['ליד', 'AI', 'הצעה', 'חתימה', 'חשבונית'];

  return (
    <SceneContainer style={sceneBg(ACCENT.goldDim, '38%')} focusY="45%">
      <BloomOrb color={ACCENT.gold} size={600} x="50%" y="40%" intensity={0.15} />

      <div style={{
        ...gradientText(F.hero, 'gold'),
        opacity: titleSpring,
        transform: `translateY(${interpolate(titleSpring, [0, 1], [30, 0])}px)`,
        maxWidth: CARD_W,
      }}>
        מערכת אחת. שעושה הכל.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: CARD_W }}>
        {features.map((feat, i) => {
          const fs = spring({ frame: Math.max(0, frame - feat.delay), fps, config: SPRING.punch, durationInFrames: 18 });
          return (
            <div key={i} style={{
              ...rowCard(),
              padding: '32px 48px',
              borderRadius: 32,
              background: 'rgba(15, 23, 42, 0.8)',
              border: `2px solid ${ACCENT.gold}50`,
              opacity: fs,
              transform: `translateX(${interpolate(fs, [0, 1], [60, 0])}px)`,
            }}>
              <span style={{ fontFamily: RUBIK, fontSize: F.body + 2, fontWeight: 900, color: BRAND.white }}>{feat.text}</span>
              <CheckIcon size={48} color={ACCENT.gold} />
            </div>
          );
        })}
      </div>

      {/* Pipeline */}
      <div style={{
        width: 1000, display: 'flex', justifyContent: 'center',
        gap: 12, direction: 'rtl' as const,
        opacity: pipeSpring,
        transform: `scale(${interpolate(pipeSpring, [0, 1], [0.9, 1])})`,
      }}>
        {steps.map((step, i) => (
          <React.Fragment key={i}>
            <div style={{
              padding: '16px 22px', borderRadius: 20,
              background: ACCENT.goldDim,
              border: `2px solid ${ACCENT.gold}50`,
              fontFamily: RUBIK, fontSize: F.label + 2, fontWeight: 900,
              color: BRAND.white,
            }}>
              {step}
            </div>
            {i < steps.length - 1 && <FlowArrow size={24} color={`${ACCENT.gold}50`} />}
          </React.Fragment>
        ))}
      </div>

      <div style={{ height: 120 }}>
        {frame >= 300 && (
          <div style={{
            ...gradientText(F.subtitle, 'gold'),
            opacity: bottomSpring,
            maxWidth: CARD_W,
            transform: `translateY(${interpolate(bottomSpring, [0, 1], [20, 0])}px)`,
          }}>
            AI שמבין עברית. לא תרגום. שפת אם.
          </div>
        )}
      </div>

      <LogoWatermark opacity={0.3} />
    </SceneContainer>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 4 — DIFFERENTIATOR [0:30–0:45]
// 3 stats + 2 differentiators. Gold.
// ═══════════════════════════════════════════════════════════
const DifferentiatorScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: SPRING.heavy, durationInFrames: 25 });

  const stats = [
              {value: '₪149', label: 'מתחילים'},
              {value: '5 דק׳', label: 'הקמה'},
              {value: 'חינם', label: '7 ימי ניסיון'},
  ];

  const diffs = [
              {text: 'שומרת שבת וחג — אוטומטית', delay: 150},
              {text: 'לוח עברי מובנה — לא תרגום', delay: 180},
  ];

  return (
    <SceneContainer style={sceneBg(ACCENT.goldDim, '35%')} focusY="35%">
      <BloomOrb color={ACCENT.gold} size={600} x="50%" y="30%" intensity={0.12} />

      <div style={{
        ...gradientText(F.hero, 'gold'),
        opacity: titleSpring,
        transform: `translateY(${interpolate(titleSpring, [0, 1], [30, 0])}px)`,
      }}>
        למה MISRAD AI?
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 20, width: CARD_W }}>
        {stats.map((s, i) => {
          const ss = spring({ frame: Math.max(0, frame - 30 - i * 15), fps, config: SPRING.punch, durationInFrames: 20 });
          return (
            <div key={i} style={{
              ...statCard(ACCENT.gold),
              background: 'rgba(15, 23, 42, 0.85)',
              border: `2px solid ${ACCENT.gold}50`,
              boxShadow: `0 20px 60px ${ACCENT.gold}15`,
              opacity: ss,
              transform: `translateY(${interpolate(ss, [0, 1], [40, 0])}px) scale(${interpolate(ss, [0, 1], [0.9, 1])})`,
              padding: '40px 20px',
            }}>
              <div style={{ fontFamily: RUBIK, fontSize: F.title + 10, fontWeight: 900, color: ACCENT.gold, marginBottom: 12 }}>
                {s.value}
              </div>
              <div style={{ fontFamily: RUBIK, fontSize: F.label + 4, fontWeight: 800, color: 'rgba(255,255,255,0.7)' }}>
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Differentiators */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: CARD_W }}>
        {diffs.map((d, i) => {
          const ds = spring({ frame: Math.max(0, frame - d.delay), fps, config: SPRING.punch, durationInFrames: 18 });
          return (
            <div key={i} style={{
              ...rowCard(),
              padding: '32px 48px',
              borderRadius: 32,
              background: 'rgba(15, 23, 42, 0.8)',
              border: `2px solid ${ACCENT.gold}60`,
              opacity: ds,
              transform: `translateX(${interpolate(ds, [0, 1], [60, 0])}px)`,
            }}>
              <span style={{ fontFamily: RUBIK, fontSize: F.body + 2, fontWeight: 900, color: BRAND.white }}>{d.text}</span>
              <ShieldCheckIcon size={52} color={ACCENT.gold} />
            </div>
          );
        })}
      </div>

      <LogoWatermark opacity={0.3} />
    </SceneContainer>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 5 — PROOF [0:45–0:55]
// 3 proof items + summary. Clean.
// ═══════════════════════════════════════════════════════════
const ProofScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: SPRING.heavy, durationInFrames: 25 });

  const items = [
    { text: 'הכל כלול — מערכת שלמה', delay: 20 },
    { text: 'AI שמבין עברית — שפת אם', delay: 45 },
    { text: 'מליד לחשבונית — אפס נייר', delay: 70 },
  ];

  const summarySpring = spring({ frame: Math.max(0, frame - 170), fps, config: SPRING.punch, durationInFrames: 20 });

  return (
    <SceneContainer style={sceneBg(ACCENT.goldDim, '40%')} focusY="45%">
      <BloomOrb color={ACCENT.gold} size={600} x="50%" y="40%" intensity={0.15} />

      <div style={{
        ...gradientText(F.hero, 'warm'),
        opacity: titleSpring,
        transform: `translateY(${interpolate(titleSpring, [0, 1], [30, 0])}px)`,
      }}>
        הכל כבר בפנים.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: CARD_W }}>
        {items.map((p, i) => {
          const ps = spring({ frame: Math.max(0, frame - p.delay), fps, config: SPRING.punch, durationInFrames: 18 });
          return (
            <div key={i} style={{
              ...rowCard(),
              padding: '36px 50px',
              borderRadius: 32,
              background: 'rgba(15, 23, 42, 0.8)',
              border: `2px solid ${ACCENT.gold}40`,
              opacity: ps,
              transform: `translateX(${interpolate(ps, [0, 1], [60, 0])}px)`,
            }}>
              <span style={{ fontFamily: RUBIK, fontSize: F.body + 6, fontWeight: 900, color: BRAND.white }}>{p.text}</span>
              <CheckIcon size={52} color={ACCENT.gold} />
            </div>
          );
        })}
      </div>

      <div style={{ height: 120 }}>
        {frame >= 170 && (
          <div style={{
            ...gradientText(F.subtitle, 'gold'),
            opacity: summarySpring,
            maxWidth: CARD_W,
            transform: `translateY(${interpolate(summarySpring, [0, 1], [20, 0])}px)`,
          }}>
            לא צריך 5 כלים. צריך כלי אחד שעובד.
          </div>
        )}
      </div>

      <LogoWatermark opacity={0.3} />
    </SceneContainer>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 6 — CTA [0:55–1:15]
// Logo big + 2 taglines + button. Clean gold.
// ═══════════════════════════════════════════════════════════
const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const brandSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 25 });

  const tags = [
    'מערכת ניהול עסק שלמה.',
    'AI שמבין עברית. שומרת שבת.',
  ];

  const buttonSpring = spring({ frame: Math.max(0, frame - 180), fps, config: SPRING.punch, durationInFrames: 20 });
  const buttonPulse = frame >= 180 ? Math.sin((frame - 180) * 0.06) * 0.015 + 1 : 1;
  const fadeOut = interpolate(frame, [570, 600], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <SceneContainer style={{ ...sceneBg(ACCENT.goldDim, '40%'), opacity: fadeOut }} focusY="40%">
      <BloomOrb color={ACCENT.gold} size={800} x="50%" y="40%" intensity={0.15} />

      <div style={{
        opacity: brandSpring,
        transform: `scale(${interpolate(brandSpring, [0, 1], [0.75, 1])})`,
        marginBottom: 60,
      }}>
        <MisradLogo size={180} textSize={84} />
      </div>

      <div style={{ textAlign: 'center', direction: 'rtl', maxWidth: CARD_W, marginBottom: 80 }}>
        {tags.map((tag, i) => {
          const ts = spring({ frame: Math.max(0, frame - 40 - i * 15), fps, config: SPRING.smooth, durationInFrames: 20 });
          return (
            <div key={i} style={{
              fontFamily: RUBIK, fontSize: F.hero - 10, fontWeight: 900,
              color: 'rgba(255,255,255,0.85)',
              marginBottom: 20,
              opacity: ts,
              transform: `translateY(${interpolate(ts, [0, 1], [20, 0])}px)`,
            }}>
              {tag}
            </div>
          );
        })}
      </div>

      {frame >= 180 && (
        <div style={{
          padding: '36px 110px', borderRadius: 80,
          background: `linear-gradient(135deg, ${ACCENT.gold} 0%, ${ACCENT.goldLight} 100%)`,
          boxShadow: `0 25px 80px ${ACCENT.gold}60`,
          opacity: buttonSpring,
          transform: `scale(${interpolate(buttonSpring, [0, 1], [0.8, 1]) * buttonPulse})`,
          marginBottom: 50,
        }}>
          <span style={{ fontFamily: RUBIK, fontSize: F.hero - 20, fontWeight: 900, color: '#0A0A0F' }}>
            להתחיל — חינם
          </span>
        </div>
      )}

      {frame >= 220 && (
        <div style={{
          fontFamily: RUBIK, fontSize: F.body, fontWeight: 800,
          color: 'rgba(255,255,255,0.6)', letterSpacing: 4,
          opacity: spring({ frame: Math.max(0, frame - 220), fps, config: SPRING.ui, durationInFrames: 18 }),
        }}>
          <span dir="ltr">misrad-ai.com</span>
        </div>
      )}

      <LogoWatermark opacity={0.3} />
    </SceneContainer>
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
