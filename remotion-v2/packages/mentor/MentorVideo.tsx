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

const ALL_MODULES = [
  { emoji: '🎯', label: 'System', color: MODULE_COLORS.system.accent, gradient: MODULE_COLORS.system.gradient },
  { emoji: '👥', label: 'Nexus', color: MODULE_COLORS.nexus.accent, gradient: MODULE_COLORS.nexus.gradient },
  { emoji: '📱', label: 'Social', color: MODULE_COLORS.social.accent, gradient: MODULE_COLORS.social.gradient },
  { emoji: '💰', label: 'Finance', color: MODULE_COLORS.finance.accent, gradient: MODULE_COLORS.finance.gradient },
  { emoji: '🤝', label: 'Client', color: MODULE_COLORS.client.accent, gradient: MODULE_COLORS.client.gradient },
  { emoji: '⚡', label: 'Operations', color: MODULE_COLORS.operations.accent, gradient: MODULE_COLORS.operations.gradient },
];

const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bookOpen = spring({ frame, fps, config: { damping: 14, stiffness: 160, mass: 0.7 }, durationInFrames: 18 });
  const bookRotate = interpolate(bookOpen, [0, 1], [30, 0]);

  const titleSpring = spring({ frame: Math.max(0, frame - 20), fps, config: SPRING.hero, durationInFrames: 18 });

  const clientTypes = [
    { emoji: '🧑‍💼', label: 'יועצים' },
    { emoji: '📚', label: 'מאמנים' },
    { emoji: '🏫', label: 'אקדמיה' },
    { emoji: '🎓', label: 'מנטורים' },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${BRAND.indigo}12 0%, transparent 60%)` }} />

      {/* Book icon */}
      <div style={{
        fontSize: 80, transform: `perspective(400px) rotateY(${bookRotate}deg)`,
        filter: `drop-shadow(0 0 30px ${BRAND.indigo}50)`, marginBottom: 10,
      }}>📚</div>

      {/* Client type pills */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {clientTypes.map((ct, i) => {
          const s = spring({ frame: Math.max(0, frame - 20 - i * 5), fps, config: SPRING.ui, durationInFrames: 14 });
          return (
            <div key={i} style={{
              padding: '8px 16px', borderRadius: 20, background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 6,
              opacity: s, transform: `translateY(${interpolate(s, [0, 1], [10, 0])}px)`,
            }}>
              <span style={{ fontSize: 16 }}>{ct.emoji}</span>
              <span style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: BRAND.white }}>{ct.label}</span>
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: 'center', opacity: titleSpring }}>
        <div style={{ fontFamily: HEEBO, fontSize: 44, fontWeight: 900, color: BRAND.white, direction: 'rtl', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>כל החבילות</div>
        <div style={{ fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: BRAND.muted, direction: 'rtl', marginTop: 8 }}>תלמד. תנהל. תצמיח.</div>
      </div>
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const problems = [
    { icon: '📋', text: 'ניהול תלמידים ידני', desc: 'אקסלים, ווטסאפ, מיילים — בלגן מוחלט', delay: 0 },
    { icon: '💸', text: 'גבייה בעייתית', desc: 'תלמידים לא משלמים בזמן. שוכחים לגבות', delay: 30 },
    { icon: '📱', text: 'שיווק לא קיים', desc: 'אין נוכחות דיגיטלית. לידים מגיעים רק מפה לאוזן', delay: 60 },
    { icon: '📊', text: 'אין מדידה', desc: 'לא יודע כמה מרוויח, כמה תלמידים פעילים, מה ה-ROI', delay: 90 },
  ];
  const painSpring = spring({ frame: Math.max(0, frame - 150), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ fontFamily: HEEBO, fontSize: 28, fontWeight: 900, color: BRAND.white, marginBottom: 28, direction: 'rtl', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>בלי מערכת מנטורינג חכמה...</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
        {problems.map((p, i) => (
          <GlassCard key={i} variant="dark" delay={p.delay + 10} width={740} glowColor="#EF4444">
            <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'flex-start', gap: 14, direction: 'rtl' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 24, flexShrink: 0 }}>{p.icon}</div>
              <div>
                <div style={{ fontFamily: HEEBO, fontSize: 17, fontWeight: 800, color: '#EF4444' }}>{p.text}</div>
                <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: BRAND.muted, marginTop: 2 }}>{p.desc}</div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
      {frame > 150 && (
        <div style={{ position: 'absolute', bottom: 160, fontFamily: HEEBO, fontSize: 26, fontWeight: 900, color: '#EF4444', direction: 'rtl', opacity: painSpring, textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
          מנטור מצוין ≠ מנהל עסק מצוין. AI ישלים את הפער 🧠
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

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: BRAND.gradient, opacity: flashOpacity, pointerEvents: 'none' }} />
      <div style={{ fontFamily: HEEBO, fontSize: 28, fontWeight: 900, color: BRAND.white, direction: 'rtl', marginBottom: 32, opacity: spring({ frame: Math.max(0, frame - 10), fps, config: SPRING.hero, durationInFrames: 18 }), textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
        כל 6 המודולים + ליווי אישי + הדרכות
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', maxWidth: 760 }}>
        {ALL_MODULES.map((mod, i) => {
          const delay = 30 + i * 10;
          const s = spring({ frame: Math.max(0, frame - delay), fps, config: SPRING.ui, durationInFrames: 16 });
          return (
            <div key={i} style={{
              width: 230, padding: '16px 14px', borderRadius: 22,
              background: `${mod.color}08`, border: `1.5px solid ${mod.color}30`,
              display: 'flex', alignItems: 'center', gap: 10, direction: 'rtl',
              opacity: s, transform: `translateY(${interpolate(s, [0, 1], [15, 0])}px)`,
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: mod.gradient, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 20, flexShrink: 0 }}>{mod.emoji}</div>
              <span style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 800, color: BRAND.white }}>{mod.label}</span>
            </div>
          );
        })}
      </div>

      {/* Mentor extras */}
      <div style={{ display: 'flex', gap: 14, marginTop: 24, opacity: spring({ frame: Math.max(0, frame - 120), fps, config: SPRING.ui, durationInFrames: 18 }) }}>
        {[
          { emoji: '🎓', text: 'הדרכות 1-על-1' },
          { emoji: '📞', text: 'ליווי צמוד' },
          { emoji: '🏆', text: 'אונבורדינג VIP' },
        ].map((extra, i) => (
          <div key={i} style={{
            padding: '12px 18px', borderRadius: 16, background: `${BRAND.indigo}15`,
            border: `1px solid ${BRAND.indigoLight}30`, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 18 }}>{extra.emoji}</span>
            <span style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: BRAND.white }}>{extra.text}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, fontFamily: HEEBO, fontSize: 20, fontWeight: 700, color: BRAND.muted, direction: 'rtl', opacity: spring({ frame: Math.max(0, frame - 180), fps, config: SPRING.hero, durationInFrames: 18 }) }}>
        ₪699/חודש — הכל כלול + ליווי אישי
      </div>
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

const ShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const features = [
    { emoji: '📚', title: 'כל 6 המודולים', desc: 'System, Nexus, Social, Finance, Client, Operations — הכל פתוח.', color: BRAND.primary, delay: 0 },
    { emoji: '🎓', title: 'הדרכות אישיות', desc: 'שיחות 1-על-1 עם מומחה MISRAD AI. הגדרה, אופטימיזציה, צמיחה.', color: BRAND.indigo, delay: 60 },
    { emoji: '🚀', title: 'אונבורדינג VIP', desc: 'הגדרה מלאה של המערכת תוך 48 שעות. כולל ייבוא נתונים.', color: '#22C55E', delay: 120 },
    { emoji: '📊', title: 'דוחות מותאמים', desc: 'דשבורדים ודוחות בהתאמה אישית לעסק שלך.', color: '#F59E0B', delay: 180 },
    { emoji: '🧠', title: 'AI מותאם אישית', desc: 'ה-AI לומד את העסק שלך ומתאים את עצמו — בשבילך.', color: '#7C3AED', delay: 240 },
    { emoji: '🕎', title: 'מותאם לשומרי שבת', desc: 'לוח עברי, מצב שבת, תזמון מותאם — הכל אוטומטי.', color: MODULE_COLORS.client.accent, delay: 300 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ fontFamily: HEEBO, fontSize: 30, fontWeight: 900, color: BRAND.white, marginBottom: 28, direction: 'rtl', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>מה כוללת חבילת כל החבילות?</div>
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
    { value: '6', label: 'מודולים', delay: 0 },
    { value: '1:1', label: 'הדרכות אישיות', delay: 20 },
    { value: '48h', label: 'אונבורדינג', delay: 40 },
    { value: 'VIP', label: 'תמיכה', delay: 60 },
  ];
  const testSpring = spring({ frame: Math.max(0, frame - 150), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ fontFamily: HEEBO, fontSize: 28, fontWeight: 900, color: BRAND.white, marginBottom: 28, direction: 'rtl' }}>למה כל החבילות?</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center', marginBottom: 30 }}>
        {stats.map((stat, i) => {
          const s = spring({ frame: Math.max(0, frame - stat.delay), fps, config: SPRING.punch, durationInFrames: 18 });
          return (
            <GlassCard key={i} variant="dark" delay={stat.delay} width={700} glowColor={BRAND.indigo}>
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
          <div style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 700, color: BRAND.white, lineHeight: 1.6 }}>"ההדרכות האישיות שינו לי את העסק. תוך חודש הכפלתי הכנסות."</div>
          <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: BRAND.muted, marginTop: 8 }}>— מנטורית עסקית, חיפה</div>
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
      <TextReveal text="תלמד. תנהל. תצמיח." delay={5} fontSize={52} fontWeight={900} color="#fff" mode="words" stagger={3} style={{ textAlign: 'center' }} />
      <div style={{ marginTop: 20, fontFamily: HEEBO, fontSize: 24, fontWeight: 700, color: 'rgba(255,255,255,0.7)', direction: 'rtl', opacity: spring({ frame: Math.max(0, frame - 30), fps: FPS, config: SPRING.hero, durationInFrames: 18 }) }}>
        אפליקציה אחת. כניסה אחת. טביעת אצבע.
      </div>
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

export const MentorVideoV2: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={T.HOOK.from} durationInFrames={T.HOOK.dur}><HookScene /></Sequence>
    <Sequence from={T.PROBLEM.from} durationInFrames={T.PROBLEM.dur}><ProblemScene /></Sequence>
    <Sequence from={T.SOLUTION.from} durationInFrames={T.SOLUTION.dur}><SolutionScene /></Sequence>
    <Sequence from={T.SHOWCASE.from} durationInFrames={T.SHOWCASE.dur}><ShowcaseScene /></Sequence>
    <Sequence from={T.RESULTS.from} durationInFrames={T.RESULTS.dur}><ResultsScene /></Sequence>
    <Sequence from={T.TAGLINE.from} durationInFrames={T.TAGLINE.dur}><TaglineScene /></Sequence>
    <Sequence from={T.CTA.from} durationInFrames={T.CTA.dur}>
      <CTAEndcard variant="dark" accentColor={BRAND.indigo} price="₪699/חודש" tagline="הכל כלול + ליווי אישי" />
    </Sequence>
  </AbsoluteFill>
);
