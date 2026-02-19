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

const FINANCE = MODULE_COLORS.finance;

// ═══════════════════════════════════════════════════════════
// HOOK — Cash flow line chart shoots up
// [0-36f]
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Chart line drawing
  const lineProgress = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  // Points on the chart
  const chartPoints = [
    { x: 100, y: 600 },
    { x: 250, y: 520 },
    { x: 400, y: 560 },
    { x: 550, y: 420 },
    { x: 700, y: 350 },
    { x: 850, y: 200 },
    { x: 980, y: 100 },
  ];

  const visiblePoints = Math.floor(lineProgress * chartPoints.length);

  // Amount counter
  const amountSpring = spring({ frame: Math.max(0, frame - 18), fps, config: SPRING.punch, durationInFrames: 12 });
  const amount = Math.round(interpolate(amountSpring, [0, 1], [0, 847000]));

  // Green glow pulse
  const glowPulse = Math.sin(frame * 0.1) * 0.3 + 0.7;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center' }}>
      {/* Green ambient glow */}
      <div style={{ position: 'absolute', width: 800, height: 800, borderRadius: '50%', background: `radial-gradient(circle, ${FINANCE.accent}12 0%, transparent 60%)`, opacity: glowPulse }} />

      {/* Chart SVG */}
      <svg width="1080" height="800" viewBox="0 0 1080 800" style={{ position: 'absolute', top: '20%' }}>
        {/* Grid lines */}
        {[200, 350, 500, 650].map((y, i) => (
          <line key={i} x1={80} y1={y} x2={1000} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
        ))}

        {/* Chart line */}
        {visiblePoints >= 2 && (
          <polyline
            points={chartPoints.slice(0, visiblePoints).map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={FINANCE.accent}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 0 12px ${FINANCE.accent}60)` }}
          />
        )}

        {/* Gradient fill under line */}
        {visiblePoints >= 2 && (
          <polygon
            points={`${chartPoints[0].x},700 ${chartPoints.slice(0, visiblePoints).map(p => `${p.x},${p.y}`).join(' ')} ${chartPoints[Math.max(0, visiblePoints - 1)].x},700`}
            fill={`url(#greenGrad)`}
            opacity={0.15}
          />
        )}

        <defs>
          <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={FINANCE.accent} />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>

        {/* Dots */}
        {chartPoints.slice(0, visiblePoints).map((p, i) => {
          const dotSpring = spring({ frame: Math.max(0, frame - i * 3), fps, config: SPRING.punch, durationInFrames: 8 });
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={6 * dotSpring}
              fill={FINANCE.accent}
              style={{ filter: `drop-shadow(0 0 8px ${FINANCE.accent})` }}
            />
          );
        })}
      </svg>

      {/* Amount */}
      <div style={{ position: 'absolute', top: '12%', fontFamily: RUBIK, fontSize: 80, fontWeight: 800, color: BRAND.white, opacity: amountSpring, textShadow: `0 0 40px ${FINANCE.accent}40` }}>
        ₪{amount.toLocaleString()}
      </div>
      <div style={{ position: 'absolute', top: '20%', fontFamily: HEEBO, fontSize: 26, fontWeight: 700, color: BRAND.muted, opacity: amountSpring, direction: 'rtl' }}>
        תזרים מזומנים חודשי
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SETUP — Messy finances
// [36-105f]
// ═══════════════════════════════════════════════════════════
const SetupScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const INVOICES = [
    { client: 'חברת אלון', amount: '₪12,400', status: 'לא שולם', overdue: true },
    { client: 'סטודיו ליאור', amount: '₪3,800', status: 'ממתין', overdue: false },
    { client: 'נדל"ן כהן', amount: '₪28,000', status: 'איחור 45 יום', overdue: true },
    { client: 'מעצבת שרה', amount: '₪5,200', status: 'שולם חלקי', overdue: false },
    { client: 'יועצת מיכל', amount: '₪8,900', status: 'לא שולם', overdue: true },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center' }}>
      <PhoneFrame scale={1.1} delay={0}>
        <div style={{ width: '100%', height: '100%', background: '#0F0F12', padding: '60px 20px 20px', direction: 'rtl' }}>
          <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 900, color: BRAND.white, marginBottom: 6 }}>חשבוניות</div>
          <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: '#EF4444', marginBottom: 14 }}>⚠️ ₪49,300 חוב פתוח</div>

          {INVOICES.map((inv, i) => {
            const s = spring({ frame: Math.max(0, frame - i * 4 - 5), fps, config: SPRING.ui, durationInFrames: 12 });
            const shake = inv.overdue ? Math.sin(frame * 0.3 + i * 2) * 1.5 : 0;
            return (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 14px', marginBottom: 8, borderRadius: 14,
                background: 'rgba(255,255,255,0.04)',
                border: inv.overdue ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.06)',
                opacity: s, transform: `translateX(${interpolate(s, [0, 1], [40, 0]) + shake}px)`,
              }}>
                <div>
                  <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: BRAND.white }}>{inv.client}</div>
                  <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 600, color: inv.overdue ? '#EF4444' : '#F59E0B' }}>{inv.status}</div>
                </div>
                <span style={{ fontFamily: RUBIK, fontSize: 16, fontWeight: 700, color: inv.overdue ? '#EF4444' : BRAND.white }}>{inv.amount}</span>
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
// AI ENTRANCE — Smart cash flow prediction
// [105-180f]
// ═══════════════════════════════════════════════════════════
const AIEntranceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Light transition dark→light
  const lightProgress = interpolate(frame, [0, 45], [0, 1], { extrapolateRight: 'clamp' });
  const isLight = lightProgress > 0.5;

  const badgeSpring = spring({ frame: Math.max(0, frame - 20), fps, config: SPRING.punch, durationInFrames: 15 });

  // Prediction cards
  const predictions = [
    { label: 'צפי הכנסות חודש הבא', value: '₪94,200', emoji: '📈' },
    { label: 'חשבוניות שישולמו', value: '3/5', emoji: '✅' },
    { label: 'סיכון תזרימי', value: 'נמוך', emoji: '🛡️' },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: isLight ? BRAND.bgLight : BRAND.bgDark, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'absolute', width: 900, height: 900, borderRadius: '50%', background: `radial-gradient(circle, ${FINANCE.accent}${isLight ? '08' : '12'} 0%, transparent 60%)`, transform: `scale(${0.3 + lightProgress * 1.5})` }} />

      {/* AI Badge */}
      <div style={{
        width: 90, height: 90, borderRadius: '50%', background: FINANCE.gradient,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        boxShadow: `0 20px 50px ${FINANCE.accent}40`,
        transform: `scale(${interpolate(badgeSpring, [0, 1], [0.4, 1])})`,
        opacity: badgeSpring, marginBottom: 32,
      }}>
        <span style={{ fontSize: 42 }}>💰</span>
      </div>

      {/* Prediction cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        {predictions.map((pred, i) => {
          const s = spring({ frame: Math.max(0, frame - 30 - i * 6), fps, config: SPRING.hero, durationInFrames: 16 });
          return (
            <GlassCard key={i} variant={isLight ? 'light' : 'dark'} delay={30 + i * 6} width={680}>
              <div style={{ padding: '18px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{pred.emoji}</span>
                  <span style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 700, color: isLight ? '#1E293B' : BRAND.white }}>{pred.label}</span>
                </div>
                <span style={{ fontFamily: RUBIK, fontSize: 22, fontWeight: 800, color: FINANCE.accent }}>{pred.value}</span>
              </div>
            </GlassCard>
          );
        })}
      </div>

      <div style={{ position: 'absolute', bottom: 300 }}>
        <TextReveal text="AI שחוזה את התזרים." delay={40} fontSize={44} fontWeight={900} color={isLight ? '#1E293B' : BRAND.white} mode="words" stagger={3} />
      </div>

      <NoiseLayer opacity={isLight ? 0.015 : 0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SHOWCASE — Clean financial dashboard
// [180-300f]
// ═══════════════════════════════════════════════════════════
const ShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const craneY = interpolate(frame, [0, 120], [50, -30], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgLight, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${FINANCE.accent}08 0%, transparent 60%)`, top: '25%' }} />

      <div style={{ transform: `translateY(${craneY}px)` }}>
        <PhoneFrame scale={1.1} delay={0} shadowIntensity={0.5}>
          <div style={{ width: '100%', height: '100%', background: BRAND.bgLight, padding: '60px 20px 20px', direction: 'rtl' }}>
            <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 900, color: '#1E293B', marginBottom: 16 }}>סיכום פיננסי</div>

            {/* Revenue card */}
            <div style={{ padding: 18, borderRadius: 18, background: '#fff', boxShadow: '0 6px 24px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.04)', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: '#64748B' }}>הכנסות החודש</span>
                <span style={{ fontFamily: RUBIK, fontSize: 26, fontWeight: 800, color: FINANCE.accent }}>
                  ₪{Math.round(94200 * spring({ frame: Math.max(0, frame - 15), fps, config: { damping: 20, stiffness: 60, mass: 1 }, durationInFrames: 35 })).toLocaleString()}
                </span>
              </div>
              <div style={{ width: '100%', height: 6, borderRadius: 3, background: '#F1F5F9', marginTop: 10 }}>
                <div style={{ width: `${78 * spring({ frame: Math.max(0, frame - 15), fps, config: { damping: 20, stiffness: 60, mass: 1 }, durationInFrames: 35 })}%`, height: '100%', borderRadius: 3, background: FINANCE.gradient }} />
              </div>
              <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 600, color: '#22C55E', marginTop: 6 }}>📈 +23% מהחודש שעבר</div>
            </div>

            {/* Mini stats row */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              {[
                { label: 'חשבוניות', value: '12', emoji: '📄' },
                { label: 'שולם', value: '9', emoji: '✅' },
                { label: 'ממתין', value: '3', emoji: '⏳' },
              ].map((s, i) => {
                const cardSpring = spring({ frame: Math.max(0, frame - 25 - i * 4), fps, config: SPRING.ui, durationInFrames: 14 });
                return (
                  <div key={i} style={{ flex: 1, padding: '14px 10px', borderRadius: 14, background: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.04)', textAlign: 'center', opacity: cardSpring, transform: `translateY(${interpolate(cardSpring, [0, 1], [20, 0])}px)` }}>
                    <div style={{ fontSize: 20 }}>{s.emoji}</div>
                    <div style={{ fontFamily: RUBIK, fontSize: 22, fontWeight: 800, color: '#1E293B' }}>{s.value}</div>
                    <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 600, color: '#64748B' }}>{s.label}</div>
                  </div>
                );
              })}
            </div>

            {/* AI insight */}
            <div style={{
              padding: 14, borderRadius: 14, background: FINANCE.gradient,
              boxShadow: `0 8px 24px ${FINANCE.accent}20`,
              opacity: spring({ frame: Math.max(0, frame - 55), fps, config: SPRING.hero, durationInFrames: 18 }),
              transform: `translateY(${interpolate(spring({ frame: Math.max(0, frame - 55), fps, config: SPRING.hero, durationInFrames: 18 }), [0, 1], [30, 0])}px)`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 13 }}>🧠</span>
                <span style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>חיזוי AI</span>
              </div>
              <span style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.5 }}>
                3 חשבוניות צפויות להיפרע בשבוע הקרוב. סה"כ: ₪24,200.
              </span>
            </div>
          </div>
        </PhoneFrame>
      </div>
      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// RESULTS [300-390f]
const ResultsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stats = [
    { value: '+23%', label: 'הכנסות', delay: 0 },
    { value: '-80%', label: 'זמן חשבונאות', delay: 8 },
    { value: '95%', label: 'דיוק חיזוי תזרים', delay: 16 },
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgLight, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: `radial-gradient(circle, ${FINANCE.accent}06 0%, transparent 60%)` }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32, alignItems: 'center' }}>
        {stats.map((stat, i) => {
          const s = spring({ frame: Math.max(0, frame - stat.delay), fps, config: SPRING.punch, durationInFrames: 15 });
          return (
            <GlassCard key={i} variant="light" delay={stat.delay} width={700}>
              <div style={{ padding: '28px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl' }}>
                <span style={{ fontFamily: HEEBO, fontSize: 28, fontWeight: 700, color: '#475569' }}>{stat.label}</span>
                <span style={{ fontFamily: RUBIK, fontSize: 64, fontWeight: 800, background: FINANCE.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', transform: `scale(${interpolate(s, [0, 1], [1.5, 1])})`, filter: `blur(${interpolate(s, [0, 1], [8, 0])}px)`, display: 'inline-block' }}>{stat.value}</span>
              </div>
            </GlassCard>
          );
        })}
      </div>
      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// TAGLINE [390-450f]
const TaglineScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: FINANCE.gradient, justifyContent: 'center', alignItems: 'center', opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }) }}>
      <TextReveal text="AI שמנהל את הכסף שלך" delay={5} fontSize={52} fontWeight={900} color="#fff" mode="words" stagger={2} style={{ textAlign: 'center' }} />
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// MAIN
export const FinanceVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={36}><HookScene /></Sequence>
      <Sequence from={36} durationInFrames={69}><SetupScene /></Sequence>
      <Sequence from={105} durationInFrames={75}><AIEntranceScene /></Sequence>
      <Sequence from={180} durationInFrames={120}><ShowcaseScene /></Sequence>
      <Sequence from={300} durationInFrames={90}><ResultsScene /></Sequence>
      <Sequence from={390} durationInFrames={60}><TaglineScene /></Sequence>
      <Sequence from={450} durationInFrames={90}>
        <CTAEndcard variant="light" accentColor={FINANCE.accent} tagline="AI שמקדם את הארגון שלך" />
      </Sequence>
    </AbsoluteFill>
  );
};
