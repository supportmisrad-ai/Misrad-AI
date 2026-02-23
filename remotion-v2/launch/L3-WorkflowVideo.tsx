import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from 'remotion';
import { BRAND, HEEBO, RUBIK, SPRING, MODULE_COLORS } from '../shared/config';
import { L3_TIMING, WARM } from './shared/launch-config';
import {
  F, CARD_W, gradientText, sceneBg, fillCenter, fillTop, fillSpread,
  glassCard, rowCard, statCard,
  MisradLogo, LogoWatermark, BloomOrb, GrainOverlay,
  CheckIcon, LockClosedIcon, ShieldCheckIcon, CalendarIcon, FlowArrow,
} from './shared/launch-design';

const T = L3_TIMING;

const STEP_COLORS = {
  call: MODULE_COLORS.system.accent,
  quote: MODULE_COLORS.finance.accent,
  client: MODULE_COLORS.client.accent,
  invoice: '#22C55E',
};

// ═══════════════════════════════════════════════════════════
// SCENE 1 — HOOK: "מליד לחשבונית" [0:00–0:05] 150f
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 24 });
  const titleSpring = spring({ frame: Math.max(0, frame - 30), fps, config: SPRING.hero, durationInFrames: 22 });
  const subSpring = spring({ frame: Math.max(0, frame - 60), fps, config: SPRING.ui, durationInFrames: 18 });

  const steps = ['ליד', 'שיחה', 'הצעה', 'חתימה', 'חשבונית'];
  const pipeProgress = interpolate(frame, [70, 140], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ ...sceneBg('rgba(99,102,241,0.1)', '35%'), ...fillCenter }}>
      <BloomOrb color={BRAND.indigo} size={700} x="50%" y="35%" intensity={0.14} />
      <BloomOrb color={BRAND.primary} size={400} x="30%" y="70%" intensity={0.06} />

      {/* Logo */}
      <div style={{
        opacity: logoSpring,
        transform: `scale(${interpolate(logoSpring, [0, 1], [0.7, 1])})`,
        marginBottom: 50,
      }}>
        <MisradLogo size={100} textSize={48} />
      </div>

      {/* Title */}
      <div style={{
        ...gradientText(F.hero, 'brand'),
        opacity: titleSpring,
        transform: `translateY(${interpolate(titleSpring, [0, 1], [30, 0])}px)`,
        marginBottom: 24,
      }}>
        מליד לחשבונית
      </div>

      {/* Subtitle */}
      <div style={{
        fontFamily: HEEBO, fontSize: F.subtitle, fontWeight: 700,
        color: 'rgba(255,255,255,0.75)', direction: 'rtl', textAlign: 'center',
        opacity: subSpring,
        transform: `translateY(${interpolate(subSpring, [0, 1], [20, 0])}px)`,
        maxWidth: CARD_W, marginBottom: 80,
      }}>
        בלי לגעת באקסל. בלי לשכוח אף שלב.
      </div>

      {/* Pipeline — large pills */}
      {frame >= 70 && (
        <div style={{
          width: CARD_W, display: 'flex', justifyContent: 'center',
          flexWrap: 'wrap', gap: 14, direction: 'rtl' as const,
        }}>
          {steps.map((step, i) => {
            const sp = interpolate(pipeProgress,
              [i / steps.length, (i + 0.8) / steps.length], [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const lit = sp > 0.5;
            return (
              <React.Fragment key={i}>
                <div style={{
                  padding: '18px 34px', borderRadius: 22,
                  background: lit ? `${BRAND.primary}22` : 'rgba(255,255,255,0.05)',
                  border: `2px solid ${lit ? BRAND.primary + '55' : 'rgba(255,255,255,0.1)'}`,
                  fontFamily: HEEBO, fontSize: F.label + 2, fontWeight: 800,
                  color: lit ? BRAND.white : 'rgba(255,255,255,0.4)',
                  boxShadow: lit ? `0 0 30px ${BRAND.primary}15` : 'none',
                  transform: `scale(${interpolate(sp, [0, 1], [0.88, 1])})`,
                  opacity: Math.max(0.4, sp),
                }}>
                  {step}
                </div>
                {i < steps.length - 1 && <FlowArrow size={28} color={lit ? `${BRAND.primary}60` : 'rgba(255,255,255,0.15)'} />}
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
// SCENE 2 — CALL: "השיחה" [0:05–0:15] 300f
// Call UI mockup — fills most of screen
// ═══════════════════════════════════════════════════════════
const CallScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 22 });

  const callDetails = [
    { label: 'ליד חדש', value: 'רונית כהן', delay: 20 },
    { label: 'טלפון', value: '054-9876543', delay: 35 },
    { label: 'מקור', value: 'אתר — טופס יצירת קשר', delay: 50 },
    { label: 'ציון AI', value: '87%', delay: 65 },
  ];

  const aiSpring = spring({ frame: Math.max(0, frame - 160), fps, config: SPRING.hero, durationInFrames: 22 });
  const callSec = Math.min(Math.floor(frame / 30), 8);
  const callTimer = `0${Math.floor(callSec / 60)}:${String(callSec % 60).padStart(2, '0')}`;

  return (
    <AbsoluteFill style={{ ...sceneBg(`${STEP_COLORS.call}0C`, '35%'), ...fillSpread }}>
      <BloomOrb color={STEP_COLORS.call} size={500} x="50%" y="30%" intensity={0.1} />

      {/* Call card — BIG */}
      <div style={{
        width: CARD_W, borderRadius: 36,
        background: 'rgba(255,255,255,0.05)',
        border: `2px solid rgba(255,255,255,0.1)`,
        backdropFilter: 'blur(20px)',
        padding: '44px 48px',
        opacity: cardSpring,
        transform: `translateY(${interpolate(cardSpring, [0, 1], [40, 0])}px)`,
        direction: 'rtl' as const,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: HEEBO, fontSize: F.title - 4, fontWeight: 800, color: STEP_COLORS.call }}>
            שיחה נכנסת
          </div>
          <div style={{
            padding: '10px 24px', borderRadius: 16,
            background: `${STEP_COLORS.call}20`, border: `1.5px solid ${STEP_COLORS.call}45`,
            fontFamily: RUBIK, fontSize: F.label, fontWeight: 700, color: STEP_COLORS.call,
          }}>
            {callTimer}
          </div>
        </div>

        {/* Detail rows */}
        {callDetails.map((item, i) => {
          const ds = spring({ frame: Math.max(0, frame - item.delay), fps, config: SPRING.ui, durationInFrames: 16 });
          return (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 18, padding: '18px 24px', borderRadius: 18,
              background: i === 3 ? `${STEP_COLORS.call}14` : 'rgba(255,255,255,0.03)',
              border: `1.5px solid ${i === 3 ? STEP_COLORS.call + '35' : 'rgba(255,255,255,0.07)'}`,
              opacity: ds, transform: `translateX(${interpolate(ds, [0, 1], [40, 0])}px)`,
            }}>
              <span style={{ fontFamily: HEEBO, fontSize: F.label, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>
                {item.label}
              </span>
              <span style={{
                fontFamily: HEEBO, fontSize: F.label, fontWeight: 800,
                color: i === 3 ? STEP_COLORS.call : BRAND.white,
              }}>
                {item.value}
              </span>
            </div>
          );
        })}
      </div>

      {/* AI badge */}
      {frame >= 160 && (
        <div style={{
          ...gradientText(F.subtitle + 4, 'brand'),
          opacity: aiSpring,
          transform: `scale(${interpolate(aiSpring, [0, 1], [0.92, 1])})`,
          maxWidth: CARD_W,
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
// SCENE 3 — QUOTE: "הצעת מחיר" [0:15–0:25] 300f
// ═══════════════════════════════════════════════════════════
const QuoteScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 22 });

  const items = [
    { desc: 'חבילת ניהול עסקי — the_empire', price: '₪499/חודש' },
    { desc: 'הטמעה + הדרכה', price: '₪0 (כלול)' },
    { desc: 'תמיכה ושדרוגים', price: '₪0 (כלול)' },
  ];

  const sentSpring = spring({ frame: Math.max(0, frame - 190), fps, config: SPRING.punch, durationInFrames: 18 });
  const approvedSpring = spring({ frame: Math.max(0, frame - 240), fps, config: SPRING.punch, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ ...sceneBg(`${STEP_COLORS.quote}08`, '38%'), ...fillSpread }}>
      <BloomOrb color={STEP_COLORS.quote} size={500} x="50%" y="30%" intensity={0.1} />

      {/* Quote card */}
      <div style={{
        width: CARD_W, borderRadius: 36,
        background: 'rgba(255,255,255,0.05)',
        border: `2px solid rgba(255,255,255,0.1)`,
        backdropFilter: 'blur(20px)',
        padding: '44px 48px',
        opacity: cardSpring,
        transform: `translateY(${interpolate(cardSpring, [0, 1], [40, 0])}px)`,
        direction: 'rtl' as const,
      }}>
        <div style={{
          fontFamily: HEEBO, fontSize: F.title - 4, fontWeight: 800, color: STEP_COLORS.quote,
          marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <CheckIcon size={44} color={STEP_COLORS.quote} />
          הצעת מחיר — רונית כהן
        </div>

        {items.map((item, i) => {
          const is2 = spring({ frame: Math.max(0, frame - 30 - i * 16), fps, config: SPRING.ui, durationInFrames: 16 });
          return (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 18, padding: '20px 28px', borderRadius: 18,
              background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.07)',
              opacity: is2, transform: `translateX(${interpolate(is2, [0, 1], [30, 0])}px)`,
            }}>
              <span style={{ fontFamily: HEEBO, fontSize: F.label + 2, fontWeight: 600, color: BRAND.white }}>{item.desc}</span>
              <span style={{ fontFamily: RUBIK, fontSize: F.label + 2, fontWeight: 800, color: STEP_COLORS.quote }}>{item.price}</span>
            </div>
          );
        })}

        {/* Total */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 14, padding: '22px 28px', borderRadius: 18,
          background: `${STEP_COLORS.quote}14`, border: `1.5px solid ${STEP_COLORS.quote}35`,
        }}>
          <span style={{ fontFamily: HEEBO, fontSize: F.body, fontWeight: 800, color: BRAND.white }}>סה"כ</span>
          <span style={{ fontFamily: RUBIK, fontSize: F.body, fontWeight: 800, color: STEP_COLORS.quote }}>₪499/חודש</span>
        </div>
      </div>

      {/* Status badges */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center' }}>
        {frame >= 190 && (
          <div style={{
            padding: '18px 44px', borderRadius: 24,
            background: `${STEP_COLORS.quote}12`, border: `1.5px solid ${STEP_COLORS.quote}35`,
            fontFamily: HEEBO, fontSize: F.label + 2, fontWeight: 800, color: STEP_COLORS.quote,
            opacity: sentSpring, transform: `scale(${interpolate(sentSpring, [0, 1], [0.85, 1])})`,
          }}>
            נשלח ללקוח בוואטסאפ
          </div>
        )}
        {frame >= 240 && (
          <div style={{
            padding: '18px 44px', borderRadius: 24,
            background: 'rgba(34,197,94,0.12)', border: '1.5px solid rgba(34,197,94,0.35)',
            fontFamily: HEEBO, fontSize: F.label + 2, fontWeight: 800, color: '#22C55E',
            display: 'flex', alignItems: 'center', gap: 14,
            opacity: approvedSpring, transform: `scale(${interpolate(approvedSpring, [0, 1], [0.85, 1])})`,
          }}>
            <CheckIcon size={36} color="#22C55E" />
            הלקוח אישר את ההצעה
          </div>
        )}
      </div>

      <LogoWatermark />
      <GrainOverlay />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 4 — CLIENT: "כרטיס לקוח" [0:25–0:35] 300f
// ═══════════════════════════════════════════════════════════
const ClientScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 22 });

  const fields = [
    { label: 'שם', value: 'רונית כהן', delay: 20 },
    { label: 'חברה', value: 'סטודיו רונית', delay: 35 },
    { label: 'סטטוס', value: 'לקוח פעיל', delay: 50 },
    { label: 'חבילה', value: 'the_empire', delay: 65 },
    { label: 'שיחות', value: '3 שיחות', delay: 80 },
    { label: 'הצעות', value: '1 — אושרה', delay: 95 },
  ];

  const bottomSpring = spring({ frame: Math.max(0, frame - 210), fps, config: SPRING.hero, durationInFrames: 22 });

  return (
    <AbsoluteFill style={{ ...sceneBg(`${STEP_COLORS.client}08`, '35%'), ...fillSpread }}>
      <BloomOrb color={STEP_COLORS.client} size={500} x="50%" y="30%" intensity={0.1} />

      {/* Client card */}
      <div style={{
        width: CARD_W, borderRadius: 36,
        background: 'rgba(255,255,255,0.05)',
        border: `2px solid rgba(255,255,255,0.1)`,
        backdropFilter: 'blur(20px)',
        padding: '44px 48px',
        opacity: cardSpring,
        transform: `translateY(${interpolate(cardSpring, [0, 1], [40, 0])}px)`,
        direction: 'rtl' as const,
      }}>
        <div style={{
          fontFamily: HEEBO, fontSize: F.title - 4, fontWeight: 800, color: STEP_COLORS.client,
          marginBottom: 32,
        }}>
          כרטיס לקוח — רונית כהן
        </div>

        {fields.map((f2, i) => {
          const fs = spring({ frame: Math.max(0, frame - f2.delay), fps, config: SPRING.ui, durationInFrames: 16 });
          return (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 16, padding: '16px 24px', borderRadius: 16,
              background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.07)',
              opacity: fs, transform: `translateX(${interpolate(fs, [0, 1], [30, 0])}px)`,
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

      {/* Bottom */}
      {frame >= 210 && (
        <div style={{
          ...gradientText(F.subtitle + 4, 'brand'),
          opacity: bottomSpring,
          transform: `scale(${interpolate(bottomSpring, [0, 1], [0.92, 1])})`,
          maxWidth: CARD_W,
        }}>
          הכל נשמר אוטומטית. בלי לגעת באקסל.
        </div>
      )}

      <LogoWatermark />
      <GrainOverlay />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 5 — INVOICE: "חשבונית" [0:35–0:45] 300f
// ═══════════════════════════════════════════════════════════
const InvoiceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 22 });

  const rows = [
    { desc: 'חבילת the_empire — חודש ראשון', amount: '₪499' },
    { desc: 'מע"מ (17%)', amount: '₪84.83' },
  ];

  const sentSpring = spring({ frame: Math.max(0, frame - 170), fps, config: SPRING.punch, durationInFrames: 18 });
  const paidSpring = spring({ frame: Math.max(0, frame - 230), fps, config: SPRING.punch, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ ...sceneBg(`${STEP_COLORS.invoice}08`, '38%'), ...fillSpread }}>
      <BloomOrb color={STEP_COLORS.invoice} size={500} x="50%" y="30%" intensity={0.1} />

      {/* Invoice card */}
      <div style={{
        width: CARD_W, borderRadius: 36,
        background: 'rgba(255,255,255,0.05)',
        border: `2px solid rgba(255,255,255,0.1)`,
        backdropFilter: 'blur(20px)',
        padding: '44px 48px',
        opacity: cardSpring,
        transform: `translateY(${interpolate(cardSpring, [0, 1], [40, 0])}px)`,
        direction: 'rtl' as const,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: HEEBO, fontSize: F.title - 4, fontWeight: 800, color: STEP_COLORS.invoice }}>
            חשבונית מס #1001
          </div>
          <div style={{
            padding: '10px 24px', borderRadius: 16,
            background: `${STEP_COLORS.invoice}15`, border: `1.5px solid ${STEP_COLORS.invoice}35`,
            fontFamily: HEEBO, fontSize: F.label, fontWeight: 700, color: STEP_COLORS.invoice,
          }}>
            רונית כהן
          </div>
        </div>

        {rows.map((row, i) => {
          const rs = spring({ frame: Math.max(0, frame - 30 - i * 16), fps, config: SPRING.ui, durationInFrames: 16 });
          return (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 18, padding: '20px 28px', borderRadius: 18,
              background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.07)',
              opacity: rs,
            }}>
              <span style={{ fontFamily: HEEBO, fontSize: F.label + 2, fontWeight: 600, color: BRAND.white }}>{row.desc}</span>
              <span style={{ fontFamily: RUBIK, fontSize: F.label + 2, fontWeight: 800, color: STEP_COLORS.invoice }}>{row.amount}</span>
            </div>
          );
        })}

        {/* Total */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 14, padding: '22px 28px', borderRadius: 18,
          background: `${STEP_COLORS.invoice}14`, border: `1.5px solid ${STEP_COLORS.invoice}35`,
        }}>
          <span style={{ fontFamily: HEEBO, fontSize: F.body, fontWeight: 800, color: BRAND.white }}>סה"כ לתשלום</span>
          <span style={{ fontFamily: RUBIK, fontSize: F.body, fontWeight: 800, color: STEP_COLORS.invoice }}>₪583.83</span>
        </div>
      </div>

      {/* Status badges */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center' }}>
        {frame >= 170 && (
          <div style={{
            padding: '18px 44px', borderRadius: 24,
            background: `${STEP_COLORS.invoice}12`, border: `1.5px solid ${STEP_COLORS.invoice}35`,
            fontFamily: HEEBO, fontSize: F.label + 2, fontWeight: 800, color: STEP_COLORS.invoice,
            opacity: sentSpring, transform: `scale(${interpolate(sentSpring, [0, 1], [0.85, 1])})`,
          }}>
            נשלח ללקוח + קישור תשלום
          </div>
        )}
        {frame >= 230 && (
          <div style={{
            padding: '18px 44px', borderRadius: 24,
            background: 'rgba(34,197,94,0.12)', border: '1.5px solid rgba(34,197,94,0.35)',
            fontFamily: HEEBO, fontSize: F.label + 2, fontWeight: 800, color: '#22C55E',
            display: 'flex', alignItems: 'center', gap: 14,
            opacity: paidSpring, transform: `scale(${interpolate(paidSpring, [0, 1], [0.85, 1])})`,
          }}>
            <CheckIcon size={36} color="#22C55E" />
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
// SCENE 6 — PROOF: "סיכום התהליך" [0:45–0:55] 300f
// ═══════════════════════════════════════════════════════════
const ProofScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 22 });

  const steps = [
    { label: 'ליד נכנס', status: 'AI מדרג 87%', color: STEP_COLORS.call },
    { label: 'שיחה', status: 'תיעוד אוטומטי', color: STEP_COLORS.call },
    { label: 'הצעת מחיר', status: 'נשלחה + אושרה', color: STEP_COLORS.quote },
    { label: 'כרטיס לקוח', status: 'נוצר אוטומטית', color: STEP_COLORS.client },
    { label: 'חשבונית', status: 'שולמה', color: STEP_COLORS.invoice },
  ];

  const summarySpring = spring({ frame: Math.max(0, frame - 210), fps, config: SPRING.hero, durationInFrames: 22 });

  return (
    <AbsoluteFill style={{ ...sceneBg('rgba(99,102,241,0.07)', '35%'), ...fillSpread }}>
      <BloomOrb color={BRAND.indigo} size={500} x="50%" y="30%" intensity={0.1} />

      {/* Title */}
      <div style={{
        ...gradientText(F.title, 'warm'),
        opacity: titleSpring,
        transform: `translateY(${interpolate(titleSpring, [0, 1], [25, 0])}px)`,
      }}>
        כל התהליך — אוטומטי:
      </div>

      {/* Pipeline steps */}
      <div style={{ width: CARD_W, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {steps.map((step, i) => {
          const ps = spring({ frame: Math.max(0, frame - 20 - i * 16), fps, config: SPRING.ui, durationInFrames: 18 });
          return (
            <div key={i} style={{
              ...rowCard(step.color),
              opacity: ps,
              transform: `translateX(${interpolate(ps, [0, 1], [50, 0])}px)`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <CheckIcon size={40} color={step.color} />
                <span style={{ fontFamily: HEEBO, fontSize: F.body - 2, fontWeight: 800, color: BRAND.white }}>{step.label}</span>
              </div>
              <span style={{ fontFamily: HEEBO, fontSize: F.label, fontWeight: 600, color: step.color }}>{step.status}</span>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {frame >= 210 && (
        <div style={{
          ...gradientText(F.subtitle + 4, 'brand'),
          opacity: summarySpring,
          transform: `scale(${interpolate(summarySpring, [0, 1], [0.92, 1])})`,
          maxWidth: CARD_W,
        }}>
          בלי אקסל. בלי לשכוח. הכל זורם לבד.
        </div>
      )}

      <LogoWatermark />
      <GrainOverlay />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 7 — CTA [0:55–1:15] 600f
// ═══════════════════════════════════════════════════════════
const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const brandSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 24 });

  const tags = [
    'מליד לחשבונית.',
    'בלי לגעת באקסל.',
    'AI שמנהל את התהליך.',
    'ושומרת שבת.',
  ];

  const badges = [
    { icon: <ShieldCheckIcon size={44} color={WARM.amber} />, text: 'שומרת שבת וחג' },
    { icon: <CalendarIcon size={44} color={WARM.amber} />, text: 'לוח עברי מובנה' },
    { icon: <LockClosedIcon size={44} color={WARM.amber} />, text: '7 ימי ניסיון חינם' },
  ];

  const buttonSpring = spring({ frame: Math.max(0, frame - 300), fps, config: SPRING.punch, durationInFrames: 18 });
  const buttonPulse = frame >= 300 ? Math.sin((frame - 300) * 0.06) * 0.015 + 1 : 1;
  const fadeOut = interpolate(frame, [570, 600], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ ...sceneBg(`${BRAND.primary}0C`, '38%'), ...fillCenter, opacity: fadeOut }}>
      <BloomOrb color={BRAND.primary} size={800} x="50%" y="38%" intensity={0.14} />
      <BloomOrb color={BRAND.indigo} size={500} x="35%" y="65%" intensity={0.08} />
      <BloomOrb color={WARM.amber} size={300} x="70%" y="25%" intensity={0.05} />

      {/* Logo — huge */}
      <div style={{
        opacity: brandSpring,
        transform: `scale(${interpolate(brandSpring, [0, 1], [0.75, 1])})`,
        marginBottom: 50,
      }}>
        <MisradLogo size={140} textSize={72} />
      </div>

      {/* Tag lines */}
      <div style={{ textAlign: 'center', direction: 'rtl', marginBottom: 48, maxWidth: CARD_W }}>
        {tags.map((tag, i) => {
          const ts = spring({ frame: Math.max(0, frame - 40 - i * 10), fps, config: SPRING.ui, durationInFrames: 16 });
          return (
            <div key={i} style={{
              fontFamily: HEEBO, fontSize: F.subtitle, fontWeight: 700,
              color: 'rgba(255,255,255,0.7)',
              marginBottom: 14,
              opacity: ts,
              transform: `translateY(${interpolate(ts, [0, 1], [20, 0])}px)`,
            }}>
              {tag}
            </div>
          );
        })}
      </div>

      {/* Badges */}
      {frame >= 150 && (
        <div style={{ display: 'flex', gap: 18, marginBottom: 50, direction: 'rtl' as const, flexWrap: 'wrap', justifyContent: 'center', maxWidth: CARD_W }}>
          {badges.map((badge, i) => {
            const bs = spring({ frame: Math.max(0, frame - 150 - i * 14), fps, config: SPRING.ui, durationInFrames: 16 });
            return (
              <div key={i} style={{
                padding: '18px 32px', borderRadius: 24,
                background: 'rgba(255,255,255,0.05)', border: `1.5px solid ${WARM.amber}30`,
                fontFamily: HEEBO, fontSize: F.label, fontWeight: 700, color: 'rgba(255,255,255,0.7)',
                display: 'flex', alignItems: 'center', gap: 14,
                opacity: bs, transform: `translateY(${interpolate(bs, [0, 1], [15, 0])}px)`,
              }}>
                {badge.icon}
                <span style={{ direction: 'rtl' }}>{badge.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* CTA Button */}
      {frame >= 300 && (
        <div style={{
          padding: '28px 90px', borderRadius: 60,
          background: BRAND.gradient,
          boxShadow: `0 20px 60px ${BRAND.primary}40`,
          opacity: buttonSpring,
          transform: `scale(${interpolate(buttonSpring, [0, 1], [0.8, 1]) * buttonPulse})`,
          marginBottom: 32,
        }}>
          <span style={{ fontFamily: RUBIK, fontSize: F.body + 4, fontWeight: 800, color: '#fff' }}>
            להתחיל — חינם
          </span>
        </div>
      )}

      {/* URL */}
      {frame >= 330 && (
        <div style={{
          fontFamily: RUBIK, fontSize: F.label, fontWeight: 700,
          color: 'rgba(255,255,255,0.5)', letterSpacing: 3,
          opacity: spring({ frame: Math.max(0, frame - 330), fps, config: SPRING.ui, durationInFrames: 16 }),
        }}>
          misrad-ai.com
        </div>
      )}

      <GrainOverlay />
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
