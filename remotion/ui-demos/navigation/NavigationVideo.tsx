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
import { DeviceFrame } from '../../shared/components/DeviceFrame';
import { TextReveal } from '../../shared/components/TextReveal';
import { CTAEndcard } from '../../shared/components/CTAEndcard';
import { pulse, FloatingOrbs, ParticleField, BreathingRing } from '../../shared/components/MicroAnimations';

const MODULES_NAV = [
  { key: 'system', label: 'System', emoji: '🎯', color: MODULE_COLORS.system.accent, gradient: MODULE_COLORS.system.gradient },
  { key: 'nexus', label: 'Nexus', emoji: '👥', color: MODULE_COLORS.nexus.accent, gradient: MODULE_COLORS.nexus.gradient },
  { key: 'social', label: 'Social', emoji: '📱', color: MODULE_COLORS.social.accent, gradient: MODULE_COLORS.social.gradient },
  { key: 'finance', label: 'Finance', emoji: '💰', color: MODULE_COLORS.finance.accent, gradient: MODULE_COLORS.finance.gradient },
  { key: 'client', label: 'Client', emoji: '🤝', color: MODULE_COLORS.client.accent, gradient: MODULE_COLORS.client.gradient },
  { key: 'operations', label: 'Operations', emoji: '⚡', color: MODULE_COLORS.operations.accent, gradient: MODULE_COLORS.operations.gradient },
];

// ═══════════════════════════════════════════════════════════
// SCENE 1: HOOK — Quick swipe [0-90f = 0-3s]
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cycleSpeed = 10;
  const activeIdx = Math.min(Math.floor(frame / cycleSpeed), MODULES_NAV.length - 1);
  const activeMod = MODULES_NAV[activeIdx];

  const withinCycle = frame % cycleSpeed;
  const swipeX = interpolate(withinCycle, [0, cycleSpeed], [40, 0], { extrapolateRight: 'clamp' });
  const swipeOpacity = interpolate(withinCycle, [0, 2, cycleSpeed], [0.3, 1, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={4} color={activeMod.color} speed={0.012} maxSize={100} />

      <div style={{
        position: 'absolute', width: 600, height: 600, borderRadius: '50%',
        background: `radial-gradient(circle, ${activeMod.color}15 0%, transparent 60%)`,
        opacity: pulse(frame, 0.05, 0.5, 0.9),
      }} />

      <div style={{
        width: 400, padding: '48px 32px', borderRadius: 32,
        background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(40px)',
        border: `2px solid ${activeMod.color}40`,
        boxShadow: `0 24px 60px ${activeMod.color}20, 0 0 ${pulse(frame, 0.06, 8, 16)}px ${activeMod.color}10`,
        textAlign: 'center',
        transform: `translateX(${swipeX}px)`, opacity: swipeOpacity,
      }}>
        <div style={{ fontSize: 72, marginBottom: 16, transform: `translateY(${pulse(frame, 0.04, -2, 2)}px)` }}>{activeMod.emoji}</div>
        <div style={{ fontFamily: HEEBO, fontSize: 32, fontWeight: 900, color: activeMod.color }}>{activeMod.label}</div>
      </div>

      <div style={{ position: 'absolute', bottom: '28%', display: 'flex', gap: 10 }}>
        {MODULES_NAV.map((_, i) => (
          <div key={i} style={{
            width: i === activeIdx ? 24 : 8, height: 8, borderRadius: 4,
            background: i === activeIdx ? activeMod.color : 'rgba(255,255,255,0.2)',
          }} />
        ))}
      </div>

      <div style={{
        position: 'absolute', bottom: '18%',
        fontFamily: HEEBO, fontSize: 24, fontWeight: 700, color: BRAND.muted, direction: 'rtl',
        opacity: spring({ frame: Math.max(0, frame - 25), fps, config: SPRING.ui, durationInFrames: 16 }),
      }}>
        החלק בין מודולים ←
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 2: DASHBOARD [90-330f = 3-11s]
// ═══════════════════════════════════════════════════════════
const DashboardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const moduleSwitchSpeed = 30;
  const activeIdx = Math.floor(frame / moduleSwitchSpeed) % MODULES_NAV.length;
  const activeMod = MODULES_NAV[activeIdx];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgLight, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={2} color={BRAND.primary} speed={0.008} maxSize={70} />

      <DeviceFrame scale={1.1} delay={0} shadowIntensity={0.5}>
        <div style={{ width: '100%', height: '100%', background: '#FAFBFC', padding: '60px 16px 20px', direction: 'rtl' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, padding: '0 4px' }}>
            <div>
              <div style={{ fontFamily: HEEBO, fontSize: 17, fontWeight: 900, color: '#1E293B' }}>שלום, יצחק 👋</div>
              <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 600, color: '#64748B' }}>דהן ושות׳</div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: BRAND.gradient, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 16 }}>👤</div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {MODULES_NAV.map((mod, i) => {
              const isActive = i === activeIdx;
              const cardSpring = spring({ frame: Math.max(0, frame - i * 4), fps, config: SPRING.ui, durationInFrames: 16 });
              const highlightPulse = isActive ? 1 + Math.sin(frame * 0.15) * 0.03 : 1;

              return (
                <div key={i} style={{
                  width: 'calc(50% - 4px)', padding: '14px 10px', borderRadius: 16,
                  background: isActive ? `${mod.color}12` : '#fff',
                  border: isActive ? `2px solid ${mod.color}50` : '1px solid rgba(0,0,0,0.04)',
                  boxShadow: isActive ? `0 6px 20px ${mod.color}12` : '0 2px 8px rgba(0,0,0,0.03)',
                  display: 'flex', alignItems: 'center', gap: 8,
                  opacity: cardSpring,
                  transform: `translateY(${interpolate(cardSpring, [0, 1], [12, 0])}px) scale(${highlightPulse})`,
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: isActive ? mod.gradient : `${mod.color}10`,
                    display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 16, flexShrink: 0,
                  }}>{mod.emoji}</div>
                  <span style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: isActive ? mod.color : '#1E293B' }}>{mod.label}</span>
                </div>
              );
            })}
          </div>

          <div style={{ padding: 14, borderRadius: 16, background: activeMod.gradient, boxShadow: `0 6px 20px ${activeMod.color}18` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 14 }}>🧠</span>
              <span style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>AI תובנות — {activeMod.label}</span>
            </div>
            <span style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.5 }}>
              3 פעולות ממתינות. AI ממליץ לטפל קודם בדחופות.
            </span>
          </div>

          <div style={{
            position: 'absolute', bottom: 18, left: 14, right: 14,
            display: 'flex', justifyContent: 'space-around', alignItems: 'center',
            padding: '8px 0', borderRadius: 18,
            background: '#fff', boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
          }}>
            {['🏠', '📊', '➕', '🔔', '⚙️'].map((icon, i) => (
              <div key={i} style={{ fontSize: 18, opacity: i === 0 ? 1 : 0.4, transform: i === 0 ? 'scale(1.15)' : 'scale(1)' }}>{icon}</div>
            ))}
          </div>
        </div>
      </DeviceFrame>
      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 3: DARK MODE [330-560f = 11-18.7s]
// ═══════════════════════════════════════════════════════════
const DarkModeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const transitionProgress = interpolate(frame, [20, 60], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const isDark = transitionProgress > 0.5;

  return (
    <AbsoluteFill style={{ backgroundColor: isDark ? BRAND.bgDark : BRAND.bgLight, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={2} color={isDark ? BRAND.primary : '#64748B'} speed={0.008} maxSize={70} />

      <DeviceFrame scale={1.1} delay={0} shadowIntensity={isDark ? 1 : 0.5}>
        <div style={{
          width: '100%', height: '100%',
          background: isDark ? '#0F0F12' : '#FAFBFC',
          padding: '60px 16px 20px', direction: 'rtl',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, padding: '0 4px' }}>
            <span style={{ fontFamily: HEEBO, fontSize: 17, fontWeight: 900, color: isDark ? BRAND.white : '#1E293B' }}>
              {isDark ? '🌙 מצב כהה' : '☀️ מצב בהיר'}
            </span>
            <div style={{ width: 50, height: 26, borderRadius: 13, background: isDark ? BRAND.primary : '#E2E8F0', position: 'relative', padding: 3 }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                transform: `translateX(${isDark ? -24 : 0}px)`,
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              }} />
            </div>
          </div>

          {MODULES_NAV.slice(0, 4).map((mod, i) => {
            const s = spring({ frame: Math.max(0, frame - 65 - i * 6), fps, config: SPRING.ui, durationInFrames: 16 });
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px', marginBottom: 8, borderRadius: 14,
                background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
                border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.04)',
                boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.03)',
                opacity: s, transform: `translateX(${interpolate(s, [0, 1], [20, 0])}px)`,
              }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: mod.gradient, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 16 }}>{mod.emoji}</div>
                <span style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: isDark ? BRAND.white : '#1E293B' }}>{mod.label}</span>
              </div>
            );
          })}
        </div>
      </DeviceFrame>
      <NoiseLayer opacity={isDark ? 0.02 : 0.015} />
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

      <TextReveal text="ממשק אחד. כל העסק." delay={5} fontSize={48} fontWeight={900} color="#fff" mode="words" stagger={2} style={{ textAlign: 'center' }} />

      <div style={{
        marginTop: 24, padding: '8px 20px', borderRadius: 12,
        background: 'rgba(255,255,255,0.1)',
        fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.65)', direction: 'rtl',
        opacity: subSpring,
      }}>
        מובייל + דסקטופ. בהיר + כהה.
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN — 30 seconds (900 frames)
// ═══════════════════════════════════════════════════════════
export const NavigationVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={90}><HookScene /></Sequence>
      <Sequence from={90} durationInFrames={240}><DashboardScene /></Sequence>
      <Sequence from={330} durationInFrames={230}><DarkModeScene /></Sequence>
      <Sequence from={560} durationInFrames={310}><TaglineScene /></Sequence>
      <Sequence from={870} durationInFrames={30}>
        <CTAEndcard variant="dark" accentColor={BRAND.primary} tagline="ממשק אחד. כל העסק." />
      </Sequence>
    </AbsoluteFill>
  );
};
