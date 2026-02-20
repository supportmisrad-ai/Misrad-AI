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
import { pulse, FloatingOrbs, ScanLines, ParticleField, BreathingRing } from '../../shared/components/MicroAnimations';

const SYSTEM = MODULE_COLORS.system;
const NEXUS = MODULE_COLORS.nexus;

// ═══════════════════════════════════════════════════════════
// SCENE 1: HOOK — Two modules merge [0-90f = 0-3s]
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const mergeProgress = spring({ frame, fps, config: SPRING.hero, durationInFrames: 25 });
  const leftX = interpolate(mergeProgress, [0, 1], [-300, -60]);
  const rightX = interpolate(mergeProgress, [0, 1], [300, 60]);

  const impactFrame = Math.max(0, frame - 20);
  const flashOpacity = interpolate(impactFrame, [0, 3, 12], [0, 0.15, 0], { extrapolateRight: 'clamp' });
  const ringScale = interpolate(impactFrame, [0, 15], [0, 3], { extrapolateRight: 'clamp' });
  const ringOpacity = interpolate(impactFrame, [0, 5, 15], [0, 0.5, 0], { extrapolateRight: 'clamp' });

  const titleSpring = spring({ frame: Math.max(0, frame - 30), fps, config: SPRING.punch, durationInFrames: 15 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={4} color={SYSTEM.accent} speed={0.012} maxSize={100} />
      <ScanLines color={SYSTEM.accent} speed1={2.5} speed2={1.8} />

      <div style={{
        position: 'absolute', width: 600, height: 600, borderRadius: '50%',
        background: `radial-gradient(circle, ${SYSTEM.accent}10 0%, transparent 60%)`,
        opacity: pulse(frame, 0.05, 0.5, 0.8),
      }} />

      <div style={{ position: 'absolute', transform: `translateX(${leftX}px)`, opacity: mergeProgress }}>
        <div style={{
          width: 80, height: 80, borderRadius: 22, background: SYSTEM.gradient,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          boxShadow: `0 12px 40px ${SYSTEM.accent}40, 0 0 ${pulse(frame, 0.06, 8, 16)}px ${SYSTEM.accent}20`,
          fontSize: 36,
        }}>🎯</div>
      </div>

      <div style={{ position: 'absolute', transform: `translateX(${rightX}px)`, opacity: mergeProgress }}>
        <div style={{
          width: 80, height: 80, borderRadius: 22, background: NEXUS.gradient,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          boxShadow: `0 12px 40px ${NEXUS.accent}40, 0 0 ${pulse(frame, 0.06, 8, 16)}px ${NEXUS.accent}20`,
          fontSize: 36,
        }}>👥</div>
      </div>

      <div style={{ fontFamily: RUBIK, fontSize: 48, fontWeight: 800, color: BRAND.white, opacity: mergeProgress * 0.6 }}>+</div>

      {frame > 18 && <div style={{ position: 'absolute', width: 80 * ringScale, height: 80 * ringScale, borderRadius: '50%', border: `2px solid ${SYSTEM.accent}`, opacity: ringOpacity }} />}
      <AbsoluteFill style={{ backgroundColor: SYSTEM.accent, opacity: flashOpacity, pointerEvents: 'none' }} />

      <div style={{ position: 'absolute', marginTop: 240, textAlign: 'center', opacity: titleSpring }}>
        <div style={{ fontFamily: HEEBO, fontSize: 40, fontWeight: 900, color: BRAND.white, direction: 'rtl' }}>חבילת מכירות</div>
        <div style={{ fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: BRAND.muted, direction: 'rtl', marginTop: 8 }}>סוגר עסקאות. לא מפספס לידים.</div>
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 2: FEATURES — What's included [90-330f = 3-11s]
// ═══════════════════════════════════════════════════════════
const FeaturesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const features = [
    { emoji: '🎯', module: 'System', text: 'ניהול לידים + חיזוי סגירות AI', desc: 'כל ליד מדורג ומתועדף אוטומטית.', color: SYSTEM.accent, delay: 0 },
    { emoji: '👥', module: 'Nexus', text: 'ניהול צוות + משימות חכמות', desc: 'הקצאת משימות AI לפי עומס וזמינות.', color: NEXUS.accent, delay: 20 },
    { emoji: '🧠', module: 'AI מובנה', text: 'דירוג לידים, תזמון פולואפ, תחזיות', desc: 'AI שיודע מתי לסגור עסקה — ומזכיר.', color: BRAND.primary, delay: 40 },
    { emoji: '📊', module: 'דוחות', text: 'דשבורד מכירות בזמן אמת', desc: 'KPIs, פאנל מכירות, ודיוק חיזוי.', color: BRAND.indigo, delay: 60 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={3} color={SYSTEM.accent} speed={0.01} maxSize={90} />
      <ParticleField count={6} color={SYSTEM.accent} speed={0.3} />

      <div style={{
        position: 'absolute', top: 55,
        padding: '10px 24px', borderRadius: 16,
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)',
        fontFamily: HEEBO, fontSize: 26, fontWeight: 900, color: BRAND.white, direction: 'rtl',
        opacity: spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 }),
      }}>
        מה כוללת חבילת מכירות?
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', marginTop: 40 }}>
        {features.map((f, i) => {
          const s = spring({ frame: Math.max(0, frame - f.delay), fps, config: SPRING.ui, durationInFrames: 20 });
          const iconFloat = pulse(frame, 0.04 + i * 0.005, -2, 2);
          return (
            <div key={i} style={{
              width: 720, padding: '16px 22px', borderRadius: 20,
              background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)',
              border: `1px solid ${f.color}18`,
              boxShadow: `0 4px 20px ${f.color}06`,
              display: 'flex', alignItems: 'flex-start', gap: 14, direction: 'rtl',
              opacity: s, transform: `translateY(${interpolate(s, [0, 1], [25, 0])}px)`,
            }}>
              <div style={{
                width: 46, height: 46, borderRadius: 14,
                background: `${f.color}12`, border: `1px solid ${f.color}25`,
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                fontSize: 22, flexShrink: 0, transform: `translateY(${iconFloat}px)`,
              }}>{f.emoji}</div>
              <div>
                <div style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 800, color: f.color }}>{f.module}</div>
                <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: BRAND.white }}>{f.text}</div>
                <div style={{ fontFamily: HEEBO, fontSize: 10, fontWeight: 600, color: BRAND.muted, marginTop: 2 }}>{f.desc}</div>
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
// SCENE 3: STATS — Animated counters [330-560f = 11-18.7s]
// ═══════════════════════════════════════════════════════════
const StatsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stats = [
    { target: 87, prefix: '+', suffix: '%', label: 'המרות', delay: 0 },
    { target: 75, prefix: '', suffix: '%', label: 'דיוק חיזוי AI', delay: 15 },
    { target: 5, prefix: 'x', suffix: '', label: 'פרודוקטיביות צוות', delay: 30 },
    { target: 249, prefix: '₪', suffix: '/חודש', label: 'מחיר חבילה', delay: 45 },
  ];

  const testSpring = spring({ frame: Math.max(0, frame - 120), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={4} color={SYSTEM.accent} speed={0.01} maxSize={100} />
      <ScanLines color={SYSTEM.accent} speed1={2.0} speed2={1.5} />

      <div style={{
        position: 'absolute', top: 50,
        padding: '8px 20px', borderRadius: 14, background: 'rgba(0,0,0,0.4)',
        fontFamily: HEEBO, fontSize: 24, fontWeight: 900, color: BRAND.white, direction: 'rtl',
        opacity: spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 }),
      }}>
        התוצאות
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
              border: `1px solid ${SYSTEM.accent}12`, textAlign: 'center', direction: 'rtl',
              opacity: s, transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`,
              boxShadow: `0 4px 20px ${SYSTEM.accent}08`,
            }}>
              <div style={{
                fontFamily: RUBIK, fontSize: 44, fontWeight: 800,
                background: SYSTEM.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                {stat.prefix}{displayVal}{stat.suffix}
              </div>
              <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: BRAND.muted, marginTop: 4 }}>{stat.label}</div>
            </div>
          );
        })}
      </div>

      {frame > 120 && (
        <div style={{
          position: 'absolute', bottom: 50, maxWidth: 700,
          padding: '14px 24px', borderRadius: 20,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.06)',
          direction: 'rtl', opacity: testSpring,
        }}>
          <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: BRAND.white, lineHeight: 1.6 }}>
            "סגרתי 87% יותר עסקאות בחודש הראשון — AI שלא מפספס ליד."
          </div>
          <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 600, color: BRAND.muted, marginTop: 4 }}>
            — מנהל מכירות, סטארטאפ SaaS
          </div>
        </div>
      )}

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 4: TAGLINE [560-870f = 18.7-29s]
// ═══════════════════════════════════════════════════════════
const TaglineScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bgOp = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const subSpring = spring({ frame: Math.max(0, frame - 22), fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ background: SYSTEM.gradient, justifyContent: 'center', alignItems: 'center', opacity: bgOp, overflow: 'hidden' }}>
      <BreathingRing color="rgba(255,255,255,0.12)" size={450} speed={0.05} />
      <ParticleField count={12} color="rgba(255,255,255,0.2)" speed={0.5} />

      <TextReveal text="סוגר עסקאות. לא מפספס לידים." delay={5} fontSize={44} fontWeight={900} color="#fff" mode="words" stagger={2} style={{ textAlign: 'center' }} />

      <div style={{
        marginTop: 24, padding: '8px 20px', borderRadius: 12,
        background: 'rgba(255,255,255,0.1)',
        fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.65)', direction: 'rtl',
        opacity: subSpring,
      }}>
        System + Nexus = מכונת מכירות
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN — 30 seconds (900 frames)
// ═══════════════════════════════════════════════════════════
export const CloserVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={90}><HookScene /></Sequence>
      <Sequence from={90} durationInFrames={240}><FeaturesScene /></Sequence>
      <Sequence from={330} durationInFrames={230}><StatsScene /></Sequence>
      <Sequence from={560} durationInFrames={310}><TaglineScene /></Sequence>
      <Sequence from={870} durationInFrames={30}>
        <CTAEndcard variant="dark" accentColor={SYSTEM.accent} price="₪249/חודש" tagline="סוגר עסקאות. לא מפספס לידים." />
      </Sequence>
    </AbsoluteFill>
  );
};
