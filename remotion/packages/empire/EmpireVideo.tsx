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
import { pulse, FloatingOrbs, MorphBlob, ParticleField, BreathingRing } from '../../shared/components/MicroAnimations';

const ALL_MODULES = [
  { emoji: '🎯', label: 'System', color: MODULE_COLORS.system.accent, gradient: MODULE_COLORS.system.gradient },
  { emoji: '👥', label: 'Nexus', color: MODULE_COLORS.nexus.accent, gradient: MODULE_COLORS.nexus.gradient },
  { emoji: '📱', label: 'Social', color: MODULE_COLORS.social.accent, gradient: MODULE_COLORS.social.gradient },
  { emoji: '💰', label: 'Finance', color: MODULE_COLORS.finance.accent, gradient: MODULE_COLORS.finance.gradient },
  { emoji: '🤝', label: 'Client', color: MODULE_COLORS.client.accent, gradient: MODULE_COLORS.client.gradient },
  { emoji: '⚡', label: 'Operations', color: MODULE_COLORS.operations.accent, gradient: MODULE_COLORS.operations.gradient },
];

// ═══════════════════════════════════════════════════════════
// SCENE 1: HOOK — All modules converge [0-90f = 0-3s]
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const convergeProgress = spring({ frame, fps, config: SPRING.hero, durationInFrames: 30 });

  const impactFrame = Math.max(0, frame - 28);
  const flashOpacity = interpolate(impactFrame, [0, 3, 12], [0, 0.12, 0], { extrapolateRight: 'clamp' });
  const ringScale = interpolate(impactFrame, [0, 18], [0, 3.5], { extrapolateRight: 'clamp' });
  const ringOpacity = interpolate(impactFrame, [0, 5, 18], [0, 0.5, 0], { extrapolateRight: 'clamp' });

  const titleSpring = spring({ frame: Math.max(0, frame - 40), fps, config: SPRING.punch, durationInFrames: 15 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={5} color={BRAND.primary} speed={0.012} maxSize={110} />
      <MorphBlob color={BRAND.primary} size={600} speed={0.004} />

      {ALL_MODULES.map((mod, i) => {
        const angle = (i / ALL_MODULES.length) * Math.PI * 2 - Math.PI / 2;
        const startDist = 350;
        const endX = ((i % 3) - 1) * 90;
        const endY = (Math.floor(i / 3) - 0.5) * 90;
        const startX = Math.cos(angle) * startDist;
        const startY = Math.sin(angle) * startDist;

        const x = interpolate(convergeProgress, [0, 1], [startX, endX]);
        const y = interpolate(convergeProgress, [0, 1], [startY, endY]);
        const scale = interpolate(convergeProgress, [0, 1], [0.6, 1]);

        return (
          <div key={i} style={{
            position: 'absolute', width: 64, height: 64, borderRadius: 18,
            background: `${mod.color}15`, border: `2px solid ${mod.color}40`,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            transform: `translate(${x}px, ${y}px) scale(${scale})`,
            fontSize: 28, boxShadow: `0 8px 24px ${mod.color}25, 0 0 ${pulse(frame, 0.06, 6, 12)}px ${mod.color}12`,
            opacity: convergeProgress,
          }}>
            {mod.emoji}
          </div>
        );
      })}

      {frame > 26 && <div style={{ position: 'absolute', width: 80 * ringScale, height: 80 * ringScale, borderRadius: '50%', border: `2px solid ${BRAND.primary}`, opacity: ringOpacity }} />}
      <AbsoluteFill style={{ background: BRAND.gradient, opacity: flashOpacity, pointerEvents: 'none' }} />

      <div style={{ position: 'absolute', marginTop: 280, textAlign: 'center', opacity: titleSpring }}>
        <div style={{ fontFamily: HEEBO, fontSize: 44, fontWeight: 900, color: BRAND.white, direction: 'rtl' }}>הכל כלול</div>
        <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 700, color: BRAND.muted, direction: 'rtl', marginTop: 8 }}>הכל. במערכת אחת.</div>
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 2: MODULES SHOWCASE [90-330f = 3-11s]
// ═══════════════════════════════════════════════════════════
const ModulesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const activeIndex = Math.floor(frame / 30) % ALL_MODULES.length;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={3} color={ALL_MODULES[activeIndex].color} speed={0.01} maxSize={90} />
      <ParticleField count={6} color={BRAND.primary} speed={0.25} />

      <div style={{
        position: 'absolute', top: 50,
        padding: '8px 20px', borderRadius: 14, background: 'rgba(0,0,0,0.4)',
        fontFamily: HEEBO, fontSize: 24, fontWeight: 900, color: BRAND.white, direction: 'rtl',
        opacity: spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 }),
      }}>
        6 מודולים. מערכת AI אחת.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', marginTop: 30 }}>
        {ALL_MODULES.map((mod, i) => {
          const delay = i * 10;
          const s = spring({ frame: Math.max(0, frame - delay), fps, config: SPRING.hero, durationInFrames: 18 });
          const isActive = i === activeIndex;
          const iconFloat = pulse(frame, 0.035 + i * 0.005, -2, 2);

          return (
            <div key={i} style={{
              width: 720, padding: '14px 20px', borderRadius: 20,
              background: isActive ? `${mod.color}08` : 'rgba(255,255,255,0.03)',
              border: isActive ? `1px solid ${mod.color}30` : `1px solid ${mod.color}12`,
              display: 'flex', alignItems: 'center', gap: 14, direction: 'rtl',
              opacity: s, transform: `translateX(${interpolate(s, [0, 1], [40, 0])}px)`,
              boxShadow: isActive ? `0 6px 24px ${mod.color}12` : 'none',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14, background: mod.gradient,
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                fontSize: 22, flexShrink: 0,
                boxShadow: `0 4px 16px ${mod.color}25`,
                transform: `translateY(${isActive ? iconFloat : 0}px)`,
              }}>
                {mod.emoji}
              </div>
              <span style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 700, color: isActive ? mod.color : BRAND.white }}>{mod.label}</span>
              <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 600, color: '#22C55E' }}>✅ AI מובנה</span>
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
    { target: 6, prefix: '', suffix: '', label: 'מודולים', delay: 0 },
    { target: 499, prefix: '₪', suffix: '/חודש', label: 'מחיר חבילה', delay: 15 },
    { target: 100, prefix: '', suffix: '%', label: 'AI בכל מודול', delay: 30 },
    { target: 1, prefix: '', suffix: '', label: 'מערכת אחת', delay: 45 },
  ];

  const testSpring = spring({ frame: Math.max(0, frame - 120), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={4} color={BRAND.primary} speed={0.01} maxSize={100} />
      <MorphBlob color={BRAND.indigo} size={500} speed={0.004} />

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
                fontFamily: RUBIK, fontSize: 48, fontWeight: 800,
                background: BRAND.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
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
            "מערכת אחת שמחליפה 5 כלים — חיסכון של אלפי שקלים בחודש."
          </div>
          <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 600, color: BRAND.muted, marginTop: 4 }}>
            — מנכ"ל, חברת שירותים
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
    <AbsoluteFill style={{ background: BRAND.gradient, justifyContent: 'center', alignItems: 'center', opacity: bgOp, overflow: 'hidden' }}>
      <BreathingRing color="rgba(255,255,255,0.12)" size={450} speed={0.05} />
      <ParticleField count={12} color="rgba(255,255,255,0.2)" speed={0.5} />

      <TextReveal text="הכל. במערכת אחת." delay={5} fontSize={52} fontWeight={900} color="#fff" mode="words" stagger={2} style={{ textAlign: 'center' }} />

      <div style={{
        marginTop: 24, padding: '8px 20px', borderRadius: 12,
        background: 'rgba(255,255,255,0.1)',
        fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.65)', direction: 'rtl',
        opacity: subSpring,
      }}>
        6 מודולים. AI אחד. ₪499/חודש.
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN — 30 seconds (900 frames)
// ═══════════════════════════════════════════════════════════
export const EmpireVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={90}><HookScene /></Sequence>
      <Sequence from={90} durationInFrames={240}><ModulesScene /></Sequence>
      <Sequence from={330} durationInFrames={230}><StatsScene /></Sequence>
      <Sequence from={560} durationInFrames={310}><TaglineScene /></Sequence>
      <Sequence from={870} durationInFrames={30}>
        <CTAEndcard variant="dark" accentColor={BRAND.primary} price="₪499/חודש" tagline="הכל. במערכת אחת." />
      </Sequence>
    </AbsoluteFill>
  );
};
