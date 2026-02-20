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
import { pulse, FloatingOrbs, ScanLines, ParticleField, BreathingRing } from '../../shared/components/MicroAnimations';

const OPS = MODULE_COLORS.operations;

// ═══════════════════════════════════════════════════════════
// SCENE 1: HOOK — Kanban cards auto-sorting [0-90f = 0-3s]
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cards = [
    { text: 'התקנת מערכת', col: 0, row: 0, color: '#EF4444', seedX: 30, seedY: -20, seedR: 12 },
    { text: 'תיאום טכנאי', col: 1, row: 0, color: '#F59E0B', seedX: -45, seedY: 15, seedR: -8 },
    { text: 'אישור לקוח', col: 2, row: 0, color: '#22C55E', seedX: 20, seedY: 25, seedR: 15 },
    { text: 'בדיקת איכות', col: 0, row: 1, color: '#EF4444', seedX: -35, seedY: -10, seedR: -12 },
    { text: 'משלוח ציוד', col: 1, row: 1, color: '#F59E0B', seedX: 50, seedY: -30, seedR: 10 },
    { text: 'סיום פרויקט', col: 2, row: 1, color: '#22C55E', seedX: -20, seedY: 20, seedR: -6 },
  ];

  const columns = ['לביצוע', 'בתהליך', 'הושלם'];
  const titleSpring = spring({ frame: Math.max(0, frame - 50), fps, config: SPRING.punch, durationInFrames: 15 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={4} color={OPS.accent} speed={0.012} maxSize={100} />
      <ScanLines color={OPS.accent} speed1={3.0} speed2={2.0} />

      <div style={{
        position: 'absolute', width: 600, height: 600, borderRadius: '50%',
        background: `radial-gradient(circle, ${OPS.accent}10 0%, transparent 60%)`,
        opacity: pulse(frame, 0.05, 0.5, 0.8),
      }} />

      <div style={{ position: 'absolute', top: '25%', display: 'flex', gap: 120, direction: 'rtl' }}>
        {columns.map((col, i) => {
          const s = spring({ frame: Math.max(0, frame - 2 - i * 3), fps, config: SPRING.ui, durationInFrames: 12 });
          return (
            <div key={i} style={{
              fontFamily: HEEBO, fontSize: 16, fontWeight: 700, color: BRAND.muted,
              opacity: s, transform: `translateY(${interpolate(s, [0, 1], [10, 0])}px)`,
              padding: '4px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)',
            }}>
              {col}
            </div>
          );
        })}
      </div>

      {cards.map((card, i) => {
        const targetX = (card.col - 1) * 200;
        const targetY = card.row * 80 - 20;

        const cardSpring = spring({ frame: Math.max(0, frame - 10 - i * 3), fps, config: SPRING.hero, durationInFrames: 18 });
        const x = interpolate(cardSpring, [0, 1], [card.seedX, targetX]);
        const y = interpolate(cardSpring, [0, 1], [card.seedY, targetY]);
        const rotation = interpolate(cardSpring, [0, 1], [card.seedR, 0]);
        const cardFloat = pulse(frame, 0.03 + i * 0.003, -1, 1);

        return (
          <div key={i} style={{
            position: 'absolute', marginTop: 80,
            padding: '10px 18px', borderRadius: 12,
            background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(6px)',
            border: `1px solid ${card.color}30`, borderRight: `3px solid ${card.color}`,
            fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: BRAND.white, direction: 'rtl',
            transform: `translate(${x}px, ${y + cardFloat}px) rotate(${rotation}deg)`,
            opacity: cardSpring, boxShadow: `0 4px 16px rgba(0,0,0,0.2), 0 0 ${pulse(frame, 0.06, 4, 8)}px ${card.color}15`,
          }}>
            {card.text}
          </div>
        );
      })}

      <div style={{
        position: 'absolute', bottom: '18%', opacity: titleSpring,
        transform: `scale(${interpolate(titleSpring, [0, 1], [1.3, 1])})`,
        padding: '8px 24px', borderRadius: 16, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)',
      }}>
        <span style={{ fontFamily: HEEBO, fontSize: 38, fontWeight: 900, color: BRAND.white, textShadow: `0 0 30px ${OPS.accent}40` }}>
          אפס בלגן
        </span>
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 2: PROBLEM — Chaotic task management [90-225f = 3-7.5s]
// ═══════════════════════════════════════════════════════════
const TASKS_DATA = [
  { text: 'התקנה באתר רמת גן', assignee: 'לא מוקצה', urgent: true },
  { text: 'תיקון תקלה — לקוח VIP', assignee: 'לא מוקצה', urgent: true },
  { text: 'הזמנת חלקים מספק', assignee: 'דני', urgent: false },
  { text: 'דוח שבועי מנהל', assignee: 'לא מוקצה', urgent: false },
  { text: 'ביקורת בטיחות', assignee: 'מוקצה', urgent: true },
  { text: 'עדכון מלאי', assignee: 'לא מוקצה', urgent: false },
];

const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const urgentCount = TASKS_DATA.filter(t => t.urgent && t.assignee === 'לא מוקצה').length;
  const warningPulse = pulse(frame, 0.1, 0.6, 1.0);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={3} color="#EF4444" speed={0.015} maxSize={90} />
      <ScanLines color={OPS.accent} speed1={2.5} speed2={1.8} />

      <DeviceFrame scale={1.05} delay={0}>
        <div style={{ width: '100%', height: '100%', background: '#0F0F12', padding: '55px 16px 16px', direction: 'rtl' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontFamily: HEEBO, fontSize: 17, fontWeight: 900, color: BRAND.white }}>משימות תפעול</div>
            <div style={{
              padding: '3px 10px', borderRadius: 10, background: '#EF444420',
              fontFamily: RUBIK, fontSize: 10, fontWeight: 800, color: '#EF4444', opacity: warningPulse,
            }}>
              🔴 {urgentCount} דחופות
            </div>
          </div>
          <div style={{
            fontFamily: HEEBO, fontSize: 11, fontWeight: 600, color: '#EF4444', marginBottom: 10,
            padding: '4px 10px', borderRadius: 8, background: '#EF444408', border: '1px solid #EF444415',
          }}>
            {urgentCount} משימות דחופות לא מוקצות · טכנאים ממתינים
          </div>

          {TASKS_DATA.map((task, i) => {
            const s = spring({ frame: Math.max(0, frame - i * 4 - 5), fps, config: SPRING.ui, durationInFrames: 12 });
            const shake = task.urgent && task.assignee === 'לא מוקצה' ? Math.sin(frame * 0.35 + i * 2) * 2 : 0;
            return (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px', marginBottom: 5, borderRadius: 12,
                background: 'rgba(255,255,255,0.04)',
                border: task.urgent ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(255,255,255,0.06)',
                opacity: s, transform: `translateX(${interpolate(s, [0, 1], [35, 0]) + shake}px)`,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: BRAND.white }}>{task.text}</div>
                  <div style={{ fontFamily: HEEBO, fontSize: 9, fontWeight: 600, color: task.assignee === 'לא מוקצה' ? '#EF4444' : '#94A3B8' }}>{task.assignee}</div>
                </div>
                {task.urgent && <div style={{
                  width: 8, height: 8, borderRadius: '50%', background: '#EF4444',
                  boxShadow: `0 0 ${pulse(frame, 0.08, 4, 10)}px #EF444460`,
                }} />}
              </div>
            );
          })}
        </div>
      </DeviceFrame>

      {frame > 100 && (
        <div style={{
          position: 'absolute', bottom: 70,
          padding: '12px 24px', borderRadius: 16,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)',
          border: '1px solid #EF444420',
          fontFamily: HEEBO, fontSize: 20, fontWeight: 900, color: '#EF4444', direction: 'rtl',
          opacity: spring({ frame: Math.max(0, frame - 100), fps, config: SPRING.hero, durationInFrames: 18 }),
        }}>
          בלגן בתפעול = לקוחות מאוכזבים 💥
        </div>
      )}

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 3: AI ENTRANCE — Auto-assignment + optimization [225-390f = 7.5-13s]
// ═══════════════════════════════════════════════════════════
const AIEntranceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const badgeSpring = spring({ frame: Math.max(0, frame - 12), fps, config: SPRING.punch, durationInFrames: 15 });

  const steps = [
    { emoji: '🎯', text: 'הקצאת 3 משימות דחופות לטכנאים פנויים', priority: 'בוצע', color: '#22C55E', delay: 25 },
    { emoji: '🗺️', text: 'אופטימיזציית מסלולים — חיסכון 40 דקות', priority: 'בוצע', color: '#22C55E', delay: 38 },
    { emoji: '📦', text: 'הזמנת חלקים אוטומטית מהספק', priority: 'בתהליך', color: '#F59E0B', delay: 51 },
    { emoji: '📊', text: 'דוח ביצועים שבועי — נשלח למנהל', priority: 'מתוזמן', color: '#3B82F6', delay: 64 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={4} color={OPS.accent} speed={0.012} maxSize={100} />
      <ParticleField count={10} color={OPS.accent} speed={0.4} />
      <ScanLines color={OPS.accent} speed1={2.5} speed2={1.8} />

      <div style={{
        position: 'absolute', width: 900, height: 900, borderRadius: '50%',
        background: `radial-gradient(circle, ${OPS.accent}08 0%, transparent 60%)`,
        opacity: pulse(frame, 0.05, 0.4, 0.7),
      }} />

      <div style={{
        width: 80, height: 80, borderRadius: '50%', background: OPS.gradient,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        boxShadow: `0 16px 50px ${OPS.accent}40, 0 0 ${pulse(frame, 0.06, 12, 25)}px ${OPS.accent}25`,
        transform: `scale(${interpolate(badgeSpring, [0, 1], [0.4, 1])})`,
        opacity: badgeSpring, marginBottom: 28,
      }}>
        <span style={{ fontSize: 36 }}>⚡</span>
      </div>

      <BreathingRing color={OPS.accent} size={200} speed={0.05} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        {steps.map((step, i) => {
          const s = spring({ frame: Math.max(0, frame - step.delay), fps, config: SPRING.hero, durationInFrames: 16 });
          const iconFloat = pulse(frame, 0.04 + i * 0.005, -2, 2);
          return (
            <div key={i} style={{
              width: 740, padding: '14px 20px', borderRadius: 18,
              background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)',
              border: `1px solid ${step.color}20`,
              boxShadow: `0 4px 16px ${step.color}06`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', direction: 'rtl',
              opacity: s, transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px)`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22, transform: `translateY(${iconFloat}px)` }}>{step.emoji}</span>
                <span style={{ fontFamily: HEEBO, fontSize: 15, fontWeight: 700, color: BRAND.white }}>{step.text}</span>
              </div>
              <span style={{
                fontFamily: HEEBO, fontSize: 10, fontWeight: 700, color: step.color,
                background: `${step.color}15`, padding: '3px 10px', borderRadius: 8,
              }}>{step.priority}</span>
            </div>
          );
        })}
      </div>

      <div style={{
        position: 'absolute', bottom: 280,
        padding: '10px 24px', borderRadius: 16,
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)',
      }}>
        <TextReveal text="AI שמתפעל בשבילך." delay={40} fontSize={40} fontWeight={900} color={BRAND.white} mode="words" stagger={3} />
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 4: SHOWCASE — Optimized operations dashboard [390-555f = 13-18.5s]
// ═══════════════════════════════════════════════════════════
const ShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const craneY = interpolate(frame, [0, 165], [50, -30], { extrapolateRight: 'clamp' });
  const aiSpring = spring({ frame: Math.max(0, frame - 60), fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={3} color={OPS.accent} speed={0.01} maxSize={90} />
      <ScanLines color={OPS.accent} speed1={2.0} speed2={1.5} />

      <div style={{ transform: `translateY(${craneY}px)` }}>
        <DeviceFrame scale={1.05} delay={0}>
          <div style={{ width: '100%', height: '100%', background: '#0F0F12', padding: '55px 16px 16px', direction: 'rtl' }}>
            <div style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 900, color: BRAND.white, marginBottom: 4 }}>לוח תפעול חכם</div>
            <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 600, color: '#22C55E', marginBottom: 10 }}>✅ כל המשימות מוקצות ומתוזמנות</div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {[
                { title: 'לביצוע', count: 2, color: OPS.accent },
                { title: 'בתהליך', count: 3, color: '#F59E0B' },
                { title: 'הושלם', count: 8, color: '#22C55E' },
              ].map((col, i) => {
                const s = spring({ frame: Math.max(0, frame - 8 - i * 4), fps, config: SPRING.ui, durationInFrames: 14 });
                const counterS = spring({ frame: Math.max(0, frame - 10 - i * 4), fps, config: { damping: 20, stiffness: 50, mass: 1 }, durationInFrames: 25 });
                return (
                  <div key={i} style={{
                    flex: 1, padding: '10px 8px', borderRadius: 12,
                    background: 'rgba(255,255,255,0.04)', border: `1px solid ${col.color}18`,
                    textAlign: 'center', opacity: s,
                    transform: `translateY(${interpolate(s, [0, 1], [15, 0])}px)`,
                  }}>
                    <div style={{ fontFamily: RUBIK, fontSize: 22, fontWeight: 800, color: col.color }}>{Math.round(col.count * counterS)}</div>
                    <div style={{ fontFamily: HEEBO, fontSize: 9, fontWeight: 600, color: BRAND.muted }}>{col.title}</div>
                  </div>
                );
              })}
            </div>

            {[
              { text: 'התקנה רמת גן', tech: 'דני ש.', time: '10:00', status: '🔵' },
              { text: 'תיקון VIP', tech: 'אורי מ.', time: '11:30', status: '🟡' },
              { text: 'ביקורת בטיחות', tech: 'נועה כ.', time: '14:00', status: '🔵' },
            ].map((task, i) => {
              const s = spring({ frame: Math.max(0, frame - 22 - i * 5), fps, config: SPRING.ui, durationInFrames: 14 });
              return (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 10px', marginBottom: 5, borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                  opacity: s, transform: `translateX(${interpolate(s, [0, 1], [20, 0])}px)`,
                }}>
                  <div>
                    <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: BRAND.white }}>{task.text}</div>
                    <div style={{ fontFamily: HEEBO, fontSize: 9, fontWeight: 600, color: BRAND.muted }}>{task.tech} · {task.time}</div>
                  </div>
                  <span style={{ fontSize: 12 }}>{task.status}</span>
                </div>
              );
            })}

            <div style={{
              marginTop: 6, padding: 10, borderRadius: 12, background: OPS.gradient,
              boxShadow: `0 6px 20px ${OPS.accent}18`,
              opacity: aiSpring, transform: `translateY(${interpolate(aiSpring, [0, 1], [15, 0])}px)`,
            }}>
              <div style={{ fontFamily: HEEBO, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.65)', marginBottom: 2 }}>🧠 אופטימיזציה AI</div>
              <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: '#fff', lineHeight: 1.5 }}>
                מסלול מותאם: דני → רמת גן → פתח תקווה. חיסכון: 40 דקות.
              </div>
            </div>
          </div>
        </DeviceFrame>
      </div>
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 5: FEATURES — Operations capabilities [555-700f = 18.5-23.3s]
// ═══════════════════════════════════════════════════════════
const FeaturesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const features = [
    { icon: '🎯', title: 'הקצאה חכמה', desc: 'AI מקצה משימות לטכנאי הנכון לפי זמינות, מיקום ומומחיות.', color: OPS.accent },
    { icon: '🗺️', title: 'אופטימיזציית מסלולים', desc: 'תכנון מסלולים אוטומטי — חיסכון בזמן ודלק.', color: '#22C55E' },
    { icon: '📦', title: 'ניהול מלאי', desc: 'מעקב חלקים ואספקה — הזמנות אוטומטיות כשמגיעים למינימום.', color: '#F59E0B' },
    { icon: '📊', title: 'דוחות ביצועים', desc: 'דוחות שבועיים אוטומטיים — KPIs, SLA ושביעות רצון.', color: '#8B5CF6' },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={3} color={OPS.accent} speed={0.01} maxSize={90} />
      <ParticleField count={8} color={OPS.accent} speed={0.3} />
      <ScanLines color={OPS.accent} speed1={2.0} speed2={1.5} />

      <div style={{
        position: 'absolute', top: 55,
        padding: '10px 24px', borderRadius: 16,
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)',
        fontFamily: HEEBO, fontSize: 26, fontWeight: 900, color: BRAND.white, direction: 'rtl',
        opacity: spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 }),
      }}>
        מה Operations יודע לעשות?
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', marginTop: 50 }}>
        {features.map((f, i) => {
          const delay = i * 18;
          const s = spring({ frame: Math.max(0, frame - delay - 12), fps, config: SPRING.ui, durationInFrames: 20 });
          const iconFloat = pulse(frame, 0.04 + i * 0.006, -2, 2);
          return (
            <div key={i} style={{
              width: 700, padding: '16px 20px', borderRadius: 20,
              background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)',
              border: `1px solid ${f.color}18`,
              boxShadow: `0 4px 20px ${f.color}06`,
              display: 'flex', alignItems: 'flex-start', gap: 14, direction: 'rtl',
              opacity: s, transform: `translateY(${interpolate(s, [0, 1], [25, 0])}px)`,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: `${f.color}10`, border: `1px solid ${f.color}20`,
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                fontSize: 20, flexShrink: 0,
                transform: `translateY(${iconFloat}px)`,
              }}>
                {f.icon}
              </div>
              <div>
                <div style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 800, color: f.color }}>{f.title}</div>
                <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 600, color: BRAND.muted, lineHeight: 1.5, marginTop: 2 }}>{f.desc}</div>
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
// SCENE 6: RESULTS — Animated counters [700-820f = 23.3-27.3s]
// ═══════════════════════════════════════════════════════════
const ResultsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stats = [
    { target: 40, prefix: '-', suffix: '%', label: 'זמן תפעול', delay: 0 },
    { target: 55, prefix: '+', suffix: '%', label: 'יעילות צוות', delay: 15 },
    { target: 0, prefix: '', suffix: '', label: 'משימות שנשכחו', delay: 30 },
    { target: 98, prefix: '', suffix: '%', label: 'SLA עמידה', delay: 45 },
  ];

  const testSpring = spring({ frame: Math.max(0, frame - 80), fps, config: SPRING.hero, durationInFrames: 20 });

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
              background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)',
              border: `1px solid ${OPS.accent}12`, textAlign: 'center', direction: 'rtl',
              opacity: s, transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`,
              boxShadow: `0 4px 20px ${OPS.accent}08`,
            }}>
              <div style={{
                fontFamily: RUBIK, fontSize: 48, fontWeight: 800,
                background: OPS.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                {stat.prefix}{displayVal}{stat.suffix}
              </div>
              <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: BRAND.muted, marginTop: 4 }}>{stat.label}</div>
            </div>
          );
        })}
      </div>

      {frame > 80 && (
        <div style={{
          position: 'absolute', bottom: 50, maxWidth: 700,
          padding: '14px 24px', borderRadius: 20,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.06)',
          direction: 'rtl', opacity: testSpring,
        }}>
          <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: BRAND.white, lineHeight: 1.6 }}>
            "הצוות שלי מבצע 55% יותר משימות ביום — בלי שום בלגן."
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
// SCENE 7: TAGLINE [820-870f = 27.3-29s]
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
        הקצאה. מסלול. ביצוע.
      </div>

      <NoiseLayer opacity={0.025} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPOSITION — 30 seconds (900 frames)
// ═══════════════════════════════════════════════════════════
export const OperationsVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={90}><HookScene /></Sequence>
      <Sequence from={90} durationInFrames={135}><ProblemScene /></Sequence>
      <Sequence from={225} durationInFrames={165}><AIEntranceScene /></Sequence>
      <Sequence from={390} durationInFrames={165}><ShowcaseScene /></Sequence>
      <Sequence from={555} durationInFrames={145}><FeaturesScene /></Sequence>
      <Sequence from={700} durationInFrames={120}><ResultsScene /></Sequence>
      <Sequence from={820} durationInFrames={50}><TaglineScene /></Sequence>
      <Sequence from={870} durationInFrames={30}>
        <CTAEndcard variant="dark" accentColor={OPS.accent} tagline="תפעול חכם. אפס בלגן." />
      </Sequence>
    </AbsoluteFill>
  );
};
