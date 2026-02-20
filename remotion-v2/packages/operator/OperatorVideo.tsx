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
const OPS = MODULE_COLORS.operations;
const FINANCE = MODULE_COLORS.finance;
const T = V2_TIMING;

const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rotation = frame * 4;
  const titleSpring = spring({ frame: Math.max(0, frame - 15), fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${OPS.accent}15 0%, transparent 60%)` }} />
      <div style={{ position: 'absolute', transform: `translateX(-100px) rotate(${rotation}deg)`, fontSize: 72, filter: `drop-shadow(0 0 20px ${OPS.accent}50)` }}>⚙️</div>
      <div style={{ position: 'absolute', transform: `translateX(100px) rotate(${-rotation}deg)`, fontSize: 72, filter: `drop-shadow(0 0 20px ${NEXUS.accent}50)` }}>⚙️</div>
      <div style={{ position: 'absolute', marginTop: 220, textAlign: 'center', opacity: titleSpring }}>
        <div style={{ fontFamily: HEEBO, fontSize: 40, fontWeight: 900, color: BRAND.white, direction: 'rtl', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>חבילת תפעול ושטח</div>
        <div style={{ fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: BRAND.muted, direction: 'rtl', marginTop: 8 }}>תפעול חכם. אפס בלגן.</div>
      </div>
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const problems = [
    { icon: '📋', text: 'משימות נופלות', desc: 'אין מעקב מסודר — עובדי שטח שוכחים משימות קריטיות', delay: 0 },
    { icon: '🗺️', text: 'מסלולים לא יעילים', desc: 'נוסעים קילומטרים מיותרים. בזבוז דלק וזמן', delay: 30 },
    { icon: '📦', text: 'מלאי לא מעודכן', desc: 'חלקים חסרים באתר. ביקורים חוזרים. לקוחות מתוסכלים', delay: 60 },
    { icon: '💰', text: 'עלויות תפעול גבוהות', desc: 'אין בקרה על שעות, דלק, וחומרים — הכסף פשוט נעלם', delay: 90 },
  ];
  const painSpring = spring({ frame: Math.max(0, frame - 150), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <ScanLines color="#EF4444" speed1={2} speed2={1.5} />
      <div style={{ fontFamily: HEEBO, fontSize: 28, fontWeight: 900, color: BRAND.white, marginBottom: 28, direction: 'rtl', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>בלי מערכת תפעול חכמה...</div>
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
          בלגן בשטח = כסף שנשרף 🔥
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
  const modules = [
    { emoji: '⚡', name: 'Operations', desc: 'Kanban חכם, הקצאת משימות AI, אופטימיזציית מסלולים', color: OPS.accent, delay: 40 },
    { emoji: '👥', name: 'Nexus', desc: 'ניהול צוות שטח, חלוקת עומסים, KPIs', color: NEXUS.accent, delay: 60 },
    { emoji: '🎯', name: 'System', desc: 'ניהול לידים ולקוחות מהשטח', color: SYSTEM.accent, delay: 80 },
    { emoji: '💰', name: 'Finance', desc: 'בקרת עלויות, חשבוניות שטח, דוחות', color: FINANCE.accent, delay: 100 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: OPS.gradient, opacity: flashOpacity, pointerEvents: 'none' }} />
      <div style={{ fontFamily: HEEBO, fontSize: 28, fontWeight: 900, color: BRAND.white, direction: 'rtl', marginBottom: 32, opacity: spring({ frame: Math.max(0, frame - 10), fps, config: SPRING.hero, durationInFrames: 18 }), textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
        4 מודולים. שליטה מלאה בשטח.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
        {modules.map((mod, i) => (
          <GlassCard key={i} variant="dark" delay={mod.delay} width={740} glowColor={mod.color}>
            <div style={{ padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 16, direction: 'rtl' }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: `${mod.color}15`, border: `1px solid ${mod.color}30`, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 26, flexShrink: 0 }}>{mod.emoji}</div>
              <div>
                <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 800, color: mod.color }}>{mod.name}</div>
                <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: BRAND.muted }}>{mod.desc}</div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
      <div style={{ marginTop: 30, fontFamily: HEEBO, fontSize: 20, fontWeight: 700, color: BRAND.muted, direction: 'rtl', opacity: spring({ frame: Math.max(0, frame - 180), fps, config: SPRING.hero, durationInFrames: 18 }) }}>
        הכל באפליקציה אחת. כניסה אחת. טביעת אצבע.
      </div>
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

const ShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const features = [
    { emoji: '⚡', title: 'Kanban חכם + AI', desc: 'הקצאת משימות אוטומטית לפי עומס, מיומנות וזמינות.', color: OPS.accent, delay: 0 },
    { emoji: '🗺️', title: 'אופטימיזציית מסלולים', desc: 'AI מתכנן מסלול יום אופטימלי — חוסך דלק, זמן ועלויות.', color: '#F59E0B', delay: 60 },
    { emoji: '📦', title: 'ניהול מלאי חכם', desc: 'הזמנות אוטומטיות מספקים כשמלאי יורד מתחת לסף.', color: '#22C55E', delay: 120 },
    { emoji: '💰', title: 'בקרת עלויות', desc: 'מעקב שעות, דלק, חומרים — דשבורד עלויות בזמן אמת.', color: FINANCE.accent, delay: 180 },
    { emoji: '📊', title: 'דוחות ביצועים', desc: 'KPI תפעוליים, עלות למשימה, SLA — הכל אוטומטי.', color: BRAND.indigo, delay: 240 },
    { emoji: '🕎', title: 'מותאם לשומרי שבת', desc: 'תזמון משימות מותאם ללוח העברי. מצב שבת אוטומטי.', color: '#7C3AED', delay: 300 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ fontFamily: HEEBO, fontSize: 30, fontWeight: 900, color: BRAND.white, marginBottom: 28, direction: 'rtl', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>מה כוללת חבילת תפעול ושטח?</div>
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
    { value: '-40%', label: 'זמן תפעול', delay: 0 },
    { value: '-30%', label: 'עלויות דלק', delay: 20 },
    { value: '+55%', label: 'יעילות צוות', delay: 40 },
    { value: '0', label: 'משימות שנשכחו', delay: 60 },
  ];
  const testSpring = spring({ frame: Math.max(0, frame - 150), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ fontFamily: HEEBO, fontSize: 28, fontWeight: 900, color: BRAND.white, marginBottom: 28, direction: 'rtl' }}>התוצאות מדברות</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center', marginBottom: 30 }}>
        {stats.map((stat, i) => {
          const s = spring({ frame: Math.max(0, frame - stat.delay), fps, config: SPRING.punch, durationInFrames: 18 });
          return (
            <GlassCard key={i} variant="dark" delay={stat.delay} width={700} glowColor={OPS.accent}>
              <div style={{ padding: '24px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl' }}>
                <span style={{ fontFamily: HEEBO, fontSize: 24, fontWeight: 700, color: BRAND.muted }}>{stat.label}</span>
                <span style={{ fontFamily: RUBIK, fontSize: 56, fontWeight: 800, background: OPS.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', transform: `scale(${interpolate(s, [0, 1], [1.4, 1])})`, filter: `blur(${interpolate(s, [0, 1], [6, 0])}px)`, display: 'inline-block' }}>{stat.value}</span>
              </div>
            </GlassCard>
          );
        })}
      </div>
      {frame > 150 && (
        <div style={{ maxWidth: 700, padding: '20px 28px', borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', direction: 'rtl', opacity: testSpring }}>
          <div style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 700, color: BRAND.white, lineHeight: 1.6 }}>"חבילת תפעול ושטח שינתה לנו את העסק. הכל מנוהל, חוסכים 40% בזמן."</div>
          <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: BRAND.muted, marginTop: 8 }}>— מנהל חברת שירותים</div>
        </div>
      )}
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

const TaglineScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: OPS.gradient, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }) }}>
      <TextReveal text="תפעול חכם. אפס בלגן." delay={5} fontSize={52} fontWeight={900} color="#fff" mode="words" stagger={3} style={{ textAlign: 'center' }} />
      <div style={{ marginTop: 20, fontFamily: HEEBO, fontSize: 24, fontWeight: 700, color: 'rgba(255,255,255,0.7)', direction: 'rtl', opacity: spring({ frame: Math.max(0, frame - 30), fps: FPS, config: SPRING.hero, durationInFrames: 18 }) }}>
        אפליקציה אחת. כניסה אחת. טביעת אצבע.
      </div>
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

export const OperatorVideoV2: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={T.HOOK.from} durationInFrames={T.HOOK.dur}><HookScene /></Sequence>
    <Sequence from={T.PROBLEM.from} durationInFrames={T.PROBLEM.dur}><ProblemScene /></Sequence>
    <Sequence from={T.SOLUTION.from} durationInFrames={T.SOLUTION.dur}><SolutionScene /></Sequence>
    <Sequence from={T.SHOWCASE.from} durationInFrames={T.SHOWCASE.dur}><ShowcaseScene /></Sequence>
    <Sequence from={T.RESULTS.from} durationInFrames={T.RESULTS.dur}><ResultsScene /></Sequence>
    <Sequence from={T.TAGLINE.from} durationInFrames={T.TAGLINE.dur}><TaglineScene /></Sequence>
    <Sequence from={T.CTA.from} durationInFrames={T.CTA.dur}>
      <CTAEndcard variant="dark" accentColor={OPS.accent} price="₪349/חודש" tagline="AI שמנהל את השטח שלך" />
    </Sequence>
  </AbsoluteFill>
);
