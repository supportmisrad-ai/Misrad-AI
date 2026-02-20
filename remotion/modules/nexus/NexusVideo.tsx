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
import { DeviceFrame } from '../../shared/components/DeviceFrame';
import { TextReveal } from '../../shared/components/TextReveal';
import { CTAEndcard } from '../../shared/components/CTAEndcard';
import { pulse, FloatingOrbs, GridBackground, ParticleField, BreathingRing } from '../../shared/components/MicroAnimations';

const NX = MODULE_COLORS.nexus;

// ═══════════════════════════════════════════════════════════
// SCENE 1: HOOK — Task cards explode from center [0-75f = 0-2.5s]
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pulseScale = interpolate(frame, [0, 12, 24], [0, 2.5, 5], { extrapolateRight: 'clamp' });
  const pulseOp = interpolate(frame, [0, 8, 24], [0, 0.7, 0], { extrapolateRight: 'clamp' });

  const gridOp = interpolate(frame, [10, 25], [0, 1], { extrapolateRight: 'clamp' });

  const titleSpring = spring({ frame: Math.max(0, frame - 16), fps, config: SPRING.punch, durationInFrames: 12 });

  const cards = [
    { text: 'דוח שבועי', x: -280, y: -180, delay: 8, color: '#6366F1' },
    { text: 'פגישת צוות', x: 240, y: -140, delay: 12, color: '#7C3AED' },
    { text: 'עדכון לקוח', x: -200, y: 180, delay: 16, color: '#EC4899' },
    { text: 'אישור תקציב', x: 260, y: 160, delay: 20, color: '#3B82F6' },
    { text: 'סקירה חודשית', x: 0, y: -240, delay: 24, color: '#22C55E' },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgLight, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <GridBackground color={NX.accent} spacing={60} opacity={0.05 * gridOp} />
      <ParticleField count={12} color={NX.accent} speed={0.5} direction="up" />

      <div style={{ position: 'absolute', width: 100 * pulseScale, height: 100 * pulseScale, borderRadius: '50%', border: `2px solid ${NX.accent}`, opacity: pulseOp }} />
      <BreathingRing color={NX.accent} size={300} speed={0.08} />

      <div style={{ position: 'absolute', width: 16, height: 16, borderRadius: '50%', background: NX.accent, boxShadow: `0 0 ${20 + pulse(frame, 0.1, 10, 30)}px ${NX.accent}60` }} />

      {cards.map((card, i) => {
        const s = spring({ frame: Math.max(0, frame - card.delay), fps, config: SPRING.hero, durationInFrames: 16 });
        const hover = pulse(frame, 0.04 + i * 0.005, -3, 3);
        return (
          <div key={i} style={{
            position: 'absolute', padding: '10px 20px', borderRadius: 14,
            background: '#fff', boxShadow: `0 8px 30px ${card.color}15`,
            border: `1px solid ${card.color}25`,
            fontFamily: HEEBO, fontSize: 15, fontWeight: 700, color: '#1E293B', direction: 'rtl',
            transform: `translate(${interpolate(s, [0, 1], [0, card.x])}px, ${interpolate(s, [0, 1], [0, card.y]) + hover}px)`,
            opacity: s,
          }}>
            {card.text}
          </div>
        );
      })}

      <div style={{
        position: 'absolute', marginTop: 340,
        padding: '8px 24px', borderRadius: 16, background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)',
      }}>
        <span style={{ fontFamily: RUBIK, fontSize: 72, fontWeight: 800, color: NX.accent, opacity: titleSpring, transform: `scale(${interpolate(titleSpring, [0, 1], [1.5, 1])})`, display: 'inline-block' }}>×5</span>
      </div>
      <div style={{
        position: 'absolute', marginTop: 440,
        padding: '6px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.7)',
        fontFamily: HEEBO, fontSize: 26, fontWeight: 700, color: '#64748B', direction: 'rtl',
        opacity: titleSpring, transform: `translateY(${interpolate(titleSpring, [0, 1], [15, 0])}px)`,
      }}>
        יותר פרודוקטיביות
      </div>

      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 2: PROBLEM — Team overload chaos [75-210f = 2.5-7s]
// ═══════════════════════════════════════════════════════════
const TEAM_MEMBERS = [
  { name: 'יעל', avatar: '👩‍💼', tasks: 12, max: 20 },
  { name: 'אורי', avatar: '👨‍💻', tasks: 3, max: 20 },
  { name: 'נועה', avatar: '👩‍🎨', tasks: 18, max: 20 },
  { name: 'רועי', avatar: '🧑‍💼', tasks: 0, max: 20 },
];

const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const unassignedCount = Math.min(Math.floor(frame / 8), 7);
  const warningPulse = pulse(frame, 0.1, 0.7, 1.0);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgLight, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <GridBackground color="#EF4444" spacing={80} opacity={0.03} />
      <FloatingOrbs count={3} color="#EF4444" speed={0.02} maxSize={100} />

      <DeviceFrame scale={1.05} delay={0} shadowIntensity={0.5}>
        <div style={{ width: '100%', height: '100%', background: '#FAFBFC', padding: '55px 16px 16px', direction: 'rtl' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 900, color: '#1E293B' }}>עומס צוות</div>
            <div style={{
              padding: '4px 12px', borderRadius: 10, background: '#FEF2F2',
              fontFamily: RUBIK, fontSize: 11, fontWeight: 800, color: '#EF4444',
              opacity: warningPulse,
            }}>
              ⚠️ {unassignedCount} לא מוקצות
            </div>
          </div>

          {TEAM_MEMBERS.map((member, i) => {
            const s = spring({ frame: Math.max(0, frame - i * 4), fps, config: SPRING.ui, durationInFrames: 14 });
            const barWidth = (member.tasks / member.max) * 100;
            const barColor = member.tasks > 15 ? '#EF4444' : member.tasks > 8 ? '#F59E0B' : member.tasks > 0 ? '#22C55E' : '#E2E8F0';
            const shake = member.tasks > 15 ? Math.sin(frame * 0.35 + i) * 3 : 0;
            const barPulse = member.tasks > 15 ? pulse(frame, 0.08, 0.85, 1.0) : 1;

            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px', marginBottom: 8, borderRadius: 14,
                background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                border: member.tasks > 15 ? `1px solid #FCA5A5` : '1px solid rgba(0,0,0,0.04)',
                opacity: s, transform: `translateX(${interpolate(s, [0, 1], [40, 0]) + shake}px)`,
              }}>
                <span style={{ fontSize: 24 }}>{member.avatar}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: '#1E293B' }}>{member.name}</span>
                    <span style={{ fontFamily: RUBIK, fontSize: 12, fontWeight: 700, color: barColor }}>{member.tasks} משימות</span>
                  </div>
                  <div style={{ width: '100%', height: 6, borderRadius: 3, background: '#F1F5F9' }}>
                    <div style={{
                      width: `${barWidth * s}%`, height: '100%', borderRadius: 3,
                      background: barColor, opacity: barPulse,
                      boxShadow: member.tasks > 15 ? `0 0 8px ${barColor}40` : 'none',
                    }} />
                  </div>
                </div>
              </div>
            );
          })}

          <div style={{
            marginTop: 10, padding: '12px 14px', borderRadius: 14,
            background: '#FEF2F2', border: '1px solid #FCA5A5',
            display: 'flex', alignItems: 'center', gap: 8,
            opacity: spring({ frame: Math.max(0, frame - 25), fps, config: SPRING.ui, durationInFrames: 14 }),
          }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <span style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: '#DC2626' }}>
              חלוקה לא שווה = עובדים שחוקים + משימות נופלות
            </span>
          </div>
        </div>
      </DeviceFrame>

      {/* Pain overlay */}
      {frame > 100 && (
        <div style={{
          position: 'absolute', bottom: 70,
          padding: '12px 24px', borderRadius: 16,
          background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)',
          border: '1px solid #FCA5A5',
          fontFamily: HEEBO, fontSize: 22, fontWeight: 900, color: '#DC2626', direction: 'rtl',
          opacity: spring({ frame: Math.max(0, frame - 100), fps, config: SPRING.hero, durationInFrames: 18 }),
        }}>
          בלי AI — אתה המנהל, המחלק, והמזכירה 🤯
        </div>
      )}

      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 3: AI ENTRANCE — Smart assignment network [210-375f = 7-12.5s]
// ═══════════════════════════════════════════════════════════
const AIEntranceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sweepProgress = interpolate(frame, [0, 40], [0, 1], { extrapolateRight: 'clamp' });
  const lineProgress = spring({ frame: Math.max(0, frame - 15), fps, config: SPRING.smooth, durationInFrames: 30 });
  const badgeSpring = spring({ frame: Math.max(0, frame - 20), fps, config: SPRING.punch, durationInFrames: 15 });

  const nodes = [
    { x: -180, y: -160, emoji: '👩‍💼', label: 'יעל → 8', color: '#6366F1' },
    { x: 180, y: -140, emoji: '👨‍💻', label: 'אורי → 8', color: '#7C3AED' },
    { x: -160, y: 160, emoji: '👩‍🎨', label: 'נועה → 8', color: '#EC4899' },
    { x: 200, y: 150, emoji: '🧑‍💼', label: 'רועי → 8', color: '#3B82F6' },
  ];

  // Data packets flowing along lines
  const packetPhase = (frame * 0.05) % 1;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgLight, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <GridBackground color={NX.accent} spacing={60} opacity={0.04} />
      <ParticleField count={8} color={NX.accent} speed={0.4} />

      <div style={{
        position: 'absolute', width: 1000, height: 1000, borderRadius: '50%',
        background: `radial-gradient(circle, ${NX.accent}12 0%, transparent 60%)`,
        transform: `scale(${0.3 + sweepProgress * 1.5})`,
      }} />

      {/* AI Hub */}
      <div style={{
        width: 80, height: 80, borderRadius: '50%', background: NX.gradient,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        boxShadow: `0 16px 50px ${NX.accent}40, 0 0 ${pulse(frame, 0.06, 15, 30)}px ${NX.accent}30`,
        transform: `scale(${interpolate(badgeSpring, [0, 1], [0.3, 1])}) rotate(${frame * 0.3}deg)`,
        opacity: badgeSpring, zIndex: 10,
      }}>
        <span style={{ fontSize: 36, transform: `rotate(${-frame * 0.3}deg)` }}>🤖</span>
      </div>

      <BreathingRing color={NX.accent} size={200} speed={0.05} />

      {/* Lines + nodes */}
      {nodes.map((node, i) => {
        const nodeSpring = spring({ frame: Math.max(0, frame - 20 - i * 5), fps, config: SPRING.ui, durationInFrames: 16 });
        const nodeHover = pulse(frame, 0.03 + i * 0.005, -4, 4);
        return (
          <React.Fragment key={i}>
            <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }} viewBox="-540 -960 1080 1920">
              <line x1={0} y1={0} x2={node.x * lineProgress} y2={node.y * lineProgress} stroke={node.color} strokeWidth={2} strokeDasharray="6 4" opacity={lineProgress * 0.5} />
              {/* Data packet dot */}
              <circle
                cx={node.x * lineProgress * packetPhase}
                cy={node.y * lineProgress * packetPhase}
                r={4} fill={node.color}
                opacity={lineProgress > 0.5 ? 0.8 : 0}
              />
            </svg>
            <div style={{
              position: 'absolute',
              transform: `translate(${node.x}px, ${node.y + nodeHover}px) scale(${interpolate(nodeSpring, [0, 1], [0.5, 1])})`,
              opacity: nodeSpring, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', background: '#fff',
                boxShadow: `0 8px 24px ${node.color}18`,
                display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 24,
              }}>
                {node.emoji}
              </div>
              <span style={{
                fontFamily: RUBIK, fontSize: 12, fontWeight: 700, color: '#22C55E',
                background: '#F0FDF4', padding: '3px 10px', borderRadius: 8,
              }}>
                {node.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}

      <div style={{
        position: 'absolute', bottom: 280,
        padding: '10px 24px', borderRadius: 16,
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)',
      }}>
        <TextReveal text="AI שמחלק חכם." delay={25} fontSize={44} fontWeight={900} color="#1E293B" mode="words" stagger={3} />
      </div>

      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 4: SHOWCASE — Dashboard with balanced team [375-540f = 12.5-18s]
// ═══════════════════════════════════════════════════════════
const ShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const craneY = interpolate(frame, [0, 165], [50, -30], { extrapolateRight: 'clamp' });
  const insightSpring = spring({ frame: Math.max(0, frame - 60), fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgLight, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={3} color={NX.accent} speed={0.01} maxSize={100} />

      <div style={{ transform: `translateY(${craneY}px)` }}>
        <DeviceFrame scale={1.05} delay={0} shadowIntensity={0.5}>
          <div style={{ width: '100%', height: '100%', background: '#FAFBFC', padding: '55px 16px 16px', direction: 'rtl' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 900, color: '#1E293B' }}>Dashboard צוות</div>
              <div style={{
                padding: '3px 10px', borderRadius: 8, background: '#F0FDF4',
                fontFamily: RUBIK, fontSize: 10, fontWeight: 800, color: '#22C55E',
              }}>✅ מאוזן</div>
            </div>
            <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 600, color: '#22C55E', marginBottom: 14 }}>
              כל המשימות מחולקות באופן שווה
            </div>

            {[
              { name: 'יעל', emoji: '👩‍💼', tasks: 8, done: 5 },
              { name: 'אורי', emoji: '👨‍💻', tasks: 8, done: 6 },
              { name: 'נועה', emoji: '👩‍🎨', tasks: 8, done: 3 },
              { name: 'רועי', emoji: '🧑‍💼', tasks: 8, done: 7 },
            ].map((m, i) => {
              const s = spring({ frame: Math.max(0, frame - 8 - i * 5), fps, config: SPRING.ui, durationInFrames: 14 });
              const fillPct = (m.done / m.tasks) * 100;
              const fillAnim = spring({ frame: Math.max(0, frame - 18 - i * 5), fps, config: { damping: 20, stiffness: 60, mass: 1 }, durationInFrames: 30 });
              const barGlow = pulse(frame, 0.04 + i * 0.005, 0.7, 1.0);
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', marginBottom: 6, borderRadius: 14,
                  background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                  border: '1px solid rgba(0,0,0,0.04)',
                  opacity: s, transform: `translateX(${interpolate(s, [0, 1], [30, 0])}px)`,
                }}>
                  <span style={{ fontSize: 22 }}>{m.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: '#1E293B' }}>{m.name}</span>
                      <span style={{ fontFamily: RUBIK, fontSize: 11, fontWeight: 700, color: NX.accent }}>{m.done}/{m.tasks}</span>
                    </div>
                    <div style={{ width: '100%', height: 5, borderRadius: 3, background: '#F1F5F9' }}>
                      <div style={{
                        width: `${fillPct * fillAnim}%`, height: '100%', borderRadius: 3,
                        background: NX.gradient, opacity: barGlow,
                      }} />
                    </div>
                  </div>
                </div>
              );
            })}

            <div style={{
              marginTop: 8, padding: 14, borderRadius: 16, background: NX.gradient,
              boxShadow: `0 10px 30px ${NX.accent}25`,
              opacity: insightSpring,
              transform: `translateY(${interpolate(insightSpring, [0, 1], [30, 0])}px)`,
            }}>
              <div style={{ fontFamily: HEEBO, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)', marginBottom: 3 }}>🧠 תובנת AI</div>
              <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.5 }}>
                רועי סיים 87% מהמשימות. מומלץ להעביר אליו 2 משימות מנועה.
              </div>
            </div>
          </div>
        </DeviceFrame>
      </div>

      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 5: FEATURES — Nexus capabilities [540-690f = 18-23s]
// ═══════════════════════════════════════════════════════════
const FeaturesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const features = [
    { icon: '📋', title: 'Kanban חכם', desc: 'משימות זורמות בין שלבים. AI מזהה צווארי בקבוק.', color: '#6366F1' },
    { icon: '👥', title: 'חלוקת עומס AI', desc: 'המערכת מאזנת משימות בין חברי הצוות אוטומטית.', color: '#7C3AED' },
    { icon: '📊', title: 'דשבורד ביצועים', desc: 'מי עמד ביעד? מי צריך עזרה? הכל בזמן אמת.', color: '#3B82F6' },
    { icon: '🔔', title: 'התראות חכמות', desc: 'AI מזהה משימות שעומדות לאחר — ומתריע לפני שזה קורה.', color: '#22C55E' },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: '#F8F7FF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <GridBackground color={NX.accent} spacing={50} opacity={0.035} />
      <ParticleField count={10} color={NX.accent} speed={0.3} />

      <div style={{
        position: 'absolute', top: 55,
        padding: '10px 24px', borderRadius: 16,
        background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)',
        fontFamily: HEEBO, fontSize: 26, fontWeight: 900, color: '#1E293B', direction: 'rtl',
        opacity: spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 }),
      }}>
        מה Nexus יודע לעשות?
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', marginTop: 50 }}>
        {features.map((f, i) => {
          const delay = i * 18;
          const s = spring({ frame: Math.max(0, frame - delay - 12), fps, config: SPRING.ui, durationInFrames: 20 });
          const iconFloat = pulse(frame, 0.04 + i * 0.006, -2, 2);
          return (
            <div key={i} style={{
              width: 680, padding: '18px 22px', borderRadius: 20,
              background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
              border: `1px solid ${f.color}20`,
              boxShadow: `0 4px 20px ${f.color}08`,
              display: 'flex', alignItems: 'flex-start', gap: 14, direction: 'rtl',
              opacity: s, transform: `translateY(${interpolate(s, [0, 1], [25, 0])}px)`,
            }}>
              <div style={{
                width: 46, height: 46, borderRadius: 14,
                background: `${f.color}10`, border: `1px solid ${f.color}20`,
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                fontSize: 22, flexShrink: 0,
                transform: `translateY(${iconFloat}px)`,
              }}>
                {f.icon}
              </div>
              <div>
                <div style={{ fontFamily: HEEBO, fontSize: 17, fontWeight: 800, color: f.color }}>{f.title}</div>
                <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 600, color: '#64748B', lineHeight: 1.5, marginTop: 2 }}>{f.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      <NoiseLayer opacity={0.012} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 6: RESULTS — Animated counters [690-810f = 23-27s]
// ═══════════════════════════════════════════════════════════
const ResultsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stats = [
    { target: 5, prefix: '×', suffix: '', label: 'פרודוקטיביות', delay: 0 },
    { target: 60, prefix: '-', suffix: '%', label: 'עומס מנהלי', delay: 15 },
    { target: 100, prefix: '', suffix: '%', label: 'שקיפות צוות', delay: 30 },
    { target: 0, prefix: '', suffix: '', label: 'משימות שנפלו', delay: 45 },
  ];

  const testSpring = spring({ frame: Math.max(0, frame - 80), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: '#F8F7FF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <GridBackground color={NX.accent} spacing={70} opacity={0.03} />
      <FloatingOrbs count={4} color={NX.accent} speed={0.01} maxSize={120} />

      <div style={{
        position: 'absolute', top: 50,
        padding: '8px 20px', borderRadius: 14, background: 'rgba(255,255,255,0.7)',
        fontFamily: HEEBO, fontSize: 24, fontWeight: 900, color: '#1E293B', direction: 'rtl',
        opacity: spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 }),
      }}>
        התוצאות מדברות
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 40, padding: '0 60px', width: '100%', maxWidth: 800 }}>
        {stats.map((stat, i) => {
          const s = spring({ frame: Math.max(0, frame - stat.delay), fps, config: SPRING.punch, durationInFrames: 18 });
          const counterS = spring({ frame: Math.max(0, frame - stat.delay - 3), fps, config: { damping: 20, stiffness: 50, mass: 1 }, durationInFrames: 30 });
          const displayVal = Math.round(stat.target * counterS);
          return (
            <div key={i} style={{
              padding: '24px 20px', borderRadius: 22,
              background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
              border: `1px solid ${NX.accent}12`, textAlign: 'center', direction: 'rtl',
              opacity: s, transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`,
              boxShadow: `0 4px 20px ${NX.accent}08`,
            }}>
              <div style={{ fontFamily: RUBIK, fontSize: 48, fontWeight: 800, background: NX.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {stat.prefix}{displayVal}{stat.suffix}
              </div>
              <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: '#64748B', marginTop: 4 }}>{stat.label}</div>
            </div>
          );
        })}
      </div>

      {frame > 80 && (
        <div style={{
          position: 'absolute', bottom: 50, maxWidth: 700,
          padding: '14px 24px', borderRadius: 20,
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0,0,0,0.06)',
          direction: 'rtl', opacity: testSpring,
        }}>
          <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: '#1E293B', lineHeight: 1.6 }}>
            "הצוות שלי עובד כמו שעון מאז שהכנסנו את Nexus. אין יותר ׳מי אחראי על זה?׳"
          </div>
          <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 600, color: '#94A3B8', marginTop: 4 }}>
            — מנהלת פרויקטים, חברת הייטק
          </div>
        </div>
      )}

      <NoiseLayer opacity={0.012} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 7: TAGLINE [810-870f = 27-29s]
// ═══════════════════════════════════════════════════════════
const TaglineScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bgOp = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const subSpring = spring({ frame: Math.max(0, frame - 25), fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ background: NX.gradient, justifyContent: 'center', alignItems: 'center', opacity: bgOp, overflow: 'hidden' }}>
      <BreathingRing color="rgba(255,255,255,0.15)" size={450} speed={0.05} />
      <ParticleField count={15} color="rgba(255,255,255,0.3)" speed={0.6} />

      <TextReveal text="AI שמנהל את הצוות שלך" delay={5} fontSize={48} fontWeight={900} color="#fff" mode="words" stagger={2} style={{ textAlign: 'center' }} />

      <div style={{
        marginTop: 24, padding: '8px 20px', borderRadius: 12,
        background: 'rgba(255,255,255,0.12)',
        fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.7)', direction: 'rtl',
        opacity: subSpring,
      }}>
        פחות ניהול. יותר תוצאות.
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPOSITION — 30 seconds (900 frames)
// ═══════════════════════════════════════════════════════════
export const NexusVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={75}><HookScene /></Sequence>
      <Sequence from={75} durationInFrames={135}><ProblemScene /></Sequence>
      <Sequence from={210} durationInFrames={165}><AIEntranceScene /></Sequence>
      <Sequence from={375} durationInFrames={165}><ShowcaseScene /></Sequence>
      <Sequence from={540} durationInFrames={150}><FeaturesScene /></Sequence>
      <Sequence from={690} durationInFrames={120}><ResultsScene /></Sequence>
      <Sequence from={810} durationInFrames={60}><TaglineScene /></Sequence>
      <Sequence from={870} durationInFrames={30}>
        <CTAEndcard variant="light" accentColor={NX.accent} tagline="AI שמקדם את הארגון שלך" />
      </Sequence>
    </AbsoluteFill>
  );
};
