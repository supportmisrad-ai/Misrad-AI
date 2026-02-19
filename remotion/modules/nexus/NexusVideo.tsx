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
import { PhoneFrame } from '../../shared/components/PhoneFrame';
import { TextReveal } from '../../shared/components/TextReveal';
import { CTAEndcard } from '../../shared/components/CTAEndcard';

const NEXUS = MODULE_COLORS.nexus;

// ═══════════════════════════════════════════════════════════
// HOOK — Dashboard pulse → task cards fly in
// [0-36f = 0-1.2s]
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Central pulse ring
  const pulseScale = interpolate(frame, [0, 12, 24], [0, 2, 4], { extrapolateRight: 'clamp' });
  const pulseOpacity = interpolate(frame, [0, 8, 24], [0, 0.7, 0], { extrapolateRight: 'clamp' });

  // Second ring
  const pulse2Scale = interpolate(frame, [4, 16, 28], [0, 2, 4], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pulse2Opacity = interpolate(frame, [4, 12, 28], [0, 0.5, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Grid lines reveal
  const gridOpacity = interpolate(frame, [10, 20], [0, 0.15], { extrapolateRight: 'clamp' });

  // Title
  const titleSpring = spring({ frame: Math.max(0, frame - 16), fps, config: SPRING.punch, durationInFrames: 12 });

  // Flying task cards
  const cards = [
    { text: 'דוח שבועי', x: -300, y: -200, delay: 8 },
    { text: 'פגישת צוות', x: 250, y: -150, delay: 12 },
    { text: 'עדכון לקוח', x: -200, y: 200, delay: 16 },
    { text: 'אישור תקציב', x: 280, y: 180, delay: 20 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgLight, justifyContent: 'center', alignItems: 'center' }}>
      {/* Grid background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(rgba(55,48,163,${gridOpacity}) 1px, transparent 1px), linear-gradient(90deg, rgba(55,48,163,${gridOpacity}) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Pulse rings */}
      <div style={{ position: 'absolute', width: 100 * pulseScale, height: 100 * pulseScale, borderRadius: '50%', border: `2px solid ${NEXUS.accent}`, opacity: pulseOpacity }} />
      <div style={{ position: 'absolute', width: 100 * pulse2Scale, height: 100 * pulse2Scale, borderRadius: '50%', border: `2px solid ${NEXUS.accent}`, opacity: pulse2Opacity }} />

      {/* Central dot */}
      <div style={{ position: 'absolute', width: 16, height: 16, borderRadius: '50%', background: NEXUS.accent, boxShadow: `0 0 30px ${NEXUS.accent}60` }} />

      {/* Flying task cards */}
      {cards.map((card, i) => {
        const s = spring({ frame: Math.max(0, frame - card.delay), fps, config: SPRING.hero, durationInFrames: 16 });
        const cx = interpolate(s, [0, 1], [0, card.x]);
        const cy = interpolate(s, [0, 1], [0, card.y]);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              padding: '10px 20px',
              borderRadius: 14,
              background: '#fff',
              boxShadow: '0 8px 30px rgba(55,48,163,0.1)',
              border: `1px solid ${NEXUS.accent}20`,
              fontFamily: HEEBO,
              fontSize: 16,
              fontWeight: 700,
              color: '#1E293B',
              direction: 'rtl',
              transform: `translate(${cx}px, ${cy}px)`,
              opacity: s,
            }}
          >
            {card.text}
          </div>
        );
      })}

      {/* Title number */}
      <div
        style={{
          position: 'absolute',
          marginTop: 340,
          fontFamily: RUBIK,
          fontSize: 80,
          fontWeight: 800,
          color: NEXUS.accent,
          transform: `scale(${interpolate(titleSpring, [0, 1], [1.5, 1])})`,
          opacity: titleSpring,
        }}
      >
        ×5
      </div>
      <div
        style={{
          position: 'absolute',
          marginTop: 440,
          fontFamily: HEEBO,
          fontSize: 28,
          fontWeight: 700,
          color: '#64748B',
          direction: 'rtl',
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [15, 0])}px)`,
        }}
      >
        יותר פרודוקטיביות
      </div>

      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SETUP — Team chaos, unassigned tasks
// [36-105f = 1.2s-3.5s]
// ═══════════════════════════════════════════════════════════
const TEAM_MEMBERS = [
  { name: 'יעל', avatar: '👩‍💼', tasks: 12 },
  { name: 'אורי', avatar: '👨‍💻', tasks: 3 },
  { name: 'נועה', avatar: '👩‍🎨', tasks: 18 },
  { name: 'רועי', avatar: '🧑‍💼', tasks: 0 },
];

const SetupScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgLight, justifyContent: 'center', alignItems: 'center' }}>
      <PhoneFrame scale={1.1} delay={0} shadowIntensity={0.5}>
        <div style={{ width: '100%', height: '100%', background: '#FAFBFC', padding: '60px 20px 20px', direction: 'rtl' }}>
          <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 900, color: '#1E293B', marginBottom: 20 }}>
            עומס צוות
          </div>

          {TEAM_MEMBERS.map((member, i) => {
            const s = spring({ frame: Math.max(0, frame - i * 5), fps, config: SPRING.ui, durationInFrames: 14 });
            const barWidth = (member.tasks / 20) * 100;
            const barColor = member.tasks > 15 ? '#EF4444' : member.tasks > 8 ? '#F59E0B' : member.tasks > 0 ? '#22C55E' : '#E2E8F0';

            // Overloaded members shake
            const shake = member.tasks > 15 ? Math.sin(frame * 0.4 + i) * 2 : 0;

            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  marginBottom: 10,
                  borderRadius: 16,
                  background: '#fff',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                  border: member.tasks > 15 ? '1px solid #FCA5A5' : '1px solid rgba(0,0,0,0.04)',
                  opacity: s,
                  transform: `translateX(${interpolate(s, [0, 1], [40, 0]) + shake}px)`,
                }}
              >
                <span style={{ fontSize: 28 }}>{member.avatar}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontFamily: HEEBO, fontSize: 15, fontWeight: 700, color: '#1E293B' }}>{member.name}</span>
                    <span style={{ fontFamily: RUBIK, fontSize: 13, fontWeight: 700, color: barColor }}>{member.tasks} משימות</span>
                  </div>
                  <div style={{ width: '100%', height: 6, borderRadius: 3, background: '#F1F5F9' }}>
                    <div style={{ width: `${barWidth * s}%`, height: '100%', borderRadius: 3, background: barColor, transition: 'width 0.3s' }} />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Unassigned tasks warning */}
          <div
            style={{
              marginTop: 16,
              padding: '14px 18px',
              borderRadius: 14,
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              opacity: spring({ frame: Math.max(0, frame - 30), fps, config: SPRING.ui, durationInFrames: 14 }),
            }}
          >
            <span style={{ fontSize: 20 }}>⚠️</span>
            <span style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: '#DC2626' }}>
              7 משימות לא מוקצות
            </span>
          </div>
        </div>
      </PhoneFrame>

      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// AI ENTRANCE — Smart assignment
// [105-180f = 3.5s-6.0s]
// ═══════════════════════════════════════════════════════════
const AIEntranceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sweepProgress = interpolate(frame, [0, 40], [0, 1], { extrapolateRight: 'clamp' });

  // Connecting lines animation
  const lineProgress = spring({ frame: Math.max(0, frame - 15), fps, config: SPRING.smooth, durationInFrames: 30 });

  const badgeSpring = spring({ frame: Math.max(0, frame - 25), fps, config: SPRING.punch, durationInFrames: 15 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgLight, justifyContent: 'center', alignItems: 'center' }}>
      {/* Indigo sweep */}
      <div
        style={{
          position: 'absolute',
          width: 1000,
          height: 1000,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${NEXUS.accent}15 0%, transparent 60%)`,
          transform: `scale(${0.3 + sweepProgress * 1.5})`,
        }}
      />

      {/* AI Hub - center */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: NEXUS.gradient,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: `0 16px 50px ${NEXUS.accent}40`,
          transform: `scale(${interpolate(badgeSpring, [0, 1], [0.3, 1])})`,
          opacity: badgeSpring,
          zIndex: 10,
        }}
      >
        <span style={{ fontSize: 36 }}>🤖</span>
      </div>

      {/* Connecting lines to team nodes */}
      {[
        { x: -180, y: -160, emoji: '👩‍💼', label: 'יעל → 8' },
        { x: 180, y: -140, emoji: '👨‍💻', label: 'אורי → 8' },
        { x: -160, y: 160, emoji: '👩‍🎨', label: 'נועה → 8' },
        { x: 200, y: 150, emoji: '🧑‍💼', label: 'רועי → 8' },
      ].map((node, i) => {
        const nodeSpring = spring({ frame: Math.max(0, frame - 20 - i * 4), fps, config: SPRING.ui, durationInFrames: 16 });
        return (
          <React.Fragment key={i}>
            {/* Line */}
            <svg
              style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}
              viewBox="-540 -960 1080 1920"
            >
              <line
                x1={0}
                y1={0}
                x2={node.x * lineProgress}
                y2={node.y * lineProgress}
                stroke={NEXUS.accent}
                strokeWidth={2}
                strokeDasharray="6 4"
                opacity={lineProgress * 0.5}
              />
            </svg>
            {/* Node */}
            <div
              style={{
                position: 'absolute',
                transform: `translate(${node.x}px, ${node.y}px) scale(${interpolate(nodeSpring, [0, 1], [0.5, 1])})`,
                opacity: nodeSpring,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fff', boxShadow: '0 8px 24px rgba(55,48,163,0.12)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 24 }}>
                {node.emoji}
              </div>
              <span style={{ fontFamily: RUBIK, fontSize: 13, fontWeight: 700, color: '#22C55E', background: '#F0FDF4', padding: '3px 10px', borderRadius: 8 }}>
                {node.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}

      {/* Text */}
      <div style={{ position: 'absolute', bottom: 320 }}>
        <TextReveal text="AI שמחלק חכם." delay={30} fontSize={48} fontWeight={900} color="#1E293B" mode="words" stagger={3} />
      </div>

      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SHOWCASE — Dashboard with balanced team
// [180-300f = 6.0s-10.0s]
// ═══════════════════════════════════════════════════════════
const ShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const craneY = interpolate(frame, [0, 120], [50, -30], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgLight, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${NEXUS.accent}08 0%, transparent 60%)`, top: '25%' }} />

      <div style={{ transform: `translateY(${craneY}px)` }}>
        <PhoneFrame scale={1.1} delay={0} shadowIntensity={0.5}>
          <div style={{ width: '100%', height: '100%', background: '#FAFBFC', padding: '60px 20px 20px', direction: 'rtl' }}>
            <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 900, color: '#1E293B', marginBottom: 4 }}>
              Dashboard צוות
            </div>
            <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: '#22C55E', marginBottom: 18 }}>
              ✅ כל המשימות מחולקות באופן שווה
            </div>

            {/* Balanced team cards */}
            {[
              { name: 'יעל', emoji: '👩‍💼', tasks: 8, done: 5 },
              { name: 'אורי', emoji: '👨‍💻', tasks: 8, done: 6 },
              { name: 'נועה', emoji: '👩‍🎨', tasks: 8, done: 3 },
              { name: 'רועי', emoji: '🧑‍💼', tasks: 8, done: 7 },
            ].map((m, i) => {
              const s = spring({ frame: Math.max(0, frame - 10 - i * 5), fps, config: SPRING.ui, durationInFrames: 14 });
              const fillPct = (m.done / m.tasks) * 100;
              const fillAnim = spring({ frame: Math.max(0, frame - 20 - i * 5), fps, config: { damping: 20, stiffness: 60, mass: 1 }, durationInFrames: 30 });

              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 8, borderRadius: 14, background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.04)', opacity: s, transform: `translateX(${interpolate(s, [0, 1], [30, 0])}px)` }}>
                  <span style={{ fontSize: 24 }}>{m.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: '#1E293B' }}>{m.name}</span>
                      <span style={{ fontFamily: RUBIK, fontSize: 12, fontWeight: 700, color: NEXUS.accent }}>{m.done}/{m.tasks}</span>
                    </div>
                    <div style={{ width: '100%', height: 5, borderRadius: 3, background: '#F1F5F9' }}>
                      <div style={{ width: `${fillPct * fillAnim}%`, height: '100%', borderRadius: 3, background: NEXUS.gradient }} />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* AI insight card */}
            <div
              style={{
                marginTop: 14,
                padding: 16,
                borderRadius: 16,
                background: NEXUS.gradient,
                boxShadow: `0 10px 30px ${NEXUS.accent}25`,
                opacity: spring({ frame: Math.max(0, frame - 50), fps, config: SPRING.hero, durationInFrames: 18 }),
                transform: `translateY(${interpolate(spring({ frame: Math.max(0, frame - 50), fps, config: SPRING.hero, durationInFrames: 18 }), [0, 1], [40, 0])}px)`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>🧠</span>
                <span style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>תובנת AI</span>
              </div>
              <span style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.5 }}>
                רועי סיים 87% מהמשימות. מומלץ להעביר אליו 2 משימות מנועה.
              </span>
            </div>
          </div>
        </PhoneFrame>
      </div>

      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// RESULTS — Stats
// [300-390f = 10.0s-13.0s]
// ═══════════════════════════════════════════════════════════
const ResultsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stats = [
    { value: '×5', label: 'פרודוקטיביות', delay: 0 },
    { value: '-60%', label: 'עומס מנהלי', delay: 8 },
    { value: '100%', label: 'שקיפות צוות', delay: 16 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgLight, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: `radial-gradient(circle, ${NEXUS.accent}06 0%, transparent 60%)` }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32, alignItems: 'center' }}>
        {stats.map((stat, i) => {
          const s = spring({ frame: Math.max(0, frame - stat.delay), fps, config: SPRING.punch, durationInFrames: 15 });
          const scale = interpolate(s, [0, 1], [1.5, 1]);
          const blur = interpolate(s, [0, 1], [8, 0]);
          return (
            <GlassCard key={i} variant="light" delay={stat.delay} width={700}>
              <div style={{ padding: '28px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl' }}>
                <span style={{ fontFamily: HEEBO, fontSize: 28, fontWeight: 700, color: '#475569' }}>{stat.label}</span>
                <span style={{ fontFamily: RUBIK, fontSize: 64, fontWeight: 800, background: NEXUS.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', transform: `scale(${scale})`, filter: `blur(${blur}px)`, display: 'inline-block' }}>
                  {stat.value}
                </span>
              </div>
            </GlassCard>
          );
        })}
      </div>
      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// TAGLINE
// [390-450f = 13.0s-15.0s]
// ═══════════════════════════════════════════════════════════
const TaglineScene: React.FC = () => {
  const frame = useCurrentFrame();
  const bgOp = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: NEXUS.gradient, justifyContent: 'center', alignItems: 'center', opacity: bgOp }}>
      <TextReveal text="AI שמנהל את הצוות שלך" delay={5} fontSize={52} fontWeight={900} color="#fff" mode="words" stagger={2} style={{ textAlign: 'center' }} />
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════
export const NexusVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={36}><HookScene /></Sequence>
      <Sequence from={36} durationInFrames={69}><SetupScene /></Sequence>
      <Sequence from={105} durationInFrames={75}><AIEntranceScene /></Sequence>
      <Sequence from={180} durationInFrames={120}><ShowcaseScene /></Sequence>
      <Sequence from={300} durationInFrames={90}><ResultsScene /></Sequence>
      <Sequence from={390} durationInFrames={60}><TaglineScene /></Sequence>
      <Sequence from={450} durationInFrames={90}>
        <CTAEndcard variant="light" accentColor={NEXUS.accent} tagline="AI שמקדם את הארגון שלך" />
      </Sequence>
    </AbsoluteFill>
  );
};
