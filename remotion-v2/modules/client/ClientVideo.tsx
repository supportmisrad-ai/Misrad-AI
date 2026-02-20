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

const CLN = MODULE_COLORS.client;

// ─── Script-accurate timing (A5-CLIENT-SCRIPT.md) ─────────
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

const brushedGold = (fontSize: number, extra?: React.CSSProperties): React.CSSProperties => ({
  fontFamily: RUBIK, fontSize, fontWeight: 800,
  background: 'linear-gradient(160deg, #F5D38E 0%, #C5A572 25%, #E8D5A8 50%, #A8884A 75%, #D4B87A 100%)',
  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  letterSpacing: -2, textShadow: '0 2px 20px rgba(197,165,114,0.3)', ...extra,
});

const warmBg: React.CSSProperties = {
  background: 'linear-gradient(145deg, #FAF8F5 0%, #F5F0E8 40%, #EDE6D8 100%)',
};

// ═══════════════════════════════════════════════════════════
// SCENE 1: HOOK — "Health Score שמתמוטט" [0:00–0:03]
// Gauge 92→23 macro, slot roll, color morph green→red
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Health Score drops from 92 to 23 over frames 5–40
  const dropProgress = spring({ frame: Math.max(0, frame - 5), fps, config: { damping: 18, stiffness: 120, mass: 1 }, durationInFrames: 35 });
  const currentScore = Math.round(92 - (92 - 23) * dropProgress);
  const circumference = 2 * Math.PI * 80;
  const ringProgress = currentScore / 100;

  // Color morph green → red
  const greenR = 34, greenG = 197, greenB = 94;
  const redR = 239, redG = 68, redB = 68;
  const r = Math.round(greenR + (redR - greenR) * dropProgress);
  const g = Math.round(greenG + (redG - greenG) * dropProgress);
  const b = Math.round(greenB + (redB - greenB) * dropProgress);
  const gaugeColor = `rgb(${r},${g},${b})`;

  // Slot roll for the number display
  const slot = useSlotRoll(frame, fps, '23', 5, 35);

  // Name + warning appear at f45
  const nameSpring = spring({ frame: Math.max(0, frame - 45), fps, config: SPRING.ui, durationInFrames: 18 });
  const warnSpring = spring({ frame: Math.max(0, frame - 60), fps, config: SPRING.ui, durationInFrames: 16 });

  return (
    <AbsoluteFill style={{ ...warmBg, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      {/* Warm vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 50%, rgba(139,115,70,0.08) 100%)',
        pointerEvents: 'none',
      }} />

      <VirtualCamera zoom={1.4} rotateY={-2} dofBlur={7}>
        {/* Frosted glass circular gauge */}
        <div style={{
          position: 'relative', width: 200, height: 200,
          background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(30px)',
          borderRadius: '50%', border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: `0 15px 50px rgba(0,0,0,0.08), 0 0 30px ${gaugeColor}15`,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
        }}>
          <svg width="200" height="200" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
            <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="10" />
            <circle cx="100" cy="100" r="80" fill="none" stroke={gaugeColor} strokeWidth="10"
              strokeDasharray={`${ringProgress * circumference} ${circumference}`}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 8px ${gaugeColor})` }}
            />
          </svg>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: RUBIK, fontSize: 52, fontWeight: 800, color: gaugeColor,
              filter: `blur(${slot.motionBlur * 0.6}px)`,
            }}>
              {dropProgress < 0.95 ? slot.display : '23'}%
            </div>
            <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: '#64748B' }}>
              Health Score
            </div>
          </div>
        </div>
      </VirtualCamera>

      {/* Name + warning below gauge */}
      {frame >= 45 && (
        <div style={{
          position: 'absolute', top: '60%', textAlign: 'center', direction: 'rtl',
          opacity: nameSpring, transform: `translateY(${interpolate(nameSpring, [0, 1], [10, 0])}px)`,
        }}>
          <div style={{ fontFamily: HEEBO, fontSize: 22, fontWeight: 800, color: '#1E293B' }}>
            שרה כהן · 90 ימים בלי קשר
          </div>
        </div>
      )}

      {frame >= 60 && (
        <div style={{
          position: 'absolute', top: '68%', textAlign: 'center',
          fontFamily: HEEBO, fontSize: 26, fontWeight: 900, color: '#DC2626',
          direction: 'rtl', opacity: warnSpring,
          textShadow: '0 2px 12px rgba(220,38,38,0.2)',
        }}>
          היא כבר חצי בחוץ.
        </div>
      )}

      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 2: PROBLEM — "לקוחות שנעלמים" [0:03–0:12]
// Rack focus through client rows with fading gauges
// ═══════════════════════════════════════════════════════════
const CLIENT_ROWS = [
  { name: 'שרה כהן', days: '90 ימים', score: 23, color: '#EF4444' },
  { name: 'דנה לוי', days: '60 ימים', score: 41, color: '#F59E0B' },
  { name: 'משה אברהם', days: '45 ימים', score: 52, color: '#F59E0B' },
  { name: 'רחל ביטון', days: '14 ימים', score: 78, color: '#22C55E' },
];

const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Rack focus shifts ~30 frames each
  const focusIndex = frame < 90 ? 0 : frame < 120 ? 1 : frame < 150 ? 2 : 3;

  const pullBack = interpolate(frame, [180, 270], [1.15, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const overlayOpacity = interpolate(frame, [180, 210], [0, 0.25], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const painSpring = spring({ frame: Math.max(0, frame - 215), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ ...warmBg, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      {/* Warm vignette */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 50%, rgba(139,115,70,0.06) 100%)', pointerEvents: 'none' }} />

      <VirtualCamera zoom={pullBack} rotateY={-2} dofBlur={8}>
        <DeviceFrame scale={1.15} delay={0}>
          <div style={{ width: '100%', height: '100%', background: '#FAFBFC', padding: '55px 14px 14px', direction: 'rtl' }}>
            <div style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 900, color: '#1E293B', marginBottom: 8 }}>
              הלקוחות שלי
            </div>

            {CLIENT_ROWS.map((row, i) => {
              const isFocused = i === focusIndex;
              const entrySpring = spring({ frame: Math.max(0, frame - i * 5), fps, config: SPRING.ui, durationInFrames: 12 });
              const wasFocused = i < focusIndex;
              const fadeOut = wasFocused ? interpolate(frame, [90 + i * 30, 90 + i * 30 + 30], [1, 0.25], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;
              const miniCirc = 2 * Math.PI * 10;

              return (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 12px', marginBottom: 7, borderRadius: 12,
                  background: isFocused ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.01)',
                  border: `1px solid ${isFocused ? row.color + '20' : 'rgba(0,0,0,0.04)'}`,
                  boxShadow: isFocused ? `0 4px 16px rgba(0,0,0,0.05), 0 0 12px ${row.color}08` : 'none',
                  opacity: entrySpring * fadeOut,
                  filter: isFocused ? 'none' : `blur(${wasFocused ? 1.5 : 1}px)`,
                  transform: `translateX(${interpolate(entrySpring, [0, 1], [20, 0])}px)`,
                }}>
                  <div>
                    <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: isFocused ? '#1E293B' : '#94A3B8' }}>
                      {row.name}
                    </div>
                    <div style={{ fontFamily: HEEBO, fontSize: 10, fontWeight: 600, color: '#94A3B8' }}>
                      קשר אחרון: {row.days}
                    </div>
                  </div>
                  {/* Mini gauge */}
                  <div style={{ position: 'relative', width: 28, height: 28 }}>
                    <svg width="28" height="28" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="14" cy="14" r="10" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="3" />
                      <circle cx="14" cy="14" r="10" fill="none" stroke={row.color} strokeWidth="3"
                        strokeDasharray={`${(row.score / 100) * miniCirc * fadeOut} ${miniCirc}`}
                        strokeLinecap="round"
                        style={{ opacity: fadeOut }}
                      />
                    </svg>
                    <span style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', justifyContent: 'center', alignItems: 'center',
                      fontFamily: RUBIK, fontSize: 7, fontWeight: 800, color: row.color,
                      opacity: fadeOut,
                    }}>
                      {row.score}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </DeviceFrame>
      </VirtualCamera>

      {/* Warm frosted overlay */}
      {frame >= 180 && (
        <AbsoluteFill style={{
          background: `linear-gradient(180deg, rgba(197,165,114,${overlayOpacity * 0.08}) 0%, transparent 60%)`,
          backdropFilter: `blur(${overlayOpacity * 2}px)`,
          pointerEvents: 'none',
        }} />
      )}

      {/* Pain text — brushed gold */}
      {frame >= 215 && (
        <div style={{
          position: 'absolute', bottom: 120, maxWidth: 700, textAlign: 'center',
          ...brushedGold(26, { fontFamily: HEEBO, letterSpacing: 0 }),
          fontFamily: HEEBO, fontSize: 24, fontWeight: 900,
          direction: 'rtl', opacity: painSpring,
          transform: `translateY(${interpolate(painSpring, [0, 1], [15, 0])}px)`,
        }}>
          לקוח שנוטש — הכנסה שנגמרת. ותמיד יותר קשה להחזיר מלשמור.
        </div>
      )}

      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 3: SOLUTION — "Client" [0:12–0:25]
// Glass shatter gold → title → Health Score recovery 23→92
// → AI insight → Health Score dashboard → Client portal
// ═══════════════════════════════════════════════════════════
const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: Glass shatter + "Client" title (f0–60)
  const shatterProgress = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const titleSpring = spring({ frame: Math.max(0, frame - 10), fps, config: SPRING.hero, durationInFrames: 20 });

  // Phase 2: Client file — Health Score recovery (f60–150)
  const fileSpring = spring({ frame: Math.max(0, frame - 60), fps, config: SPRING.hero, durationInFrames: 22 });
  const recoverySlot = useSlotRoll(frame, fps, '92', 80, 25);
  const recoveryProgress = spring({ frame: Math.max(0, frame - 80), fps, config: { damping: 18, stiffness: 100, mass: 1 }, durationInFrames: 25 });
  const recoveryScore = Math.round(23 + (92 - 23) * recoveryProgress);
  // Color morph red → green
  const rR = Math.round(239 + (34 - 239) * recoveryProgress);
  const rG = Math.round(68 + (197 - 68) * recoveryProgress);
  const rB = Math.round(68 + (94 - 68) * recoveryProgress);
  const recColor = `rgb(${rR},${rG},${rB})`;

  // Phase 3: AI Insight card (f150–210)
  const aiSpring = spring({ frame: Math.max(0, frame - 155), fps, config: SPRING.ui, durationInFrames: 18 });
  const aiClickScale = frame >= 190 && frame < 196 ? 0.97 : 1;
  const aiBadgeSpring = spring({ frame: Math.max(0, frame - 196), fps, config: SPRING.punch, durationInFrames: 14 });

  // Phase 4: Dashboard (f240–330)
  const dashSpring = spring({ frame: Math.max(0, frame - 245), fps, config: SPRING.hero, durationInFrames: 20 });

  // Phase 5: Portal card (f330–390)
  const portalSpring = spring({ frame: Math.max(0, frame - 340), fps, config: SPRING.ui, durationInFrames: 18 });

  // Light sweep
  const sweepX = interpolate(frame, [0, 25], [-200, 1200], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ ...warmBg, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      {/* Warm vignette */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 50%, rgba(139,115,70,0.06) 100%)', pointerEvents: 'none' }} />

      {/* Light sweep */}
      <div style={{
        position: 'absolute', width: 100, height: '100%',
        background: `linear-gradient(90deg, transparent, ${CLN.accent}08, transparent)`,
        transform: `translateX(${sweepX}px)`, pointerEvents: 'none', zIndex: 10,
      }} />

      {/* Glass shards — gold tinted */}
      {frame < 40 && Array.from({ length: 12 }).map((_, i) => {
        const seed = i * 47;
        const angle = (seed % 360) * (Math.PI / 180);
        const dist = shatterProgress * (60 + seed % 80);
        return (
          <div key={i} style={{
            position: 'absolute',
            left: `calc(50% + ${Math.cos(angle) * dist}px)`,
            top: `calc(40% + ${Math.sin(angle) * dist}px)`,
            width: 10 + seed % 14, height: 4 + seed % 6,
            background: `${CLN.accent}40`,
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(197,165,114,0.15)',
            borderRadius: 2, opacity: 1 - shatterProgress,
            transform: `rotate(${seed % 180}deg)`, pointerEvents: 'none',
          }} />
        );
      })}

      {/* "Client" — brushed gold title */}
      {frame >= 10 && frame < 75 && (
        <div style={{
          position: 'absolute', top: '22%',
          ...brushedGold(120),
          opacity: titleSpring * (frame < 55 ? 1 : interpolate(frame, [55, 75], [1, 0], { extrapolateRight: 'clamp' })),
          transform: `scale(${interpolate(titleSpring, [0, 1], [1.1, 1])})`,
          filter: `blur(${interpolate(titleSpring, [0, 1], [8, 0])}px)`,
        }}>
          Client
        </div>
      )}

      {frame >= 18 && frame < 75 && (
        <div style={{
          position: 'absolute', top: '36%',
          fontFamily: HEEBO, fontSize: 24, fontWeight: 700, color: '#64748B', direction: 'rtl',
          opacity: spring({ frame: Math.max(0, frame - 18), fps, config: SPRING.ui, durationInFrames: 15 })
            * (frame < 55 ? 1 : interpolate(frame, [55, 75], [1, 0], { extrapolateRight: 'clamp' })),
        }}>
          כל לקוח. כל רגע. אף אחד לא נעלם.
        </div>
      )}

      {/* Phase 2: Client file with Health Score recovery */}
      {frame >= 60 && frame < 240 && (
        <VirtualCamera zoom={1.1} rotateY={2} dofBlur={5}>
          <div style={{ opacity: fileSpring, transform: `translateY(${interpolate(fileSpring, [0, 1], [40, 0])}px)` }}>
            <DeviceFrame scale={1.15} delay={0}>
              <div style={{ width: '100%', height: '100%', background: '#FAFBFC', padding: '55px 14px 14px', direction: 'rtl' }}>
                <div style={{ fontFamily: HEEBO, fontSize: 15, fontWeight: 900, color: '#1E293B', marginBottom: 4 }}>
                  תיק לקוח: שרה כהן
                </div>

                {/* Health Score gauge — recovering */}
                <div style={{
                  padding: 14, marginBottom: 10, borderRadius: 14,
                  background: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                  border: `1px solid ${recColor}15`,
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{ position: 'relative', width: 44, height: 44 }}>
                    <svg width="44" height="44" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="4" />
                      <circle cx="22" cy="22" r="18" fill="none" stroke={recColor} strokeWidth="4"
                        strokeDasharray={`${(recoveryScore / 100) * 2 * Math.PI * 18} ${2 * Math.PI * 18}`}
                        strokeLinecap="round"
                        style={{ filter: `drop-shadow(0 0 4px ${recColor})` }}
                      />
                    </svg>
                    <span style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', justifyContent: 'center', alignItems: 'center',
                      fontFamily: RUBIK, fontSize: 12, fontWeight: 800, color: recColor,
                      filter: `blur(${recoverySlot.motionBlur * 0.3}px)`,
                    }}>
                      {recoveryProgress > 0.9 ? '92' : recoverySlot.display}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 800, color: recColor }}>
                      Health Score
                    </div>
                    <div style={{ fontFamily: HEEBO, fontSize: 10, fontWeight: 600, color: '#94A3B8' }}>
                      {recoveryProgress > 0.7 ? 'בריא — פעילה' : 'בסיכון — 90 ימים'}
                    </div>
                  </div>
                </div>

                {/* Timeline events */}
                {[
                  { label: 'פגישה', time: 'לפני 3 ימים', delay: 95 },
                  { label: 'הודעה', time: 'לפני 5 ימים', delay: 103 },
                  { label: 'תשלום', time: 'לפני 7 ימים', delay: 111 },
                  { label: 'הערה', time: 'לפני 10 ימים', delay: 119 },
                ].map((ev, i) => {
                  const evSpring = spring({ frame: Math.max(0, frame - ev.delay), fps, config: SPRING.ui, durationInFrames: 14 });
                  return (
                    <div key={i} style={{
                      padding: '7px 10px', marginBottom: 4, borderRadius: 8,
                      background: 'rgba(0,0,0,0.015)', border: '1px solid rgba(0,0,0,0.04)',
                      opacity: evSpring, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      filter: `blur(${interpolate(evSpring, [0, 1], [3, 0])}px)`,
                    }}>
                      <span style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: '#1E293B' }}>{ev.label}</span>
                      <span style={{ fontFamily: HEEBO, fontSize: 9, fontWeight: 600, color: '#94A3B8' }}>{ev.time}</span>
                    </div>
                  );
                })}

                {/* AI Insight card */}
                {frame >= 155 && (
                  <div style={{
                    marginTop: 8, padding: '10px 12px', borderRadius: 12,
                    background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)',
                    border: `1px solid ${CLN.accent}20`,
                    boxShadow: `0 4px 16px rgba(0,0,0,0.04), 0 0 12px ${CLN.accent}08`,
                    opacity: aiSpring,
                  }}>
                    <div style={{ fontFamily: HEEBO, fontSize: 10, fontWeight: 800, color: CLN.accent, marginBottom: 4 }}>
                      AI Insight
                    </div>
                    <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: '#1E293B', lineHeight: 1.5 }}>
                      שרה לא הגיבה 7 ימים. שלח תזכורת אישית.
                    </div>

                    {/* Send button */}
                    <div style={{
                      marginTop: 6, padding: '5px 12px', borderRadius: 8, textAlign: 'center',
                      background: CLN.accent, cursor: 'pointer',
                      fontFamily: HEEBO, fontSize: 10, fontWeight: 800, color: '#fff',
                      transform: `scale(${aiClickScale})`,
                      display: 'inline-block',
                    }}>
                      שלח
                    </div>

                    {/* Sent badge */}
                    {frame >= 196 && (
                      <span style={{
                        marginRight: 8, padding: '3px 8px', borderRadius: 6,
                        background: '#22C55E15', border: '1px solid #22C55E25',
                        fontFamily: HEEBO, fontSize: 9, fontWeight: 700, color: '#22C55E',
                        opacity: aiBadgeSpring, display: 'inline-flex', alignItems: 'center', gap: 3,
                      }}>
                        <IconCheck size={7} color="#22C55E" />
                        נשלח
                      </span>
                    )}
                  </div>
                )}
              </div>
            </DeviceFrame>
          </div>
        </VirtualCamera>
      )}

      {/* Phase 4: Health Score dashboard */}
      {frame >= 240 && frame < 340 && (
        <VirtualCamera zoom={1.08} dofBlur={4}>
          <div style={{
            width: 700, padding: '24px 28px', borderRadius: 24,
            background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(40px)',
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: `0 20px 60px rgba(0,0,0,0.08), 0 0 25px ${CLN.accent}06`,
            direction: 'rtl', opacity: dashSpring,
            transform: `translateY(${interpolate(dashSpring, [0, 1], [30, 0])}px)`,
          }}>
            <div style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 800, color: CLN.accent, marginBottom: 12 }}>
              דשבורד לקוחות
            </div>

            {/* Sorted client list: green top → red bottom */}
            {[
              { name: 'רחל ביטון', score: 95, color: '#22C55E' },
              { name: 'שרה כהן', score: 92, color: '#22C55E' },
              { name: 'דנה לוי', score: 68, color: '#F59E0B' },
              { name: 'משה אברהם', score: 41, color: '#EF4444' },
            ].map((cl, i) => {
              const isFocused = i < 3;
              const s = spring({ frame: Math.max(0, frame - 255 - i * 8), fps, config: SPRING.ui, durationInFrames: 14 });
              const miniC = 2 * Math.PI * 8;
              return (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 10px', marginBottom: 5, borderRadius: 10,
                  background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.04)',
                  opacity: s, filter: isFocused ? 'none' : 'blur(1.5px)',
                }}>
                  <span style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: '#1E293B' }}>{cl.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="20" height="20" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="2" />
                      <circle cx="10" cy="10" r="8" fill="none" stroke={cl.color} strokeWidth="2"
                        strokeDasharray={`${(cl.score / 100) * miniC} ${miniC}`} strokeLinecap="round" />
                    </svg>
                    <span style={{ fontFamily: RUBIK, fontSize: 10, fontWeight: 800, color: cl.color }}>{cl.score}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </VirtualCamera>
      )}

      {/* Phase 5: Portal card */}
      {frame >= 340 && (
        <VirtualCamera zoom={1.05} dofBlur={5}>
          <div style={{
            width: 400, padding: '22px 24px', borderRadius: 20,
            background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(40px)',
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
            direction: 'rtl', opacity: portalSpring,
            transform: `translateY(${interpolate(portalSpring, [0, 1], [30, 0])}px)`,
          }}>
            <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 800, color: CLN.accent, marginBottom: 10 }}>
              פורטל לקוח
            </div>
            {[
              { label: 'הפגישה הבאה', value: 'יום ג\' 10:00' },
              { label: 'סטטוס', value: 'בטיפול' },
              { label: 'מסמכים', value: '3' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', padding: '6px 0',
                borderBottom: i < 2 ? '1px solid rgba(0,0,0,0.04)' : 'none',
              }}>
                <span style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>{item.label}</span>
                <span style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: '#1E293B' }}>{item.value}</span>
              </div>
            ))}
            <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: '#64748B', marginTop: 10 }}>
              הלקוח רואה. בלי לשאול.
            </div>
          </div>
        </VirtualCamera>
      )}

      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 4: SHOWCASE — Cards + Morph chain [0:25–0:40]
// ═══════════════════════════════════════════════════════════
const SHOWCASE_CARDS = [
  { title: 'תיק לקוח', desc: 'מההתחלה ועד היום', color: CLN.accent },
  { title: 'Health Score', desc: 'תמיד יודע מי בסכנה', color: '#22C55E' },
  { title: 'ניהול פגישות + יומן', desc: 'AI שמציע follow-up', color: '#7C3AED' },
];

const MORPH_STAGES = [
  { label: 'עוקב', color: '#8B5CF6' },
  { label: 'ליד', color: '#EF4444' },
  { label: 'לקוח', color: CLN.accent },
  { label: 'לקוח משומר', color: '#22C55E' },
];

const ShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Cards phase (f0–140)
  const cardFocusIndex = Math.min(2, Math.floor(frame / 40));
  const cameraX = interpolate(frame, [0, 50, 100], [20, 0, -15], { extrapolateRight: 'clamp' });

  // Calendar AI suggestion (f140–220)
  const calSpring = spring({ frame: Math.max(0, frame - 140), fps, config: SPRING.hero, durationInFrames: 20 });
  const aiSuggestSpring = spring({ frame: Math.max(0, frame - 170), fps, config: SPRING.ui, durationInFrames: 16 });

  // Morph chain (f240–360)
  const morphPhase = interpolate(frame, [240, 255, 270, 285, 300, 315, 330, 345], [0, 1, 1, 2, 2, 3, 3, 4], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const morphSpring = spring({ frame: Math.max(0, frame - 240), fps, config: SPRING.hero, durationInFrames: 20 });

  // Final text (f380–450)
  const finalSpring = spring({ frame: Math.max(0, frame - 385), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ ...warmBg, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      {/* Warm vignette */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 50%, rgba(139,115,70,0.06) 100%)', pointerEvents: 'none' }} />

      <VirtualCamera panX={cameraX} dofBlur={5} zoom={1.05}>
        {/* Feature cards in 3D */}
        {frame < 160 && (
          <div style={{
            position: 'absolute', top: '22%', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 16,
          }}>
            {SHOWCASE_CARDS.map((card, i) => {
              const isFocused = i === cardFocusIndex;
              const s = spring({ frame: Math.max(0, frame - i * 12), fps, config: SPRING.ui, durationInFrames: 16 });
              return (
                <div key={i} style={{
                  width: 210, padding: '22px 16px', borderRadius: 20,
                  background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(30px)',
                  border: `1px solid ${isFocused ? card.color + '25' : 'rgba(0,0,0,0.05)'}`,
                  boxShadow: `0 20px 60px rgba(0,0,0,0.06)${isFocused ? `, 0 0 20px ${card.color}08` : ''}`,
                  opacity: s, textAlign: 'center',
                  transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px) scale(${isFocused ? 1.05 : 0.95})`,
                  filter: isFocused ? 'none' : 'blur(2px)',
                }}>
                  <div style={{ fontFamily: HEEBO, fontSize: 17, fontWeight: 800, color: card.color, direction: 'rtl' }}>
                    {card.title}
                  </div>
                  <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 600, color: '#64748B', marginTop: 6, direction: 'rtl' }}>
                    {card.desc}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Calendar + AI suggestion */}
        {frame >= 140 && frame < 250 && (
          <div style={{
            position: 'absolute', top: '28%', left: '50%', transform: 'translate(-50%, -50%)',
            opacity: calSpring,
          }}>
            {/* Mini calendar */}
            <div style={{
              width: 280, padding: '16px 18px', borderRadius: 18,
              background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(30px)',
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 15px 50px rgba(0,0,0,0.06)',
              direction: 'rtl',
            }}>
              <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 800, color: '#1E293B', marginBottom: 10 }}>
                יומן פגישות
              </div>
              {['יום ב\' 09:00 — רחל ביטון', 'יום ג\' 14:00 — פנוי', 'יום ד\' 10:00 — דנה לוי'].map((ev, i) => (
                <div key={i} style={{
                  padding: '6px 8px', marginBottom: 4, borderRadius: 8,
                  background: i === 1 ? `${CLN.accent}08` : 'rgba(0,0,0,0.02)',
                  border: i === 1 ? `1px solid ${CLN.accent}15` : '1px solid rgba(0,0,0,0.03)',
                  fontFamily: HEEBO, fontSize: 10, fontWeight: 600, color: '#1E293B',
                }}>
                  {ev}
                </div>
              ))}
            </div>

            {/* AI suggestion */}
            {frame >= 170 && (
              <div style={{
                marginTop: 10, padding: '10px 14px', borderRadius: 14,
                background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)',
                border: `1px solid ${CLN.accent}15`,
                boxShadow: `0 4px 16px rgba(0,0,0,0.04), 0 0 10px ${CLN.accent}06`,
                direction: 'rtl', opacity: aiSuggestSpring,
              }}>
                <div style={{ fontFamily: HEEBO, fontSize: 10, fontWeight: 800, color: CLN.accent }}>
                  AI Suggestion
                </div>
                <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: '#1E293B', marginTop: 3 }}>
                  מומלץ: פגישת follow-up עם שרה ביום ד' 14:00
                </div>
              </div>
            )}
          </div>
        )}

        {/* Morph chain: follower → lead → client → retained */}
        {frame >= 240 && frame < 380 && (
          <div style={{
            position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
            display: 'flex', gap: 20, alignItems: 'center',
            opacity: morphSpring,
          }}>
            {MORPH_STAGES.map((stage, i) => {
              const stageActive = morphPhase >= i + 1;
              const stageTransitioning = morphPhase > i && morphPhase < i + 1;
              const stageOpacity = stageActive ? 1 : stageTransitioning ? interpolate(morphPhase, [i, i + 1], [0, 1]) : 0.15;
              return (
                <React.Fragment key={i}>
                  <div style={{
                    padding: '14px 20px', borderRadius: 16,
                    background: stageActive ? `${stage.color}10` : 'rgba(0,0,0,0.02)',
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${stageActive ? stage.color + '25' : 'rgba(0,0,0,0.06)'}`,
                    boxShadow: stageActive ? `0 0 20px ${stage.color}10` : 'none',
                    direction: 'rtl',
                    opacity: stageOpacity,
                    transform: `scale(${stageActive ? 1.05 : 0.9})`,
                    transition: 'none',
                  }}>
                    <div style={{
                      width: 12, height: 12, borderRadius: '50%',
                      background: stage.color, margin: '0 auto 6px',
                      boxShadow: stageActive ? `0 0 10px ${stage.color}40` : 'none',
                    }} />
                    <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 800, color: stageActive ? stage.color : '#94A3B8', textAlign: 'center' }}>
                      {stage.label}
                    </div>
                  </div>
                  {i < 3 && (
                    <div style={{
                      width: 30, height: 3, borderRadius: 2,
                      background: `linear-gradient(90deg, ${stage.color}40, ${MORPH_STAGES[i + 1].color}40)`,
                      opacity: stageActive ? 1 : 0.1,
                    }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </VirtualCamera>

      {/* Morph chain text */}
      {frame >= 280 && frame < 380 && (
        <div style={{
          position: 'absolute', bottom: 200,
          fontFamily: HEEBO, fontSize: 20, fontWeight: 700, color: '#64748B', direction: 'rtl',
          opacity: spring({ frame: Math.max(0, frame - 285), fps, config: SPRING.ui, durationInFrames: 18 }),
        }}>
          מעוקב. לליד. ללקוח. ולשימור. אף אחד לא נופל.
        </div>
      )}

      {/* Final text */}
      {frame >= 385 && (
        <div style={{
          position: 'absolute', bottom: 150,
          ...brushedGold(34, { fontFamily: HEEBO, letterSpacing: 0 }),
          fontFamily: HEEBO, fontSize: 32, fontWeight: 900,
          direction: 'rtl', opacity: finalSpring,
          transform: `translateY(${interpolate(finalSpring, [0, 1], [15, 0])}px)`,
        }}>
          כל לקוח. כל רגע. שום הפתעות.
        </div>
      )}

      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 5: PROOF — Stats + quote [0:40–0:48]
// ═══════════════════════════════════════════════════════════
const STATS = [
  { value: '70', suffix: '%', label: 'פחות נטישה', delay: 0 },
  { value: '4.8', suffix: 'X', label: 'ערך לקוח לאורך זמן', delay: 12 },
  { value: '0', suffix: '', label: 'לקוחות שנעלמו בלי שידעת', delay: 24 },
];

const ProofScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const quoteSpring = spring({ frame: Math.max(0, frame - 130), fps, config: SPRING.hero, durationInFrames: 22 });

  return (
    <AbsoluteFill style={{ ...warmBg, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 50%, rgba(139,115,70,0.06) 100%)', pointerEvents: 'none' }} />

      <VirtualCamera zoom={1.05} dofBlur={4}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center' }}>
          {STATS.map((stat, i) => {
            const s = spring({ frame: Math.max(0, frame - stat.delay), fps, config: SPRING.punch, durationInFrames: 20 });
            const slot = useSlotRoll(frame, fps, stat.value, stat.delay, 20);
            const isFocused = Math.floor(frame / 40) % 3 === i;
            return (
              <div key={i} style={{
                width: 700, padding: '28px 36px', borderRadius: 24,
                background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(30px)',
                border: `1px solid rgba(0,0,0,${isFocused ? '0.1' : '0.04'})`,
                boxShadow: `0 20px 60px rgba(0,0,0,0.06)${isFocused ? `, 0 0 20px ${CLN.accent}08` : ''}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl',
                opacity: s, transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px)`,
                filter: isFocused ? 'none' : 'blur(1px)',
              }}>
                <span style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 700, color: '#64748B' }}>{stat.label}</span>
                <span style={{
                  ...brushedGold(56),
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

      {/* Quote + gold silhouette */}
      {frame >= 130 && (
        <div style={{
          position: 'absolute', bottom: 110, maxWidth: 750,
          padding: '24px 32px', borderRadius: 24,
          background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0,0,0,0.06)',
          direction: 'rtl', opacity: quoteSpring,
          transform: `translateY(${interpolate(quoteSpring, [0, 1], [15, 0])}px)`,
          display: 'flex', alignItems: 'center', gap: 20,
        }}>
          <svg width="50" height="70" viewBox="0 0 50 70" fill="none" style={{ flexShrink: 0, opacity: 0.3 }}>
            <circle cx="25" cy="16" r="12" stroke={CLN.accent} strokeWidth="1.5" />
            <path d="M5 65 C5 45 15 35 25 35 C35 35 45 45 45 65" stroke={CLN.accent} strokeWidth="1.5" />
          </svg>
          <div>
            <div style={{ fontFamily: HEEBO, fontSize: 17, fontWeight: 700, color: '#1E293B', lineHeight: 1.6 }}>
              "הפסקתי לחפש בוואטסאפ מתי הפגישה האחרונה. פותחת Client — ותוך שנייה, תמונה מלאה."
            </div>
            <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: '#94A3B8', marginTop: 8 }}>
              — מאמנת אישית
            </div>
          </div>
        </div>
      )}

      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 6: IDENTITY — Hebrew DNA badges [0:48–0:53]
// ═══════════════════════════════════════════════════════════
const BADGES = [
  { text: 'לוח עברי — תזכורות לפני חגים', delay: 0 },
  { text: 'שומר שבת — אפס פניות בשבת', delay: 15 },
  { text: 'פורטל — הלקוח רואה, אתה לא מתקשר', delay: 30 },
];

const IdentityScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(135deg, #FAF8F5 0%, ${CLN.accent}06 50%, #FAF8F5 100%)`,
      justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 50%, rgba(139,115,70,0.06) 100%)', pointerEvents: 'none' }} />

      <div style={{
        ...brushedGold(48, { fontFamily: HEEBO, letterSpacing: 0 }),
        fontFamily: HEEBO, fontSize: 42, fontWeight: 900,
        direction: 'rtl', marginBottom: 40,
        opacity: titleSpring,
        transform: `translateY(${interpolate(titleSpring, [0, 1], [20, 0])}px)`,
      }}>
        לקוחות בשפה שלך.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
        {BADGES.map((badge, i) => {
          const s = spring({ frame: Math.max(0, frame - badge.delay - 15), fps, config: SPRING.ui, durationInFrames: 18 });
          const focusBadge = Math.min(2, Math.floor((frame - 15) / 35));
          const isFocused = i === focusBadge;
          return (
            <div key={i} style={{
              padding: '16px 28px', borderRadius: 20,
              background: 'rgba(255,255,255,0.55)',
              backdropFilter: 'blur(30px)',
              border: `1px solid rgba(0,0,0,${isFocused ? '0.1' : '0.04'})`,
              boxShadow: `0 15px 40px rgba(0,0,0,0.05)${isFocused ? `, 0 0 20px ${CLN.accent}08` : ''}`,
              direction: 'rtl', fontFamily: HEEBO, fontSize: 18, fontWeight: 700,
              color: isFocused ? '#1E293B' : '#94A3B8',
              opacity: s,
              transform: `translateY(${interpolate(s, [0, 1], [15, 0])}px) scale(${isFocused ? 1.02 : 0.98})`,
              filter: isFocused ? 'none' : 'blur(1px)',
            }}>
              {badge.text}
            </div>
          );
        })}
      </div>

      <NoiseLayer opacity={0.015} />
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
      background: CLN.gradient,
      justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
      opacity: bgOpacity,
    }}>
      <TextReveal
        text="כל לקוח. כל רגע. אף אחד לא נעלם."
        delay={5} fontSize={52} fontWeight={900} color="#fff"
        mode="words" stagger={3}
        style={{ textAlign: 'center' }}
      />

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPOSITION — A5 Client Video
// ═══════════════════════════════════════════════════════════
export const ClientVideoV2: React.FC = () => {
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
        <CTAEndcard variant="light" accentColor={CLN.accent} tagline="כל לקוח. כל רגע. אף אחד לא נעלם." />
      </Sequence>
    </AbsoluteFill>
  );
};
