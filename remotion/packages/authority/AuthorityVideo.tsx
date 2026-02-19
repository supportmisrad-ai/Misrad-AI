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

const SOCIAL = MODULE_COLORS.social;
const CLIENT = MODULE_COLORS.client;
const NEXUS = MODULE_COLORS.nexus;

// HOOK — Brand crown descends [0-36f]
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Three modules orbit and converge
  const orbitProgress = interpolate(frame, [0, 24], [0, 1], { extrapolateRight: 'clamp' });
  const modules = [
    { emoji: '📱', color: SOCIAL.accent, angle: 0 },
    { emoji: '🤝', color: CLIENT.accent, angle: (2 * Math.PI) / 3 },
    { emoji: '👥', color: NEXUS.accent, angle: (4 * Math.PI) / 3 },
  ];

  const orbitRadius = interpolate(orbitProgress, [0, 1], [250, 80]);
  const rotation = orbitProgress * Math.PI * 2;

  // Title
  const titleSpring = spring({ frame: Math.max(0, frame - 18), fps, config: SPRING.punch, durationInFrames: 14 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: `radial-gradient(circle, ${SOCIAL.accent}10 0%, transparent 60%)` }} />

      {/* Orbiting modules */}
      {modules.map((mod, i) => {
        const angle = mod.angle + rotation;
        const x = Math.cos(angle) * orbitRadius;
        const y = Math.sin(angle) * orbitRadius;
        return (
          <div key={i} style={{
            position: 'absolute',
            width: 64, height: 64, borderRadius: 18,
            background: `${mod.color}20`, border: `2px solid ${mod.color}50`,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            transform: `translate(${x}px, ${y}px)`,
            fontSize: 28, boxShadow: `0 8px 30px ${mod.color}30`,
          }}>
            {mod.emoji}
          </div>
        );
      })}

      {/* Center crown */}
      <div style={{
        fontSize: 56,
        opacity: spring({ frame: Math.max(0, frame - 12), fps, config: SPRING.punch, durationInFrames: 12 }),
        transform: `scale(${interpolate(spring({ frame: Math.max(0, frame - 12), fps, config: SPRING.punch, durationInFrames: 12 }), [0, 1], [0.5, 1])})`,
        filter: `drop-shadow(0 0 20px ${SOCIAL.accent}50)`,
      }}>
        👑
      </div>

      {/* Title */}
      <div style={{ position: 'absolute', marginTop: 220, textAlign: 'center', opacity: titleSpring }}>
        <div style={{ fontFamily: HEEBO, fontSize: 44, fontWeight: 900, color: BRAND.white }}>The Authority</div>
        <div style={{ fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: BRAND.muted, direction: 'rtl', marginTop: 8 }}>המותג שלך. AI שלנו.</div>
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
    { emoji: '📱', module: 'Social', text: 'שיווק AI — תוכן, תזמון, hashtags חכמים', color: SOCIAL.accent, delay: 0 },
    { emoji: '🤝', module: 'Client', text: 'פורטל לקוחות + Health Score', color: CLIENT.accent, delay: 10 },
    { emoji: '👥', module: 'Nexus', text: 'ניהול צוות ומשימות', color: NEXUS.accent, delay: 20 },
    { emoji: '✨', module: 'AI Content', text: 'יצירת תוכן אוטומטית לכל פלטפורמה', color: SOCIAL.accent, delay: 30 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: `radial-gradient(circle, ${SOCIAL.accent}06 0%, transparent 60%)` }} />

      <div style={{ fontFamily: HEEBO, fontSize: 28, fontWeight: 900, color: BRAND.white, marginBottom: 36, direction: 'rtl' }}>
        מה כולל The Authority?
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
    { value: '+340%', label: 'חשיפות', delay: 0 },
    { value: '92%', label: 'שימור לקוחות', delay: 10 },
    { value: '24/7', label: 'פרסום אוטומטי', delay: 20 },
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${SOCIAL.accent}06 0%, transparent 60%)` }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28, alignItems: 'center' }}>
        {stats.map((stat, i) => {
          const s = spring({ frame: Math.max(0, frame - stat.delay), fps, config: SPRING.punch, durationInFrames: 15 });
          return (
            <GlassCard key={i} variant="dark" delay={stat.delay} width={700} glowColor={SOCIAL.accent}>
              <div style={{ padding: '28px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl' }}>
                <span style={{ fontFamily: HEEBO, fontSize: 26, fontWeight: 700, color: BRAND.muted }}>{stat.label}</span>
                <span style={{ fontFamily: RUBIK, fontSize: 60, fontWeight: 800, background: SOCIAL.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', transform: `scale(${interpolate(s, [0, 1], [1.4, 1])})`, filter: `blur(${interpolate(s, [0, 1], [6, 0])}px)`, display: 'inline-block' }}>{stat.value}</span>
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
    <AbsoluteFill style={{ background: SOCIAL.gradient, justifyContent: 'center', alignItems: 'center', opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }) }}>
      <TextReveal text="המותג שלך. AI שלנו." delay={5} fontSize={52} fontWeight={900} color="#fff" mode="words" stagger={2} style={{ textAlign: 'center' }} />
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

export const AuthorityVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={36}><HookScene /></Sequence>
      <Sequence from={36} durationInFrames={174}><FeaturesScene /></Sequence>
      <Sequence from={210} durationInFrames={120}><StatsScene /></Sequence>
      <Sequence from={330} durationInFrames={60}><TaglineScene /></Sequence>
      <Sequence from={390} durationInFrames={150}>
        <CTAEndcard variant="dark" accentColor={SOCIAL.accent} price="₪349/חודש" tagline="AI שמקדם את הארגון שלך" />
      </Sequence>
    </AbsoluteFill>
  );
};
