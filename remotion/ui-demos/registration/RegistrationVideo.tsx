import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from 'remotion';
import { BRAND, HEEBO, RUBIK, SPRING, FPS } from '../../shared/config';
import { NoiseLayer } from '../../shared/components/NoiseLayer';
import { DeviceFrame } from '../../shared/components/DeviceFrame';
import { TextReveal } from '../../shared/components/TextReveal';
import { CTAEndcard } from '../../shared/components/CTAEndcard';
import { pulse, FloatingOrbs, ParticleField, BreathingRing } from '../../shared/components/MicroAnimations';

// ═══════════════════════════════════════════════════════════
// SCENE 1: HOOK — Fingerprint scan [0-90f = 0-3s]
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const zoomScale = interpolate(frame, [0, 25], [3, 1], { extrapolateRight: 'clamp' });
  const zoomOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });

  const scanY = interpolate(frame, [10, 40], [-80, 80], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const scanOpacity = interpolate(frame, [10, 15, 35, 40], [0, 0.8, 0.8, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const successFrame = Math.max(0, frame - 40);
  const successOpacity = interpolate(successFrame, [0, 4, 14], [0, 0.5, 0], { extrapolateRight: 'clamp' });

  const ringPulse = frame > 40 ? interpolate(frame - 40, [0, 12], [1, 1.8], { extrapolateRight: 'clamp' }) : 1;
  const ringOp = frame > 40 ? interpolate(frame - 40, [0, 5, 12], [0, 0.5, 0], { extrapolateRight: 'clamp' }) : 0;

  const checkSpring = spring({ frame: Math.max(0, frame - 45), fps, config: SPRING.punch, durationInFrames: 12 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgLight, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={3} color={BRAND.primary} speed={0.01} maxSize={80} />

      <div style={{
        position: 'absolute', width: 800, height: 800, borderRadius: '50%',
        background: `radial-gradient(circle, ${BRAND.primary}08 0%, transparent 60%)`,
        opacity: pulse(frame, 0.04, 0.6, 0.9),
      }} />

      <BreathingRing color={BRAND.primary} size={300} speed={0.04} />

      <div style={{ transform: `scale(${zoomScale})`, opacity: zoomOpacity }}>
        <div style={{
          width: 160, height: 160, borderRadius: '50%',
          background: `${BRAND.primary}10`, border: `3px solid ${BRAND.primary}40`,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          position: 'relative', overflow: 'hidden',
          boxShadow: `0 0 ${pulse(frame, 0.05, 15, 30)}px ${BRAND.primary}15`,
        }}>
          <span style={{ fontSize: 72 }}>🔐</span>
          <div style={{
            position: 'absolute', left: 0, right: 0, height: 3,
            background: `linear-gradient(90deg, transparent, ${BRAND.primary}, transparent)`,
            top: `calc(50% + ${scanY}px)`, opacity: scanOpacity,
            boxShadow: `0 0 20px ${BRAND.primary}60`,
          }} />
        </div>
      </div>

      <div style={{ position: 'absolute', width: 160 * ringPulse, height: 160 * ringPulse, borderRadius: '50%', border: `2px solid #22C55E`, opacity: ringOp }} />
      <AbsoluteFill style={{ backgroundColor: '#22C55E', opacity: successOpacity, pointerEvents: 'none' }} />

      <div style={{
        position: 'absolute', marginTop: 240, fontSize: 56, opacity: checkSpring,
        transform: `scale(${interpolate(checkSpring, [0, 1], [0.4, 1])})`,
        filter: 'drop-shadow(0 0 12px rgba(34,197,94,0.5))',
      }}>
        ✅
      </div>

      <div style={{ position: 'absolute', marginTop: 340, opacity: checkSpring }}>
        <span style={{ fontFamily: HEEBO, fontSize: 28, fontWeight: 900, color: '#1E293B' }}>כניסה מאובטחת</span>
      </div>

      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 2: REGISTRATION FORM [90-330f = 3-11s]
// ═══════════════════════════════════════════════════════════
const RegistrationScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fields = [
    { label: 'שם מלא', value: 'יצחק דהן', icon: '👤', delay: 8 },
    { label: 'אימייל', value: 'itsik@company.co.il', icon: '📧', delay: 30 },
    { label: 'טלפון', value: '054-1234567', icon: '📱', delay: 52 },
    { label: 'שם הארגון', value: 'דהן ושות׳', icon: '🏢', delay: 74 },
  ];

  const getTypedValue = (value: string, delay: number) => {
    const elapsed = Math.max(0, frame - delay - 10);
    const chars = Math.min(Math.floor(elapsed * 0.5), value.length);
    return value.slice(0, chars);
  };

  const ctaSpring = spring({ frame: Math.max(0, frame - 120), fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgLight, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={2} color={BRAND.primary} speed={0.008} maxSize={70} />

      <DeviceFrame scale={1.1} delay={0} shadowIntensity={0.5}>
        <div style={{ width: '100%', height: '100%', background: '#FAFBFC', padding: '70px 24px 20px', direction: 'rtl' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 44, marginBottom: 6 }}>🚀</div>
            <div style={{ fontFamily: HEEBO, fontSize: 22, fontWeight: 900, color: '#1E293B' }}>הצטרף ל-MISRAD AI</div>
            <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: '#64748B', marginTop: 4 }}>הקמה תוך 5 דקות</div>
          </div>

          {fields.map((field, i) => {
            const fieldSpring = spring({ frame: Math.max(0, frame - field.delay), fps, config: SPRING.ui, durationInFrames: 16 });
            const typedValue = getTypedValue(field.value, field.delay);
            const isFocused = frame >= field.delay + 10 && frame < field.delay + 10 + field.value.length / 0.5 + 12;

            return (
              <div key={i} style={{
                marginBottom: 12, opacity: fieldSpring,
                transform: `translateY(${interpolate(fieldSpring, [0, 1], [15, 0])}px)`,
              }}>
                <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 3 }}>
                  {field.icon} {field.label}
                </div>
                <div style={{
                  padding: '10px 14px', borderRadius: 12, background: '#fff',
                  border: isFocused ? `2px solid ${BRAND.primary}` : '1px solid #E2E8F0',
                  boxShadow: isFocused ? `0 0 0 3px ${BRAND.primary}15` : 'none',
                  fontFamily: HEEBO, fontSize: 15, fontWeight: 600, color: '#1E293B',
                  minHeight: 18, display: 'flex', alignItems: 'center',
                }}>
                  {typedValue}
                  {isFocused && <span style={{ width: 2, height: 16, background: BRAND.primary, marginRight: 2, opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0 }} />}
                </div>
              </div>
            );
          })}

          <div style={{
            marginTop: 16, padding: '14px 0', borderRadius: 14,
            background: BRAND.gradient, textAlign: 'center',
            opacity: ctaSpring, transform: `scale(${interpolate(ctaSpring, [0, 1], [0.9, 1])})`,
            boxShadow: `0 8px 30px ${BRAND.primary}30`,
          }}>
            <span style={{ fontFamily: HEEBO, fontSize: 17, fontWeight: 900, color: '#fff' }}>התחל עכשיו →</span>
          </div>
        </div>
      </DeviceFrame>
      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 3: BIOMETRIC [330-560f = 11-18.7s]
// ═══════════════════════════════════════════════════════════
const BiometricScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scanCycle = (frame % 50) / 50;
  const scanY = interpolate(scanCycle, [0, 1], [-60, 60]);

  const fillProgress = interpolate(frame, [15, 140], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference * (1 - fillProgress);

  const isComplete = frame > 140;
  const successSpring = spring({ frame: Math.max(0, frame - 140), fps, config: SPRING.punch, durationInFrames: 15 });
  const welcomeSpring = spring({ frame: Math.max(0, frame - 160), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgLight, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={2} color={BRAND.primary} speed={0.008} maxSize={70} />

      <DeviceFrame scale={1.1} delay={0} shadowIntensity={0.5}>
        <div style={{ width: '100%', height: '100%', background: '#FAFBFC', padding: '70px 24px 20px', direction: 'rtl', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {!isComplete ? (
            <>
              <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 900, color: '#1E293B', marginBottom: 6 }}>הגדרת טביעת אצבע</div>
              <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: '#64748B', marginBottom: 30 }}>הנח את האצבע על החיישן</div>

              <div style={{ position: 'relative', width: 160, height: 160, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <svg width={180} height={180} style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
                  <circle cx={90} cy={90} r={radius} fill="none" stroke="#E2E8F0" strokeWidth={4} />
                  <circle cx={90} cy={90} r={radius} fill="none" stroke={BRAND.primary} strokeWidth={4} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeOffset} style={{ filter: `drop-shadow(0 0 8px ${BRAND.primary}40)` }} />
                </svg>

                <div style={{
                  width: 120, height: 120, borderRadius: '50%',
                  background: `${BRAND.primary}08`, border: `2px solid ${BRAND.primary}30`,
                  display: 'flex', justifyContent: 'center', alignItems: 'center',
                  position: 'relative', overflow: 'hidden',
                }}>
                  <span style={{ fontSize: 48 }}>👆</span>
                  <div style={{
                    position: 'absolute', left: 0, right: 0, height: 2,
                    background: `linear-gradient(90deg, transparent, ${BRAND.primary}, transparent)`,
                    top: `calc(50% + ${scanY}px)`, opacity: 0.6,
                  }} />
                </div>
              </div>

              <div style={{ marginTop: 20, fontFamily: RUBIK, fontSize: 22, fontWeight: 800, color: BRAND.primary }}>
                {Math.round(fillProgress * 100)}%
              </div>
            </>
          ) : (
            <>
              <div style={{ marginTop: 36, fontSize: 72, opacity: successSpring, transform: `scale(${interpolate(successSpring, [0, 1], [0.3, 1])})` }}>
                ✅
              </div>
              <div style={{ fontFamily: HEEBO, fontSize: 24, fontWeight: 900, color: '#22C55E', marginTop: 16, opacity: successSpring }}>
                אומת בהצלחה!
              </div>

              <div style={{
                marginTop: 28, padding: 20, borderRadius: 22,
                background: '#fff', boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
                border: '1px solid rgba(0,0,0,0.04)',
                textAlign: 'center', width: '90%',
                opacity: welcomeSpring, transform: `translateY(${interpolate(welcomeSpring, [0, 1], [25, 0])}px)`,
              }}>
                <div style={{ fontSize: 32, marginBottom: 6 }}>👋</div>
                <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 900, color: '#1E293B' }}>ברוך הבא!</div>
                <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: '#64748B', marginTop: 4 }}>המערכת שלך מוכנה</div>
              </div>
            </>
          )}
        </div>
      </DeviceFrame>
      <NoiseLayer opacity={0.015} />
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

      <TextReveal text="5 דקות להקמה. AI מהרגע הראשון." delay={5} fontSize={42} fontWeight={900} color="#fff" mode="words" stagger={2} style={{ textAlign: 'center' }} />

      <div style={{
        marginTop: 24, padding: '8px 20px', borderRadius: 12,
        background: 'rgba(255,255,255,0.1)',
        fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.65)', direction: 'rtl',
        opacity: subSpring,
      }}>
        הרשמה. אימות. מוכן.
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN — 30 seconds (900 frames)
// ═══════════════════════════════════════════════════════════
export const RegistrationVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={90}><HookScene /></Sequence>
      <Sequence from={90} durationInFrames={240}><RegistrationScene /></Sequence>
      <Sequence from={330} durationInFrames={230}><BiometricScene /></Sequence>
      <Sequence from={560} durationInFrames={310}><TaglineScene /></Sequence>
      <Sequence from={870} durationInFrames={30}>
        <CTAEndcard variant="light" accentColor={BRAND.primary} tagline="5 דקות להקמה. AI מהרגע הראשון." />
      </Sequence>
    </AbsoluteFill>
  );
};
