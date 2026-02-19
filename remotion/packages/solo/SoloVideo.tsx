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

const MODULES = [
  { key: 'system', label: 'מכירות', emoji: '🎯', color: MODULE_COLORS.system.accent },
  { key: 'nexus', label: 'ניהול צוות', emoji: '👥', color: MODULE_COLORS.nexus.accent },
  { key: 'social', label: 'שיווק', emoji: '📱', color: MODULE_COLORS.social.accent },
  { key: 'finance', label: 'כספים', emoji: '💰', color: MODULE_COLORS.finance.accent },
  { key: 'client', label: 'לקוחות', emoji: '🤝', color: MODULE_COLORS.client.accent },
  { key: 'operations', label: 'תפעול', emoji: '⚡', color: MODULE_COLORS.operations.accent },
];

// ═══════════════════════════════════════════════════════════
// HOOK — Single module card drops from above
// [0-36f]
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Card drops with impact
  const dropSpring = spring({ frame, fps, config: { damping: 10, stiffness: 200, mass: 0.8 }, durationInFrames: 18 });
  const cardY = interpolate(dropSpring, [0, 1], [-400, 0]);
  const impactScale = frame > 12 ? interpolate(frame, [12, 16, 20], [1, 1.05, 1], { extrapolateRight: 'clamp' }) : 1;

  // Impact shockwave
  const impactFrame = Math.max(0, frame - 14);
  const shockScale = interpolate(impactFrame, [0, 15], [0, 3], { extrapolateRight: 'clamp' });
  const shockOpacity = interpolate(impactFrame, [0, 5, 15], [0, 0.4, 0], { extrapolateRight: 'clamp' });

  // Text
  const textSpring = spring({ frame: Math.max(0, frame - 20), fps, config: SPRING.punch, durationInFrames: 12 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center' }}>
      {/* Ambient */}
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${BRAND.primary}10 0%, transparent 60%)` }} />

      {/* Impact ring */}
      {frame > 12 && (
        <div style={{ position: 'absolute', width: 100 * shockScale, height: 100 * shockScale, borderRadius: '50%', border: `2px solid ${BRAND.primary}`, opacity: shockOpacity }} />
      )}

      {/* The single card */}
      <div
        style={{
          transform: `translateY(${cardY}px) scale(${impactScale})`,
          width: 320,
          padding: '40px 30px',
          borderRadius: 28,
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(40px)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: `0 30px 60px rgba(0,0,0,0.3), 0 0 40px ${BRAND.primary}20`,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎯</div>
        <div style={{ fontFamily: HEEBO, fontSize: 28, fontWeight: 900, color: BRAND.white, marginBottom: 8 }}>מודול אחד</div>
        <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 600, color: BRAND.muted }}>כל מה שצריך</div>
      </div>

      {/* Price */}
      <div style={{ position: 'absolute', marginTop: 340, opacity: textSpring, transform: `scale(${interpolate(textSpring, [0, 1], [1.3, 1])})` }}>
        <span style={{ fontFamily: RUBIK, fontSize: 56, fontWeight: 800, background: BRAND.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          ₪149/חודש
        </span>
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SHOWCASE — Module selector carousel
// [36-180f]
// ═══════════════════════════════════════════════════════════
const ShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Rotating highlight through modules
  const cycleSpeed = 20; // frames per module
  const activeIndex = Math.floor(frame / cycleSpeed) % MODULES.length;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center' }}>
      {/* Glow for active module */}
      <div style={{
        position: 'absolute', width: 500, height: 500, borderRadius: '50%',
        background: `radial-gradient(circle, ${MODULES[activeIndex].color}15 0%, transparent 60%)`,
        transition: 'background 0.3s',
      }} />

      <div style={{ fontFamily: HEEBO, fontSize: 32, fontWeight: 900, color: BRAND.white, marginBottom: 40, direction: 'rtl' }}>
        בחר את המודול שלך
      </div>

      {/* Module grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', maxWidth: 700 }}>
        {MODULES.map((mod, i) => {
          const isActive = i === activeIndex;
          const s = spring({ frame: Math.max(0, frame - i * 3), fps, config: SPRING.ui, durationInFrames: 14 });

          return (
            <div
              key={i}
              style={{
                width: 200,
                padding: '24px 16px',
                borderRadius: 22,
                background: isActive ? `${mod.color}15` : 'rgba(255,255,255,0.04)',
                border: isActive ? `2px solid ${mod.color}60` : '1px solid rgba(255,255,255,0.06)',
                textAlign: 'center',
                opacity: s,
                transform: `scale(${isActive ? 1.05 : 1}) translateY(${interpolate(s, [0, 1], [20, 0])}px)`,
                boxShadow: isActive ? `0 12px 40px ${mod.color}25` : 'none',
                transition: 'transform 0.2s, border 0.2s, background 0.2s',
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 8 }}>{mod.emoji}</div>
              <div style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 700, color: isActive ? mod.color : BRAND.white }}>
                {mod.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom text */}
      <div style={{ marginTop: 40, fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: BRAND.muted, direction: 'rtl' }}>
        מודול אחד. מערכת AI מלאה.
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// VALUE PROPS
// [180-330f]
// ═══════════════════════════════════════════════════════════
const ValueScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const props = [
    { emoji: '🧠', text: 'AI מובנה בכל פיצ\'ר', delay: 0 },
    { emoji: '📱', text: 'מובייל + דסקטופ', delay: 10 },
    { emoji: '🔄', text: 'אפשר לשדרג בכל רגע', delay: 20 },
    { emoji: '🚀', text: 'הקמה תוך 5 דקות', delay: 30 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${BRAND.primary}06 0%, transparent 60%)` }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
        {props.map((prop, i) => (
          <GlassCard key={i} variant="dark" delay={prop.delay} width={700} glowColor={BRAND.primary}>
            <div style={{ padding: '22px 32px', display: 'flex', alignItems: 'center', gap: 18, direction: 'rtl' }}>
              <span style={{ fontSize: 32 }}>{prop.emoji}</span>
              <span style={{ fontFamily: HEEBO, fontSize: 24, fontWeight: 700, color: BRAND.white }}>{prop.text}</span>
            </div>
          </GlassCard>
        ))}
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// TAGLINE [330-390f]
const TaglineScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: BRAND.gradient, justifyContent: 'center', alignItems: 'center', opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }) }}>
      <TextReveal text="מודול אחד. כל מה שצריך." delay={5} fontSize={52} fontWeight={900} color="#fff" mode="words" stagger={2} style={{ textAlign: 'center' }} />
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// MAIN — 18 seconds
export const SoloVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={36}><HookScene /></Sequence>
      <Sequence from={36} durationInFrames={144}><ShowcaseScene /></Sequence>
      <Sequence from={180} durationInFrames={150}><ValueScene /></Sequence>
      <Sequence from={330} durationInFrames={60}><TaglineScene /></Sequence>
      <Sequence from={390} durationInFrames={150}>
        <CTAEndcard variant="dark" accentColor={BRAND.primary} price="₪149/חודש" tagline="AI שמקדם את הארגון שלך" />
      </Sequence>
    </AbsoluteFill>
  );
};
