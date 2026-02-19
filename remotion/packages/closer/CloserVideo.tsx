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

const SYSTEM = MODULE_COLORS.system;
const NEXUS = MODULE_COLORS.nexus;

// HOOK — Deal closing animation [0-36f]
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Two module icons fly toward center and merge
  const mergeProgress = spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 });
  const leftX = interpolate(mergeProgress, [0, 1], [-300, -60]);
  const rightX = interpolate(mergeProgress, [0, 1], [300, 60]);

  // Impact flash on merge
  const impactFrame = Math.max(0, frame - 16);
  const flashOpacity = interpolate(impactFrame, [0, 3, 10], [0, 0.2, 0], { extrapolateRight: 'clamp' });

  // Merge ring
  const ringScale = interpolate(impactFrame, [0, 12], [0, 2.5], { extrapolateRight: 'clamp' });
  const ringOpacity = interpolate(impactFrame, [0, 4, 12], [0, 0.5, 0], { extrapolateRight: 'clamp' });

  // Title
  const titleSpring = spring({ frame: Math.max(0, frame - 20), fps, config: SPRING.punch, durationInFrames: 12 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${SYSTEM.accent}10 0%, transparent 60%)` }} />

      {/* System module */}
      <div style={{ position: 'absolute', transform: `translateX(${leftX}px)`, opacity: mergeProgress }}>
        <div style={{ width: 80, height: 80, borderRadius: 22, background: SYSTEM.gradient, display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: `0 12px 40px ${SYSTEM.accent}40`, fontSize: 36 }}>🎯</div>
      </div>

      {/* Nexus module */}
      <div style={{ position: 'absolute', transform: `translateX(${rightX}px)`, opacity: mergeProgress }}>
        <div style={{ width: 80, height: 80, borderRadius: 22, background: NEXUS.gradient, display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: `0 12px 40px ${NEXUS.accent}40`, fontSize: 36 }}>👥</div>
      </div>

      {/* + sign between */}
      <div style={{ fontFamily: RUBIK, fontSize: 48, fontWeight: 800, color: BRAND.white, opacity: mergeProgress * 0.6 }}>+</div>

      {/* Impact ring */}
      {frame > 14 && <div style={{ position: 'absolute', width: 80 * ringScale, height: 80 * ringScale, borderRadius: '50%', border: `2px solid ${SYSTEM.accent}`, opacity: ringOpacity }} />}

      {/* Flash */}
      <AbsoluteFill style={{ backgroundColor: SYSTEM.accent, opacity: flashOpacity, pointerEvents: 'none' }} />

      {/* Title */}
      <div style={{ position: 'absolute', marginTop: 240, opacity: titleSpring, transform: `scale(${interpolate(titleSpring, [0, 1], [1.3, 1])})` }}>
        <span style={{ fontFamily: HEEBO, fontSize: 44, fontWeight: 900, color: BRAND.white }}>The Closer</span>
      </div>
      <div style={{ position: 'absolute', marginTop: 320, fontFamily: HEEBO, fontSize: 24, fontWeight: 700, color: BRAND.muted, direction: 'rtl', opacity: titleSpring }}>
        סוגר עסקאות. לא מפספס לידים.
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// FEATURES — What's included [36-210f]
const FeaturesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const features = [
    { emoji: '🎯', module: 'System', text: 'ניהול לידים + חיזוי סגירות AI', color: SYSTEM.accent, delay: 0 },
    { emoji: '👥', module: 'Nexus', text: 'ניהול צוות + משימות חכמות', color: NEXUS.accent, delay: 10 },
    { emoji: '🧠', text2: 'AI מובנה', text: 'דירוג לידים, תזמון פולואפ, תחזיות', color: BRAND.primary, delay: 20 },
    { emoji: '📊', text2: 'דוחות', text: 'דשבורד מכירות בזמן אמת', color: BRAND.indigo, delay: 30 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: `radial-gradient(circle, ${SYSTEM.accent}06 0%, transparent 60%)` }} />

      <div style={{ fontFamily: HEEBO, fontSize: 28, fontWeight: 900, color: BRAND.white, marginBottom: 36, direction: 'rtl' }}>
        מה כולל The Closer?
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        {features.map((f, i) => (
          <GlassCard key={i} variant="dark" delay={f.delay} width={740} glowColor={f.color}>
            <div style={{ padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 16, direction: 'rtl' }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: `${f.color}15`, border: `1px solid ${f.color}30`, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 26, flexShrink: 0 }}>
                {f.emoji}
              </div>
              <div>
                <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 700, color: f.color }}>{f.module || f.text2}</div>
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
    { value: '+87%', label: 'המרות', delay: 0 },
    { value: '75%', label: 'דיוק חיזוי AI', delay: 10 },
    { value: '×5', label: 'פרודוקטיביות צוות', delay: 20 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${SYSTEM.accent}06 0%, transparent 60%)` }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28, alignItems: 'center' }}>
        {stats.map((stat, i) => {
          const s = spring({ frame: Math.max(0, frame - stat.delay), fps, config: SPRING.punch, durationInFrames: 15 });
          return (
            <GlassCard key={i} variant="dark" delay={stat.delay} width={700} glowColor={SYSTEM.accent}>
              <div style={{ padding: '28px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl' }}>
                <span style={{ fontFamily: HEEBO, fontSize: 26, fontWeight: 700, color: BRAND.muted }}>{stat.label}</span>
                <span style={{ fontFamily: RUBIK, fontSize: 60, fontWeight: 800, background: SYSTEM.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', transform: `scale(${interpolate(s, [0, 1], [1.4, 1])})`, filter: `blur(${interpolate(s, [0, 1], [6, 0])}px)`, display: 'inline-block' }}>{stat.value}</span>
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
    <AbsoluteFill style={{ background: SYSTEM.gradient, justifyContent: 'center', alignItems: 'center', opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }) }}>
      <TextReveal text="סוגר עסקאות. לא מפספס לידים." delay={5} fontSize={48} fontWeight={900} color="#fff" mode="words" stagger={2} style={{ textAlign: 'center' }} />
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// MAIN — 18s
export const CloserVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={36}><HookScene /></Sequence>
      <Sequence from={36} durationInFrames={174}><FeaturesScene /></Sequence>
      <Sequence from={210} durationInFrames={120}><StatsScene /></Sequence>
      <Sequence from={330} durationInFrames={60}><TaglineScene /></Sequence>
      <Sequence from={390} durationInFrames={150}>
        <CTAEndcard variant="dark" accentColor={SYSTEM.accent} price="₪249/חודש" tagline="AI שמקדם את הארגון שלך" />
      </Sequence>
    </AbsoluteFill>
  );
};
