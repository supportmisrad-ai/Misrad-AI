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
import { NoiseLayer, GlassCard, TextReveal, CTAEndcard, DeviceFrame, pulse } from '../../shared/components';

const T = V2_TIMING;

const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const brainPulse = 1 + Math.sin(frame * 0.15) * 0.08;
  const sparkles = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2 + frame * 0.03;
    const r = 120 + Math.sin(frame * 0.1 + i) * 20;
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r, delay: i * 3 };
  });

  const titleSpring = spring({ frame: Math.max(0, frame - 20), fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${BRAND.primary}10 0%, transparent 60%)` }} />

      {/* Sparkles */}
      {sparkles.map((s, i) => {
        const sp = spring({ frame: Math.max(0, frame - s.delay), fps, config: SPRING.punch, durationInFrames: 14 });
        return (
          <div key={i} style={{
            position: 'absolute', width: 6, height: 6, borderRadius: '50%',
            background: i % 2 === 0 ? BRAND.primary : BRAND.indigoLight,
            transform: `translate(${s.x}px, ${s.y}px)`, opacity: sp * 0.6,
            boxShadow: `0 0 8px ${i % 2 === 0 ? BRAND.primary : BRAND.indigoLight}60`,
          }} />
        );
      })}

      {/* Brain emoji */}
      <div style={{
        fontSize: 80, transform: `scale(${brainPulse})`,
        filter: `drop-shadow(0 0 30px ${BRAND.primary}50)`,
      }}>🧠</div>

      <div style={{ position: 'absolute', marginTop: 240, textAlign: 'center', opacity: titleSpring }}>
        <div style={{ fontFamily: HEEBO, fontSize: 44, fontWeight: 900, color: BRAND.white, textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>AI בפעולה</div>
        <div style={{ fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: BRAND.muted, direction: 'rtl', marginTop: 8 }}>
          תראה מה ה-AI עושה בשבילך. בזמן אמת.
        </div>
      </div>
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const manualTasks = [
    { text: 'כתוב פוסט לפייסבוק', time: '25 דקות', icon: '✍️' },
    { text: 'דרג 15 לידים', time: '40 דקות', icon: '📊' },
    { text: 'שלח 8 פולואפים', time: '30 דקות', icon: '📧' },
    { text: 'עדכן דשבורד', time: '15 דקות', icon: '📋' },
    { text: 'הכן דוח שבועי', time: '45 דקות', icon: '📈' },
    { text: 'חלק משימות לצוות', time: '20 דקות', icon: '👥' },
  ];

  const totalMinutes = 175;
  const counterSpring = spring({ frame: Math.max(0, frame - 100), fps, config: { damping: 20, stiffness: 60, mass: 1 }, durationInFrames: 25 });
  const painSpring = spring({ frame: Math.max(0, frame - 140), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ fontFamily: HEEBO, fontSize: 26, fontWeight: 900, color: BRAND.white, marginBottom: 20, direction: 'rtl', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
        עבודה ידנית — כל יום:
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', marginBottom: 20 }}>
        {manualTasks.map((task, i) => {
          const s = spring({ frame: Math.max(0, frame - i * 6), fps, config: SPRING.ui, durationInFrames: 14 });
          return (
            <div key={i} style={{
              width: 700, padding: '14px 20px', borderRadius: 16,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl',
              opacity: s, transform: `translateX(${interpolate(s, [0, 1], [30, 0])}px)`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>{task.icon}</span>
                <span style={{ fontFamily: HEEBO, fontSize: 15, fontWeight: 700, color: BRAND.white }}>{task.text}</span>
              </div>
              <span style={{ fontFamily: RUBIK, fontSize: 14, fontWeight: 700, color: '#EF4444' }}>{task.time}</span>
            </div>
          );
        })}
      </div>

      {/* Total counter */}
      {frame > 100 && (
        <div style={{
          fontFamily: RUBIK, fontSize: 48, fontWeight: 800, color: '#EF4444',
          opacity: counterSpring, transform: `scale(${interpolate(counterSpring, [0, 1], [1.3, 1])})`,
        }}>
          {Math.round(totalMinutes * counterSpring)} דקות/יום
        </div>
      )}

      {frame > 140 && (
        <div style={{
          position: 'absolute', bottom: 140, fontFamily: HEEBO, fontSize: 26, fontWeight: 900,
          color: '#EF4444', direction: 'rtl', opacity: painSpring, textShadow: '0 2px 20px rgba(0,0,0,0.8)',
        }}>
          כמעט 3 שעות על דברים שAI יכול לעשות 🤖
        </div>
      )}
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const flashOpacity = interpolate(frame, [0, 8, 20], [0, 0.5, 0], { extrapolateRight: 'clamp' });

  const aiActions = [
    { text: 'AI כתב פוסט לפייסבוק', time: '3 שניות', icon: '✍️', color: '#22C55E', delay: 40 },
    { text: 'AI דירג 15 לידים', time: '2 שניות', icon: '📊', color: '#22C55E', delay: 60 },
    { text: 'AI שלח 8 פולואפים', time: 'אוטומטי', icon: '📧', color: '#22C55E', delay: 80 },
    { text: 'AI עדכן דשבורד', time: 'רציף', icon: '📋', color: '#22C55E', delay: 100 },
    { text: 'AI הכין דוח שבועי', time: '5 שניות', icon: '📈', color: '#22C55E', delay: 120 },
    { text: 'AI חילק משימות', time: 'אוטומטי', icon: '👥', color: '#22C55E', delay: 140 },
  ];

  const savedSpring = spring({ frame: Math.max(0, frame - 200), fps, config: SPRING.punch, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: BRAND.gradient, opacity: flashOpacity, pointerEvents: 'none' }} />

      <div style={{
        position: 'absolute', top: 60, fontFamily: HEEBO, fontSize: 22, fontWeight: 900,
        color: BRAND.white, direction: 'rtl', textShadow: '0 2px 12px rgba(0,0,0,0.5)',
        opacity: spring({ frame: Math.max(0, frame - 10), fps, config: SPRING.hero, durationInFrames: 18 }),
      }}>
        🧠 AI עושה הכל — בשניות
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', marginBottom: 20 }}>
        {aiActions.map((action, i) => {
          const s = spring({ frame: Math.max(0, frame - action.delay), fps, config: SPRING.ui, durationInFrames: 14 });
          return (
            <div key={i} style={{
              width: 700, padding: '14px 20px', borderRadius: 16,
              background: `${action.color}06`, border: `1px solid ${action.color}20`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl',
              opacity: s, transform: `translateX(${interpolate(s, [0, 1], [30, 0])}px)`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>{action.icon}</span>
                <span style={{ fontFamily: HEEBO, fontSize: 15, fontWeight: 700, color: BRAND.white }}>{action.text}</span>
              </div>
              <span style={{ fontFamily: RUBIK, fontSize: 14, fontWeight: 700, color: '#22C55E' }}>{action.time}</span>
            </div>
          );
        })}
      </div>

      {frame > 200 && (
        <div style={{
          fontFamily: RUBIK, fontSize: 48, fontWeight: 800, color: '#22C55E',
          opacity: savedSpring, transform: `scale(${interpolate(savedSpring, [0, 1], [1.3, 1])})`,
        }}>
          חסכת 170 דקות ✅
        </div>
      )}
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

const ShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const features = [
    { emoji: '🧠', title: 'AI שמבין הקשר', desc: 'ה-AI רואה את כל הנתונים — לידים, צוות, כספים — ומחליט מה לעשות.', color: BRAND.primary, delay: 0 },
    { emoji: '⚡', title: 'פעולות אוטומטיות', desc: 'פולואפים, דירוגים, הקצאות, דוחות — הכל קורה בלי שתגע.', color: '#F59E0B', delay: 60 },
    { emoji: '💬', title: 'תוכן AI בעברית', desc: 'פוסטים, מיילים, הודעות — AI כותב בעברית מושלמת ומותאמת.', color: MODULE_COLORS.social.accent, delay: 120 },
    { emoji: '🔮', title: 'חיזוי והמלצות', desc: 'AI מנבא מגמות, ממליץ פעולות, ומתריע על בעיות מראש.', color: BRAND.indigo, delay: 180 },
    { emoji: '📊', title: 'למידה מתמשכת', desc: 'ה-AI לומד מהפעולות שלך ומשתפר עם הזמן.', color: '#22C55E', delay: 240 },
    { emoji: '🕎', title: 'מותאם תרבותית', desc: 'AI שמכיר את הלוח העברי, שבתות, חגים — ומתאים פעולות.', color: MODULE_COLORS.client.accent, delay: 300 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ fontFamily: HEEBO, fontSize: 30, fontWeight: 900, color: BRAND.white, marginBottom: 28, direction: 'rtl', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
        מה ה-AI יודע לעשות?
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        {features.map((f, i) => (
          <GlassCard key={i} variant="dark" delay={f.delay} width={760} glowColor={f.color}>
            <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'flex-start', gap: 14, direction: 'rtl' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `${f.color}15`, border: `1px solid ${f.color}30`, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 24, flexShrink: 0 }}>{f.emoji}</div>
              <div>
                <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 800, color: f.color }}>{f.title}</div>
                <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: BRAND.muted, lineHeight: 1.5, marginTop: 2 }}>{f.desc}</div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

const ResultsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stats = [
    { value: '-90%', label: 'עבודה ידנית', delay: 0 },
    { value: '170', label: 'דקות נחסכות/יום', delay: 20 },
    { value: '×10', label: 'תפוקה', delay: 40 },
    { value: '0', label: 'טעויות אנוש', delay: 60 },
  ];
  const testSpring = spring({ frame: Math.max(0, frame - 150), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ fontFamily: HEEBO, fontSize: 28, fontWeight: 900, color: BRAND.white, marginBottom: 28, direction: 'rtl' }}>AI שעובד בשבילך</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center', marginBottom: 30 }}>
        {stats.map((stat, i) => {
          const s = spring({ frame: Math.max(0, frame - stat.delay), fps, config: SPRING.punch, durationInFrames: 18 });
          return (
            <GlassCard key={i} variant="dark" delay={stat.delay} width={700} glowColor={BRAND.primary}>
              <div style={{ padding: '24px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl' }}>
                <span style={{ fontFamily: HEEBO, fontSize: 24, fontWeight: 700, color: BRAND.muted }}>{stat.label}</span>
                <span style={{ fontFamily: RUBIK, fontSize: 56, fontWeight: 800, background: BRAND.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', transform: `scale(${interpolate(s, [0, 1], [1.4, 1])})`, filter: `blur(${interpolate(s, [0, 1], [6, 0])}px)`, display: 'inline-block' }}>{stat.value}</span>
              </div>
            </GlassCard>
          );
        })}
      </div>
      {frame > 150 && (
        <div style={{ maxWidth: 700, padding: '20px 28px', borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', direction: 'rtl', opacity: testSpring }}>
          <div style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 700, color: BRAND.white, lineHeight: 1.6 }}>"ה-AI חסך לי 3 שעות ביום. אני מתרכז בצמיחה במקום בביורוקרטיה."</div>
          <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: BRAND.muted, marginTop: 8 }}>— מנהל עסק, בני ברק</div>
        </div>
      )}
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

const TaglineScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: BRAND.gradient, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }) }}>
      <TextReveal text="AI שעובד. אתה צומח." delay={5} fontSize={52} fontWeight={900} color="#fff" mode="words" stagger={3} style={{ textAlign: 'center' }} />
      <div style={{ marginTop: 20, fontFamily: HEEBO, fontSize: 24, fontWeight: 700, color: 'rgba(255,255,255,0.7)', direction: 'rtl', opacity: spring({ frame: Math.max(0, frame - 30), fps: FPS, config: SPRING.hero, durationInFrames: 18 }) }}>
        אפליקציה אחת. כניסה אחת. טביעת אצבע.
      </div>
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

export const AIActionVideoV2: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={T.HOOK.from} durationInFrames={T.HOOK.dur}><HookScene /></Sequence>
    <Sequence from={T.PROBLEM.from} durationInFrames={T.PROBLEM.dur}><ProblemScene /></Sequence>
    <Sequence from={T.SOLUTION.from} durationInFrames={T.SOLUTION.dur}><SolutionScene /></Sequence>
    <Sequence from={T.SHOWCASE.from} durationInFrames={T.SHOWCASE.dur}><ShowcaseScene /></Sequence>
    <Sequence from={T.RESULTS.from} durationInFrames={T.RESULTS.dur}><ResultsScene /></Sequence>
    <Sequence from={T.TAGLINE.from} durationInFrames={T.TAGLINE.dur}><TaglineScene /></Sequence>
    <Sequence from={T.CTA.from} durationInFrames={T.CTA.dur}>
      <CTAEndcard variant="dark" accentColor={BRAND.primary} tagline="AI שעובד בשבילך" />
    </Sequence>
  </AbsoluteFill>
);
