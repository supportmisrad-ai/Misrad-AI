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
import { NoiseLayer, TextReveal } from '../shared/components';
import { L3_TIMING, WARM } from './shared/launch-config';
import {
  F, CARD_W, gradientText, sceneBg, fillCenter, glassCard, statCard,
  CheckIcon, LockClosedIcon, ShieldCheckIcon, CalendarIcon, FlowArrow, DangerDot,
} from './shared/launch-design';

const T = L3_TIMING;

const STEP_COLORS = {
  call: MODULE_COLORS.system.accent,
  quote: MODULE_COLORS.finance.accent,
  client: MODULE_COLORS.client.accent,
  invoice: '#22C55E',
};

// ═══════════════════════════════════════════════════════════
// SCENE 1: HOOK — "מליד לחשבונית" [0:00–0:05] frames 0–150
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 22 });
  const subtitleSpring = spring({ frame: Math.max(0, frame - 50), fps, config: SPRING.hero, durationInFrames: 20 });

  const steps = ['ליד', 'שיחה', 'הצעה', 'חתימה', 'חשבונית'];
  const pipelineProgress = interpolate(frame, [60, 140], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ ...sceneBg('rgba(99,102,241,0.06)', '38%'), ...fillCenter }}>
      {/* Title */}
      <div style={{
        ...gradientText(F.hero, 'brand'),
        opacity: titleSpring,
        transform: `scale(${interpolate(titleSpring, [0, 1], [0.88, 1])})`,
        marginBottom: 24,
      }}>
        מליד לחשבונית
      </div>

      {/* Subtitle */}
      {frame >= 50 && (
        <div style={{
          fontFamily: HEEBO, fontSize: F.subtitle, fontWeight: 700,
          color: 'rgba(255,255,255,0.6)', direction: 'rtl',
          opacity: subtitleSpring,
          transform: `translateY(${interpolate(subtitleSpring, [0, 1], [15, 0])}px)`,
        }}>
          בלי לגעת באקסל. בלי לשכוח אף שלב.
        </div>
      )}

      {/* Pipeline preview */}
      {frame >= 60 && (
        <div style={{
          position: 'absolute', bottom: '15%', width: CARD_W,
          display: 'flex', justifyContent: 'center', gap: 10, direction: 'rtl' as const,
        }}>
          {steps.map((step, i) => {
            const sp = interpolate(pipelineProgress,
              [i / steps.length, (i + 0.8) / steps.length], [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const lit = sp > 0.5;
            return (
              <React.Fragment key={i}>
                <div style={{
                  padding: '14px 24px', borderRadius: 18,
                  background: lit ? `${BRAND.primary}25` : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${lit ? BRAND.primary + '50' : 'rgba(255,255,255,0.08)'}`,
                  fontFamily: HEEBO, fontSize: F.label, fontWeight: 700,
                  color: lit ? BRAND.white : 'rgba(255,255,255,0.3)',
                  boxShadow: lit ? `0 0 25px ${BRAND.primary}20` : 'none',
                  transform: `scale(${interpolate(sp, [0, 1], [0.88, 1])})`,
                  opacity: Math.max(0.35, sp),
                }}>
                  {step}
                </div>
                {i < steps.length - 1 && <FlowArrow size={22} color={lit ? `${BRAND.primary}60` : 'rgba(255,255,255,0.12)'} />}
              </React.Fragment>
            );
          })}
        </div>
      )}

      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 2: CALL — "השיחה" [0:05–0:15] frames 0–300
// ═══════════════════════════════════════════════════════════
const CallScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 20 });

  const callDetails = [
    { label: 'ליד חדש', value: 'רונית כהן', delay: 20 },
    { label: 'טלפון', value: '054-9876543', delay: 35 },
    { label: 'מקור', value: 'אתר — טופס יצירת קשר', delay: 50 },
    { label: 'ציון AI', value: '87%', delay: 65 },
  ];

  const aiSpring = spring({ frame: Math.max(0, frame - 140), fps, config: SPRING.hero, durationInFrames: 22 });

  const callTimerSec = Math.min(Math.floor(frame / 30), 8);
  const callTimer = `0${Math.floor(callTimerSec / 60)}:${String(callTimerSec % 60).padStart(2, '0')}`;

  return (
    <AbsoluteFill style={{ ...sceneBg(`${STEP_COLORS.call}08`, '38%'), ...fillCenter }}>
      {/* Call UI mockup — large */}
      <div style={{
        width: CARD_W, borderRadius: 32,
        background: 'rgba(255,255,255,0.04)',
        border: '2px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        padding: '40px 44px',
        opacity: phoneSpring,
        transform: `translateY(${interpolate(phoneSpring, [0, 1], [30, 0])}px)`,
        direction: 'rtl' as const,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div style={{
            fontFamily: HEEBO, fontSize: F.subtitle, fontWeight: 800, color: STEP_COLORS.call,
          }}>
            שיחה נכנסת
          </div>
          <div style={{
            padding: '8px 20px', borderRadius: 14,
            background: `${STEP_COLORS.call}20`, border: `1px solid ${STEP_COLORS.call}40`,
            fontFamily: RUBIK, fontSize: F.label, fontWeight: 700, color: STEP_COLORS.call,
          }}>
            {callTimer}
          </div>
        </div>

        {/* Call details */}
        {callDetails.map((item, i) => {
          const ds = spring({ frame: Math.max(0, frame - item.delay), fps, config: SPRING.ui, durationInFrames: 16 });
          return (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 18, padding: '14px 20px', borderRadius: 16,
              background: i === 3 ? `${STEP_COLORS.call}12` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${i === 3 ? STEP_COLORS.call + '30' : 'rgba(255,255,255,0.06)'}`,
              opacity: ds, transform: `translateX(${interpolate(ds, [0, 1], [30, 0])}px)`,
            }}>
              <span style={{ fontFamily: HEEBO, fontSize: F.label, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>
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

      {/* "AI מזהה — ליד חם" */}
      {frame >= 140 && (
        <div style={{
          position: 'absolute', bottom: '10%', textAlign: 'center', width: '90%',
          ...gradientText(F.subtitle, 'brand'),
          opacity: aiSpring,
          transform: `scale(${interpolate(aiSpring, [0, 1], [0.92, 1])})`,
        }}>
          AI מזהה — ליד חם. 87% סיכוי סגירה.
        </div>
      )}

      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 3: QUOTE — "הצעת מחיר" [0:15–0:25] frames 0–300
// ═══════════════════════════════════════════════════════════
const QuoteScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const quoteSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 22 });

  const quoteItems = [
    { desc: 'חבילת ניהול עסקי — the_empire', price: '₪499/חודש' },
    { desc: 'הטמעה + הדרכה', price: '₪0 (כלול)' },
    { desc: 'תמיכה ושדרוגים', price: '₪0 (כלול)' },
  ];

  const sentSpring = spring({ frame: Math.max(0, frame - 180), fps, config: SPRING.punch, durationInFrames: 18 });
  const approvedSpring = spring({ frame: Math.max(0, frame - 230), fps, config: SPRING.punch, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ ...sceneBg(`${STEP_COLORS.quote}06`, '40%'), ...fillCenter }}>
      {/* Quote card */}
      <div style={{
        width: CARD_W, borderRadius: 32,
        background: 'rgba(255,255,255,0.04)',
        border: '2px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        padding: '40px 44px',
        opacity: quoteSpring,
        transform: `translateY(${interpolate(quoteSpring, [0, 1], [30, 0])}px)`,
        direction: 'rtl' as const,
      }}>
        <div style={{
          fontFamily: HEEBO, fontSize: F.subtitle, fontWeight: 800, color: STEP_COLORS.quote,
          marginBottom: 28, display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <CheckIcon size={36} color={STEP_COLORS.quote} />
          הצעת מחיר — רונית כהן
        </div>

        {quoteItems.map((item, i) => {
          const is = spring({ frame: Math.max(0, frame - 30 - i * 14), fps, config: SPRING.ui, durationInFrames: 16 });
          return (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 16, padding: '16px 22px', borderRadius: 16,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              opacity: is, transform: `translateX(${interpolate(is, [0, 1], [25, 0])}px)`,
            }}>
              <span style={{ fontFamily: HEEBO, fontSize: F.label, fontWeight: 600, color: BRAND.white }}>{item.desc}</span>
              <span style={{ fontFamily: RUBIK, fontSize: F.label, fontWeight: 800, color: STEP_COLORS.quote }}>{item.price}</span>
            </div>
          );
        })}

        {/* Total */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 12, padding: '18px 22px', borderRadius: 16,
          background: `${STEP_COLORS.quote}12`, border: `1px solid ${STEP_COLORS.quote}30`,
        }}>
          <span style={{ fontFamily: HEEBO, fontSize: F.body, fontWeight: 800, color: BRAND.white }}>סה"כ</span>
          <span style={{ fontFamily: RUBIK, fontSize: F.body, fontWeight: 800, color: STEP_COLORS.quote }}>₪499/חודש</span>
        </div>
      </div>

      {/* "נשלח בוואטסאפ" badge */}
      {frame >= 180 && (
        <div style={{
          position: 'absolute', bottom: '22%',
          padding: '14px 36px', borderRadius: 20,
          background: `${STEP_COLORS.quote}15`, border: `1px solid ${STEP_COLORS.quote}35`,
          fontFamily: HEEBO, fontSize: F.label, fontWeight: 800, color: STEP_COLORS.quote,
          opacity: sentSpring, transform: `scale(${interpolate(sentSpring, [0, 1], [0.8, 1])})`,
        }}>
          נשלח ללקוח בוואטסאפ
        </div>
      )}

      {/* "הלקוח אישר" */}
      {frame >= 230 && (
        <div style={{
          position: 'absolute', bottom: '12%',
          padding: '14px 36px', borderRadius: 20,
          background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
          fontFamily: HEEBO, fontSize: F.label, fontWeight: 800, color: '#22C55E',
          display: 'flex', alignItems: 'center', gap: 12,
          opacity: approvedSpring, transform: `scale(${interpolate(approvedSpring, [0, 1], [0.8, 1])})`,
        }}>
          <CheckIcon size={28} color="#22C55E" />
          הלקוח אישר את ההצעה
        </div>
      )}

      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 4: CLIENT — "כרטיס לקוח" [0:25–0:35] frames 0–300
// ═══════════════════════════════════════════════════════════
const ClientScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 22 });

  const clientFields = [
    { label: 'שם', value: 'רונית כהן', delay: 20 },
    { label: 'חברה', value: 'סטודיו רונית', delay: 32 },
    { label: 'סטטוס', value: 'לקוח פעיל', delay: 44 },
    { label: 'חבילה', value: 'the_empire', delay: 56 },
    { label: 'שיחות', value: '3 שיחות', delay: 68 },
    { label: 'הצעות', value: '1 — אושרה', delay: 80 },
  ];

  const portalSpring = spring({ frame: Math.max(0, frame - 200), fps, config: SPRING.hero, durationInFrames: 22 });

  return (
    <AbsoluteFill style={{ ...sceneBg(`${STEP_COLORS.client}06`, '38%'), ...fillCenter }}>
      {/* Client card */}
      <div style={{
        width: CARD_W, borderRadius: 32,
        background: 'rgba(255,255,255,0.04)',
        border: '2px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        padding: '40px 44px',
        opacity: cardSpring,
        transform: `translateY(${interpolate(cardSpring, [0, 1], [30, 0])}px)`,
        direction: 'rtl' as const,
      }}>
        <div style={{
          fontFamily: HEEBO, fontSize: F.subtitle, fontWeight: 800, color: STEP_COLORS.client,
          marginBottom: 28,
        }}>
          כרטיס לקוח — רונית כהן
        </div>

        {clientFields.map((field, i) => {
          const fs = spring({ frame: Math.max(0, frame - field.delay), fps, config: SPRING.ui, durationInFrames: 16 });
          return (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 14, padding: '12px 18px', borderRadius: 14,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              opacity: fs, transform: `translateX(${interpolate(fs, [0, 1], [25, 0])}px)`,
            }}>
              <span style={{ fontFamily: HEEBO, fontSize: F.label - 2, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>
                {field.label}
              </span>
              <span style={{ fontFamily: HEEBO, fontSize: F.label - 2, fontWeight: 800, color: BRAND.white }}>
                {field.value}
              </span>
            </div>
          );
        })}
      </div>

      {/* "הכל נשמר אוטומטית" */}
      {frame >= 200 && (
        <div style={{
          position: 'absolute', bottom: '10%', textAlign: 'center', width: '90%',
          ...gradientText(F.subtitle, 'brand'),
          opacity: portalSpring,
          transform: `scale(${interpolate(portalSpring, [0, 1], [0.92, 1])})`,
        }}>
          הכל נשמר אוטומטית. בלי לגעת באקסל.
        </div>
      )}

      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 5: INVOICE — "חשבונית" [0:35–0:45] frames 0–300
// ═══════════════════════════════════════════════════════════
const InvoiceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const invoiceSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 22 });

  const invoiceRows = [
    { desc: 'חבילת the_empire — חודש ראשון', amount: '₪499' },
    { desc: 'מע"מ (17%)', amount: '₪84.83' },
  ];

  const sentSpring = spring({ frame: Math.max(0, frame - 160), fps, config: SPRING.punch, durationInFrames: 18 });
  const paidSpring = spring({ frame: Math.max(0, frame - 220), fps, config: SPRING.punch, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ ...sceneBg(`${STEP_COLORS.invoice}06`, '40%'), ...fillCenter }}>
      {/* Invoice card */}
      <div style={{
        width: CARD_W, borderRadius: 32,
        background: 'rgba(255,255,255,0.04)',
        border: '2px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        padding: '40px 44px',
        opacity: invoiceSpring,
        transform: `translateY(${interpolate(invoiceSpring, [0, 1], [30, 0])}px)`,
        direction: 'rtl' as const,
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28,
        }}>
          <div style={{ fontFamily: HEEBO, fontSize: F.subtitle, fontWeight: 800, color: STEP_COLORS.invoice }}>
            חשבונית מס #1001
          </div>
          <div style={{
            padding: '8px 20px', borderRadius: 14,
            background: `${STEP_COLORS.invoice}15`, border: `1px solid ${STEP_COLORS.invoice}35`,
            fontFamily: HEEBO, fontSize: F.label - 2, fontWeight: 700, color: STEP_COLORS.invoice,
          }}>
            רונית כהן
          </div>
        </div>

        {invoiceRows.map((row, i) => {
          const rs = spring({ frame: Math.max(0, frame - 30 - i * 14), fps, config: SPRING.ui, durationInFrames: 16 });
          return (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 14, padding: '16px 22px', borderRadius: 16,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              opacity: rs,
            }}>
              <span style={{ fontFamily: HEEBO, fontSize: F.label, fontWeight: 600, color: BRAND.white }}>{row.desc}</span>
              <span style={{ fontFamily: RUBIK, fontSize: F.label, fontWeight: 800, color: STEP_COLORS.invoice }}>{row.amount}</span>
            </div>
          );
        })}

        {/* Total */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 12, padding: '18px 22px', borderRadius: 16,
          background: `${STEP_COLORS.invoice}12`, border: `1px solid ${STEP_COLORS.invoice}30`,
        }}>
          <span style={{ fontFamily: HEEBO, fontSize: F.body, fontWeight: 800, color: BRAND.white }}>סה"כ לתשלום</span>
          <span style={{ fontFamily: RUBIK, fontSize: F.body, fontWeight: 800, color: STEP_COLORS.invoice }}>₪583.83</span>
        </div>
      </div>

      {/* "נשלח + קישור תשלום" */}
      {frame >= 160 && (
        <div style={{
          position: 'absolute', bottom: '20%',
          padding: '14px 36px', borderRadius: 20,
          background: `${STEP_COLORS.invoice}12`, border: `1px solid ${STEP_COLORS.invoice}30`,
          fontFamily: HEEBO, fontSize: F.label, fontWeight: 800, color: STEP_COLORS.invoice,
          opacity: sentSpring, transform: `scale(${interpolate(sentSpring, [0, 1], [0.8, 1])})`,
        }}>
          נשלח ללקוח + קישור תשלום
        </div>
      )}

      {/* "שולם" */}
      {frame >= 220 && (
        <div style={{
          position: 'absolute', bottom: '10%',
          padding: '14px 36px', borderRadius: 20,
          background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
          fontFamily: HEEBO, fontSize: F.label, fontWeight: 800, color: '#22C55E',
          display: 'flex', alignItems: 'center', gap: 12,
          opacity: paidSpring, transform: `scale(${interpolate(paidSpring, [0, 1], [0.8, 1])})`,
        }}>
          <CheckIcon size={28} color="#22C55E" />
          שולם — ₪583.83
        </div>
      )}

      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 6: PROOF — "סיכום התהליך" [0:45–0:55] frames 0–300
// ═══════════════════════════════════════════════════════════
const ProofScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pipelineSteps = [
    { label: 'ליד נכנס', status: 'AI מדרג 87%', color: STEP_COLORS.call },
    { label: 'שיחה', status: 'תיעוד אוטומטי', color: STEP_COLORS.call },
    { label: 'הצעת מחיר', status: 'נשלחה + אושרה', color: STEP_COLORS.quote },
    { label: 'כרטיס לקוח', status: 'נוצר אוטומטית', color: STEP_COLORS.client },
    { label: 'חשבונית', status: 'שולמה', color: STEP_COLORS.invoice },
  ];

  const summarySpring = spring({ frame: Math.max(0, frame - 200), fps, config: SPRING.hero, durationInFrames: 22 });

  return (
    <AbsoluteFill style={{ ...sceneBg('rgba(99,102,241,0.05)', '40%'), ...fillCenter }}>
      {/* Pipeline summary */}
      <div style={{ position: 'absolute', top: '8%', width: CARD_W, direction: 'rtl' as const }}>
        <div style={{
          fontFamily: HEEBO, fontSize: F.subtitle, fontWeight: 800, color: BRAND.white,
          marginBottom: 24,
          opacity: spring({ frame, fps, config: SPRING.ui, durationInFrames: 16 }),
        }}>
          כל התהליך — אוטומטי:
        </div>
        {pipelineSteps.map((step, i) => {
          const ps = spring({ frame: Math.max(0, frame - 20 - i * 14), fps, config: SPRING.ui, durationInFrames: 18 });
          return (
            <div key={i} style={{
              ...glassCard(step.color), marginBottom: 14,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              opacity: ps, transform: `translateX(${interpolate(ps, [0, 1], [40, 0])}px)`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <CheckIcon size={32} color={step.color} />
                <span style={{ fontFamily: HEEBO, fontSize: F.body - 4, fontWeight: 700, color: BRAND.white }}>{step.label}</span>
              </div>
              <span style={{ fontFamily: HEEBO, fontSize: F.label - 2, fontWeight: 600, color: step.color }}>{step.status}</span>
            </div>
          );
        })}
      </div>

      {/* "בלי אקסל. בלי לשכוח." */}
      {frame >= 200 && (
        <div style={{
          position: 'absolute', bottom: '10%', textAlign: 'center', width: '90%',
          ...gradientText(F.subtitle + 4, 'brand'),
          opacity: summarySpring,
          transform: `scale(${interpolate(summarySpring, [0, 1], [0.92, 1])})`,
        }}>
          בלי אקסל. בלי לשכוח. הכל זורם לבד.
        </div>
      )}

      <NoiseLayer opacity={0.015} />
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
  const tags = ['מליד לחשבונית.', 'בלי לגעת באקסל.', 'AI שמנהל את התהליך.', 'ושומרת שבת.'];

  const badges = [
    { icon: <ShieldCheckIcon size={36} color={WARM.amber} />, text: 'שומרת שבת וחג' },
    { icon: <CalendarIcon size={36} color={WARM.amber} />, text: 'לוח עברי מובנה' },
    { icon: <LockClosedIcon size={36} color={WARM.amber} />, text: '7 ימי ניסיון חינם' },
  ];

  const buttonSpring = spring({ frame: Math.max(0, frame - 300), fps, config: SPRING.punch, durationInFrames: 18 });
  const buttonPulse = frame >= 300 ? Math.sin((frame - 300) * 0.06) * 0.02 + 1 : 1;
  const fadeOut = interpolate(frame, [570, 600], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ ...sceneBg(`${BRAND.primary}08`, '35%'), ...fillCenter, opacity: fadeOut }}>
      {/* Glow */}
      <div style={{
        position: 'absolute', width: 700, height: 700, borderRadius: '50%',
        background: `radial-gradient(circle, ${BRAND.primary}10 0%, transparent 65%)`,
        transform: `scale(${1 + Math.sin(frame * 0.03) * 0.08})`,
      }} />

      {/* "MISRAD AI" */}
      <div style={{
        fontFamily: RUBIK, fontSize: 96, fontWeight: 800, color: BRAND.white,
        letterSpacing: 4, opacity: brandSpring,
        transform: `scale(${interpolate(brandSpring, [0, 1], [0.85, 1])})`,
        textShadow: `0 0 60px ${BRAND.primary}30`, marginBottom: 24,
      }}>
        MISRAD AI
      </div>

      {/* Tag lines */}
      <div style={{ textAlign: 'center', direction: 'rtl', marginBottom: 40 }}>
        {tags.map((tag, i) => {
          const ts = spring({ frame: Math.max(0, frame - 30 - i * 8), fps, config: SPRING.ui, durationInFrames: 16 });
          return (
            <div key={i} style={{
              fontFamily: HEEBO, fontSize: F.subtitle, fontWeight: 700, color: 'rgba(255,255,255,0.6)',
              marginBottom: 8, opacity: ts, transform: `translateY(${interpolate(ts, [0, 1], [18, 0])}px)`,
            }}>
              {tag}
            </div>
          );
        })}
      </div>

      {/* Badges */}
      {frame >= 150 && (
        <div style={{ display: 'flex', gap: 20, marginBottom: 48, direction: 'rtl' as const }}>
          {badges.map((badge, i) => {
            const bs = spring({ frame: Math.max(0, frame - 150 - i * 12), fps, config: SPRING.ui, durationInFrames: 16 });
            return (
              <div key={i} style={{
                padding: '14px 28px', borderRadius: 22,
                background: 'rgba(255,255,255,0.05)', border: `1px solid ${WARM.amber}25`,
                fontFamily: HEEBO, fontSize: F.label, fontWeight: 700, color: 'rgba(255,255,255,0.7)',
                display: 'flex', alignItems: 'center', gap: 12,
                opacity: bs, transform: `translateY(${interpolate(bs, [0, 1], [12, 0])}px)`,
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
          padding: '22px 72px', borderRadius: 60, background: BRAND.gradient,
          boxShadow: `0 16px 50px ${BRAND.primary}30`,
          opacity: buttonSpring,
          transform: `scale(${interpolate(buttonSpring, [0, 1], [0.8, 1]) * buttonPulse})`,
          marginBottom: 24,
        }}>
          <span style={{ fontFamily: RUBIK, fontSize: F.body, fontWeight: 800, color: '#fff' }}>להתחיל — חינם</span>
        </div>
      )}

      {/* URL */}
      {frame >= 330 && (
        <div style={{
          fontFamily: RUBIK, fontSize: F.label, fontWeight: 700, color: 'rgba(255,255,255,0.4)',
          opacity: spring({ frame: Math.max(0, frame - 330), fps, config: SPRING.ui, durationInFrames: 16 }),
          letterSpacing: 2,
        }}>
          misrad-ai.com
        </div>
      )}

      <NoiseLayer opacity={0.015} />
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
