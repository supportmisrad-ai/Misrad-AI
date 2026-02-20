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

const SYS = MODULE_COLORS.system;

// ─── Script-accurate timing (A1-SYSTEM-SCRIPT.md) ──────────
const T = {
  HOOK:     { from: 0,    dur: 90 },   // 0:00–0:03
  PROBLEM:  { from: 90,   dur: 270 },  // 0:03–0:12
  SOLUTION: { from: 360,  dur: 390 },  // 0:12–0:25
  SHOWCASE: { from: 750,  dur: 450 },  // 0:25–0:40
  PROOF:    { from: 1200, dur: 240 },  // 0:40–0:48
  IDENTITY: { from: 1440, dur: 150 },  // 0:48–0:53
  TAGLINE:  { from: 1590, dur: 120 },  // 0:53–0:57
  CTA:      { from: 1710, dur: 90 },   // 0:57–1:00
} as const;

// ─── Helpers ────────────────────────────────────────────────

/** Slot-machine roll: digits blur-spin then lock with overshoot. */
const useSlotRoll = (
  frame: number,
  fps: number,
  target: string,
  startFrame: number,
  rollDuration = 20,
) => {
  const f = Math.max(0, frame - startFrame);
  const progress = spring({
    frame: f,
    fps,
    config: { damping: 12, stiffness: 200, mass: 0.8 },
    durationInFrames: rollDuration,
  });
  const motionBlur = interpolate(progress, [0, 0.8, 1], [6, 2, 0]);
  // During roll, show random digits; on lock, show target
  const locked = progress > 0.95;
  const display = locked
    ? target
    : target.replace(/[0-9]/g, () => String(Math.floor(Math.random() * 10)));
  return { display, progress, motionBlur, locked };
};

/** Brushed-metal gradient text style */
const brushedMetal = (fontSize: number, extra?: React.CSSProperties): React.CSSProperties => ({
  fontFamily: RUBIK,
  fontSize,
  fontWeight: 800,
  background: 'linear-gradient(160deg, #E8E0D4 0%, #B8AFA5 30%, #DDD5C8 50%, #A89F94 75%, #C4BAB0 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  letterSpacing: -2,
  textShadow: '0 2px 20px rgba(0,0,0,0.4)',
  ...extra,
});

/** Disintegration: returns opacity + scatter for N particles. */
const useDisintegration = (frame: number, startFrame: number, duration: number, count: number) => {
  const f = Math.max(0, frame - startFrame);
  const progress = Math.min(f / duration, 1);
  return useMemo(() =>
    Array.from({ length: count }, (_, i) => {
      const seed = i * 137.5;
      const angle = (seed % 360) * (Math.PI / 180);
      const dist = progress * (40 + (seed % 60));
      const x = Math.cos(angle) * dist;
      const y = Math.sin(angle) * dist - progress * 20;
      const opacity = Math.max(0, 1 - progress * (1.2 + (seed % 0.5)));
      const size = 3 + (seed % 4);
      return { x, y, opacity, size };
    }), [progress, count]);
};

// ═══════════════════════════════════════════════════════════
// SCENE 1: HOOK — "ליד שנשרף" [0:00–0:03] frames 0–90
// Macro on lead card → disintegration → ₪47,000 brushed metal
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Card visibility: visible 0–35, disintegrating 10–45, gone by 45
  const cardOpacity = interpolate(frame, [0, 5, 30, 45], [0, 1, 0.6, 0], { extrapolateRight: 'clamp' });
  const cardScale = interpolate(frame, [0, 5], [1.6, 1.4], { extrapolateRight: 'clamp' });

  // Disintegration particles
  const particles = useDisintegration(frame, 10, 35, 40);

  // Amount reveal (after card gone): frame 45+
  const amountSpring = spring({
    frame: Math.max(0, frame - 45),
    fps,
    config: { damping: 14, stiffness: 160, mass: 1 },
    durationInFrames: 20,
  });
  const amountBlur = interpolate(amountSpring, [0, 1], [12, 0]);
  const amountScale = interpolate(amountSpring, [0, 1], [1.15, 1]);

  // "נשרף" text: frame 60+
  const burnSpring = spring({
    frame: Math.max(0, frame - 60),
    fps,
    config: SPRING.hero,
    durationInFrames: 15,
  });

  // Sub-line: frame 70+
  const subSpring = spring({
    frame: Math.max(0, frame - 70),
    fps,
    config: SPRING.ui,
    durationInFrames: 18,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      {/* Ambient depth light */}
      <div style={{
        position: 'absolute', width: 500, height: 500, borderRadius: '50%',
        background: `radial-gradient(circle, ${SYS.accent}06 0%, transparent 65%)`,
      }} />

      {/* VirtualCamera: Macro with Dutch angle */}
      <VirtualCamera zoom={1.3} rotateY={-3} dofBlur={6}>
        {/* Lead card — disintegrating */}
        <div style={{
          position: 'absolute', top: '28%', left: '50%',
          transform: `translate(-50%, -50%) scale(${cardScale})`,
          opacity: cardOpacity,
        }}>
          <div style={{
            width: 380, padding: '24px 28px', borderRadius: 20,
            background: 'rgba(24,24,27,0.75)',
            backdropFilter: 'blur(40px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 30px ${SYS.accent}15`,
            direction: 'rtl',
          }}>
            <div style={{ fontFamily: HEEBO, fontSize: 22, fontWeight: 800, color: BRAND.white }}>
              דני כהן
            </div>
            <div style={{ fontFamily: HEEBO, fontSize: 15, fontWeight: 600, color: BRAND.muted, marginTop: 4 }}>
              ביטוח חיים · ₪47,000
            </div>
            <div style={{
              marginTop: 12, padding: '6px 14px', borderRadius: 8,
              background: '#EF444420', border: '1px solid #EF444440',
              fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: '#EF4444',
              display: 'inline-block',
            }}>
              לא חזרו · 14 ימים
            </div>
          </div>
        </div>

        {/* Disintegration particles */}
        {frame >= 10 && frame < 60 && particles.map((p, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: `calc(28% + ${p.y}px)`,
            left: `calc(50% + ${p.x}px)`,
            width: p.size, height: p.size,
            borderRadius: 2,
            background: i % 3 === 0 ? SYS.accent : 'rgba(255,255,255,0.3)',
            opacity: p.opacity,
            boxShadow: i % 3 === 0 ? `0 0 8px ${SYS.accent}60` : 'none',
            pointerEvents: 'none',
          }} />
        ))}
      </VirtualCamera>

      {/* ₪47,000 — brushed metal, enormous */}
      {frame >= 45 && (
        <div style={{
          position: 'absolute', top: '35%',
          ...brushedMetal(140),
          opacity: amountSpring,
          transform: `scale(${amountScale})`,
          filter: `blur(${amountBlur}px)`,
        }}>
          ₪47,000
        </div>
      )}

      {/* "נשרף" — deep red, textured */}
      {frame >= 60 && (
        <div style={{
          position: 'absolute', top: '54%',
          fontFamily: HEEBO, fontSize: 52, fontWeight: 900,
          color: '#DC2626',
          opacity: burnSpring,
          transform: `translateY(${interpolate(burnSpring, [0, 1], [12, 0])}px)`,
          textShadow: `0 4px 30px rgba(220,38,38,0.4)`,
          direction: 'rtl',
        }}>
          נשרף.
        </div>
      )}

      {/* "כי אף אחד לא חזר אליו" */}
      {frame >= 70 && (
        <div style={{
          position: 'absolute', top: '64%',
          fontFamily: HEEBO, fontSize: 26, fontWeight: 700,
          color: BRAND.muted,
          opacity: subSpring,
          transform: `translateY(${interpolate(subSpring, [0, 1], [10, 0])}px)`,
          direction: 'rtl',
        }}>
          כי אף אחד לא חזר אליו.
        </div>
      )}

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 2: PROBLEM — Rack focus through lost leads [0:03–0:12]
// frames 0–270 (within Sequence)
// ═══════════════════════════════════════════════════════════
const LOST_LEADS = [
  { name: 'דני כהן', status: 'אין מענה', days: 14 },
  { name: 'אורלי שפירא', status: 'follow-up שנשכח', days: 7 },
  { name: 'רמי לוי', status: 'סגור?', days: 21 },
  { name: 'שרה כהן', status: 'אין תגובה', days: 30 },
  { name: 'אלי מזרחי', status: 'ממתין', days: 18 },
  { name: 'מיכל דוד', status: 'התקשר שוב', days: 10 },
];

const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 3 focus shifts: lead 0 at f0, lead 1 at f90, lead 2 at f180
  const focusIndex = frame < 90 ? 0 : frame < 180 ? 1 : 2;

  // Camera pull-back at frame 180+
  const pullBack = interpolate(frame, [180, 270], [1.15, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Red overlay at frame 180+
  const overlayOpacity = interpolate(frame, [180, 210], [0, 0.4], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Pain text
  const painSpring = spring({
    frame: Math.max(0, frame - 210),
    fps,
    config: SPRING.hero,
    durationInFrames: 20,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      {/* Red ambient mood */}
      <div style={{
        position: 'absolute', width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(220,38,38,0.04) 0%, transparent 60%)',
      }} />

      <VirtualCamera zoom={pullBack} rotateY={2} dofBlur={8}>
        <DeviceFrame scale={1.2} delay={0}>
          <div style={{ width: '100%', height: '100%', background: '#0C0C0F', padding: '55px 16px 16px', direction: 'rtl' }}>
            <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 900, color: BRAND.white, marginBottom: 12 }}>
              רשימת לידים
            </div>

            {LOST_LEADS.map((lead, i) => {
              const isFocused = i === focusIndex;
              // Leads that passed focus: begin subtle disintegration
              const isPast = i < focusIndex;
              const entrySpring = spring({
                frame: Math.max(0, frame - i * 5),
                fps, config: SPRING.ui, durationInFrames: 14,
              });
              const pastFade = isPast ? interpolate(frame, [focusIndex * 90, focusIndex * 90 + 30], [1, 0.3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;

              return (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 16px', marginBottom: 8, borderRadius: 16,
                  background: isFocused ? 'rgba(220,38,38,0.08)' : 'rgba(255,255,255,0.025)',
                  border: isFocused ? '1px solid rgba(220,38,38,0.3)' : '1px solid rgba(255,255,255,0.05)',
                  opacity: entrySpring * pastFade,
                  transform: `translateX(${interpolate(entrySpring, [0, 1], [30, 0])}px)`,
                  filter: isFocused ? 'none' : `blur(${isFocused ? 0 : 1.5}px)`,
                  transition: 'filter 0.3s',
                }}>
                  <div>
                    <div style={{ fontFamily: HEEBO, fontSize: 17, fontWeight: 700, color: isFocused ? BRAND.white : 'rgba(255,255,255,0.5)' }}>
                      {lead.name}
                    </div>
                    <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: '#EF4444' }}>
                      {lead.status} · לפני {lead.days} ימים
                    </div>
                  </div>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: '#EF4444',
                    boxShadow: isFocused ? '0 0 12px rgba(239,68,68,0.6)' : 'none',
                  }} />
                </div>
              );
            })}
          </div>
        </DeviceFrame>
      </VirtualCamera>

      {/* Red frosted overlay descending */}
      {frame >= 180 && (
        <AbsoluteFill style={{
          background: `linear-gradient(180deg, rgba(220,38,38,${overlayOpacity * 0.15}) 0%, transparent 60%)`,
          pointerEvents: 'none',
        }} />
      )}

      {/* Pain text — brushed metal */}
      {frame >= 210 && (
        <div style={{
          position: 'absolute', bottom: 140,
          ...brushedMetal(34, { fontFamily: HEEBO, letterSpacing: 0, background: undefined, WebkitBackgroundClip: undefined, WebkitTextFillColor: undefined }),
          fontFamily: HEEBO, fontSize: 34, fontWeight: 900, color: BRAND.white,
          direction: 'rtl', opacity: painSpring,
          transform: `translateY(${interpolate(painSpring, [0, 1], [15, 0])}px)`,
          textShadow: '0 4px 30px rgba(0,0,0,0.9)',
        }}>
          כל ליד שנופל בין הכיסאות — זה כסף שלא חוזר.
        </div>
      )}

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 3: SOLUTION — "System" entrance + AI sorted UI
// [0:12–0:25] frames 0–390 (within Sequence)
// ═══════════════════════════════════════════════════════════
const AI_LEADS = [
  { name: 'רונית כץ', score: 92, action: 'שלח הצעה מותאמת עכשיו', color: '#22C55E' },
  { name: 'שרה לוי', score: 78, action: 'תזמן שיחת פולואפ', color: '#22C55E' },
  { name: 'מיכל דוד', score: 65, action: 'שלח תזכורת אוטומטית', color: '#F59E0B' },
  { name: 'דני כהן', score: 41, action: 'העבר לנרטור', color: '#F59E0B' },
  { name: 'יוסי אברהם', score: 23, action: 'סגור — לא רלוונטי', color: '#EF4444' },
];

const PIPELINE_COLS = [
  { label: 'ליד חדש', count: 12, color: SYS.accent },
  { label: 'בטיפול', count: 8, color: '#F59E0B' },
  { label: 'הצעה', count: 5, color: BRAND.indigo },
  { label: 'סגירה', count: 3, color: '#22C55E' },
];

const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1 (f0–60): Glass shatter + "System" title
  const shatterProgress = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const titleSpring = spring({ frame: Math.max(0, frame - 10), fps, config: SPRING.hero, durationInFrames: 20 });

  // Phase 2 (f60–150): Phone with AI-sorted leads materializing
  const phoneSpring = spring({ frame: Math.max(0, frame - 60), fps, config: SPRING.hero, durationInFrames: 25 });

  // Phase 3 (f150–240): AI insight card
  const insightSpring = spring({ frame: Math.max(0, frame - 150), fps, config: SPRING.ui, durationInFrames: 20 });

  // Phase 4 (f200–260): Send button click
  const clickFrame = Math.max(0, frame - 220);
  const btnClick = spring({ frame: clickFrame, fps, config: SPRING.punch, durationInFrames: 12 });
  const btnDone = clickFrame > 15;

  // Phase 5 (f260–390): Pipeline dashboard
  const pipelineSpring = spring({ frame: Math.max(0, frame - 260), fps, config: SPRING.hero, durationInFrames: 25 });

  // Slot roll for pipeline total
  const pipeSlot = useSlotRoll(frame, fps, '340K', 300, 22);

  // Light sweep
  const sweepX = interpolate(frame, [0, 30], [-200, 1200], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      {/* Light sweep */}
      <div style={{
        position: 'absolute', width: 150, height: '100%',
        background: `linear-gradient(90deg, transparent, ${SYS.accent}12, transparent)`,
        transform: `translateX(${sweepX}px)`, pointerEvents: 'none', zIndex: 10,
      }} />

      {/* Glass shards flying out (from the red overlay) */}
      {frame < 40 && Array.from({ length: 8 }).map((_, i) => {
        const seed = i * 47;
        const angle = (seed % 360) * (Math.PI / 180);
        const dist = shatterProgress * (80 + seed % 100);
        return (
          <div key={i} style={{
            position: 'absolute',
            left: `calc(50% + ${Math.cos(angle) * dist}px)`,
            top: `calc(40% + ${Math.sin(angle) * dist}px)`,
            width: 12 + seed % 20, height: 6 + seed % 10,
            background: 'rgba(220,38,38,0.15)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(220,38,38,0.2)',
            borderRadius: 3,
            opacity: 1 - shatterProgress,
            transform: `rotate(${seed % 180}deg)`,
            pointerEvents: 'none',
          }} />
        );
      })}

      {/* "System" — brushed metal title */}
      {frame >= 10 && frame < 80 && (
        <div style={{
          position: 'absolute', top: '20%',
          ...brushedMetal(120),
          opacity: titleSpring * (frame < 60 ? 1 : interpolate(frame, [60, 80], [1, 0], { extrapolateRight: 'clamp' })),
          transform: `scale(${interpolate(titleSpring, [0, 1], [1.1, 1])})`,
          filter: `blur(${interpolate(titleSpring, [0, 1], [8, 0])}px)`,
        }}>
          System
        </div>
      )}

      {/* Subtitle */}
      {frame >= 20 && frame < 80 && (
        <div style={{
          position: 'absolute', top: '35%',
          fontFamily: HEEBO, fontSize: 28, fontWeight: 700,
          color: BRAND.muted, direction: 'rtl',
          opacity: spring({ frame: Math.max(0, frame - 20), fps, config: SPRING.ui, durationInFrames: 15 })
            * (frame < 60 ? 1 : interpolate(frame, [60, 80], [1, 0], { extrapolateRight: 'clamp' })),
        }}>
          מכירות חכמות. אף ליד לא נופל.
        </div>
      )}

      {/* Phase 2: Phone with AI-sorted leads */}
      {frame >= 60 && frame < 260 && (
        <VirtualCamera zoom={1.1} rotateY={-2} dofBlur={5}>
          <div style={{ opacity: phoneSpring, transform: `translateY(${interpolate(phoneSpring, [0, 1], [40, 0])}px)` }}>
            <DeviceFrame scale={1.2} delay={0}>
              <div style={{ width: '100%', height: '100%', background: '#0C0C0F', padding: '55px 16px 16px', direction: 'rtl' }}>
                <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 900, color: BRAND.white, marginBottom: 4 }}>
                  לידים — מדורגים לפי AI
                </div>
                <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: '#22C55E', marginBottom: 12 }}>
                  מנותחים ומתועדפים
                </div>

                {AI_LEADS.map((lead, i) => {
                  const delay = 80 + i * 10;
                  const s = spring({ frame: Math.max(0, frame - delay), fps, config: SPRING.ui, durationInFrames: 14 });
                  const isFocused = i === 0;
                  return (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '11px 14px', marginBottom: 6, borderRadius: 14,
                      background: isFocused ? `${lead.color}10` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isFocused ? lead.color + '30' : 'rgba(255,255,255,0.05)'}`,
                      opacity: s,
                      transform: `translateX(${interpolate(s, [0, 1], [25, 0])}px)`,
                      filter: isFocused ? 'none' : 'blur(0.5px)',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: HEEBO, fontSize: 15, fontWeight: 700, color: BRAND.white }}>{lead.name}</div>
                        <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 600, color: lead.color }}>{lead.action}</div>
                      </div>
                      <div style={{
                        fontFamily: RUBIK, fontSize: 20, fontWeight: 800, color: lead.color,
                        transform: `scale(${interpolate(s, [0, 1], [1.2, 1])})`,
                        filter: `blur(${interpolate(s, [0, 1], [4, 0])}px)`,
                      }}>
                        {Math.round(lead.score * s)}%
                      </div>
                    </div>
                  );
                })}

                {/* AI Insight Card */}
                {frame >= 150 && (
                  <div style={{
                    marginTop: 10, padding: '12px 14px', borderRadius: 14,
                    background: `linear-gradient(135deg, ${SYS.accent}10, ${BRAND.indigo}08)`,
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${SYS.accent}20`,
                    opacity: insightSpring,
                    transform: `translateY(${interpolate(insightSpring, [0, 1], [8, 0])}px)`,
                  }}>
                    <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: SYS.accent, marginBottom: 4 }}>
                      תובנת AI
                    </div>
                    <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: BRAND.white, lineHeight: 1.5 }}>
                      רונית כץ — 92%. שלח הצעה מותאמת עכשיו.
                    </div>

                    {/* Send button */}
                    <div style={{
                      marginTop: 8, padding: '8px 20px', borderRadius: 10,
                      background: btnDone ? '#22C55E' : SYS.gradient,
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      transform: `scale(${frame >= 220 ? interpolate(btnClick, [0, 0.5, 1], [1, 0.95, 1]) : 1})`,
                    }}>
                      {btnDone ? (
                        <>
                          <IconCheck size={14} color="#fff" />
                          <span style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: '#fff' }}>נשלח!</span>
                        </>
                      ) : (
                        <span style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: '#fff' }}>שלח הצעה</span>
                      )}
                    </div>
                    {/* Green bloom from button */}
                    {btnDone && (
                      <div style={{
                        position: 'absolute', bottom: 10, left: '30%',
                        width: 100, height: 40, borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)',
                        pointerEvents: 'none',
                      }} />
                    )}
                  </div>
                )}
              </div>
            </DeviceFrame>
          </div>
        </VirtualCamera>
      )}

      {/* Phase 5: Pipeline Dashboard */}
      {frame >= 260 && (
        <div style={{ opacity: pipelineSpring, transform: `translateY(${interpolate(pipelineSpring, [0, 1], [30, 0])}px)` }}>
          <div style={{
            fontFamily: HEEBO, fontSize: 26, fontWeight: 900, color: BRAND.white,
            direction: 'rtl', textAlign: 'center', marginBottom: 20,
            textShadow: '0 4px 20px rgba(0,0,0,0.6)',
          }}>
            Pipeline
          </div>

          <div style={{ display: 'flex', gap: 16, direction: 'rtl', justifyContent: 'center' }}>
            {PIPELINE_COLS.map((col, i) => {
              const colSpring = spring({ frame: Math.max(0, frame - 280 - i * 8), fps, config: SPRING.ui, durationInFrames: 16 });
              const colSlot = useSlotRoll(frame, fps, String(col.count), 290 + i * 8, 18);
              return (
                <div key={i} style={{
                  width: 160, padding: '20px 14px', borderRadius: 20,
                  background: 'rgba(24,24,27,0.65)', backdropFilter: 'blur(40px)',
                  border: `1px solid ${col.color}25`,
                  boxShadow: `0 20px 60px rgba(0,0,0,0.4), 0 0 30px ${col.color}10`,
                  textAlign: 'center',
                  opacity: colSpring,
                  transform: `translateY(${interpolate(colSpring, [0, 1], [20, 0])}px)`,
                }}>
                  <div style={{
                    fontFamily: RUBIK, fontSize: 44, fontWeight: 800,
                    color: col.color,
                    filter: `blur(${colSlot.motionBlur}px)`,
                  }}>
                    {colSlot.display}
                  </div>
                  <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: BRAND.muted, marginTop: 6 }}>
                    {col.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pipeline total */}
          {frame >= 310 && (
            <div style={{
              textAlign: 'center', marginTop: 24,
              opacity: spring({ frame: Math.max(0, frame - 310), fps, config: SPRING.punch, durationInFrames: 18 }),
            }}>
              <span style={{
                ...brushedMetal(56),
                filter: `blur(${pipeSlot.motionBlur}px)`,
              }}>
                ₪{pipeSlot.display}
              </span>
              <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 700, color: BRAND.muted, marginTop: 4, direction: 'rtl' }}>
                בצנרת
              </div>
            </div>
          )}
        </div>
      )}

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 4: SHOWCASE — 3D floating cards + features [0:25–0:40]
// frames 0–450 (within Sequence)
// ═══════════════════════════════════════════════════════════
const FEATURE_CARDS = [
  {
    title: 'דירוג AI',
    desc: 'כל ליד מקבל ציון סגירה. אתה יודע מי ייסגור.',
    color: SYS.accent,
    miniUI: '92%',
  },
  {
    title: 'תזמון חכם',
    desc: 'ה-AI יודע מתי הליד פתוח — ומתזמן בדיוק ברגע הנכון.',
    color: '#F59E0B',
    miniUI: 'רביעי 11:00',
  },
  {
    title: 'פולואפ אוטומטי',
    desc: 'ליד לא ענה? SMS יוצא בעצמו.',
    color: '#22C55E',
    miniUI: '✓ נשלח',
  },
];

const ShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Camera dolly between cards: card focus shifts every ~100 frames
  const cardFocusIndex = Math.min(2, Math.floor(frame / 120));
  const cameraX = interpolate(frame, [0, 120, 240, 350], [60, 0, -60, 0], { extrapolateRight: 'clamp' });

  // Phone pipeline demo (f250–350)
  const demoSpring = spring({ frame: Math.max(0, frame - 250), fps, config: SPRING.hero, durationInFrames: 22 });

  // Chart (f300–420)
  const chartSpring = spring({ frame: Math.max(0, frame - 300), fps, config: SPRING.ui, durationInFrames: 25 });
  const chartSlot = useSlotRoll(frame, fps, '127K', 340, 24);

  // Final pull-back text (f380+)
  const finalSpring = spring({ frame: Math.max(0, frame - 380), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <VirtualCamera panX={cameraX} dofBlur={7} zoom={1.05}>
        {/* 3 floating cards in 3D space */}
        {frame < 260 && (
          <div style={{
            display: 'flex', gap: 30, position: 'absolute', top: '15%', left: '50%',
            transform: 'translateX(-50%)',
          }}>
            {FEATURE_CARDS.map((card, i) => {
              const isFocused = i === cardFocusIndex;
              const cardDelay = i * 15;
              const s = spring({ frame: Math.max(0, frame - cardDelay), fps, config: SPRING.ui, durationInFrames: 20 });
              const z = isFocused ? 60 : 0;
              const blur = isFocused ? 0 : 3;
              const scale = isFocused ? 1.05 : 0.95;

              return (
                <div key={i} style={{
                  width: 280, padding: '24px 22px', borderRadius: 24,
                  background: 'rgba(24,24,27,0.7)',
                  backdropFilter: 'blur(40px)',
                  border: `1px solid ${isFocused ? card.color + '40' : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: `0 30px 80px rgba(0,0,0,0.5)${isFocused ? `, 0 0 40px ${card.color}15` : ''}`,
                  direction: 'rtl',
                  opacity: s,
                  transform: `translateY(${interpolate(s, [0, 1], [30, 0])}px) translateZ(${z}px) scale(${scale})`,
                  filter: `blur(${blur}px)`,
                  transition: 'filter 0.15s, transform 0.15s',
                }}>
                  <div style={{ fontFamily: HEEBO, fontSize: 22, fontWeight: 800, color: card.color, marginBottom: 8 }}>
                    {card.title}
                  </div>
                  <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 600, color: BRAND.muted, lineHeight: 1.6, marginBottom: 16 }}>
                    {card.desc}
                  </div>
                  {/* Mini UI inside card */}
                  <div style={{
                    padding: '10px 16px', borderRadius: 12,
                    background: `${card.color}10`, border: `1px solid ${card.color}20`,
                    fontFamily: RUBIK, fontSize: 20, fontWeight: 800, color: card.color,
                    textAlign: 'center',
                  }}>
                    {card.miniUI}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Kanban drag demo */}
        {frame >= 250 && frame < 340 && (
          <div style={{
            position: 'absolute', top: '25%', left: '50%',
            transform: 'translate(-50%, -50%)',
            opacity: demoSpring,
          }}>
            <DeviceFrame scale={1.1} delay={0}>
              <div style={{ width: '100%', height: '100%', background: '#0C0C0F', padding: '55px 12px 12px', direction: 'rtl' }}>
                <div style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 900, color: BRAND.white, marginBottom: 10 }}>
                  Kanban חכם
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['בטיפול', 'הצעה', 'סגירה'].map((col, ci) => (
                    <div key={ci} style={{
                      flex: 1, padding: '8px 6px', borderRadius: 12,
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                      minHeight: 120,
                    }}>
                      <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: BRAND.muted, marginBottom: 6, textAlign: 'center' }}>
                        {col}
                      </div>
                      {ci === 0 && (
                        <div style={{
                          padding: '8px', borderRadius: 8, background: `${SYS.accent}15`, border: `1px solid ${SYS.accent}25`,
                          fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: BRAND.white,
                          transform: `translateX(${interpolate(demoSpring, [0, 0.5, 1], [0, -60, -120])}px)`,
                        }}>
                          רונית כץ
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </DeviceFrame>
          </div>
        )}

        {/* Revenue prediction chart */}
        {frame >= 300 && frame < 420 && (
          <div style={{
            position: 'absolute', top: '20%', left: '50%',
            transform: 'translate(-50%, 0)',
            width: 700, opacity: chartSpring,
          }}>
            <div style={{ fontFamily: HEEBO, fontSize: 22, fontWeight: 900, color: BRAND.white, direction: 'rtl', marginBottom: 16 }}>
              חיזוי הכנסות — 30 ימים קדימה
            </div>
            {/* Chart SVG */}
            <svg width="700" height="200" viewBox="0 0 700 200">
              {/* Solid line (past) */}
              <path
                d="M 0 180 Q 100 160 200 130 T 400 80"
                fill="none"
                stroke={SYS.accent}
                strokeWidth={3}
                opacity={chartSpring}
                strokeDasharray={interpolate(chartSpring, [0, 1], [500, 0])}
              />
              {/* Prediction line (future) — semi-transparent */}
              <path
                d="M 400 80 Q 500 50 600 40 T 700 30"
                fill="none"
                stroke={SYS.accent}
                strokeWidth={2}
                opacity={chartSpring * 0.4}
                strokeDasharray="8 4"
              />
              {/* Bloom dot at prediction */}
              <circle cx="700" cy="30" r={6 * chartSpring} fill={SYS.accent} opacity={0.8}>
              </circle>
            </svg>
            {/* Amount slot roll */}
            <div style={{
              textAlign: 'left', marginTop: 12,
              ...brushedMetal(48),
              filter: `blur(${chartSlot.motionBlur}px)`,
            }}>
              ₪{chartSlot.display}
            </div>
            <div style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 700, color: BRAND.muted, direction: 'rtl' }}>
              לא ניחוש. מתמטיקה.
            </div>
          </div>
        )}
      </VirtualCamera>

      {/* Final pull-back text */}
      {frame >= 380 && (
        <div style={{
          position: 'absolute', bottom: 160,
          ...brushedMetal(36, { fontFamily: HEEBO, letterSpacing: 0 }),
          fontFamily: HEEBO, fontSize: 36, fontWeight: 900,
          color: BRAND.white, direction: 'rtl',
          opacity: finalSpring,
          transform: `translateY(${interpolate(finalSpring, [0, 1], [15, 0])}px)`,
          textShadow: '0 4px 20px rgba(0,0,0,0.6)',
        }}>
          מערכת מכירות שלמה. בתוך טלפון אחד.
        </div>
      )}

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 5: PROOF — Stats + quote [0:40–0:48]
// frames 0–240 (within Sequence)
// ═══════════════════════════════════════════════════════════
const STATS = [
  { value: '3X', label: 'יכולת סגירה', delay: 0 },
  { value: '4 דק׳', label: 'מליד לפעולה', delay: 12 },
  { value: '0', label: 'לידים שנופלים בין הכיסאות', delay: 24 },
];

const ProofScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Quote
  const quoteSpring = spring({ frame: Math.max(0, frame - 130), fps, config: SPRING.hero, durationInFrames: 22 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${SYS.accent}05 0%, transparent 60%)` }} />

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
                boxShadow: `0 20px 60px rgba(0,0,0,0.4)${isFocused ? `, 0 0 30px ${SYS.accent}10` : ''}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                direction: 'rtl',
                opacity: s,
                transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px)`,
                filter: isFocused ? 'none' : 'blur(1px)',
              }}>
                <span style={{ fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: BRAND.muted }}>
                  {stat.label}
                </span>
                <span style={{
                  ...brushedMetal(60),
                  filter: `blur(${slot.motionBlur}px)`,
                  transform: `scale(${interpolate(s, [0, 1], [1.2, 1])})`,
                  display: 'inline-block',
                }}>
                  {slot.display}
                </span>
              </div>
            );
          })}
        </div>
      </VirtualCamera>

      {/* Quote + silhouette */}
      {frame >= 130 && (
        <div style={{
          position: 'absolute', bottom: 120, maxWidth: 750,
          padding: '24px 32px', borderRadius: 24,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          direction: 'rtl', opacity: quoteSpring,
          transform: `translateY(${interpolate(quoteSpring, [0, 1], [15, 0])}px)`,
          display: 'flex', alignItems: 'center', gap: 20,
        }}>
          {/* Metal silhouette */}
          <svg width="50" height="70" viewBox="0 0 50 70" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
            <circle cx="25" cy="16" r="12" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
            <path d="M5 65 C5 45 15 35 25 35 C35 35 45 45 45 65" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
          </svg>
          <div>
            <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 700, color: BRAND.white, lineHeight: 1.6 }}>
              "קיצרנו את זמן הטיפול בליד מ-3 ימים ל-3 שעות. ה-AI עושה את העבודה."
            </div>
            <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 600, color: BRAND.muted, marginTop: 8 }}>
              — סוכן ביטוח
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
// frames 0–150 (within Sequence)
// ═══════════════════════════════════════════════════════════
const BADGES = [
  { text: 'לוח עברי — גבייה לפני ערב חג', delay: 0 },
  { text: 'שומר שבת — שקט מוחלט', delay: 15 },
  { text: 'טביעת אצבע — כניסה אחת ואתה בפנים', delay: 30 },
];

const IdentityScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title
  const titleSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(135deg, ${BRAND.bgDark} 0%, ${SYS.accent}08 50%, ${BRAND.bgDark} 100%)`,
      justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
    }}>
      {/* Title — brushed metal */}
      <div style={{
        ...brushedMetal(52, { fontFamily: HEEBO, letterSpacing: 0 }),
        fontFamily: HEEBO, fontSize: 44, fontWeight: 900,
        direction: 'rtl', marginBottom: 40,
        opacity: titleSpring,
        transform: `translateY(${interpolate(titleSpring, [0, 1], [20, 0])}px)`,
      }}>
        מכירות בשפה שלך.
      </div>

      {/* 3 frosted badges */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        {BADGES.map((badge, i) => {
          const s = spring({ frame: Math.max(0, frame - badge.delay - 20), fps, config: SPRING.ui, durationInFrames: 18 });
          // Rack focus simulation: one badge in focus at a time
          const focusBadge = Math.min(2, Math.floor((frame - 20) / 40));
          const isFocused = i === focusBadge;
          return (
            <div key={i} style={{
              padding: '18px 32px', borderRadius: 20,
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(30px)',
              border: `1px solid rgba(255,255,255,${isFocused ? '0.15' : '0.06'})`,
              boxShadow: `0 15px 40px rgba(0,0,0,0.3)${isFocused ? `, 0 0 20px ${SYS.accent}10` : ''}`,
              direction: 'rtl',
              fontFamily: HEEBO, fontSize: 20, fontWeight: 700,
              color: isFocused ? BRAND.white : BRAND.muted,
              opacity: s,
              transform: `translateY(${interpolate(s, [0, 1], [15, 0])}px) scale(${isFocused ? 1.02 : 0.98})`,
              filter: isFocused ? 'none' : 'blur(1px)',
              transition: 'filter 0.15s',
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
// SCENE 7: TAGLINE [0:53–0:57] frames 0–120
// ═══════════════════════════════════════════════════════════
const TaglineScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{
      background: BRAND.gradient,
      justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
      opacity: bgOpacity,
    }}>
      <TextReveal
        text="אף ליד לא נופל. אתה סוגר."
        delay={5} fontSize={60} fontWeight={900} color="#fff"
        mode="words" stagger={3}
        style={{ textAlign: 'center' }}
      />

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPOSITION — A1 System Video
// ═══════════════════════════════════════════════════════════
export const SystemVideoV2: React.FC = () => {
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
        <CTAEndcard variant="dark" accentColor={SYS.accent} tagline="אף ליד לא נופל. אתה סוגר." />
      </Sequence>
    </AbsoluteFill>
  );
};
