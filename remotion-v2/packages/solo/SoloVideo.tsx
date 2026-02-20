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

const MODULES = [
  { key: 'system', label: 'System', emoji: '🎯', color: MODULE_COLORS.system.accent, gradient: MODULE_COLORS.system.gradient },
  { key: 'nexus', label: 'Nexus', emoji: '👥', color: MODULE_COLORS.nexus.accent, gradient: MODULE_COLORS.nexus.gradient },
  { key: 'social', label: 'Social', emoji: '📱', color: MODULE_COLORS.social.accent, gradient: MODULE_COLORS.social.gradient },
  { key: 'finance', label: 'Finance', emoji: '💰', color: MODULE_COLORS.finance.accent, gradient: MODULE_COLORS.finance.gradient },
  { key: 'client', label: 'Client', emoji: '🤝', color: MODULE_COLORS.client.accent, gradient: MODULE_COLORS.client.gradient },
  { key: 'operations', label: 'Operations', emoji: '⚡', color: MODULE_COLORS.operations.accent, gradient: MODULE_COLORS.operations.gradient },
];

// ═══════════════════════════════════════════════════════════
// HOOK — Single module card drops [0-90f]
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const dropSpring = spring({ frame, fps, config: { damping: 10, stiffness: 200, mass: 0.6 }, durationInFrames: 18 });
  const cardY = interpolate(dropSpring, [0, 1], [-400, 0]);
  const cardScale = interpolate(dropSpring, [0, 1], [0.5, 1]);

  const activeIdx = Math.floor(interpolate(frame, [20, 80], [0, 5.99], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const activeMod = MODULES[activeIdx];

  const titleSpring = spring({ frame: Math.max(0, frame - 10), fps, config: SPRING.hero, durationInFrames: 18 });
  const subSpring = spring({ frame: Math.max(0, frame - 50), fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${activeMod.color}12 0%, transparent 60%)` }} />

      {/* Module card */}
      <div style={{
        width: 280, padding: '36px 28px', borderRadius: 28,
        background: 'rgba(24,24,27,0.7)', border: `2px solid ${activeMod.color}40`,
        boxShadow: `0 20px 60px ${activeMod.color}20`,
        transform: `translateY(${cardY}px) scale(${cardScale})`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        backdropFilter: 'blur(40px)',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: 22, background: activeMod.gradient,
          display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 36,
          boxShadow: `0 8px 30px ${activeMod.color}40`,
        }}>
          {activeMod.emoji}
        </div>
        <span style={{ fontFamily: HEEBO, fontSize: 24, fontWeight: 800, color: BRAND.white }}>{activeMod.label}</span>
        <span style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 600, color: activeMod.color }}>מודול אחד. כל מה שצריך.</span>
      </div>

      <div style={{ position: 'absolute', marginTop: 360, textAlign: 'center', opacity: titleSpring }}>
        <div style={{ fontFamily: HEEBO, fontSize: 40, fontWeight: 900, color: BRAND.white, direction: 'rtl', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>סולו</div>
        <div style={{ fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: BRAND.muted, direction: 'rtl', marginTop: 8, opacity: subSpring }}>
          בחר מודול אחד. התחל מיד.
        </div>
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// PROBLEM — Too many tools, no integration [90-300f]
// ═══════════════════════════════════════════════════════════
const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const tools = [
    { name: 'Excel', icon: '📊', price: '$20/חודש' },
    { name: 'Trello', icon: '📋', price: '$15/חודש' },
    { name: 'WhatsApp Business', icon: '💬', price: 'חינם' },
    { name: 'Google Sheets', icon: '📝', price: 'חינם' },
    { name: 'Monday', icon: '📅', price: '$30/חודש' },
    { name: 'עוד כלי...', icon: '🔧', price: '???' },
  ];

  const painSpring = spring({ frame: Math.max(0, frame - 130), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ fontFamily: HEEBO, fontSize: 28, fontWeight: 900, color: BRAND.white, direction: 'rtl', marginBottom: 28, textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
        כמה כלים אתה משלם עליהם?
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', maxWidth: 700 }}>
        {tools.map((tool, i) => {
          const s = spring({ frame: Math.max(0, frame - i * 6 - 5), fps, config: SPRING.ui, durationInFrames: 14 });
          const shake = Math.sin(frame * 0.2 + i * 3) * 1.5;
          return (
            <div key={i} style={{
              padding: '16px 20px', borderRadius: 18,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', gap: 10, opacity: s,
              transform: `translateY(${interpolate(s, [0, 1], [20, 0]) + shake}px)`,
            }}>
              <span style={{ fontSize: 24 }}>{tool.icon}</span>
              <div>
                <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: BRAND.white }}>{tool.name}</div>
                <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 600, color: BRAND.muted }}>{tool.price}</div>
              </div>
            </div>
          );
        })}
      </div>

      {frame > 130 && (
        <div style={{
          position: 'absolute', bottom: 200, fontFamily: HEEBO, fontSize: 26, fontWeight: 900,
          color: '#EF4444', direction: 'rtl', opacity: painSpring,
          textShadow: '0 2px 20px rgba(0,0,0,0.8)',
        }}>
          6 כלים. 0 אינטגרציה. בלגן מוחלט. 🤯
        </div>
      )}

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SOLUTION — One module, everything you need [300-600f]
// ═══════════════════════════════════════════════════════════
const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const flashOpacity = interpolate(frame, [0, 8, 20], [0, 0.5, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: BRAND.gradient, opacity: flashOpacity, pointerEvents: 'none' }} />

      <div style={{
        fontFamily: HEEBO, fontSize: 30, fontWeight: 900, color: BRAND.white, direction: 'rtl', marginBottom: 32,
        opacity: spring({ frame: Math.max(0, frame - 10), fps, config: SPRING.hero, durationInFrames: 18 }),
        textShadow: '0 2px 12px rgba(0,0,0,0.5)',
      }}>
        מודול אחד. אפליקציה אחת. AI מובנה.
      </div>

      {/* Module selector grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', maxWidth: 680 }}>
        {MODULES.map((mod, i) => {
          const delay = 30 + i * 10;
          const s = spring({ frame: Math.max(0, frame - delay), fps, config: SPRING.ui, durationInFrames: 16 });
          const isActive = i === Math.floor(interpolate(frame, [60, 250], [0, 5.99], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
          return (
            <div key={i} style={{
              width: 200, padding: '20px 16px', borderRadius: 22,
              background: isActive ? `${mod.color}15` : 'rgba(255,255,255,0.03)',
              border: `2px solid ${isActive ? mod.color : 'rgba(255,255,255,0.06)'}`,
              boxShadow: isActive ? `0 8px 30px ${mod.color}25` : 'none',
              display: 'flex', alignItems: 'center', gap: 12, direction: 'rtl',
              opacity: s, transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px) scale(${isActive ? 1.05 : 1})`,
              transition: 'all 0.3s',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14, background: mod.gradient,
                display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 22, flexShrink: 0,
              }}>
                {mod.emoji}
              </div>
              <div>
                <div style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 800, color: BRAND.white }}>{mod.label}</div>
                {isActive && <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 600, color: mod.color }}>✅ נבחר</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: 30, fontFamily: HEEBO, fontSize: 20, fontWeight: 700, color: BRAND.muted, direction: 'rtl',
        opacity: spring({ frame: Math.max(0, frame - 200), fps, config: SPRING.hero, durationInFrames: 18 }),
      }}>
        ₪149/חודש בלבד. בלי התחייבות.
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SHOWCASE — What you get [600-1050f]
// ═══════════════════════════════════════════════════════════
const ShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const features = [
    { emoji: '🧠', title: 'AI מובנה בכל מודול', desc: 'לא משנה איזה מודול תבחר — AI חכם עובד בשבילך מהרגע הראשון.', color: BRAND.primary, delay: 0 },
    { emoji: '📱', title: 'אפליקציה אחת', desc: 'כניסה אחת, טביעת אצבע אחת. הכל במקום אחד.', color: BRAND.indigo, delay: 60 },
    { emoji: '🔄', title: 'שדרוג בכל רגע', desc: 'התחלת עם מודול אחד? הוסף עוד בלחיצה. בלי אובדן נתונים.', color: '#22C55E', delay: 120 },
    { emoji: '🕎', title: 'מותאם לשומרי שבת', desc: 'מצב שבת אוטומטי. הכל מותאם ללוח העברי ולחגים.', color: '#F59E0B', delay: 180 },
    { emoji: '🔒', title: 'אבטחה מקסימלית', desc: 'הצפנה מקצה לקצה. אימות דו-שלבי. הנתונים שלך בטוחים.', color: '#7C3AED', delay: 240 },
    { emoji: '💰', title: '₪149/חודש', desc: 'מחיר קבוע. ללא עלויות נסתרות. ללא התחייבות. בטל בכל רגע.', color: BRAND.primary, delay: 300 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ fontFamily: HEEBO, fontSize: 30, fontWeight: 900, color: BRAND.white, marginBottom: 28, direction: 'rtl', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
        מה מקבלים בסולו?
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        {features.map((f, i) => (
          <GlassCard key={i} variant="dark" delay={f.delay} width={760} glowColor={f.color}>
            <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'flex-start', gap: 14, direction: 'rtl' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: `${f.color}15`, border: `1px solid ${f.color}30`,
                display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 24, flexShrink: 0,
              }}>{f.emoji}</div>
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
    { value: '₪149', label: 'לחודש', delay: 0 },
    { value: '1', label: 'מודול לבחירה', delay: 20 },
    { value: 'AI', label: 'מובנה בכל מודול', delay: 40 },
    { value: '∞', label: 'אפשרויות שדרוג', delay: 60 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ fontFamily: HEEBO, fontSize: 28, fontWeight: 900, color: BRAND.white, marginBottom: 28, direction: 'rtl' }}>
        למה סולו?
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center' }}>
        {stats.map((stat, i) => {
          const s = spring({ frame: Math.max(0, frame - stat.delay), fps, config: SPRING.punch, durationInFrames: 18 });
          return (
            <GlassCard key={i} variant="dark" delay={stat.delay} width={700} glowColor={BRAND.primary}>
              <div style={{ padding: '24px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl' }}>
                <span style={{ fontFamily: HEEBO, fontSize: 24, fontWeight: 700, color: BRAND.muted }}>{stat.label}</span>
                <span style={{
                  fontFamily: RUBIK, fontSize: 56, fontWeight: 800,
                  background: BRAND.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  transform: `scale(${interpolate(s, [0, 1], [1.4, 1])})`,
                  filter: `blur(${interpolate(s, [0, 1], [6, 0])}px)`, display: 'inline-block',
                }}>{stat.value}</span>
              </div>
            </GlassCard>
          );
        })}
      </div>
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
      background: BRAND.gradient, justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
      opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }),
    }}>
      <TextReveal text="מודול אחד. הכל כלול." delay={5} fontSize={52} fontWeight={900} color="#fff" mode="words" stagger={3} style={{ textAlign: 'center' }} />
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
export const SoloVideoV2: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={T.HOOK.from} durationInFrames={T.HOOK.dur}><HookScene /></Sequence>
      <Sequence from={T.PROBLEM.from} durationInFrames={T.PROBLEM.dur}><ProblemScene /></Sequence>
      <Sequence from={T.SOLUTION.from} durationInFrames={T.SOLUTION.dur}><SolutionScene /></Sequence>
      <Sequence from={T.SHOWCASE.from} durationInFrames={T.SHOWCASE.dur}><ShowcaseScene /></Sequence>
      <Sequence from={T.RESULTS.from} durationInFrames={T.RESULTS.dur}><ResultsScene /></Sequence>
      <Sequence from={T.TAGLINE.from} durationInFrames={T.TAGLINE.dur}><TaglineScene /></Sequence>
      <Sequence from={T.CTA.from} durationInFrames={T.CTA.dur}>
        <CTAEndcard variant="dark" accentColor={BRAND.primary} price="₪149/חודש" tagline="AI שמקדם את הארגון שלך" />
      </Sequence>
    </AbsoluteFill>
  );
};
