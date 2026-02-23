import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from 'remotion';
import { BRAND, HEEBO, RUBIK, SPRING, MODULE_COLORS } from '../shared/config';
import { NoiseLayer, TextReveal, GlassCard, VirtualCamera } from '../shared/components';
import { Character } from './shared/Character';
import { L3_TIMING, WARM } from './shared/launch-config';

const T = L3_TIMING;

// ─── Helpers ────────────────────────────────────────────

const brushedMetal = (fontSize: number, color: 'warm' | 'gold' | 'brand' | 'emerald' = 'warm'): React.CSSProperties => {
  const gradients = {
    warm: 'linear-gradient(160deg, #F0EDE8 0%, #D8D0C4 30%, #E8E0D4 50%, #C8BFB2 75%, #DDD5C8 100%)',
    gold: 'linear-gradient(160deg, #EAD7A1 0%, #C5A572 30%, #D4B882 50%, #A88B4A 75%, #C5A572 100%)',
    brand: `linear-gradient(160deg, #E8A0B0 0%, #A21D3C 40%, #6366F1 70%, #3730A3 100%)`,
    emerald: 'linear-gradient(160deg, #6EE7B7 0%, #059669 30%, #34D399 50%, #047857 75%, #059669 100%)',
  };
  return {
    fontFamily: RUBIK,
    fontSize,
    fontWeight: 800,
    background: gradients[color],
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: -2,
    textShadow: '0 2px 20px rgba(0,0,0,0.4)',
  };
};

const useSlotRoll = (frame: number, fps: number, target: string, startFrame: number, rollDur = 20) => {
  const f = Math.max(0, frame - startFrame);
  const progress = spring({ frame: f, fps, config: { damping: 12, stiffness: 200, mass: 0.8 }, durationInFrames: rollDur });
  const locked = progress > 0.95;
  const display = locked ? target : target.replace(/[0-9]/g, () => String(Math.floor(Math.random() * 10)));
  const motionBlur = interpolate(progress, [0, 0.8, 1], [6, 2, 0]);
  return { display, progress, motionBlur, locked };
};

// Module step colors
const STEP_COLORS = {
  lead: '#A21D3C',   // rose
  call: '#A21D3C',
  quote: '#059669',  // emerald
  client: '#C5A572', // gold
  invoice: '#059669',
  paid: '#22C55E',   // green
} as const;

// ═══════════════════════════════════════════════════════════
// SCENE 1: HOOK — "ליד חדש" [0:00–0:05] frames 0–150
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phone already visible
  const phoneSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 12 });

  // Notification drop at frame 20
  const notifSpring = spring({ frame: Math.max(0, frame - 20), fps, config: SPRING.punch, durationInFrames: 12 });
  const notifOvershoot = interpolate(notifSpring, [0, 0.7, 1], [0, 1.08, 1]);

  // Camera dolly in: frame 60+
  const dollyZoom = interpolate(frame, [60, 150], [1, 1.3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // AI badge at frame 80
  const aiBadge = spring({ frame: Math.max(0, frame - 80), fps, config: SPRING.punch, durationInFrames: 12 });

  // Text at frame 90
  const textSpring = spring({ frame: Math.max(0, frame - 90), fps, config: SPRING.ui, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ backgroundColor: '#09090B', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <VirtualCamera zoom={dollyZoom}>
        {/* Phone */}
        <div style={{
          width: 220, height: 420, borderRadius: 28,
          background: '#18181B',
          border: '2px solid rgba(255,255,255,0.08)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          position: 'relative', overflow: 'hidden',
          opacity: phoneSpring,
          transform: `scale(${interpolate(phoneSpring, [0, 1], [0.9, 1])})`,
        }}>
          <div style={{ padding: 14, paddingTop: 44 }}>
            {/* Notification card */}
            <div style={{
              padding: '14px 16px', borderRadius: 16,
              background: `${STEP_COLORS.lead}15`,
              border: `1px solid ${STEP_COLORS.lead}30`,
              opacity: notifSpring,
              transform: `translateY(${interpolate(notifOvershoot, [0, 1], [-30, 0])}px)`,
            }}>
              <div style={{
                fontFamily: HEEBO, fontSize: 11, fontWeight: 600, color: BRAND.muted,
                direction: 'rtl', marginBottom: 6,
              }}>
                ליד חדש
              </div>
              <div style={{
                fontFamily: HEEBO, fontSize: 15, fontWeight: 800, color: BRAND.white,
                direction: 'rtl',
              }}>
                רונית כץ · ביטוח חיים
              </div>
              <div style={{
                fontFamily: HEEBO, fontSize: 11, fontWeight: 600, color: BRAND.muted,
                direction: 'rtl', marginTop: 4,
              }}>
                מקור: פייסבוק · היום
              </div>

              {/* AI badge */}
              <div style={{
                position: 'absolute', top: 50, left: 16,
                padding: '3px 10px', borderRadius: 8,
                background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
                fontFamily: HEEBO, fontSize: 10, fontWeight: 700, color: '#22C55E',
                opacity: aiBadge,
                transform: `scale(${interpolate(aiBadge, [0, 1], [0.6, 1])})`,
              }}>
                AI: ציון גבוה
              </div>
            </div>
          </div>
        </div>
      </VirtualCamera>

      {/* "ליד חדש. AI כבר דירג אותו." */}
      {frame >= 90 && (
        <div style={{
          position: 'absolute', bottom: '15%', textAlign: 'center',
          opacity: textSpring,
          transform: `translateY(${interpolate(textSpring, [0, 1], [15, 0])}px)`,
        }}>
          <TextReveal
            text="ליד חדש. AI כבר דירג אותו. מה עושים עכשיו?"
            delay={0} fontSize={24} fontWeight={700} color={BRAND.white}
            mode="words" stagger={2}
            style={{ justifyContent: 'center' }}
          />
        </div>
      )}

      {/* Character */}
      <Character
        pose="phoneHolding"
        expression="neutral"
        shirtColor="blue"
        delay={5}
        scale={1.5}
        style={{ position: 'absolute', bottom: '5%', right: '8%' }}
      />

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 2: STEP 1 — "שיחה" [0:05–0:15] frames 0–300
// ═══════════════════════════════════════════════════════════
const CallScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Call UI morph: frame 0–30
  const callMorph = spring({ frame, fps, config: SPRING.ui, durationInFrames: 20 });

  // Waveform active: frames 30–120
  const waveActive = frame >= 30 && frame < 120;

  // Timer
  const timerSec = Math.floor(Math.min(frame, 120) / 30 * 4);
  const timerDisplay = `${Math.floor(timerSec / 60)}:${String(timerSec % 60).padStart(2, '0')}`;

  // AI Summary: frame 130
  const summarySpring = spring({ frame: Math.max(0, frame - 130), fps, config: SPRING.smooth, durationInFrames: 25 });

  // Morph transition to quote: frame 220+
  const morphProgress = interpolate(frame, [220, 270], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const morphColor = `rgb(${interpolate(morphProgress, [0, 1], [162, 5])}, ${interpolate(morphProgress, [0, 1], [29, 150])}, ${interpolate(morphProgress, [0, 1], [60, 105])})`;

  return (
    <AbsoluteFill style={{ backgroundColor: '#09090B', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      {/* Call screen */}
      {frame < 220 && (
        <div style={{
          width: 380, borderRadius: 24,
          background: 'rgba(24,24,27,0.65)',
          backdropFilter: 'blur(24px)',
          border: `1px solid ${STEP_COLORS.call}25`,
          padding: 24, textAlign: 'center',
          opacity: callMorph,
          transform: `scale(${interpolate(callMorph, [0, 1], [0.85, 1])})`,
        }}>
          {/* Header */}
          <div style={{
            fontFamily: HEEBO, fontSize: 18, fontWeight: 800, color: BRAND.white,
            direction: 'rtl', marginBottom: 8,
          }}>
            שיחה עם רונית כץ
          </div>

          {/* Timer */}
          <div style={{
            fontFamily: RUBIK, fontSize: 28, fontWeight: 700, color: STEP_COLORS.call,
            marginBottom: 16,
          }}>
            {timerDisplay}
          </div>

          {/* Waveform */}
          <div style={{ display: 'flex', gap: 3, justifyContent: 'center', height: 50, alignItems: 'center' }}>
            {Array.from({ length: 20 }, (_, i) => {
              const baseHeight = waveActive
                ? 10 + Math.abs(Math.sin((frame * 0.15 + i * 0.8))) * 35
                : 5;
              return (
                <div key={i} style={{
                  width: 4, height: baseHeight, borderRadius: 2,
                  background: `linear-gradient(180deg, ${STEP_COLORS.call}, ${STEP_COLORS.call}60)`,
                  transition: 'height 0.05s',
                }} />
              );
            })}
          </div>

          {/* "מוקלטת" badge */}
          <div style={{
            marginTop: 12,
            fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: BRAND.muted,
          }}>
            🔴 מוקלטת
          </div>
        </div>
      )}

      {/* AI Summary card */}
      {frame >= 130 && frame < 220 && (
        <div style={{
          position: 'absolute', top: '62%', left: '50%',
          transform: `translateX(-50%) translateY(${interpolate(summarySpring, [0, 1], [20, 0])}px)`,
          opacity: summarySpring,
        }}>
          <GlassCard width={380} delay={0} glowColor="#8B5CF6">
            <div style={{ padding: '16px 20px', direction: 'rtl' }}>
              <div style={{
                fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: '#8B5CF6',
                marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <div style={{
                  padding: '2px 8px', borderRadius: 6,
                  background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
                  fontSize: 10,
                }}>
                  AI סיכם
                </div>
              </div>
              <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 600, color: BRAND.white, lineHeight: 1.6 }}>
                רונית מעוניינת בביטוח חיים, תקציב ₪800/חודש, רוצה הצעה עד יום רביעי.
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Morph transition card */}
      {frame >= 220 && (
        <div style={{
          width: 380, height: 120, borderRadius: interpolate(morphProgress, [0, 1], [24, 20]),
          background: `${morphColor}15`,
          border: `1px solid ${morphColor}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: `scale(${interpolate(morphProgress, [0, 0.5, 1], [1, 0.9, 1])})`,
        }}>
          <div style={{
            fontFamily: HEEBO, fontSize: 18, fontWeight: 800, color: BRAND.white,
            direction: 'rtl',
          }}>
            {morphProgress < 0.5 ? 'מהשיחה — להצעה.' : 'הצעת מחיר'}
          </div>
        </div>
      )}

      {/* Voiceover text */}
      {frame >= 10 && frame < 130 && (
        <div style={{ position: 'absolute', bottom: '10%' }}>
          <TextReveal
            text="מחייגים — מתוך הכרטיס. בלי לצאת. השיחה מוקלטת. AI מסכם."
            delay={0} fontSize={18} fontWeight={700} color={BRAND.muted}
            mode="words" stagger={2}
            style={{ justifyContent: 'center' }}
          />
        </div>
      )}

      {/* Character */}
      <Character
        pose="phoneHolding"
        expression="neutral"
        shirtColor="blue"
        delay={0}
        scale={1.3}
        style={{ position: 'absolute', bottom: '5%', right: '5%' }}
      />

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 3: STEP 2 — "הצעת מחיר" [0:15–0:25] frames 0–300
// ═══════════════════════════════════════════════════════════
const QuoteScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Quote card entrance
  const quoteSpring = spring({ frame, fps, config: SPRING.ui, durationInFrames: 20 });

  // WA send at frame 60
  const sendSpring = spring({ frame: Math.max(0, frame - 60), fps, config: SPRING.punch, durationInFrames: 15 });
  const bubbleFly = interpolate(frame, [70, 100], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Split view: frame 120+
  const splitSpring = spring({ frame: Math.max(0, frame - 120), fps, config: SPRING.smooth, durationInFrames: 25 });

  // Approval: frame 180
  const approvalSpring = spring({ frame: Math.max(0, frame - 180), fps, config: SPRING.punch, durationInFrames: 15 });

  // Morph to client: frame 230+
  const morphProgress = interpolate(frame, [230, 280], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#09090B', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      {/* Quote document */}
      {frame < 120 && (
        <div style={{
          width: 360, borderRadius: 20,
          background: `${STEP_COLORS.quote}10`,
          border: `1px solid ${STEP_COLORS.quote}25`,
          padding: 24, direction: 'rtl',
          opacity: quoteSpring,
          transform: `scale(${interpolate(quoteSpring, [0, 1], [0.85, 1])})`,
        }}>
          <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 600, color: BRAND.muted, marginBottom: 8 }}>
            הצעה מס' 1024
          </div>
          <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 800, color: BRAND.white, marginBottom: 4 }}>
            רונית כץ · ביטוח חיים
          </div>
          <div style={{ fontFamily: RUBIK, fontSize: 28, fontWeight: 800, color: STEP_COLORS.quote, marginBottom: 16 }}>
            ₪800/חודש
          </div>

          {/* Send button */}
          <div style={{
            padding: '12px 20px', borderRadius: 14, textAlign: 'center',
            background: frame >= 60
              ? `linear-gradient(135deg, ${STEP_COLORS.quote}, #047857)`
              : `${STEP_COLORS.quote}20`,
            border: `1px solid ${STEP_COLORS.quote}40`,
            fontFamily: HEEBO, fontSize: 14, fontWeight: 800, color: '#fff',
            transform: frame >= 60 ? 'scale(0.97)' : 'scale(1)',
            boxShadow: frame >= 60 ? `0 0 20px ${STEP_COLORS.quote}30` : 'none',
          }}>
            שלח בוואטסאפ
          </div>

          {/* "נשלח ✓" */}
          {frame >= 80 && (
            <div style={{
              marginTop: 10, textAlign: 'center',
              fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: '#22C55E',
              opacity: sendSpring,
            }}>
              נשלח ✓
            </div>
          )}
        </div>
      )}

      {/* WA bubble flying */}
      {frame >= 70 && frame < 120 && (
        <div style={{
          position: 'absolute',
          top: `${interpolate(bubbleFly, [0, 1], [40, 10])}%`,
          right: `${interpolate(bubbleFly, [0, 1], [30, 10])}%`,
          padding: '8px 14px', borderRadius: '14px 14px 4px 14px',
          background: '#25D366',
          fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: '#fff',
          opacity: interpolate(bubbleFly, [0, 0.8, 1], [1, 1, 0]),
          transform: `scale(${interpolate(bubbleFly, [0, 1], [1, 0.6])})`,
        }}>
          הצעת מחיר 📄
        </div>
      )}

      {/* Split view — your phone & Roni's phone */}
      {frame >= 120 && frame < 230 && (
        <div style={{
          display: 'flex', gap: 20, alignItems: 'center',
          opacity: splitSpring,
          transform: `translateY(${interpolate(splitSpring, [0, 1], [20, 0])}px)`,
        }}>
          {/* Your phone */}
          <div style={{
            width: 160, height: 280, borderRadius: 20,
            background: '#18181B', border: '1px solid rgba(255,255,255,0.08)',
            padding: 12, paddingTop: 30, position: 'relative',
          }}>
            <div style={{ fontFamily: HEEBO, fontSize: 10, fontWeight: 700, color: BRAND.muted, direction: 'rtl', marginBottom: 8 }}>
              הטלפון שלך
            </div>
            <div style={{
              padding: '8px 10px', borderRadius: 10,
              background: `${STEP_COLORS.quote}10`, border: `1px solid ${STEP_COLORS.quote}20`,
              fontFamily: HEEBO, fontSize: 10, fontWeight: 600, color: BRAND.white, direction: 'rtl',
            }}>
              הצעה: רונית · ₪800
            </div>

            {/* Approval badge on your side */}
            {frame >= 180 && (
              <div style={{
                position: 'absolute', bottom: 20, left: '50%',
                padding: '4px 12px', borderRadius: 8,
                background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
                fontFamily: HEEBO, fontSize: 10, fontWeight: 700, color: '#22C55E',
                opacity: approvalSpring,
                transform: `translateX(-50%) scale(${interpolate(approvalSpring, [0, 1], [0.6, 1])})`,
              }}>
                הלקוח אישר ✓
              </div>
            )}
          </div>

          {/* Roni's phone */}
          <div style={{
            width: 160, height: 280, borderRadius: 20,
            background: '#18181B', border: '1px solid rgba(255,255,255,0.08)',
            padding: 12, paddingTop: 30,
          }}>
            <div style={{ fontFamily: HEEBO, fontSize: 10, fontWeight: 700, color: BRAND.muted, direction: 'rtl', marginBottom: 8 }}>
              הטלפון של רונית
            </div>
            {/* WA chat bubble */}
            <div style={{
              padding: '8px 10px', borderRadius: '10px 10px 4px 10px',
              background: '#25D366', marginBottom: 8,
              fontFamily: HEEBO, fontSize: 10, fontWeight: 600, color: '#fff', direction: 'rtl',
            }}>
              הצעת מחיר מ-MISRAD AI
            </div>

            {/* Approval button */}
            {frame >= 170 && (
              <div style={{
                padding: '6px 12px', borderRadius: 8, textAlign: 'center',
                background: frame >= 180 ? '#22C55E' : 'rgba(255,255,255,0.08)',
                fontFamily: HEEBO, fontSize: 10, fontWeight: 700,
                color: frame >= 180 ? '#fff' : BRAND.muted,
                transform: frame >= 180 ? 'scale(0.97)' : 'scale(1)',
              }}>
                מאשרת ✓
              </div>
            )}
          </div>
        </div>
      )}

      {/* Morph transition */}
      {frame >= 230 && (
        <div style={{
          width: 360, height: 100, borderRadius: 20,
          background: `rgba(${interpolate(morphProgress, [0, 1], [5, 197])}, ${interpolate(morphProgress, [0, 1], [150, 165])}, ${interpolate(morphProgress, [0, 1], [105, 114])}, 0.1)`,
          border: `1px solid rgba(197,165,114,${interpolate(morphProgress, [0, 1], [0.15, 0.3])})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: `scale(${interpolate(morphProgress, [0, 0.5, 1], [1, 0.9, 1])})`,
        }}>
          <div style={{
            fontFamily: HEEBO, fontSize: 18, fontWeight: 800, color: BRAND.white,
            direction: 'rtl',
          }}>
            {morphProgress < 0.5 ? 'מהצעה — ללקוח.' : 'תיק לקוח'}
          </div>
        </div>
      )}

      {/* Voiceover text */}
      {frame >= 5 && frame < 60 && (
        <div style={{ position: 'absolute', bottom: '10%' }}>
          <TextReveal
            text="הצעת מחיר — בלחיצה. נשלחת בוואטסאפ."
            delay={0} fontSize={18} fontWeight={700} color={BRAND.muted}
            mode="words" stagger={2}
            style={{ justifyContent: 'center' }}
          />
        </div>
      )}

      {/* Character */}
      <Character
        pose="pointing"
        expression="confident"
        shirtColor="blue"
        delay={5}
        scale={1.3}
        style={{ position: 'absolute', bottom: '5%', right: '5%' }}
      />

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 4: STEP 3 — "ניהול לקוח" [0:25–0:35] frames 0–300
// ═══════════════════════════════════════════════════════════
const ClientScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sections = [
    { label: 'היסטוריית שיחות', color: STEP_COLORS.call },
    { label: 'מסמכים', color: STEP_COLORS.quote },
    { label: 'פגישות', color: STEP_COLORS.client },
    { label: 'חשבוניות', color: STEP_COLORS.invoice },
  ];

  // Client file entrance
  const fileSpring = spring({ frame, fps, config: SPRING.smooth, durationInFrames: 25 });

  // AI insight at frame 120
  const insightSpring = spring({ frame: Math.max(0, frame - 120), fps, config: SPRING.ui, durationInFrames: 20 });

  // Morph to invoice: frame 220+
  const morphProgress = interpolate(frame, [220, 270], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#09090B', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      {/* Client file card */}
      {frame < 220 && (
        <div style={{
          width: 400, borderRadius: 24,
          background: `${STEP_COLORS.client}08`,
          border: `1px solid ${STEP_COLORS.client}20`,
          padding: 24, direction: 'rtl',
          opacity: fileSpring,
          transform: `scale(${interpolate(fileSpring, [0, 1], [0.8, 1])})`,
        }}>
          <div style={{
            fontFamily: HEEBO, fontSize: 24, fontWeight: 800, color: BRAND.white,
            marginBottom: 16,
          }}>
            רונית כץ
          </div>

          {/* Sections */}
          {sections.map((sec, i) => {
            const secSpring = spring({
              frame: Math.max(0, frame - 15 - i * 8),
              fps, config: SPRING.ui, durationInFrames: 15,
            });

            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', marginBottom: 8, borderRadius: 12,
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${sec.color}15`,
                opacity: secSpring,
                transform: `translateX(${interpolate(secSpring, [0, 1], [20, 0])}px)`,
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: sec.color,
                  boxShadow: `0 0 8px ${sec.color}40`,
                }} />
                <span style={{ fontFamily: HEEBO, fontSize: 15, fontWeight: 600, color: BRAND.white }}>
                  {sec.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* AI insight */}
      {frame >= 120 && frame < 220 && (
        <div style={{
          position: 'absolute', top: '65%', left: '50%',
          transform: `translateX(-50%) translateY(${interpolate(insightSpring, [0, 1], [15, 0])}px)`,
          opacity: insightSpring,
        }}>
          <GlassCard width={380} delay={0} glowColor="#8B5CF6">
            <div style={{ padding: '14px 18px', direction: 'rtl' }}>
              <div style={{
                fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: '#8B5CF6',
                marginBottom: 6,
              }}>
                AI מזכיר
              </div>
              <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 600, color: BRAND.white }}>
                רונית — 45 ימים מהרכישה. שלח סיכום חודשי.
              </div>
              <div style={{
                marginTop: 10, padding: '6px 16px', borderRadius: 10,
                background: '#8B5CF620', border: '1px solid #8B5CF630',
                fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: '#8B5CF6',
                display: 'inline-block',
              }}>
                שלח →
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Morph to invoice */}
      {frame >= 220 && (
        <div style={{
          width: 360, height: 100, borderRadius: 20,
          background: `${STEP_COLORS.invoice}${interpolate(morphProgress, [0, 1], [0.05, 0.12]) * 255 | 0}`,
          border: `1px solid ${STEP_COLORS.invoice}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: `scale(${interpolate(morphProgress, [0, 0.5, 1], [1, 0.9, 1])})`,
        }}>
          <div style={{
            fontFamily: HEEBO, fontSize: 18, fontWeight: 800, color: BRAND.white,
            direction: 'rtl',
          }}>
            {morphProgress < 0.5 ? 'מהלקוח — לחשבונית.' : 'חשבונית'}
          </div>
        </div>
      )}

      {/* Character */}
      <Character
        pose="pointing"
        expression="confident"
        shirtColor="blue"
        delay={5}
        scale={1.3}
        style={{ position: 'absolute', bottom: '5%', right: '5%' }}
      />

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 5: STEP 4 — "חשבונית + שולם" [0:35–0:45] frames 0–300
// ═══════════════════════════════════════════════════════════
const InvoiceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Invoice entrance
  const invoiceSpring = spring({ frame, fps, config: SPRING.ui, durationInFrames: 20 });

  // Send at frame 60
  const sentBadge = spring({ frame: Math.max(0, frame - 80), fps, config: SPRING.punch, durationInFrames: 12 });

  // Payment at frame 120
  const paidSpring = spring({ frame: Math.max(0, frame - 120), fps, config: SPRING.punch, durationInFrames: 15 });
  const paidRoll = useSlotRoll(frame, fps, '₪800', 120, 20);

  // Journey path: frame 200+
  const journeySpring = spring({ frame: Math.max(0, frame - 200), fps, config: SPRING.smooth, durationInFrames: 30 });

  const journeySteps = [
    { label: 'ליד', color: STEP_COLORS.lead },
    { label: 'שיחה', color: STEP_COLORS.call },
    { label: 'הצעה', color: STEP_COLORS.quote },
    { label: 'לקוח', color: STEP_COLORS.client },
    { label: 'חשבונית', color: STEP_COLORS.invoice },
    { label: 'שולם', color: STEP_COLORS.paid },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: '#09090B', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      {/* Invoice card */}
      {frame < 200 && (
        <div style={{
          width: 380, borderRadius: 22,
          background: `${STEP_COLORS.invoice}10`,
          border: `1px solid ${STEP_COLORS.invoice}25`,
          padding: 24, direction: 'rtl',
          opacity: invoiceSpring,
          transform: `scale(${interpolate(invoiceSpring, [0, 1], [0.85, 1])})`,
        }}>
          <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 600, color: BRAND.muted, marginBottom: 4 }}>
            חשבונית מס' 1024
          </div>
          <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 800, color: BRAND.white, marginBottom: 4 }}>
            רונית כץ · ₪800
          </div>

          {/* Morning badge */}
          <div style={{
            display: 'inline-block', padding: '3px 10px', borderRadius: 8,
            background: `${STEP_COLORS.invoice}15`, border: `1px solid ${STEP_COLORS.invoice}30`,
            fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: STEP_COLORS.invoice,
            marginBottom: 16,
          }}>
            Morning אינטגרציה
          </div>

          {/* Send button */}
          <div style={{
            padding: '12px 20px', borderRadius: 14, textAlign: 'center',
            background: frame >= 60 ? STEP_COLORS.invoice : `${STEP_COLORS.invoice}20`,
            fontFamily: HEEBO, fontSize: 14, fontWeight: 800, color: '#fff',
            transform: frame >= 60 ? 'scale(0.97)' : 'scale(1)',
          }}>
            שלח ללקוח
          </div>

          {/* Sent badge */}
          {frame >= 80 && (
            <div style={{
              marginTop: 8, textAlign: 'center',
              fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: '#22C55E',
              opacity: sentBadge,
            }}>
              נשלח ✓
            </div>
          )}
        </div>
      )}

      {/* PAID — enormous */}
      {frame >= 120 && frame < 200 && (
        <div style={{
          position: 'absolute', textAlign: 'center',
          opacity: paidSpring,
          transform: `scale(${interpolate(paidSpring, [0, 1], [0.5, 1.05])})`,
        }}>
          <div style={{
            ...brushedMetal(80, 'emerald'),
          }}>
            שולם.
          </div>
          <div style={{
            fontFamily: RUBIK, fontSize: 48, fontWeight: 800, color: BRAND.white,
            filter: `blur(${paidRoll.motionBlur}px)`,
            textShadow: `0 0 30px ${STEP_COLORS.paid}40`,
            marginTop: 8,
          }}>
            {paidRoll.display}
          </div>
        </div>
      )}

      {/* Journey path — all steps */}
      {frame >= 200 && (
        <div style={{
          opacity: journeySpring,
          transform: `translateY(${interpolate(journeySpring, [0, 1], [20, 0])}px)`,
          textAlign: 'center',
        }}>
          {/* Path visualization */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', direction: 'rtl', marginBottom: 24 }}>
            {journeySteps.map((step, i) => {
              const stepDelay = Math.max(0, frame - 200 - i * 5);
              const stepSpring = spring({ frame: stepDelay, fps, config: SPRING.punch, durationInFrames: 12 });

              return (
                <React.Fragment key={i}>
                  <div style={{
                    padding: '8px 12px', borderRadius: 12,
                    background: `${step.color}20`,
                    border: `1px solid ${step.color}40`,
                    fontFamily: HEEBO, fontSize: 12, fontWeight: 700,
                    color: BRAND.white,
                    opacity: stepSpring,
                    transform: `scale(${interpolate(stepSpring, [0, 1], [0.7, 1])})`,
                    boxShadow: `0 0 12px ${step.color}20`,
                    whiteSpace: 'nowrap',
                  }}>
                    {step.label}
                  </div>
                  {i < journeySteps.length - 1 && (
                    <div style={{ width: 12, height: 2, background: `${step.color}40`, opacity: stepSpring }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Big text */}
          <div style={{
            ...brushedMetal(36, 'brand'),
            opacity: spring({ frame: Math.max(0, frame - 240), fps, config: SPRING.hero, durationInFrames: 20 }),
          }}>
            מהליד הראשון — ועד השקל האחרון.
          </div>
          <div style={{
            fontFamily: HEEBO, fontSize: 18, fontWeight: 600, color: BRAND.muted,
            marginTop: 8,
            opacity: spring({ frame: Math.max(0, frame - 260), fps, config: SPRING.ui, durationInFrames: 15 }),
          }}>
            מסך אחד. מערכת אחת. אפס העתקות.
          </div>
        </div>
      )}

      {/* Character */}
      <Character
        pose={frame >= 120 ? 'confident' : 'standing'}
        expression={frame >= 120 ? 'smile' : 'neutral'}
        shirtColor="blue"
        delay={5}
        scale={1.3}
        style={{ position: 'absolute', bottom: '5%', right: '5%' }}
      />

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 6: PROOF + IDENTITY [0:45–0:55] frames 0–300
// ═══════════════════════════════════════════════════════════
const ProofScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const facts = [
    { value: '₪149', label: 'מתחילים', color: STEP_COLORS.invoice },
    { value: '5 דק\'', label: 'מההרשמה', color: BRAND.primary },
    { value: '7 ימים', label: 'חינם', color: WARM.amber },
  ];

  const badges = [
    { emoji: '🕎', text: 'שומרת שבת' },
    { emoji: '📅', text: 'לוח עברי' },
    { emoji: '🔐', text: 'ניסיון חינם' },
  ];

  // "ראית?" at frame 200
  const directSpring = spring({ frame: Math.max(0, frame - 200), fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ backgroundColor: '#09090B', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      {/* Facts */}
      {frame < 120 && (
        <div style={{ display: 'flex', gap: 16, direction: 'rtl' }}>
          {facts.map((fact, i) => {
            const roll = useSlotRoll(frame, fps, fact.value, i * 15, 20);
            const cardSpring = spring({ frame: Math.max(0, frame - i * 15), fps, config: SPRING.ui, durationInFrames: 18 });

            return (
              <div key={i} style={{
                textAlign: 'center', opacity: cardSpring,
                transform: `translateY(${interpolate(cardSpring, [0, 1], [20, 0])}px)`,
              }}>
                <GlassCard width={160} delay={i * 15} glowColor={fact.color}>
                  <div style={{ padding: '18px 14px', textAlign: 'center' }}>
                    <div style={{
                      fontFamily: RUBIK, fontSize: 32, fontWeight: 800, color: BRAND.white,
                      filter: `blur(${roll.motionBlur}px)`,
                    }}>
                      {roll.display}
                    </div>
                    <div style={{
                      fontFamily: HEEBO, fontSize: 12, fontWeight: 600, color: BRAND.muted,
                      marginTop: 4, direction: 'rtl',
                    }}>
                      {fact.label}
                    </div>
                  </div>
                </GlassCard>
              </div>
            );
          })}
        </div>
      )}

      {/* Badges */}
      {frame >= 100 && frame < 200 && (
        <div style={{
          display: 'flex', gap: 10, direction: 'rtl',
          position: 'absolute', top: '55%',
        }}>
          {badges.map((badge, i) => {
            const bSpring = spring({
              frame: Math.max(0, frame - 100 - i * 10),
              fps, config: SPRING.ui, durationInFrames: 16,
            });
            return (
              <div key={i} style={{
                padding: '6px 14px', borderRadius: 16,
                background: `${WARM.amber}10`, border: `1px solid ${WARM.amber}20`,
                fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: WARM.amber,
                display: 'flex', alignItems: 'center', gap: 5,
                opacity: bSpring,
              }}>
                <span>{badge.emoji}</span>
                <span>{badge.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* "ראית? מהליד — לחשבונית." */}
      {frame >= 200 && (
        <div style={{
          textAlign: 'center',
          ...brushedMetal(36, 'warm'),
          opacity: directSpring,
          transform: `scale(${interpolate(directSpring, [0, 1], [0.9, 1])})`,
        }}>
          ראית? מהליד — לחשבונית. בלי לצאת. בוא תנסה.
        </div>
      )}

      {/* Character */}
      <Character
        pose={frame >= 200 ? 'standing' : 'confident'}
        expression={frame >= 200 ? 'confident' : 'smile'}
        shirtColor="blue"
        delay={5}
        scale={1.4}
        style={{ position: 'absolute', bottom: '5%', right: '8%' }}
      />

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 7: CTA [0:55–1:15] frames 0–600
// ═══════════════════════════════════════════════════════════
const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const brandSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 22 });

  const buttonSpring = spring({ frame: Math.max(0, frame - 150), fps, config: SPRING.punch, durationInFrames: 18 });
  const buttonPulse = Math.sin((frame - 150) * 0.06) * 0.03 + 1;

  // Fast-forward replay: frame 300–390
  const replayActive = frame >= 300 && frame < 390;
  const replayProgress = replayActive
    ? interpolate(frame, [300, 390], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0;

  const journeySteps = [
    { label: 'ליד', color: STEP_COLORS.lead },
    { label: 'שיחה', color: STEP_COLORS.call },
    { label: 'הצעה', color: STEP_COLORS.quote },
    { label: 'לקוח', color: STEP_COLORS.client },
    { label: 'חשבונית', color: STEP_COLORS.invoice },
    { label: 'שולם', color: STEP_COLORS.paid },
  ];

  const fadeOut = interpolate(frame, [540, 600], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{
      backgroundColor: '#09090B',
      justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
      opacity: fadeOut,
    }}>
      {/* Brand glow */}
      <div style={{
        position: 'absolute', width: 500, height: 500, borderRadius: '50%',
        background: `radial-gradient(circle, ${BRAND.primary}12 0%, transparent 65%)`,
      }} />

      {/* "MISRAD AI" */}
      <div style={{
        fontFamily: RUBIK, fontSize: 64, fontWeight: 800, color: BRAND.white,
        letterSpacing: 2, opacity: brandSpring,
        transform: `scale(${interpolate(brandSpring, [0, 1], [0.8, 1])})`,
        textShadow: `0 0 40px ${BRAND.primary}30`,
        marginBottom: 8,
      }}>
        MISRAD AI
      </div>

      {/* Tagline */}
      <div style={{
        fontFamily: HEEBO, fontSize: 24, fontWeight: 700, color: BRAND.muted,
        direction: 'rtl', marginBottom: 28,
        opacity: spring({ frame: Math.max(0, frame - 20), fps, config: SPRING.ui, durationInFrames: 15 }),
      }}>
        מקום אחד. לכל המסע.
      </div>

      {/* CTA Button */}
      {frame >= 150 && (
        <div style={{
          padding: '16px 50px', borderRadius: 50,
          background: BRAND.gradient,
          boxShadow: `0 12px 40px ${BRAND.primary}30`,
          opacity: buttonSpring,
          transform: `scale(${interpolate(buttonSpring, [0, 1], [0.8, 1]) * buttonPulse})`,
          marginBottom: 12,
        }}>
          <span style={{ fontFamily: RUBIK, fontSize: 26, fontWeight: 800, color: '#fff' }}>
            להתחיל — חינם
          </span>
        </div>
      )}

      {/* URL */}
      {frame >= 170 && (
        <div style={{
          fontFamily: RUBIK, fontSize: 22, fontWeight: 700, color: BRAND.muted,
          marginBottom: 28,
          opacity: spring({ frame: Math.max(0, frame - 170), fps, config: SPRING.ui, durationInFrames: 15 }),
        }}>
          misrad-ai.com
        </div>
      )}

      {/* Fast-forward replay */}
      {replayActive && (
        <div style={{
          position: 'absolute', bottom: '18%',
          display: 'flex', alignItems: 'center', gap: 4, direction: 'rtl',
        }}>
          {journeySteps.map((step, i) => {
            const stepActive = replayProgress >= i / journeySteps.length;
            return (
              <React.Fragment key={i}>
                <div style={{
                  padding: '5px 10px', borderRadius: 10,
                  background: stepActive ? `${step.color}25` : `${step.color}08`,
                  border: `1px solid ${stepActive ? step.color + '50' : step.color + '15'}`,
                  fontFamily: HEEBO, fontSize: 10, fontWeight: 700,
                  color: stepActive ? BRAND.white : BRAND.muted,
                  transform: stepActive ? 'scale(1.05)' : 'scale(0.95)',
                  boxShadow: stepActive ? `0 0 10px ${step.color}20` : 'none',
                  transition: 'all 0.1s',
                  whiteSpace: 'nowrap',
                }}>
                  {step.label}
                </div>
                {i < journeySteps.length - 1 && (
                  <div style={{ width: 8, height: 2, background: `${step.color}30` }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* "הכל — ממסך אחד." */}
      {replayActive && (
        <div style={{
          position: 'absolute', bottom: '10%',
          fontFamily: HEEBO, fontSize: 16, fontWeight: 700, color: BRAND.muted,
          opacity: interpolate(replayProgress, [0.5, 0.8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          הכל — ממסך אחד.
        </div>
      )}

      {/* Outro badges */}
      {frame >= 400 && (
        <div style={{
          position: 'absolute', bottom: '12%',
          display: 'flex', gap: 8,
          opacity: spring({ frame: Math.max(0, frame - 400), fps, config: SPRING.ui, durationInFrames: 15 }),
        }}>
          {['7 ימי ניסיון חינם', '🕎 שומרת שבת'].map((text, i) => (
            <div key={i} style={{
              padding: '5px 12px', borderRadius: 12,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: BRAND.muted,
            }}>
              {text}
            </div>
          ))}
        </div>
      )}

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPOSITION — L3 Workflow Video (75s)
// ═══════════════════════════════════════════════════════════
export const L3WorkflowVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={T.HOOK.from} durationInFrames={T.HOOK.dur}><HookScene /></Sequence>
      <Sequence from={T.CALL.from} durationInFrames={T.CALL.dur}><CallScene /></Sequence>
      <Sequence from={T.QUOTE.from} durationInFrames={T.QUOTE.dur}><QuoteScene /></Sequence>
      <Sequence from={T.CLIENT.from} durationInFrames={T.CLIENT.dur}><ClientScene /></Sequence>
      <Sequence from={T.INVOICE.from} durationInFrames={T.INVOICE.dur}><InvoiceScene /></Sequence>
      <Sequence from={T.PROOF.from} durationInFrames={T.PROOF.dur}><ProofScene /></Sequence>
      <Sequence from={T.CTA.from} durationInFrames={T.CTA.dur}><CTAScene /></Sequence>
    </AbsoluteFill>
  );
};
