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
import { NoiseLayer, GlassCard, TextReveal, CTAEndcard, DeviceFrame, pulse } from '../../shared/components';

const T = V2_TIMING;

const MODULES_NAV = [
  { key: 'system', label: 'System', emoji: '🎯', color: MODULE_COLORS.system.accent, gradient: MODULE_COLORS.system.gradient },
  { key: 'nexus', label: 'Nexus', emoji: '👥', color: MODULE_COLORS.nexus.accent, gradient: MODULE_COLORS.nexus.gradient },
  { key: 'social', label: 'Social', emoji: '📱', color: MODULE_COLORS.social.accent, gradient: MODULE_COLORS.social.gradient },
  { key: 'finance', label: 'Finance', emoji: '💰', color: MODULE_COLORS.finance.accent, gradient: MODULE_COLORS.finance.gradient },
  { key: 'client', label: 'Client', emoji: '🤝', color: MODULE_COLORS.client.accent, gradient: MODULE_COLORS.client.gradient },
  { key: 'operations', label: 'Operations', emoji: '⚡', color: MODULE_COLORS.operations.accent, gradient: MODULE_COLORS.operations.gradient },
];

// ═══════════════════════════════════════════════════════════
// HOOK — App opens with fingerprint auth [0-90f]
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scanProgress = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: 'clamp' });
  const scanRing = spring({ frame: Math.max(0, frame - 25), fps, config: SPRING.punch, durationInFrames: 14 });
  const successFlash = interpolate(frame, [25, 30, 40], [0, 0.4, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const welcomeSpring = spring({ frame: Math.max(0, frame - 35), fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <DeviceFrame scale={1.1} delay={0}>
        <div style={{ width: '100%', height: '100%', background: '#0F0F12', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          {/* Fingerprint scanner */}
          {frame < 40 && (
            <div style={{ position: 'relative', width: 100, height: 100, marginBottom: 20 }}>
              <svg width={100} height={100}>
                <circle cx={50} cy={50} r={44} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={3} />
                <circle cx={50} cy={50} r={44} fill="none" stroke={BRAND.primary} strokeWidth={3}
                  strokeDasharray={`${scanProgress * 276} 276`} strokeLinecap="round"
                  style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} />
              </svg>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 36 }}>
                {frame > 25 ? '✅' : '👆'}
              </div>
            </div>
          )}

          {/* Success flash */}
          {frame >= 25 && frame < 40 && (
            <div style={{ position: 'absolute', width: '100%', height: '100%', background: `${BRAND.primary}`, opacity: successFlash, pointerEvents: 'none' }} />
          )}

          {/* Welcome screen */}
          {frame >= 35 && (
            <div style={{ textAlign: 'center', opacity: welcomeSpring, transform: `translateY(${interpolate(welcomeSpring, [0, 1], [20, 0])}px)` }}>
              <div style={{ fontFamily: HEEBO, fontSize: 24, fontWeight: 900, color: BRAND.white, marginBottom: 6 }}>שלום, דוד 👋</div>
              <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 600, color: BRAND.muted, direction: 'rtl' }}>ברוך הבא ל-MISRAD AI</div>
            </div>
          )}
        </div>
      </DeviceFrame>

      <div style={{
        position: 'absolute', bottom: 120, fontFamily: HEEBO, fontSize: 28, fontWeight: 900,
        color: BRAND.white, direction: 'rtl', textShadow: '0 2px 12px rgba(0,0,0,0.5)',
        opacity: spring({ frame: Math.max(0, frame - 50), fps, config: SPRING.hero, durationInFrames: 18 }),
      }}>
        כניסה אחת. טביעת אצבע. 🔐
      </div>
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// PROBLEM — Complex navigation in other apps [90-300f]
// ═══════════════════════════════════════════════════════════
const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const painSpring = spring({ frame: Math.max(0, frame - 140), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <DeviceFrame scale={1.05} delay={0}>
        <div style={{ width: '100%', height: '100%', background: '#0F0F12', padding: '60px 16px 16px', direction: 'rtl' }}>
          <div style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 900, color: BRAND.white, marginBottom: 12 }}>
            אפליקציות אחרות...
          </div>

          {/* Confusing nested menus */}
          {['תפריט ראשי', 'הגדרות', 'מודולים', 'אינטגרציות', 'דוחות', 'ניהול משתמשים', 'עוד...'].map((item, i) => {
            const s = spring({ frame: Math.max(0, frame - i * 4), fps, config: SPRING.ui, durationInFrames: 12 });
            const indent = Math.min(i, 3) * 16;
            return (
              <div key={i} style={{
                padding: '8px 12px', marginBottom: 4, marginRight: indent, borderRadius: 10,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)',
                opacity: s, fontFamily: HEEBO, fontSize: 12, fontWeight: 600, color: BRAND.muted,
              }}>
                {'▸'.repeat(Math.min(i, 3) + 1)} {item}
              </div>
            );
          })}

          <div style={{
            marginTop: 12, padding: '10px 14px', borderRadius: 12,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
            fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: '#EF4444', textAlign: 'center',
            opacity: spring({ frame: Math.max(0, frame - 60), fps, config: SPRING.ui, durationInFrames: 14 }),
          }}>
            😵 7 רמות תפריטים. איפה הכפתור?
          </div>
        </div>
      </DeviceFrame>

      {frame > 140 && (
        <div style={{
          position: 'absolute', bottom: 140, fontFamily: HEEBO, fontSize: 26, fontWeight: 900,
          color: '#EF4444', direction: 'rtl', opacity: painSpring, textShadow: '0 2px 20px rgba(0,0,0,0.8)',
        }}>
          ניווט מסובך = זמן מבוזבז 😤
        </div>
      )}
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SOLUTION — Clean MISRAD AI navigation [300-600f]
// ═══════════════════════════════════════════════════════════
const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const flashOpacity = interpolate(frame, [0, 8, 20], [0, 0.5, 0], { extrapolateRight: 'clamp' });
  const activeIdx = Math.floor(interpolate(frame, [60, 280], [0, 5.99], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: BRAND.gradient, opacity: flashOpacity, pointerEvents: 'none' }} />

      <div style={{
        position: 'absolute', top: 60, fontFamily: HEEBO, fontSize: 22, fontWeight: 900,
        color: BRAND.white, direction: 'rtl', textShadow: '0 2px 12px rgba(0,0,0,0.5)',
        opacity: spring({ frame: Math.max(0, frame - 10), fps, config: SPRING.hero, durationInFrames: 18 }),
      }}>
        MISRAD AI — ניווט נקי ופשוט ✨
      </div>

      <DeviceFrame scale={1.05} delay={20}>
        <div style={{ width: '100%', height: '100%', background: '#0F0F12', padding: '60px 16px 16px', direction: 'rtl' }}>
          {/* Module grid */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {MODULES_NAV.map((mod, i) => {
              const delay = 40 + i * 6;
              const s = spring({ frame: Math.max(0, frame - delay), fps, config: SPRING.ui, durationInFrames: 14 });
              const isActive = i === activeIdx;
              return (
                <div key={i} style={{
                  width: 140, padding: '14px 10px', borderRadius: 18, textAlign: 'center',
                  background: isActive ? `${mod.color}15` : 'rgba(255,255,255,0.03)',
                  border: `1.5px solid ${isActive ? mod.color : 'rgba(255,255,255,0.06)'}`,
                  boxShadow: isActive ? `0 4px 16px ${mod.color}25` : 'none',
                  opacity: s, transform: `translateY(${interpolate(s, [0, 1], [15, 0])}px) scale(${isActive ? 1.05 : 1})`,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, background: mod.gradient,
                    display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 20, margin: '0 auto 6px',
                  }}>{mod.emoji}</div>
                  <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: isActive ? mod.color : BRAND.white }}>{mod.label}</div>
                </div>
              );
            })}
          </div>

          {/* Active module content preview */}
          {activeIdx >= 0 && (
            <div style={{
              marginTop: 14, padding: '12px 16px', borderRadius: 16,
              background: `${MODULES_NAV[activeIdx].color}08`, border: `1px solid ${MODULES_NAV[activeIdx].color}20`,
              opacity: spring({ frame: Math.max(0, frame - 80), fps, config: SPRING.ui, durationInFrames: 14 }),
            }}>
              <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 800, color: MODULES_NAV[activeIdx].color, marginBottom: 6 }}>
                {MODULES_NAV[activeIdx].emoji} {MODULES_NAV[activeIdx].label}
              </div>
              <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 600, color: BRAND.muted }}>
                לחץ על מודול כדי לראות את לוח הבקרה שלו
              </div>
            </div>
          )}
        </div>
      </DeviceFrame>
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SHOWCASE — Dark/Light mode + responsive [600-1050f]
// ═══════════════════════════════════════════════════════════
const ShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isDark = frame < 225;

  const features = [
    { emoji: '🌙', title: 'מצב כהה / בהיר', desc: 'ממשק שמתאים את עצמו — אוטומטי או ידני.', color: BRAND.indigo, delay: 0 },
    { emoji: '📱', title: 'רספונסיבי מלא', desc: 'מושלם על כל מסך — מובייל, טאבלט, דסקטופ.', color: '#22C55E', delay: 60 },
    { emoji: '🔐', title: 'כניסה בטביעת אצבע', desc: 'אבטחה מקסימלית. כניסה מהירה. אימות ביומטרי.', color: BRAND.primary, delay: 120 },
    { emoji: '⚡', title: 'ניווט מודולרי', desc: 'כל מודול בלחיצה אחת. אין תפריטים מקוננים.', color: '#F59E0B', delay: 180 },
    { emoji: '🎨', title: 'עיצוב Glassmorphism', desc: 'ממשק פרימיום עם שקיפויות, צללים, ואנימציות.', color: '#7C3AED', delay: 240 },
    { emoji: '🕎', title: 'מותאם לעברית', desc: 'RTL מלא. פונטים עבריים. מותאם תרבותית.', color: MODULE_COLORS.client.accent, delay: 300 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: isDark ? BRAND.bgDark : BRAND.bgLight, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ fontFamily: HEEBO, fontSize: 30, fontWeight: 900, color: isDark ? BRAND.white : '#1E293B', marginBottom: 28, direction: 'rtl', textShadow: isDark ? '0 2px 12px rgba(0,0,0,0.5)' : 'none' }}>
        חווית משתמש ללא פשרות
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        {features.map((f, i) => (
          <GlassCard key={i} variant={isDark ? 'dark' : 'light'} delay={f.delay} width={760} glowColor={f.color}>
            <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'flex-start', gap: 14, direction: 'rtl' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `${f.color}15`, border: `1px solid ${f.color}30`, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 24, flexShrink: 0 }}>{f.emoji}</div>
              <div>
                <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 800, color: f.color }}>{f.title}</div>
                <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: isDark ? BRAND.muted : '#64748B', lineHeight: 1.5, marginTop: 2 }}>{f.desc}</div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
      <NoiseLayer opacity={isDark ? 0.02 : 0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// RESULTS [1050-1350f]
// ═══════════════════════════════════════════════════════════
const ResultsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stats = [
    { value: '<2s', label: 'זמן כניסה', delay: 0 },
    { value: '1', label: 'לחיצה למודול', delay: 20 },
    { value: '100%', label: 'RTL עברית', delay: 40 },
    { value: '0', label: 'תפריטים מקוננים', delay: 60 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ fontFamily: HEEBO, fontSize: 28, fontWeight: 900, color: BRAND.white, marginBottom: 28, direction: 'rtl' }}>UX שעושה את ההבדל</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center' }}>
        {stats.map((stat, i) => {
          const s = spring({ frame: Math.max(0, frame - stat.delay), fps, config: SPRING.punch, durationInFrames: 18 });
          return (
            <GlassCard key={i} variant="dark" delay={stat.delay} width={700} glowColor={BRAND.indigo}>
              <div style={{ padding: '24px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl' }}>
                <span style={{ fontFamily: HEEBO, fontSize: 24, fontWeight: 700, color: BRAND.muted }}>{stat.label}</span>
                <span style={{ fontFamily: RUBIK, fontSize: 56, fontWeight: 800, background: BRAND.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', transform: `scale(${interpolate(s, [0, 1], [1.4, 1])})`, filter: `blur(${interpolate(s, [0, 1], [6, 0])}px)`, display: 'inline-block' }}>{stat.value}</span>
              </div>
            </GlassCard>
          );
        })}
      </div>
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

const TaglineScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: BRAND.gradient, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }) }}>
      <TextReveal text="אפליקציה אחת. כניסה אחת." delay={5} fontSize={52} fontWeight={900} color="#fff" mode="words" stagger={3} style={{ textAlign: 'center' }} />
      <div style={{ marginTop: 20, fontFamily: HEEBO, fontSize: 24, fontWeight: 700, color: 'rgba(255,255,255,0.7)', direction: 'rtl', opacity: spring({ frame: Math.max(0, frame - 30), fps: FPS, config: SPRING.hero, durationInFrames: 18 }) }}>
        טביעת אצבע. ניווט נקי. UX ללא פשרות.
      </div>
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

export const NavigationVideoV2: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={T.HOOK.from} durationInFrames={T.HOOK.dur}><HookScene /></Sequence>
    <Sequence from={T.PROBLEM.from} durationInFrames={T.PROBLEM.dur}><ProblemScene /></Sequence>
    <Sequence from={T.SOLUTION.from} durationInFrames={T.SOLUTION.dur}><SolutionScene /></Sequence>
    <Sequence from={T.SHOWCASE.from} durationInFrames={T.SHOWCASE.dur}><ShowcaseScene /></Sequence>
    <Sequence from={T.RESULTS.from} durationInFrames={T.RESULTS.dur}><ResultsScene /></Sequence>
    <Sequence from={T.TAGLINE.from} durationInFrames={T.TAGLINE.dur}><TaglineScene /></Sequence>
    <Sequence from={T.CTA.from} durationInFrames={T.CTA.dur}>
      <CTAEndcard variant="dark" accentColor={BRAND.indigo} tagline="UX ללא פשרות" />
    </Sequence>
  </AbsoluteFill>
);
