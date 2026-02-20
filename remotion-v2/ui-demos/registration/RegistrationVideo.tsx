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

const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const timerSpring = spring({ frame, fps, config: { damping: 20, stiffness: 60, mass: 1 }, durationInFrames: 30 });
  const seconds = Math.round(120 * (1 - timerSpring));

  const titleSpring = spring({ frame: Math.max(0, frame - 35), fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgLight, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${BRAND.primary}08 0%, transparent 60%)` }} />

      {/* Timer countdown */}
      <div style={{
        fontFamily: RUBIK, fontSize: 100, fontWeight: 800, color: BRAND.primary,
        transform: `scale(${interpolate(timerSpring, [0, 1], [1.3, 1])})`,
      }}>
        {seconds}s
      </div>
      <div style={{ fontFamily: HEEBO, fontSize: 24, fontWeight: 700, color: '#64748B', direction: 'rtl' }}>
        זמן הרשמה ממוצע
      </div>

      <div style={{ position: 'absolute', marginTop: 300, textAlign: 'center', opacity: titleSpring }}>
        <div style={{ fontFamily: HEEBO, fontSize: 36, fontWeight: 900, color: '#1E293B' }}>הרשמה ב-2 דקות</div>
        <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 700, color: '#64748B', direction: 'rtl', marginTop: 8 }}>
          בלי טפסים ארוכים. בלי כרטיס אשראי.
        </div>
      </div>
      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const painSpring = spring({ frame: Math.max(0, frame - 140), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgLight, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <DeviceFrame scale={1.05} delay={0} shadowIntensity={0.5}>
        <div style={{ width: '100%', height: '100%', background: '#FAFBFC', padding: '60px 20px 20px', direction: 'rtl' }}>
          <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 900, color: '#1E293B', marginBottom: 12 }}>הרשמה (באפליקציות אחרות)</div>

          {['שם מלא', 'אימייל', 'טלפון', 'שם חברה', 'תפקיד', 'מספר עובדים', 'כתובת', 'ת.ז.', 'כרטיס אשראי', 'קוד קופון'].map((field, i) => {
            const s = spring({ frame: Math.max(0, frame - i * 4), fps, config: SPRING.ui, durationInFrames: 12 });
            return (
              <div key={i} style={{
                padding: '8px 12px', marginBottom: 5, borderRadius: 10,
                background: '#fff', border: '1px solid #E2E8F0',
                opacity: s, fontFamily: HEEBO, fontSize: 12, fontWeight: 600, color: '#94A3B8',
              }}>
                {field} *
              </div>
            );
          })}

          <div style={{
            marginTop: 8, padding: '8px 14px', borderRadius: 10,
            background: '#FEF2F2', border: '1px solid #FECACA',
            fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: '#EF4444', textAlign: 'center',
            opacity: spring({ frame: Math.max(0, frame - 60), fps, config: SPRING.ui, durationInFrames: 14 }),
          }}>
            😩 10 שדות חובה. 15 דקות הרשמה.
          </div>
        </div>
      </DeviceFrame>

      {frame > 140 && (
        <div style={{
          position: 'absolute', bottom: 140, fontFamily: HEEBO, fontSize: 26, fontWeight: 900,
          color: '#EF4444', direction: 'rtl', opacity: painSpring, textShadow: '0 2px 12px rgba(0,0,0,0.2)',
        }}>
          טופס ארוך = לקוחות שנוטשים 📉
        </div>
      )}
      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const flashOpacity = interpolate(frame, [0, 8, 20], [0, 0.3, 0], { extrapolateRight: 'clamp' });

  const steps = [
    { step: 1, text: 'הכנס מספר טלפון', icon: '📱', done: frame > 40 },
    { step: 2, text: 'קוד אימות SMS', icon: '🔑', done: frame > 80 },
    { step: 3, text: 'בחר מודול', icon: '🎯', done: frame > 120 },
    { step: 4, text: 'הגדר טביעת אצבע', icon: '👆', done: frame > 160 },
    { step: 5, text: '!אתה בפנים', icon: '🎉', done: frame > 200 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgLight, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: BRAND.gradient, opacity: flashOpacity, pointerEvents: 'none' }} />

      <div style={{
        position: 'absolute', top: 60, fontFamily: HEEBO, fontSize: 22, fontWeight: 900,
        color: '#1E293B', direction: 'rtl',
        opacity: spring({ frame: Math.max(0, frame - 10), fps, config: SPRING.hero, durationInFrames: 18 }),
      }}>
        5 צעדים. 2 דקות. אתה בפנים. ✨
      </div>

      <DeviceFrame scale={1.0} delay={20} shadowIntensity={0.5}>
        <div style={{ width: '100%', height: '100%', background: '#FAFBFC', padding: '60px 20px 20px', direction: 'rtl' }}>
          <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 900, color: '#1E293B', marginBottom: 16 }}>הרשמה ל-MISRAD AI</div>

          {steps.map((s, i) => {
            const delay = 20 + i * 30;
            const sp = spring({ frame: Math.max(0, frame - delay), fps, config: SPRING.ui, durationInFrames: 16 });
            const doneColor = s.done ? '#22C55E' : '#E2E8F0';
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 8,
                borderRadius: 14, background: s.done ? '#F0FDF4' : '#fff',
                border: `1.5px solid ${s.done ? '#22C55E30' : '#E2E8F0'}`,
                opacity: sp, transform: `translateX(${interpolate(sp, [0, 1], [20, 0])}px)`,
              }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: doneColor, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 14, color: '#fff', fontFamily: RUBIK, fontWeight: 800, flexShrink: 0 }}>
                  {s.done ? '✓' : s.step}
                </div>
                <span style={{ fontSize: 16 }}>{s.icon}</span>
                <span style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: s.done ? '#1E293B' : '#94A3B8' }}>{s.text}</span>
              </div>
            );
          })}

          {frame > 220 && (
            <div style={{
              marginTop: 10, padding: '10px 14px', borderRadius: 14,
              background: '#F0FDF4', border: '1px solid #22C55E30', textAlign: 'center',
              opacity: spring({ frame: Math.max(0, frame - 220), fps, config: SPRING.punch, durationInFrames: 14 }),
            }}>
              <span style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 800, color: '#22C55E' }}>
                🎉 ברוך הבא! המערכת מוכנה.
              </span>
            </div>
          )}
        </div>
      </DeviceFrame>
      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

const ShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const features = [
    { emoji: '📱', title: 'הרשמה בטלפון בלבד', desc: 'אין צורך באימייל, ת.ז., או כרטיס אשראי. מספר טלפון מספיק.', color: BRAND.primary, delay: 0 },
    { emoji: '🔑', title: 'אימות SMS', desc: 'קוד חד-פעמי ב-SMS. מהיר, בטוח, נגיש.', color: '#F59E0B', delay: 60 },
    { emoji: '👆', title: 'כניסה ביומטרית', desc: 'טביעת אצבע או Face ID. כניסה בשנייה.', color: BRAND.indigo, delay: 120 },
    { emoji: '🎯', title: 'בחירת מודול מהירה', desc: 'בוחר מודול אחד, מתחיל מיד. משדרג בכל רגע.', color: '#22C55E', delay: 180 },
    { emoji: '⚡', title: 'אונבורדינג AI', desc: 'ה-AI לומד את העסק שלך ומגדיר הכל — אוטומטית.', color: '#7C3AED', delay: 240 },
    { emoji: '🕎', title: 'התאמה תרבותית', desc: 'עברית מלאה, לוח עברי, מצב שבת — מהרגע הראשון.', color: MODULE_COLORS.client.accent, delay: 300 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ fontFamily: HEEBO, fontSize: 30, fontWeight: 900, color: BRAND.white, marginBottom: 28, direction: 'rtl', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
        חווית הרשמה חלקה
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        {features.map((f, i) => (
          <GlassCard key={i} variant="dark" delay={f.delay} width={760} glowColor={f.color}>
            <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'flex-start', gap: 14, direction: 'rtl' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `${f.color}15`, border: `1px solid ${f.color}30`, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 24, flexShrink: 0 }}>{f.emoji}</div>
              <div>
                <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 800, color: f.color }}>{f.title}</div>
                <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: BRAND.muted, lineHeight: 1.5, marginTop: 2 }}>{f.desc}</div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

const ResultsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stats = [
    { value: '2min', label: 'זמן הרשמה', delay: 0 },
    { value: '5', label: 'צעדים בלבד', delay: 20 },
    { value: '0', label: 'כרטיס אשראי', delay: 40 },
    { value: '100%', label: 'מאובטח', delay: 60 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ fontFamily: HEEBO, fontSize: 28, fontWeight: 900, color: BRAND.white, marginBottom: 28, direction: 'rtl' }}>הרשמה שפשוט עובדת</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center' }}>
        {stats.map((stat, i) => {
          const s = spring({ frame: Math.max(0, frame - stat.delay), fps, config: SPRING.punch, durationInFrames: 18 });
          return (
            <GlassCard key={i} variant="dark" delay={stat.delay} width={700} glowColor={BRAND.primary}>
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
      <TextReveal text="2 דקות. בלי כרטיס. בפנים." delay={5} fontSize={52} fontWeight={900} color="#fff" mode="words" stagger={3} style={{ textAlign: 'center' }} />
      <div style={{ marginTop: 20, fontFamily: HEEBO, fontSize: 24, fontWeight: 700, color: 'rgba(255,255,255,0.7)', direction: 'rtl', opacity: spring({ frame: Math.max(0, frame - 30), fps: FPS, config: SPRING.hero, durationInFrames: 18 }) }}>
        הירשם עכשיו ב-misrad-ai.com
      </div>
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

export const RegistrationVideoV2: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={T.HOOK.from} durationInFrames={T.HOOK.dur}><HookScene /></Sequence>
    <Sequence from={T.PROBLEM.from} durationInFrames={T.PROBLEM.dur}><ProblemScene /></Sequence>
    <Sequence from={T.SOLUTION.from} durationInFrames={T.SOLUTION.dur}><SolutionScene /></Sequence>
    <Sequence from={T.SHOWCASE.from} durationInFrames={T.SHOWCASE.dur}><ShowcaseScene /></Sequence>
    <Sequence from={T.RESULTS.from} durationInFrames={T.RESULTS.dur}><ResultsScene /></Sequence>
    <Sequence from={T.TAGLINE.from} durationInFrames={T.TAGLINE.dur}><TaglineScene /></Sequence>
    <Sequence from={T.CTA.from} durationInFrames={T.CTA.dur}>
      <CTAEndcard variant="dark" accentColor={BRAND.primary} tagline="הירשם עכשיו — 2 דקות בלבד" />
    </Sequence>
  </AbsoluteFill>
);
