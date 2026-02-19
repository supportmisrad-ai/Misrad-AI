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

const OPS = MODULE_COLORS.operations;
const NEXUS = MODULE_COLORS.nexus;

// HOOK — Gears meshing [0-36f]
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Two gear icons rotate and interlock
  const rotation = frame * 3;
  const mergeSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 20 });
  const gap = interpolate(mergeSpring, [0, 1], [200, 50]);

  const titleSpring = spring({ frame: Math.max(0, frame - 20), fps, config: SPRING.punch, durationInFrames: 12 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: `radial-gradient(circle, ${OPS.accent}10 0%, transparent 60%)` }} />

      {/* Gear left */}
      <div style={{ position: 'absolute', transform: `translateX(${-gap}px) rotate(${rotation}deg)`, fontSize: 72, filter: `drop-shadow(0 0 20px ${OPS.accent}50)` }}>⚙️</div>
      {/* Gear right */}
      <div style={{ position: 'absolute', transform: `translateX(${gap}px) rotate(${-rotation}deg)`, fontSize: 72, filter: `drop-shadow(0 0 20px ${NEXUS.accent}50)` }}>⚙️</div>

      {/* Title */}
      <div style={{ position: 'absolute', marginTop: 220, textAlign: 'center', opacity: titleSpring }}>
        <div style={{ fontFamily: HEEBO, fontSize: 44, fontWeight: 900, color: BRAND.white }}>The Operator</div>
        <div style={{ fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: BRAND.muted, direction: 'rtl', marginTop: 8 }}>תפעול חכם. אפס בלגן.</div>
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// FEATURES [36-210f]
const FeaturesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const features = [
    { emoji: '⚡', module: 'Operations', text: 'ניהול משימות שטח + Kanban חכם', color: OPS.accent, delay: 0 },
    { emoji: '👥', module: 'Nexus', text: 'ניהול צוות + הקצאת משאבים AI', color: NEXUS.accent, delay: 10 },
    { emoji: '🗺️', module: 'מסלולים', text: 'אופטימיזציית מסלולי שטח', color: OPS.accent, delay: 20 },
    { emoji: '📦', module: 'אוטומציה', text: 'הזמנות אוטומטיות מספקים', color: NEXUS.accent, delay: 30 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: `radial-gradient(circle, ${OPS.accent}06 0%, transparent 60%)` }} />

      <div style={{ fontFamily: HEEBO, fontSize: 28, fontWeight: 900, color: BRAND.white, marginBottom: 36, direction: 'rtl' }}>
        מה כולל The Operator?
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        {features.map((f, i) => (
          <GlassCard key={i} variant="dark" delay={f.delay} width={740} glowColor={f.color}>
            <div style={{ padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 16, direction: 'rtl' }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: `${f.color}15`, border: `1px solid ${f.color}30`, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 26, flexShrink: 0 }}>{f.emoji}</div>
              <div>
                <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 700, color: f.color }}>{f.module}</div>
                <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 600, color: BRAND.muted }}>{f.text}</div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// STATS [210-330f]
const StatsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stats = [
    { value: '-40%', label: 'זמן תפעול', delay: 0 },
    { value: '+55%', label: 'יעילות צוות', delay: 10 },
    { value: '0', label: 'משימות שנשכחו', delay: 20 },
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${OPS.accent}06 0%, transparent 60%)` }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28, alignItems: 'center' }}>
        {stats.map((stat, i) => {
          const s = spring({ frame: Math.max(0, frame - stat.delay), fps, config: SPRING.punch, durationInFrames: 15 });
          return (
            <GlassCard key={i} variant="dark" delay={stat.delay} width={700} glowColor={OPS.accent}>
              <div style={{ padding: '28px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl' }}>
                <span style={{ fontFamily: HEEBO, fontSize: 26, fontWeight: 700, color: BRAND.muted }}>{stat.label}</span>
                <span style={{ fontFamily: RUBIK, fontSize: 60, fontWeight: 800, background: OPS.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', transform: `scale(${interpolate(s, [0, 1], [1.4, 1])})`, filter: `blur(${interpolate(s, [0, 1], [6, 0])}px)`, display: 'inline-block' }}>{stat.value}</span>
              </div>
            </GlassCard>
          );
        })}
      </div>
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// TAGLINE [330-390f]
const TaglineScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: OPS.gradient, justifyContent: 'center', alignItems: 'center', opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }) }}>
      <TextReveal text="תפעול חכם. אפס בלגן." delay={5} fontSize={52} fontWeight={900} color="#fff" mode="words" stagger={2} style={{ textAlign: 'center' }} />
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

export const OperatorVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={36}><HookScene /></Sequence>
      <Sequence from={36} durationInFrames={174}><FeaturesScene /></Sequence>
      <Sequence from={210} durationInFrames={120}><StatsScene /></Sequence>
      <Sequence from={330} durationInFrames={60}><TaglineScene /></Sequence>
      <Sequence from={390} durationInFrames={150}>
        <CTAEndcard variant="dark" accentColor={OPS.accent} price="₪349/חודש" tagline="AI שמקדם את הארגון שלך" />
      </Sequence>
    </AbsoluteFill>
  );
};
