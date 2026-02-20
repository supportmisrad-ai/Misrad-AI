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

// ═══════════════════════════════════════════════════════════
// SCENE 1: HOOK — Mentor guides clients [0-90f = 0-3s]
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const clients = [
    { emoji: '🏢', label: 'ארגון A', angle: 0, delay: 8 },
    { emoji: '🏪', label: 'עסק B', angle: Math.PI * 0.4, delay: 14 },
    { emoji: '🏗️', label: 'חברה C', angle: Math.PI * 0.8, delay: 20 },
    { emoji: '🏠', label: 'סטודיו D', angle: Math.PI * 1.2, delay: 26 },
    { emoji: '🎯', label: 'סוכנות E', angle: Math.PI * 1.6, delay: 32 },
  ];

  const titleSpring = spring({ frame: Math.max(0, frame - 40), fps, config: SPRING.punch, durationInFrames: 15 });
  const mentorSpring = spring({ frame, fps, config: SPRING.punch, durationInFrames: 15 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={4} color={BRAND.indigo} speed={0.012} maxSize={100} />
      <MorphBlob color={BRAND.indigo} size={550} speed={0.004} />

      <div style={{
        width: 90, height: 90, borderRadius: '50%', background: BRAND.gradient,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        fontSize: 42, boxShadow: `0 16px 50px ${BRAND.primary}30, 0 0 ${pulse(frame, 0.05, 15, 25)}px ${BRAND.primary}20`,
        zIndex: 10, opacity: mentorSpring,
        transform: `scale(${interpolate(mentorSpring, [0, 1], [0.5, 1])})`,
      }}>
        🎓
      </div>

      <BreathingRing color={BRAND.indigo} size={240} speed={0.04} />

      {clients.map((client, i) => {
        const s = spring({ frame: Math.max(0, frame - client.delay), fps, config: SPRING.hero, durationInFrames: 18 });
        const dist = 200;
        const angle = client.angle + frame * 0.003;
        const x = Math.cos(angle) * dist * s;
        const y = Math.sin(angle) * dist * s;

        return (
          <React.Fragment key={i}>
            <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }} viewBox="-540 -960 1080 1920">
              <line x1={0} y1={0} x2={x} y2={y} stroke={BRAND.indigo} strokeWidth={1.5} strokeDasharray="4 3" opacity={s * 0.3} />
            </svg>
            <div style={{
              position: 'absolute',
              transform: `translate(${x}px, ${y}px) scale(${interpolate(s, [0, 1], [0.4, 1])})`,
              opacity: s, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 22,
                boxShadow: `0 4px 16px ${BRAND.indigo}15`,
              }}>
                {client.emoji}
              </div>
              <span style={{ fontFamily: HEEBO, fontSize: 10, fontWeight: 700, color: BRAND.muted }}>{client.label}</span>
            </div>
          </React.Fragment>
        );
      })}

      <div style={{ position: 'absolute', marginTop: 340, textAlign: 'center', opacity: titleSpring }}>
        <div style={{ fontFamily: HEEBO, fontSize: 40, fontWeight: 900, color: BRAND.white, direction: 'rtl' }}>חבילת יועץ / סוכנות</div>
        <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 700, color: BRAND.muted, direction: 'rtl', marginTop: 8 }}>תלמד. תנהל. תצמיח.</div>
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
    { emoji: '📚', title: 'כל 6 המודולים', text: 'System, Nexus, Social, Finance, Client, Operations', desc: 'הכל כלול — בלי הפתעות.', delay: 0 },
    { emoji: '👥', title: 'ניהול מרובה לקוחות', text: 'דשבורד אחד לכל הלקוחות שלך', desc: 'תנהל 10, 50, 100 לקוחות — AI עוזר.', delay: 20 },
    { emoji: '🧠', title: 'AI מותאם ליועצים', text: 'תובנות חוצות לקוחות, benchmark, דוחות', desc: 'השוואת ביצועים בין לקוחות — אוטומטי.', delay: 40 },
    { emoji: '🎯', title: 'White Label', text: 'המותג שלך — המערכת שלנו', desc: 'לוגו, צבעים ודומיין — הכל שלך.', delay: 60 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={3} color={BRAND.indigo} speed={0.01} maxSize={90} />
      <ParticleField count={6} color={BRAND.indigo} speed={0.3} />

      <div style={{
        position: 'absolute', top: 55,
        padding: '10px 24px', borderRadius: 16,
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)',
        fontFamily: HEEBO, fontSize: 26, fontWeight: 900, color: BRAND.white, direction: 'rtl',
        opacity: spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 }),
      }}>
        מה כוללת חבילת יועץ / סוכנות?
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', marginTop: 40 }}>
        {features.map((f, i) => {
          const s = spring({ frame: Math.max(0, frame - f.delay), fps, config: SPRING.ui, durationInFrames: 20 });
          const iconFloat = pulse(frame, 0.04 + i * 0.005, -2, 2);
          return (
            <div key={i} style={{
              width: 720, padding: '16px 22px', borderRadius: 20,
              background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)',
              border: `1px solid ${BRAND.indigo}18`,
              boxShadow: `0 4px 20px ${BRAND.indigo}06`,
              display: 'flex', alignItems: 'flex-start', gap: 14, direction: 'rtl',
              opacity: s, transform: `translateY(${interpolate(s, [0, 1], [25, 0])}px)`,
            }}>
              <div style={{
                width: 46, height: 46, borderRadius: 14,
                background: `${BRAND.indigo}12`, border: `1px solid ${BRAND.indigo}25`,
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                fontSize: 22, flexShrink: 0, transform: `translateY(${iconFloat}px)`,
              }}>{f.emoji}</div>
              <div>
                <div style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 800, color: BRAND.indigoLight }}>{f.title}</div>
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
    { target: 6, prefix: '', suffix: '', label: 'מודולים מלאים', delay: 0 },
    { target: 499, prefix: '₪', suffix: '/חודש', label: 'מחיר חבילה', delay: 15 },
    { target: 100, prefix: '', suffix: '+', label: 'לקוחות לניהול', delay: 30 },
    { target: 1, prefix: '', suffix: '', label: 'דשבורד אחד', delay: 45 },
  ];

  const testSpring = spring({ frame: Math.max(0, frame - 120), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={4} color={BRAND.indigo} speed={0.01} maxSize={100} />
      <MorphBlob color={BRAND.primary} size={500} speed={0.004} />

      <div style={{
        position: 'absolute', top: 50,
        padding: '8px 20px', borderRadius: 14, background: 'rgba(0,0,0,0.4)',
        fontFamily: HEEBO, fontSize: 24, fontWeight: 900, color: BRAND.white, direction: 'rtl',
        opacity: spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 }),
      }}>
        הנתונים
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
              border: `1px solid ${BRAND.indigo}12`, textAlign: 'center', direction: 'rtl',
              opacity: s, transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`,
              boxShadow: `0 4px 20px ${BRAND.indigo}08`,
            }}>
              <div style={{
                fontFamily: RUBIK, fontSize: 48, fontWeight: 800,
                background: BRAND.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
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
            "מנהל 30 לקוחות מדשבורד אחד — AI מייצר דוחות אוטומטיים לכל אחד."
          </div>
          <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 600, color: BRAND.muted, marginTop: 4 }}>
            — יועץ עסקי, סוכנות דיגיטל
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
    <AbsoluteFill style={{ background: BRAND.gradient, justifyContent: 'center', alignItems: 'center', opacity: bgOp, overflow: 'hidden' }}>
      <BreathingRing color="rgba(255,255,255,0.12)" size={450} speed={0.05} />
      <ParticleField count={12} color="rgba(255,255,255,0.2)" speed={0.5} />

      <TextReveal text="תלמד. תנהל. תצמיח." delay={5} fontSize={48} fontWeight={900} color="#fff" mode="words" stagger={2} style={{ textAlign: 'center' }} />

      <div style={{
        marginTop: 24, padding: '8px 20px', borderRadius: 12,
        background: 'rgba(255,255,255,0.1)',
        fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.65)', direction: 'rtl',
        opacity: subSpring,
      }}>
        הכל כלול. White Label. ₪499/חודש.
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN — 30 seconds (900 frames)
// ═══════════════════════════════════════════════════════════
export const MentorVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={90}><HookScene /></Sequence>
      <Sequence from={90} durationInFrames={240}><FeaturesScene /></Sequence>
      <Sequence from={330} durationInFrames={230}><StatsScene /></Sequence>
      <Sequence from={560} durationInFrames={310}><TaglineScene /></Sequence>
      <Sequence from={870} durationInFrames={30}>
        <CTAEndcard variant="dark" accentColor={BRAND.indigo} price="₪499/חודש" tagline="תלמד. תנהל. תצמיח." />
      </Sequence>
    </AbsoluteFill>
  );
};
