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

const CLIENT = MODULE_COLORS.client;

// ═══════════════════════════════════════════════════════════
// HOOK — Health score pulse, premium feel
// [0-36f]
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Circular health score drawing
  const arcProgress = interpolate(frame, [0, 22], [0, 0.92], { extrapolateRight: 'clamp' });
  const radius = 140;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference * (1 - arcProgress);

  // Score number
  const scoreSpring = spring({ frame: Math.max(0, frame - 12), fps, config: SPRING.punch, durationInFrames: 14 });
  const scoreValue = Math.round(92 * scoreSpring);

  // Glow pulse
  const glowPulse = Math.sin(frame * 0.08) * 0.3 + 0.7;

  // Outer ring pulse
  const outerPulse = interpolate(frame, [18, 28], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const outerScale = interpolate(outerPulse, [0, 1], [1, 1.3]);
  const outerOpacity = interpolate(outerPulse, [0, 0.5, 1], [0, 0.4, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgLight, justifyContent: 'center', alignItems: 'center' }}>
      {/* Warm ambient glow */}
      <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: `radial-gradient(circle, ${CLIENT.accent}10 0%, transparent 60%)`, opacity: glowPulse }} />

      {/* Outer pulse ring */}
      <svg width={360} height={360} style={{ position: 'absolute', transform: `scale(${outerScale})`, opacity: outerOpacity }}>
        <circle cx={180} cy={180} r={radius} fill="none" stroke={CLIENT.accent} strokeWidth={2} />
      </svg>

      {/* Health score arc */}
      <svg width={360} height={360} style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle cx={180} cy={180} r={radius} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={12} />
        {/* Progress */}
        <circle
          cx={180} cy={180} r={radius} fill="none"
          stroke={CLIENT.accent}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeOffset}
          style={{ filter: `drop-shadow(0 0 12px ${CLIENT.accent}60)` }}
        />
      </svg>

      {/* Score number */}
      <div style={{ fontFamily: RUBIK, fontSize: 100, fontWeight: 800, color: '#1E293B', opacity: scoreSpring, transform: `scale(${interpolate(scoreSpring, [0, 1], [1.4, 1])})` }}>
        {scoreValue}
      </div>
      <div style={{ position: 'absolute', marginTop: 100, fontFamily: HEEBO, fontSize: 24, fontWeight: 700, color: '#64748B', opacity: scoreSpring, direction: 'rtl' }}>
        Client Health Score
      </div>

      {/* Status badge */}
      <div style={{
        position: 'absolute', marginTop: 200,
        padding: '8px 24px', borderRadius: 20,
        background: `${CLIENT.accent}15`, border: `1px solid ${CLIENT.accent}30`,
        fontFamily: HEEBO, fontSize: 16, fontWeight: 700, color: CLIENT.accent,
        opacity: spring({ frame: Math.max(0, frame - 24), fps, config: SPRING.ui, durationInFrames: 12 }),
        transform: `scale(${interpolate(spring({ frame: Math.max(0, frame - 24), fps, config: SPRING.punch, durationInFrames: 10 }), [0, 1], [0.7, 1])})`,
      }}>
        ⭐ לקוח פרימיום
      </div>

      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SETUP — Client list without insights
// [36-105f]
// ═══════════════════════════════════════════════════════════
const CLIENTS = [
  { name: 'רונית כץ', lastContact: '45 ימים', risk: 'high' },
  { name: 'משרד אדריכלים גל', lastContact: '12 ימים', risk: 'low' },
  { name: 'סטארטאפ נובה', lastContact: '30 ימים', risk: 'medium' },
  { name: 'חברת הפקות דנה', lastContact: '60 ימים', risk: 'high' },
  { name: 'יועץ אסטרטגיה לב', lastContact: '3 ימים', risk: 'low' },
];

const SetupScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgLight, justifyContent: 'center', alignItems: 'center' }}>
      <PhoneFrame scale={1.1} delay={0} shadowIntensity={0.5}>
        <div style={{ width: '100%', height: '100%', background: '#FAFBFC', padding: '60px 20px 20px', direction: 'rtl' }}>
          <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 900, color: '#1E293B', marginBottom: 6 }}>הלקוחות שלי</div>
          <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: '#EF4444', marginBottom: 14 }}>⚠️ 2 לקוחות בסיכון נטישה</div>

          {CLIENTS.map((client, i) => {
            const s = spring({ frame: Math.max(0, frame - i * 4 - 5), fps, config: SPRING.ui, durationInFrames: 12 });
            const riskColor = client.risk === 'high' ? '#EF4444' : client.risk === 'medium' ? '#F59E0B' : '#22C55E';
            const shake = client.risk === 'high' ? Math.sin(frame * 0.3 + i * 2) * 1.5 : 0;

            return (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 16px', marginBottom: 8, borderRadius: 16,
                background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                border: client.risk === 'high' ? '1px solid #FCA5A5' : '1px solid rgba(0,0,0,0.04)',
                opacity: s, transform: `translateX(${interpolate(s, [0, 1], [40, 0]) + shake}px)`,
              }}>
                <div>
                  <div style={{ fontFamily: HEEBO, fontSize: 15, fontWeight: 700, color: '#1E293B' }}>{client.name}</div>
                  <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>קשר אחרון: {client.lastContact}</div>
                </div>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: riskColor, boxShadow: `0 0 8px ${riskColor}50` }} />
              </div>
            );
          })}
        </div>
      </PhoneFrame>
      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// AI ENTRANCE — Smart client care
// [105-180f]
// ═══════════════════════════════════════════════════════════
const AIEntranceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const badgeSpring = spring({ frame: Math.max(0, frame - 15), fps, config: SPRING.punch, durationInFrames: 15 });

  // Action cards
  const actions = [
    { emoji: '📞', text: 'התקשר לרונית — 45 ימים ללא קשר', delay: 25 },
    { emoji: '🎁', text: 'שלח הטבה לדנה — סיכון נטישה גבוה', delay: 33 },
    { emoji: '⭐', text: 'בקש המלצה מלב — שביעות רצון 98%', delay: 41 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgLight, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'absolute', width: 800, height: 800, borderRadius: '50%', background: `radial-gradient(circle, ${CLIENT.accent}08 0%, transparent 60%)` }} />

      {/* AI Badge */}
      <div style={{
        width: 80, height: 80, borderRadius: '50%', background: CLIENT.gradient,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        boxShadow: `0 16px 50px ${CLIENT.accent}30`,
        transform: `scale(${interpolate(badgeSpring, [0, 1], [0.4, 1])})`,
        opacity: badgeSpring, marginBottom: 40,
      }}>
        <span style={{ fontSize: 36 }}>🤝</span>
      </div>

      {/* Action cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
        {actions.map((action, i) => {
          const s = spring({ frame: Math.max(0, frame - action.delay), fps, config: SPRING.hero, durationInFrames: 16 });
          return (
            <GlassCard key={i} variant="light" delay={action.delay} width={720}>
              <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 14, direction: 'rtl' }}>
                <span style={{ fontSize: 28 }}>{action.emoji}</span>
                <span style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 700, color: '#1E293B' }}>{action.text}</span>
              </div>
            </GlassCard>
          );
        })}
      </div>

      <div style={{ position: 'absolute', bottom: 300 }}>
        <TextReveal text="AI ששומר על הלקוחות." delay={45} fontSize={44} fontWeight={900} color="#1E293B" mode="words" stagger={3} />
      </div>

      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SHOWCASE — Client portal view
// [180-300f]
// ═══════════════════════════════════════════════════════════
const ShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const craneY = interpolate(frame, [0, 120], [50, -30], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgLight, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${CLIENT.accent}06 0%, transparent 60%)`, top: '25%' }} />

      <div style={{ transform: `translateY(${craneY}px)` }}>
        <PhoneFrame scale={1.1} delay={0} shadowIntensity={0.5}>
          <div style={{ width: '100%', height: '100%', background: '#FAFBFC', padding: '60px 20px 20px', direction: 'rtl' }}>
            <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 900, color: '#1E293B', marginBottom: 16 }}>פרופיל לקוח — רונית כץ</div>

            {/* Health Score mini */}
            <div style={{ padding: 16, borderRadius: 18, background: '#fff', boxShadow: '0 6px 24px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.04)', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: '#64748B' }}>Health Score</span>
                <span style={{ fontFamily: RUBIK, fontSize: 24, fontWeight: 800, color: '#EF4444' }}>
                  {Math.round(34 * spring({ frame: Math.max(0, frame - 15), fps, config: { damping: 20, stiffness: 60, mass: 1 }, durationInFrames: 30 }))}%
                </span>
              </div>
              <div style={{ width: '100%', height: 6, borderRadius: 3, background: '#F1F5F9' }}>
                <div style={{ width: `${34 * spring({ frame: Math.max(0, frame - 15), fps, config: { damping: 20, stiffness: 60, mass: 1 }, durationInFrames: 30 })}%`, height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, #EF4444, #F59E0B)' }} />
              </div>
            </div>

            {/* Timeline */}
            <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: '#64748B', marginBottom: 8 }}>ציר זמן</div>
            {[
              { time: 'היום', event: 'AI שלח תזכורת', emoji: '🤖' },
              { time: '15 יום', event: 'פתחה הצעת מחיר', emoji: '📄' },
              { time: '45 יום', event: 'שיחה אחרונה', emoji: '📞' },
            ].map((item, i) => {
              const s = spring({ frame: Math.max(0, frame - 25 - i * 6), fps, config: SPRING.ui, durationInFrames: 14 });
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 6, borderRadius: 12, background: '#fff', border: '1px solid rgba(0,0,0,0.04)', opacity: s, transform: `translateX(${interpolate(s, [0, 1], [25, 0])}px)` }}>
                  <span style={{ fontSize: 18 }}>{item.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: '#1E293B' }}>{item.event}</div>
                    <div style={{ fontFamily: HEEBO, fontSize: 10, fontWeight: 600, color: '#94A3B8' }}>{item.time}</div>
                  </div>
                </div>
              );
            })}

            {/* AI recommendation */}
            <div style={{
              marginTop: 10, padding: 14, borderRadius: 14, background: CLIENT.gradient,
              boxShadow: `0 8px 24px ${CLIENT.accent}20`,
              opacity: spring({ frame: Math.max(0, frame - 55), fps, config: SPRING.hero, durationInFrames: 18 }),
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 12 }}>🧠</span>
                <span style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>המלצת AI</span>
              </div>
              <span style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.5 }}>
                רונית לא ענתה 45 ימים. שלח הודעה אישית עם הטבת חידוש.
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
    { value: '-45%', label: 'נטישת לקוחות', delay: 0 },
    { value: '+60%', label: 'שביעות רצון', delay: 8 },
    { value: '92%', label: 'שימור לקוחות', delay: 16 },
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgLight, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: `radial-gradient(circle, ${CLIENT.accent}06 0%, transparent 60%)` }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32, alignItems: 'center' }}>
        {stats.map((stat, i) => {
          const s = spring({ frame: Math.max(0, frame - stat.delay), fps, config: SPRING.punch, durationInFrames: 15 });
          return (
            <GlassCard key={i} variant="light" delay={stat.delay} width={700}>
              <div style={{ padding: '28px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl' }}>
                <span style={{ fontFamily: HEEBO, fontSize: 28, fontWeight: 700, color: '#475569' }}>{stat.label}</span>
                <span style={{ fontFamily: RUBIK, fontSize: 64, fontWeight: 800, background: CLIENT.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', transform: `scale(${interpolate(s, [0, 1], [1.5, 1])})`, filter: `blur(${interpolate(s, [0, 1], [8, 0])}px)`, display: 'inline-block' }}>{stat.value}</span>
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
    <AbsoluteFill style={{ background: CLIENT.gradient, justifyContent: 'center', alignItems: 'center', opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }) }}>
      <TextReveal text="AI ששומר על כל לקוח" delay={5} fontSize={52} fontWeight={900} color="#fff" mode="words" stagger={2} style={{ textAlign: 'center' }} />
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// MAIN
export const ClientVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={36}><HookScene /></Sequence>
      <Sequence from={36} durationInFrames={69}><SetupScene /></Sequence>
      <Sequence from={105} durationInFrames={75}><AIEntranceScene /></Sequence>
      <Sequence from={180} durationInFrames={120}><ShowcaseScene /></Sequence>
      <Sequence from={300} durationInFrames={90}><ResultsScene /></Sequence>
      <Sequence from={390} durationInFrames={60}><TaglineScene /></Sequence>
      <Sequence from={450} durationInFrames={90}>
        <CTAEndcard variant="light" accentColor={CLIENT.accent} tagline="AI שמקדם את הארגון שלך" />
      </Sequence>
    </AbsoluteFill>
  );
};
