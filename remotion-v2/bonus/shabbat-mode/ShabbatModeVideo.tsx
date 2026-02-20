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
// Candle flame animation
// ═══════════════════════════════════════════════════════════
const CandleFlame: React.FC<{ x: number; y: number; scale?: number; delay?: number }> = ({ x, y, scale = 1, delay = 0 }) => {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - delay);
  const flicker = 1 + Math.sin(f * 0.2) * 0.06 + Math.sin(f * 0.35) * 0.04;
  const sway = Math.sin(f * 0.08) * 3;
  const opacity = spring({ frame: f, fps: FPS, config: { damping: 20, stiffness: 80, mass: 1 }, durationInFrames: 20 });

  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      transform: `scale(${scale * flicker}) translateX(${sway}px)`,
      opacity, transformOrigin: 'bottom center',
    }}>
      {/* Outer glow */}
      <div style={{
        width: 60, height: 60, borderRadius: '50%', position: 'absolute', top: -30, left: -20,
        background: 'radial-gradient(circle, rgba(251,191,36,0.3) 0%, transparent 70%)',
        filter: 'blur(8px)',
      }} />
      {/* Flame body */}
      <div style={{
        width: 18, height: 36, borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
        background: 'linear-gradient(to top, #F59E0B 0%, #FBBF24 40%, #FEF3C7 80%, #fff 100%)',
        filter: 'blur(0.5px)',
      }} />
      {/* Candle body */}
      <div style={{
        width: 12, height: 50, borderRadius: '0 0 4px 4px',
        background: 'linear-gradient(to bottom, #E2E8F0 0%, #CBD5E1 100%)',
        margin: '0 auto', marginTop: -2,
      }} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// Star particles for night sky feel
// ═══════════════════════════════════════════════════════════
const StarField: React.FC = () => {
  const frame = useCurrentFrame();
  const stars = React.useMemo(() =>
    Array.from({ length: 50 }, (_, i) => ({
      x: (i * 137.508) % 100,
      y: (i * 73.247) % 100,
      size: 1 + (i % 3),
      twinkle: (i * 2.4) % (Math.PI * 2),
    })), []);

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {stars.map((s, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${s.x}%`, top: `${s.y}%`,
          width: s.size, height: s.size, borderRadius: '50%',
          background: '#FEF3C7',
          opacity: 0.2 + Math.sin(frame * 0.04 + s.twinkle) * 0.2,
        }} />
      ))}
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// HOOK — Shabbat candle lighting [0-90f]
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame: Math.max(0, frame - 30), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0C0A1A', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <StarField />

      {/* Warm ambient glow */}
      <div style={{
        position: 'absolute', width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(251,191,36,0.08) 0%, transparent 60%)',
      }} />

      {/* Two Shabbat candles */}
      <div style={{ position: 'relative', width: 120, height: 120 }}>
        <CandleFlame x={20} y={20} scale={1.2} delay={5} />
        <CandleFlame x={70} y={20} scale={1.2} delay={10} />
      </div>

      <div style={{ textAlign: 'center', marginTop: 60, opacity: titleSpring }}>
        <div style={{ fontFamily: HEEBO, fontSize: 48, fontWeight: 900, color: '#FEF3C7', textShadow: '0 2px 20px rgba(251,191,36,0.3)' }}>🕎</div>
        <div style={{ fontFamily: HEEBO, fontSize: 40, fontWeight: 900, color: '#FEF3C7', direction: 'rtl', marginTop: 8, textShadow: '0 2px 20px rgba(251,191,36,0.3)' }}>
          מותאם לשומרי שבת
        </div>
        <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 700, color: 'rgba(254,243,199,0.6)', direction: 'rtl', marginTop: 8 }}>
          טכנולוגיה שמכבדת את הערכים שלך
        </div>
      </div>
      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// PROBLEM — Tech that doesn't respect Shabbat [90-300f]
// ═══════════════════════════════════════════════════════════
const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const problems = [
    { icon: '📧', text: 'מיילים שנשלחים בשבת', desc: 'מערכות שלא יודעות מתי שבת ושולחות הכל — 24/7', delay: 0 },
    { icon: '📱', text: 'התראות שלא מפסיקות', desc: 'נוטיפיקציות בשבת וחג. אין כיבוי אוטומטי', delay: 35 },
    { icon: '📅', text: 'לוח שנה גרגוריאני בלבד', desc: 'אין לוח עברי. אין חגים. אין ימי זיכרון', delay: 70 },
    { icon: '⏰', text: 'תזמונים שלא מתאימים', desc: 'פוסט מתפרסם בשבת. חשבונית נשלחת ביום כיפור', delay: 105 },
  ];

  const painSpring = spring({ frame: Math.max(0, frame - 160), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0C0A1A', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <StarField />
      <div style={{ fontFamily: HEEBO, fontSize: 28, fontWeight: 900, color: '#FEF3C7', direction: 'rtl', marginBottom: 28, textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
        מערכות שלא מכבדות את הזמן שלך
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
        {problems.map((p, i) => {
          const s = spring({ frame: Math.max(0, frame - p.delay - 10), fps, config: SPRING.ui, durationInFrames: 14 });
          return (
            <div key={i} style={{
              width: 720, padding: '18px 24px', borderRadius: 22,
              background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)',
              display: 'flex', alignItems: 'flex-start', gap: 14, direction: 'rtl',
              opacity: s, transform: `translateX(${interpolate(s, [0, 1], [30, 0])}px)`,
            }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(239,68,68,0.08)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 24, flexShrink: 0 }}>{p.icon}</div>
              <div>
                <div style={{ fontFamily: HEEBO, fontSize: 17, fontWeight: 800, color: '#EF4444' }}>{p.text}</div>
                <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: 'rgba(254,243,199,0.5)', marginTop: 2 }}>{p.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {frame > 160 && (
        <div style={{ position: 'absolute', bottom: 160, fontFamily: HEEBO, fontSize: 24, fontWeight: 900, color: '#F59E0B', direction: 'rtl', opacity: painSpring, textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>
          טכנולוגיה צריכה להתאים לחיים — לא להפך 🕯️
        </div>
      )}
      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SOLUTION — MISRAD AI Shabbat features [300-600f]
// ═══════════════════════════════════════════════════════════
const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const flash = interpolate(frame, [0, 10, 25], [0, 0.3, 0], { extrapolateRight: 'clamp' });

  const features = [
    { emoji: '🕯️', title: 'מצב שבת אוטומטי', desc: 'המערכת מזהה כניסת שבת ומשתיקה הכל — אוטומטית.', color: '#FBBF24', delay: 30 },
    { emoji: '📅', title: 'לוח עברי מובנה', desc: 'תאריכים עבריים, פרשת שבוע, חגים — הכל מובנה.', color: '#F59E0B', delay: 70 },
    { emoji: '⏰', title: 'תזמון חכם', desc: 'פוסטים, מיילים, תזכורות — לא יישלחו בשבת או חג.', color: '#22C55E', delay: 110 },
    { emoji: '🔕', title: 'שקט מלא', desc: 'אפס התראות, אפס נוטיפיקציות. מנוחה אמיתית.', color: BRAND.indigo, delay: 150 },
    { emoji: '🌅', title: 'מוצאי שבת', desc: 'הכל חוזר לעבוד אוטומטית אחרי צאת הכוכבים.', color: '#7C3AED', delay: 190 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: '#0C0A1A', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: 'linear-gradient(135deg, #F59E0B20 0%, transparent 50%)', opacity: flash, pointerEvents: 'none' }} />
      <StarField />

      <div style={{
        fontFamily: HEEBO, fontSize: 30, fontWeight: 900, color: '#FEF3C7', direction: 'rtl', marginBottom: 28,
        opacity: spring({ frame: Math.max(0, frame - 15), fps, config: SPRING.hero, durationInFrames: 18 }),
        textShadow: '0 2px 16px rgba(0,0,0,0.5)',
      }}>
        MISRAD AI — מצב שבת מובנה
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        {features.map((f, i) => {
          const s = spring({ frame: Math.max(0, frame - f.delay), fps, config: { damping: 14, stiffness: 130, mass: 0.8 }, durationInFrames: 18 });
          return (
            <div key={i} style={{
              width: 740, padding: '18px 24px', borderRadius: 22,
              background: `${f.color}04`, border: `1px solid ${f.color}12`,
              backdropFilter: 'blur(20px)', direction: 'rtl',
              display: 'flex', alignItems: 'flex-start', gap: 14,
              opacity: s, transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px)`,
              boxShadow: `0 8px 32px ${f.color}06`,
            }}>
              <div style={{ width: 50, height: 50, borderRadius: 16, background: `${f.color}10`, border: `1px solid ${f.color}20`, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 26, flexShrink: 0 }}>{f.emoji}</div>
              <div>
                <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 800, color: f.color }}>{f.title}</div>
                <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: 'rgba(254,243,199,0.5)', lineHeight: 1.5, marginTop: 3 }}>{f.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SHOWCASE — How Shabbat mode works [600-1050f]
// ═══════════════════════════════════════════════════════════
const ShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const timeline = [
    { time: 'יום שישי 14:00', event: 'המערכת מזהה כניסת שבת בעוד שעות', emoji: '🔔', color: '#FBBF24', delay: 0 },
    { time: 'שעה לפני כניסה', event: 'כל התזמונים מושהים. תור פעולות נעצר', emoji: '⏸️', color: '#F59E0B', delay: 60 },
    { time: 'כניסת שבת', event: 'מצב שבת פעיל. אפס התראות. שקט מוחלט', emoji: '🕯️', color: '#FEF3C7', delay: 120 },
    { time: 'במהלך שבת', event: 'לידים ומשימות נשמרים בתור — לא נשלח כלום', emoji: '📥', color: '#22C55E', delay: 180 },
    { time: 'מוצאי שבת', event: 'הכל חוזר לפעול. תור מתרוקן בסדר. AI ממשיך', emoji: '🌅', color: '#7C3AED', delay: 240 },
    { time: 'יום ראשון בוקר', event: 'דוח שבוע מוכן. לידים מדורגים. המשך עבודה', emoji: '☀️', color: BRAND.primary, delay: 300 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: '#0C0A1A', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <StarField />

      <div style={{ fontFamily: HEEBO, fontSize: 30, fontWeight: 900, color: '#FEF3C7', direction: 'rtl', marginBottom: 28, textShadow: '0 2px 16px rgba(0,0,0,0.5)' }}>
        איך מצב שבת עובד?
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        {timeline.map((t, i) => {
          const s = spring({ frame: Math.max(0, frame - t.delay), fps, config: { damping: 14, stiffness: 130, mass: 0.8 }, durationInFrames: 18 });
          return (
            <div key={i} style={{
              width: 740, padding: '16px 22px', borderRadius: 20,
              background: `${t.color}03`, border: `1px solid ${t.color}10`,
              display: 'flex', alignItems: 'center', gap: 16, direction: 'rtl',
              opacity: s, transform: `translateX(${interpolate(s, [0, 1], [30, 0])}px)`,
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: `${t.color}10`, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 22, flexShrink: 0 }}>{t.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: RUBIK, fontSize: 12, fontWeight: 800, color: t.color, letterSpacing: '0.5px' }}>{t.time}</div>
                <div style={{ fontFamily: HEEBO, fontSize: 15, fontWeight: 700, color: '#FEF3C7', marginTop: 2 }}>{t.event}</div>
              </div>
              {/* Timeline dot */}
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, boxShadow: `0 0 12px ${t.color}60`, flexShrink: 0 }} />
            </div>
          );
        })}
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
    { value: '0', label: 'הודעות בשבת', delay: 0 },
    { value: '100%', label: 'לוח עברי', delay: 20 },
    { value: 'אוטו׳', label: 'כניסה/יציאה', delay: 40 },
    { value: '∞', label: 'שקט נפשי', delay: 60 },
  ];

  const testSpring = spring({ frame: Math.max(0, frame - 150), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0C0A1A', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <StarField />

      <div style={{ fontFamily: HEEBO, fontSize: 28, fontWeight: 900, color: '#FEF3C7', direction: 'rtl', marginBottom: 32, textShadow: '0 2px 16px rgba(0,0,0,0.5)' }}>
        טכנולוגיה שמכבדת
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 800, marginBottom: 32 }}>
        {stats.map((stat, i) => {
          const s = spring({ frame: Math.max(0, frame - stat.delay), fps, config: { damping: 10, stiffness: 120, mass: 1 }, durationInFrames: 22 });
          return (
            <div key={i} style={{
              width: 170, padding: '28px 20px', borderRadius: 28, textAlign: 'center',
              background: 'rgba(251,191,36,0.03)', border: '1px solid rgba(251,191,36,0.08)',
              opacity: s, transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`,
              boxShadow: '0 16px 48px rgba(251,191,36,0.04)',
            }}>
              <div style={{ fontFamily: RUBIK, fontSize: 44, fontWeight: 900, color: '#FBBF24', textShadow: '0 0 20px rgba(251,191,36,0.3)' }}>
                {stat.value}
              </div>
              <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: 'rgba(254,243,199,0.5)', marginTop: 8, direction: 'rtl' }}>{stat.label}</div>
            </div>
          );
        })}
      </div>

      {frame > 150 && (
        <div style={{
          maxWidth: 700, padding: '22px 28px', borderRadius: 22,
          background: 'rgba(251,191,36,0.03)', border: '1px solid rgba(251,191,36,0.08)',
          direction: 'rtl', opacity: testSpring,
        }}>
          <div style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 700, color: '#FEF3C7', lineHeight: 1.7, fontStyle: 'italic' }}>
            "סוף סוף מערכת שמבינה שיש שבת. לא צריך לכבות ולהדליק. הכל אוטומטי."
          </div>
          <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 600, color: 'rgba(254,243,199,0.4)', marginTop: 8 }}>— רב ובעל עסק, בני ברק</div>
        </div>
      )}
      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

const TaglineScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(135deg, #1a0a15 0%, #0C0A1A 50%, #0a0a1a 100%)',
      justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
      opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }),
    }}>
      <StarField />
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <CandleFlame x={-30} y={-60} scale={0.8} delay={0} />
        <CandleFlame x={30} y={-60} scale={0.8} delay={5} />
      </div>
      <TextReveal text="שבת שלום. המערכת שומרת." delay={10} fontSize={48} fontWeight={900} color="#FEF3C7" mode="words" stagger={3} style={{ textAlign: 'center' }} />
      <div style={{
        marginTop: 20, fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: 'rgba(254,243,199,0.5)', direction: 'rtl',
        opacity: spring({ frame: Math.max(0, frame - 40), fps: FPS, config: SPRING.hero, durationInFrames: 18 }),
      }}>
        טכנולוגיה שמכבדת את הערכים שלך 🕯️
      </div>
      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

export const ShabbatModeVideoV2: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={T.HOOK.from} durationInFrames={T.HOOK.dur}><HookScene /></Sequence>
    <Sequence from={T.PROBLEM.from} durationInFrames={T.PROBLEM.dur}><ProblemScene /></Sequence>
    <Sequence from={T.SOLUTION.from} durationInFrames={T.SOLUTION.dur}><SolutionScene /></Sequence>
    <Sequence from={T.SHOWCASE.from} durationInFrames={T.SHOWCASE.dur}><ShowcaseScene /></Sequence>
    <Sequence from={T.RESULTS.from} durationInFrames={T.RESULTS.dur}><ResultsScene /></Sequence>
    <Sequence from={T.TAGLINE.from} durationInFrames={T.TAGLINE.dur}><TaglineScene /></Sequence>
    <Sequence from={T.CTA.from} durationInFrames={T.CTA.dur}>
      <CTAEndcard variant="dark" accentColor="#FBBF24" tagline="מותאם לשומרי שבת — MISRAD AI" />
    </Sequence>
  </AbsoluteFill>
);
