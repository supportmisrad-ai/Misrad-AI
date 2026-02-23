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
  glassCard, rowCard, statCard,
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

  const logoSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 });
  const titleSpring = spring({ frame: Math.max(0, frame - 20), fps, config: SPRING.hero, durationInFrames: 18 });
  const subSpring = spring({ frame: Math.max(0, frame - 40), fps, config: SPRING.ui, durationInFrames: 14 });

  const steps = ['ליד', 'שיחה', 'הצעה', 'חתימה', 'חשבונית'];
  const pipeProgress = interpolate(frame, [60, 130], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ ...sceneBg(ACCENT.goldDim, '38%'), ...safeFill }}>
      <BloomOrb color={ACCENT.gold} size={600} x="50%" y="35%" intensity={0.12} />

      <div style={{
        opacity: logoSpring,
        transform: `scale(${interpolate(logoSpring, [0, 1], [0.7, 1])})`,
      }}>
        <MisradLogo size={100} textSize={48} />
      </div>

      <div style={{
        ...gradientText(F.hero, 'gold'),
        opacity: titleSpring,
        transform: `translateY(${interpolate(titleSpring, [0, 1], [20, 0])}px)`,
        maxWidth: CARD_W,
      }}>
        מליד לחשבונית
      </div>

      <div style={{
        fontFamily: HEEBO, fontSize: F.subtitle, fontWeight: 700,
        color: 'rgba(255,255,255,0.7)', direction: 'rtl', textAlign: 'center',
        opacity: subSpring, maxWidth: CARD_W,
      }}>
        בלי אקסל. בלי לשכוח.
      </div>

      {/* Pipeline pills */}
      {frame >= 60 && (
        <div style={{
          width: CARD_W, display: 'flex', justifyContent: 'center',
          gap: 10, direction: 'rtl' as const,
        }}>
          {steps.map((step, i) => {
            const sp = interpolate(pipeProgress,
              [i / steps.length, (i + 0.8) / steps.length], [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const lit = sp > 0.5;
            return (
              <React.Fragment key={i}>
                <div style={{
                  padding: '14px 26px', borderRadius: 18,
                  background: lit ? ACCENT.goldDim : 'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${lit ? ACCENT.gold + '40' : 'rgba(255,255,255,0.08)'}`,
                  fontFamily: HEEBO, fontSize: F.label, fontWeight: 700,
                  color: lit ? BRAND.white : 'rgba(255,255,255,0.35)',
                  transform: `scale(${interpolate(sp, [0, 1], [0.9, 1])})`,
                  opacity: Math.max(0.4, sp),
                }}>
                  {step}
                </div>
                {i < steps.length - 1 && <FlowArrow size={22} color={lit ? `${ACCENT.gold}50` : 'rgba(255,255,255,0.12)'} />}
              </React.Fragment>
            );
          })}
        </div>
      )}

      <LogoWatermark />
      <GrainOverlay />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 2 — CALL [0:05–0:15]
// Call UI card — centered, gold accent
// ═══════════════════════════════════════════════════════════
const CallScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 });

  const callDetails = [
    { label: 'ליד חדש', value: 'רונית כהן', delay: 15 },
    { label: 'טלפון', value: '054-9876543', delay: 30 },
    { label: 'ציון AI', value: '87%', delay: 45 },
  ];

  const aiSpring = spring({ frame: Math.max(0, frame - 130), fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ ...sceneBg(ACCENT.goldDim, '35%'), ...safeFill }}>
      <BloomOrb color={ACCENT.gold} size={500} x="50%" y="35%" intensity={0.1} />

      {/* Call card */}
      <div style={{
        width: CARD_W, borderRadius: 32,
        background: 'rgba(255,255,255,0.05)',
        border: `1.5px solid ${ACCENT.gold}25`,
        padding: '40px 44px',
        opacity: cardSpring,
        transform: `translateY(${interpolate(cardSpring, [0, 1], [30, 0])}px)`,
        direction: 'rtl' as const,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div style={{ fontFamily: HEEBO, fontSize: F.title - 4, fontWeight: 800, color: ACCENT.gold }}>
            שיחה נכנסת
          </div>
        </div>

        {callDetails.map((item, i) => {
          const ds = spring({ frame: Math.max(0, frame - item.delay), fps, config: SPRING.ui, durationInFrames: 14 });
          return (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 16, padding: '16px 22px', borderRadius: 16,
              background: i === 2 ? ACCENT.goldDim : 'rgba(255,255,255,0.03)',
              border: `1px solid ${i === 2 ? ACCENT.gold + '30' : 'rgba(255,255,255,0.06)'}`,
              opacity: ds,
            }}>
              <span style={{ fontFamily: HEEBO, fontSize: F.label, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>
                {item.label}
              </span>
              <span style={{
                fontFamily: HEEBO, fontSize: F.label, fontWeight: 800,
                color: i === 2 ? ACCENT.gold : BRAND.white,
              }}>
                {item.value}
              </span>
            </div>
          );
        })}
      </div>

      {frame >= 130 && (
        <div style={{
          ...gradientText(F.subtitle, 'gold'),
          opacity: aiSpring, maxWidth: CARD_W,
        }}>
          AI מזהה — ליד חם. 87% סיכוי סגירה.
        </div>
      )}

      <LogoWatermark />
      <GrainOverlay />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 3 — QUOTE [0:15–0:25]
// Quote card — centered, gold
// ═══════════════════════════════════════════════════════════
const QuoteScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 });

  const items = [
    { desc: 'חבילת ניהול עסקי', price: '₪499/חודש' },
    { desc: 'הטמעה + הדרכה', price: 'כלול' },
  ];

  const sentSpring = spring({ frame: Math.max(0, frame - 140), fps, config: SPRING.punch, durationInFrames: 14 });
  const approvedSpring = spring({ frame: Math.max(0, frame - 180), fps, config: SPRING.punch, durationInFrames: 14 });

  return (
    <AbsoluteFill style={{ ...sceneBg(ACCENT.goldDim, '38%'), ...safeFill }}>
      <BloomOrb color={ACCENT.gold} size={500} x="50%" y="35%" intensity={0.1} />

      <div style={{
        width: CARD_W, borderRadius: 32,
        background: 'rgba(255,255,255,0.05)',
        border: `1.5px solid ${ACCENT.gold}25`,
        padding: '40px 44px',
        opacity: cardSpring,
        transform: `translateY(${interpolate(cardSpring, [0, 1], [30, 0])}px)`,
        direction: 'rtl' as const,
      }}>
        <div style={{
          fontFamily: HEEBO, fontSize: F.title - 4, fontWeight: 800, color: ACCENT.gold,
          marginBottom: 28, display: 'flex', alignItems: 'center', gap: 14,
        }}>
          הצעת מחיר — רונית כהן
        </div>

        {items.map((item, i) => {
          const is2 = spring({ frame: Math.max(0, frame - 20 - i * 14), fps, config: SPRING.ui, durationInFrames: 14 });
          return (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 16, padding: '18px 24px', borderRadius: 16,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              opacity: is2,
            }}>
              <span style={{ fontFamily: HEEBO, fontSize: F.label + 2, fontWeight: 600, color: BRAND.white }}>{item.desc}</span>
              <span style={{ fontFamily: RUBIK, fontSize: F.label + 2, fontWeight: 800, color: ACCENT.gold }}>{item.price}</span>
            </div>
          );
        })}

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 10, padding: '20px 24px', borderRadius: 16,
          background: ACCENT.goldDim, border: `1px solid ${ACCENT.gold}30`,
        }}>
          <span style={{ fontFamily: HEEBO, fontSize: F.body, fontWeight: 800, color: BRAND.white }}>סה"כ</span>
          <span style={{ fontFamily: RUBIK, fontSize: F.body, fontWeight: 800, color: ACCENT.gold }}>₪499/חודש</span>
        </div>
      </div>

      {/* Status */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
        {frame >= 140 && (
          <div style={{
            padding: '16px 40px', borderRadius: 22,
            background: ACCENT.goldDim, border: `1px solid ${ACCENT.gold}30`,
            fontFamily: HEEBO, fontSize: F.label, fontWeight: 800, color: ACCENT.gold,
            opacity: sentSpring,
          }}>
            נשלח ללקוח בוואטסאפ
          </div>
        )}
        {frame >= 180 && (
          <div style={{
            padding: '16px 40px', borderRadius: 22,
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
            fontFamily: HEEBO, fontSize: F.label, fontWeight: 800, color: '#22C55E',
            display: 'flex', alignItems: 'center', gap: 12,
            opacity: approvedSpring,
          }}>
            <CheckIcon size={32} color="#22C55E" />
            הלקוח אישר
          </div>
        )}
      </div>

      <LogoWatermark />
      <GrainOverlay />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 4 — CLIENT [0:25–0:35]
// Client card — gold accent
// ═══════════════════════════════════════════════════════════
const ClientScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 });

  const fields = [
    { label: 'שם', value: 'רונית כהן', delay: 15 },
    { label: 'סטטוס', value: 'לקוח פעיל', delay: 30 },
    { label: 'חבילה', value: 'ניהול מלא', delay: 45 },
  ];

  const bottomSpring = spring({ frame: Math.max(0, frame - 160), fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ ...sceneBg(ACCENT.goldDim, '35%'), ...safeFill }}>
      <BloomOrb color={ACCENT.gold} size={500} x="50%" y="35%" intensity={0.1} />

      <div style={{
        width: CARD_W, borderRadius: 32,
        background: 'rgba(255,255,255,0.05)',
        border: `1.5px solid ${ACCENT.gold}25`,
        padding: '40px 44px',
        opacity: cardSpring,
        transform: `translateY(${interpolate(cardSpring, [0, 1], [30, 0])}px)`,
        direction: 'rtl' as const,
      }}>
        <div style={{
          fontFamily: HEEBO, fontSize: F.title - 4, fontWeight: 800, color: ACCENT.gold,
          marginBottom: 28,
        }}>
          כרטיס לקוח — רונית כהן
        </div>

        {fields.map((f2, i) => {
          const fs = spring({ frame: Math.max(0, frame - f2.delay), fps, config: SPRING.ui, durationInFrames: 14 });
          return (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 16, padding: '16px 22px', borderRadius: 16,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              opacity: fs,
            }}>
              <span style={{ fontFamily: HEEBO, fontSize: F.label, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>
                {f2.label}
              </span>
              <span style={{ fontFamily: HEEBO, fontSize: F.label, fontWeight: 800, color: BRAND.white }}>
                {f2.value}
              </span>
            </div>
          );
        })}
      </div>

      {frame >= 160 && (
        <div style={{
          ...gradientText(F.subtitle, 'gold'),
          opacity: bottomSpring, maxWidth: CARD_W,
        }}>
          הכל נשמר אוטומטית. בלי אקסל.
        </div>
      )}

      <LogoWatermark />
      <GrainOverlay />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 5 — INVOICE [0:35–0:45]
// Invoice card — gold accent
// ═══════════════════════════════════════════════════════════
const InvoiceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 });

  const sentSpring = spring({ frame: Math.max(0, frame - 130), fps, config: SPRING.punch, durationInFrames: 14 });
  const paidSpring = spring({ frame: Math.max(0, frame - 170), fps, config: SPRING.punch, durationInFrames: 14 });

  return (
    <AbsoluteFill style={{ ...sceneBg(ACCENT.goldDim, '38%'), ...safeFill }}>
      <BloomOrb color={ACCENT.gold} size={500} x="50%" y="35%" intensity={0.1} />

      <div style={{
        width: CARD_W, borderRadius: 32,
        background: 'rgba(255,255,255,0.05)',
        border: `1.5px solid ${ACCENT.gold}25`,
        padding: '40px 44px',
        opacity: cardSpring,
        transform: `translateY(${interpolate(cardSpring, [0, 1], [30, 0])}px)`,
        direction: 'rtl' as const,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div style={{ fontFamily: HEEBO, fontSize: F.title - 4, fontWeight: 800, color: ACCENT.gold }}>
            חשבונית מס #1001
          </div>
        </div>

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 16, padding: '18px 24px', borderRadius: 16,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <span style={{ fontFamily: HEEBO, fontSize: F.label + 2, fontWeight: 600, color: BRAND.white }}>חבילת ניהול מלא</span>
          <span style={{ fontFamily: RUBIK, fontSize: F.label + 2, fontWeight: 800, color: ACCENT.gold }}>₪499</span>
        </div>

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px', borderRadius: 16,
          background: ACCENT.goldDim, border: `1px solid ${ACCENT.gold}30`,
        }}>
          <span style={{ fontFamily: HEEBO, fontSize: F.body, fontWeight: 800, color: BRAND.white }}>סה"כ</span>
          <span style={{ fontFamily: RUBIK, fontSize: F.body, fontWeight: 800, color: ACCENT.gold }}>₪583.83</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
        {frame >= 130 && (
          <div style={{
            padding: '16px 40px', borderRadius: 22,
            background: ACCENT.goldDim, border: `1px solid ${ACCENT.gold}30`,
            fontFamily: HEEBO, fontSize: F.label, fontWeight: 800, color: ACCENT.gold,
            opacity: sentSpring,
          }}>
            נשלח ללקוח + קישור תשלום
          </div>
        )}
        {frame >= 170 && (
          <div style={{
            padding: '16px 40px', borderRadius: 22,
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
            fontFamily: HEEBO, fontSize: F.label, fontWeight: 800, color: '#22C55E',
            display: 'flex', alignItems: 'center', gap: 12,
            opacity: paidSpring,
          }}>
            <CheckIcon size={32} color="#22C55E" />
            שולם — ₪583.83
          </div>
        )}
      </div>

      <LogoWatermark />
      <GrainOverlay />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 6 — PROOF [0:45–0:55]
// Pipeline summary. 3 steps. Gold.
// ═══════════════════════════════════════════════════════════
const ProofScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 });

  const steps = [
    { label: 'ליד → AI מדרג 87%', delay: 20 },
    { label: 'הצעה → אושרה בוואטסאפ', delay: 45 },
    { label: 'חשבונית → שולמה', delay: 70 },
  ];

  const summarySpring = spring({ frame: Math.max(0, frame - 170), fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ ...sceneBg(ACCENT.goldDim, '38%'), ...safeFill }}>
      <BloomOrb color={ACCENT.gold} size={500} x="50%" y="35%" intensity={0.1} />

      <div style={{
        ...gradientText(F.title, 'warm'),
        opacity: titleSpring,
      }}>
        כל התהליך — אוטומטי:
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: CARD_W }}>
        {steps.map((step, i) => {
          const ps = spring({ frame: Math.max(0, frame - step.delay), fps, config: SPRING.punch, durationInFrames: 14 });
          return (
            <div key={i} style={{
              ...rowCard(),
              opacity: ps,
              transform: `translateX(${interpolate(ps, [0, 1], [40, 0])}px)`,
            }}>
              <span style={{ fontFamily: HEEBO, fontSize: F.body - 2, fontWeight: 800, color: BRAND.white }}>{step.label}</span>
              <CheckIcon size={40} color={ACCENT.gold} />
            </div>
          );
        })}
      </div>

      {frame >= 170 && (
        <div style={{
          ...gradientText(F.subtitle, 'gold'),
          opacity: summarySpring, maxWidth: CARD_W,
        }}>
          בלי אקסל. בלי לשכוח. הכל זורם.
        </div>
      )}

      <LogoWatermark />
      <GrainOverlay />
    </AbsoluteFill>
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
    'AI שמבין עברית. שומרת שבת.',
  ];

  const buttonSpring = spring({ frame: Math.max(0, frame - 200), fps, config: SPRING.punch, durationInFrames: 16 });
  const buttonPulse = frame >= 200 ? Math.sin((frame - 200) * 0.06) * 0.015 + 1 : 1;
  const fadeOut = interpolate(frame, [570, 600], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ ...sceneBg(ACCENT.goldDim, '38%'), ...safeFill, opacity: fadeOut }}>
      <BloomOrb color={ACCENT.gold} size={700} x="50%" y="38%" intensity={0.14} />

      <div style={{
        opacity: brandSpring,
        transform: `scale(${interpolate(brandSpring, [0, 1], [0.75, 1])})`,
      }}>
        <MisradLogo size={140} textSize={72} />
      </div>

      <div style={{ textAlign: 'center', direction: 'rtl', maxWidth: CARD_W }}>
        {tags.map((tag, i) => {
          const ts = spring({ frame: Math.max(0, frame - 30 - i * 10), fps, config: SPRING.ui, durationInFrames: 14 });
          return (
            <div key={i} style={{
              fontFamily: HEEBO, fontSize: F.subtitle, fontWeight: 700,
              color: 'rgba(255,255,255,0.75)', marginBottom: 14, opacity: ts,
            }}>
              {tag}
            </div>
          );
        })}
      </div>

      {frame >= 200 && (
        <div style={{
          padding: '28px 90px', borderRadius: 60,
          background: `linear-gradient(135deg, ${ACCENT.gold} 0%, ${ACCENT.goldLight} 100%)`,
          boxShadow: `0 20px 60px ${ACCENT.gold}40`,
          opacity: buttonSpring,
          transform: `scale(${interpolate(buttonSpring, [0, 1], [0.8, 1]) * buttonPulse})`,
        }}>
          <span style={{ fontFamily: RUBIK, fontSize: F.body + 4, fontWeight: 800, color: '#1A1520' }}>
            להתחיל — חינם
          </span>
        </div>
      )}

      {frame >= 230 && (
        <div style={{
          fontFamily: RUBIK, fontSize: F.label, fontWeight: 700,
          color: 'rgba(255,255,255,0.5)', letterSpacing: 3,
          opacity: spring({ frame: Math.max(0, frame - 230), fps, config: SPRING.ui, durationInFrames: 14 }),
        }}>
          <span dir="ltr">misrad-ai.com</span>
        </div>
      )}

      <GrainOverlay />
    </AbsoluteFill>
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
