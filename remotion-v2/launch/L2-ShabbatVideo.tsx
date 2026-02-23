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
import { NoiseLayer, TextReveal, GlassCard, CTAEndcard } from '../shared/components';
import { Character } from './shared/Character';
import { L2_TIMING, WARM } from './shared/launch-config';

const T = L2_TIMING;

// ─── Helpers ────────────────────────────────────────────

const brushedMetal = (fontSize: number, color: 'warm' | 'gold' | 'brand' = 'warm'): React.CSSProperties => {
  const gradients = {
    warm: 'linear-gradient(160deg, #F0EDE8 0%, #D8D0C4 30%, #E8E0D4 50%, #C8BFB2 75%, #DDD5C8 100%)',
    gold: 'linear-gradient(160deg, #EAD7A1 0%, #C5A572 30%, #D4B882 50%, #A88B4A 75%, #C5A572 100%)',
    brand: `linear-gradient(160deg, #E8A0B0 0%, #A21D3C 40%, #6366F1 70%, #3730A3 100%)`,
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
// SCENE 1: HOOK — "יום שישי" [0:00–0:06] frames 0–180
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Clock entrance
  const clockSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 20 });
  const clockBlur = interpolate(clockSpring, [0, 1], [12, 0]);

  // Hour hand advances: 13:45 → 14:15 over 180 frames
  const hourAngle = interpolate(frame, [0, 180], [-45, -30]); // 13:45 → ~14:15
  const minuteAngle = interpolate(frame, [0, 180], [270, 90]); // 45min → 15min (270°→90°)

  // Notifications at frame 60
  const notifications = ['ליד חדש', 'חשבונית דחופה', 'הלקוח מחכה', 'עדכן CRM', 'פרסם פוסט'];
  const notifStart = 60;

  // Character comes into focus at frame 120
  const charFocus = interpolate(frame, [120, 140], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const charBlur = interpolate(charFocus, [0, 1], [8, 0]);

  // Text at frame 120
  const textSpring = spring({ frame: Math.max(0, frame - 120), fps, config: SPRING.ui, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ backgroundColor: WARM.warmDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      {/* Warm window light leak */}
      <div style={{
        position: 'absolute', top: 0, right: 0, width: '40%', height: '100%',
        background: 'linear-gradient(270deg, rgba(255,200,100,0.04) 0%, transparent 60%)',
      }} />

      {/* Clock */}
      <div style={{
        position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
        opacity: clockSpring,
        filter: `blur(${clockBlur}px)`,
      }}>
        <svg viewBox="0 0 200 200" width={260} height={260}>
          {/* Clock face */}
          <circle cx="100" cy="100" r="95" fill="none" stroke={WARM.amber} strokeWidth={2} opacity={0.4} />
          <circle cx="100" cy="100" r="90" fill="rgba(10,10,15,0.6)" />
          {/* Hour marks */}
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i * 30 - 90) * (Math.PI / 180);
            const x1 = 100 + Math.cos(a) * 82;
            const y1 = 100 + Math.sin(a) * 82;
            const x2 = 100 + Math.cos(a) * 88;
            const y2 = 100 + Math.sin(a) * 88;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={WARM.amber} strokeWidth={2} opacity={0.5} />;
          })}
          {/* Hour hand */}
          <line
            x1="100" y1="100"
            x2={100 + Math.cos((hourAngle - 90) * (Math.PI / 180)) * 45}
            y2={100 + Math.sin((hourAngle - 90) * (Math.PI / 180)) * 45}
            stroke={WARM.amber} strokeWidth={4} strokeLinecap="round"
          />
          {/* Minute hand */}
          <line
            x1="100" y1="100"
            x2={100 + Math.cos((minuteAngle - 90) * (Math.PI / 180)) * 65}
            y2={100 + Math.sin((minuteAngle - 90) * (Math.PI / 180)) * 65}
            stroke="#F0EDE8" strokeWidth={2} strokeLinecap="round"
          />
          {/* Center */}
          <circle cx="100" cy="100" r="4" fill={WARM.amber} />
        </svg>
      </div>

      {/* "יום שישי" label */}
      <div style={{
        position: 'absolute', top: '52%',
        fontFamily: HEEBO, fontSize: 28, fontWeight: 700, color: WARM.amber,
        opacity: clockSpring,
      }}>
        יום שישי
      </div>

      {/* Notification cards floating around clock */}
      {frame >= notifStart && frame < 120 && notifications.map((notif, i) => {
        const nSpring = spring({
          frame: Math.max(0, frame - notifStart - i * 5),
          fps, config: SPRING.punch, durationInFrames: 12,
        });
        const angle = (i * 72 + 20) * (Math.PI / 180);
        const radius = 180;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius - 40;

        return (
          <div key={i} style={{
            position: 'absolute',
            top: `calc(28% + ${y}px)`, left: `calc(50% + ${x}px)`,
            transform: `translate(-50%, -50%) scale(${interpolate(nSpring, [0, 1], [0.7, 1])})`,
            opacity: nSpring,
          }}>
            <div style={{
              padding: '6px 14px', borderRadius: 10,
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.25)',
              fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: '#EF4444',
              direction: 'rtl', whiteSpace: 'nowrap',
              backdropFilter: 'blur(8px)',
            }}>
              {notif}
            </div>
          </div>
        );
      })}

      {/* "הטלפון לא מפסיק" — frame 60 */}
      {frame >= 60 && frame < 120 && (
        <div style={{ position: 'absolute', bottom: '28%' }}>
          <TextReveal
            text="יום שישי. אחת וארבעים וחמש. והטלפון לא מפסיק."
            delay={0} fontSize={22} fontWeight={700} color={BRAND.muted}
            mode="words" stagger={2}
            style={{ justifyContent: 'center' }}
          />
        </div>
      )}

      {/* Character — silhouette initially, comes to focus */}
      <Character
        pose="phoneHolding"
        expression={frame < 120 ? 'frustrated' : 'neutral'}
        shirtColor="white"
        delay={0}
        scale={1.7}
        style={{
          position: 'absolute', bottom: '5%', right: '12%',
          filter: `blur(${charBlur}px)`,
        }}
      />

      {/* "ואתה צריך לסגור..." — frame 120 */}
      {frame >= 120 && (
        <div style={{
          position: 'absolute', bottom: '18%', textAlign: 'center',
          opacity: textSpring,
          transform: `translateY(${interpolate(textSpring, [0, 1], [15, 0])}px)`,
        }}>
          <TextReveal
            text="ואתה צריך לסגור. לפני שהשבת נכנסת."
            delay={0} fontSize={30} fontWeight={800} color={WARM.amber}
            mode="words" stagger={3}
            style={{ justifyContent: 'center' }}
          />
        </div>
      )}

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 2: THE PAIN — "אף מערכת לא מבינה" [0:06–0:15] frames 0–270
// ═══════════════════════════════════════════════════════════
const PainScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const problems = [
    'המערכת שלחה notification בשבת',
    'גבייה שנשלחה בערב חג',
    'לוח שנה שלא יודע מה זה ט\' באב',
  ];

  // Disintegrate at frame 130
  const particles = useDisintegration(frame, 130, 30, 40);
  const disintegrateActive = frame >= 130;

  // Candle at frame 180
  const candleSpring = spring({ frame: Math.max(0, frame - 180), fps, config: SPRING.smooth, durationInFrames: 25 });

  // "עד עכשיו" at frame 210
  const untilSpring = spring({ frame: Math.max(0, frame - 210), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: WARM.warmDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      {/* Problem cards */}
      {frame < 160 && problems.map((prob, i) => {
        const pSpring = spring({
          frame: Math.max(0, frame - i * 20),
          fps, config: SPRING.ui, durationInFrames: 18,
        });
        const fadeOut = disintegrateActive ? interpolate(frame, [130, 160], [1, 0], { extrapolateRight: 'clamp' }) : 1;

        return (
          <div key={i} style={{
            position: 'absolute', top: `${20 + i * 22}%`, left: '50%',
            transform: `translateX(-50%) translateX(${interpolate(pSpring, [0, 1], [40, 0])}px)`,
            opacity: pSpring * fadeOut,
          }}>
            <GlassCard width={440} delay={i * 20} glowColor="#EF4444">
              <div style={{
                padding: '16px 22px', direction: 'rtl',
                fontFamily: HEEBO, fontSize: 19, fontWeight: 700, color: BRAND.white,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#EF4444', boxShadow: '0 0 10px rgba(239,68,68,0.4)',
                }} />
                {prob}
              </div>
            </GlassCard>
          </div>
        );
      })}

      {/* "כי אף מערכת לא נבנתה בשבילך" */}
      {frame >= 50 && frame < 130 && (
        <div style={{ position: 'absolute', bottom: '15%', textAlign: 'center' }}>
          <div style={{
            ...brushedMetal(40, 'warm'),
            opacity: spring({ frame: Math.max(0, frame - 50), fps, config: SPRING.hero, durationInFrames: 20 }),
          }}>
            כי אף מערכת — לא נבנתה בשבילך.
          </div>
        </div>
      )}

      {/* Disintegration particles */}
      {disintegrateActive && frame < 180 && particles.map((p, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: `calc(40% + ${p.y}px)`, left: `calc(50% + ${p.x}px)`,
          width: p.size, height: p.size, borderRadius: 2,
          background: i % 2 === 0 ? '#EF4444' : 'rgba(255,255,255,0.2)',
          opacity: p.opacity,
          pointerEvents: 'none',
        }} />
      ))}

      {/* Black moment: 160–180 */}
      {frame >= 160 && frame < 180 && (
        <AbsoluteFill style={{ backgroundColor: '#000' }} />
      )}

      {/* Candle */}
      {frame >= 180 && (
        <div style={{
          position: 'absolute', opacity: candleSpring,
          transform: `scale(${interpolate(candleSpring, [0, 1], [0.6, 1])})`,
        }}>
          {/* Candle body */}
          <div style={{
            width: 16, height: 60, borderRadius: '4px 4px 2px 2px',
            background: 'linear-gradient(180deg, #F5F0E8 0%, #E8DCC8 100%)',
            margin: '0 auto',
          }} />
          {/* Flame */}
          <div style={{
            width: 20, height: 30, borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
            background: `radial-gradient(ellipse at 50% 60%, #FFC850 0%, ${WARM.amber} 40%, rgba(255,100,30,0.4) 70%, transparent 100%)`,
            margin: '-8px auto 0',
            transform: `scaleX(${1 + Math.sin(frame * 0.15) * 0.08})`,
            boxShadow: `0 0 30px ${WARM.candleGlow}, 0 0 60px rgba(255,200,100,0.2)`,
          }} />
          {/* Glow */}
          <div style={{
            position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)',
            width: 200, height: 200, borderRadius: '50%',
            background: `radial-gradient(circle, ${WARM.candleGlow} 0%, transparent 60%)`,
            opacity: 0.5 + Math.sin(frame * 0.1) * 0.1,
          }} />
        </div>
      )}

      {/* "עד עכשיו." */}
      {frame >= 210 && (
        <div style={{
          position: 'absolute', top: '60%',
          ...brushedMetal(52, 'gold'),
          opacity: untilSpring,
          transform: `scale(${interpolate(untilSpring, [0, 1], [0.85, 1])})`,
        }}>
          עד עכשיו.
        </div>
      )}

      {/* Character — close-up, direct eye contact */}
      {frame >= 50 && frame < 130 && (
        <Character
          pose="standing"
          expression="neutral"
          shirtColor="white"
          delay={50}
          scale={2.2}
          style={{ position: 'absolute', bottom: '-10%', right: '5%' }}
        />
      )}

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 3: THE ANSWER — "שומר שבת" [0:15–0:30] frames 0–450
// ═══════════════════════════════════════════════════════════
const AnswerScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo crystallize: 0–90
  const logoSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 25 });
  const logoBlur = interpolate(logoSpring, [0, 1], [12, 0]);

  // Shabbat mode demo: 120–240
  const buttonPress = frame >= 140;
  const lockSpring = spring({ frame: Math.max(0, frame - 160), fps, config: SPRING.ui, durationInFrames: 20 });

  // UI warm transition: 140–170
  const warmShift = interpolate(frame, [140, 170], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Vault: 240–360
  const vaultSpring = spring({ frame: Math.max(0, frame - 240), fps, config: SPRING.smooth, durationInFrames: 30 });

  // Motzei Shabbat: 360+
  const unlockSpring = spring({ frame: Math.max(0, frame - 370), fps, config: SPRING.punch, durationInFrames: 15 });

  return (
    <AbsoluteFill style={{
      backgroundColor: interpolate(warmShift, [0, 1], [0, 0.3]) > 0.15 ? WARM.warmSurface : WARM.warmDark,
      justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
    }}>
      {/* Warm ambient glow */}
      <div style={{
        position: 'absolute', width: 500, height: 500, borderRadius: '50%',
        background: `radial-gradient(circle, ${WARM.goldGlow} 0%, transparent 60%)`,
        opacity: 0.2 + warmShift * 0.3,
      }} />

      {/* Logo crystallize */}
      {frame < 120 && (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: RUBIK, fontSize: 60, fontWeight: 800, color: BRAND.white,
            opacity: logoSpring, filter: `blur(${logoBlur}px)`,
            textShadow: `0 0 40px ${BRAND.primary}30`,
          }}>
            MISRAD AI
          </div>
          <div style={{
            ...brushedMetal(28, 'gold'),
            opacity: spring({ frame: Math.max(0, frame - 20), fps, config: SPRING.ui, durationInFrames: 18 }),
            marginTop: 8,
          }}>
            המערכת הראשונה שמכבדת שבת.
          </div>
        </div>
      )}

      {/* Shabbat mode demo — Phone */}
      {frame >= 120 && frame < 240 && (
        <div style={{
          position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
        }}>
          <div style={{
            width: 220, height: 420, borderRadius: 28,
            background: warmShift > 0.5 ? '#1A1520' : '#18181B',
            border: `2px solid ${warmShift > 0.5 ? WARM.amber + '30' : 'rgba(255,255,255,0.1)'}`,
            boxShadow: `0 20px 60px rgba(0,0,0,0.5)`,
            position: 'relative', overflow: 'hidden',
            transition: 'background 0.8s, border-color 0.8s',
          }}>
            <div style={{ padding: 16, paddingTop: 40 }}>
              {/* Shabbat mode button */}
              <div style={{
                padding: '14px 24px', borderRadius: 18, textAlign: 'center',
                background: buttonPress
                  ? `linear-gradient(135deg, ${WARM.amber}, ${WARM.amberDark})`
                  : 'rgba(255,255,255,0.08)',
                border: `1px solid ${WARM.amber}40`,
                fontFamily: HEEBO, fontSize: 16, fontWeight: 800, color: '#fff',
                transform: buttonPress ? 'scale(0.97)' : 'scale(1)',
                boxShadow: buttonPress ? `0 0 25px ${WARM.goldGlow}` : 'none',
                marginBottom: 16,
              }}>
                מצב שבת
              </div>

              {/* Fake notification items fading out */}
              {['ליד חדש', 'חשבונית', 'תזכורת'].map((item, i) => {
                const fadeNotif = interpolate(frame, [145 + i * 5, 160 + i * 5], [1, 0], {
                  extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
                });
                return (
                  <div key={i} style={{
                    padding: '8px 12px', marginBottom: 6, borderRadius: 10,
                    background: 'rgba(255,255,255,0.05)',
                    fontFamily: HEEBO, fontSize: 12, fontWeight: 600, color: BRAND.muted,
                    direction: 'rtl', opacity: fadeNotif,
                  }}>
                    {item}
                  </div>
                );
              })}
            </div>

            {/* Lock overlay */}
            {lockSpring > 0 && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(26,21,32,0.8)',
                backdropFilter: 'blur(16px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 28,
                opacity: lockSpring,
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>🔒</div>
                  <div style={{
                    fontFamily: HEEBO, fontSize: 16, fontWeight: 700, color: WARM.amber,
                  }}>
                    מצב שבת פעיל
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Text: "המערכת יוצאת לשבת" */}
      {frame >= 170 && frame < 240 && (
        <div style={{ position: 'absolute', bottom: '15%' }}>
          <TextReveal
            text="לוחצים כפתור אחד. המערכת יוצאת לשבת — לבד."
            delay={0} fontSize={24} fontWeight={700} color={WARM.amber}
            mode="words" stagger={2}
            style={{ justifyContent: 'center' }}
          />
        </div>
      )}

      {/* Shabbat Vault */}
      {frame >= 240 && frame < 360 && (
        <div style={{
          position: 'absolute', opacity: vaultSpring,
          transform: `scale(${interpolate(vaultSpring, [0, 1], [0.7, 1])})`,
        }}>
          <div style={{
            width: 380, height: 280, borderRadius: 24,
            background: 'rgba(24,24,27,0.6)',
            backdropFilter: 'blur(24px)',
            border: `2px solid ${WARM.amber}25`,
            padding: 24, direction: 'rtl',
            boxShadow: `0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 ${WARM.amber}15`,
          }}>
            <div style={{
              fontFamily: HEEBO, fontSize: 22, fontWeight: 800, color: WARM.amber,
              marginBottom: 16,
            }}>
              כספת שבת
            </div>

            {/* Blurred items inside vault */}
            {['ליד: רונית כץ · ביטוח', 'ליד: משה לוי · פנסיה', 'הודעה: "מחכה להצעה"'].map((item, i) => {
              const itemSpring = spring({
                frame: Math.max(0, frame - 255 - i * 8),
                fps, config: SPRING.ui, durationInFrames: 15,
              });
              return (
                <div key={i} style={{
                  padding: '10px 16px', marginBottom: 8, borderRadius: 12,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  fontFamily: HEEBO, fontSize: 14, fontWeight: 600,
                  color: BRAND.muted, filter: 'blur(1.5px)',
                  opacity: itemSpring,
                }}>
                  {item}
                </div>
              );
            })}

            {/* "נשמר" badge */}
            <div style={{
              position: 'absolute', top: 20, left: 20,
              padding: '4px 14px', borderRadius: 10,
              background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
              fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: '#22C55E',
              opacity: spring({ frame: Math.max(0, frame - 270), fps, config: SPRING.punch, durationInFrames: 12 }),
            }}>
              ✓ נשמר
            </div>
          </div>
        </div>
      )}

      {/* Vault text */}
      {frame >= 260 && frame < 360 && (
        <div style={{ position: 'absolute', bottom: '12%' }}>
          <TextReveal
            text="כספת שבת. כל ליד שנכנס — ממתין לך. שום דבר לא הולך לאיבוד."
            delay={0} fontSize={20} fontWeight={700} color={BRAND.muted}
            mode="words" stagger={2}
            style={{ justifyContent: 'center' }}
          />
        </div>
      )}

      {/* Motzei Shabbat unlock */}
      {frame >= 360 && (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: HEEBO, fontSize: 20, fontWeight: 700, color: WARM.amber,
            marginBottom: 16,
            opacity: spring({ frame: Math.max(0, frame - 360), fps, config: SPRING.ui, durationInFrames: 15 }),
          }}>
            מוצאי שבת
          </div>
          <div style={{
            fontSize: 56,
            opacity: unlockSpring,
            transform: `scale(${interpolate(unlockSpring, [0, 1], [0.6, 1.05])})`,
          }}>
            🔓
          </div>
          <div style={{
            ...brushedMetal(28, 'warm'),
            marginTop: 12,
            opacity: spring({ frame: Math.max(0, frame - 390), fps, config: SPRING.ui, durationInFrames: 18 }),
          }}>
            הכל מחכה לך. מסודר. מוכן.
          </div>
        </div>
      )}

      {/* Character */}
      <Character
        pose={frame < 240 ? 'standing' : 'confident'}
        expression={frame >= 360 ? 'smile' : 'confident'}
        shirtColor="white"
        delay={10}
        scale={1.4}
        style={{ position: 'absolute', bottom: '5%', right: '8%' }}
      />

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 4: HEBREW CALENDAR — "לוח שמבין" [0:30–0:42] frames 0–360
// ═══════════════════════════════════════════════════════════
const CalendarScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const hebrewDates = [
    { date: 'ערב ר"ה', action: 'גבייה אוטומטית 3 ימים לפני', color: WARM.amber },
    { date: 'ערב יוה"כ', action: 'SMS ברכה ללקוחות', color: WARM.gold },
    { date: 'ערב סוכות', action: 'סגירת שבוע מוקדם', color: WARM.amberLight },
  ];

  // Calendar grid entrance
  const calSpring = spring({ frame, fps, config: SPRING.smooth, durationInFrames: 25 });

  // Split comparison: frame 150+
  const splitFrame = Math.max(0, frame - 150);
  const splitSpring = spring({ frame: splitFrame, fps, config: SPRING.ui, durationInFrames: 20 });

  // Left side disintegrate, right expands: frame 220+
  const expandProgress = interpolate(frame, [220, 270], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const leftFade = interpolate(frame, [220, 250], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // "בנויה בשבילך" — frame 290+
  const builtSpring = spring({ frame: Math.max(0, frame - 290), fps, config: SPRING.hero, durationInFrames: 22 });

  return (
    <AbsoluteFill style={{ backgroundColor: WARM.warmDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      {/* Calendar with Hebrew dates */}
      {frame < 150 && (
        <div style={{
          width: '88%', direction: 'rtl',
          opacity: calSpring,
          transform: `translateY(${interpolate(calSpring, [0, 1], [30, 0])}px)`,
        }}>
          {hebrewDates.map((item, i) => {
            const dateSpring = spring({
              frame: Math.max(0, frame - i * 12),
              fps, config: SPRING.ui, durationInFrames: 18,
            });

            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                marginBottom: 18, padding: '18px 22px', borderRadius: 18,
                background: 'rgba(24,24,27,0.65)',
                backdropFilter: 'blur(20px)',
                border: `1px solid ${item.color}25`,
                opacity: dateSpring,
                transform: `translateX(${interpolate(dateSpring, [0, 1], [30, 0])}px)`,
              }}>
                <div style={{
                  padding: '8px 16px', borderRadius: 12,
                  background: `${item.color}20`, border: `1px solid ${item.color}40`,
                  fontFamily: HEEBO, fontSize: 18, fontWeight: 800, color: item.color,
                  whiteSpace: 'nowrap',
                }}>
                  {item.date}
                </div>
                <span style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 600, color: BRAND.white }}>
                  {item.action}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Text for calendar */}
      {frame >= 30 && frame < 150 && (
        <div style={{ position: 'absolute', bottom: '15%' }}>
          <TextReveal
            text="לוח עברי. שיודע מתי ערב ראש השנה — ושולח גבייה 3 ימים לפני."
            delay={0} fontSize={20} fontWeight={700} color={BRAND.muted}
            mode="words" stagger={2}
            style={{ justifyContent: 'center' }}
          />
        </div>
      )}

      {/* Split comparison */}
      {frame >= 150 && frame < 290 && (
        <div style={{
          display: 'flex', width: '90%', gap: 12, justifyContent: 'center',
          opacity: splitSpring,
        }}>
          {/* Left — "מערכת רגילה" (gray) */}
          <div style={{
            flex: interpolate(expandProgress, [0, 1], [1, 0]),
            opacity: leftFade,
            borderRadius: 18,
            background: 'rgba(60,60,60,0.3)',
            border: '1px solid rgba(255,255,255,0.05)',
            padding: 20, textAlign: 'center',
            overflow: 'hidden',
          }}>
            <div style={{
              fontFamily: HEEBO, fontSize: 16, fontWeight: 700, color: BRAND.muted,
              marginBottom: 12,
            }}>
              מערכת רגילה
            </div>
            {/* Gray calendar grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {Array.from({ length: 14 }, (_, i) => (
                <div key={i} style={{
                  width: 20, height: 20, borderRadius: 4,
                  background: 'rgba(255,255,255,0.04)',
                  fontSize: 8, fontFamily: HEEBO, color: 'rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{
            width: 2, background: `linear-gradient(180deg, transparent, ${WARM.amber}30, transparent)`,
            opacity: leftFade,
          }} />

          {/* Right — "MISRAD AI" (warm, gold badges) */}
          <div style={{
            flex: interpolate(expandProgress, [0, 1], [1, 2]),
            borderRadius: 18,
            background: 'rgba(26,21,32,0.6)',
            border: `1px solid ${WARM.amber}20`,
            padding: 20, textAlign: 'center',
          }}>
            <div style={{
              fontFamily: HEEBO, fontSize: 16, fontWeight: 800, color: WARM.amber,
              marginBottom: 12,
            }}>
              MISRAD AI
            </div>
            {/* Calendar with Hebrew badges */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {Array.from({ length: 14 }, (_, i) => {
                const isHoliday = i === 3 || i === 8 || i === 12;
                return (
                  <div key={i} style={{
                    width: 20, height: 20, borderRadius: 4,
                    background: isHoliday ? `${WARM.amber}30` : 'rgba(255,255,255,0.04)',
                    border: isHoliday ? `1px solid ${WARM.amber}50` : 'none',
                    fontSize: 8, fontFamily: HEEBO,
                    color: isHoliday ? WARM.amber : 'rgba(255,255,255,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: isHoliday ? 800 : 400,
                  }}>
                    {isHoliday ? '🕎' : i + 1}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Comparison text */}
      {frame >= 160 && frame < 290 && (
        <div style={{ position: 'absolute', bottom: '12%' }}>
          <TextReveal
            text="מערכת רגילה — לא יודעת מה זה ט' באב. MISRAD AI — יודעת. ומתכוננת."
            delay={0} fontSize={18} fontWeight={700} color={BRAND.muted}
            mode="words" stagger={2}
            style={{ justifyContent: 'center' }}
          />
        </div>
      )}

      {/* "בנויה בשבילך." */}
      {frame >= 290 && (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            ...brushedMetal(56, 'gold'),
            opacity: builtSpring,
            transform: `scale(${interpolate(builtSpring, [0, 1], [0.85, 1])})`,
          }}>
            בנויה בשבילך.
          </div>
          <div style={{
            ...brushedMetal(24, 'warm'),
            marginTop: 8,
            opacity: spring({ frame: Math.max(0, frame - 310), fps, config: SPRING.ui, durationInFrames: 15 }),
          }}>
            לא מתורגמת. בנויה.
          </div>
        </div>
      )}

      {/* Character */}
      <Character
        pose="confident"
        expression="confident"
        shirtColor="white"
        delay={5}
        scale={1.4}
        style={{ position: 'absolute', bottom: '5%', right: '8%' }}
      />

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 5: WHAT'S INSIDE [0:42–0:55] frames 0–390
// ═══════════════════════════════════════════════════════════
const WhatsInsideScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const capabilities = [
    'ליד נכנס → AI מדרג אותו',
    'חשבונית → נשלחת בלחיצה בוואטסאפ',
    'לקוח → תיק שלם עם היסטוריה',
    'צוות → רואים מי עושה מה',
    'תוכן → AI כותב בעברית אמיתית',
  ];

  // Price slot roll at frame 180
  const priceRoll = useSlotRoll(frame, fps, '₪149', 180, 22);

  // "7 ימים חינם" badge at frame 220
  const freeBadge = spring({ frame: Math.max(0, frame - 220), fps, config: SPRING.punch, durationInFrames: 15 });

  // "תנסה" direct at frame 300
  const trySpring = spring({ frame: Math.max(0, frame - 300), fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ backgroundColor: WARM.warmDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      {/* Capability rows */}
      {frame < 200 && (
        <div style={{ width: '85%', direction: 'rtl' }}>
          {capabilities.map((cap, i) => {
            const rowSpring = spring({
              frame: Math.max(0, frame - i * 10),
              fps, config: SPRING.ui, durationInFrames: 15,
            });

            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                marginBottom: 12, padding: '12px 18px', borderRadius: 14,
                background: 'rgba(24,24,27,0.6)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                opacity: rowSpring,
                transform: `translateX(${interpolate(rowSpring, [0, 1], [30, 0])}px)`,
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 7,
                  background: `linear-gradient(135deg, ${WARM.amber}, ${WARM.amberDark})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: HEEBO, fontSize: 12, fontWeight: 800, color: '#fff',
                  flexShrink: 0,
                }}>
                  ✓
                </div>
                <span style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 700, color: BRAND.white }}>
                  {cap}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Voiceover text */}
      {frame >= 50 && frame < 180 && (
        <div style={{ position: 'absolute', bottom: '12%' }}>
          <TextReveal
            text="הכל ממקום אחד. עם AI שמבין עברית. שכותב בעברית. שחושב בעברית."
            delay={0} fontSize={20} fontWeight={700} color={BRAND.muted}
            mode="words" stagger={2}
            style={{ justifyContent: 'center' }}
          />
        </div>
      )}

      {/* Price */}
      {frame >= 180 && frame < 300 && (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: RUBIK, fontSize: 72, fontWeight: 800, color: BRAND.white,
            filter: `blur(${priceRoll.motionBlur}px)`,
            textShadow: `0 0 30px ${WARM.goldGlow}`,
          }}>
            {priceRoll.display}
          </div>
          <div style={{
            fontFamily: HEEBO, fontSize: 18, fontWeight: 600, color: BRAND.muted,
            marginTop: 8, direction: 'rtl',
            opacity: spring({ frame: Math.max(0, frame - 200), fps, config: SPRING.ui, durationInFrames: 15 }),
          }}>
            מתחילים עם מודול אחד. גדלים כשצריך.
          </div>

          {/* Free trial badge */}
          {frame >= 220 && (
            <div style={{
              marginTop: 16, display: 'inline-block',
              padding: '8px 24px', borderRadius: 20,
              background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
              fontFamily: HEEBO, fontSize: 16, fontWeight: 700, color: '#22C55E',
              opacity: freeBadge,
              transform: `scale(${interpolate(freeBadge, [0, 1], [0.8, 1])})`,
            }}>
              7 ימים חינם. בלי כרטיס אשראי.
            </div>
          )}
        </div>
      )}

      {/* "תנסה" — direct to camera */}
      {frame >= 300 && (
        <div style={{
          textAlign: 'center',
          ...brushedMetal(40, 'warm'),
          opacity: trySpring,
          transform: `scale(${interpolate(trySpring, [0, 1], [0.9, 1])})`,
        }}>
          תנסה. 7 ימים. ותבין למה אין דרך חזרה.
        </div>
      )}

      {/* Character */}
      <Character
        pose={frame >= 300 ? 'standing' : 'pointing'}
        expression={frame >= 300 ? 'confident' : 'smile'}
        shirtColor="white"
        delay={5}
        scale={1.5}
        style={{ position: 'absolute', bottom: '5%', right: '10%' }}
      />

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 6: CTA [0:55–1:15] frames 0–600
// ═══════════════════════════════════════════════════════════
const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const brandSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 22 });

  const tags = [
    'מערכת שמכבדת שבת.',
    'מדברת עברית.',
    'ומקדמת את העסק שלך.',
  ];

  const badges = [
    { emoji: '🕎', text: 'שומרת שבת וחג' },
    { emoji: '📅', text: 'לוח עברי מובנה' },
    { emoji: '🤲', text: 'בנויה לציבור שמכבד' },
  ];

  const buttonSpring = spring({ frame: Math.max(0, frame - 300), fps, config: SPRING.punch, durationInFrames: 18 });
  const buttonPulse = Math.sin((frame - 300) * 0.06) * 0.03 + 1;

  const fadeOut = interpolate(frame, [540, 600], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{
      backgroundColor: WARM.warmDark,
      justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
      opacity: fadeOut,
    }}>
      {/* Warm glow */}
      <div style={{
        position: 'absolute', width: 500, height: 500, borderRadius: '50%',
        background: `radial-gradient(circle, ${WARM.goldGlow} 0%, transparent 60%)`,
        opacity: 0.2,
      }} />

      {/* "MISRAD AI" */}
      <div style={{
        fontFamily: RUBIK, fontSize: 64, fontWeight: 800, color: BRAND.white,
        letterSpacing: 2, opacity: brandSpring,
        transform: `scale(${interpolate(brandSpring, [0, 1], [0.8, 1])})`,
        textShadow: `0 0 40px ${WARM.goldGlow}`,
        marginBottom: 12,
      }}>
        MISRAD AI
      </div>

      {/* Tags */}
      <div style={{ textAlign: 'center', direction: 'rtl', marginBottom: 28 }}>
        {tags.map((tag, i) => {
          const tagSpring = spring({
            frame: Math.max(0, frame - 30 - i * 8),
            fps, config: SPRING.ui, durationInFrames: 15,
          });
          return (
            <div key={i} style={{
              fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: BRAND.muted,
              marginBottom: 4, opacity: tagSpring,
              transform: `translateY(${interpolate(tagSpring, [0, 1], [12, 0])}px)`,
            }}>
              {tag}
            </div>
          );
        })}
      </div>

      {/* Gold badges */}
      {frame >= 150 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 28, direction: 'rtl' }}>
          {badges.map((badge, i) => {
            const bSpring = spring({
              frame: Math.max(0, frame - 150 - i * 10),
              fps, config: SPRING.ui, durationInFrames: 16,
            });
            return (
              <div key={i} style={{
                padding: '8px 16px', borderRadius: 18,
                background: `${WARM.amber}10`,
                border: `1px solid ${WARM.amber}25`,
                fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: WARM.amber,
                display: 'flex', alignItems: 'center', gap: 6,
                opacity: bSpring,
                transform: `translateY(${interpolate(bSpring, [0, 1], [10, 0])}px)`,
              }}>
                <span>{badge.emoji}</span>
                <span>{badge.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* CTA Button */}
      {frame >= 300 && (
        <div style={{
          padding: '16px 50px', borderRadius: 50,
          background: `linear-gradient(135deg, ${WARM.amber}, ${WARM.amberDark})`,
          boxShadow: `0 12px 40px ${WARM.goldGlow}`,
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
      {frame >= 320 && (
        <div style={{
          fontFamily: RUBIK, fontSize: 22, fontWeight: 700, color: BRAND.muted,
          opacity: spring({ frame: Math.max(0, frame - 320), fps, config: SPRING.ui, durationInFrames: 15 }),
        }}>
          misrad-ai.com
        </div>
      )}

      {/* Stylized candles at end */}
      {frame >= 450 && (
        <div style={{
          position: 'absolute', bottom: '12%',
          display: 'flex', gap: 30,
          opacity: spring({ frame: Math.max(0, frame - 450), fps, config: SPRING.smooth, durationInFrames: 20 }),
        }}>
          {[0, 1].map((i) => (
            <div key={i} style={{ position: 'relative' }}>
              <div style={{
                width: 12, height: 40, borderRadius: '3px 3px 2px 2px',
                background: 'linear-gradient(180deg, #F5F0E8, #E8DCC8)',
              }} />
              <div style={{
                width: 14, height: 20, borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                background: `radial-gradient(ellipse at 50% 60%, #FFC850, ${WARM.amber}, rgba(255,100,30,0.3))`,
                margin: '-5px auto 0',
                transform: `scaleX(${1 + Math.sin((frame + i * 30) * 0.15) * 0.08})`,
                boxShadow: `0 0 20px ${WARM.candleGlow}`,
              }} />
            </div>
          ))}
        </div>
      )}

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPOSITION — L2 Shabbat Video (75s)
// ═══════════════════════════════════════════════════════════
export const L2ShabbatVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={T.HOOK.from} durationInFrames={T.HOOK.dur}><HookScene /></Sequence>
      <Sequence from={T.PAIN.from} durationInFrames={T.PAIN.dur}><PainScene /></Sequence>
      <Sequence from={T.ANSWER.from} durationInFrames={T.ANSWER.dur}><AnswerScene /></Sequence>
      <Sequence from={T.CALENDAR.from} durationInFrames={T.CALENDAR.dur}><CalendarScene /></Sequence>
      <Sequence from={T.WHATS_INSIDE.from} durationInFrames={T.WHATS_INSIDE.dur}><WhatsInsideScene /></Sequence>
      <Sequence from={T.CTA.from} durationInFrames={T.CTA.dur}><CTAScene /></Sequence>
    </AbsoluteFill>
  );
};
