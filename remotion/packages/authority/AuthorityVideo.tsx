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
import { pulse, FloatingOrbs, MorphBlob, ParticleField, BreathingRing } from '../../shared/components/MicroAnimations';

const SOCIAL = MODULE_COLORS.social;
const CLIENT = MODULE_COLORS.client;
const NEXUS = MODULE_COLORS.nexus;

// ═══════════════════════════════════════════════════════════
// SCENE 1: HOOK — Crown with orbiting modules [0-90f = 0-3s]
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const orbitProgress = interpolate(frame, [0, 40], [0, 1], { extrapolateRight: 'clamp' });
  const modules = [
    { emoji: '📱', color: SOCIAL.accent, angle: 0 },
    { emoji: '🤝', color: CLIENT.accent, angle: (2 * Math.PI) / 3 },
    { emoji: '👥', color: NEXUS.accent, angle: (4 * Math.PI) / 3 },
  ];

  const orbitRadius = interpolate(orbitProgress, [0, 1], [250, 80]);
  const rotation = orbitProgress * Math.PI * 2 + frame * 0.02;

  const titleSpring = spring({ frame: Math.max(0, frame - 35), fps, config: SPRING.punch, durationInFrames: 15 });
  const crownSpring = spring({ frame: Math.max(0, frame - 15), fps, config: SPRING.punch, durationInFrames: 15 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={4} color={SOCIAL.accent} speed={0.012} maxSize={100} />
      <MorphBlob color={SOCIAL.accent} size={500} speed={0.005} />

      {modules.map((mod, i) => {
        const angle = mod.angle + rotation;
        const x = Math.cos(angle) * orbitRadius;
        const y = Math.sin(angle) * orbitRadius;
        return (
          <div key={i} style={{
            position: 'absolute', width: 64, height: 64, borderRadius: 18,
            background: `${mod.color}15`, border: `2px solid ${mod.color}40`,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            transform: `translate(${x}px, ${y}px)`,
            fontSize: 28, boxShadow: `0 8px 30px ${mod.color}25, 0 0 ${pulse(frame, 0.06, 6, 12)}px ${mod.color}15`,
          }}>
            {mod.emoji}
          </div>
        );
      })}

      <BreathingRing color={SOCIAL.accent} size={200} speed={0.04} />

      <div style={{
        fontSize: 56, opacity: crownSpring,
        transform: `scale(${interpolate(crownSpring, [0, 1], [0.5, 1])})`,
        filter: `drop-shadow(0 0 ${pulse(frame, 0.05, 15, 25)}px ${SOCIAL.accent}40)`,
      }}>
        👑
      </div>

      <div style={{ position: 'absolute', marginTop: 220, textAlign: 'center', opacity: titleSpring }}>
        <div style={{ fontFamily: HEEBO, fontSize: 38, fontWeight: 900, color: BRAND.white, direction: 'rtl' }}>חבילת שיווק ומיתוג</div>
        <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 700, color: BRAND.muted, direction: 'rtl', marginTop: 8 }}>המותג שלך. AI שלנו.</div>
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 2: FEATURES [90-330f = 3-11s]
// ═══════════════════════════════════════════════════════════
const FeaturesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const features = [
    { emoji: '📱', module: 'Social', text: 'שיווק AI — תוכן, תזמון, hashtags חכמים', desc: 'AI שיוצר פוסטים מושלמים ומתזמן אותם.', color: SOCIAL.accent, delay: 0 },
    { emoji: '🤝', module: 'Client', text: 'פורטל לקוחות + Health Score', desc: 'מעקב בריאות לקוח ומניעת נטישה.', color: CLIENT.accent, delay: 20 },
    { emoji: '👥', module: 'Nexus', text: 'ניהול צוות ומשימות', desc: 'הקצאת משימות וניהול פרויקטים AI.', color: NEXUS.accent, delay: 40 },
    { emoji: '✨', module: 'AI Content', text: 'יצירת תוכן אוטומטית לכל פלטפורמה', desc: 'טקסטים, תמונות, וסטוריז — בלחיצה.', color: SOCIAL.accent, delay: 60 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={3} color={SOCIAL.accent} speed={0.01} maxSize={90} />
      <ParticleField count={6} color={SOCIAL.accent} speed={0.3} />

      <div style={{
        position: 'absolute', top: 55,
        padding: '10px 24px', borderRadius: 16,
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)',
        fontFamily: HEEBO, fontSize: 26, fontWeight: 900, color: BRAND.white, direction: 'rtl',
        opacity: spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 }),
      }}>
        מה כוללת חבילת שיווק ומיתוג?
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', marginTop: 40 }}>
        {features.map((f, i) => {
          const s = spring({ frame: Math.max(0, frame - f.delay), fps, config: SPRING.ui, durationInFrames: 20 });
          const iconFloat = pulse(frame, 0.04 + i * 0.005, -2, 2);
          return (
            <div key={i} style={{
              width: 720, padding: '16px 22px', borderRadius: 20,
              background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)',
              border: `1px solid ${f.color}18`,
              boxShadow: `0 4px 20px ${f.color}06`,
              display: 'flex', alignItems: 'flex-start', gap: 14, direction: 'rtl',
              opacity: s, transform: `translateY(${interpolate(s, [0, 1], [25, 0])}px)`,
            }}>
              <div style={{
                width: 46, height: 46, borderRadius: 14,
                background: `${f.color}12`, border: `1px solid ${f.color}25`,
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                fontSize: 22, flexShrink: 0, transform: `translateY(${iconFloat}px)`,
              }}>{f.emoji}</div>
              <div>
                <div style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 800, color: f.color }}>{f.module}</div>
                <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: BRAND.white }}>{f.text}</div>
                <div style={{ fontFamily: HEEBO, fontSize: 10, fontWeight: 600, color: BRAND.muted, marginTop: 2 }}>{f.desc}</div>
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
// SCENE 3: STATS [330-560f = 11-18.7s]
// ═══════════════════════════════════════════════════════════
const StatsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stats = [
    { target: 340, prefix: '+', suffix: '%', label: 'חשיפות', delay: 0 },
    { target: 92, prefix: '', suffix: '%', label: 'שימור לקוחות', delay: 15 },
    { target: 10, prefix: 'x', suffix: '', label: 'תוכן אוטומטי', delay: 30 },
    { target: 349, prefix: '₪', suffix: '/חודש', label: 'מחיר חבילה', delay: 45 },
  ];

  const testSpring = spring({ frame: Math.max(0, frame - 120), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={4} color={SOCIAL.accent} speed={0.01} maxSize={100} />

      <div style={{
        position: 'absolute', top: 50,
        padding: '8px 20px', borderRadius: 14, background: 'rgba(0,0,0,0.4)',
        fontFamily: HEEBO, fontSize: 24, fontWeight: 900, color: BRAND.white, direction: 'rtl',
        opacity: spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 }),
      }}>
        התוצאות
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
              border: `1px solid ${SOCIAL.accent}12`, textAlign: 'center', direction: 'rtl',
              opacity: s, transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`,
              boxShadow: `0 4px 20px ${SOCIAL.accent}08`,
            }}>
              <div style={{
                fontFamily: RUBIK, fontSize: 44, fontWeight: 800,
                background: SOCIAL.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                {stat.prefix}{displayVal}{stat.suffix}
              </div>
              <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: BRAND.muted, marginTop: 4 }}>{stat.label}</div>
            </div>
          );
        })}
      </div>

      {frame > 120 && (
        <div style={{
          position: 'absolute', bottom: 50, maxWidth: 700,
          padding: '14px 24px', borderRadius: 20,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.06)',
          direction: 'rtl', opacity: testSpring,
        }}>
          <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: BRAND.white, lineHeight: 1.6 }}>
            "340% יותר חשיפות + 92% שימור לקוחות — הכל אוטומטי."
          </div>
          <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 600, color: BRAND.muted, marginTop: 4 }}>
            — סוכנות שיווק דיגיטלי
          </div>
        </div>
      )}

      <NoiseLayer opacity={0.02} />
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
    <AbsoluteFill style={{ background: SOCIAL.gradient, justifyContent: 'center', alignItems: 'center', opacity: bgOp, overflow: 'hidden' }}>
      <BreathingRing color="rgba(255,255,255,0.12)" size={450} speed={0.05} />
      <ParticleField count={12} color="rgba(255,255,255,0.2)" speed={0.5} />

      <TextReveal text="המותג שלך. AI שלנו." delay={5} fontSize={48} fontWeight={900} color="#fff" mode="words" stagger={2} style={{ textAlign: 'center' }} />

      <div style={{
        marginTop: 24, padding: '8px 20px', borderRadius: 12,
        background: 'rgba(255,255,255,0.1)',
        fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.65)', direction: 'rtl',
        opacity: subSpring,
      }}>
        Social + Client + Nexus = מיתוג מלא
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN — 30 seconds (900 frames)
// ═══════════════════════════════════════════════════════════
export const AuthorityVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={90}><HookScene /></Sequence>
      <Sequence from={90} durationInFrames={240}><FeaturesScene /></Sequence>
      <Sequence from={330} durationInFrames={230}><StatsScene /></Sequence>
      <Sequence from={560} durationInFrames={310}><TaglineScene /></Sequence>
      <Sequence from={870} durationInFrames={30}>
        <CTAEndcard variant="dark" accentColor={SOCIAL.accent} price="₪349/חודש" tagline="המותג שלך. AI שלנו." />
      </Sequence>
    </AbsoluteFill>
  );
};
