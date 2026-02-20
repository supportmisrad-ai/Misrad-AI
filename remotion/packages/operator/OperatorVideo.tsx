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

const OPS = MODULE_COLORS.operations;
const NEXUS = MODULE_COLORS.nexus;

// ═══════════════════════════════════════════════════════════
// SCENE 1: HOOK — Gears meshing [0-90f = 0-3s]
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const rotation = frame * 2.5;
  const mergeSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 28 });
  const gap = interpolate(mergeSpring, [0, 1], [200, 50]);

  const titleSpring = spring({ frame: Math.max(0, frame - 35), fps, config: SPRING.punch, durationInFrames: 15 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={4} color={OPS.accent} speed={0.012} maxSize={100} />
      <ScanLines color={OPS.accent} speed1={2.5} speed2={1.8} />

      <div style={{
        position: 'absolute', width: 700, height: 700, borderRadius: '50%',
        background: `radial-gradient(circle, ${OPS.accent}10 0%, transparent 60%)`,
        opacity: pulse(frame, 0.05, 0.5, 0.8),
      }} />

      <div style={{
        position: 'absolute', transform: `translateX(${-gap}px) rotate(${rotation}deg)`,
        fontSize: 72, filter: `drop-shadow(0 0 ${pulse(frame, 0.05, 15, 25)}px ${OPS.accent}40)`,
      }}>⚙️</div>
      <div style={{
        position: 'absolute', transform: `translateX(${gap}px) rotate(${-rotation}deg)`,
        fontSize: 72, filter: `drop-shadow(0 0 ${pulse(frame, 0.05, 15, 25)}px ${NEXUS.accent}40)`,
      }}>⚙️</div>

      <div style={{ position: 'absolute', marginTop: 220, textAlign: 'center', opacity: titleSpring }}>
        <div style={{ fontFamily: HEEBO, fontSize: 38, fontWeight: 900, color: BRAND.white, direction: 'rtl' }}>חבילת תפעול ושטח</div>
        <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 700, color: BRAND.muted, direction: 'rtl', marginTop: 8 }}>תפעול חכם. אפס בלגן.</div>
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 2: FEATURES [90-330f = 3-11s]
// ═══════════════════════════════════════════════════════════
const FeaturesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const features = [
    { emoji: '⚡', module: 'Operations', text: 'ניהול משימות שטח + Kanban חכם', desc: 'כל משימה מוקצית ומתוזמנת AI.', color: OPS.accent, delay: 0 },
    { emoji: '👥', module: 'Nexus', text: 'ניהול צוות + הקצאת משאבים AI', desc: 'טכנאי נכון, משימה נכונה, זמן נכון.', color: NEXUS.accent, delay: 20 },
    { emoji: '🗺️', module: 'מסלולים', text: 'אופטימיזציית מסלולי שטח', desc: 'חיסכון בזמן ודלק — אוטומטי.', color: OPS.accent, delay: 40 },
    { emoji: '📦', module: 'אוטומציה', text: 'הזמנות אוטומטיות מספקים', desc: 'מלאי נמוך? AI מזמין בשבילך.', color: NEXUS.accent, delay: 60 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={3} color={OPS.accent} speed={0.01} maxSize={90} />
      <ParticleField count={6} color={OPS.accent} speed={0.3} />

      <div style={{
        position: 'absolute', top: 55,
        padding: '10px 24px', borderRadius: 16,
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)',
        fontFamily: HEEBO, fontSize: 26, fontWeight: 900, color: BRAND.white, direction: 'rtl',
        opacity: spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 }),
      }}>
        מה כוללת חבילת תפעול ושטח?
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
// SCENE 3: STATS [330-560f = 11-18.7s]
// ═══════════════════════════════════════════════════════════
const StatsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stats = [
    { target: 40, prefix: '-', suffix: '%', label: 'זמן תפעול', delay: 0 },
    { target: 55, prefix: '+', suffix: '%', label: 'יעילות צוות', delay: 15 },
    { target: 0, prefix: '', suffix: '', label: 'משימות שנשכחו', delay: 30 },
    { target: 349, prefix: '₪', suffix: '/חודש', label: 'מחיר חבילה', delay: 45 },
  ];

  const testSpring = spring({ frame: Math.max(0, frame - 120), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={4} color={OPS.accent} speed={0.01} maxSize={100} />
      <ScanLines color={OPS.accent} speed1={2.0} speed2={1.5} />

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
              border: `1px solid ${OPS.accent}12`, textAlign: 'center', direction: 'rtl',
              opacity: s, transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`,
              boxShadow: `0 4px 20px ${OPS.accent}08`,
            }}>
              <div style={{
                fontFamily: RUBIK, fontSize: 44, fontWeight: 800,
                background: OPS.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
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
            "40% פחות זמן תפעול — הצוות סוף סוף עובד בלי בלגן."
          </div>
          <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 600, color: BRAND.muted, marginTop: 4 }}>
            — מנהל תפעול, חברת שירותי שטח
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
    <AbsoluteFill style={{ background: OPS.gradient, justifyContent: 'center', alignItems: 'center', opacity: bgOp, overflow: 'hidden' }}>
      <BreathingRing color="rgba(255,255,255,0.12)" size={450} speed={0.05} />
      <ParticleField count={12} color="rgba(255,255,255,0.2)" speed={0.5} />

      <TextReveal text="תפעול חכם. אפס בלגן." delay={5} fontSize={48} fontWeight={900} color="#fff" mode="words" stagger={2} style={{ textAlign: 'center' }} />

      <div style={{
        marginTop: 24, padding: '8px 20px', borderRadius: 12,
        background: 'rgba(255,255,255,0.1)',
        fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.65)', direction: 'rtl',
        opacity: subSpring,
      }}>
        Operations + Nexus = מכונת תפעול
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN — 30 seconds (900 frames)
// ═══════════════════════════════════════════════════════════
export const OperatorVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={90}><HookScene /></Sequence>
      <Sequence from={90} durationInFrames={240}><FeaturesScene /></Sequence>
      <Sequence from={330} durationInFrames={230}><StatsScene /></Sequence>
      <Sequence from={560} durationInFrames={310}><TaglineScene /></Sequence>
      <Sequence from={870} durationInFrames={30}>
        <CTAEndcard variant="dark" accentColor={OPS.accent} price="₪349/חודש" tagline="תפעול חכם. אפס בלגן." />
      </Sequence>
    </AbsoluteFill>
  );
};
