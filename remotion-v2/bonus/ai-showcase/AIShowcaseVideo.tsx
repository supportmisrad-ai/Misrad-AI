import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from 'remotion';
import { BRAND, MODULE_COLORS, HEEBO, RUBIK, SPRING, FPS, V2_TIMING } from '../../shared/config';
import { NoiseLayer, GlassCard, TextReveal, CTAEndcard, pulse } from '../../shared/components';

const T = V2_TIMING;

// ═══════════════════════════════════════════════════════════
// Neural network visualization
// ═══════════════════════════════════════════════════════════
const NeuralNet: React.FC<{ frame: number }> = ({ frame }) => {
  const nodes = React.useMemo(() => {
    const layers = [3, 5, 7, 5, 3];
    const result: Array<{ x: number; y: number; layer: number; idx: number }> = [];
    layers.forEach((count, layerIdx) => {
      for (let i = 0; i < count; i++) {
        result.push({
          x: 100 + layerIdx * 150,
          y: 200 + (i - (count - 1) / 2) * 60,
          layer: layerIdx,
          idx: result.length,
        });
      }
    });
    return result;
  }, []);

  const connections = React.useMemo(() => {
    const result: Array<{ from: number; to: number }> = [];
    const layers = [3, 5, 7, 5, 3];
    let offset = 0;
    for (let l = 0; l < layers.length - 1; l++) {
      const nextOffset = offset + layers[l];
      for (let i = 0; i < layers[l]; i++) {
        for (let j = 0; j < layers[l + 1]; j++) {
          result.push({ from: offset + i, to: nextOffset + j });
        }
      }
      offset = nextOffset;
    }
    return result;
  }, []);

  const pulse = (frame * 0.02) % 1;

  return (
    <svg width="800" height="500" style={{ position: 'absolute', opacity: 0.15, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
      {connections.map((c, i) => {
        const from = nodes[c.from];
        const to = nodes[c.to];
        const dist = Math.abs(from.layer - to.layer);
        const activePulse = ((pulse * 4 + i * 0.01) % 1);
        const opacity = 0.1 + activePulse * 0.15;
        return (
          <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
            stroke={BRAND.primary} strokeWidth={0.5} opacity={opacity} />
        );
      })}
      {nodes.map((n, i) => {
        const glow = 0.3 + Math.sin(frame * 0.08 + i * 0.5) * 0.3;
        return (
          <circle key={i} cx={n.x} cy={n.y} r={4 + glow * 3}
            fill={n.layer === 2 ? BRAND.primary : BRAND.indigo} opacity={0.3 + glow * 0.4} />
        );
      })}
    </svg>
  );
};

// ═══════════════════════════════════════════════════════════
// HOOK — AI brain pulsing [0-90f]
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const brainScale = 1 + Math.sin(frame * 0.12) * 0.06;
  const rings = [1, 2, 3].map((r) => ({
    radius: 80 + r * 40,
    opacity: 0.08 + Math.sin(frame * 0.06 + r) * 0.04,
    rotation: frame * (r % 2 === 0 ? 0.3 : -0.3),
  }));

  return (
    <AbsoluteFill style={{ backgroundColor: '#050507', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <NeuralNet frame={frame} />

      {/* Orbital rings */}
      {rings.map((ring, i) => (
        <div key={i} style={{
          position: 'absolute', width: ring.radius * 2, height: ring.radius * 2,
          borderRadius: '50%', border: `1px solid ${BRAND.primary}`,
          opacity: ring.opacity, transform: `rotate(${ring.rotation}deg)`,
        }} />
      ))}

      {/* Central brain */}
      <div style={{
        fontSize: 90, transform: `scale(${brainScale})`, zIndex: 2,
        filter: `drop-shadow(0 0 50px ${BRAND.primary}60)`,
        opacity: spring({ frame, fps, config: { damping: 14, stiffness: 100, mass: 1.2 }, durationInFrames: 20 }),
      }}>🧠</div>

      <div style={{
        position: 'absolute', marginTop: 260, textAlign: 'center', zIndex: 2,
        opacity: spring({ frame: Math.max(0, frame - 25), fps, config: SPRING.hero, durationInFrames: 20 }),
      }}>
        <div style={{ fontFamily: HEEBO, fontSize: 44, fontWeight: 900, color: BRAND.white, textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}>AI בכל שכבה</div>
        <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 700, color: BRAND.muted, direction: 'rtl', marginTop: 8 }}>לא תוספת. בסיס.</div>
      </div>
      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// PROBLEM — Manual work without AI [90-300f]
// ═══════════════════════════════════════════════════════════
const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const tasks = [
    { text: 'דירוג 30 לידים ידנית', time: '45 דק׳', emoji: '📊' },
    { text: 'כתיבת 5 פוסטים', time: '2.5 שעות', emoji: '✍️' },
    { text: 'מעקב גבייה', time: '40 דק׳', emoji: '💸' },
    { text: 'חלוקת משימות לצוות', time: '30 דק׳', emoji: '👥' },
    { text: 'סיכום שיחות', time: '1 שעה', emoji: '📞' },
    { text: 'הכנת דוח שבועי', time: '1.5 שעות', emoji: '📈' },
  ];

  const totalHours = 6.5;
  const counterProgress = spring({ frame: Math.max(0, frame - 120), fps, config: { damping: 20, stiffness: 50, mass: 1 }, durationInFrames: 30 });

  return (
    <AbsoluteFill style={{ backgroundColor: '#050507', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ fontFamily: HEEBO, fontSize: 28, fontWeight: 900, color: BRAND.white, direction: 'rtl', marginBottom: 24, opacity: spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 }), textShadow: '0 2px 16px rgba(0,0,0,0.6)' }}>
        בלי AI — יום אחד נראה ככה:
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', marginBottom: 24 }}>
        {tasks.map((task, i) => {
          const s = spring({ frame: Math.max(0, frame - i * 8), fps, config: SPRING.ui, durationInFrames: 14 });
          return (
            <div key={i} style={{
              width: 680, padding: '14px 22px', borderRadius: 18,
              background: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.08)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl',
              opacity: s, transform: `translateX(${interpolate(s, [0, 1], [30, 0])}px)`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>{task.emoji}</span>
                <span style={{ fontFamily: HEEBO, fontSize: 15, fontWeight: 700, color: BRAND.white }}>{task.text}</span>
              </div>
              <span style={{ fontFamily: RUBIK, fontSize: 14, fontWeight: 700, color: '#EF4444' }}>{task.time}</span>
            </div>
          );
        })}
      </div>

      {frame > 120 && (
        <div style={{
          fontFamily: RUBIK, fontSize: 56, fontWeight: 900, color: '#EF4444',
          opacity: counterProgress, transform: `scale(${interpolate(counterProgress, [0, 1], [1.4, 1])})`,
          textShadow: '0 0 30px rgba(239,68,68,0.4)',
        }}>
          {(totalHours * counterProgress).toFixed(1)} שעות/יום
        </div>
      )}
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SOLUTION — AI does it all [300-600f]
// ═══════════════════════════════════════════════════════════
const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const flash = interpolate(frame, [0, 10, 25], [0, 0.5, 0], { extrapolateRight: 'clamp' });

  const aiTasks = [
    { text: 'AI דירג 30 לידים', time: '3 שניות', emoji: '📊', color: '#22C55E' },
    { text: 'AI כתב 5 פוסטים', time: '10 שניות', emoji: '✍️', color: '#22C55E' },
    { text: 'AI שלח תזכורות גבייה', time: 'אוטומטי', emoji: '💸', color: '#22C55E' },
    { text: 'AI חילק משימות', time: 'אוטומטי', emoji: '👥', color: '#22C55E' },
    { text: 'AI סיכם שיחות', time: 'מיידי', emoji: '📞', color: '#22C55E' },
    { text: 'AI הכין דוח שבועי', time: '5 שניות', emoji: '📈', color: '#22C55E' },
  ];

  const savedProgress = spring({ frame: Math.max(0, frame - 220), fps, config: SPRING.punch, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: '#050507', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: BRAND.gradient, opacity: flash, pointerEvents: 'none' }} />
      <NeuralNet frame={frame} />

      <div style={{
        fontFamily: HEEBO, fontSize: 28, fontWeight: 900, color: BRAND.white, direction: 'rtl', marginBottom: 24, zIndex: 2,
        opacity: spring({ frame: Math.max(0, frame - 15), fps, config: SPRING.hero, durationInFrames: 18 }),
        textShadow: '0 2px 16px rgba(0,0,0,0.6)',
      }}>
        🧠 עם AI — אותו יום נראה ככה:
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', marginBottom: 24, zIndex: 2 }}>
        {aiTasks.map((task, i) => {
          const delay = 40 + i * 20;
          const s = spring({ frame: Math.max(0, frame - delay), fps, config: SPRING.ui, durationInFrames: 14 });
          return (
            <div key={i} style={{
              width: 680, padding: '14px 22px', borderRadius: 18,
              background: `${task.color}04`, border: `1px solid ${task.color}15`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl',
              opacity: s, transform: `translateX(${interpolate(s, [0, 1], [30, 0])}px)`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>{task.emoji}</span>
                <span style={{ fontFamily: HEEBO, fontSize: 15, fontWeight: 700, color: BRAND.white }}>{task.text}</span>
              </div>
              <span style={{ fontFamily: RUBIK, fontSize: 14, fontWeight: 700, color: '#22C55E' }}>{task.time}</span>
            </div>
          );
        })}
      </div>

      {frame > 220 && (
        <div style={{
          fontFamily: RUBIK, fontSize: 48, fontWeight: 900, color: '#22C55E', zIndex: 2,
          opacity: savedProgress, transform: `scale(${interpolate(savedProgress, [0, 1], [1.3, 1])})`,
          textShadow: '0 0 30px rgba(34,197,94,0.4)',
        }}>
          חסכת 6+ שעות ✅
        </div>
      )}
      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SHOWCASE — AI capabilities deep dive [600-1050f]
// ═══════════════════════════════════════════════════════════
const ShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const capabilities = [
    { emoji: '🎯', title: 'דירוג לידים חכם', desc: 'AI שמנתח כל ליד ומדרג סיכויי סגירה. מזהה חם, קר, ו"עכשיו".', color: MODULE_COLORS.system.accent, delay: 0 },
    { emoji: '✍️', title: 'יצירת תוכן AI', desc: 'פוסטים, מיילים, הודעות — בעברית מושלמת. מותאם לטון העסק.', color: MODULE_COLORS.social.accent, delay: 55 },
    { emoji: '📊', title: 'דוחות אוטומטיים', desc: 'דשבורדים שמתעדכנים בזמן אמת. דוחות שבועיים אוטומטיים.', color: MODULE_COLORS.finance.accent, delay: 110 },
    { emoji: '🔮', title: 'חיזוי מגמות', desc: 'AI שמנבא הכנסות, מזהה סיכונים, ומציע פעולות מונעות.', color: BRAND.indigo, delay: 165 },
    { emoji: '🤖', title: 'אוטומציה חוצת-מודולים', desc: 'ליד נכנס → AI מדרג → צוות מטפל → חשבונית יוצאת. אוטומטי.', color: BRAND.primary, delay: 220 },
    { emoji: '🧠', title: 'למידה מתמשכת', desc: 'ה-AI לומד מהפעולות שלך, מזהה דפוסים, ומשתפר עם הזמן.', color: '#7C3AED', delay: 275 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: '#050507', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <NeuralNet frame={frame} />

      <div style={{ fontFamily: HEEBO, fontSize: 32, fontWeight: 900, color: BRAND.white, direction: 'rtl', marginBottom: 28, zIndex: 2, textShadow: '0 2px 16px rgba(0,0,0,0.6)' }}>
        מה ה-AI יודע לעשות?
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', zIndex: 2 }}>
        {capabilities.map((cap, i) => (
          <GlassCard key={i} variant="dark" delay={cap.delay} width={760} glowColor={cap.color}>
            <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'flex-start', gap: 14, direction: 'rtl' }}>
              <div style={{ width: 50, height: 50, borderRadius: 16, background: `${cap.color}10`, border: `1px solid ${cap.color}20`, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 26, flexShrink: 0 }}>{cap.emoji}</div>
              <div>
                <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 800, color: cap.color }}>{cap.title}</div>
                <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: BRAND.muted, lineHeight: 1.5, marginTop: 3 }}>{cap.desc}</div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// RESULTS [1050-1350f]
// ═══════════════════════════════════════════════════════════
const ResultsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stats = [
    { value: '-90%', label: 'עבודה ידנית', delay: 0 },
    { value: '×10', label: 'תפוקה', delay: 20 },
    { value: '6h+', label: 'נחסכות ביום', delay: 40 },
    { value: '0', label: 'טעויות אנוש', delay: 60 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: '#050507', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <NeuralNet frame={frame} />

      <div style={{ fontFamily: HEEBO, fontSize: 30, fontWeight: 900, color: BRAND.white, direction: 'rtl', marginBottom: 32, zIndex: 2, textShadow: '0 2px 16px rgba(0,0,0,0.6)' }}>
        AI שעובד — אתה צומח
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 800, zIndex: 2 }}>
        {stats.map((stat, i) => {
          const s = spring({ frame: Math.max(0, frame - stat.delay), fps, config: { damping: 10, stiffness: 120, mass: 1 }, durationInFrames: 22 });
          return (
            <div key={i} style={{
              width: 175, padding: '28px 20px', borderRadius: 28, textAlign: 'center',
              background: `${BRAND.primary}04`, border: `1px solid ${BRAND.primary}10`,
              backdropFilter: 'blur(20px)',
              opacity: s, transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`,
              boxShadow: `0 16px 48px ${BRAND.primary}08`,
            }}>
              <div style={{ fontFamily: RUBIK, fontSize: 48, fontWeight: 900, background: BRAND.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {stat.value}
              </div>
              <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: BRAND.muted, marginTop: 8, direction: 'rtl' }}>{stat.label}</div>
            </div>
          );
        })}
      </div>
      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

const TaglineScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{
      background: `linear-gradient(135deg, ${BRAND.primary} 0%, #1a0a15 30%, #0a0a1a 70%, ${BRAND.indigo} 100%)`,
      justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
      opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }),
    }}>
      <TextReveal text="AI שעובד. אתה צומח." delay={5} fontSize={52} fontWeight={900} color="#fff" mode="words" stagger={3} style={{ textAlign: 'center' }} />
      <div style={{ marginTop: 20, fontFamily: HEEBO, fontSize: 24, fontWeight: 700, color: 'rgba(255,255,255,0.6)', direction: 'rtl', opacity: spring({ frame: Math.max(0, frame - 35), fps: FPS, config: SPRING.hero, durationInFrames: 18 }) }}>
        MISRAD AI — AI בכל שכבה 🧠
      </div>
      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

export const AIShowcaseVideoV2: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={T.HOOK.from} durationInFrames={T.HOOK.dur}><HookScene /></Sequence>
    <Sequence from={T.PROBLEM.from} durationInFrames={T.PROBLEM.dur}><ProblemScene /></Sequence>
    <Sequence from={T.SOLUTION.from} durationInFrames={T.SOLUTION.dur}><SolutionScene /></Sequence>
    <Sequence from={T.SHOWCASE.from} durationInFrames={T.SHOWCASE.dur}><ShowcaseScene /></Sequence>
    <Sequence from={T.RESULTS.from} durationInFrames={T.RESULTS.dur}><ResultsScene /></Sequence>
    <Sequence from={T.TAGLINE.from} durationInFrames={T.TAGLINE.dur}><TaglineScene /></Sequence>
    <Sequence from={T.CTA.from} durationInFrames={T.CTA.dur}>
      <CTAEndcard variant="dark" accentColor={BRAND.primary} tagline="AI בכל שכבה — MISRAD AI" />
    </Sequence>
  </AbsoluteFill>
);
