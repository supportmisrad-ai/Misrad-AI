import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from 'remotion';
import { BRAND, MODULE_COLORS, HEEBO, RUBIK, SPRING, FPS } from '../../shared/config';
import { NoiseLayer } from '../../shared/components/NoiseLayer';
import { GlassCard } from '../../shared/components/GlassCard';
import { TextReveal } from '../../shared/components/TextReveal';
import { CTAEndcard } from '../../shared/components/CTAEndcard';
import { pulse, FloatingOrbs, ParticleField, BreathingRing } from '../../shared/components/MicroAnimations';

const MODULES = [
  { key: 'system', label: 'System', emoji: '🎯', color: MODULE_COLORS.system.accent },
  { key: 'nexus', label: 'Nexus', emoji: '👥', color: MODULE_COLORS.nexus.accent },
  { key: 'social', label: 'Social', emoji: '📱', color: MODULE_COLORS.social.accent },
  { key: 'finance', label: 'Finance', emoji: '💰', color: MODULE_COLORS.finance.accent },
  { key: 'client', label: 'Client', emoji: '🤝', color: MODULE_COLORS.client.accent },
  { key: 'operations', label: 'Operations', emoji: '⚡', color: MODULE_COLORS.operations.accent },
];

// ═══════════════════════════════════════════════════════════
// SCENE 1: HOOK — Single module card drops [0-90f = 0-3s]
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const dropSpring = spring({ frame, fps, config: { damping: 10, stiffness: 200, mass: 0.8 }, durationInFrames: 22 });
  const cardY = interpolate(dropSpring, [0, 1], [-400, 0]);
  const impactScale = frame > 16 ? interpolate(frame, [16, 20, 24], [1, 1.05, 1], { extrapolateRight: 'clamp' }) : 1;

  const impactFrame = Math.max(0, frame - 18);
  const shockScale = interpolate(impactFrame, [0, 18], [0, 3.5], { extrapolateRight: 'clamp' });
  const shockOpacity = interpolate(impactFrame, [0, 5, 18], [0, 0.4, 0], { extrapolateRight: 'clamp' });

  const textSpring = spring({ frame: Math.max(0, frame - 30), fps, config: SPRING.punch, durationInFrames: 15 });
  const priceSpring = spring({ frame: Math.max(0, frame - 50), fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={4} color={BRAND.primary} speed={0.012} maxSize={100} />

      <div style={{
        position: 'absolute', width: 600, height: 600, borderRadius: '50%',
        background: `radial-gradient(circle, ${BRAND.primary}10 0%, transparent 60%)`,
        opacity: pulse(frame, 0.05, 0.5, 0.8),
      }} />

      {frame > 16 && (
        <div style={{ position: 'absolute', width: 100 * shockScale, height: 100 * shockScale, borderRadius: '50%', border: `2px solid ${BRAND.primary}`, opacity: shockOpacity }} />
      )}

      <BreathingRing color={BRAND.primary} size={380} speed={0.04} />

      <div style={{
        transform: `translateY(${cardY}px) scale(${impactScale})`,
        width: 320, padding: '40px 30px', borderRadius: 28,
        background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(40px)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: `0 30px 60px rgba(0,0,0,0.3), 0 0 ${pulse(frame, 0.05, 30, 50)}px ${BRAND.primary}15`,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 64, marginBottom: 16, transform: `translateY(${pulse(frame, 0.04, -2, 2)}px)` }}>🎯</div>
        <div style={{ fontFamily: HEEBO, fontSize: 28, fontWeight: 900, color: BRAND.white, marginBottom: 8 }}>מודול אחד</div>
        <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 600, color: BRAND.muted }}>כל מה שצריך</div>
      </div>

      <div style={{
        position: 'absolute', marginTop: 340,
        opacity: priceSpring,
        transform: `scale(${interpolate(priceSpring, [0, 1], [1.3, 1])})`,
      }}>
        <span style={{ fontFamily: RUBIK, fontSize: 52, fontWeight: 800, background: BRAND.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          ₪149/חודש
        </span>
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 2: SHOWCASE — Module selector carousel [90-270f = 3-9s]
// ═══════════════════════════════════════════════════════════
const ShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cycleSpeed = 25;
  const activeIndex = Math.floor(frame / cycleSpeed) % MODULES.length;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={3} color={MODULES[activeIndex].color} speed={0.01} maxSize={90} />
      <ParticleField count={6} color={MODULES[activeIndex].color} speed={0.3} />

      <div style={{
        position: 'absolute', width: 500, height: 500, borderRadius: '50%',
        background: `radial-gradient(circle, ${MODULES[activeIndex].color}12 0%, transparent 60%)`,
      }} />

      <div style={{
        fontFamily: HEEBO, fontSize: 30, fontWeight: 900, color: BRAND.white, marginBottom: 36, direction: 'rtl',
        padding: '8px 20px', borderRadius: 14, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)',
        opacity: spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 }),
      }}>
        בחר את המודול שלך
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', maxWidth: 700 }}>
        {MODULES.map((mod, i) => {
          const isActive = i === activeIndex;
          const s = spring({ frame: Math.max(0, frame - i * 4), fps, config: SPRING.ui, durationInFrames: 16 });
          const iconFloat = pulse(frame, 0.035 + i * 0.005, -2, 2);

          return (
            <div key={i} style={{
              width: 200, padding: '22px 14px', borderRadius: 22,
              background: isActive ? `${mod.color}12` : 'rgba(255,255,255,0.04)',
              border: isActive ? `2px solid ${mod.color}50` : '1px solid rgba(255,255,255,0.06)',
              textAlign: 'center', opacity: s,
              transform: `scale(${isActive ? 1.06 : 1}) translateY(${interpolate(s, [0, 1], [20, 0])}px)`,
              boxShadow: isActive ? `0 12px 40px ${mod.color}20, 0 0 ${pulse(frame, 0.06, 8, 16)}px ${mod.color}12` : 'none',
            }}>
              <div style={{ fontSize: 34, marginBottom: 6, transform: `translateY(${isActive ? iconFloat : 0}px)` }}>{mod.emoji}</div>
              <div style={{ fontFamily: HEEBO, fontSize: 15, fontWeight: 700, color: isActive ? mod.color : BRAND.white }}>{mod.label}</div>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: 36, fontFamily: HEEBO, fontSize: 20, fontWeight: 700, color: BRAND.muted, direction: 'rtl',
        padding: '6px 16px', borderRadius: 10, background: 'rgba(0,0,0,0.2)',
      }}>
        מודול אחד. מערכת AI מלאה.
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 3: VALUE PROPS [270-510f = 9-17s]
// ═══════════════════════════════════════════════════════════
const ValueScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const props = [
    { emoji: '🧠', text: 'AI מובנה בכל פיצ\'ר', desc: 'כל מודול כולל AI חכם שמתאים את עצמו לעסק שלך.', delay: 0 },
    { emoji: '📱', text: 'מובייל + דסקטופ', desc: 'עבוד מכל מקום — הממשק מותאם לכל מסך.', delay: 18 },
    { emoji: '🔄', text: 'אפשר לשדרג בכל רגע', desc: 'התחל עם מודול אחד ושדרג ברגע שצריך.', delay: 36 },
    { emoji: '🚀', text: 'הקמה תוך 5 דקות', desc: 'בלי התקנה. בלי הגדרות מורכבות. מתחילים מיד.', delay: 54 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={3} color={BRAND.primary} speed={0.01} maxSize={90} />
      <ParticleField count={6} color={BRAND.primary} speed={0.25} />

      <div style={{
        position: 'absolute', top: 55,
        padding: '10px 24px', borderRadius: 16,
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)',
        fontFamily: HEEBO, fontSize: 26, fontWeight: 900, color: BRAND.white, direction: 'rtl',
        opacity: spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 }),
      }}>
        למה Solo?
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', marginTop: 40 }}>
        {props.map((prop, i) => {
          const s = spring({ frame: Math.max(0, frame - prop.delay), fps, config: SPRING.ui, durationInFrames: 20 });
          const iconFloat = pulse(frame, 0.04 + i * 0.005, -2, 2);
          return (
            <div key={i} style={{
              width: 720, padding: '16px 22px', borderRadius: 20,
              background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)',
              border: `1px solid ${BRAND.primary}15`,
              boxShadow: `0 4px 20px ${BRAND.primary}06`,
              display: 'flex', alignItems: 'flex-start', gap: 14, direction: 'rtl',
              opacity: s, transform: `translateY(${interpolate(s, [0, 1], [25, 0])}px)`,
            }}>
              <div style={{
                width: 46, height: 46, borderRadius: 14,
                background: `${BRAND.primary}10`, border: `1px solid ${BRAND.primary}20`,
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                fontSize: 22, flexShrink: 0, transform: `translateY(${iconFloat}px)`,
              }}>
                {prop.emoji}
              </div>
              <div>
                <div style={{ fontFamily: HEEBO, fontSize: 17, fontWeight: 800, color: BRAND.white }}>{prop.text}</div>
                <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 600, color: BRAND.muted, lineHeight: 1.5, marginTop: 2 }}>{prop.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 4: RESULTS [510-700f = 17-23.3s]
// ═══════════════════════════════════════════════════════════
const ResultsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stats = [
    { target: 149, prefix: '₪', suffix: '/חודש', label: 'מחיר חבילה', delay: 0 },
    { target: 5, prefix: '', suffix: ' דקות', label: 'זמן הקמה', delay: 15 },
    { target: 100, prefix: '', suffix: '%', label: 'AI מובנה', delay: 30 },
    { target: 0, prefix: '', suffix: '', label: 'התחייבות', delay: 45 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={4} color={BRAND.primary} speed={0.01} maxSize={100} />

      <div style={{
        position: 'absolute', top: 50,
        padding: '8px 20px', borderRadius: 14, background: 'rgba(0,0,0,0.4)',
        fontFamily: HEEBO, fontSize: 24, fontWeight: 900, color: BRAND.white, direction: 'rtl',
        opacity: spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 }),
      }}>
        הנתונים
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 40, padding: '0 60px', width: '100%', maxWidth: 800 }}>
        {stats.map((stat, i) => {
          const s = spring({ frame: Math.max(0, frame - stat.delay), fps, config: SPRING.punch, durationInFrames: 18 });
          const counterS = spring({ frame: Math.max(0, frame - stat.delay - 3), fps, config: { damping: 20, stiffness: 50, mass: 1 }, durationInFrames: 30 });
          const displayVal = Math.round(stat.target * counterS);
          return (
            <div key={i} style={{
              padding: '24px 20px', borderRadius: 22,
              background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)',
              border: `1px solid ${BRAND.primary}12`, textAlign: 'center', direction: 'rtl',
              opacity: s, transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`,
              boxShadow: `0 4px 20px ${BRAND.primary}08`,
            }}>
              <div style={{
                fontFamily: RUBIK, fontSize: 44, fontWeight: 800,
                background: BRAND.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                {stat.prefix}{displayVal}{stat.suffix}
              </div>
              <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: BRAND.muted, marginTop: 4 }}>{stat.label}</div>
            </div>
          );
        })}
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 5: TAGLINE [700-870f = 23.3-29s]
// ═══════════════════════════════════════════════════════════
const TaglineScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bgOp = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const subSpring = spring({ frame: Math.max(0, frame - 22), fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ background: BRAND.gradient, justifyContent: 'center', alignItems: 'center', opacity: bgOp, overflow: 'hidden' }}>
      <BreathingRing color="rgba(255,255,255,0.12)" size={450} speed={0.05} />
      <ParticleField count={12} color="rgba(255,255,255,0.2)" speed={0.5} />

      <TextReveal text="מודול אחד. כל מה שצריך." delay={5} fontSize={48} fontWeight={900} color="#fff" mode="words" stagger={2} style={{ textAlign: 'center' }} />

      <div style={{
        marginTop: 24, padding: '8px 20px', borderRadius: 12,
        background: 'rgba(255,255,255,0.1)',
        fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.65)', direction: 'rtl',
        opacity: subSpring,
      }}>
        AI. מובייל. ללא התחייבות.
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN — 30 seconds (900 frames)
// ═══════════════════════════════════════════════════════════
export const SoloVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={90}><HookScene /></Sequence>
      <Sequence from={90} durationInFrames={180}><ShowcaseScene /></Sequence>
      <Sequence from={270} durationInFrames={240}><ValueScene /></Sequence>
      <Sequence from={510} durationInFrames={190}><ResultsScene /></Sequence>
      <Sequence from={700} durationInFrames={170}><TaglineScene /></Sequence>
      <Sequence from={870} durationInFrames={30}>
        <CTAEndcard variant="dark" accentColor={BRAND.primary} price="₪149/חודש" tagline="מודול אחד. כל מה שצריך." />
      </Sequence>
    </AbsoluteFill>
  );
};
