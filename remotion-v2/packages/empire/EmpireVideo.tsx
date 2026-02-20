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

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${BRAND.primary}10 0%, transparent 60%)` }} />

      {/* Hexagonal module orbit */}
      {ALL_MODULES.map((mod, i) => {
        const orbitSpeed = 0.015;
        const angle = (frame * orbitSpeed) + (i / ALL_MODULES.length) * Math.PI * 2;
        const radius = 170;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius * 0.5;
        const s = spring({ frame: Math.max(0, frame - i * 3), fps, config: SPRING.punch, durationInFrames: 14 });
        const zIndex = Math.sin(angle) > 0 ? 2 : 1;
        const scale = interpolate(Math.sin(angle), [-1, 1], [0.7, 1.1]);
        return (
          <div key={i} style={{
            position: 'absolute', width: 64, height: 64, borderRadius: 20,
            background: mod.gradient, display: 'flex', justifyContent: 'center', alignItems: 'center',
            fontSize: 28, transform: `translate(${x}px, ${y}px) scale(${scale * s})`,
            opacity: s, zIndex, boxShadow: `0 6px 24px ${mod.color}40`,
          }}>{mod.emoji}</div>
        );
      })}

      {/* Center crown */}
      <div style={{
        fontSize: 64, zIndex: 3,
        opacity: spring({ frame: Math.max(0, frame - 18), fps, config: SPRING.punch, durationInFrames: 14 }),
        transform: `scale(${interpolate(spring({ frame: Math.max(0, frame - 18), fps, config: SPRING.punch, durationInFrames: 14 }), [0, 1], [0.3, 1])})`,
        filter: `drop-shadow(0 0 30px ${BRAND.primary}60)`,
      }}>👑</div>

      <div style={{
        position: 'absolute', marginTop: 280, textAlign: 'center',
        opacity: spring({ frame: Math.max(0, frame - 25), fps, config: SPRING.hero, durationInFrames: 18 }),
      }}>
        <div style={{ fontFamily: HEEBO, fontSize: 48, fontWeight: 900, color: BRAND.white, direction: 'rtl', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>הכל כלול</div>
        <div style={{ fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: BRAND.muted, direction: 'rtl', marginTop: 8 }}>הכל. במערכת אחת.</div>
      </div>
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const problems = [
    { icon: '🔗', text: '10 כלים שלא מדברים', desc: 'CRM, חשבוניות, מלאי, שיווק — כל אחד בעולם משלו', delay: 0 },
    { icon: '💸', text: 'תשלומים כפולים', desc: 'משלם לכל ספק בנפרד. סה"כ: אלפי שקלים בחודש', delay: 30 },
    { icon: '⏰', text: 'זמן מבוזבז', desc: 'עוברים בין מערכות, מעתיקים נתונים, טועים', delay: 60 },
    { icon: '📉', text: 'אין תמונה כוללת', desc: 'לא יודע מה מצב העסק באמת. כל מערכת מראה משהו אחר', delay: 90 },
  ];
  const painSpring = spring({ frame: Math.max(0, frame - 150), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ fontFamily: HEEBO, fontSize: 28, fontWeight: 900, color: BRAND.white, marginBottom: 28, direction: 'rtl', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>בלי מערכת אחת שעושה הכל...</div>
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
          10 מערכות = 10 בעיות. פתרון אחד = MISRAD AI 🚀
        </div>
      )}
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const flashOpacity = interpolate(frame, [0, 8, 20], [0, 0.6, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: BRAND.gradient, opacity: flashOpacity, pointerEvents: 'none' }} />
      <div style={{ fontFamily: HEEBO, fontSize: 30, fontWeight: 900, color: BRAND.white, direction: 'rtl', marginBottom: 36, opacity: spring({ frame: Math.max(0, frame - 10), fps, config: SPRING.hero, durationInFrames: 18 }), textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
        6 מודולים. אפליקציה אחת. AI מלא.
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', maxWidth: 760 }}>
        {ALL_MODULES.map((mod, i) => {
          const delay = 30 + i * 12;
          const s = spring({ frame: Math.max(0, frame - delay), fps, config: SPRING.ui, durationInFrames: 16 });
          return (
            <div key={i} style={{
              width: 230, padding: '18px 16px', borderRadius: 22,
              background: `${mod.color}08`, border: `2px solid ${mod.color}30`,
              boxShadow: `0 8px 24px ${mod.color}15`,
              display: 'flex', alignItems: 'center', gap: 12, direction: 'rtl',
              opacity: s, transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px)`,
            }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: mod.gradient, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 24, flexShrink: 0 }}>{mod.emoji}</div>
              <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 800, color: BRAND.white }}>{mod.label}</div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 30, fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: BRAND.muted, direction: 'rtl', opacity: spring({ frame: Math.max(0, frame - 180), fps, config: SPRING.hero, durationInFrames: 18 }) }}>
        ₪499/חודש — חסכון של אלפי שקלים
      </div>
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

const ShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const features = [
    { emoji: '🧠', title: 'AI חוצה מודולים', desc: 'ה-AI רואה את כל התמונה — מכירות, שיווק, תפעול, כספים — ומייעל.', color: BRAND.primary, delay: 0 },
    { emoji: '📊', title: 'דשבורד מנכ"ל', desc: 'תמונת מצב אחת לכל העסק. KPIs, הכנסות, ביצועים — הכל במקום אחד.', color: BRAND.indigo, delay: 60 },
    { emoji: '🔄', title: 'אוטומציה מלאה', desc: 'ליד נכנס → AI מדרג → צוות מטפל → חשבונית יוצאת. אוטומטי.', color: '#22C55E', delay: 120 },
    { emoji: '💰', title: 'חסכון כספי', desc: 'מחליף 10 כלים. חוסך אלפי שקלים בחודש בדמי מנוי.', color: MODULE_COLORS.finance.accent, delay: 180 },
    { emoji: '🔒', title: 'אבטחה מקסימלית', desc: 'כל הנתונים במקום אחד מאובטח. הצפנה, גיבויים, אימות דו-שלבי.', color: '#7C3AED', delay: 240 },
    { emoji: '🕎', title: 'מותאם לשומרי שבת', desc: 'מצב שבת אוטומטי. לוח עברי. כל האוטומציות מותאמות.', color: '#F59E0B', delay: 300 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ fontFamily: HEEBO, fontSize: 30, fontWeight: 900, color: BRAND.white, marginBottom: 28, direction: 'rtl', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>מה מקבלים בהכל כלול?</div>
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
    { value: '6', label: 'מודולים מלאים', delay: 0 },
    { value: '-₪3K', label: 'חסכון חודשי', delay: 20 },
    { value: '100%', label: 'AI מובנה', delay: 40 },
    { value: '1', label: 'אפליקציה', delay: 60 },
  ];
  const testSpring = spring({ frame: Math.max(0, frame - 150), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ fontFamily: HEEBO, fontSize: 28, fontWeight: 900, color: BRAND.white, marginBottom: 28, direction: 'rtl' }}>למה הכל כלול?</div>
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
          <div style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 700, color: BRAND.white, lineHeight: 1.6 }}>"עברנו ל-MISRAD AI Empire וחסכנו ₪3,200 בחודש. הכל באפליקציה אחת."</div>
          <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: BRAND.muted, marginTop: 8 }}>— מנכ"ל חברת שירותים, ירושלים</div>
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
      <TextReveal text="הכל. במערכת אחת." delay={5} fontSize={56} fontWeight={900} color="#fff" mode="words" stagger={3} style={{ textAlign: 'center' }} />
      <div style={{ marginTop: 20, fontFamily: HEEBO, fontSize: 24, fontWeight: 700, color: 'rgba(255,255,255,0.7)', direction: 'rtl', opacity: spring({ frame: Math.max(0, frame - 30), fps: FPS, config: SPRING.hero, durationInFrames: 18 }) }}>
        אפליקציה אחת. כניסה אחת. טביעת אצבע.
      </div>
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

export const EmpireVideoV2: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={T.HOOK.from} durationInFrames={T.HOOK.dur}><HookScene /></Sequence>
    <Sequence from={T.PROBLEM.from} durationInFrames={T.PROBLEM.dur}><ProblemScene /></Sequence>
    <Sequence from={T.SOLUTION.from} durationInFrames={T.SOLUTION.dur}><SolutionScene /></Sequence>
    <Sequence from={T.SHOWCASE.from} durationInFrames={T.SHOWCASE.dur}><ShowcaseScene /></Sequence>
    <Sequence from={T.RESULTS.from} durationInFrames={T.RESULTS.dur}><ResultsScene /></Sequence>
    <Sequence from={T.TAGLINE.from} durationInFrames={T.TAGLINE.dur}><TaglineScene /></Sequence>
    <Sequence from={T.CTA.from} durationInFrames={T.CTA.dur}>
      <CTAEndcard variant="dark" accentColor={BRAND.primary} price="₪499/חודש" tagline="הכל כלול. AI מלא." />
    </Sequence>
  </AbsoluteFill>
);
