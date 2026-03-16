import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from 'remotion';
import { BRAND, HEEBO, RUBIK, SPRING } from '../shared/config';
import { L3_TIMING, WARM } from './shared/launch-config';
import {
  F, CARD_W, ACCENT, gradientText, sceneBg, safeFill,
  glassCard, rowCard, statCard, SceneContainer,
  MisradLogo, LogoWatermark, BloomOrb, GrainOverlay,
  CheckIcon, LockClosedIcon, ShieldCheckIcon, CalendarIcon, FlowArrow,
} from './shared/launch-design';

const T = L3_TIMING;

// ═══════════════════════════════════════════════════════════
// SCENE 1 — HOOK [0:00–0:05]
// Logo + "מליד לחשבונית" + pipeline pills
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Cinematic Entrance Animations
  const logoSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 25 });
  const titleSpring = spring({ frame: Math.max(0, frame - 25), fps, config: SPRING.heavy, durationInFrames: 30 });
  const subSpring = spring({ frame: Math.max(0, frame - 55), fps, config: SPRING.smooth, durationInFrames: 25 });

  const steps = ['ליד', 'שיחה', 'הצעה', 'חתימה', 'חשבונית'];
  const pipeProgress = interpolate(frame, [80, 140], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Floating Curiosity Animation
  const floatY = Math.sin(frame * 0.05) * 8;

  return (
    <SceneContainer style={sceneBg(ACCENT.goldDim, '40%')} focusY="45%">
      <BloomOrb color={ACCENT.gold} size={800} x="50%" y="40%" intensity={0.15} />

      <div style={{
        opacity: logoSpring,
        transform: `scale(${interpolate(logoSpring, [0, 1], [0.6, 1])}) translateY(${floatY}px)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <MisradLogo size={140} textSize={64} />
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 40,
        width: '100%',
      }}>
        <div style={{
          ...gradientText(F.mega, 'gold'),
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [40, 0])}px) scale(${interpolate(titleSpring, [0, 1], [0.95, 1])})`,
          maxWidth: CARD_W,
          filter: `blur(${interpolate(titleSpring, [0, 1], [10, 0])}px)`,
        }}>
          מליד לחשבונית
        </div>

        <div style={{
          fontFamily: HEEBO, fontSize: F.subtitle, fontWeight: 800,
          color: 'rgba(255,255,255,0.8)', direction: 'rtl', textAlign: 'center',
          opacity: subSpring, maxWidth: CARD_W,
          transform: `translateY(${interpolate(subSpring, [0, 1], [20, 0])}px)`,
          letterSpacing: '0.05em',
        }}>
          בלי אקסל. בלי לשכוח.
        </div>
      </div>

      {/* Pipeline pills with Eye Tracking Animation */}
      <div style={{
        width: 1000, // Fixed width that fits social safe zone
        display: 'flex', justifyContent: 'center',
        gap: 12, direction: 'rtl' as const,
        opacity: interpolate(frame, [70, 90], [0, 1], { extrapolateLeft: 'clamp' }),
      }}>
        {steps.map((step, i) => {
          const sp = interpolate(pipeProgress,
            [i / steps.length, (i + 0.8) / steps.length], [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const lit = sp > 0.5;
          const activeScale = interpolate(sp, [0, 0.5, 1], [1, 1.12, 1]);
          
          return (
            <React.Fragment key={i}>
              <div style={{
                padding: '18px 24px', borderRadius: 20,
                background: lit ? `linear-gradient(135deg, ${ACCENT.goldDim} 0%, rgba(99,102,241,0.05) 100%)` : 'rgba(255,255,255,0.02)',
                border: `2px solid ${lit ? ACCENT.gold + '60' : 'rgba(255,255,255,0.05)'}`,
                boxShadow: lit ? `0 0 30px ${ACCENT.gold}20` : 'none',
                fontFamily: HEEBO, fontSize: F.label + 2, fontWeight: 900,
                color: lit ? BRAND.white : 'rgba(255,255,255,0.3)',
                transform: `scale(${activeScale})`,
                transition: 'all 0.2s ease-out',
                whiteSpace: 'nowrap',
              }}>
                {step}
              </div>
              {i < steps.length - 1 && (
                <div style={{ alignSelf: 'center', opacity: sp, margin: '0 -4px' }}>
                  <FlowArrow size={24} color={lit ? `${ACCENT.gold}80` : 'rgba(255,255,255,0.1)'} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <LogoWatermark opacity={0.2} />
    </SceneContainer>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 2 — CALL [0:05–0:15]
// Call UI card — centered, gold accent
// ═══════════════════════════════════════════════════════════
const CallScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardSpring = spring({ frame, fps, config: SPRING.heavy, durationInFrames: 25 });
  const driftY = Math.sin(frame * 0.04) * 10;

  const callDetails = [
    { label: 'ליד חדש', value: 'רונית כהן', delay: 20 },
    { label: 'טלפון', value: '054-9876543', delay: 35 },
    { label: 'ציון AI', value: '87%', delay: 50 },
  ];

  const aiSpring = spring({ frame: Math.max(0, frame - 130), fps, config: SPRING.punch, durationInFrames: 20 });

  return (
    <SceneContainer style={sceneBg(ACCENT.goldDim, '35%')} focusY="40%">
      <BloomOrb color={ACCENT.gold} size={600} x="50%" y="35%" intensity={0.12} />

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        opacity: interpolate(frame, [0, 15], [0, 1]),
      }}>
        <div style={{ fontFamily: RUBIK, fontSize: F.label, fontWeight: 900, color: ACCENT.goldLight, letterSpacing: 2 }}>
          מערכת מזהה
        </div>
      </div>

      {/* Call card with Depth & Floating Animation */}
      <div style={{
        width: CARD_W, borderRadius: 40,
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(40px)',
        border: `2px solid ${ACCENT.gold}50`,
        boxShadow: `0 40px 100px rgba(0,0,0,0.6), 0 0 60px ${ACCENT.gold}15`,
        padding: '70px 60px',
        opacity: cardSpring,
        transform: `translateY(${interpolate(cardSpring, [0, 1], [60, driftY])}px) scale(${interpolate(cardSpring, [0, 1], [0.9, 1])})`,
        direction: 'rtl' as const,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 60 }}>
          <div style={{ 
            fontFamily: RUBIK, fontSize: F.hero, fontWeight: 900, color: BRAND.white,
            filter: `drop-shadow(0 0 20px ${ACCENT.gold}40)`
          }}>
            שיחה נכנסת
          </div>
        </div>

        {callDetails.map((item, i) => {
          const ds = spring({ frame: Math.max(0, frame - item.delay), fps, config: SPRING.ui, durationInFrames: 15 });
          const isAI = i === 2;
          return (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 24, padding: '28px 36px', borderRadius: 24,
              background: isAI ? `linear-gradient(90deg, ${ACCENT.goldDim} 0%, transparent 100%)` : 'rgba(255,255,255,0.02)',
              border: `1.5px solid ${isAI ? ACCENT.gold + '50' : 'rgba(255,255,255,0.08)'}`,
              opacity: ds,
              transform: `translateX(${interpolate(ds, [0, 1], [-30, 0])}px)`,
            }}>
              <span style={{ fontFamily: HEEBO, fontSize: F.body, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>
                {item.label}
              </span>
              <span style={{
                fontFamily: RUBIK, fontSize: F.body + 4, fontWeight: 900,
                color: isAI ? ACCENT.gold : BRAND.white,
              }}>
                {item.value}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {frame >= 130 && (
          <div style={{
            ...gradientText(F.title, 'gold'),
            opacity: aiSpring,
            transform: `scale(${interpolate(aiSpring, [0, 1], [0.8, 1])}) translateY(${interpolate(aiSpring, [0, 1], [20, 0])}px)`,
            lineHeight: 1.2,
            filter: `drop-shadow(0 0 30px ${ACCENT.gold}30)`,
          }}>
            ליד חם. 87% סיכוי.<br />
            <span style={{ fontSize: F.subtitle, opacity: 0.8 }}>ה-AI כבר הכין הצעה.</span>
          </div>
        )}
      </div>

      <LogoWatermark opacity={0.3} />
    </SceneContainer>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 3 — QUOTE [0:15–0:25]
// Quote card — centered, gold
// ═══════════════════════════════════════════════════════════
const QuoteScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardSpring = spring({ frame, fps, config: SPRING.heavy, durationInFrames: 25 });
  
  const items = [
    { desc: 'חבילת ניהול עסקי', price: '₪499/חודש' },
    { desc: 'הטמעה + הדרכה', price: 'כלול' },
  ];

  const sentSpring = spring({ frame: Math.max(0, frame - 120), fps, config: SPRING.punch, durationInFrames: 18 });
  const approvedSpring = spring({ frame: Math.max(0, frame - 160), fps, config: SPRING.punch, durationInFrames: 18 });

  return (
    <SceneContainer style={sceneBg(ACCENT.goldDim, '38%')} focusY="45%">
      <BloomOrb color={ACCENT.gold} size={600} x="50%" y="40%" intensity={0.15} />

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 15,
        opacity: interpolate(frame, [0, 15], [0, 1]),
      }}>
        <div style={{ fontFamily: RUBIK, fontSize: F.label, fontWeight: 900, color: ACCENT.goldLight, letterSpacing: 2 }}>
          הצעה אוטומטית
        </div>
      </div>

      <div style={{
        width: CARD_W, borderRadius: 40,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(50px)',
        border: `2px solid ${ACCENT.gold}50`,
        boxShadow: `0 40px 100px rgba(0,0,0,0.7), 0 0 80px ${ACCENT.gold}20`,
        padding: '60px 50px',
        opacity: cardSpring,
        transform: `translateY(${interpolate(cardSpring, [0, 1], [50, 0])}px) scale(${interpolate(cardSpring, [0, 1], [0.92, 1])})`,
        direction: 'rtl' as const,
      }}>
        <div style={{
          fontFamily: RUBIK, fontSize: F.title, fontWeight: 900, color: BRAND.white,
          marginBottom: 50, textAlign: 'center',
          filter: `drop-shadow(0 0 15px ${ACCENT.gold}30)`
        }}>
          הצעת מחיר — רונית כהן
        </div>

        {items.map((item, i) => {
          const is2 = spring({ frame: Math.max(0, frame - 30 - i * 15), fps, config: SPRING.ui, durationInFrames: 15 });
          return (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 20, padding: '28px 36px', borderRadius: 24,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
              opacity: is2,
              transform: `translateY(${interpolate(is2, [0, 1], [20, 0])}px)`,
            }}>
              <span style={{ fontFamily: HEEBO, fontSize: F.body, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>{item.desc}</span>
              <span style={{ fontFamily: RUBIK, fontSize: F.body + 4, fontWeight: 900, color: ACCENT.gold }}>{item.price}</span>
            </div>
          );
        })}

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 30, padding: '36px 40px', borderRadius: 24,
          background: `linear-gradient(90deg, ${ACCENT.goldDim} 0%, transparent 100%)`,
          border: `2px solid ${ACCENT.gold}60`,
          boxShadow: `inset 0 0 30px ${ACCENT.gold}10`,
        }}>
          <span style={{ fontFamily: HEEBO, fontSize: F.title - 10, fontWeight: 900, color: BRAND.white }}>סה"כ</span>
          <span style={{ fontFamily: RUBIK, fontSize: F.title - 5, fontWeight: 900, color: ACCENT.gold }}>₪499/חודש</span>
        </div>
      </div>

      <div style={{ height: 220, display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', justifyContent: 'center' }}>
        {frame >= 120 && (
          <div style={{
            padding: '24px 60px', borderRadius: 100,
            background: 'rgba(99, 102, 241, 0.1)', border: `2px solid ${ACCENT.gold}40`,
            fontFamily: RUBIK, fontSize: F.body, fontWeight: 900, color: ACCENT.goldLight,
            opacity: sentSpring,
            transform: `translateY(${interpolate(sentSpring, [0, 1], [20, 0])}px)`,
            boxShadow: `0 10px 40px ${ACCENT.gold}15`,
          }}>
            נשלח ללקוח בוואטסאפ
          </div>
        )}
        {frame >= 160 && (
          <div style={{
            padding: '24px 60px', borderRadius: 100,
            background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.5)',
            fontFamily: RUBIK, fontSize: F.body + 4, fontWeight: 900, color: '#22C55E',
            display: 'flex', alignItems: 'center', gap: 15,
            opacity: approvedSpring,
            transform: `scale(${interpolate(approvedSpring, [0, 1], [0.8, 1])})`,
            boxShadow: '0 15px 50px rgba(34,197,94,0.2)',
          }}>
            <CheckIcon size={44} color="#22C55E" />
            הלקוח אישר
          </div>
        )}
      </div>

      <LogoWatermark opacity={0.3} />
    </SceneContainer>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 4 — CLIENT [0:25–0:35]
// Client card — gold accent
// ═══════════════════════════════════════════════════════════
const ClientScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardSpring = spring({ frame, fps, config: SPRING.heavy, durationInFrames: 25 });
  const driftX = Math.sin(frame * 0.03) * 15;

  const fields = [
    { label: 'שם', value: 'רונית כהן', delay: 20 },
    { label: 'סטטוס', value: 'לקוח פעיל', delay: 35 },
    { label: 'חבילה', value: 'ניהול מלא', delay: 50 },
  ];

  const bottomSpring = spring({ frame: Math.max(0, frame - 160), fps, config: SPRING.punch, durationInFrames: 20 });

  return (
    <SceneContainer style={sceneBg(ACCENT.goldDim, '35%')} focusY="40%">
      <BloomOrb color={ACCENT.gold} size={600} x="50%" y="35%" intensity={0.12} />

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 15,
        opacity: interpolate(frame, [0, 15], [0, 1]),
      }}>
        <div style={{ fontFamily: RUBIK, fontSize: F.label, fontWeight: 900, color: ACCENT.goldLight, letterSpacing: 2 }}>
          תיעוד אוטומטי
        </div>
      </div>

      <div style={{
        width: CARD_W, borderRadius: 40,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(50px)',
        border: `2px solid ${ACCENT.gold}50`,
        boxShadow: `0 40px 100px rgba(0,0,0,0.7), 0 0 80px ${ACCENT.gold}20`,
        padding: '60px 50px',
        opacity: cardSpring,
        transform: `translateX(${driftX}px) translateY(${interpolate(cardSpring, [0, 1], [50, 0])}px) scale(${interpolate(cardSpring, [0, 1], [0.92, 1])})`,
        direction: 'rtl' as const,
      }}>
        <div style={{
          fontFamily: RUBIK, fontSize: F.title, fontWeight: 900, color: BRAND.white,
          marginBottom: 50, textAlign: 'center',
          filter: `drop-shadow(0 0 15px ${ACCENT.gold}30)`
        }}>
          כרטיס לקוח
        </div>

        {fields.map((f2, i) => {
          const fs = spring({ frame: Math.max(0, frame - f2.delay), fps, config: SPRING.ui, durationInFrames: 15 });
          return (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 20, padding: '28px 36px', borderRadius: 24,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
              opacity: fs,
              transform: `translateX(${interpolate(fs, [0, 1], [30, 0])}px)`,
            }}>
              <span style={{ fontFamily: HEEBO, fontSize: F.body, fontWeight: 700, color: 'rgba(255,255,255,0.45)' }}>
                {f2.label}
              </span>
              <span style={{ fontFamily: RUBIK, fontSize: F.body + 4, fontWeight: 900, color: BRAND.white }}>
                {f2.value}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {frame >= 160 && (
          <div style={{
            ...gradientText(F.title, 'gold'),
            opacity: bottomSpring, 
            maxWidth: CARD_W,
            lineHeight: 1.2,
            transform: `scale(${interpolate(bottomSpring, [0, 1], [0.8, 1])})`,
            filter: `drop-shadow(0 0 30px ${ACCENT.gold}30)`,
          }}>
            הכל נשמר אוטומטית.<br />
            <span style={{ fontSize: F.subtitle, opacity: 0.8 }}>בלי אקסלים. בלי טעויות.</span>
          </div>
        )}
      </div>

      <LogoWatermark opacity={0.3} />
    </SceneContainer>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 5 — INVOICE [0:35–0:45]
// Invoice card — gold accent
// ═══════════════════════════════════════════════════════════
const InvoiceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardSpring = spring({ frame, fps, config: SPRING.heavy, durationInFrames: 25 });
  
  const sentSpring = spring({ frame: Math.max(0, frame - 120), fps, config: SPRING.punch, durationInFrames: 18 });
  const paidSpring = spring({ frame: Math.max(0, frame - 160), fps, config: SPRING.punch, durationInFrames: 18 });

  return (
    <SceneContainer style={sceneBg(ACCENT.goldDim, '38%')} focusY="45%">
      <BloomOrb color={ACCENT.gold} size={600} x="50%" y="40%" intensity={0.15} />

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 15,
        opacity: interpolate(frame, [0, 15], [0, 1]),
      }}>
        <div style={{ fontFamily: RUBIK, fontSize: F.label, fontWeight: 900, color: ACCENT.goldLight, letterSpacing: 2 }}>
          גבייה אוטומטית
        </div>
      </div>

      <div style={{
        width: CARD_W, borderRadius: 40,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(50px)',
        border: `2px solid ${ACCENT.gold}50`,
        boxShadow: `0 40px 100px rgba(0,0,0,0.7), 0 0 80px ${ACCENT.gold}20`,
        padding: '60px 50px',
        opacity: cardSpring,
        transform: `translateY(${interpolate(cardSpring, [0, 1], [50, 0])}px) scale(${interpolate(cardSpring, [0, 1], [0.92, 1])})`,
        direction: 'rtl' as const,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 50 }}>
          <div style={{ fontFamily: RUBIK, fontSize: F.title, fontWeight: 900, color: BRAND.white, filter: `drop-shadow(0 0 15px ${ACCENT.gold}30)` }}>
            חשבונית מס #1001
          </div>
        </div>

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 20, padding: '28px 36px', borderRadius: 24,
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <span style={{ fontFamily: HEEBO, fontSize: F.body, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>חבילת ניהול מלא</span>
          <span style={{ fontFamily: RUBIK, fontSize: F.body + 4, fontWeight: 900, color: ACCENT.gold }}>₪499</span>
        </div>

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '36px 40px', borderRadius: 24,
          background: `linear-gradient(90deg, ${ACCENT.goldDim} 0%, transparent 100%)`,
          border: `2px solid ${ACCENT.gold}60`,
          boxShadow: `inset 0 0 30px ${ACCENT.gold}10`,
        }}>
          <span style={{ fontFamily: HEEBO, fontSize: F.title - 10, fontWeight: 900, color: BRAND.white }}>סה"כ</span>
          <span style={{ fontFamily: RUBIK, fontSize: F.title - 5, fontWeight: 900, color: ACCENT.gold }}>₪583.83</span>
        </div>
      </div>

      <div style={{ height: 220, display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', justifyContent: 'center' }}>
        {frame >= 120 && (
          <div style={{
            padding: '24px 60px', borderRadius: 100,
            background: 'rgba(99, 102, 241, 0.1)', border: `2px solid ${ACCENT.gold}40`,
            fontFamily: RUBIK, fontSize: F.body, fontWeight: 900, color: ACCENT.goldLight,
            opacity: sentSpring,
            transform: `translateY(${interpolate(sentSpring, [0, 1], [20, 0])}px)`,
            boxShadow: `0 10px 40px ${ACCENT.gold}15`,
          }}>
            נשלח ללקוח + קישור תשלום
          </div>
        )}
        {frame >= 160 && (
          <div style={{
            padding: '24px 60px', borderRadius: 100,
            background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.5)',
            fontFamily: RUBIK, fontSize: F.body + 4, fontWeight: 900, color: '#22C55E',
            display: 'flex', alignItems: 'center', gap: 15,
            opacity: paidSpring,
            transform: `scale(${interpolate(paidSpring, [0, 1], [0.8, 1])})`,
            boxShadow: '0 15px 50px rgba(34,197,94,0.2)',
          }}>
            <CheckIcon size={44} color="#22C55E" />
            שולם — ₪583.83
          </div>
        )}
      </div>

      <LogoWatermark opacity={0.3} />
    </SceneContainer>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 6 — PROOF [0:45–0:55]
// Pipeline summary. 3 steps. Gold.
// ═══════════════════════════════════════════════════════════
const ProofScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: SPRING.heavy, durationInFrames: 25 });

  const steps = [
    { label: 'ליד ← AI מדרג 87%', delay: 20 },
    { label: 'הצעה ← אושרה בוואטסאפ', delay: 45 },
    { label: 'חשבונית ← שולמה', delay: 70 },
  ];

  const summarySpring = spring({ frame: Math.max(0, frame - 170), fps, config: SPRING.punch, durationInFrames: 20 });

  return (
    <SceneContainer style={sceneBg(ACCENT.goldDim, '38%')} focusY="45%">
      <BloomOrb color={ACCENT.gold} size={600} x="50%" y="40%" intensity={0.15} />

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 15,
        opacity: interpolate(frame, [0, 15], [0, 1]),
      }}>
        <div style={{ fontFamily: RUBIK, fontSize: F.label, fontWeight: 900, color: ACCENT.goldLight, letterSpacing: 2 }}>
          סיכום תהליך
        </div>
      </div>

      <div style={{
        ...gradientText(F.hero, 'warm'),
        opacity: titleSpring,
        transform: `translateY(${interpolate(titleSpring, [0, 1], [30, 0])}px)`,
        filter: `drop-shadow(0 0 20px rgba(255,255,255,0.1))`,
      }}>
        הכל קרה לבד:
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: CARD_W }}>
        {steps.map((step, i) => {
          const ps = spring({ frame: Math.max(0, frame - step.delay), fps, config: SPRING.punch, durationInFrames: 18 });
          return (
            <div key={i} style={{
              ...rowCard(),
              padding: '36px 50px',
              borderRadius: 32,
              background: 'rgba(15, 23, 42, 0.8)',
              border: `2px solid ${ACCENT.gold}40`,
              boxShadow: `0 20px 50px rgba(0,0,0,0.5), 0 0 30px ${ACCENT.gold}10`,
              opacity: ps,
              transform: `translateX(${interpolate(ps, [0, 1], [60, 0])}px) scale(${interpolate(ps, [0, 1], [0.95, 1])})`,
            }}>
              <span style={{ fontFamily: RUBIK, fontSize: F.body + 6, fontWeight: 900, color: BRAND.white }}>{step.label}</span>
              <div style={{ transform: `scale(${interpolate(ps, [0.5, 1], [0, 1], {extrapolateLeft: 'clamp'})})` }}>
                <CheckIcon size={52} color={ACCENT.gold} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {frame >= 170 && (
          <div style={{
            ...gradientText(F.title, 'gold'),
            opacity: summarySpring, 
            maxWidth: CARD_W,
            lineHeight: 1.2,
            transform: `translateY(${interpolate(summarySpring, [0, 1], [20, 0])}px)`,
            filter: `drop-shadow(0 0 30px ${ACCENT.gold}30)`,
          }}>
            העסק זורם. אתה שקט.
          </div>
        )}
      </div>

      <LogoWatermark opacity={0.3} />
    </SceneContainer>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 7 — CTA [0:55–1:15]
// Logo + 2 lines + button. Gold.
// ═══════════════════════════════════════════════════════════
const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const brandSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 20 });

  const tags = [
    'מליד לחשבונית. אוטומטית.',
    'AI שמבין עברית. שומר שבת.',
  ];

  const buttonSpring = spring({ frame: Math.max(0, frame - 200), fps, config: SPRING.punch, durationInFrames: 16 });
  const buttonPulse = frame >= 200 ? Math.sin((frame - 200) * 0.06) * 0.015 + 1 : 1;
  const fadeOut = interpolate(frame, [570, 600], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <SceneContainer style={{ ...sceneBg(ACCENT.goldDim, '38%'), opacity: fadeOut }}>
      <BloomOrb color={ACCENT.gold} size={700} x="50%" y="38%" intensity={0.14} />

      <div style={{
        opacity: brandSpring,
        transform: `scale(${interpolate(brandSpring, [0, 1], [0.75, 1])})`,
        marginBottom: 60,
      }}>
        <MisradLogo size={180} textSize={84} />
      </div>

      <div style={{ textAlign: 'center', direction: 'rtl', maxWidth: CARD_W, marginBottom: 80 }}>
        {tags.map((tag, i) => {
          const ts = spring({ frame: Math.max(0, frame - 30 - i * 10), fps, config: SPRING.ui, durationInFrames: 14 });
          return (
            <div key={i} style={{
              fontFamily: HEEBO, fontSize: F.hero - 10, fontWeight: 900,
              color: 'rgba(255,255,255,0.85)', marginBottom: 20, opacity: ts,
              lineHeight: 1.2,
            }}>
              {tag}
            </div>
          );
        })}
      </div>

      {frame >= 200 && (
        <div style={{
          padding: '36px 110px', borderRadius: 80,
          background: `linear-gradient(135deg, ${ACCENT.gold} 0%, ${ACCENT.goldLight} 100%)`,
          boxShadow: `0 25px 80px ${ACCENT.gold}60`,
          opacity: buttonSpring,
          transform: `scale(${interpolate(buttonSpring, [0, 1], [0.8, 1]) * buttonPulse})`,
          marginBottom: 50,
        }}>
          <span style={{ fontFamily: RUBIK, fontSize: F.hero - 20, fontWeight: 900, color: '#0A0A0F' }}>
            להתחיל — חינם
          </span>
        </div>
      )}

      {frame >= 230 && (
        <div style={{
          fontFamily: RUBIK, fontSize: F.body, fontWeight: 800,
          color: 'rgba(255,255,255,0.6)', letterSpacing: 4,
          opacity: spring({ frame: Math.max(0, frame - 230), fps, config: SPRING.ui, durationInFrames: 14 }),
        }}>
          <span dir="ltr">misrad-ai.com</span>
        </div>
      )}

      <LogoWatermark opacity={0.3} />
    </SceneContainer>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPOSITION
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
