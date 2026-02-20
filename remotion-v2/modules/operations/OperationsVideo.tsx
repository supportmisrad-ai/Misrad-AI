import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from 'remotion';
import { BRAND, MODULE_COLORS, HEEBO, RUBIK, SPRING } from '../../shared/config';
import {
  NoiseLayer,
  TextReveal,
  CTAEndcard,
  DeviceFrame,
  VirtualCamera,
  IconCheck,
} from '../../shared/components';

const OPS = MODULE_COLORS.operations;

// ─── Script-accurate timing (A6-OPERATIONS-SCRIPT.md) ──────
const T = {
  HOOK:     { from: 0,    dur: 90 },
  PROBLEM:  { from: 90,   dur: 270 },
  SOLUTION: { from: 360,  dur: 390 },
  SHOWCASE: { from: 750,  dur: 450 },
  PROOF:    { from: 1200, dur: 240 },
  IDENTITY: { from: 1440, dur: 150 },
  TAGLINE:  { from: 1590, dur: 120 },
  CTA:      { from: 1710, dur: 90 },
} as const;

// ─── Shared visual helpers ──────────────────────────────────

const useSlotRoll = (
  frame: number, fps: number, target: string, startFrame: number, rollDuration = 20,
) => {
  const f = Math.max(0, frame - startFrame);
  const progress = spring({ frame: f, fps, config: { damping: 12, stiffness: 200, mass: 0.8 }, durationInFrames: rollDuration });
  const motionBlur = interpolate(progress, [0, 0.8, 1], [6, 2, 0]);
  const locked = progress > 0.95;
  const display = locked ? target : target.replace(/[0-9]/g, () => String(Math.floor(Math.random() * 10)));
  return { display, progress, motionBlur, locked };
};

const useDisintegration = (frame: number, startFrame: number, endFrame: number, count = 30) => {
  const f = Math.max(0, frame - startFrame);
  const dur = endFrame - startFrame;
  const progress = Math.min(1, f / dur);
  return Array.from({ length: count }).map((_, i) => {
    const seed = i * 73 + 17;
    const angle = ((seed * 37) % 360) * (Math.PI / 180);
    const dist = progress * (40 + seed % 80);
    return {
      x: Math.cos(angle) * dist + (seed % 20 - 10),
      y: Math.sin(angle) * dist - progress * 30,
      size: 2 + seed % 4,
      opacity: Math.max(0, 1 - progress * 1.3),
    };
  });
};

const brushedSkyBlue = (fontSize: number, extra?: React.CSSProperties): React.CSSProperties => ({
  fontFamily: RUBIK, fontSize, fontWeight: 800,
  background: 'linear-gradient(160deg, #7DD3FC 0%, #0EA5E9 25%, #BAE6FD 50%, #0284C7 75%, #38BDF8 100%)',
  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  letterSpacing: -2, textShadow: '0 2px 20px rgba(14,165,233,0.3)', ...extra,
});

// ═══════════════════════════════════════════════════════════
// SCENE 1: HOOK — "הודעת וואטסאפ שנבלעה" [0:00–0:03]
// WhatsApp bubble disintegration, macro, dark matte
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Bubble disintegration f10–40
  const bubbleOpacity = interpolate(frame, [0, 5, 30, 42], [0, 1, 0.5, 0], { extrapolateRight: 'clamp' });
  const bubbleScale = interpolate(frame, [0, 5], [1.5, 1.35], { extrapolateRight: 'clamp' });
  const particles = useDisintegration(frame, 10, 42, 35);

  // Badge
  const badgeBloom = 0.4 + Math.sin(frame * 0.15) * 0.15;

  // Text after bubble vanishes
  const timeSpring = spring({ frame: Math.max(0, frame - 45), fps, config: SPRING.hero, durationInFrames: 20 });
  const warnSpring = spring({ frame: Math.max(0, frame - 60), fps, config: SPRING.ui, durationInFrames: 16 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      {/* Ambient depth light */}
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${OPS.accent}06 0%, transparent 65%)` }} />

      <VirtualCamera zoom={1.4} rotateY={-3} dofBlur={7}>
        {/* WhatsApp bubble — frosted glass */}
        <div style={{
          position: 'absolute', top: '30%', left: '50%',
          transform: `translate(-50%, -50%) scale(${bubbleScale})`,
          opacity: bubbleOpacity,
        }}>
          <div style={{
            width: 320, padding: '16px 20px', borderRadius: 18,
            background: 'rgba(37,211,102,0.08)', backdropFilter: 'blur(30px)',
            border: '1px solid rgba(37,211,102,0.15)',
            boxShadow: '0 15px 50px rgba(0,0,0,0.4), 0 0 20px rgba(37,211,102,0.06)',
            direction: 'rtl',
          }}>
            <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.6 }}>
              "החלק לא מתאים — מה עושים?"
            </div>
            <div style={{
              width: '100%', height: 50, marginTop: 8, borderRadius: 10,
              background: 'rgba(255,255,255,0.04)', filter: 'blur(6px)',
            }} />
            {/* Badge: no answer */}
            <div style={{
              marginTop: 8, padding: '4px 10px', borderRadius: 8, display: 'inline-block',
              background: '#EF444418', border: '1px solid #EF444430',
              fontFamily: HEEBO, fontSize: 10, fontWeight: 700, color: '#EF4444',
              boxShadow: `0 0 ${badgeBloom * 20}px #EF444420`,
            }}>
              לפני 3 שעות · אין תשובה
            </div>
          </div>
        </div>

        {/* Disintegration particles */}
        {frame >= 10 && frame < 55 && particles.map((p, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: `calc(30% + ${p.y}px)`, left: `calc(50% + ${p.x}px)`,
            width: p.size, height: p.size, borderRadius: 2,
            background: i % 3 === 0 ? OPS.accent : 'rgba(255,255,255,0.25)',
            opacity: p.opacity,
            boxShadow: i % 3 === 0 ? `0 0 6px ${OPS.accent}50` : 'none',
            pointerEvents: 'none',
          }} />
        ))}
      </VirtualCamera>

      {/* "3 שעות. אין תשובה." — brushed sky blue */}
      {frame >= 45 && (
        <div style={{
          position: 'absolute', top: '42%',
          ...brushedSkyBlue(100),
          opacity: timeSpring,
          transform: `scale(${interpolate(timeSpring, [0, 1], [1.1, 1])})`,
          filter: `blur(${interpolate(timeSpring, [0, 1], [8, 0])}px)`,
        }}>
          3 שעות
        </div>
      )}

      {frame >= 60 && (
        <div style={{
          position: 'absolute', top: '60%', textAlign: 'center',
          fontFamily: HEEBO, fontSize: 22, fontWeight: 900, color: '#EF4444',
          direction: 'rtl', opacity: warnSpring,
          textShadow: '0 2px 12px rgba(239,68,68,0.3)',
        }}>
          הלקוח ממתין. הטכנאי תקוע. וואטסאפ לא עוזר.
        </div>
      )}

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 2: PROBLEM — "הכאוס בשטח" [0:03–0:12]
// Physics pile messages, rack focus, disintegration in bokeh
// ═══════════════════════════════════════════════════════════
const WA_MESSAGES = [
  'יוסי אתה פנוי?',
  'אני באשדוד לא בת\'א',
  'הלקוח צועק',
  'איפה החלק?',
  'מי לוקח את הקריאה?',
  'תגיד לדני',
];

const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Focus shifts through messages
  const focusIndex = frame < 30 ? 0 : frame < 60 ? 1 : frame < 90 ? 2 : frame < 120 ? 3 : 4;

  const overlayOpacity = interpolate(frame, [180, 210], [0, 0.3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const painSpring = spring({ frame: Math.max(0, frame - 220), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: `radial-gradient(circle, ${OPS.accent}04 0%, transparent 60%)` }} />

      <VirtualCamera zoom={1.1} rotateY={-2} dofBlur={8}>
        <DeviceFrame scale={1.15} delay={0}>
          <div style={{
            width: '100%', height: '100%', background: '#0F0F12', padding: '55px 14px 14px', direction: 'rtl',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 800, color: '#25D366', marginBottom: 8 }}>
              WhatsApp — צוות שטח
            </div>

            {/* Messages with physics pile effect */}
            {WA_MESSAGES.map((msg, i) => {
              const enterFrame = i * 12 + 5;
              const s = spring({ frame: Math.max(0, frame - enterFrame), fps, config: { damping: 10, stiffness: 180, mass: 0.6 }, durationInFrames: 14 });
              const isFocused = i === focusIndex;
              const wasFocused = i < focusIndex;
              // Simulated gravity pile — each new msg pushes prev down and partially covers
              const yOffset = Math.max(0, (frame - enterFrame) * 0.08 - i * 2);
              const disintParts = wasFocused ? useDisintegration(frame, 90 + i * 30, 90 + i * 30 + 40, 8) : [];

              return (
                <React.Fragment key={i}>
                  <div style={{
                    padding: '8px 12px', marginBottom: 4, borderRadius: 10,
                    background: i % 2 === 0 ? 'rgba(37,211,102,0.06)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isFocused ? 'rgba(37,211,102,0.2)' : 'rgba(255,255,255,0.04)'}`,
                    opacity: s * (wasFocused ? interpolate(frame, [90 + i * 30, 90 + i * 30 + 30], [1, 0.15], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1),
                    filter: isFocused ? 'none' : `blur(${wasFocused ? 2 : 1.5}px)`,
                    transform: `translateY(${interpolate(s, [0, 1], [15, yOffset])}px)`,
                    fontFamily: HEEBO, fontSize: 11, fontWeight: 600, color: '#fff',
                    boxShadow: isFocused ? `0 2px 12px rgba(0,0,0,0.3), 0 0 8px ${OPS.accent}08` : 'none',
                  }}>
                    {msg}
                  </div>
                  {/* Disintegration particles for exited messages */}
                  {wasFocused && disintParts.map((p, pi) => (
                    <div key={`p${i}-${pi}`} style={{
                      position: 'absolute', left: `calc(50% + ${p.x * 0.5}px)`, top: `calc(${20 + i * 15}% + ${p.y * 0.5}px)`,
                      width: p.size, height: p.size, borderRadius: 1,
                      background: pi % 2 === 0 ? OPS.accent : 'rgba(255,255,255,0.2)',
                      opacity: p.opacity * 0.5, pointerEvents: 'none',
                    }} />
                  ))}
                </React.Fragment>
              );
            })}
          </div>
        </DeviceFrame>
      </VirtualCamera>

      {/* Blue frosted overlay */}
      {frame >= 180 && (
        <AbsoluteFill style={{
          background: `linear-gradient(180deg, ${OPS.accent}${Math.round(overlayOpacity * 8).toString(16).padStart(2, '0')} 0%, transparent 60%)`,
          backdropFilter: `blur(${overlayOpacity * 3}px)`,
          pointerEvents: 'none',
        }} />
      )}

      {/* Pain text — brushed metal */}
      {frame >= 220 && (
        <div style={{
          position: 'absolute', bottom: 120, maxWidth: 700, textAlign: 'center',
          ...brushedSkyBlue(24, { fontFamily: HEEBO, letterSpacing: 0 }),
          fontFamily: HEEBO, fontSize: 22, fontWeight: 900,
          direction: 'rtl', opacity: painSpring,
          transform: `translateY(${interpolate(painSpring, [0, 1], [15, 0])}px)`,
        }}>
          וואטסאפ — זה לא מערכת. זה בלגן שמתחזה לסדר.
        </div>
      )}

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 3: SOLUTION — "Operations" [0:12–0:25]
// Glass shatter blue → title → service cards + AI badge
// → waveform→crystallize → gallery → full dashboard
// ═══════════════════════════════════════════════════════════
const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: Glass shatter + title (f0–60)
  const shatterProgress = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const titleSpring = spring({ frame: Math.max(0, frame - 10), fps, config: SPRING.hero, durationInFrames: 20 });

  // Phase 2: Service call dashboard (f60–150)
  const dashSpring = spring({ frame: Math.max(0, frame - 65), fps, config: SPRING.hero, durationInFrames: 20 });

  // Phase 3: Voice → crystallize (f150–240)
  const voiceSpring = spring({ frame: Math.max(0, frame - 155), fps, config: SPRING.hero, durationInFrames: 20 });
  const crystallize = interpolate(frame, [180, 210], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const summarySpring = spring({ frame: Math.max(0, frame - 215), fps, config: SPRING.ui, durationInFrames: 16 });

  // Phase 4: Gallery (f240–330)
  const gallerySpring = spring({ frame: Math.max(0, frame - 245), fps, config: SPRING.hero, durationInFrames: 20 });

  // Phase 5: Full dashboard (f330–390)
  const fullDashSpring = spring({ frame: Math.max(0, frame - 335), fps, config: SPRING.hero, durationInFrames: 20 });

  // SLA slot rolls
  const sla1 = useSlotRoll(frame, fps, '02:34', 80, 18);
  const sla2 = useSlotRoll(frame, fps, '01:15', 90, 18);
  const sla3 = useSlotRoll(frame, fps, '04:02', 100, 18);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${OPS.accent}05 0%, transparent 60%)` }} />

      {/* Light sweep */}
      {frame < 30 && (
        <div style={{
          position: 'absolute', width: 80, height: '100%',
          background: `linear-gradient(90deg, transparent, ${OPS.accent}08, transparent)`,
          transform: `translateX(${interpolate(frame, [0, 25], [-200, 1200])}px)`,
          pointerEvents: 'none', zIndex: 10,
        }} />
      )}

      {/* Glass shards — blue tinted */}
      {frame < 40 && Array.from({ length: 14 }).map((_, i) => {
        const seed = i * 53;
        const angle = (seed % 360) * (Math.PI / 180);
        const dist = shatterProgress * (50 + seed % 90);
        return (
          <div key={i} style={{
            position: 'absolute',
            left: `calc(50% + ${Math.cos(angle) * dist}px)`,
            top: `calc(40% + ${Math.sin(angle) * dist}px)`,
            width: 8 + seed % 16, height: 3 + seed % 6,
            background: `${OPS.accent}35`,
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(14,165,233,0.12)',
            borderRadius: 2, opacity: 1 - shatterProgress,
            transform: `rotate(${seed % 180}deg)`, pointerEvents: 'none',
          }} />
        );
      })}

      {/* "Operations" — brushed sky blue title */}
      {frame >= 10 && frame < 70 && (
        <div style={{
          position: 'absolute', top: '22%',
          ...brushedSkyBlue(120),
          opacity: titleSpring * (frame < 50 ? 1 : interpolate(frame, [50, 70], [1, 0], { extrapolateRight: 'clamp' })),
          transform: `scale(${interpolate(titleSpring, [0, 1], [1.1, 1])})`,
          filter: `blur(${interpolate(titleSpring, [0, 1], [8, 0])}px)`,
        }}>
          Operations
        </div>
      )}

      {frame >= 20 && frame < 70 && (
        <div style={{
          position: 'absolute', top: '38%',
          fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: BRAND.muted, direction: 'rtl',
          opacity: spring({ frame: Math.max(0, frame - 20), fps, config: SPRING.ui, durationInFrames: 15 })
            * (frame < 50 ? 1 : interpolate(frame, [50, 70], [1, 0], { extrapolateRight: 'clamp' })),
        }}>
          תפעול חכם. אפס בלגן. אפס וואטסאפ.
        </div>
      )}

      {/* Phase 2: Service call cards with SLA */}
      {frame >= 65 && frame < 155 && (
        <VirtualCamera zoom={1.1} rotateY={2} dofBlur={5}>
          <div style={{ opacity: dashSpring, transform: `translateY(${interpolate(dashSpring, [0, 1], [30, 0])}px)` }}>
            <DeviceFrame scale={1.15} delay={0}>
              <div style={{ width: '100%', height: '100%', background: '#0F0F12', padding: '55px 14px 14px', direction: 'rtl' }}>
                <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 900, color: '#fff', marginBottom: 8 }}>
                  קריאות שירות
                </div>

                {[
                  { addr: 'ת"א, רוטשילד 45', urgency: 'דחוף', tech: 'יוסי מ.', sla: sla1, color: '#EF4444', delay: 75 },
                  { addr: 'אשדוד, הנמל 12', urgency: 'רגיל', tech: 'דני כ.', sla: sla2, color: '#F59E0B', delay: 85 },
                  { addr: 'ר"ג, ז\'בוטינסקי 8', urgency: 'נמוך', tech: 'רונן א.', sla: sla3, color: '#22C55E', delay: 95 },
                ].map((card, i) => {
                  const cSpring = spring({ frame: Math.max(0, frame - card.delay), fps, config: SPRING.ui, durationInFrames: 14 });
                  const isFocused = i === 0;
                  return (
                    <div key={i} style={{
                      padding: '10px 12px', marginBottom: 6, borderRadius: 12,
                      background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)',
                      border: `1px solid ${isFocused ? card.color + '20' : 'rgba(255,255,255,0.04)'}`,
                      boxShadow: isFocused ? `0 4px 16px rgba(0,0,0,0.3), 0 0 10px ${card.color}08` : 'none',
                      opacity: cSpring,
                      filter: isFocused ? 'none' : 'blur(1.5px)',
                      transform: `translateY(${interpolate(cSpring, [0, 1], [15, 0])}px)`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: '#fff' }}>{card.addr}</span>
                        <span style={{
                          padding: '2px 8px', borderRadius: 6,
                          background: `${card.color}15`, border: `1px solid ${card.color}25`,
                          fontFamily: HEEBO, fontSize: 9, fontWeight: 700, color: card.color,
                          boxShadow: `0 0 8px ${card.color}15`,
                        }}>
                          {card.urgency}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: HEEBO, fontSize: 9, fontWeight: 600, color: '#94A3B8' }}>
                          טכנאי: {card.tech}
                        </span>
                        <span style={{
                          fontFamily: RUBIK, fontSize: 11, fontWeight: 800, color: OPS.accent,
                          filter: `blur(${card.sla.motionBlur * 0.3}px)`,
                        }}>
                          SLA: {card.sla.display}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* AI badge */}
                {frame >= 110 && (
                  <div style={{
                    marginTop: 6, padding: '5px 10px', borderRadius: 8, display: 'inline-block',
                    background: `${OPS.accent}10`, backdropFilter: 'blur(20px)',
                    border: `1px solid ${OPS.accent}20`,
                    fontFamily: HEEBO, fontSize: 9, fontWeight: 700, color: OPS.accent,
                    boxShadow: `0 0 10px ${OPS.accent}10`,
                    opacity: spring({ frame: Math.max(0, frame - 110), fps, config: SPRING.ui, durationInFrames: 14 }),
                  }}>
                    AI שיבץ אוטומטית
                  </div>
                )}
              </div>
            </DeviceFrame>
          </div>
        </VirtualCamera>
      )}

      {/* Phase 3: Waveform → crystallize voice demo */}
      {frame >= 155 && frame < 245 && (
        <VirtualCamera zoom={1.2} dofBlur={5}>
          <div style={{
            width: 500, padding: '24px 28px', borderRadius: 24,
            background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(40px)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: `0 20px 60px rgba(0,0,0,0.4), 0 0 30px ${OPS.accent}06`,
            direction: 'rtl', opacity: voiceSpring,
            transform: `translateY(${interpolate(voiceSpring, [0, 1], [30, 0])}px)`,
          }}>
            <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 800, color: OPS.accent, marginBottom: 10 }}>
              שליטה קולית
            </div>

            {/* Waveform bars — frosted glass texture */}
            <div style={{
              display: 'flex', gap: 3, height: 40, alignItems: 'center', marginBottom: 12,
              padding: '8px 12px', borderRadius: 12,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.04)',
              opacity: interpolate(crystallize, [0, 1], [1, 0.2]),
            }}>
              {Array.from({ length: 30 }).map((_, i) => {
                const barHeight = 6 + Math.sin(frame * 0.2 + i * 0.5) * 12 + Math.random() * 4;
                return (
                  <div key={i} style={{
                    width: 4, height: barHeight, borderRadius: 2,
                    background: `linear-gradient(180deg, ${OPS.accent}60, ${OPS.accent}20)`,
                    boxShadow: `0 0 4px ${OPS.accent}15`,
                  }} />
                );
              })}
            </div>

            {/* Crystallized text — appears as waveform fades */}
            <div style={{
              fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.6,
              opacity: crystallize,
              filter: `blur(${interpolate(crystallize, [0, 0.5, 1], [8, 3, 0])}px)`,
            }}>
              "סיימתי. לקוח כהן. הוחלף מסנן 20×25."
            </div>

            {/* AI Summary card */}
            {frame >= 215 && (
              <div style={{
                marginTop: 10, padding: '8px 12px', borderRadius: 10,
                background: `${OPS.accent}08`, border: `1px solid ${OPS.accent}15`,
                opacity: summarySpring,
              }}>
                <div style={{ fontFamily: HEEBO, fontSize: 9, fontWeight: 800, color: OPS.accent, marginBottom: 3 }}>
                  AI Summary
                </div>
                {['בוצע: החלפת מסנן', 'חלק: 20×25', 'לקוח: כהן'].map((line, i) => (
                  <div key={i} style={{
                    fontFamily: HEEBO, fontSize: 10, fontWeight: 600, color: BRAND.muted, lineHeight: 1.5,
                  }}>
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
        </VirtualCamera>
      )}

      {/* Phase 4: Gallery grid */}
      {frame >= 245 && frame < 335 && (
        <VirtualCamera zoom={1.05} dofBlur={4}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: 400,
            opacity: gallerySpring,
            transform: `translateY(${interpolate(gallerySpring, [0, 1], [25, 0])}px)`,
          }}>
            {['לפני', 'אחרי', 'חלק 20×25', 'חתימת לקוח'].map((label, i) => {
              const gSpring = spring({ frame: Math.max(0, frame - 250 - i * 8), fps, config: SPRING.ui, durationInFrames: 14 });
              return (
                <div key={i} style={{
                  height: 100, borderRadius: 14,
                  background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex', justifyContent: 'center', alignItems: 'center',
                  opacity: gSpring,
                }}>
                  <span style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: BRAND.muted }}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{
            marginTop: 12, fontFamily: HEEBO, fontSize: 16, fontWeight: 700, color: BRAND.muted,
            direction: 'rtl', opacity: gallerySpring, textAlign: 'center',
          }}>
            הכל מתועד. הכל ניתן לחיפוש.
          </div>
        </VirtualCamera>
      )}

      {/* Phase 5: Full dashboard */}
      {frame >= 335 && (
        <div style={{
          position: 'absolute', textAlign: 'center',
          ...brushedSkyBlue(30, { fontFamily: HEEBO, letterSpacing: 0 }),
          fontFamily: HEEBO, fontSize: 28, fontWeight: 900,
          direction: 'rtl', opacity: fullDashSpring,
          transform: `translateY(${interpolate(fullDashSpring, [0, 1], [15, 0])}px)`,
        }}>
          שליטה מלאה. מהמשרד ומהשטח.
        </div>
      )}

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 4: SHOWCASE — Cards + Kiosk + Morph chain [0:25–0:40]
// ═══════════════════════════════════════════════════════════
const SHOWCASE_CARDS = [
  { title: 'שיבוץ AI', desc: 'הטכנאי הנכון, אוטומטי', color: OPS.accent },
  { title: 'סיכום AI', desc: 'מקול לדו\'ח', color: '#8B5CF6' },
  { title: 'שליטה קולית', desc: 'ידיים מלאות, פה פנוי', color: '#22C55E' },
];

const MORPH_STAGES = [
  { label: 'קריאה', color: OPS.accent },
  { label: 'שיבוץ', color: '#F59E0B' },
  { label: 'שטח', color: '#22C55E' },
  { label: 'סיכום AI', color: '#8B5CF6' },
  { label: 'חשבונית', color: '#059669' },
];

const ShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Cards phase (f0–120)
  const cardFocusIndex = Math.min(2, Math.floor(frame / 40));
  const cameraX = interpolate(frame, [0, 40, 80], [15, 0, -10], { extrapolateRight: 'clamp' });

  // Kiosk phase (f120–240)
  const kioskSpring = spring({ frame: Math.max(0, frame - 125), fps, config: SPRING.hero, durationInFrames: 22 });

  // Morph chain (f240–360)
  const morphPhase = interpolate(frame,
    [240, 252, 264, 276, 288, 300, 312, 324, 336, 348],
    [0, 1, 1, 2, 2, 3, 3, 4, 4, 5],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const morphSpring = spring({ frame: Math.max(0, frame - 240), fps, config: SPRING.hero, durationInFrames: 20 });

  // Final text (f380–450)
  const finalSpring = spring({ frame: Math.max(0, frame - 385), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${OPS.accent}04 0%, transparent 60%)` }} />

      <VirtualCamera panX={cameraX} dofBlur={5} zoom={1.05}>
        {/* Feature cards in 3D */}
        {frame < 140 && (
          <div style={{
            position: 'absolute', top: '25%', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 14,
          }}>
            {SHOWCASE_CARDS.map((card, i) => {
              const isFocused = i === cardFocusIndex;
              const s = spring({ frame: Math.max(0, frame - i * 10), fps, config: SPRING.ui, durationInFrames: 16 });
              return (
                <div key={i} style={{
                  width: 200, padding: '20px 14px', borderRadius: 20,
                  background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(30px)',
                  border: `1px solid ${isFocused ? card.color + '20' : 'rgba(255,255,255,0.04)'}`,
                  boxShadow: `0 20px 60px rgba(0,0,0,0.3)${isFocused ? `, 0 0 20px ${card.color}08` : ''}`,
                  opacity: s, textAlign: 'center',
                  transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px) scale(${isFocused ? 1.05 : 0.95})`,
                  filter: isFocused ? 'none' : 'blur(2px)',
                }}>
                  <div style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 800, color: card.color, direction: 'rtl' }}>
                    {card.title}
                  </div>
                  <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 600, color: BRAND.muted, marginTop: 6, direction: 'rtl' }}>
                    {card.desc}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Kiosk tablet demo — tactical, low angle */}
        {frame >= 120 && frame < 250 && (
          <div style={{
            position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
            opacity: kioskSpring,
          }}>
            <div style={{
              width: 300, padding: '14px', borderRadius: 10,
              background: '#1a1a1a', border: '4px solid #333',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6), inset 0 0 20px rgba(0,0,0,0.3)',
            }}>
              <div style={{
                padding: '14px 12px', borderRadius: 6,
                background: '#0F0F12', direction: 'rtl',
              }}>
                {/* Clock */}
                <div style={{ fontFamily: RUBIK, fontSize: 20, fontWeight: 800, color: OPS.accent, textAlign: 'center', marginBottom: 10 }}>
                  08:42
                </div>
                {/* 3 tasks */}
                {['התקנת מזגן · דחוף', 'תיקון דוד שמש', 'ביקורת בטיחות'].map((task, i) => (
                  <div key={i} style={{
                    padding: '6px 10px', marginBottom: 4, borderRadius: 8,
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)',
                    fontFamily: HEEBO, fontSize: 10, fontWeight: 600, color: '#fff',
                  }}>
                    {task}
                  </div>
                ))}
                {/* Big "Done" button */}
                <div style={{
                  marginTop: 10, padding: '10px 0', borderRadius: 10, textAlign: 'center',
                  background: OPS.accent, fontFamily: HEEBO, fontSize: 14, fontWeight: 900, color: '#fff',
                  boxShadow: `0 4px 16px ${OPS.accent}30`,
                }}>
                  סיימתי
                </div>
              </div>
            </div>

            {/* Worker silhouette */}
            <svg width="60" height="90" viewBox="0 0 60 90" fill="none" style={{
              position: 'absolute', right: -50, bottom: 20, opacity: 0.2,
            }}>
              <circle cx="30" cy="18" r="14" stroke={OPS.accent} strokeWidth="1.5" />
              <path d="M8 85 C8 55 18 42 30 42 C42 42 52 55 52 85" stroke={OPS.accent} strokeWidth="1.5" />
            </svg>
          </div>
        )}

        {/* Morph chain: call→assign→field→summary→invoice */}
        {frame >= 240 && frame < 390 && (
          <div style={{
            position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
            display: 'flex', gap: 14, alignItems: 'center',
            opacity: morphSpring,
          }}>
            {MORPH_STAGES.map((stage, i) => {
              const stageActive = morphPhase >= i + 1;
              const stageTransitioning = morphPhase > i && morphPhase < i + 1;
              const stageOpacity = stageActive ? 1 : stageTransitioning ? interpolate(morphPhase, [i, i + 1], [0, 1]) : 0.12;
              return (
                <React.Fragment key={i}>
                  <div style={{
                    padding: '12px 16px', borderRadius: 14,
                    background: stageActive ? `${stage.color}08` : 'rgba(255,255,255,0.02)',
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${stageActive ? stage.color + '20' : 'rgba(255,255,255,0.04)'}`,
                    boxShadow: stageActive ? `0 0 16px ${stage.color}08` : 'none',
                    direction: 'rtl', opacity: stageOpacity,
                    transform: `scale(${stageActive ? 1.05 : 0.9})`,
                  }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: stage.color, margin: '0 auto 5px',
                      boxShadow: stageActive ? `0 0 8px ${stage.color}35` : 'none',
                    }} />
                    <div style={{
                      fontFamily: HEEBO, fontSize: 11, fontWeight: 800,
                      color: stageActive ? stage.color : '#4B5563', textAlign: 'center',
                    }}>
                      {stage.label}
                    </div>
                  </div>
                  {i < 4 && (
                    <div style={{
                      width: 20, height: 3, borderRadius: 2,
                      background: `linear-gradient(90deg, ${stage.color}30, ${MORPH_STAGES[i + 1].color}30)`,
                      opacity: stageActive ? 1 : 0.08,
                    }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </VirtualCamera>

      {/* Morph chain text */}
      {frame >= 280 && frame < 390 && (
        <div style={{
          position: 'absolute', bottom: 200,
          fontFamily: HEEBO, fontSize: 18, fontWeight: 700, color: BRAND.muted, direction: 'rtl',
          opacity: spring({ frame: Math.max(0, frame - 285), fps, config: SPRING.ui, durationInFrames: 18 }),
        }}>
          קריאה. שיבוץ. שטח. סיכום. חשבונית. אוטומטי. בלי נגיעה.
        </div>
      )}

      {/* Final text */}
      {frame >= 385 && (
        <div style={{
          position: 'absolute', bottom: 150,
          ...brushedSkyBlue(30, { fontFamily: HEEBO, letterSpacing: 0 }),
          fontFamily: HEEBO, fontSize: 28, fontWeight: 900,
          direction: 'rtl', opacity: finalSpring,
          transform: `translateY(${interpolate(finalSpring, [0, 1], [15, 0])}px)`,
        }}>
          מהקריאה לחשבונית. בלי וואטסאפ.
        </div>
      )}

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 5: PROOF — Stats + quote [0:40–0:48]
// ═══════════════════════════════════════════════════════════
const STATS = [
  { value: '80', suffix: '%', label: 'פחות זמן תיעוד', delay: 0 },
  { value: '45', suffix: '%', label: 'יותר קריאות ביום', delay: 12 },
  { value: '0', suffix: '', label: 'ויכוחים (הכל מתועד + חתום)', delay: 24 },
];

const ProofScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const quoteSpring = spring({ frame: Math.max(0, frame - 130), fps, config: SPRING.hero, durationInFrames: 22 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${OPS.accent}05 0%, transparent 60%)` }} />

      <VirtualCamera zoom={1.05} dofBlur={4}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center' }}>
          {STATS.map((stat, i) => {
            const s = spring({ frame: Math.max(0, frame - stat.delay), fps, config: SPRING.punch, durationInFrames: 20 });
            const slot = useSlotRoll(frame, fps, stat.value, stat.delay, 20);
            const isFocused = Math.floor(frame / 40) % 3 === i;
            return (
              <div key={i} style={{
                width: 700, padding: '28px 36px', borderRadius: 24,
                background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(30px)',
                border: `1px solid rgba(255,255,255,${isFocused ? '0.08' : '0.04'})`,
                boxShadow: `0 20px 60px rgba(0,0,0,0.3)${isFocused ? `, 0 0 20px ${OPS.accent}08` : ''}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl',
                opacity: s, transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px)`,
                filter: isFocused ? 'none' : 'blur(1px)',
              }}>
                <span style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 700, color: BRAND.muted }}>{stat.label}</span>
                <span style={{
                  ...brushedSkyBlue(56),
                  filter: `blur(${slot.motionBlur}px)`,
                  transform: `scale(${interpolate(s, [0, 1], [1.2, 1])})`, display: 'inline-block',
                }}>
                  {slot.display}{stat.suffix}
                </span>
              </div>
            );
          })}
        </div>
      </VirtualCamera>

      {/* Quote + sky blue silhouette */}
      {frame >= 130 && (
        <div style={{
          position: 'absolute', bottom: 110, maxWidth: 750,
          padding: '24px 32px', borderRadius: 24,
          background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.06)',
          direction: 'rtl', opacity: quoteSpring,
          transform: `translateY(${interpolate(quoteSpring, [0, 1], [15, 0])}px)`,
          display: 'flex', alignItems: 'center', gap: 20,
        }}>
          {/* Sky blue silhouette — contractor with kiosk */}
          <svg width="55" height="75" viewBox="0 0 55 75" fill="none" style={{ flexShrink: 0, opacity: 0.25 }}>
            <circle cx="28" cy="16" r="12" stroke={OPS.accent} strokeWidth="1.5" />
            <path d="M6 70 C6 48 16 38 28 38 C40 38 50 48 50 70" stroke={OPS.accent} strokeWidth="1.5" />
            <rect x="36" y="50" width="14" height="20" rx="2" stroke={OPS.accent} strokeWidth="1" />
          </svg>
          <div>
            <div style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1.6 }}>
              "הפסקנו עם וואטסאפ. הטכנאים מדווחים בקול, AI מסכם, והלקוח חותם על טאבלט. הכל סגור."
            </div>
            <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: BRAND.muted, marginTop: 8 }}>
              — קבלן שיפוצים
            </div>
          </div>
        </div>
      )}

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 6: IDENTITY — Hebrew DNA badges [0:48–0:53]
// ═══════════════════════════════════════════════════════════
const BADGES = [
  { text: 'שליטה קולית — עברית שטח, לא עברית ספרותית', gold: false, delay: 0 },
  { text: 'שומר שבת — אפס קריאות בשבת', gold: false, delay: 15 },
  { text: 'Kiosk — לטכנאי עם ידיים מלאות, לא עם סיסמאות', gold: false, delay: 30 },
  { text: 'Finance במתנה עם חבילת תפעול', gold: true, delay: 45 },
];

const IdentityScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(135deg, ${BRAND.bgDark} 0%, ${OPS.accent}06 50%, ${BRAND.bgDark} 100%)`,
      justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${OPS.accent}04 0%, transparent 60%)` }} />

      <div style={{
        ...brushedSkyBlue(44, { fontFamily: HEEBO, letterSpacing: 0 }),
        fontFamily: HEEBO, fontSize: 40, fontWeight: 900,
        direction: 'rtl', marginBottom: 30,
        opacity: titleSpring,
        transform: `translateY(${interpolate(titleSpring, [0, 1], [20, 0])}px)`,
      }}>
        תפעול בשפה שלך.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        {BADGES.map((badge, i) => {
          const s = spring({ frame: Math.max(0, frame - badge.delay - 12), fps, config: SPRING.ui, durationInFrames: 18 });
          const focusBadge = Math.min(3, Math.floor((frame - 12) / 28));
          const isFocused = i === focusBadge;
          return (
            <div key={i} style={{
              padding: '14px 24px', borderRadius: 18,
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(30px)',
              border: badge.gold
                ? '1px solid rgba(197,165,114,0.3)'
                : `1px solid rgba(255,255,255,${isFocused ? '0.08' : '0.03'})`,
              boxShadow: badge.gold
                ? '0 0 20px rgba(197,165,114,0.08), 0 15px 40px rgba(0,0,0,0.3)'
                : `0 15px 40px rgba(0,0,0,0.3)${isFocused ? `, 0 0 20px ${OPS.accent}06` : ''}`,
              direction: 'rtl', fontFamily: HEEBO, fontSize: 16, fontWeight: 700,
              color: badge.gold ? '#C5A572' : isFocused ? '#fff' : '#64748B',
              opacity: s,
              transform: `translateY(${interpolate(s, [0, 1], [15, 0])}px) scale(${isFocused ? 1.02 : 0.98})`,
              filter: isFocused ? 'none' : 'blur(0.8px)',
            }}>
              {badge.text}
            </div>
          );
        })}
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 7: TAGLINE [0:53–0:57]
// ═══════════════════════════════════════════════════════════
const TaglineScene: React.FC = () => {
  const frame = useCurrentFrame();
  const bgOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{
      background: OPS.gradient,
      justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
      opacity: bgOpacity,
    }}>
      <TextReveal
        text="הסוף לבלגן בשטח. התחלה של שליטה."
        delay={5} fontSize={48} fontWeight={900} color="#fff"
        mode="words" stagger={3}
        style={{ textAlign: 'center' }}
      />

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPOSITION — A6 Operations Video
// ═══════════════════════════════════════════════════════════
export const OperationsVideoV2: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={T.HOOK.from} durationInFrames={T.HOOK.dur}><HookScene /></Sequence>
      <Sequence from={T.PROBLEM.from} durationInFrames={T.PROBLEM.dur}><ProblemScene /></Sequence>
      <Sequence from={T.SOLUTION.from} durationInFrames={T.SOLUTION.dur}><SolutionScene /></Sequence>
      <Sequence from={T.SHOWCASE.from} durationInFrames={T.SHOWCASE.dur}><ShowcaseScene /></Sequence>
      <Sequence from={T.PROOF.from} durationInFrames={T.PROOF.dur}><ProofScene /></Sequence>
      <Sequence from={T.IDENTITY.from} durationInFrames={T.IDENTITY.dur}><IdentityScene /></Sequence>
      <Sequence from={T.TAGLINE.from} durationInFrames={T.TAGLINE.dur}><TaglineScene /></Sequence>
      <Sequence from={T.CTA.from} durationInFrames={T.CTA.dur}>
        <CTAEndcard variant="dark" accentColor={OPS.accent} tagline="הסוף לבלגן בשטח. התחלה של שליטה." />
      </Sequence>
    </AbsoluteFill>
  );
};
