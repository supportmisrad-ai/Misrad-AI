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

const FIN = MODULE_COLORS.finance;

// ─── Script-accurate timing (A4-FINANCE-SCRIPT.md) ─────────
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

const brushedEmerald = (fontSize: number, extra?: React.CSSProperties): React.CSSProperties => ({
  fontFamily: RUBIK, fontSize, fontWeight: 800,
  background: 'linear-gradient(160deg, #6EE7B7 0%, #059669 30%, #A7F3D0 50%, #047857 75%, #34D399 100%)',
  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  letterSpacing: -2, textShadow: '0 2px 20px rgba(5,150,105,0.3)', ...extra,
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
// SCENE 1: HOOK — "החשבונית שנעלמה" [0:00–0:03]
// Invoice disintegration + "₪23,400 נעלמו"
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Invoice card visible f0–35, disintegration starts f10
  const cardOpacity = interpolate(frame, [0, 5, 25, 40], [0, 1, 0.6, 0], { extrapolateRight: 'clamp' });
  const cardScale = interpolate(frame, [0, 5], [1.5, 1.3], { extrapolateRight: 'clamp' });
  const particles = useDisintegration(frame, 10, 38, 45);

  // "₪23,400" — brushed emerald at f45
  const amountSpring = spring({ frame: Math.max(0, frame - 45), fps, config: { damping: 14, stiffness: 160, mass: 1 }, durationInFrames: 20 });
  const amountBlur = interpolate(amountSpring, [0, 1], [12, 0]);
  const amountScale = interpolate(amountSpring, [0, 1], [1.15, 1]);

  // "נעלמו" — deep red at f55
  const lostSpring = spring({ frame: Math.max(0, frame - 55), fps, config: SPRING.ui, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: `radial-gradient(circle, ${FIN.accent}06 0%, transparent 60%)` }} />

      <VirtualCamera zoom={1.4} rotateY={-3} dofBlur={7}>
        {/* Invoice card — disintegrating */}
        {frame < 45 && (
          <div style={{
            position: 'absolute', top: '28%', left: '50%',
            transform: `translate(-50%, -50%) scale(${cardScale})`, opacity: cardOpacity,
          }}>
            <div style={{
              width: 380, padding: '20px 24px', borderRadius: 18,
              background: 'rgba(24,24,27,0.75)', backdropFilter: 'blur(40px)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 30px ${FIN.accent}10`,
              direction: 'rtl',
            }}>
              <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: BRAND.muted }}>חשבונית #1247</div>
              <div style={{ fontFamily: RUBIK, fontSize: 28, fontWeight: 800, color: BRAND.white, marginTop: 4 }}>₪23,400</div>
              <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: BRAND.muted, marginTop: 4 }}>באיחור 47 ימים</div>
              <div style={{
                marginTop: 10, padding: '5px 12px', borderRadius: 8,
                background: '#EF444420', border: '1px solid #EF444440',
                fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: '#EF4444',
                display: 'inline-block', boxShadow: '0 0 12px rgba(239,68,68,0.25)',
              }}>
                לא שולם
              </div>
            </div>
          </div>
        )}

        {/* Disintegration particles — red tinted */}
        {particles.map((p, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: `calc(28% + ${p.y}px)`, left: `calc(50% + ${p.x}px)`,
            width: p.size, height: p.size, borderRadius: 2,
            background: i % 3 === 0 ? '#EF4444' : 'rgba(255,255,255,0.2)',
            opacity: p.opacity, boxShadow: i % 3 === 0 ? '0 0 8px rgba(239,68,68,0.4)' : 'none',
            pointerEvents: 'none',
          }} />
        ))}
      </VirtualCamera>

      {/* "₪23,400" — brushed emerald */}
      {frame >= 45 && (
        <div style={{
          position: 'absolute', top: '35%',
          ...brushedEmerald(120),
          opacity: amountSpring, transform: `scale(${amountScale})`,
          filter: `blur(${amountBlur}px)`,
        }}>
          ₪23,400
        </div>
      )}

      {/* "נעלמו" — deep red */}
      {frame >= 55 && (
        <div style={{
          position: 'absolute', top: '55%',
          fontFamily: HEEBO, fontSize: 42, fontWeight: 900, color: '#DC2626',
          opacity: lostSpring, direction: 'rtl',
          transform: `translateY(${interpolate(lostSpring, [0, 1], [10, 0])}px)`,
          textShadow: '0 2px 15px rgba(220,38,38,0.3)',
        }}>
          נעלמו.
        </div>
      )}

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 2: PROBLEM — "עיוורון כספי" [0:03–0:12]
// Rack focus through invoice rows, disintegration in bokeh
// ═══════════════════════════════════════════════════════════
const INVOICE_ROWS = [
  { text: 'באיחור 30 יום · ₪8,200', badge: 'לא נשלח', isOverdue: true },
  { text: 'שולם חלקית · ₪3,700/₪12,000', badge: '9 חודשים', isOverdue: true },
  { text: 'טיוטה · ₪5,500', badge: 'לא נשלח 3 חודשים', isOverdue: false },
  { text: 'ממתין · ₪14,000', badge: 'תזכורת ראשונה', isOverdue: false },
];

const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Rack focus: 25 frames per shift
  const focusIndex = frame < 90 ? 0 : frame < 115 ? 1 : frame < 140 ? 2 : 3;

  // Disintegration on exiting rows
  const particles0 = useDisintegration(frame, 90, 125, 20);
  const particles1 = useDisintegration(frame, 115, 150, 20);

  const pullBack = interpolate(frame, [180, 270], [1.15, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const overlayOpacity = interpolate(frame, [180, 210], [0, 0.35], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const painSpring = spring({ frame: Math.max(0, frame - 210), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <VirtualCamera zoom={pullBack} rotateY={-3} dofBlur={9}>
        <DeviceFrame scale={1.15} delay={0}>
          <div style={{ width: '100%', height: '100%', background: '#0C0C0F', padding: '55px 14px 14px', direction: 'rtl' }}>
            <div style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 900, color: BRAND.white, marginBottom: 8 }}>
              חשבוניות
            </div>

            {INVOICE_ROWS.map((row, i) => {
              const isFocused = i === focusIndex;
              const entrySpring = spring({ frame: Math.max(0, frame - i * 4), fps, config: SPRING.ui, durationInFrames: 12 });
              const wasFocused = i < focusIndex;
              const fadeOut = wasFocused ? interpolate(frame, [90 + i * 25, 90 + i * 25 + 30], [1, 0.2], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;

              return (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 12px', marginBottom: 7, borderRadius: 12,
                  background: isFocused ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.015)',
                  border: `1px solid ${isFocused ? (row.isOverdue ? 'rgba(239,68,68,0.25)' : 'rgba(5,150,105,0.15)') : 'rgba(255,255,255,0.04)'}`,
                  boxShadow: isFocused ? '0 4px 16px rgba(0,0,0,0.3)' : 'none',
                  opacity: entrySpring * fadeOut,
                  filter: isFocused ? 'none' : `blur(${wasFocused ? 2 : 1.5}px)`,
                  transform: `translateX(${interpolate(entrySpring, [0, 1], [20, 0])}px)`,
                }}>
                  <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: isFocused ? BRAND.white : '#64748B' }}>
                    {row.text}
                  </div>
                  <div style={{
                    padding: '4px 10px', borderRadius: 8,
                    background: row.isOverdue ? '#EF444420' : '#F59E0B15',
                    border: `1px solid ${row.isOverdue ? '#EF444440' : '#F59E0B30'}`,
                    fontFamily: HEEBO, fontSize: 10, fontWeight: 700,
                    color: row.isOverdue ? '#EF4444' : '#F59E0B',
                    boxShadow: isFocused && row.isOverdue ? '0 0 10px rgba(239,68,68,0.3)' : 'none',
                  }}>
                    {row.badge}
                  </div>
                </div>
              );
            })}
          </div>
        </DeviceFrame>

        {/* Disintegration particles */}
        {[particles0, particles1].map((pts, pi) =>
          pts.map((p, i) => (
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

      {/* Frosted red overlay */}
      {frame >= 180 && (
        <AbsoluteFill style={{
          background: `linear-gradient(180deg, rgba(239,68,68,${overlayOpacity * 0.12}) 0%, transparent 60%)`,
          backdropFilter: `blur(${overlayOpacity * 3}px)`,
          pointerEvents: 'none',
        }} />
      )}

      {/* Pain text */}
      {frame >= 210 && (
        <div style={{
          position: 'absolute', bottom: 130,
          fontFamily: HEEBO, fontSize: 28, fontWeight: 900, color: BRAND.white,
          direction: 'rtl', opacity: painSpring,
          transform: `translateY(${interpolate(painSpring, [0, 1], [15, 0])}px)`,
          textShadow: '0 4px 20px rgba(0,0,0,0.6)',
        }}>
          בלי תמונה כספית — אתה לא מנהל כסף. אתה מפסיד אותו.
        </div>
      )}

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 3: SOLUTION — "Finance" [0:12–0:25]
// Glass shatter → title → invoices → WA send → cash flow
// ═══════════════════════════════════════════════════════════
const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: Glass shatter + "Finance" title (f0–60)
  const shatterProgress = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const titleSpring = spring({ frame: Math.max(0, frame - 10), fps, config: SPRING.hero, durationInFrames: 20 });

  // Phase 2: Invoice UI with statuses (f60–150)
  const phoneSpring = spring({ frame: Math.max(0, frame - 60), fps, config: SPRING.hero, durationInFrames: 22 });
  const paidSlot = useSlotRoll(frame, fps, '47,200', 90, 22);
  const pendingSlot = useSlotRoll(frame, fps, '23,400', 95, 22);

  // Phase 3: WhatsApp send demo (f150–210)
  const waClickFrame = 160;
  const waClickScale = frame >= waClickFrame && frame < waClickFrame + 6 ? 0.97 : 1;
  const waIconSpring = spring({ frame: Math.max(0, frame - waClickFrame - 5), fps, config: SPRING.punch, durationInFrames: 16 });
  const waBezierX = interpolate(waIconSpring, [0, 0.4, 1], [0, 80, 300]);
  const waBezierY = interpolate(waIconSpring, [0, 0.4, 1], [0, -50, -120]);
  const waBadgeSpring = spring({ frame: Math.max(0, frame - waClickFrame - 18), fps, config: SPRING.ui, durationInFrames: 14 });

  // Phase 4: Cash flow dashboard (f210–330)
  const dashSpring = spring({ frame: Math.max(0, frame - 220), fps, config: SPRING.ui, durationInFrames: 20 });
  const profitSlot = useSlotRoll(frame, fps, '127', 260, 22);

  // Phase 5: Pullback + text (f330–390)
  const fullSpring = spring({ frame: Math.max(0, frame - 340), fps, config: SPRING.hero, durationInFrames: 22 });

  // Light sweep
  const sweepX = interpolate(frame, [0, 25], [-200, 1200], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      {/* Light sweep */}
      <div style={{
        position: 'absolute', width: 120, height: '100%',
        background: `linear-gradient(90deg, transparent, ${FIN.accent}10, transparent)`,
        transform: `translateX(${sweepX}px)`, pointerEvents: 'none', zIndex: 10,
      }} />

      {/* Glass shards — emerald tinted */}
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
            background: `${FIN.accent}40`,
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(5,150,105,0.15)',
            borderRadius: 2, opacity: 1 - shatterProgress,
            transform: `rotate(${seed % 200}deg)`, pointerEvents: 'none',
          }} />
        );
      })}

      {/* "Finance" — brushed emerald title */}
      {frame >= 10 && frame < 80 && (
        <div style={{
          position: 'absolute', top: '22%',
          ...brushedEmerald(120),
          opacity: titleSpring * (frame < 60 ? 1 : interpolate(frame, [60, 80], [1, 0], { extrapolateRight: 'clamp' })),
          transform: `scale(${interpolate(titleSpring, [0, 1], [1.1, 1])})`,
          filter: `blur(${interpolate(titleSpring, [0, 1], [8, 0])}px)`,
        }}>
          Finance
        </div>
      )}

      {frame >= 18 && frame < 80 && (
        <div style={{
          position: 'absolute', top: '36%',
          fontFamily: HEEBO, fontSize: 26, fontWeight: 700, color: BRAND.muted, direction: 'rtl',
          opacity: spring({ frame: Math.max(0, frame - 18), fps, config: SPRING.ui, durationInFrames: 15 })
            * (frame < 60 ? 1 : interpolate(frame, [60, 80], [1, 0], { extrapolateRight: 'clamp' })),
        }}>
          שליטה כספית. אף שקל לא נעלם.
        </div>
      )}

      {/* Phase 2: Invoice UI */}
      {frame >= 60 && frame < 220 && (
        <VirtualCamera zoom={1.1} rotateY={2} dofBlur={5}>
          <div style={{ opacity: phoneSpring, transform: `translateY(${interpolate(phoneSpring, [0, 1], [40, 0])}px)` }}>
            <DeviceFrame scale={1.15} delay={0}>
              <div style={{ width: '100%', height: '100%', background: '#0C0C0F', padding: '55px 14px 14px', direction: 'rtl' }}>
                <div style={{ fontFamily: HEEBO, fontSize: 15, fontWeight: 900, color: BRAND.white, marginBottom: 8 }}>
                  חשבוניות
                </div>

                {/* Invoice rows with status badges */}
                {[
                  { name: 'חברת אלון', amount: '₪12,400', status: 'שולם', statusColor: '#22C55E' },
                  { name: 'סטודיו ליאור', amount: '₪8,200', status: 'ממתין', statusColor: '#F59E0B' },
                  { name: 'נדל"ן כהן', amount: '₪28,000', status: 'שולם', statusColor: '#22C55E' },
                ].map((inv, i) => {
                  const s = spring({ frame: Math.max(0, frame - 75 - i * 8), fps, config: SPRING.ui, durationInFrames: 12 });
                  return (
                    <div key={i} style={{
                      padding: '10px 12px', marginBottom: 5, borderRadius: 10,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                      opacity: s, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: BRAND.white }}>{inv.name}</div>
                        <div style={{ fontFamily: RUBIK, fontSize: 11, fontWeight: 700, color: BRAND.muted }}>{inv.amount}</div>
                      </div>
                      <div style={{
                        padding: '3px 8px', borderRadius: 6,
                        background: `${inv.statusColor}15`, border: `1px solid ${inv.statusColor}25`,
                        fontFamily: HEEBO, fontSize: 9, fontWeight: 700, color: inv.statusColor,
                        display: 'flex', alignItems: 'center', gap: 3,
                      }}>
                        {inv.status === 'שולם' && <IconCheck size={8} color={inv.statusColor} />}
                        {inv.status}
                      </div>
                    </div>
                  );
                })}

                {/* Summary row with slot rolls */}
                {frame >= 90 && (
                  <div style={{
                    marginTop: 8, padding: '10px 12px', borderRadius: 10,
                    background: `${FIN.accent}08`, border: `1px solid ${FIN.accent}15`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontFamily: HEEBO, fontSize: 10, fontWeight: 700, color: '#22C55E' }}>
                        שולם: ₪<span style={{ filter: `blur(${paidSlot.motionBlur * 0.5}px)` }}>{paidSlot.display}</span>
                      </div>
                      <div style={{ fontFamily: HEEBO, fontSize: 10, fontWeight: 700, color: '#F59E0B', marginTop: 2 }}>
                        ממתין: ₪<span style={{ filter: `blur(${pendingSlot.motionBlur * 0.5}px)` }}>{pendingSlot.display}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* WhatsApp send button */}
                {frame >= 150 && frame < 200 && (
                  <div style={{ marginTop: 8, position: 'relative' }}>
                    <div style={{
                      padding: '8px 14px', borderRadius: 10, textAlign: 'center',
                      background: '#25D366', cursor: 'pointer',
                      fontFamily: HEEBO, fontSize: 11, fontWeight: 800, color: '#fff',
                      transform: `scale(${waClickScale})`,
                    }}>
                      שלח בוואטסאפ
                    </div>

                    {/* Flying WA icon */}
                    {frame >= waClickFrame + 5 && (
                      <div style={{
                        position: 'absolute', top: -5, right: 20,
                        width: 22, height: 22, borderRadius: 6,
                        background: 'rgba(37,211,102,0.15)', backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(37,211,102,0.3)',
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        fontFamily: RUBIK, fontSize: 10, fontWeight: 800, color: '#25D366',
                        transform: `translate(${waBezierX}px, ${waBezierY}px)`,
                        opacity: 1 - waIconSpring * 0.3,
                      }}>
                        WA
                      </div>
                    )}

                    {/* Sent badge */}
                    {frame >= waClickFrame + 18 && (
                      <div style={{
                        position: 'absolute', top: -30, right: -10,
                        padding: '4px 10px', borderRadius: 8,
                        background: '#22C55E15', border: '1px solid #22C55E30',
                        fontFamily: HEEBO, fontSize: 9, fontWeight: 700, color: '#22C55E',
                        opacity: waBadgeSpring, display: 'flex', alignItems: 'center', gap: 3,
                        boxShadow: '0 0 10px rgba(34,197,94,0.2)',
                      }}>
                        <IconCheck size={8} color="#22C55E" />
                        נשלח ללקוח
                      </div>
                    )}
                  </div>
                )}
              </div>
            </DeviceFrame>
          </div>
        </VirtualCamera>
      )}

      {/* Phase 4: Cash flow dashboard */}
      {frame >= 220 && frame < 340 && (
        <VirtualCamera zoom={1.08} dofBlur={4}>
          <div style={{
            width: 700, padding: '28px 32px', borderRadius: 24,
            background: 'rgba(24,24,27,0.7)', backdropFilter: 'blur(40px)',
            border: `1px solid ${FIN.accent}15`,
            boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 30px ${FIN.accent}08`,
            direction: 'rtl', opacity: dashSpring,
            transform: `translateY(${interpolate(dashSpring, [0, 1], [30, 0])}px)`,
          }}>
            <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 800, color: FIN.accent, marginBottom: 14 }}>
              תזרים מזומנים
            </div>

            {/* Line chart */}
            <svg width="100%" height="80" viewBox="0 0 600 80">
              {/* Revenue line (emerald) */}
              {(() => {
                const pts = [10, 25, 18, 35, 30, 50, 45, 60, 55, 70];
                const vis = Math.floor(dashSpring * pts.length);
                const d = pts.slice(0, vis + 1).map((y, i) => `${i === 0 ? 'M' : 'L'} ${i * 65} ${80 - y}`).join(' ');
                return <path d={d} fill="none" stroke={FIN.accent} strokeWidth="2.5" strokeLinecap="round" />;
              })()}
              {/* Expense line (red) */}
              {(() => {
                const pts = [8, 15, 20, 12, 18, 25, 22, 30, 28, 35];
                const vis = Math.floor(dashSpring * pts.length);
                const d = pts.slice(0, vis + 1).map((y, i) => `${i === 0 ? 'M' : 'L'} ${i * 65} ${80 - y}`).join(' ');
                return <path d={d} fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 3" />;
              })()}
              {/* Prediction line (dashed, bloom) */}
              {dashSpring > 0.8 && (
                <path d="M 585 10 L 600 5" fill="none" stroke={FIN.accent} strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" opacity="0.5" />
              )}
            </svg>

            {/* Profit prediction */}
            {frame >= 260 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <span style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: BRAND.muted }}>רווח צפוי</span>
                <span style={{
                  ...brushedEmerald(36),
                  filter: `blur(${profitSlot.motionBlur}px)`,
                }}>
                  ₪{profitSlot.display}K
                </span>
              </div>
            )}
          </div>
        </VirtualCamera>
      )}

      {/* Phase 5: Full text */}
      {frame >= 340 && (
        <div style={{
          position: 'absolute', bottom: 150,
          fontFamily: HEEBO, fontSize: 32, fontWeight: 900, color: BRAND.white,
          direction: 'rtl', opacity: fullSpring,
          transform: `translateY(${interpolate(fullSpring, [0, 1], [15, 0])}px)`,
          textShadow: '0 4px 20px rgba(0,0,0,0.6)',
        }}>
          תמונה כספית. שקל-שקל. במקום אחד.
        </div>
      )}

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 4: SHOWCASE — Cards + Pie chart + Cross-module
// [0:25–0:40] frames 0–450
// ═══════════════════════════════════════════════════════════
const SHOWCASE_CARDS = [
  { title: 'חשבוניות מהירות', desc: '30 שניות מיצירה לשליחה', color: FIN.accent },
  { title: 'מעקב תשלומים', desc: 'מי שילם, מי לא, מתי', color: '#F59E0B' },
  { title: 'ניהול הוצאות', desc: 'לחיצה אחת, לא קבלה אחת', color: '#0EA5E9' },
];

const PIE_SEGMENTS = [
  { label: 'חומרים', pct: 40, color: FIN.accent },
  { label: 'שכר', pct: 30, color: '#F59E0B' },
  { label: 'שיווק', pct: 20, color: '#8B5CF6' },
  { label: 'אחר', pct: 10, color: '#64748B' },
];

const ShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Cards phase (f0–140)
  const cardFocusIndex = Math.min(2, Math.floor(frame / 40));
  const cameraX = interpolate(frame, [0, 50, 100], [30, 0, -20], { extrapolateRight: 'clamp' });

  // Pie chart (f140–220)
  const pieSpring = spring({ frame: Math.max(0, frame - 140), fps, config: SPRING.hero, durationInFrames: 20 });

  // Cross-module Operations→Finance (f240–340)
  const crossSpring = spring({ frame: Math.max(0, frame - 240), fps, config: SPRING.hero, durationInFrames: 20 });
  const serviceMorph = interpolate(frame, [270, 290], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const invoiceAppear = spring({ frame: Math.max(0, frame - 290), fps, config: SPRING.punch, durationInFrames: 16 });

  // Pullback + text (f360–450)
  const finalSpring = spring({ frame: Math.max(0, frame - 370), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <VirtualCamera panX={cameraX} dofBlur={6} zoom={1.05}>
        {/* Feature cards */}
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
                  width: 220, padding: '22px 18px', borderRadius: 20,
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
                </div>
              );
            })}
          </div>
        )}

        {/* Pie chart — segments materialize */}
        {frame >= 140 && frame < 250 && (
          <div style={{
            position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
            opacity: pieSpring,
          }}>
            <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 800, color: BRAND.white, direction: 'rtl', marginBottom: 16, textAlign: 'center' }}>
              התפלגות הוצאות
            </div>
            <div style={{ position: 'relative', width: 180, height: 180, margin: '0 auto' }}>
              <svg width="180" height="180" viewBox="0 0 180 180">
                {(() => {
                  let cumAngle = -90;
                  return PIE_SEGMENTS.map((seg, i) => {
                    const segSpring = spring({ frame: Math.max(0, frame - 150 - i * 8), fps, config: SPRING.ui, durationInFrames: 14 });
                    const sweepAngle = (seg.pct / 100) * 360 * segSpring;
                    const startRad = (cumAngle * Math.PI) / 180;
                    const endRad = ((cumAngle + sweepAngle) * Math.PI) / 180;
                    const r = 80;
                    const x1 = 90 + r * Math.cos(startRad);
                    const y1 = 90 + r * Math.sin(startRad);
                    const x2 = 90 + r * Math.cos(endRad);
                    const y2 = 90 + r * Math.sin(endRad);
                    const largeArc = sweepAngle > 180 ? 1 : 0;
                    const d = `M 90 90 L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
                    cumAngle += (seg.pct / 100) * 360;
                    return (
                      <path key={i} d={d} fill={seg.color} fillOpacity={0.7} stroke={BRAND.bgDark} strokeWidth="2" />
                    );
                  });
                })()}
              </svg>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 12 }}>
              {PIE_SEGMENTS.map((seg, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: seg.color }} />
                  <span style={{ fontFamily: HEEBO, fontSize: 10, fontWeight: 700, color: BRAND.muted }}>{seg.label} {seg.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cross-module: Operations → Finance */}
        {frame >= 240 && frame < 370 && (
          <div style={{
            position: 'absolute', top: '35%', left: '50%', transform: 'translate(-50%, -50%)',
            display: 'flex', gap: 30, alignItems: 'center',
            opacity: crossSpring,
          }}>
            {/* Operations badge */}
            <div style={{
              padding: '14px 20px', borderRadius: 16,
              background: 'rgba(24,24,27,0.65)', backdropFilter: 'blur(40px)',
              border: '1px solid rgba(255,255,255,0.08)',
              opacity: 1 - serviceMorph * 0.4,
              transform: `scale(${1 - serviceMorph * 0.15})`,
            }}>
              <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 800, color: '#F59E0B', direction: 'rtl' }}>Operations</div>
              <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: BRAND.white, marginTop: 4, direction: 'rtl' }}>קריאת שירות #892 נסגרה</div>
            </div>

            {/* Light refraction path */}
            <div style={{
              width: 60, height: 3, borderRadius: 2,
              background: `linear-gradient(90deg, #F59E0B60, ${FIN.accent}60)`,
              opacity: serviceMorph,
              boxShadow: `0 0 12px ${FIN.accent}20`,
            }} />

            {/* Finance invoice badge */}
            <div style={{
              padding: '14px 20px', borderRadius: 16,
              background: `${FIN.accent}08`, backdropFilter: 'blur(40px)',
              border: `1px solid ${FIN.accent}20`,
              opacity: invoiceAppear,
              transform: `scale(${interpolate(invoiceAppear, [0, 1], [0.8, 1])})`,
              boxShadow: `0 0 20px ${FIN.accent}10`,
            }}>
              <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 800, color: FIN.accent, direction: 'rtl' }}>Finance</div>
              <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: BRAND.white, marginTop: 4, direction: 'rtl' }}>חשבונית ₪450 נוצרה</div>
              <div style={{
                marginTop: 6, display: 'flex', alignItems: 'center', gap: 4,
                fontFamily: HEEBO, fontSize: 9, fontWeight: 700, color: '#22C55E',
              }}>
                <IconCheck size={8} color="#22C55E" />
                נשלחה ללקוח
              </div>
            </div>
          </div>
        )}
      </VirtualCamera>

      {/* Final text */}
      {frame >= 370 && (
        <div style={{
          position: 'absolute', bottom: 150,
          ...brushedEmerald(36, { fontFamily: HEEBO, letterSpacing: 0 }),
          fontFamily: HEEBO, fontSize: 34, fontWeight: 900,
          direction: 'rtl', opacity: finalSpring,
          transform: `translateY(${interpolate(finalSpring, [0, 1], [15, 0])}px)`,
        }}>
          כסף שזורם. שקוף. נקי.
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
  { value: '30', prefix: '', suffix: ' שניות', label: 'מיצירה לשליחה', delay: 0 },
  { value: '0', prefix: '', suffix: '', label: 'חשבוניות שנפלו בין הכיסאות', delay: 12 },
  { value: '', prefix: '', suffix: '', label: 'חשבונית כחוק — לפי רשות המסים', delay: 24, isText: true },
];

const ProofScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const quoteSpring = spring({ frame: Math.max(0, frame - 130), fps, config: SPRING.hero, durationInFrames: 22 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${FIN.accent}05 0%, transparent 60%)` }} />

      <VirtualCamera zoom={1.05} dofBlur={4}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center' }}>
          {STATS.map((stat, i) => {
            const s = spring({ frame: Math.max(0, frame - stat.delay), fps, config: SPRING.punch, durationInFrames: 20 });
            const slot = stat.value ? useSlotRoll(frame, fps, stat.value, stat.delay, 20) : null;
            const isFocused = Math.floor(frame / 40) % 3 === i;
            return (
              <div key={i} style={{
                width: 700, padding: '28px 36px', borderRadius: 24,
                background: 'rgba(24,24,27,0.65)', backdropFilter: 'blur(40px)',
                border: `1px solid rgba(255,255,255,${isFocused ? '0.14' : '0.06'})`,
                boxShadow: `0 20px 60px rgba(0,0,0,0.4)${isFocused ? `, 0 0 30px ${FIN.accent}10` : ''}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl',
                opacity: s, transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px)`,
                filter: isFocused ? 'none' : 'blur(1px)',
              }}>
                <span style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 700, color: BRAND.muted }}>{stat.label}</span>
                {slot ? (
                  <span style={{
                    ...brushedEmerald(56),
                    filter: `blur(${slot.motionBlur}px)`,
                    transform: `scale(${interpolate(s, [0, 1], [1.2, 1])})`, display: 'inline-block',
                  }}>
                    {stat.prefix}{slot.display}{stat.suffix}
                  </span>
                ) : (
                  <IconCheck size={28} color={FIN.accent} />
                )}
              </div>
            );
          })}
        </div>
      </VirtualCamera>

      {/* Quote + emerald silhouette */}
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
            <circle cx="25" cy="16" r="12" stroke={FIN.accent} strokeWidth="1.5" />
            <path d="M5 65 C5 45 15 35 25 35 C35 35 45 45 45 65" stroke={FIN.accent} strokeWidth="1.5" />
          </svg>
          <div>
            <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 700, color: BRAND.white, lineHeight: 1.6 }}>
              "סגירת חודש לקחה 4 ימים. עכשיו — 4 דקות. Finance עושה הכל."
            </div>
            <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 600, color: BRAND.muted, marginTop: 8 }}>
              — בעל עסק, חברת שירותים
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
  { text: 'חשבוניות כחוק — רשות המסים', delay: 0, isGold: false },
  { text: 'גבייה לפני ערב חג — אוטומטי', delay: 15, isGold: false },
  { text: 'שומר שבת — אפס עסקאות בשבת', delay: 30, isGold: false },
  { text: 'Finance במתנה עם חבילת תפעול', delay: 45, isGold: true },
];

const IdentityScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(135deg, ${BRAND.bgDark} 0%, ${FIN.accent}08 50%, ${BRAND.bgDark} 100%)`,
      justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
    }}>
      <div style={{
        ...brushedEmerald(48, { fontFamily: HEEBO, letterSpacing: 0 }),
        fontFamily: HEEBO, fontSize: 42, fontWeight: 900,
        direction: 'rtl', marginBottom: 40,
        opacity: titleSpring,
        transform: `translateY(${interpolate(titleSpring, [0, 1], [20, 0])}px)`,
      }}>
        כספים בשפה שלך.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
        {BADGES.map((badge, i) => {
          const s = spring({ frame: Math.max(0, frame - badge.delay - 15), fps, config: SPRING.ui, durationInFrames: 18 });
          const focusBadge = Math.min(3, Math.floor((frame - 15) / 30));
          const isFocused = i === focusBadge;
          return (
            <div key={i} style={{
              padding: '16px 28px', borderRadius: 20,
              background: badge.isGold ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(30px)',
              border: `1px solid ${badge.isGold ? '#F59E0B40' : `rgba(255,255,255,${isFocused ? '0.15' : '0.06'})`}`,
              boxShadow: badge.isGold
                ? '0 0 20px rgba(245,158,11,0.15), 0 15px 40px rgba(0,0,0,0.3)'
                : `0 15px 40px rgba(0,0,0,0.3)${isFocused ? `, 0 0 20px ${FIN.accent}10` : ''}`,
              direction: 'rtl', fontFamily: HEEBO, fontSize: 18, fontWeight: 700,
              color: badge.isGold ? '#F59E0B' : (isFocused ? BRAND.white : BRAND.muted),
              opacity: s,
              transform: `translateY(${interpolate(s, [0, 1], [15, 0])}px) scale(${isFocused ? 1.02 : 0.98})`,
              filter: isFocused || badge.isGold ? 'none' : 'blur(1px)',
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
      background: FIN.gradient,
      justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
      opacity: bgOpacity,
    }}>
      <TextReveal
        text="אף שקל לא נעלם. אתה שולט."
        delay={5} fontSize={52} fontWeight={900} color="#fff"
        mode="words" stagger={3}
        style={{ textAlign: 'center' }}
      />

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPOSITION — A4 Finance Video
// ═══════════════════════════════════════════════════════════
export const FinanceVideoV2: React.FC = () => {
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
        <CTAEndcard variant="dark" accentColor={FIN.accent} tagline="אף שקל לא נעלם. אתה שולט." />
      </Sequence>
    </AbsoluteFill>
  );
};
