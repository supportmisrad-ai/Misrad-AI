import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
  Img,
  staticFile,
} from 'remotion';
import { BRAND, MODULE_COLORS, HEEBO, RUBIK, SPRING, FPS } from '../../shared/config';
import { NoiseLayer } from '../../shared/components/NoiseLayer';
import { GlassCard } from '../../shared/components/GlassCard';
import { PhoneFrame } from '../../shared/components/PhoneFrame';
import { TextReveal } from '../../shared/components/TextReveal';
import { CTAEndcard } from '../../shared/components/CTAEndcard';

const SYSTEM = MODULE_COLORS.system;
const TOTAL_FRAMES = 18 * FPS; // 540 frames = 18 seconds

// ═══════════════════════════════════════════════════════════
// SCENE 1: HOOK — Pixel explosion → "75% סיכוי לסגירה"
// [0 - 36 frames = 0-1.2s]
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Pixel appears and pulses (frames 0-8)
  const pixelScale = frame < 8
    ? interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' })
    : 1;

  // Shockwave expands (frames 8-20)
  const shockwaveProgress = frame >= 8
    ? interpolate(frame, [8, 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0;
  const shockwaveRadius = shockwaveProgress * 1200;
  const shockwaveOpacity = interpolate(shockwaveProgress, [0, 0.3, 1], [0, 0.8, 0]);

  // Background flash on impact
  const flashOpacity = frame >= 8
    ? interpolate(frame, [8, 12, 20], [0, 0.15, 0], { extrapolateRight: 'clamp' })
    : 0;

  // Text "75%" reveal after shockwave
  const textSpring = spring({
    frame: Math.max(0, frame - 14),
    fps,
    config: SPRING.punch,
    durationInFrames: 12,
  });

  const textScale = interpolate(textSpring, [0, 1], [1.8, 1]);
  const textOpacity = interpolate(textSpring, [0, 1], [0, 1]);

  // Sub-text
  const subSpring = spring({
    frame: Math.max(0, frame - 22),
    fps,
    config: SPRING.ui,
    durationInFrames: 14,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center' }}>
      {/* Central pixel */}
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: SYSTEM.accent,
          transform: `scale(${pixelScale})`,
          boxShadow: `0 0 ${20 + frame * 2}px ${SYSTEM.accent}`,
          position: 'absolute',
        }}
      />

      {/* Shockwave ring */}
      <div
        style={{
          position: 'absolute',
          width: shockwaveRadius * 2,
          height: shockwaveRadius * 2,
          borderRadius: '50%',
          border: `3px solid ${SYSTEM.accent}`,
          opacity: shockwaveOpacity,
          boxShadow: `0 0 60px ${SYSTEM.accent}40, inset 0 0 60px ${SYSTEM.accent}20`,
        }}
      />

      {/* Radial particles on shockwave */}
      {frame >= 8 && Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const dist = shockwaveProgress * 400 + Math.sin(i * 1.5) * 50;
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;
        const particleOpacity = interpolate(shockwaveProgress, [0, 0.5, 1], [0, 1, 0]);

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: 4,
              height: 4,
              borderRadius: '50%',
              backgroundColor: i % 2 === 0 ? SYSTEM.accent : BRAND.white,
              left: '50%',
              top: '50%',
              transform: `translate(${x}px, ${y}px)`,
              opacity: particleOpacity * 0.8,
              boxShadow: `0 0 8px ${SYSTEM.accent}`,
            }}
          />
        );
      })}

      {/* Flash overlay */}
      <AbsoluteFill
        style={{
          backgroundColor: SYSTEM.accent,
          opacity: flashOpacity,
          pointerEvents: 'none',
        }}
      />

      {/* "75%" big number */}
      <div
        style={{
          position: 'absolute',
          fontFamily: RUBIK,
          fontSize: 160,
          fontWeight: 800,
          color: BRAND.white,
          transform: `scale(${textScale})`,
          opacity: textOpacity,
          textShadow: `0 0 60px ${SYSTEM.accent}60`,
          letterSpacing: -4,
        }}
      >
        75%
      </div>

      {/* Sub text */}
      <div
        style={{
          position: 'absolute',
          marginTop: 200,
          fontFamily: HEEBO,
          fontSize: 32,
          fontWeight: 700,
          color: BRAND.muted,
          opacity: subSpring,
          transform: `translateY(${interpolate(subSpring, [0, 1], [20, 0])}px)`,
          direction: 'rtl',
        }}
      >
        סיכוי לסגירה
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 2: SETUP — Lead list chaos
// [36 - 105 frames = 1.2s-3.5s]
// ═══════════════════════════════════════════════════════════
const LEADS = [
  { name: 'אבי כהן', status: 'cold', score: 12 },
  { name: 'דנה לוי', status: 'warm', score: 68 },
  { name: 'רון מזרחי', status: 'cold', score: 23 },
  { name: 'מיכל ברק', status: 'hot', score: 91 },
  { name: 'יוסי אדרי', status: 'cold', score: 8 },
  { name: 'שרה גולן', status: 'warm', score: 55 },
  { name: 'עומר חדד', status: 'cold', score: 15 },
];

const SetupScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Camera truck left
  const truckX = interpolate(frame, [0, 69], [0, -30], { extrapolateRight: 'clamp' });
  const tilt = interpolate(frame, [0, 69], [0, 1.5], { extrapolateRight: 'clamp' });

  // Phone entrance
  const phoneEntrance = spring({
    frame,
    fps,
    config: SPRING.hero,
    durationInFrames: 20,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center' }}>
      {/* Dim red ambient glow */}
      <div
        style={{
          position: 'absolute',
          width: 800,
          height: 800,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${SYSTEM.accent}12 0%, transparent 70%)`,
          transform: `translate(${truckX}px, 0)`,
        }}
      />

      <div
        style={{
          transform: `translateX(${truckX}px) perspective(1200px) rotateY(${tilt}deg)`,
        }}
      >
        <PhoneFrame scale={1.15} delay={0}>
          {/* Screen: Lead list */}
          <div
            style={{
              width: '100%',
              height: '100%',
              background: '#0F0F12',
              padding: '60px 20px 20px',
              direction: 'rtl',
            }}
          >
            {/* Header */}
            <div
              style={{
                fontFamily: HEEBO,
                fontSize: 22,
                fontWeight: 900,
                color: BRAND.white,
                marginBottom: 16,
                textAlign: 'right',
              }}
            >
              הלידים שלי
            </div>

            {/* Lead cards */}
            {LEADS.map((lead, i) => {
              const cardDelay = i * 4;
              const cardSpring = spring({
                frame: Math.max(0, frame - cardDelay - 5),
                fps,
                config: SPRING.ui,
                durationInFrames: 12,
              });

              const statusColor = lead.status === 'hot'
                ? '#22C55E'
                : lead.status === 'warm'
                  ? '#F59E0B'
                  : '#EF4444';

              // Chaotic shake for cold leads
              const shakeX = lead.status === 'cold'
                ? Math.sin(frame * 0.3 + i * 2) * 2
                : 0;

              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    marginBottom: 8,
                    borderRadius: 14,
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid rgba(255,255,255,0.06)`,
                    opacity: cardSpring,
                    transform: `translateX(${interpolate(cardSpring, [0, 1], [40, 0]) + shakeX}px)`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Status dot */}
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: statusColor,
                        boxShadow: `0 0 8px ${statusColor}60`,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: HEEBO,
                        fontSize: 16,
                        fontWeight: 700,
                        color: BRAND.white,
                      }}
                    >
                      {lead.name}
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: RUBIK,
                      fontSize: 14,
                      fontWeight: 700,
                      color: statusColor,
                    }}
                  >
                    {lead.score}%
                  </span>
                </div>
              );
            })}
          </div>
        </PhoneFrame>
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 3: AI ENTRANCE — Light sweep + sorted UI
// [105 - 180 frames = 3.5s-6.0s]
// ═══════════════════════════════════════════════════════════
const AIEntranceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Light sweep from center (dark→light transition)
  const sweepProgress = interpolate(frame, [0, 45], [0, 1], { extrapolateRight: 'clamp' });

  // Background color transition: dark → light
  const bgLightness = interpolate(sweepProgress, [0, 1], [0, 1]);
  const bgColor = `color-mix(in srgb, ${BRAND.bgDark} ${(1 - bgLightness) * 100}%, ${BRAND.bgLight} ${bgLightness * 100}%)`;

  // Pulse ring
  const pulseScale = interpolate(frame, [0, 15, 30], [0, 1.5, 2.5], { extrapolateRight: 'clamp' });
  const pulseOpacity = interpolate(frame, [0, 10, 30], [0, 0.6, 0], { extrapolateRight: 'clamp' });

  // AI badge entrance
  const badgeSpring = spring({
    frame: Math.max(0, frame - 20),
    fps,
    config: SPRING.punch,
    durationInFrames: 15,
  });

  // Text: "ה-AI יודע"
  const textDelay = 30;

  return (
    <AbsoluteFill
      style={{
        background: bgLightness < 0.5
          ? BRAND.bgDark
          : BRAND.bgLight,
        justifyContent: 'center',
        alignItems: 'center',
        transition: 'background 0.5s',
      }}
    >
      {/* Light sweep radial */}
      <div
        style={{
          position: 'absolute',
          width: 1200,
          height: 1200,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${SYSTEM.accent}${Math.round(sweepProgress * 20).toString(16).padStart(2, '0')} 0%, transparent 60%)`,
          transform: `scale(${0.5 + sweepProgress * 1.5})`,
        }}
      />

      {/* Pulse ring */}
      <div
        style={{
          position: 'absolute',
          width: 200,
          height: 200,
          borderRadius: '50%',
          border: `3px solid ${SYSTEM.accent}`,
          transform: `scale(${pulseScale})`,
          opacity: pulseOpacity,
        }}
      />

      {/* AI Badge */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          transform: `scale(${interpolate(badgeSpring, [0, 1], [0.5, 1])})`,
          opacity: badgeSpring,
        }}
      >
        {/* AI icon circle */}
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: SYSTEM.gradient,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            boxShadow: `0 20px 60px ${SYSTEM.accent}40`,
          }}
        >
          <span style={{ fontSize: 48 }}>🧠</span>
        </div>
      </div>

      {/* "ה-AI יודע" */}
      <div style={{ position: 'absolute', marginTop: 200 }}>
        <TextReveal
          text="ה-AI יודע."
          delay={textDelay}
          fontSize={56}
          fontWeight={900}
          color={bgLightness > 0.5 ? '#1E293B' : BRAND.white}
          mode="words"
          stagger={3}
        />
      </div>

      <NoiseLayer opacity={bgLightness > 0.5 ? 0.015 : 0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 4: SHOWCASE — Real UI in action
// [180 - 300 frames = 6.0s-10.0s]
// ═══════════════════════════════════════════════════════════
const ShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Crane up effect
  const craneY = interpolate(frame, [0, 120], [60, -40], { extrapolateRight: 'clamp' });

  // Health score bar fill
  const barFill = spring({
    frame: Math.max(0, frame - 15),
    fps,
    config: { damping: 20, stiffness: 60, mass: 1 },
    durationInFrames: 40,
  });

  // Recommendation card slide-in
  const recSlide = spring({
    frame: Math.max(0, frame - 50),
    fps,
    config: SPRING.hero,
    durationInFrames: 20,
  });

  // Badge pop-in
  const badgePop = spring({
    frame: Math.max(0, frame - 35),
    fps,
    config: SPRING.punch,
    durationInFrames: 12,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgLight, justifyContent: 'center', alignItems: 'center' }}>
      {/* Soft ambient glow */}
      <div
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${SYSTEM.accent}10 0%, transparent 70%)`,
          top: '20%',
        }}
      />

      <div style={{ transform: `translateY(${craneY}px)` }}>
        <PhoneFrame scale={1.1} delay={0} shadowIntensity={0.6}>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: BRAND.bgLight,
              padding: '60px 20px 20px',
              direction: 'rtl',
            }}
          >
            {/* Header */}
            <div
              style={{
                fontFamily: HEEBO,
                fontSize: 20,
                fontWeight: 900,
                color: '#1E293B',
                marginBottom: 20,
                textAlign: 'right',
              }}
            >
              פרופיל ליד — דנה לוי
            </div>

            {/* Health Score Card */}
            <div
              style={{
                padding: 20,
                borderRadius: 20,
                background: '#fff',
                boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
                marginBottom: 16,
                border: '1px solid rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: '#64748B' }}>
                  Health Score
                </span>
                <span style={{ fontFamily: RUBIK, fontSize: 28, fontWeight: 800, color: SYSTEM.accent }}>
                  {Math.round(75 * barFill)}%
                </span>
              </div>
              {/* Progress bar */}
              <div style={{ width: '100%', height: 8, borderRadius: 4, background: '#F1F5F9' }}>
                <div
                  style={{
                    width: `${75 * barFill}%`,
                    height: '100%',
                    borderRadius: 4,
                    background: SYSTEM.gradient,
                    boxShadow: `0 0 12px ${SYSTEM.accent}40`,
                  }}
                />
              </div>
            </div>

            {/* AI Badge "שלח הצעה עד רביעי" */}
            <div
              style={{
                padding: '12px 18px',
                borderRadius: 14,
                background: `${SYSTEM.accent}12`,
                border: `1px solid ${SYSTEM.accent}30`,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                transform: `scale(${interpolate(badgePop, [0, 1], [0.7, 1])})`,
                opacity: badgePop,
              }}
            >
              <span style={{ fontSize: 20 }}>💡</span>
              <span style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: SYSTEM.accent }}>
                שלח הצעה עד יום רביעי
              </span>
            </div>

            {/* AI Recommendation Card */}
            <div
              style={{
                padding: 18,
                borderRadius: 20,
                background: SYSTEM.gradient,
                marginBottom: 12,
                transform: `translateY(${interpolate(recSlide, [0, 1], [80, 0])}px)`,
                opacity: recSlide,
                boxShadow: `0 12px 40px ${SYSTEM.accent}30`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 16 }}>🧠</span>
                <span style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
                  המלצת AI
                </span>
              </div>
              <span style={{ fontFamily: HEEBO, fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.5 }}>
                דנה פתחה 3 אימיילים השבוע. סיכוי סגירה 75%. מומלץ: שלח הצעת מחיר מותאמת.
              </span>
            </div>

            {/* Activity timeline dots */}
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12 }}>
              {[1, 2, 3, 4, 5].map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: i < 3 ? SYSTEM.accent : '#E2E8F0',
                  }}
                />
              ))}
            </div>
          </div>
        </PhoneFrame>
      </div>

      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 5: RESULTS — Big numbers punch-in
// [300 - 390 frames = 10.0s-13.0s]
// ═══════════════════════════════════════════════════════════
const STATS = [
  { value: '+87%', label: 'המרות', delay: 0 },
  { value: '-70%', label: 'זמן ניהול', delay: 8 },
  { value: '75%', label: 'דיוק חיזוי', delay: 16 },
];

const ResultsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.bgLight,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Background gradient orb */}
      <div
        style={{
          position: 'absolute',
          width: 800,
          height: 800,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${SYSTEM.accent}08 0%, transparent 60%)`,
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32, alignItems: 'center' }}>
        {STATS.map((stat, i) => {
          const s = spring({
            frame: Math.max(0, frame - stat.delay),
            fps,
            config: SPRING.punch,
            durationInFrames: 15,
          });

          const scale = interpolate(s, [0, 1], [1.6, 1]);
          const y = interpolate(s, [0, 1], [40, 0]);
          const blur = interpolate(s, [0, 1], [10, 0]);

          return (
            <GlassCard key={i} variant="light" delay={stat.delay} width={700}>
              <div
                style={{
                  padding: '28px 40px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  direction: 'rtl',
                }}
              >
                <span
                  style={{
                    fontFamily: HEEBO,
                    fontSize: 28,
                    fontWeight: 700,
                    color: '#475569',
                  }}
                >
                  {stat.label}
                </span>
                <span
                  style={{
                    fontFamily: RUBIK,
                    fontSize: 64,
                    fontWeight: 800,
                    background: SYSTEM.gradient,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    transform: `scale(${scale}) translateY(${y}px)`,
                    filter: `blur(${blur}px)`,
                    display: 'inline-block',
                  }}
                >
                  {stat.value}
                </span>
              </div>
            </GlassCard>
          );
        })}
      </div>

      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 6: TAGLINE
// [390 - 450 frames = 13.0s-15.0s]
// ═══════════════════════════════════════════════════════════
const TaglineScene: React.FC = () => {
  const frame = useCurrentFrame();

  const bgOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        background: SYSTEM.gradient,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: bgOpacity,
      }}
    >
      <TextReveal
        text="AI שסוגר עסקאות במקומך"
        delay={5}
        fontSize={52}
        fontWeight={900}
        color="#fff"
        mode="words"
        stagger={2}
        style={{ textAlign: 'center' }}
      />

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPOSITION
// ═══════════════════════════════════════════════════════════
export const SystemVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      {/* Hook: 0-1.2s (0-36f) */}
      <Sequence from={0} durationInFrames={36}>
        <HookScene />
      </Sequence>

      {/* Setup: 1.2s-3.5s (36-105f) */}
      <Sequence from={36} durationInFrames={69}>
        <SetupScene />
      </Sequence>

      {/* AI Entrance: 3.5s-6.0s (105-180f) */}
      <Sequence from={105} durationInFrames={75}>
        <AIEntranceScene />
      </Sequence>

      {/* Showcase: 6.0s-10.0s (180-300f) */}
      <Sequence from={180} durationInFrames={120}>
        <ShowcaseScene />
      </Sequence>

      {/* Results: 10.0s-13.0s (300-390f) */}
      <Sequence from={300} durationInFrames={90}>
        <ResultsScene />
      </Sequence>

      {/* Tagline: 13.0s-15.0s (390-450f) */}
      <Sequence from={390} durationInFrames={60}>
        <TaglineScene />
      </Sequence>

      {/* CTA: 15.0s-18.0s (450-540f) */}
      <Sequence from={450} durationInFrames={90}>
        <CTAEndcard
          variant="dark"
          accentColor={SYSTEM.accent}
          tagline="AI שמקדם את הארגון שלך"
        />
      </Sequence>
    </AbsoluteFill>
  );
};
