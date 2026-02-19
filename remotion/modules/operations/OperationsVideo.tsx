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

const OPS = MODULE_COLORS.operations;

// ═══════════════════════════════════════════════════════════
// HOOK — Kanban cards auto-sorting
// [0-36f]
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Cards that fly from messy pile to organized columns
  const cards = [
    { text: 'התקנת מערכת', col: 0, row: 0, color: '#EF4444' },
    { text: 'תיאום טכנאי', col: 1, row: 0, color: '#F59E0B' },
    { text: 'אישור לקוח', col: 2, row: 0, color: '#22C55E' },
    { text: 'בדיקת איכות', col: 0, row: 1, color: '#EF4444' },
    { text: 'משלוח ציוד', col: 1, row: 1, color: '#F59E0B' },
    { text: 'סיום פרויקט', col: 2, row: 1, color: '#22C55E' },
  ];

  // Column headers
  const columns = ['לביצוע', 'בתהליך', 'הושלם'];

  // Sorting animation: cards start piled in center, fly to grid
  const sortProgress = interpolate(frame, [4, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Title
  const titleSpring = spring({ frame: Math.max(0, frame - 20), fps, config: SPRING.punch, durationInFrames: 12 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center' }}>
      {/* Blue ambient */}
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${OPS.accent}12 0%, transparent 60%)` }} />

      {/* Column headers */}
      <div style={{ position: 'absolute', top: '28%', display: 'flex', gap: 120, direction: 'rtl' }}>
        {columns.map((col, i) => {
          const s = spring({ frame: Math.max(0, frame - 2 - i * 3), fps, config: SPRING.ui, durationInFrames: 10 });
          return (
            <div key={i} style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 700, color: BRAND.muted, opacity: s, transform: `translateY(${interpolate(s, [0, 1], [10, 0])}px)` }}>
              {col}
            </div>
          );
        })}
      </div>

      {/* Kanban cards */}
      {cards.map((card, i) => {
        const targetX = (card.col - 1) * 200;
        const targetY = card.row * 80 - 20;
        const startX = (Math.random() - 0.5) * 100;
        const startY = (Math.random() - 0.5) * 60;

        const cardSpring = spring({ frame: Math.max(0, frame - 6 - i * 2), fps, config: SPRING.hero, durationInFrames: 14 });
        const x = interpolate(cardSpring, [0, 1], [startX, targetX]);
        const y = interpolate(cardSpring, [0, 1], [startY, targetY]);
        const rotation = interpolate(cardSpring, [0, 1], [(Math.random() - 0.5) * 20, 0]);

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              marginTop: 80,
              padding: '10px 18px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${card.color}40`,
              borderRight: `3px solid ${card.color}`,
              fontFamily: HEEBO,
              fontSize: 14,
              fontWeight: 700,
              color: BRAND.white,
              direction: 'rtl',
              transform: `translate(${x}px, ${y}px) rotate(${rotation}deg)`,
              opacity: cardSpring,
              boxShadow: `0 4px 16px rgba(0,0,0,0.2)`,
            }}
          >
            {card.text}
          </div>
        );
      })}

      {/* "אפס בלגן" */}
      <div style={{ position: 'absolute', bottom: '22%', opacity: titleSpring, transform: `scale(${interpolate(titleSpring, [0, 1], [1.3, 1])})` }}>
        <span style={{ fontFamily: HEEBO, fontSize: 42, fontWeight: 900, color: BRAND.white, textShadow: `0 0 30px ${OPS.accent}40` }}>
          אפס בלגן
        </span>
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SETUP — Chaotic task management
// [36-105f]
// ═══════════════════════════════════════════════════════════
const SetupScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const TASKS = [
    { text: 'התקנה באתר רמת גן', assignee: 'לא מוקצה', urgent: true },
    { text: 'תיקון תקלה — לקוח VIP', assignee: 'לא מוקצה', urgent: true },
    { text: 'הזמנת חלקים מספק', assignee: 'דני', urgent: false },
    { text: 'דוח שבועי מנהל', assignee: 'לא מוקצה', urgent: false },
    { text: 'ביקורת בטיחות', assignee: 'מוקצה', urgent: true },
    { text: 'עדכון מלאי', assignee: 'לא מוקצה', urgent: false },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center' }}>
      <PhoneFrame scale={1.1} delay={0}>
        <div style={{ width: '100%', height: '100%', background: '#0F0F12', padding: '60px 20px 20px', direction: 'rtl' }}>
          <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 900, color: BRAND.white, marginBottom: 6 }}>משימות תפעול</div>
          <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: '#EF4444', marginBottom: 14 }}>🔴 3 משימות דחופות לא מוקצות</div>

          {TASKS.map((task, i) => {
            const s = spring({ frame: Math.max(0, frame - i * 4 - 5), fps, config: SPRING.ui, durationInFrames: 12 });
            const shake = task.urgent && task.assignee === 'לא מוקצה' ? Math.sin(frame * 0.35 + i * 2) * 2 : 0;
            return (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '11px 14px', marginBottom: 7, borderRadius: 12,
                background: 'rgba(255,255,255,0.04)',
                border: task.urgent ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.06)',
                opacity: s, transform: `translateX(${interpolate(s, [0, 1], [40, 0]) + shake}px)`,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: BRAND.white }}>{task.text}</div>
                  <div style={{ fontFamily: HEEBO, fontSize: 10, fontWeight: 600, color: task.assignee === 'לא מוקצה' ? '#EF4444' : '#94A3B8' }}>{task.assignee}</div>
                </div>
                {task.urgent && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 8px #EF444480' }} />}
              </div>
            );
          })}
        </div>
      </PhoneFrame>
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// AI ENTRANCE — Auto-assignment + optimization
// [105-180f]
// ═══════════════════════════════════════════════════════════
const AIEntranceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const badgeSpring = spring({ frame: Math.max(0, frame - 15), fps, config: SPRING.punch, durationInFrames: 15 });

  // Optimization steps
  const steps = [
    { emoji: '🎯', text: 'הקצאת 3 משימות דחופות לטכנאים פנויים', delay: 22 },
    { emoji: '🗺️', text: 'אופטימיזציית מסלולים — חיסכון 40 דקות', delay: 30 },
    { emoji: '📦', text: 'הזמנת חלקים אוטומטית מהספק', delay: 38 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'absolute', width: 900, height: 900, borderRadius: '50%', background: `radial-gradient(circle, ${OPS.accent}10 0%, transparent 60%)` }} />

      {/* AI Badge */}
      <div style={{
        width: 80, height: 80, borderRadius: '50%', background: OPS.gradient,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        boxShadow: `0 16px 50px ${OPS.accent}40`,
        transform: `scale(${interpolate(badgeSpring, [0, 1], [0.4, 1])})`,
        opacity: badgeSpring, marginBottom: 40,
      }}>
        <span style={{ fontSize: 36 }}>⚡</span>
      </div>

      {/* Step cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
        {steps.map((step, i) => {
          const s = spring({ frame: Math.max(0, frame - step.delay), fps, config: SPRING.hero, durationInFrames: 16 });
          return (
            <GlassCard key={i} variant="dark" delay={step.delay} width={740} glowColor={OPS.accent}>
              <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 14, direction: 'rtl' }}>
                <span style={{ fontSize: 26 }}>{step.emoji}</span>
                <span style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 700, color: BRAND.white }}>{step.text}</span>
              </div>
            </GlassCard>
          );
        })}
      </div>

      <div style={{ position: 'absolute', bottom: 300 }}>
        <TextReveal text="AI שמתפעל בשבילך." delay={42} fontSize={44} fontWeight={900} color={BRAND.white} mode="words" stagger={3} />
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SHOWCASE — Optimized operations dashboard
// [180-300f]
// ═══════════════════════════════════════════════════════════
const ShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const craneY = interpolate(frame, [0, 120], [50, -30], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${OPS.accent}06 0%, transparent 60%)`, top: '25%' }} />

      <div style={{ transform: `translateY(${craneY}px)` }}>
        <PhoneFrame scale={1.1} delay={0}>
          <div style={{ width: '100%', height: '100%', background: '#0F0F12', padding: '60px 20px 20px', direction: 'rtl' }}>
            <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 900, color: BRAND.white, marginBottom: 4 }}>לוח תפעול חכם</div>
            <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: '#22C55E', marginBottom: 16 }}>✅ כל המשימות מוקצות ומתוזמנות</div>

            {/* Kanban mini columns */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {[
                { title: 'לביצוע', count: 2, color: OPS.accent },
                { title: 'בתהליך', count: 3, color: '#F59E0B' },
                { title: 'הושלם', count: 8, color: '#22C55E' },
              ].map((col, i) => {
                const s = spring({ frame: Math.max(0, frame - 10 - i * 4), fps, config: SPRING.ui, durationInFrames: 14 });
                return (
                  <div key={i} style={{ flex: 1, padding: '14px 10px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: `1px solid ${col.color}20`, textAlign: 'center', opacity: s, transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px)` }}>
                    <div style={{ fontFamily: RUBIK, fontSize: 28, fontWeight: 800, color: col.color }}>{col.count}</div>
                    <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 600, color: BRAND.muted }}>{col.title}</div>
                  </div>
                );
              })}
            </div>

            {/* Active tasks */}
            {[
              { text: 'התקנה רמת גן', tech: 'דני ש.', time: '10:00', status: '🔵' },
              { text: 'תיקון VIP', tech: 'אורי מ.', time: '11:30', status: '🟡' },
              { text: 'ביקורת בטיחות', tech: 'נועה כ.', time: '14:00', status: '🔵' },
            ].map((task, i) => {
              const s = spring({ frame: Math.max(0, frame - 25 - i * 5), fps, config: SPRING.ui, durationInFrames: 14 });
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', marginBottom: 6, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', opacity: s, transform: `translateX(${interpolate(s, [0, 1], [25, 0])}px)` }}>
                  <div>
                    <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: BRAND.white }}>{task.text}</div>
                    <div style={{ fontFamily: HEEBO, fontSize: 10, fontWeight: 600, color: BRAND.muted }}>{task.tech} · {task.time}</div>
                  </div>
                  <span style={{ fontSize: 14 }}>{task.status}</span>
                </div>
              );
            })}

            {/* AI card */}
            <div style={{
              marginTop: 10, padding: 14, borderRadius: 14, background: OPS.gradient,
              boxShadow: `0 8px 24px ${OPS.accent}20`,
              opacity: spring({ frame: Math.max(0, frame - 55), fps, config: SPRING.hero, durationInFrames: 18 }),
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 12 }}>🧠</span>
                <span style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>אופטימיזציה AI</span>
              </div>
              <span style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.5 }}>
                מסלול מותאם: דני → רמת גן → פתח תקווה. חיסכון: 40 דקות.
              </span>
            </div>
          </div>
        </PhoneFrame>
      </div>
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// RESULTS [300-390f]
const ResultsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stats = [
    { value: '-40%', label: 'זמן תפעול', delay: 0 },
    { value: '+55%', label: 'יעילות צוות', delay: 8 },
    { value: '0', label: 'משימות שנשכחו', delay: 16 },
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: `radial-gradient(circle, ${OPS.accent}06 0%, transparent 60%)` }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32, alignItems: 'center' }}>
        {stats.map((stat, i) => {
          const s = spring({ frame: Math.max(0, frame - stat.delay), fps, config: SPRING.punch, durationInFrames: 15 });
          return (
            <GlassCard key={i} variant="dark" delay={stat.delay} width={700} glowColor={OPS.accent}>
              <div style={{ padding: '28px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl' }}>
                <span style={{ fontFamily: HEEBO, fontSize: 28, fontWeight: 700, color: BRAND.muted }}>{stat.label}</span>
                <span style={{ fontFamily: RUBIK, fontSize: 64, fontWeight: 800, background: OPS.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', transform: `scale(${interpolate(s, [0, 1], [1.5, 1])})`, filter: `blur(${interpolate(s, [0, 1], [8, 0])}px)`, display: 'inline-block' }}>{stat.value}</span>
              </div>
            </GlassCard>
          );
        })}
      </div>
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// TAGLINE [390-450f]
const TaglineScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: OPS.gradient, justifyContent: 'center', alignItems: 'center', opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }) }}>
      <TextReveal text="תפעול חכם. אפס בלגן." delay={5} fontSize={52} fontWeight={900} color="#fff" mode="words" stagger={2} style={{ textAlign: 'center' }} />
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// MAIN
export const OperationsVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={36}><HookScene /></Sequence>
      <Sequence from={36} durationInFrames={69}><SetupScene /></Sequence>
      <Sequence from={105} durationInFrames={75}><AIEntranceScene /></Sequence>
      <Sequence from={180} durationInFrames={120}><ShowcaseScene /></Sequence>
      <Sequence from={300} durationInFrames={90}><ResultsScene /></Sequence>
      <Sequence from={390} durationInFrames={60}><TaglineScene /></Sequence>
      <Sequence from={450} durationInFrames={90}>
        <CTAEndcard variant="dark" accentColor={OPS.accent} tagline="AI שמקדם את הארגון שלך" />
      </Sequence>
    </AbsoluteFill>
  );
};
