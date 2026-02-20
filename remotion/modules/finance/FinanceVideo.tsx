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

const FN = MODULE_COLORS.finance;

// ═══════════════════════════════════════════════════════════
// SCENE 1: HOOK — Cash flow chart shoots up [0-90f = 0-3s]
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lineProgress = interpolate(frame, [0, 45], [0, 1], { extrapolateRight: 'clamp' });

  const chartPoints = [
    { x: 100, y: 600 }, { x: 220, y: 540 }, { x: 340, y: 580 },
    { x: 460, y: 440 }, { x: 580, y: 380 }, { x: 700, y: 280 },
    { x: 820, y: 200 }, { x: 940, y: 100 },
  ];
  const visiblePoints = Math.floor(lineProgress * chartPoints.length);

  const amountSpring = spring({ frame: Math.max(0, frame - 20), fps, config: { damping: 18, stiffness: 50, mass: 1 }, durationInFrames: 40 });
  const amount = Math.round(847000 * amountSpring);

  const subSpring = spring({ frame: Math.max(0, frame - 50), fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ backgroundColor: '#040D08', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={4} color={FN.accent} speed={0.015} />
      <ScanLines color={FN.accent} speed1={1.5} speed2={1.0} />

      <div style={{
        position: 'absolute', width: 800, height: 800, borderRadius: '50%',
        background: `radial-gradient(circle, ${FN.accent}10 0%, transparent 60%)`,
        opacity: pulse(frame, 0.06, 0.5, 0.8),
      }} />

      <svg width="1080" height="800" viewBox="0 0 1080 800" style={{ position: 'absolute', top: '20%' }}>
        {[200, 350, 500, 650].map((y, i) => (
          <line key={i} x1={80} y1={y} x2={1000} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
        ))}

        {visiblePoints >= 2 && (
          <>
            <polyline
              points={chartPoints.slice(0, visiblePoints).map(p => `${p.x},${p.y}`).join(' ')}
              fill="none" stroke={FN.accent} strokeWidth={4}
              strokeLinecap="round" strokeLinejoin="round"
              style={{ filter: `drop-shadow(0 0 12px ${FN.accent}60)` }}
            />
            <polygon
              points={`${chartPoints[0].x},700 ${chartPoints.slice(0, visiblePoints).map(p => `${p.x},${p.y}`).join(' ')} ${chartPoints[Math.max(0, visiblePoints - 1)].x},700`}
              fill="url(#greenGradHook)" opacity={0.12}
            />
          </>
        )}

        <defs>
          <linearGradient id="greenGradHook" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={FN.accent} />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>

        {chartPoints.slice(0, visiblePoints).map((p, i) => {
          const dotS = spring({ frame: Math.max(0, frame - i * 5), fps, config: SPRING.punch, durationInFrames: 10 });
          const glow = pulse(frame, 0.06, 4, 8);
          return (
            <circle key={i} cx={p.x} cy={p.y} r={6 * dotS} fill={FN.accent}
              style={{ filter: `drop-shadow(0 0 ${glow}px ${FN.accent})` }}
            />
          );
        })}
      </svg>

      <div style={{
        position: 'absolute', top: '10%',
        padding: '10px 28px', borderRadius: 18,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
      }}>
        <div style={{
          fontFamily: RUBIK, fontSize: 72, fontWeight: 800, color: BRAND.white,
          opacity: amountSpring, textShadow: `0 0 40px ${FN.accent}40`,
        }}>
          ₪{amount.toLocaleString()}
        </div>
      </div>
      <div style={{
        position: 'absolute', top: '19%',
        padding: '6px 18px', borderRadius: 12, background: 'rgba(0,0,0,0.4)',
        fontFamily: HEEBO, fontSize: 24, fontWeight: 700, color: BRAND.muted,
        opacity: subSpring, direction: 'rtl',
      }}>
        תזרים מזומנים חודשי
      </div>

      <NoiseLayer opacity={0.025} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 2: PROBLEM — Messy invoices [90-225f = 3-7.5s]
// ═══════════════════════════════════════════════════════════
const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const INVOICES = [
    { client: 'חברת אלון', amount: '₪12,400', status: 'לא שולם', overdue: true },
    { client: 'סטודיו ליאור', amount: '₪3,800', status: 'ממתין', overdue: false },
    { client: 'נדל"ן כהן', amount: '₪28,000', status: 'איחור 45 יום', overdue: true },
    { client: 'מעצבת שרה', amount: '₪5,200', status: 'שולם חלקי', overdue: false },
    { client: 'יועצת מיכל', amount: '₪8,900', status: 'לא שולם', overdue: true },
  ];

  const debtSpring = spring({ frame: Math.max(0, frame - 5), fps, config: { damping: 18, stiffness: 50, mass: 1 }, durationInFrames: 30 });
  const debtAmount = Math.round(49300 * debtSpring);
  const warningPulse = pulse(frame, 0.1, 0.6, 1.0);

  return (
    <AbsoluteFill style={{ backgroundColor: '#040D08', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={3} color="#EF4444" speed={0.02} maxSize={100} />

      <DeviceFrame scale={1.05} delay={0}>
        <div style={{ width: '100%', height: '100%', background: '#0F0F12', padding: '55px 16px 16px', direction: 'rtl' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 900, color: BRAND.white }}>חשבוניות</div>
            <div style={{
              padding: '4px 12px', borderRadius: 10, background: '#EF444420',
              fontFamily: RUBIK, fontSize: 12, fontWeight: 800, color: '#EF4444', opacity: warningPulse,
            }}>
              ₪{debtAmount.toLocaleString()} חוב
            </div>
          </div>

          {INVOICES.map((inv, i) => {
            const s = spring({ frame: Math.max(0, frame - i * 4 - 5), fps, config: SPRING.ui, durationInFrames: 12 });
            const shake = inv.overdue ? Math.sin(frame * 0.3 + i * 2) * 2 : 0;
            return (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px', marginBottom: 6, borderRadius: 12,
                background: 'rgba(255,255,255,0.03)',
                border: inv.overdue ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(255,255,255,0.06)',
                opacity: s, transform: `translateX(${interpolate(s, [0, 1], [40, 0]) + shake}px)`,
              }}>
                <div>
                  <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: BRAND.white }}>{inv.client}</div>
                  <div style={{ fontFamily: HEEBO, fontSize: 10, fontWeight: 600, color: inv.overdue ? '#EF4444' : '#F59E0B' }}>{inv.status}</div>
                </div>
                <span style={{
                  fontFamily: RUBIK, fontSize: 14, fontWeight: 700,
                  color: inv.overdue ? '#EF4444' : BRAND.white,
                  opacity: inv.overdue ? pulse(frame, 0.08, 0.6, 1.0) : 1,
                }}>{inv.amount}</span>
              </div>
            );
          })}
        </div>
      </DeviceFrame>

      {frame > 100 && (
        <div style={{
          position: 'absolute', bottom: 70,
          padding: '12px 24px', borderRadius: 16,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)',
          border: '1px solid #EF444430',
          fontFamily: HEEBO, fontSize: 22, fontWeight: 900, color: '#EF4444', direction: 'rtl',
          opacity: spring({ frame: Math.max(0, frame - 100), fps, config: SPRING.hero, durationInFrames: 18 }),
        }}>
          כשהכסף לא מנוהל — העסק מפסיד 💸
        </div>
      )}

      <NoiseLayer opacity={0.025} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 3: AI ENTRANCE — Predictions + sweep [225-390f = 7.5-13s]
// ═══════════════════════════════════════════════════════════
const AIEntranceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lightProgress = interpolate(frame, [0, 50], [0, 1], { extrapolateRight: 'clamp' });
  const isLight = lightProgress > 0.5;

  const badgeSpring = spring({ frame: Math.max(0, frame - 15), fps, config: SPRING.punch, durationInFrames: 15 });

  const predictions = [
    { label: 'צפי הכנסות חודש הבא', value: '₪94,200', emoji: '📈', color: '#22C55E' },
    { label: 'חשבוניות שישולמו', value: '3/5', emoji: '✅', color: '#3B82F6' },
    { label: 'סיכון תזרימי', value: 'נמוך', emoji: '🛡️', color: '#F59E0B' },
  ];

  return (
    <AbsoluteFill style={{
      backgroundColor: isLight ? '#F0FDF4' : '#040D08',
      justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
    }}>
      <FloatingOrbs count={4} color={FN.accent} speed={0.015} />
      {!isLight && <ScanLines color={FN.accent} />}

      <div style={{
        position: 'absolute', width: 900, height: 900, borderRadius: '50%',
        background: `radial-gradient(circle, ${FN.accent}${isLight ? '06' : '10'} 0%, transparent 60%)`,
        transform: `scale(${0.3 + lightProgress * 1.5})`,
      }} />

      <div style={{
        width: 85, height: 85, borderRadius: '50%', background: FN.gradient,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        boxShadow: `0 20px 50px ${FN.accent}40, 0 0 ${pulse(frame, 0.06, 15, 30)}px ${FN.accent}30`,
        transform: `scale(${interpolate(badgeSpring, [0, 1], [0.4, 1])})`,
        opacity: badgeSpring, marginBottom: 24,
      }}>
        <span style={{ fontSize: 40 }}>💰</span>
      </div>

      <BreathingRing color={FN.accent} size={220} speed={0.05} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
        {predictions.map((pred, i) => {
          const s = spring({ frame: Math.max(0, frame - 28 - i * 8), fps, config: SPRING.hero, durationInFrames: 16 });
          const iconFloat = pulse(frame, 0.04 + i * 0.005, -2, 2);
          return (
            <div key={i} style={{
              width: 680, padding: '16px 24px', borderRadius: 20,
              background: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(12px)',
              border: `1px solid ${pred.color}20`,
              boxShadow: isLight ? `0 4px 20px ${pred.color}08` : 'none',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl',
              opacity: s, transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px)`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22, transform: `translateY(${iconFloat}px)` }}>{pred.emoji}</span>
                <span style={{
                  fontFamily: HEEBO, fontSize: 16, fontWeight: 700,
                  color: isLight ? '#1E293B' : BRAND.white,
                }}>{pred.label}</span>
              </div>
              <span style={{ fontFamily: RUBIK, fontSize: 20, fontWeight: 800, color: pred.color }}>
                {pred.value}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{
        position: 'absolute', bottom: 280,
        padding: '10px 24px', borderRadius: 16,
        background: isLight ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)',
      }}>
        <TextReveal text="AI שחוזה את התזרים." delay={35} fontSize={42} fontWeight={900} color={isLight ? '#1E293B' : BRAND.white} mode="words" stagger={3} />
      </div>

      <NoiseLayer opacity={isLight ? 0.012 : 0.025} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 4: SHOWCASE — Financial dashboard [390-555f = 13-18.5s]
// ═══════════════════════════════════════════════════════════
const ShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const craneY = interpolate(frame, [0, 165], [50, -30], { extrapolateRight: 'clamp' });
  const insightSpring = spring({ frame: Math.max(0, frame - 60), fps, config: SPRING.hero, durationInFrames: 18 });
  const revSpring = spring({ frame: Math.max(0, frame - 12), fps, config: { damping: 20, stiffness: 60, mass: 1 }, durationInFrames: 35 });

  return (
    <AbsoluteFill style={{ backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={3} color={FN.accent} speed={0.01} maxSize={100} />

      <div style={{ transform: `translateY(${craneY}px)` }}>
        <DeviceFrame scale={1.05} delay={0} shadowIntensity={0.5}>
          <div style={{ width: '100%', height: '100%', background: '#FAFBFC', padding: '55px 16px 16px', direction: 'rtl' }}>
            <div style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 900, color: '#1E293B', marginBottom: 10 }}>סיכום פיננסי</div>

            <div style={{
              padding: 14, borderRadius: 16, background: '#fff',
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.04)', marginBottom: 10,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: '#64748B' }}>הכנסות החודש</span>
                <span style={{ fontFamily: RUBIK, fontSize: 22, fontWeight: 800, color: FN.accent }}>
                  ₪{Math.round(94200 * revSpring).toLocaleString()}
                </span>
              </div>
              <div style={{ width: '100%', height: 5, borderRadius: 3, background: '#F1F5F9', marginTop: 8 }}>
                <div style={{
                  width: `${78 * revSpring}%`, height: '100%', borderRadius: 3,
                  background: FN.gradient,
                  boxShadow: `0 0 ${pulse(frame, 0.04, 3, 8)}px ${FN.accent}30`,
                }} />
              </div>
              <div style={{ fontFamily: HEEBO, fontSize: 10, fontWeight: 600, color: '#22C55E', marginTop: 5 }}>📈 +23% מהחודש שעבר</div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              {[
                { label: 'חשבוניות', value: '12', emoji: '📄' },
                { label: 'שולם', value: '9', emoji: '✅' },
                { label: 'ממתין', value: '3', emoji: '⏳' },
              ].map((s, i) => {
                const cardSpring = spring({ frame: Math.max(0, frame - 22 - i * 4), fps, config: SPRING.ui, durationInFrames: 14 });
                return (
                  <div key={i} style={{
                    flex: 1, padding: '10px 8px', borderRadius: 12, background: '#fff',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.04)',
                    textAlign: 'center', opacity: cardSpring,
                    transform: `translateY(${interpolate(cardSpring, [0, 1], [15, 0])}px)`,
                  }}>
                    <div style={{ fontSize: 16 }}>{s.emoji}</div>
                    <div style={{ fontFamily: RUBIK, fontSize: 18, fontWeight: 800, color: '#1E293B' }}>{s.value}</div>
                    <div style={{ fontFamily: HEEBO, fontSize: 9, fontWeight: 600, color: '#64748B' }}>{s.label}</div>
                  </div>
                );
              })}
            </div>

            <div style={{
              padding: 12, borderRadius: 14, background: FN.gradient,
              boxShadow: `0 8px 24px ${FN.accent}20`,
              opacity: insightSpring,
              transform: `translateY(${interpolate(insightSpring, [0, 1], [25, 0])}px)`,
            }}>
              <div style={{ fontFamily: HEEBO, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.65)', marginBottom: 3 }}>🧠 חיזוי AI</div>
              <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: '#fff', lineHeight: 1.5 }}>
                3 חשבוניות צפויות להיפרע בשבוע הקרוב. סה"כ: ₪24,200.
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
// SCENE 5: FEATURES — Finance capabilities [555-700f = 18.5-23.3s]
// ═══════════════════════════════════════════════════════════
const FeaturesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const features = [
    { icon: '📊', title: 'חיזוי תזרים AI', desc: 'AI חוזה הכנסות והוצאות 90 יום קדימה — בדיוק של 95%.', color: '#22C55E' },
    { icon: '🧾', title: 'חשבוניות חכמות', desc: 'יצירה, שליחה ומעקב אוטומטי. תזכורת תשלום בזמן.', color: '#3B82F6' },
    { icon: '📈', title: 'דוחות פיננסיים', desc: 'רווח והפסד, מאזן, ותזרים — בלחיצה. מותאם לרואה חשבון.', color: '#F59E0B' },
    { icon: '🔔', title: 'התראות סיכון', desc: 'AI מזהה בעיות תזרימיות לפני שהן קורות — ומציע פתרון.', color: '#EF4444' },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={3} color={FN.accent} speed={0.01} maxSize={90} />
      <ParticleField count={8} color={FN.accent} speed={0.3} />

      <div style={{
        position: 'absolute', top: 55,
        padding: '10px 24px', borderRadius: 16,
        background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)',
        fontFamily: HEEBO, fontSize: 26, fontWeight: 900, color: '#1E293B', direction: 'rtl',
        opacity: spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 }),
      }}>
        מה Finance יודע לעשות?
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
    { target: 23, prefix: '+', suffix: '%', label: 'הכנסות', delay: 0 },
    { target: 80, prefix: '-', suffix: '%', label: 'זמן חשבונאות', delay: 15 },
    { target: 95, prefix: '', suffix: '%', label: 'דיוק חיזוי תזרים', delay: 30 },
    { target: 0, prefix: '₪', suffix: '', label: 'חובות שנשכחו', delay: 45 },
  ];

  const testSpring = spring({ frame: Math.max(0, frame - 80), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={4} color={FN.accent} speed={0.01} maxSize={100} />

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
              border: `1px solid ${FN.accent}12`, textAlign: 'center', direction: 'rtl',
              opacity: s, transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`,
              boxShadow: `0 4px 20px ${FN.accent}08`,
            }}>
              <div style={{
                fontFamily: RUBIK, fontSize: 48, fontWeight: 800,
                background: FN.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
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
            "מאז שהכנסתי את Finance, הרו"ח שלי שואל אותי איך הכל כל כך מסודר."
          </div>
          <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 600, color: '#94A3B8', marginTop: 4 }}>
            — בעל עסק, תחום שירותים
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
    <AbsoluteFill style={{ background: FN.gradient, justifyContent: 'center', alignItems: 'center', opacity: bgOp, overflow: 'hidden' }}>
      <BreathingRing color="rgba(255,255,255,0.15)" size={450} speed={0.05} />
      <ParticleField count={12} color="rgba(255,255,255,0.25)" speed={0.5} />

      <TextReveal text="AI שמנהל את הכסף שלך" delay={5} fontSize={48} fontWeight={900} color="#fff" mode="words" stagger={2} style={{ textAlign: 'center' }} />

      <div style={{
        marginTop: 24, padding: '8px 20px', borderRadius: 12,
        background: 'rgba(255,255,255,0.12)',
        fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.7)', direction: 'rtl',
        opacity: subSpring,
      }}>
        חיזוי. שליטה. צמיחה.
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPOSITION — 30 seconds (900 frames)
// ═══════════════════════════════════════════════════════════
export const FinanceVideo: React.FC = () => {
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
        <CTAEndcard variant="light" accentColor={FN.accent} tagline="AI שמנהל את הכסף שלך" />
      </Sequence>
    </AbsoluteFill>
  );
};
