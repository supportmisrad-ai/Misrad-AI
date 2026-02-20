import React, { useMemo } from 'react';
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

const SOC = MODULE_COLORS.social;

// ─── Script-accurate timing (A3-SOCIAL-SCRIPT.md) ──────────
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

const brushedPurple = (fontSize: number, extra?: React.CSSProperties): React.CSSProperties => ({
  fontFamily: RUBIK, fontSize, fontWeight: 800,
  background: 'linear-gradient(160deg, #C4B5FD 0%, #8B5CF6 30%, #DDD6FE 50%, #7C3AED 75%, #A78BFA 100%)',
  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  letterSpacing: -2, textShadow: '0 2px 20px rgba(124,58,237,0.3)', ...extra,
});

const useDisintegration = (frame: number, startFrame: number, endFrame: number, count: number) => {
  return useMemo(() => {
    const particles: { x: number; y: number; size: number; opacity: number }[] = [];
    if (frame < startFrame || frame > endFrame + 30) return particles;
    const progress = interpolate(frame, [startFrame, endFrame], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    for (let i = 0; i < count; i++) {
      const seed = i * 73 + 17;
      const angle = ((seed * 137) % 360) * (Math.PI / 180);
      const dist = progress * (40 + (seed % 80));
      particles.push({
        x: Math.cos(angle) * dist + ((seed % 40) - 20),
        y: Math.sin(angle) * dist - progress * 30,
        size: 2 + (seed % 4),
        opacity: Math.max(0, 1 - progress * 1.2),
      });
    }
    return particles;
  }, [frame, startFrame, endFrame, count]);
};

// ═══════════════════════════════════════════════════════════
// SCENE 1: HOOK — "Like → ליד" [0:00–0:03]
// Heart morph → CRM card, "23 לידים" slot roll
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Heart pulse (f0–12), morph to card (f12–32)
  const heartPulse = frame < 12 ? 1 + Math.sin(frame * 0.8) * 0.06 : 1;
  const morphProgress = interpolate(frame, [12, 32], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const heartOpacity = interpolate(morphProgress, [0, 0.5, 1], [1, 0.5, 0]);
  const cardOpacity = interpolate(morphProgress, [0.3, 0.7, 1], [0, 0.5, 1]);

  // Bloom shift: red → purple
  const bloomHue = interpolate(morphProgress, [0, 1], [0, 270]);

  // Text: "Like אחד. ליד אחד." at f45
  const textSpring = spring({ frame: Math.max(0, frame - 45), fps, config: { damping: 14, stiffness: 160, mass: 1 }, durationInFrames: 20 });
  const textBlur = interpolate(textSpring, [0, 1], [12, 0]);

  // "23 לידים" slot roll at f60
  const slot23 = useSlotRoll(frame, fps, '23', 60, 18);
  const subSpring = spring({ frame: Math.max(0, frame - 58), fps, config: SPRING.ui, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: `radial-gradient(circle, ${SOC.accent}06 0%, transparent 60%)` }} />

      <VirtualCamera zoom={1.4} rotateY={-2} dofBlur={7}>
        {/* Heart icon — frosted glass */}
        {morphProgress < 0.95 && (
          <div style={{
            position: 'absolute', top: '30%', left: '50%',
            transform: `translate(-50%, -50%) scale(${heartPulse * (1 - morphProgress * 0.3)})`,
            opacity: heartOpacity,
          }}>
            <svg width="120" height="110" viewBox="0 0 120 110" fill="none">
              <path
                d="M60 100 C20 70 0 40 0 25 C0 10 10 0 25 0 C40 0 55 10 60 25 C65 10 80 0 95 0 C110 0 120 10 120 25 C120 40 100 70 60 100Z"
                fill={`hsl(${bloomHue}, 70%, 55%)`}
                fillOpacity={0.6}
                stroke={`hsl(${bloomHue}, 80%, 65%)`}
                strokeWidth={2}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 20,
              backdropFilter: 'blur(20px)', background: 'rgba(255,255,255,0.05)',
              pointerEvents: 'none',
            }} />
          </div>
        )}

        {/* CRM lead card — materializing from morph */}
        {morphProgress > 0.2 && (
          <div style={{
            position: 'absolute', top: '28%', left: '50%',
            transform: `translate(-50%, -50%) scale(${interpolate(morphProgress, [0.2, 1], [0.7, 1], { extrapolateRight: 'clamp' })})`,
            opacity: cardOpacity,
          }}>
            <div style={{
              width: 340, padding: '18px 22px', borderRadius: 18,
              background: 'rgba(24,24,27,0.75)', backdropFilter: 'blur(40px)',
              border: `1px solid ${SOC.accent}20`,
              boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 30px ${SOC.accent}12`,
              direction: 'rtl',
            }}>
              <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 800, color: BRAND.white }}>שרה כץ</div>
              <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 600, color: BRAND.muted, marginTop: 3 }}>ביטוח חיים</div>
              <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{
                  padding: '5px 12px', borderRadius: 8,
                  background: `${SOC.accent}15`, border: `1px solid ${SOC.accent}30`,
                  fontFamily: RUBIK, fontSize: 14, fontWeight: 800, color: SOC.accent,
                }}>
                  87% AI
                </div>
                <div style={{
                  padding: '5px 12px', borderRadius: 8,
                  background: '#22C55E15', border: '1px solid #22C55E30',
                  fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: '#22C55E',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <IconCheck size={10} color="#22C55E" />
                  Instagram
                </div>
              </div>
            </div>
          </div>
        )}
      </VirtualCamera>

      {/* "Like אחד. ליד אחד." */}
      {frame >= 45 && (
        <div style={{
          position: 'absolute', top: '58%',
          ...brushedPurple(90),
          opacity: textSpring, filter: `blur(${textBlur}px)`,
          transform: `scale(${interpolate(textSpring, [0, 1], [1.1, 1])})`,
        }}>
          Like אחד. ליד אחד.
        </div>
      )}

      {/* "23 לידים מפוסט אחד" */}
      {frame >= 58 && (
        <div style={{
          position: 'absolute', top: '72%',
          display: 'flex', gap: 8, alignItems: 'baseline',
          opacity: subSpring,
          transform: `translateY(${interpolate(subSpring, [0, 1], [10, 0])}px)`,
        }}>
          <span style={{
            ...brushedPurple(60),
            filter: `blur(${slot23.motionBlur}px)`,
          }}>
            {slot23.display}
          </span>
          <span style={{ fontFamily: HEEBO, fontSize: 28, fontWeight: 700, color: BRAND.muted, direction: 'rtl' }}>
            לידים. מפוסט אחד.
          </span>
        </div>
      )}

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 2: PROBLEM — "שיווק שנשרף" [0:03–0:12]
// Fast rack focus (15f per shift), disintegration on expired
// ═══════════════════════════════════════════════════════════
const CONTENT_ROWS = [
  { text: 'סטורי אינסטגרם', status: 'לא פורסם · 9 ימים', badge: 'פג תוקף', isExpired: true },
  { text: 'טיוטה · 3 שבועות', status: 'טיוטה שנשכחה', badge: 'לא פורסם', isExpired: true },
  { text: 'קמפיין IG', status: 'לא נמדד · ?', badge: 'אין ROI', isExpired: false },
  { text: 'פוסט FB', status: '0 לידים · ₪800 הוצאה', badge: '₪800 נשרף', isExpired: false },
  { text: 'Reel TikTok', status: 'ממתין · 2 שבועות', badge: 'מוקפא', isExpired: false },
];

const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fast rack focus: 15 frames per shift (most aggressive in series)
  const focusIndex = frame < 90 ? 0 : frame < 105 ? 1 : frame < 120 ? 2 : frame < 135 ? 3 : 4;

  // Disintegration particles for expired content
  const particles0 = useDisintegration(frame, 90, 120, 25);
  const particles1 = useDisintegration(frame, 105, 135, 25);

  const pullBack = interpolate(frame, [180, 270], [1.2, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const overlayOpacity = interpolate(frame, [180, 210], [0, 0.4], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const painSpring = spring({ frame: Math.max(0, frame - 210), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <VirtualCamera zoom={pullBack} rotateY={-3} dofBlur={9}>
        <DeviceFrame scale={1.15} delay={0}>
          <div style={{ width: '100%', height: '100%', background: '#0C0C0F', padding: '55px 14px 14px', direction: 'rtl' }}>
            <div style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 900, color: BRAND.white, marginBottom: 8 }}>
              לוח תוכן
            </div>

            {CONTENT_ROWS.map((row, i) => {
              const isFocused = i === focusIndex;
              const entrySpring = spring({ frame: Math.max(0, frame - i * 4), fps, config: SPRING.ui, durationInFrames: 12 });
              const wasFocused = i < focusIndex;
              const fadeOut = wasFocused ? interpolate(frame, [90 + i * 15, 90 + i * 15 + 20], [1, 0.2], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;

              return (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '11px 12px', marginBottom: 6, borderRadius: 12,
                  background: isFocused ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.015)',
                  border: `1px solid ${isFocused ? (row.isExpired ? 'rgba(239,68,68,0.25)' : 'rgba(124,58,237,0.15)') : 'rgba(255,255,255,0.04)'}`,
                  boxShadow: isFocused ? '0 4px 16px rgba(0,0,0,0.3)' : 'none',
                  opacity: entrySpring * fadeOut,
                  filter: isFocused ? 'none' : `blur(${wasFocused ? 2 : 1.5}px)`,
                  transform: `translateX(${interpolate(entrySpring, [0, 1], [20, 0])}px)`,
                }}>
                  <div>
                    <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: isFocused ? BRAND.white : '#64748B' }}>
                      {row.text}
                    </div>
                    <div style={{ fontFamily: HEEBO, fontSize: 10, fontWeight: 600, color: '#64748B', marginTop: 2 }}>
                      {row.status}
                    </div>
                  </div>
                  <div style={{
                    padding: '4px 10px', borderRadius: 8,
                    background: row.isExpired ? '#EF444420' : '#F59E0B15',
                    border: `1px solid ${row.isExpired ? '#EF444440' : '#F59E0B30'}`,
                    fontFamily: HEEBO, fontSize: 10, fontWeight: 700,
                    color: row.isExpired ? '#EF4444' : '#F59E0B',
                    boxShadow: isFocused && row.isExpired ? '0 0 10px rgba(239,68,68,0.3)' : 'none',
                  }}>
                    {row.badge}
                  </div>
                </div>
              );
            })}
          </div>
        </DeviceFrame>

        {/* Disintegration particles */}
        {[particles0, particles1].map((particles, pi) =>
          particles.map((p, i) => (
            <div key={`${pi}-${i}`} style={{
              position: 'absolute',
              top: `calc(35% + ${p.y}px + ${pi * 50}px)`,
              left: `calc(50% + ${p.x}px)`,
              width: p.size, height: p.size, borderRadius: 2,
              background: i % 3 === 0 ? '#EF4444' : 'rgba(255,255,255,0.2)',
              opacity: p.opacity, pointerEvents: 'none',
            }} />
          ))
        )}
      </VirtualCamera>

      {/* Frosted purple overlay */}
      {frame >= 180 && (
        <AbsoluteFill style={{
          background: `linear-gradient(180deg, ${SOC.accent}${Math.round(overlayOpacity * 8).toString(16)} 0%, transparent 60%)`,
          backdropFilter: `blur(${overlayOpacity * 4}px)`,
          pointerEvents: 'none',
        }} />
      )}

      {/* Pain text */}
      {frame >= 210 && (
        <div style={{
          position: 'absolute', bottom: 130,
          fontFamily: HEEBO, fontSize: 30, fontWeight: 900, color: BRAND.white,
          direction: 'rtl', opacity: painSpring,
          transform: `translateY(${interpolate(painSpring, [0, 1], [15, 0])}px)`,
          textShadow: '0 4px 20px rgba(0,0,0,0.6)',
        }}>
          שיווק בלי מדידה — כסף שנשרף. כל יום.
        </div>
      )}

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 3: SOLUTION — "Social" [0:12–0:25]
// Glass shatter → title → content board → Like→Lead morph → analytics
// ═══════════════════════════════════════════════════════════
const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: Glass shatter + "Social" title (f0–60)
  const shatterProgress = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const titleSpring = spring({ frame: Math.max(0, frame - 10), fps, config: SPRING.hero, durationInFrames: 20 });

  // Phase 2: Clean content board (f60–150)
  const phoneSpring = spring({ frame: Math.max(0, frame - 60), fps, config: SPRING.hero, durationInFrames: 22 });

  // Phase 3: THE PHYSICAL TRANSITION — Like→Lead morph (f150–200)
  const morphStart = 160;
  const morphDur = 20;
  const likeToLead = interpolate(frame, [morphStart, morphStart + morphDur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Phase 4: Analytics dashboard (f200–310)
  const analyticsSpring = spring({ frame: Math.max(0, frame - 220), fps, config: SPRING.ui, durationInFrames: 20 });
  const revenueSlot = useSlotRoll(frame, fps, '12', 250, 18);

  // Phase 5: Full pullback (f310–390)
  const fullSpring = spring({ frame: Math.max(0, frame - 330), fps, config: SPRING.hero, durationInFrames: 22 });

  // Light sweep
  const sweepX = interpolate(frame, [0, 25], [-200, 1200], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      {/* Light sweep */}
      <div style={{
        position: 'absolute', width: 120, height: '100%',
        background: `linear-gradient(90deg, transparent, ${SOC.accent}10, transparent)`,
        transform: `translateX(${sweepX}px)`, pointerEvents: 'none', zIndex: 10,
      }} />

      {/* Glass shards — purple tinted */}
      {frame < 40 && Array.from({ length: 10 }).map((_, i) => {
        const seed = i * 53;
        const angle = (seed % 360) * (Math.PI / 180);
        const dist = shatterProgress * (70 + seed % 90);
        return (
          <div key={i} style={{
            position: 'absolute',
            left: `calc(50% + ${Math.cos(angle) * dist}px)`,
            top: `calc(40% + ${Math.sin(angle) * dist}px)`,
            width: 12 + seed % 16, height: 5 + seed % 8,
            background: `${SOC.accent}40`,
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(124,58,237,0.15)',
            borderRadius: 2, opacity: 1 - shatterProgress,
            transform: `rotate(${seed % 200}deg)`, pointerEvents: 'none',
          }} />
        );
      })}

      {/* "Social" — brushed purple title */}
      {frame >= 10 && frame < 80 && (
        <div style={{
          position: 'absolute', top: '22%',
          ...brushedPurple(120),
          opacity: titleSpring * (frame < 60 ? 1 : interpolate(frame, [60, 80], [1, 0], { extrapolateRight: 'clamp' })),
          transform: `scale(${interpolate(titleSpring, [0, 1], [1.1, 1])})`,
          filter: `blur(${interpolate(titleSpring, [0, 1], [8, 0])}px)`,
        }}>
          Social
        </div>
      )}

      {frame >= 18 && frame < 80 && (
        <div style={{
          position: 'absolute', top: '36%',
          fontFamily: HEEBO, fontSize: 26, fontWeight: 700, color: BRAND.muted, direction: 'rtl',
          opacity: spring({ frame: Math.max(0, frame - 18), fps, config: SPRING.ui, durationInFrames: 15 })
            * (frame < 60 ? 1 : interpolate(frame, [60, 80], [1, 0], { extrapolateRight: 'clamp' })),
        }}>
          שיווק חכם. כל like הופך לליד.
        </div>
      )}

      {/* Phase 2–3: Phone with content board + Like→Lead morph */}
      {frame >= 60 && frame < 220 && (
        <VirtualCamera zoom={1.1} rotateY={2} dofBlur={5}>
          <div style={{ opacity: phoneSpring, transform: `translateY(${interpolate(phoneSpring, [0, 1], [40, 0])}px)` }}>
            <DeviceFrame scale={1.15} delay={0}>
              <div style={{ width: '100%', height: '100%', background: '#0C0C0F', padding: '55px 14px 14px', direction: 'rtl' }}>
                <div style={{ fontFamily: HEEBO, fontSize: 15, fontWeight: 900, color: BRAND.white, marginBottom: 8 }}>
                  לוח תוכן
                </div>

                {/* Clean content rows */}
                {['פוסט FB · 10:00 היום', 'סטורי IG · 14:30', 'מאמר LinkedIn · מחר 08:00'].map((row, i) => {
                  const s = spring({ frame: Math.max(0, frame - 75 - i * 8), fps, config: SPRING.ui, durationInFrames: 12 });
                  return (
                    <div key={i} style={{
                      padding: '10px 12px', marginBottom: 5, borderRadius: 10,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                      fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: BRAND.white,
                      opacity: s, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span>{row}</span>
                      <div style={{
                        padding: '3px 8px', borderRadius: 6,
                        background: '#22C55E15', border: '1px solid #22C55E25',
                        fontFamily: HEEBO, fontSize: 9, fontWeight: 700, color: '#22C55E',
                      }}>
                        מתוזמן
                      </div>
                    </div>
                  );
                })}

                {/* Like→Lead morph zone */}
                {frame >= 150 && (
                  <div style={{ marginTop: 12, position: 'relative', height: 60 }}>
                    {/* Like icon morphing away */}
                    <svg width="30" height="28" viewBox="0 0 120 110" fill="none" style={{
                      position: 'absolute', left: '80%', top: 5,
                      opacity: 1 - likeToLead,
                      transform: `scale(${1 - likeToLead * 0.3})`,
                    }}>
                      <path d="M60 100 C20 70 0 40 0 25 C0 10 10 0 25 0 C40 0 55 10 60 25 C65 10 80 0 95 0 C110 0 120 10 120 25 C120 40 100 70 60 100Z"
                        fill="#E4405F" fillOpacity={0.7} />
                    </svg>

                    {/* Lead card materializing */}
                    <div style={{
                      padding: '8px 12px', borderRadius: 10,
                      background: `${SOC.accent}08`, border: `1px solid ${SOC.accent}15`,
                      opacity: likeToLead,
                      transform: `translateX(${interpolate(likeToLead, [0, 1], [30, 0])}px)`,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: BRAND.white }}>שרה כץ</div>
                        <div style={{ fontFamily: HEEBO, fontSize: 9, fontWeight: 600, color: BRAND.muted }}>Instagram · ביטוח חיים</div>
                      </div>
                      <div style={{
                        padding: '3px 8px', borderRadius: 6,
                        background: `${SOC.accent}20`, border: `1px solid ${SOC.accent}35`,
                        fontFamily: RUBIK, fontSize: 10, fontWeight: 800, color: SOC.accent,
                      }}>
                        87% AI
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </DeviceFrame>
          </div>
        </VirtualCamera>
      )}

      {/* Phase 4: Analytics card */}
      {frame >= 220 && frame < 340 && (
        <VirtualCamera zoom={1.08} dofBlur={4}>
          <div style={{
            width: 700, padding: '28px 32px', borderRadius: 24,
            background: 'rgba(24,24,27,0.7)', backdropFilter: 'blur(40px)',
            border: `1px solid ${SOC.accent}15`,
            boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 30px ${SOC.accent}08`,
            direction: 'rtl', opacity: analyticsSpring,
            transform: `translateY(${interpolate(analyticsSpring, [0, 1], [30, 0])}px)`,
          }}>
            <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 800, color: SOC.accent, marginBottom: 12 }}>
              קמפיין החודש
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              {[
                { label: 'Reach', value: '+340%' },
                { label: 'לידים', value: '23' },
                { label: 'עלות/ליד', value: `₪${revenueSlot.display}`, blur: revenueSlot.motionBlur },
              ].map((stat, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{
                    fontFamily: RUBIK, fontSize: 32, fontWeight: 800, color: SOC.accent,
                    filter: stat.blur ? `blur(${stat.blur}px)` : 'none',
                  }}>
                    {stat.value}
                  </div>
                  <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: BRAND.muted, marginTop: 4 }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Mini bar chart — bars materialize */}
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 16, alignItems: 'flex-end', height: 60 }}>
              {[35, 55, 42, 70, 85, 60, 90].map((h, i) => {
                const barSpring = spring({ frame: Math.max(0, frame - 240 - i * 3), fps, config: SPRING.ui, durationInFrames: 14 });
                return (
                  <div key={i} style={{
                    width: 28, height: h * barSpring * 0.7, borderRadius: 4,
                    background: `linear-gradient(180deg, ${SOC.accent} 0%, ${SOC.accent}60 100%)`,
                    opacity: barSpring,
                  }} />
                );
              })}
            </div>
          </div>
        </VirtualCamera>
      )}

      {/* Phase 5: Full text */}
      {frame >= 330 && (
        <div style={{
          position: 'absolute', bottom: 150,
          fontFamily: HEEBO, fontSize: 32, fontWeight: 900, color: BRAND.white,
          direction: 'rtl', opacity: fullSpring,
          transform: `translateY(${interpolate(fullSpring, [0, 1], [15, 0])}px)`,
          textShadow: '0 4px 20px rgba(0,0,0,0.6)',
        }}>
          שיווק שמדיד. שמחובר. שעובד.
        </div>
      )}

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 4: SHOWCASE — Cards + Platform orbit + Funnel morph
// [0:25–0:40] frames 0–450
// ═══════════════════════════════════════════════════════════
const FEATURE_CARDS = [
  { title: 'לוח תוכן', desc: 'חודש שלם במבט אחד', color: SOC.accent },
  { title: 'תזמון', desc: 'בוחרים שעה, המערכת מפרסמת', color: '#F59E0B' },
  { title: 'AI תוכן', desc: 'מקליד 3 מילים, מקבל פוסט שלם', color: '#A78BFA' },
  { title: 'ROI', desc: 'מה שווה כל קמפיין בשקלים', color: '#22C55E' },
];

const PLATFORMS = [
  { name: 'FB', color: '#1877F2' },
  { name: 'IG', color: '#E4405F' },
  { name: 'LinkedIn', color: '#0A66C2' },
  { name: 'X', color: '#FFFFFF' },
  { name: 'TikTok', color: '#FF0050' },
];

const ShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Cards phase (f0–160) — fast dolly
  const cardFocusIndex = Math.min(3, Math.floor(frame / 35));
  const cameraX = interpolate(frame, [0, 50, 100, 150], [40, 10, -20, 0], { extrapolateRight: 'clamp' });

  // AI content demo — blur→crystallize (f100–160)
  const aiCrystallize = interpolate(frame, [100, 130], [8, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const aiOpacity = interpolate(frame, [100, 115], [0.3, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Platform orbit (f170–280) + magnetic pull (f250–290)
  const orbitSpring = spring({ frame: Math.max(0, frame - 170), fps, config: SPRING.hero, durationInFrames: 20 });
  const magneticPull = interpolate(frame, [250, 290], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Funnel morph chain (f300–400)
  const funnelSpring = spring({ frame: Math.max(0, frame - 300), fps, config: SPRING.hero, durationInFrames: 20 });
  const morphPhase = interpolate(frame, [310, 325, 340, 355, 370, 385], [0, 0.5, 1, 1.5, 2, 2.5], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Final text (f400+)
  const finalSpring = spring({ frame: Math.max(0, frame - 400), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <VirtualCamera panX={cameraX} dofBlur={6} zoom={1.05}>
        {/* Feature cards — fast dolly */}
        {frame < 170 && (
          <div style={{
            position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 16,
          }}>
            {FEATURE_CARDS.map((card, i) => {
              const isFocused = i === cardFocusIndex;
              const s = spring({ frame: Math.max(0, frame - i * 10), fps, config: SPRING.ui, durationInFrames: 16 });
              return (
                <div key={i} style={{
                  width: 200, padding: '20px 16px', borderRadius: 20,
                  background: 'rgba(24,24,27,0.65)', backdropFilter: 'blur(40px)',
                  border: `1px solid ${isFocused ? card.color + '30' : 'rgba(255,255,255,0.06)'}`,
                  boxShadow: `0 20px 60px rgba(0,0,0,0.4)${isFocused ? `, 0 0 25px ${card.color}12` : ''}`,
                  opacity: s, textAlign: 'center',
                  transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px) scale(${isFocused ? 1.05 : 0.95})`,
                  filter: isFocused ? 'none' : 'blur(2px)',
                }}>
                  <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 800, color: card.color, direction: 'rtl' }}>
                    {card.title}
                  </div>
                  <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 600, color: BRAND.muted, marginTop: 6, direction: 'rtl' }}>
                    {card.desc}
                  </div>
                  {i === 2 && frame >= 100 && (
                    <div style={{
                      marginTop: 10, padding: '8px 10px', borderRadius: 8,
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                      fontFamily: HEEBO, fontSize: 10, fontWeight: 600, color: BRAND.white,
                      direction: 'rtl', filter: `blur(${aiCrystallize}px)`, opacity: aiOpacity,
                    }}>
                      ביטוח חיים שמשנה את הכל. גלו איך חיסכון קטן הופך...
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Platform orbit + magnetic pull */}
        {frame >= 170 && frame < 300 && (
          <div style={{ position: 'absolute', top: '35%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            {PLATFORMS.map((plat, i) => {
              const angle = (i / PLATFORMS.length) * Math.PI * 2 - Math.PI / 2;
              const radius = 180 * (1 - magneticPull);
              const x = Math.cos(angle + frame * 0.008) * radius;
              const y = Math.sin(angle + frame * 0.008) * radius * 0.5;
              const s = spring({ frame: Math.max(0, frame - 175 - i * 5), fps, config: SPRING.ui, durationInFrames: 14 });

              return (
                <div key={i} style={{
                  position: 'absolute',
                  left: `calc(50% + ${x}px - 30px)`,
                  top: `calc(50% + ${y}px - 18px)`,
                  padding: '8px 16px', borderRadius: 14,
                  background: 'rgba(24,24,27,0.7)', backdropFilter: 'blur(30px)',
                  border: `1px solid ${plat.color}30`,
                  boxShadow: `0 10px 30px rgba(0,0,0,0.3)`,
                  fontFamily: RUBIK, fontSize: 14, fontWeight: 800, color: plat.color,
                  opacity: s * (1 - magneticPull * 0.5),
                  transform: `scale(${interpolate(s, [0, 1], [0.6, 1]) * (1 - magneticPull * 0.3)})`,
                }}>
                  {plat.name}
                </div>
              );
            })}

            {/* After magnetic pull: single badge */}
            {magneticPull > 0.8 && (
              <div style={{
                position: 'absolute', left: '50%', top: '50%',
                transform: 'translate(-50%, -50%)',
                padding: '10px 20px', borderRadius: 14,
                background: `${SOC.accent}15`, border: `1px solid ${SOC.accent}30`,
                fontFamily: HEEBO, fontSize: 14, fontWeight: 800, color: SOC.accent,
                opacity: magneticPull,
              }}>
                5 פלטפורמות. לחיצה אחת.
              </div>
            )}
          </div>
        )}

        {/* Funnel morph chain: Like → Lead → Client */}
        {frame >= 300 && frame < 410 && (
          <div style={{
            position: 'absolute', top: '35%', left: '50%', transform: 'translate(-50%, -50%)',
            display: 'flex', gap: 50, alignItems: 'center',
            opacity: funnelSpring,
          }}>
            {[
              { label: 'Like', color: SOC.accent, phase: 0 },
              { label: 'Lead', color: '#EF4444', phase: 1 },
              { label: 'Client', color: '#F59E0B', phase: 2 },
            ].map((stage, i) => {
              const isActive = morphPhase >= i && morphPhase < i + 1.5;
              const stageSpring = spring({ frame: Math.max(0, frame - 310 - i * 20), fps, config: SPRING.punch, durationInFrames: 16 });
              return (
                <React.Fragment key={i}>
                  <div style={{
                    width: 100, height: 100, borderRadius: 20,
                    background: `${stage.color}${isActive ? '20' : '08'}`,
                    border: `2px solid ${stage.color}${isActive ? '50' : '20'}`,
                    boxShadow: isActive ? `0 0 30px ${stage.color}20` : 'none',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                    opacity: stageSpring,
                    transform: `scale(${interpolate(stageSpring, [0, 1], [0.6, isActive ? 1.1 : 0.95])})`,
                  }}>
                    <div style={{ fontFamily: RUBIK, fontSize: 18, fontWeight: 800, color: stage.color }}>{stage.label}</div>
                  </div>
                  {i < 2 && (
                    <div style={{
                      width: 30, height: 3, borderRadius: 2,
                      background: `linear-gradient(90deg, ${stage.color}60, ${[SOC.accent, '#EF4444', '#F59E0B'][i + 1]}60)`,
                      opacity: stageSpring * 0.6,
                    }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {frame >= 370 && (
          <div style={{
            position: 'absolute', bottom: '25%',
            fontFamily: HEEBO, fontSize: 24, fontWeight: 900, color: BRAND.white,
            direction: 'rtl', opacity: funnelSpring,
          }}>
            מעוקב. לליד. ללקוח. בלי שום דבר נופל בדרך.
          </div>
        )}
      </VirtualCamera>

      {/* Final text */}
      {frame >= 400 && (
        <div style={{
          position: 'absolute', bottom: 150,
          fontFamily: HEEBO, fontSize: 34, fontWeight: 900, color: BRAND.white,
          direction: 'rtl', opacity: finalSpring,
          transform: `translateY(${interpolate(finalSpring, [0, 1], [15, 0])}px)`,
          textShadow: '0 4px 20px rgba(0,0,0,0.6)',
        }}>
          הכל מחובר. הכל מדיד. הכל עובד.
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
  { value: '12', prefix: '₪', suffix: '', label: 'עלות ליד מסושיאל', delay: 0 },
  { value: '3', prefix: '', suffix: 'X', label: 'conversion rate', delay: 12 },
  { value: '10', prefix: '', suffix: ' שעות/שבוע', label: 'חזרו למנהלת השיווק', delay: 24 },
];

const ProofScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const quoteSpring = spring({ frame: Math.max(0, frame - 130), fps, config: SPRING.hero, durationInFrames: 22 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${SOC.accent}05 0%, transparent 60%)` }} />

      <VirtualCamera zoom={1.05} dofBlur={4}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center' }}>
          {STATS.map((stat, i) => {
            const s = spring({ frame: Math.max(0, frame - stat.delay), fps, config: SPRING.punch, durationInFrames: 20 });
            const slot = useSlotRoll(frame, fps, stat.value, stat.delay, 20);
            const isFocused = Math.floor(frame / 40) % 3 === i;
            return (
              <div key={i} style={{
                width: 700, padding: '28px 36px', borderRadius: 24,
                background: 'rgba(24,24,27,0.65)', backdropFilter: 'blur(40px)',
                border: `1px solid rgba(255,255,255,${isFocused ? '0.14' : '0.06'})`,
                boxShadow: `0 20px 60px rgba(0,0,0,0.4)${isFocused ? `, 0 0 30px ${SOC.accent}10` : ''}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl',
                opacity: s, transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px)`,
                filter: isFocused ? 'none' : 'blur(1px)',
              }}>
                <span style={{ fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: BRAND.muted }}>{stat.label}</span>
                <span style={{
                  ...brushedPurple(56),
                  filter: `blur(${slot.motionBlur}px)`,
                  transform: `scale(${interpolate(s, [0, 1], [1.2, 1])})`, display: 'inline-block',
                }}>
                  {stat.prefix}{slot.display}{stat.suffix}
                </span>
              </div>
            );
          })}
        </div>
      </VirtualCamera>

      {/* Quote + purple silhouette */}
      {frame >= 130 && (
        <div style={{
          position: 'absolute', bottom: 110, maxWidth: 750,
          padding: '24px 32px', borderRadius: 24,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          direction: 'rtl', opacity: quoteSpring,
          transform: `translateY(${interpolate(quoteSpring, [0, 1], [15, 0])}px)`,
          display: 'flex', alignItems: 'center', gap: 20,
        }}>
          <svg width="50" height="70" viewBox="0 0 50 70" fill="none" style={{ flexShrink: 0, opacity: 0.35 }}>
            <circle cx="25" cy="16" r="12" stroke={SOC.accent} strokeWidth="1.5" />
            <path d="M5 65 C5 45 15 35 25 35 C35 35 45 45 45 65" stroke={SOC.accent} strokeWidth="1.5" />
          </svg>
          <div>
            <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 700, color: BRAND.white, lineHeight: 1.6 }}>
              "הפסקתי לנחש. יודעת בדיוק מה שווה כל פוסט — עד השקל."
            </div>
            <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 600, color: BRAND.muted, marginTop: 8 }}>
              — מנהלת שיווק, סוכנות ביטוח
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
  { text: 'תוכן AI בעברית — לא תרגום, שפת אם', delay: 0 },
  { text: 'שומר שבת — אפס פרסומים בשבת', delay: 15 },
  { text: 'לוח עברי — מתזמן סביב חגים', delay: 30 },
];

const IdentityScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(135deg, ${BRAND.bgDark} 0%, ${SOC.accent}08 50%, ${BRAND.bgDark} 100%)`,
      justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
    }}>
      <div style={{
        ...brushedPurple(48, { fontFamily: HEEBO, letterSpacing: 0 }),
        fontFamily: HEEBO, fontSize: 42, fontWeight: 900,
        direction: 'rtl', marginBottom: 40,
        opacity: titleSpring,
        transform: `translateY(${interpolate(titleSpring, [0, 1], [20, 0])}px)`,
      }}>
        שיווק בשפה שלך.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        {BADGES.map((badge, i) => {
          const s = spring({ frame: Math.max(0, frame - badge.delay - 20), fps, config: SPRING.ui, durationInFrames: 18 });
          const focusBadge = Math.min(2, Math.floor((frame - 20) / 40));
          const isFocused = i === focusBadge;
          return (
            <div key={i} style={{
              padding: '18px 32px', borderRadius: 20,
              background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(30px)',
              border: `1px solid rgba(255,255,255,${isFocused ? '0.15' : '0.06'})`,
              boxShadow: `0 15px 40px rgba(0,0,0,0.3)${isFocused ? `, 0 0 20px ${SOC.accent}10` : ''}`,
              direction: 'rtl', fontFamily: HEEBO, fontSize: 20, fontWeight: 700,
              color: isFocused ? BRAND.white : BRAND.muted,
              opacity: s,
              transform: `translateY(${interpolate(s, [0, 1], [15, 0])}px) scale(${isFocused ? 1.02 : 0.98})`,
              filter: isFocused ? 'none' : 'blur(1px)',
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
      background: SOC.gradient,
      justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
      opacity: bgOpacity,
    }}>
      <TextReveal
        text="מהתוכן ללקוח. בלי להפסיד אף אחד בדרך."
        delay={5} fontSize={52} fontWeight={900} color="#fff"
        mode="words" stagger={3}
        style={{ textAlign: 'center' }}
      />

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPOSITION — A3 Social Video
// ═══════════════════════════════════════════════════════════
export const SocialVideoV2: React.FC = () => {
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
        <CTAEndcard variant="dark" accentColor={SOC.accent} tagline="מהתוכן ללקוח. בלי להפסיד אף אחד בדרך." />
      </Sequence>
    </AbsoluteFill>
  );
};
