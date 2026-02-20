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
import { pulse, FloatingOrbs, ParticleField, BreathingRing } from '../../shared/components/MicroAnimations';

const CL = MODULE_COLORS.client;

// ═══════════════════════════════════════════════════════════
// SCENE 1: HOOK — Health score arc + pulse [0-90f = 0-3s]
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const arcProgress = interpolate(frame, [0, 45], [0, 0.92], { extrapolateRight: 'clamp' });
  const radius = 140;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference * (1 - arcProgress);

  const scoreSpring = spring({ frame: Math.max(0, frame - 15), fps, config: { damping: 18, stiffness: 50, mass: 1 }, durationInFrames: 40 });
  const scoreValue = Math.round(92 * scoreSpring);

  const outerPulse = interpolate(frame, [30, 50], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const outerScale = interpolate(outerPulse, [0, 1], [1, 1.4]);
  const outerOpacity = interpolate(outerPulse, [0, 0.5, 1], [0, 0.4, 0]);

  const badgeSpring = spring({ frame: Math.max(0, frame - 50), fps, config: SPRING.punch, durationInFrames: 12 });

  return (
    <AbsoluteFill style={{ backgroundColor: '#FFFBF5', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={4} color={CL.accent} speed={0.012} maxSize={100} />

      <div style={{
        position: 'absolute', width: 700, height: 700, borderRadius: '50%',
        background: `radial-gradient(circle, ${CL.accent}08 0%, transparent 60%)`,
        opacity: pulse(frame, 0.06, 0.5, 0.8),
      }} />

      <svg width={360} height={360} style={{ position: 'absolute', transform: `scale(${outerScale})`, opacity: outerOpacity }}>
        <circle cx={180} cy={180} r={radius} fill="none" stroke={CL.accent} strokeWidth={2} />
      </svg>

      <BreathingRing color={CL.accent} size={360} speed={0.04} />

      <svg width={360} height={360} style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
        <circle cx={180} cy={180} r={radius} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={12} />
        <circle
          cx={180} cy={180} r={radius} fill="none"
          stroke={CL.accent} strokeWidth={12} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={strokeOffset}
          style={{ filter: `drop-shadow(0 0 ${pulse(frame, 0.06, 8, 16)}px ${CL.accent}60)` }}
        />
      </svg>

      <div style={{
        fontFamily: RUBIK, fontSize: 96, fontWeight: 800, color: '#1E293B',
        opacity: scoreSpring, transform: `scale(${interpolate(scoreSpring, [0, 1], [1.4, 1])})`,
      }}>
        {scoreValue}
      </div>
      <div style={{
        position: 'absolute', marginTop: 110,
        padding: '6px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.7)',
        fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: '#64748B',
        opacity: scoreSpring, direction: 'rtl',
      }}>
        Client Health Score
      </div>

      <div style={{
        position: 'absolute', marginTop: 200,
        padding: '8px 22px', borderRadius: 20,
        background: `${CL.accent}12`, border: `1px solid ${CL.accent}25`,
        fontFamily: HEEBO, fontSize: 15, fontWeight: 700, color: CL.accent,
        opacity: badgeSpring,
        transform: `scale(${interpolate(badgeSpring, [0, 1], [0.7, 1])})`,
      }}>
        ⭐ לקוח פרימיום
      </div>

      <NoiseLayer opacity={0.012} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 2: PROBLEM — Client list without insights [90-225f = 3-7.5s]
// ═══════════════════════════════════════════════════════════
const CLIENTS_DATA = [
  { name: 'רונית כץ', lastContact: '45 ימים', risk: 'high' as const },
  { name: 'משרד אדריכלים גל', lastContact: '12 ימים', risk: 'low' as const },
  { name: 'סטארטאפ נובה', lastContact: '30 ימים', risk: 'medium' as const },
  { name: 'חברת הפקות דנה', lastContact: '60 ימים', risk: 'high' as const },
  { name: 'יועץ אסטרטגיה לב', lastContact: '3 ימים', risk: 'low' as const },
  { name: 'קליניקת ד"ר אבי', lastContact: '55 ימים', risk: 'high' as const },
];

const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const atRisk = CLIENTS_DATA.filter(c => c.risk === 'high').length;
  const warningPulse = pulse(frame, 0.1, 0.6, 1.0);

  return (
    <AbsoluteFill style={{ backgroundColor: '#FFFBF5', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={3} color="#EF4444" speed={0.015} maxSize={90} />

      <DeviceFrame scale={1.05} delay={0} shadowIntensity={0.5}>
        <div style={{ width: '100%', height: '100%', background: '#FAFBFC', padding: '55px 16px 16px', direction: 'rtl' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontFamily: HEEBO, fontSize: 17, fontWeight: 900, color: '#1E293B' }}>הלקוחות שלי</div>
            <div style={{
              padding: '3px 10px', borderRadius: 10, background: '#EF444418',
              fontFamily: RUBIK, fontSize: 10, fontWeight: 800, color: '#EF4444', opacity: warningPulse,
            }}>
              ⚠️ {atRisk} בסיכון
            </div>
          </div>
          <div style={{
            fontFamily: HEEBO, fontSize: 11, fontWeight: 600, color: '#EF4444', marginBottom: 10,
            padding: '4px 10px', borderRadius: 8, background: '#EF444408', border: '1px solid #EF444415',
          }}>
            {atRisk} לקוחות לא פנו אליך מעל 30 יום · אין מעקב
          </div>

          {CLIENTS_DATA.map((client, i) => {
            const s = spring({ frame: Math.max(0, frame - i * 4 - 5), fps, config: SPRING.ui, durationInFrames: 12 });
            const riskColor = client.risk === 'high' ? '#EF4444' : client.risk === 'medium' ? '#F59E0B' : '#22C55E';
            const shake = client.risk === 'high' ? Math.sin(frame * 0.3 + i * 2) * 1.5 : 0;

            return (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px', marginBottom: 5, borderRadius: 14,
                background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                border: client.risk === 'high' ? '1px solid #FCA5A530' : '1px solid rgba(0,0,0,0.04)',
                opacity: s, transform: `translateX(${interpolate(s, [0, 1], [35, 0]) + shake}px)`,
              }}>
                <div>
                  <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: '#1E293B' }}>{client.name}</div>
                  <div style={{ fontFamily: HEEBO, fontSize: 9, fontWeight: 600, color: '#94A3B8' }}>קשר אחרון: {client.lastContact}</div>
                </div>
                <div style={{
                  width: 9, height: 9, borderRadius: '50%', background: riskColor,
                  boxShadow: `0 0 ${client.risk === 'high' ? pulse(frame, 0.08, 4, 10) : 4}px ${riskColor}40`,
                }} />
              </div>
            );
          })}
        </div>
      </DeviceFrame>

      {frame > 100 && (
        <div style={{
          position: 'absolute', bottom: 70,
          padding: '12px 24px', borderRadius: 16,
          background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)',
          border: '1px solid #EF444420',
          fontFamily: HEEBO, fontSize: 20, fontWeight: 900, color: '#EF4444', direction: 'rtl',
          opacity: spring({ frame: Math.max(0, frame - 100), fps, config: SPRING.hero, durationInFrames: 18 }),
        }}>
          לקוח שנעלם = הכנסה שאבדה 📉
        </div>
      )}

      <NoiseLayer opacity={0.012} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 3: AI ENTRANCE — Smart client care [225-390f = 7.5-13s]
// ═══════════════════════════════════════════════════════════
const AIEntranceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const badgeSpring = spring({ frame: Math.max(0, frame - 12), fps, config: SPRING.punch, durationInFrames: 15 });

  const actions = [
    { emoji: '📞', text: 'התקשר לרונית — 45 ימים ללא קשר', priority: 'דחוף', color: '#EF4444', delay: 25 },
    { emoji: '🎁', text: 'שלח הטבה לדנה — סיכון נטישה גבוה', priority: 'גבוה', color: '#F59E0B', delay: 38 },
    { emoji: '⭐', text: 'בקש המלצה מלב — שביעות רצון 98%', priority: 'הזדמנות', color: '#22C55E', delay: 51 },
    { emoji: '📧', text: 'שלח סיכום פגישה לנובה — מעקב', priority: 'בינוני', color: '#3B82F6', delay: 64 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: '#FFFBF5', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={4} color={CL.accent} speed={0.012} maxSize={100} />
      <ParticleField count={8} color={CL.accent} speed={0.3} />

      <div style={{
        position: 'absolute', width: 800, height: 800, borderRadius: '50%',
        background: `radial-gradient(circle, ${CL.accent}06 0%, transparent 60%)`,
        opacity: pulse(frame, 0.05, 0.4, 0.7),
      }} />

      <div style={{
        width: 80, height: 80, borderRadius: '50%', background: CL.gradient,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        boxShadow: `0 16px 50px ${CL.accent}30, 0 0 ${pulse(frame, 0.06, 12, 25)}px ${CL.accent}25`,
        transform: `scale(${interpolate(badgeSpring, [0, 1], [0.4, 1])})`,
        opacity: badgeSpring, marginBottom: 28,
      }}>
        <span style={{ fontSize: 36 }}>🤝</span>
      </div>

      <BreathingRing color={CL.accent} size={200} speed={0.05} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        {actions.map((action, i) => {
          const s = spring({ frame: Math.max(0, frame - action.delay), fps, config: SPRING.hero, durationInFrames: 16 });
          const iconFloat = pulse(frame, 0.04 + i * 0.005, -2, 2);
          return (
            <div key={i} style={{
              width: 720, padding: '14px 20px', borderRadius: 18,
              background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
              border: `1px solid ${action.color}18`,
              boxShadow: `0 4px 16px ${action.color}06`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', direction: 'rtl',
              opacity: s, transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px)`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24, transform: `translateY(${iconFloat}px)` }}>{action.emoji}</span>
                <span style={{ fontFamily: HEEBO, fontSize: 15, fontWeight: 700, color: '#1E293B' }}>{action.text}</span>
              </div>
              <span style={{
                fontFamily: HEEBO, fontSize: 10, fontWeight: 700, color: action.color,
                background: `${action.color}10`, padding: '3px 10px', borderRadius: 8,
              }}>{action.priority}</span>
            </div>
          );
        })}
      </div>

      <div style={{
        position: 'absolute', bottom: 280,
        padding: '10px 24px', borderRadius: 16,
        background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)',
      }}>
        <TextReveal text="AI ששומר על הלקוחות." delay={40} fontSize={40} fontWeight={900} color="#1E293B" mode="words" stagger={3} />
      </div>

      <NoiseLayer opacity={0.012} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 4: SHOWCASE — Client portal [390-555f = 13-18.5s]
// ═══════════════════════════════════════════════════════════
const ShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const craneY = interpolate(frame, [0, 165], [50, -30], { extrapolateRight: 'clamp' });
  const healthSpring = spring({ frame: Math.max(0, frame - 12), fps, config: { damping: 20, stiffness: 60, mass: 1 }, durationInFrames: 30 });
  const aiSpring = spring({ frame: Math.max(0, frame - 60), fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ backgroundColor: '#FFFBF5', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={3} color={CL.accent} speed={0.01} maxSize={90} />

      <div style={{ transform: `translateY(${craneY}px)` }}>
        <DeviceFrame scale={1.05} delay={0} shadowIntensity={0.5}>
          <div style={{ width: '100%', height: '100%', background: '#FAFBFC', padding: '55px 16px 16px', direction: 'rtl' }}>
            <div style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 900, color: '#1E293B', marginBottom: 10 }}>פרופיל לקוח — רונית כץ</div>

            <div style={{
              padding: 12, borderRadius: 16, background: '#fff',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.04)', marginBottom: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: '#64748B' }}>Health Score</span>
                <span style={{ fontFamily: RUBIK, fontSize: 20, fontWeight: 800, color: '#EF4444' }}>
                  {Math.round(34 * healthSpring)}%
                </span>
              </div>
              <div style={{ width: '100%', height: 5, borderRadius: 3, background: '#F1F5F9' }}>
                <div style={{
                  width: `${34 * healthSpring}%`, height: '100%', borderRadius: 3,
                  background: 'linear-gradient(90deg, #EF4444, #F59E0B)',
                  boxShadow: `0 0 ${pulse(frame, 0.05, 2, 6)}px #EF444430`,
                }} />
              </div>
            </div>

            <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 6 }}>ציר זמן</div>
            {[
              { time: 'היום', event: 'AI שלח תזכורת', emoji: '🤖' },
              { time: '15 יום', event: 'פתחה הצעת מחיר', emoji: '📄' },
              { time: '45 יום', event: 'שיחה אחרונה', emoji: '📞' },
            ].map((item, i) => {
              const s = spring({ frame: Math.max(0, frame - 22 - i * 6), fps, config: SPRING.ui, durationInFrames: 14 });
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', marginBottom: 4, borderRadius: 10,
                  background: '#fff', border: '1px solid rgba(0,0,0,0.04)',
                  opacity: s, transform: `translateX(${interpolate(s, [0, 1], [20, 0])}px)`,
                }}>
                  <span style={{ fontSize: 14 }}>{item.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: '#1E293B' }}>{item.event}</div>
                    <div style={{ fontFamily: HEEBO, fontSize: 9, fontWeight: 600, color: '#94A3B8' }}>{item.time}</div>
                  </div>
                </div>
              );
            })}

            <div style={{
              marginTop: 6, padding: 10, borderRadius: 12, background: CL.gradient,
              boxShadow: `0 6px 20px ${CL.accent}18`,
              opacity: aiSpring, transform: `translateY(${interpolate(aiSpring, [0, 1], [20, 0])}px)`,
            }}>
              <div style={{ fontFamily: HEEBO, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.65)', marginBottom: 2 }}>🧠 המלצת AI</div>
              <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: '#fff', lineHeight: 1.5 }}>
                רונית לא ענתה 45 ימים. שלח הודעה אישית עם הטבת חידוש.
              </div>
            </div>
          </div>
        </DeviceFrame>
      </div>
      <NoiseLayer opacity={0.012} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 5: FEATURES — Client capabilities [555-700f = 18.5-23.3s]
// ═══════════════════════════════════════════════════════════
const FeaturesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const features = [
    { icon: '💓', title: 'Health Score', desc: 'AI מחשב ציון בריאות לכל לקוח — שילוב של תדירות קשר, היסטוריית רכישות ושביעות רצון.', color: CL.accent },
    { icon: '🔔', title: 'התראות נטישה', desc: 'AI מזהה לקוחות שעומדים לעזוב — לפני שזה קורה — ומציע פעולה.', color: '#EF4444' },
    { icon: '📋', title: 'מעקב אוטומטי', desc: 'תזכורות, סיכומי פגישות, ומעקב follow-up — בלי שתשכח אף לקוח.', color: '#3B82F6' },
    { icon: '🎯', title: 'הזדמנויות upsell', desc: 'AI מזהה לקוחות עם פוטנציאל — ומציע הצעות מותאמות אישית.', color: '#22C55E' },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: '#FFFBF5', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={3} color={CL.accent} speed={0.01} maxSize={90} />
      <ParticleField count={8} color={CL.accent} speed={0.3} />

      <div style={{
        position: 'absolute', top: 55,
        padding: '10px 24px', borderRadius: 16,
        background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)',
        fontFamily: HEEBO, fontSize: 26, fontWeight: 900, color: '#1E293B', direction: 'rtl',
        opacity: spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 }),
      }}>
        מה Client יודע לעשות?
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', marginTop: 50 }}>
        {features.map((f, i) => {
          const delay = i * 18;
          const s = spring({ frame: Math.max(0, frame - delay - 12), fps, config: SPRING.ui, durationInFrames: 20 });
          const iconFloat = pulse(frame, 0.04 + i * 0.006, -2, 2);
          return (
            <div key={i} style={{
              width: 700, padding: '16px 20px', borderRadius: 20,
              background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
              border: `1px solid ${f.color}18`,
              boxShadow: `0 4px 20px ${f.color}06`,
              display: 'flex', alignItems: 'flex-start', gap: 14, direction: 'rtl',
              opacity: s, transform: `translateY(${interpolate(s, [0, 1], [25, 0])}px)`,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: `${f.color}08`, border: `1px solid ${f.color}18`,
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                fontSize: 20, flexShrink: 0,
                transform: `translateY(${iconFloat}px)`,
              }}>
                {f.icon}
              </div>
              <div>
                <div style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 800, color: f.color }}>{f.title}</div>
                <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 600, color: '#64748B', lineHeight: 1.5, marginTop: 2 }}>{f.desc}</div>
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
// SCENE 6: RESULTS — Animated counters [700-820f = 23.3-27.3s]
// ═══════════════════════════════════════════════════════════
const ResultsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stats = [
    { target: 45, prefix: '-', suffix: '%', label: 'נטישת לקוחות', delay: 0 },
    { target: 60, prefix: '+', suffix: '%', label: 'שביעות רצון', delay: 15 },
    { target: 92, prefix: '', suffix: '%', label: 'שימור לקוחות', delay: 30 },
    { target: 3, prefix: 'x', suffix: '', label: 'upsell אוטומטי', delay: 45 },
  ];

  const testSpring = spring({ frame: Math.max(0, frame - 80), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: '#FFFBF5', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={4} color={CL.accent} speed={0.01} maxSize={100} />

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
              border: `1px solid ${CL.accent}12`, textAlign: 'center', direction: 'rtl',
              opacity: s, transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`,
              boxShadow: `0 4px 20px ${CL.accent}08`,
            }}>
              <div style={{
                fontFamily: RUBIK, fontSize: 48, fontWeight: 800,
                background: CL.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
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
            "לקוחה שכמעט עזבה חזרה בזכות תזכורת AI — וסגרה עסקה כפולה."
          </div>
          <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 600, color: '#94A3B8', marginTop: 4 }}>
            — בעלת משרד אדריכלות
          </div>
        </div>
      )}

      <NoiseLayer opacity={0.012} />
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
    <AbsoluteFill style={{ background: CL.gradient, justifyContent: 'center', alignItems: 'center', opacity: bgOp, overflow: 'hidden' }}>
      <BreathingRing color="rgba(255,255,255,0.15)" size={450} speed={0.05} />
      <ParticleField count={12} color="rgba(255,255,255,0.25)" speed={0.5} />

      <TextReveal text="AI ששומר על כל לקוח" delay={5} fontSize={48} fontWeight={900} color="#fff" mode="words" stagger={2} style={{ textAlign: 'center' }} />

      <div style={{
        marginTop: 24, padding: '8px 20px', borderRadius: 12,
        background: 'rgba(255,255,255,0.12)',
        fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.7)', direction: 'rtl',
        opacity: subSpring,
      }}>
        מעקב. שימור. צמיחה.
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPOSITION — 30 seconds (900 frames)
// ═══════════════════════════════════════════════════════════
export const ClientVideo: React.FC = () => {
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
        <CTAEndcard variant="light" accentColor={CL.accent} tagline="AI ששומר על כל לקוח" />
      </Sequence>
    </AbsoluteFill>
  );
};
