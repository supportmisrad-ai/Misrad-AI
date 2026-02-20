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
import { NoiseLayer, GlassCard, TextReveal, CTAEndcard, pulse, ScanLines } from '../../shared/components';

const SYSTEM = MODULE_COLORS.system;
const NEXUS = MODULE_COLORS.nexus;
const T = V2_TIMING;

// ═══════════════════════════════════════════════════════════
// HOOK — Two modules merge + impact [0-90f]
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const mergeProgress = spring({ frame, fps, config: { damping: 12, stiffness: 200, mass: 0.7 }, durationInFrames: 18 });
  const gap = interpolate(mergeProgress, [0, 1], [160, 0]);
  const ringScale = spring({ frame: Math.max(0, frame - 16), fps, config: SPRING.punch, durationInFrames: 14 });
  const ringOpacity = interpolate(ringScale, [0, 1], [0.8, 0]);
  const flashOpacity = interpolate(frame, [14, 18, 28], [0, 0.5, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleSpring = spring({ frame: Math.max(0, frame - 20), fps, config: SPRING.hero, durationInFrames: 18 });
  const subSpring = spring({ frame: Math.max(0, frame - 50), fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${SYSTEM.accent}12 0%, transparent 60%)` }} />

      {/* System module */}
      <div style={{ position: 'absolute', width: 80, height: 80, borderRadius: 24, background: SYSTEM.gradient, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 36, transform: `translateX(${-gap}px)`, boxShadow: `0 8px 30px ${SYSTEM.accent}40` }}>🎯</div>
      {/* Nexus module */}
      <div style={{ position: 'absolute', width: 80, height: 80, borderRadius: 24, background: NEXUS.gradient, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 36, transform: `translateX(${gap}px)`, boxShadow: `0 8px 30px ${NEXUS.accent}40` }}>👥</div>

      <div style={{ fontFamily: RUBIK, fontSize: 48, fontWeight: 800, color: BRAND.white, opacity: mergeProgress * 0.6 }}>+</div>

      {frame > 14 && <div style={{ position: 'absolute', width: 80 * ringScale, height: 80 * ringScale, borderRadius: '50%', border: `2px solid ${SYSTEM.accent}`, opacity: ringOpacity }} />}
      <AbsoluteFill style={{ backgroundColor: SYSTEM.accent, opacity: flashOpacity, pointerEvents: 'none' }} />

      <div style={{ position: 'absolute', marginTop: 240, opacity: titleSpring, transform: `scale(${interpolate(titleSpring, [0, 1], [1.3, 1])})` }}>
        <span style={{ fontFamily: HEEBO, fontSize: 42, fontWeight: 900, color: BRAND.white, direction: 'rtl', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>חבילת מכירות</span>
      </div>
      <div style={{ position: 'absolute', marginTop: 320, fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: BRAND.muted, direction: 'rtl', opacity: subSpring }}>
        סוגר עסקאות. לא מפספס לידים.
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// PROBLEM — Missed leads, no follow-up [90-300f]
// ═══════════════════════════════════════════════════════════
const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const problems = [
    { icon: '📞', text: 'לידים נופלים בין הכיסאות', desc: 'אין מעקב מסודר — 40% מהלידים לא מקבלים מענה', delay: 0 },
    { icon: '⏰', text: 'פולואפ ידני = שוכחים', desc: 'שכחת לחזור ללקוח? הוא כבר סגר עם המתחרה', delay: 30 },
    { icon: '📊', text: 'אין תמונת מצב', desc: 'לא יודע כמה לידים יש, באיזה שלב הם, מי מוכן לסגור', delay: 60 },
    { icon: '👥', text: 'צוות לא מתואם', desc: 'איש מכירות אחד מתקשר ללקוח שכבר סגרו איתו', delay: 90 },
  ];

  const painSpring = spring({ frame: Math.max(0, frame - 150), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <ScanLines color="#EF4444" speed1={2} speed2={1.5} />

      <div style={{ fontFamily: HEEBO, fontSize: 28, fontWeight: 900, color: BRAND.white, marginBottom: 28, direction: 'rtl', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
        בלי מערכת מכירות חכמה...
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
        {problems.map((p, i) => {
          const s = spring({ frame: Math.max(0, frame - p.delay - 10), fps, config: SPRING.ui, durationInFrames: 18 });
          return (
            <GlassCard key={i} variant="dark" delay={p.delay + 10} width={740} glowColor="#EF4444">
              <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'flex-start', gap: 14, direction: 'rtl' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 24, flexShrink: 0 }}>{p.icon}</div>
                <div>
                  <div style={{ fontFamily: HEEBO, fontSize: 17, fontWeight: 800, color: '#EF4444' }}>{p.text}</div>
                  <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: BRAND.muted, marginTop: 2 }}>{p.desc}</div>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {frame > 150 && (
        <div style={{
          position: 'absolute', bottom: 160, fontFamily: HEEBO, fontSize: 28, fontWeight: 900,
          color: '#EF4444', direction: 'rtl', opacity: painSpring, textShadow: '0 2px 20px rgba(0,0,0,0.8)',
        }}>
          כל ליד שנפל = כסף שהלך 💸
        </div>
      )}
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SOLUTION — System + Nexus combined power [300-600f]
// ═══════════════════════════════════════════════════════════
const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const flashOpacity = interpolate(frame, [0, 8, 20], [0, 0.5, 0], { extrapolateRight: 'clamp' });

  const modules = [
    { emoji: '🎯', name: 'System', desc: 'דירוג לידים AI, חיזוי סגירות, פולואפ אוטומטי', color: SYSTEM.accent, delay: 40 },
    { emoji: '👥', name: 'Nexus', desc: 'ניהול צוות מכירות, חלוקת לידים, KPIs', color: NEXUS.accent, delay: 70 },
    { emoji: '🧠', name: 'AI מובנה', desc: 'תזמון שיחות, הצעות מחיר חכמות, תחזיות הכנסות', color: BRAND.primary, delay: 100 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: BRAND.gradient, opacity: flashOpacity, pointerEvents: 'none' }} />

      <div style={{
        fontFamily: HEEBO, fontSize: 30, fontWeight: 900, color: BRAND.white, direction: 'rtl', marginBottom: 36,
        opacity: spring({ frame: Math.max(0, frame - 10), fps, config: SPRING.hero, durationInFrames: 18 }),
        textShadow: '0 2px 12px rgba(0,0,0,0.5)',
      }}>
        חבילת מכירות = System + Nexus + AI
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        {modules.map((mod, i) => (
          <GlassCard key={i} variant="dark" delay={mod.delay} width={740} glowColor={mod.color}>
            <div style={{ padding: '22px 28px', display: 'flex', alignItems: 'center', gap: 16, direction: 'rtl' }}>
              <div style={{ width: 56, height: 56, borderRadius: 18, background: `${mod.color}15`, border: `1px solid ${mod.color}30`, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 28, flexShrink: 0 }}>{mod.emoji}</div>
              <div>
                <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 800, color: mod.color }}>{mod.name}</div>
                <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 600, color: BRAND.muted, marginTop: 2 }}>{mod.desc}</div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div style={{
        marginTop: 30, fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: BRAND.muted, direction: 'rtl',
        opacity: spring({ frame: Math.max(0, frame - 180), fps, config: SPRING.hero, durationInFrames: 18 }),
      }}>
        הכל באפליקציה אחת. כניסה אחת. טביעת אצבע.
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SHOWCASE — Detailed features [600-1050f]
// ═══════════════════════════════════════════════════════════
const ShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const features = [
    { emoji: '🎯', title: 'דירוג לידים AI', desc: 'כל ליד מקבל ציון סגירה. אתה תמיד יודע על מי לשים דגש.', color: SYSTEM.accent, delay: 0 },
    { emoji: '⏰', title: 'פולואפ אוטומטי', desc: 'ליד לא ענה? SMS, מייל, וואטסאפ — הכל אוטומטי ומותאם.', color: '#22C55E', delay: 60 },
    { emoji: '👥', title: 'ניהול צוות מכירות', desc: 'חלוקת לידים חכמה, KPIs, דשבורד ביצועים לכל איש מכירות.', color: NEXUS.accent, delay: 120 },
    { emoji: '📊', title: 'דשבורד Pipeline', desc: 'תמונת מצב של כל pipeline המכירות. חיזוי הכנסות חודשי.', color: BRAND.indigo, delay: 180 },
    { emoji: '🔮', title: 'חיזוי סגירות', desc: 'AI מנבא איזה עסקאות ייסגרו החודש ובאיזה סכום.', color: '#F59E0B', delay: 240 },
    { emoji: '🕎', title: 'מותאם לשומרי שבת', desc: 'מצב שבת אוטומטי. תזמון שיחות ופולואפים רק בימי חול.', color: '#7C3AED', delay: 300 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ fontFamily: HEEBO, fontSize: 30, fontWeight: 900, color: BRAND.white, marginBottom: 28, direction: 'rtl', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
        מה כוללת חבילת מכירות?
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

// ═══════════════════════════════════════════════════════════
// RESULTS [1050-1350f]
// ═══════════════════════════════════════════════════════════
const ResultsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stats = [
    { value: '+340%', label: 'שיעור סגירות', delay: 0 },
    { value: '-60%', label: 'זמן טיפול בליד', delay: 20 },
    { value: '92%', label: 'דיוק חיזוי', delay: 40 },
    { value: '0', label: 'לידים שנשכחו', delay: 60 },
  ];

  const testSpring = spring({ frame: Math.max(0, frame - 150), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ fontFamily: HEEBO, fontSize: 28, fontWeight: 900, color: BRAND.white, marginBottom: 28, direction: 'rtl' }}>התוצאות מדברות</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center', marginBottom: 30 }}>
        {stats.map((stat, i) => {
          const s = spring({ frame: Math.max(0, frame - stat.delay), fps, config: SPRING.punch, durationInFrames: 18 });
          return (
            <GlassCard key={i} variant="dark" delay={stat.delay} width={700} glowColor={SYSTEM.accent}>
              <div style={{ padding: '24px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl' }}>
                <span style={{ fontFamily: HEEBO, fontSize: 24, fontWeight: 700, color: BRAND.muted }}>{stat.label}</span>
                <span style={{
                  fontFamily: RUBIK, fontSize: 56, fontWeight: 800,
                  background: SYSTEM.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  transform: `scale(${interpolate(s, [0, 1], [1.4, 1])})`,
                  filter: `blur(${interpolate(s, [0, 1], [6, 0])}px)`, display: 'inline-block',
                }}>{stat.value}</span>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {frame > 150 && (
        <div style={{
          maxWidth: 700, padding: '20px 28px', borderRadius: 20,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          direction: 'rtl', opacity: testSpring,
        }}>
          <div style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 700, color: BRAND.white, lineHeight: 1.6 }}>
            "חבילת מכירות שינתה לנו את התמונה. שיעור הסגירות עלה ב-340% תוך חודשיים."
          </div>
          <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: BRAND.muted, marginTop: 8 }}>— מנהל סוכנות ביטוח</div>
        </div>
      )}
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// TAGLINE [1350-1500f]
// ═══════════════════════════════════════════════════════════
const TaglineScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{
      background: SYSTEM.gradient, justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
      opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }),
    }}>
      <TextReveal text="סוגר עסקאות. לא מפספס לידים." delay={5} fontSize={48} fontWeight={900} color="#fff" mode="words" stagger={3} style={{ textAlign: 'center' }} />
      <div style={{
        marginTop: 20, fontFamily: HEEBO, fontSize: 24, fontWeight: 700, color: 'rgba(255,255,255,0.7)', direction: 'rtl',
        opacity: spring({ frame: Math.max(0, frame - 30), fps: FPS, config: SPRING.hero, durationInFrames: 18 }),
      }}>
        אפליקציה אחת. כניסה אחת. טביעת אצבע.
      </div>
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
export const CloserVideoV2: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={T.HOOK.from} durationInFrames={T.HOOK.dur}><HookScene /></Sequence>
      <Sequence from={T.PROBLEM.from} durationInFrames={T.PROBLEM.dur}><ProblemScene /></Sequence>
      <Sequence from={T.SOLUTION.from} durationInFrames={T.SOLUTION.dur}><SolutionScene /></Sequence>
      <Sequence from={T.SHOWCASE.from} durationInFrames={T.SHOWCASE.dur}><ShowcaseScene /></Sequence>
      <Sequence from={T.RESULTS.from} durationInFrames={T.RESULTS.dur}><ResultsScene /></Sequence>
      <Sequence from={T.TAGLINE.from} durationInFrames={T.TAGLINE.dur}><TaglineScene /></Sequence>
      <Sequence from={T.CTA.from} durationInFrames={T.CTA.dur}>
        <CTAEndcard variant="dark" accentColor={SYSTEM.accent} price="₪249/חודש" tagline="AI שסוגר עסקאות" />
      </Sequence>
    </AbsoluteFill>
  );
};
