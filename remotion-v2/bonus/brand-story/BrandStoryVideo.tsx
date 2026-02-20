import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from 'remotion';
import { BRAND, MODULE_COLORS, HEEBO, RUBIK, SPRING, FPS, V2_TIMING } from '../../shared/config';
import { NoiseLayer, GlassCard, TextReveal, CTAEndcard, pulse } from '../../shared/components';

const T = V2_TIMING;

// ═══════════════════════════════════════════════════════════
// Premium cinematic particles
// ═══════════════════════════════════════════════════════════
const CinematicParticles: React.FC<{ count?: number; color?: string }> = ({ count = 40, color = BRAND.primary }) => {
  const frame = useCurrentFrame();
  const particles = React.useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      x: (i * 137.508) % 100,
      y: (i * 73.247) % 100,
      size: 2 + (i % 4) * 1.5,
      speed: 0.3 + (i % 5) * 0.15,
      phase: (i * 2.4) % (Math.PI * 2),
      opacity: 0.1 + (i % 3) * 0.1,
    })), [count]);

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {particles.map((p, i) => {
        const x = p.x + Math.sin(frame * p.speed * 0.02 + p.phase) * 8;
        const y = (p.y + frame * p.speed * 0.08) % 110 - 5;
        return (
          <div key={i} style={{
            position: 'absolute',
            left: `${x}%`, top: `${y}%`,
            width: p.size, height: p.size, borderRadius: '50%',
            background: color,
            opacity: p.opacity * (0.5 + Math.sin(frame * 0.05 + p.phase) * 0.5),
            filter: `blur(${p.size > 4 ? 1 : 0}px)`,
            boxShadow: `0 0 ${p.size * 3}px ${color}40`,
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// Breathing glow orb
// ═══════════════════════════════════════════════════════════
const GlowOrb: React.FC<{ x: string; y: string; size: number; color: string; speed?: number }> = ({
  x, y, size, color, speed = 0.03,
}) => {
  const frame = useCurrentFrame();
  const breath = 1 + Math.sin(frame * speed) * 0.15;
  const opacity = 0.08 + Math.sin(frame * speed * 0.7) * 0.04;
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: size, height: size,
      borderRadius: '50%', transform: `scale(${breath})`, opacity,
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      filter: `blur(${size * 0.3}px)`,
    }} />
  );
};

// ═══════════════════════════════════════════════════════════
// HOOK — Cinematic brand reveal [0-90f]
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame: Math.max(0, frame - 10), fps, config: { damping: 12, stiffness: 100, mass: 1.2 }, durationInFrames: 25 });
  const letterReveal = interpolate(frame, [30, 70], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const shimmer = interpolate(frame, [0, 90], [0, 360]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#050507', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <GlowOrb x="20%" y="30%" size={400} color={BRAND.primary} speed={0.025} />
      <GlowOrb x="70%" y="60%" size={350} color={BRAND.indigo} speed={0.03} />
      <CinematicParticles count={50} color={BRAND.primary} />

      {/* Logo with shimmer */}
      <div style={{
        fontSize: 80, transform: `scale(${logoScale})`,
        filter: `drop-shadow(0 0 40px ${BRAND.primary}50)`,
        opacity: logoScale,
      }}>🏢</div>

      {/* Brand name letter-by-letter */}
      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        {'MISRAD AI'.split('').map((char, i) => {
          const charProgress = interpolate(letterReveal, [i / 9, (i + 1) / 9], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <div key={i} style={{
              fontFamily: RUBIK, fontSize: 48, fontWeight: 900,
              color: BRAND.white,
              opacity: charProgress,
              transform: `translateY(${interpolate(charProgress, [0, 1], [30, 0])}px)`,
              textShadow: `0 0 20px ${BRAND.primary}60`,
              background: char !== ' ' ? `linear-gradient(${shimmer}deg, ${BRAND.white} 0%, ${BRAND.primary} 50%, ${BRAND.white} 100%)` : 'none',
              WebkitBackgroundClip: char !== ' ' ? 'text' : undefined,
              WebkitTextFillColor: char !== ' ' ? 'transparent' : undefined,
            }}>
              {char === ' ' ? '\u00A0' : char}
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: 16, fontFamily: HEEBO, fontSize: 20, fontWeight: 700,
        color: BRAND.muted, direction: 'rtl',
        opacity: spring({ frame: Math.max(0, frame - 60), fps, config: SPRING.hero, durationInFrames: 18 }),
      }}>
        הסיפור שלנו. המשימה שלנו.
      </div>
      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// PROBLEM — The world before MISRAD AI [90-300f]
// ═══════════════════════════════════════════════════════════
const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const quotes = [
    { text: '"אני מנהל עסק — ומרגיש שאני מנהל 10 מערכות"', author: 'בעל עסק, תל אביב', delay: 0 },
    { text: '"כל כלי עובד לבד. אין תמונה כוללת"', author: 'מנהלת שיווק, ירושלים', delay: 40 },
    { text: '"משלם אלפי שקלים בחודש — על כלים שלא מדברים"', author: 'יזם, חיפה', delay: 80 },
    { text: '"הצוות שלי מבזבז 3 שעות ביום על ניהול — במקום עבודה"', author: 'מנכ"ל, רעננה', delay: 120 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: '#050507', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <GlowOrb x="50%" y="50%" size={500} color="#EF444420" speed={0.02} />

      <div style={{ fontFamily: HEEBO, fontSize: 32, fontWeight: 900, color: BRAND.white, direction: 'rtl', marginBottom: 36, opacity: spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 }), textShadow: '0 2px 16px rgba(0,0,0,0.6)' }}>
        העולם לפנינו
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760 }}>
        {quotes.map((q, i) => {
          const s = spring({ frame: Math.max(0, frame - q.delay - 15), fps, config: { damping: 16, stiffness: 120, mass: 0.9 }, durationInFrames: 20 });
          return (
            <div key={i} style={{
              padding: '22px 28px', borderRadius: 24,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              backdropFilter: 'blur(20px)', direction: 'rtl',
              opacity: s, transform: `translateX(${interpolate(s, [0, 1], [40, 0])}px)`,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}>
              <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 700, color: BRAND.white, lineHeight: 1.6, fontStyle: 'italic' }}>{q.text}</div>
              <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 600, color: BRAND.muted, marginTop: 8 }}>— {q.author}</div>
            </div>
          );
        })}
      </div>

      <CinematicParticles count={20} color="#EF444430" />
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SOLUTION — The vision [300-600f]
// ═══════════════════════════════════════════════════════════
const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const flash = interpolate(frame, [0, 10, 25], [0, 0.4, 0], { extrapolateRight: 'clamp' });

  const values = [
    { emoji: '🇮🇱', title: 'ישראלי מהשורש', desc: 'עברית, RTL, לוח עברי, שבת — מותאם 100% לעסק הישראלי.', color: '#3B82F6', delay: 30 },
    { emoji: '🧠', title: 'AI בכל שכבה', desc: 'לא תוספת. בסיס. AI שמבין את העסק שלך ומשתפר כל יום.', color: BRAND.primary, delay: 70 },
    { emoji: '🔗', title: 'הכל מחובר', desc: '6 מודולים שמדברים ביניהם. מכירות, שיווק, כספים, צוות, לקוחות, תפעול.', color: BRAND.indigo, delay: 110 },
    { emoji: '💡', title: 'פשוט', desc: 'ממשק נקי. אפליקציה אחת. כניסה אחת. בלי עקומת למידה.', color: '#22C55E', delay: 150 },
    { emoji: '🕎', title: 'מותאם תרבותית', desc: 'מצב שבת, חגים, לוח עברי — כי אנחנו מבינים את הקהל.', color: '#F59E0B', delay: 190 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: '#050507', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: BRAND.gradient, opacity: flash, pointerEvents: 'none' }} />
      <GlowOrb x="30%" y="20%" size={350} color={BRAND.primary} speed={0.02} />
      <GlowOrb x="70%" y="70%" size={300} color={BRAND.indigo} speed={0.025} />

      <div style={{
        fontFamily: HEEBO, fontSize: 34, fontWeight: 900, color: BRAND.white, direction: 'rtl', marginBottom: 32,
        opacity: spring({ frame: Math.max(0, frame - 15), fps, config: SPRING.hero, durationInFrames: 20 }),
        textShadow: '0 2px 20px rgba(0,0,0,0.6)',
      }}>
        החזון שלנו
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
        {values.map((v, i) => {
          const s = spring({ frame: Math.max(0, frame - v.delay), fps, config: { damping: 14, stiffness: 130, mass: 0.8 }, durationInFrames: 18 });
          return (
            <div key={i} style={{
              width: 740, padding: '20px 26px', borderRadius: 22,
              background: `${v.color}04`, border: `1px solid ${v.color}15`,
              backdropFilter: 'blur(20px)', direction: 'rtl',
              display: 'flex', alignItems: 'flex-start', gap: 16,
              opacity: s, transform: `translateY(${interpolate(s, [0, 1], [25, 0])}px)`,
              boxShadow: `0 12px 40px ${v.color}08`,
            }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: `${v.color}10`, border: `1px solid ${v.color}20`, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 28, flexShrink: 0 }}>{v.emoji}</div>
              <div>
                <div style={{ fontFamily: HEEBO, fontSize: 19, fontWeight: 800, color: v.color }}>{v.title}</div>
                <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: BRAND.muted, lineHeight: 1.6, marginTop: 3 }}>{v.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      <CinematicParticles count={30} color={BRAND.primary} />
      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SHOWCASE — The 6 modules constellation [600-1050f]
// ═══════════════════════════════════════════════════════════
const ShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const modules = [
    { key: 'system', label: 'System', he: 'מכירות', emoji: '🎯', color: MODULE_COLORS.system.accent, gradient: MODULE_COLORS.system.gradient },
    { key: 'nexus', label: 'Nexus', he: 'ניהול צוות', emoji: '👥', color: MODULE_COLORS.nexus.accent, gradient: MODULE_COLORS.nexus.gradient },
    { key: 'social', label: 'Social', he: 'שיווק', emoji: '📱', color: MODULE_COLORS.social.accent, gradient: MODULE_COLORS.social.gradient },
    { key: 'finance', label: 'Finance', he: 'כספים', emoji: '💰', color: MODULE_COLORS.finance.accent, gradient: MODULE_COLORS.finance.gradient },
    { key: 'client', label: 'Client', he: 'לקוחות', emoji: '🤝', color: MODULE_COLORS.client.accent, gradient: MODULE_COLORS.client.gradient },
    { key: 'operations', label: 'Operations', he: 'תפעול', emoji: '⚡', color: MODULE_COLORS.operations.accent, gradient: MODULE_COLORS.operations.gradient },
  ];

  // Orbital constellation
  const centerX = 0;
  const centerY = -30;
  const radius = 200;

  return (
    <AbsoluteFill style={{ backgroundColor: '#050507', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <GlowOrb x="50%" y="45%" size={500} color={BRAND.primary} speed={0.015} />

      {/* Connection lines */}
      <svg width="800" height="800" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}>
        {modules.map((_, i) => {
          const nextI = (i + 1) % modules.length;
          const angle1 = (i / modules.length) * Math.PI * 2 - Math.PI / 2 + frame * 0.003;
          const angle2 = (nextI / modules.length) * Math.PI * 2 - Math.PI / 2 + frame * 0.003;
          const x1 = 400 + Math.cos(angle1) * radius;
          const y1 = 400 + Math.sin(angle1) * radius * 0.6;
          const x2 = 400 + Math.cos(angle2) * radius;
          const y2 = 400 + Math.sin(angle2) * radius * 0.6;
          const lineOpacity = spring({ frame: Math.max(0, frame - 60 - i * 10), fps, config: SPRING.hero, durationInFrames: 20 });
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={`rgba(255,255,255,${0.06 * lineOpacity})`} strokeWidth={1.5} />
          );
        })}
      </svg>

      {/* Module orbs */}
      {modules.map((mod, i) => {
        const angle = (i / modules.length) * Math.PI * 2 - Math.PI / 2 + frame * 0.003;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius * 0.6;
        const delay = 20 + i * 15;
        const s = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 12, stiffness: 120, mass: 0.8 }, durationInFrames: 20 });
        const zIndex = Math.sin(angle) > 0 ? 2 : 1;
        const depthScale = interpolate(Math.sin(angle), [-1, 1], [0.75, 1.15]);

        return (
          <div key={i} style={{
            position: 'absolute', zIndex,
            transform: `translate(${x}px, ${y}px) scale(${depthScale * s})`,
            opacity: s, textAlign: 'center',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 22, background: mod.gradient,
              display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 32,
              boxShadow: `0 8px 32px ${mod.color}30`, margin: '0 auto',
            }}>{mod.emoji}</div>
            <div style={{ fontFamily: RUBIK, fontSize: 14, fontWeight: 800, color: mod.color, marginTop: 8 }}>{mod.label}</div>
            <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: BRAND.muted }}>{mod.he}</div>
          </div>
        );
      })}

      {/* Center MISRAD AI logo */}
      <div style={{
        position: 'absolute', zIndex: 5,
        transform: `translate(${centerX}px, ${centerY}px)`,
        opacity: spring({ frame: Math.max(0, frame - 120), fps, config: SPRING.hero, durationInFrames: 22 }),
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: 24,
          background: BRAND.gradient, display: 'flex', justifyContent: 'center', alignItems: 'center',
          fontSize: 36, boxShadow: `0 12px 48px ${BRAND.primary}40`,
        }}>🏢</div>
      </div>

      <div style={{
        position: 'absolute', bottom: 140,
        fontFamily: HEEBO, fontSize: 24, fontWeight: 900, color: BRAND.white, direction: 'rtl',
        opacity: spring({ frame: Math.max(0, frame - 200), fps, config: SPRING.hero, durationInFrames: 20 }),
        textShadow: '0 2px 16px rgba(0,0,0,0.6)',
      }}>
        6 מודולים. מערכת אחת. AI בכל שכבה.
      </div>

      <CinematicParticles count={25} color={BRAND.indigo} />
      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// RESULTS — Impact numbers with cinematic counter [1050-1350f]
// ═══════════════════════════════════════════════════════════
const ResultsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stats = [
    { value: '6', suffix: '', label: 'מודולים מלאים', color: BRAND.primary, delay: 0 },
    { value: '1', suffix: '', label: 'אפליקציה', color: BRAND.indigo, delay: 25 },
    { value: '100', suffix: '%', label: 'AI מובנה', color: '#22C55E', delay: 50 },
    { value: '∞', suffix: '', label: 'אפשרויות', color: '#F59E0B', delay: 75 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: '#050507', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <GlowOrb x="50%" y="50%" size={600} color={BRAND.primary} speed={0.02} />

      <div style={{ fontFamily: HEEBO, fontSize: 32, fontWeight: 900, color: BRAND.white, direction: 'rtl', marginBottom: 40, opacity: spring({ frame, fps, config: SPRING.hero, durationInFrames: 20 }), textShadow: '0 2px 16px rgba(0,0,0,0.6)' }}>
        המספרים מדברים
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 800 }}>
        {stats.map((stat, i) => {
          const s = spring({ frame: Math.max(0, frame - stat.delay), fps, config: { damping: 10, stiffness: 120, mass: 1 }, durationInFrames: 22 });
          const counterVal = stat.value === '∞' ? '∞' : stat.value === '100' ? `${Math.round(100 * s)}` : stat.value;
          return (
            <div key={i} style={{
              width: 170, padding: '28px 20px', borderRadius: 28, textAlign: 'center',
              background: `${stat.color}04`, border: `1px solid ${stat.color}12`,
              backdropFilter: 'blur(20px)',
              opacity: s, transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`,
              boxShadow: `0 16px 48px ${stat.color}10`,
            }}>
              <div style={{
                fontFamily: RUBIK, fontSize: 52, fontWeight: 900,
                background: `linear-gradient(135deg, ${stat.color}, ${BRAND.white})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                filter: `drop-shadow(0 0 12px ${stat.color}40)`,
              }}>
                {counterVal}{stat.suffix}
              </div>
              <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: BRAND.muted, marginTop: 8, direction: 'rtl' }}>{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Testimonial */}
      {frame > 160 && (
        <div style={{
          maxWidth: 700, padding: '24px 32px', borderRadius: 24, marginTop: 36,
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)', direction: 'rtl',
          opacity: spring({ frame: Math.max(0, frame - 160), fps, config: SPRING.hero, durationInFrames: 20 }),
          boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
        }}>
          <div style={{ fontFamily: HEEBO, fontSize: 17, fontWeight: 700, color: BRAND.white, lineHeight: 1.7, fontStyle: 'italic' }}>
            "MISRAD AI שינה את הדרך שבה אנחנו מנהלים את העסק. הכל במקום אחד, הכל חכם, הכל עובד."
          </div>
          <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: BRAND.muted, marginTop: 10 }}>— מנכ"ל, חברת טכנולוגיה</div>
        </div>
      )}

      <CinematicParticles count={20} color={BRAND.primary} />
      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// TAGLINE — Cinematic brand moment [1350-1500f]
// ═══════════════════════════════════════════════════════════
const TaglineScene: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(135deg, ${BRAND.primary} 0%, #1a0a15 30%, #0a0a1a 70%, ${BRAND.indigo} 100%)`,
      justifyContent: 'center', alignItems: 'center', opacity: fadeIn, overflow: 'hidden',
    }}>
      <CinematicParticles count={60} color="rgba(255,255,255,0.3)" />
      <TextReveal text="אפליקציה אחת. כניסה אחת." delay={5} fontSize={52} fontWeight={900} color="#fff" mode="words" stagger={3} style={{ textAlign: 'center' }} />
      <div style={{
        marginTop: 24, fontFamily: HEEBO, fontSize: 26, fontWeight: 700, color: 'rgba(255,255,255,0.6)', direction: 'rtl',
        opacity: spring({ frame: Math.max(0, frame - 40), fps: FPS, config: SPRING.hero, durationInFrames: 18 }),
      }}>
        טביעת אצבע. 🏢
      </div>
      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

export const BrandStoryVideoV2: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={T.HOOK.from} durationInFrames={T.HOOK.dur}><HookScene /></Sequence>
    <Sequence from={T.PROBLEM.from} durationInFrames={T.PROBLEM.dur}><ProblemScene /></Sequence>
    <Sequence from={T.SOLUTION.from} durationInFrames={T.SOLUTION.dur}><SolutionScene /></Sequence>
    <Sequence from={T.SHOWCASE.from} durationInFrames={T.SHOWCASE.dur}><ShowcaseScene /></Sequence>
    <Sequence from={T.RESULTS.from} durationInFrames={T.RESULTS.dur}><ResultsScene /></Sequence>
    <Sequence from={T.TAGLINE.from} durationInFrames={T.TAGLINE.dur}><TaglineScene /></Sequence>
    <Sequence from={T.CTA.from} durationInFrames={T.CTA.dur}>
      <CTAEndcard variant="dark" accentColor={BRAND.primary} tagline="MISRAD AI — אפליקציה אחת לכל העסק" />
    </Sequence>
  </AbsoluteFill>
);
